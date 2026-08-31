window.App = window.App || {};

/* ============================================================
   PRODUCT ENGINE
   Grouping priority:
     1. STRONG: same item_id  (same product family)
     2. STRONG: same UPC      (same product)
     3. MEDIUM: same brand + normalized name tokens match
     4. WEAK: fuzzy name sim  (suggestion only, not auto-merge)
   
   Variant detection:
     - Different variant_id OR different UOM / MRP within same family
   ============================================================ */
App.ProductEngine = (() => {

  function normLower(s) { return (s||'').toString().toLowerCase().trim().replace(/\s+/g,' '); }

  // UOM regex
  const UOM_RE = /\b\d+(?:\.\d+)?\s*(?:kg|kgs?|gm?s?|ml|ltr?s?|liters?|pcs?|packs?|w|watt|piece|unit|tab|tablet|nos?|m|meter)\b/gi;
  // Packaging noise regex
  const PACKAGING_RE = /\((?:packet|pack|pouch|jar|box|bottle|bag|container|can|tin|wrapper|pouch\/pack|pkt)\)/gi;

  function stripUOMAndPackaging(name) {
    return normLower(name)
      .replace(UOM_RE, '')
      .replace(PACKAGING_RE, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  const STOP_WORDS = new Set(['the','a','an','and','or','for','of','with','in','pack','size','new','special','edition','packet','pouch','jar','bottle']);

  function getTokens(name) {
    return stripUOMAndPackaging(name)
      .split(/\W+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  }

  function tokenSimilarity(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) return 0;
    const setA = new Set(tokensA), setB = new Set(tokensB);
    const intersection = [...setA].filter(t => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union; // Jaccard
  }

  /* Product family grouping */
  function groupProducts(records, dataset_id) {
    const itemIdMap = new Map(); // item_id -> family_id
    const upcMap    = new Map(); // upc -> family_id
    const families  = new Map(); // family_id -> family obj

    const enrichedRecords = [];
    const suggestions     = [];

    for (const rec of records) {
      let family_id = null;
      let method    = null;
      let confidence= null;

      const item_id  = (rec.item_id || '').toString().trim();
      const upc      = (rec.upc     || '').toString().trim();
      const brand_id = rec.brand_id;
      const baseName = stripUOMAndPackaging(rec.normalized_product_name || '');
      const tokens   = getTokens(rec.normalized_product_name || '');

      // 1. STRONG signal 1: item_id
      if (item_id && itemIdMap.has(item_id)) {
        family_id  = itemIdMap.get(item_id);
        method     = 'item_id';
        confidence = 'HIGH';
      }
      // 2. STRONG signal 2: UPC
      else if (upc && upcMap.has(upc)) {
        family_id  = upcMap.get(upc);
        method     = 'upc';
        confidence = 'HIGH';
      }
      // 3. MEDIUM: brand + name tokens
      else {
        let bestMatch = null, bestScore = 0;
        for (const [fid, fam] of families) {
          if (brand_id && fam.brand_id && fam.brand_id !== brand_id) continue; // Different brand -> skip
          const sim = tokenSimilarity(tokens, fam.tokens);
          if (sim > bestScore && sim >= 0.70) {
            bestScore = sim;
            bestMatch = fid;
          }
        }

        if (bestMatch) {
          family_id  = bestMatch;
          method     = 'name_tokens';
          confidence = bestScore >= 0.85 ? 'HIGH' : 'MEDIUM';
        }
      }

      // Create new family if not found
      if (!family_id) {
        family_id  = crypto.randomUUID();
        confidence = 'HIGH';
        method     = 'new';

        families.set(family_id, {
          id:          family_id,
          dataset_id,
          brand_id,
          normalized_brand:    rec.normalized_brand,
          normalized_category: rec.normalized_category,
          subcategory:         rec.subcategory,
          source_category:     rec.source_category,
          name:            rec.normalized_product_name,
          normalized_name: baseName,
          tokens,
          record_count: 0,
          total_qty:    0,
          total_value:  0,
          total_weight: 0,
          variant_count: 0,
          created_at: Date.now(),
        });
      }

      // Register strong signals
      if (item_id && !itemIdMap.has(item_id)) itemIdMap.set(item_id, family_id);
      if (upc      && !upcMap.has(upc))       upcMap.set(upc, family_id);

      // Update family aggregates
      const fam = families.get(family_id);
      fam.record_count++;
      fam.total_qty    += (rec.qty || 0);
      fam.total_value  += (rec.source_value || 0);
      fam.total_weight += (rec.total_weight || 0);

      enrichedRecords.push({
        ...rec,
        product_family_id:    family_id,
        grouping_method:      method,
        normalization_confidence: confidence,
        normalization_status: confidence === 'LOW' ? 'MANUAL REVIEW' : 'NORMALIZED',
      });
    }

    /* Variant grouping within family */
    const variantMap = new Map();

    const finalRecords = enrichedRecords.map(rec => {
      const fid  = rec.product_family_id;
      const vKey = `${fid}||${rec.variant_id || ''}||${rec.upc || ''}||${rec.normalized_uom || ''}||${rec.variant_mrp || ''}`;

      let variant_id;
      if (variantMap.has(vKey)) {
        variant_id = variantMap.get(vKey);
      } else {
        variant_id = crypto.randomUUID();
        variantMap.set(vKey, variant_id);
        const fam = families.get(fid);
        if (fam) fam.variant_count++;
      }

      return { ...rec, product_variant_id: variant_id };
    });

    /* Build variant objects */
    const variantObjects = new Map();
    for (const rec of finalRecords) {
      const vid = rec.product_variant_id;
      if (!variantObjects.has(vid)) {
        variantObjects.set(vid, {
          id:               vid,
          dataset_id,
          product_family_id: rec.product_family_id,
          brand_id:          rec.brand_id,
          normalized_brand:  rec.normalized_brand,
          normalized_category: rec.normalized_category,
          uom:              rec.normalized_uom || rec.raw_uom || 'N/A',
          raw_uom:          rec.raw_uom,
          mrp:              rec.variant_mrp,
          upc:              rec.upc,
          raw_variant_id:   rec.variant_id,
          record_count: 0,
          total_qty:    0,
          total_value:  0,
          total_weight: 0,
        });
      }
      const v = variantObjects.get(vid);
      v.record_count++;
      v.total_qty    += (rec.qty || 0);
      v.total_value  += (rec.source_value || 0);
      v.total_weight += (rec.total_weight || 0);
    }

    return {
      records:         finalRecords,
      product_families:[...families.values()],
      product_variants:[...variantObjects.values()],
      suggestions,
    };
  }

  return { groupProducts, stripUOMAndPackaging, getTokens };
})();
