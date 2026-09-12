window.App = window.App || {};

/* ============================================================
   PRODUCT ENGINE (Generic Core Engine)
   Grouping priority:
     1. STRONG: same item_id  (same product line)
     2. STRONG: same UPC      (same product variant barcode)
     3. CONSERVATIVE: brand + exact core product descriptor matching
        - Pack size & packaging differences (5kg vs 10kg, pouch vs bottle) remain merged
        - Domain-specific identity-bearing descriptors are resolved via configurable profiles
        - Default: generic mode (no domain profile active)
   ============================================================ */
App.ProductEngine = (() => {

  function normLower(s) { return (s||'').toString().toLowerCase().trim().replace(/\s+/g,' '); }

  // Generic UOM regex
  const UOM_RE = /\b\d+(?:\.\d+)?\s*(?:kg|kgs?|gm?s?|ml|ltr?s?|liters?|pcs?|packs?|w|watt|piece|unit|tab|tablet|nos?|m|meter)\b/gi;
  const MULTI_PACK_RE = /\b\d+\s*x\s*\d+(?:\.\d+)?\s*(?:kg|kgs?|gm?s?|ml|ltr?s?|liters?|g)\b/gi;
  // Generic packaging noise regex
  const PACKAGING_RE = /\((?:packet|pack|pouch|jar|box|bottle|bag|container|can|tin|wrapper|pouch\/pack|pkt|carton|pet bottle|glass bottle|bucket|drum|dispenser|cup|tray|tube|refill|tetra pack|sachet|sachets|m30)\)/gi;

  function stripUOMAndPackaging(name) {
    return normLower(name)
      .replace(MULTI_PACK_RE, '')
      .replace(UOM_RE, '')
      .replace(PACKAGING_RE, '')
      .replace(/[-_(),\[\]]/g, ' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  // Generic grammatical stop words
  const GRAMMAR_STOP_WORDS = new Set([
    'the','a','an','and','or','for','of','with','in','at','by','to','from','on',
    'packet','pouch','jar','bottle','pack','box','bag','tin','can','container','carton','tray','cup','tube',
    'piece','pieces','pcs','unit','units','sachet','sachets','refill',
    'combo','multipack','value','saver','new','extra'
  ]);

  function getTokens(name) {
    return stripUOMAndPackaging(name)
      .split(/\W+/)
      .filter(t => t.length > 1 && !GRAMMAR_STOP_WORDS.has(t));
  }

  function getModelTokens(name) {
    const rawTokens = normLower(name).replace(/[-_]/g, ' ').split(/\s+/);
    return new Set(rawTokens.filter(t => /^\d+\.\d+$/.test(t) || /^(pro|max|plus|ultra|lite|se|gt|gen2|gen3|mk2|mkii|2024|2025|2026)$/i.test(t)));
  }

  function areTokensIdentical(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) return false;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    if (setA.size !== setB.size) return false;
    for (const t of setA) {
      if (!setB.has(t)) return false;
    }
    return true;
  }

  function isSameProductVariant(tokensA, tokensB, profile) {
    if (areTokensIdentical(tokensA, tokensB)) return true;

    // If a domain identity profile is active, use its configured identity rules
    if (profile && profile.identityTokens) {
      const setA = new Set(tokensA);
      const setB = new Set(tokensB);

      // If an identity-bearing token is present in one, it MUST be present in the other
      for (const t of profile.identityTokens) {
        if (setA.has(t) !== setB.has(t)) {
          return false; // Identity conflict! Never merge!
        }
      }

      // Check allowable marketing claims / non-identity substitutions if configured
      if (profile.marketingClaims) {
        const diffA = tokensA.filter(t => !setB.has(t));
        const diffB = tokensB.filter(t => !setA.has(t));
        const allDiffs = [...diffA, ...diffB];

        const isAllowedDiff = (t) => {
          if (profile.marketingClaims.has(t)) return true;
          if (profile.nonIdentitySubstitutions && profile.nonIdentitySubstitutions.some(re => re.test(t))) return true;
          return false;
        };

        if (allDiffs.length > 0 && allDiffs.every(isAllowedDiff)) {
          const sharedTokens = tokensA.filter(t => setB.has(t));
          if (sharedTokens.length >= 2) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /* Product family grouping */
  function groupProducts(records, dataset_id, options) {
    const itemIdMap = new Map(); // item_id -> family_id
    const upcMap    = new Map(); // upc -> family_id
    const families  = new Map(); // family_id -> family obj

    // Resolve active profile: options override -> global registry -> null (Generic mode)
    let activeProfile = null;
    if (options && options.profile !== undefined) {
      if (typeof options.profile === 'string' && typeof window !== 'undefined' && window.App && App.ProductIdentityProfiles && typeof App.ProductIdentityProfiles.getProfile === 'function') {
        activeProfile = App.ProductIdentityProfiles.getProfile(options.profile);
      } else {
        activeProfile = options.profile;
      }
    } else if (typeof window !== 'undefined' && window.App && App.ProductIdentityProfiles && typeof App.ProductIdentityProfiles.getActiveProfile === 'function') {
      activeProfile = App.ProductIdentityProfiles.getActiveProfile();
    }

    const enrichedRecords = [];
    const suggestions     = [];

    for (const rec of records) {
      let family_id = null;
      let method    = null;
      let confidence= null;

      const item_id    = (rec.item_id || '').toString().trim();
      const upc        = (rec.upc     || '').toString().trim();
      const brand_id   = rec.brand_id;
      const baseName   = stripUOMAndPackaging(rec.normalized_product_name || '');
      const tokens     = getTokens(rec.normalized_product_name || '');
      const modelTokens= getModelTokens(rec.normalized_product_name || '');

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
      // 3. CONSERVATIVE: Same brand + identical product formulation tokens
      else {
        let bestMatch = null;
        for (const [fid, fam] of families) {
          if (brand_id && fam.brand_id && fam.brand_id !== brand_id) continue;

          // Category compatibility gate for name-token matching
          if (
            fam.normalized_category &&
            rec.normalized_category &&
            fam.normalized_category !== 'Other / Uncategorized' &&
            rec.normalized_category !== 'Other / Uncategorized' &&
            fam.normalized_category !== rec.normalized_category
          ) {
            continue;
          }
          
          // Model modifier conflict check
          let hasModelConflict = false;
          if (fam.modelTokens) {
            for (const m of modelTokens) {
              if (!fam.modelTokens.has(m)) { hasModelConflict = true; break; }
            }
            if (!hasModelConflict) {
              for (const m of fam.modelTokens) {
                if (!modelTokens.has(m)) { hasModelConflict = true; break; }
              }
            }
          }
          if (hasModelConflict) continue;

          if (isSameProductVariant(tokens, fam.tokens, activeProfile)) {
            bestMatch = fid;
            break;
          }
        }

        if (bestMatch) {
          family_id  = bestMatch;
          method     = 'name_tokens';
          confidence = 'HIGH';
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
          item_ids:    new Set(item_id ? [item_id] : []),
          brand_id,
          normalized_brand:    rec.normalized_brand,
          normalized_category: rec.normalized_category,
          subcategory:         rec.subcategory,
          source_category:     rec.source_category,
          name:            rec.normalized_product_name,
          normalized_name: baseName,
          tokens,
          modelTokens,
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
      if (item_id && fam.item_ids) fam.item_ids.add(item_id);
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
      const vKey = fid + '||' + (rec.variant_id || '') + '||' + (rec.upc || '') + '||' + (rec.normalized_uom || '') + '||' + (rec.variant_mrp || '');

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
