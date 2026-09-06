window.App = window.App || {};

/* ============================================================
   CLEANER - Text normalization without losing raw data
   ============================================================ */
App.Cleaner = (() => {

  /* ── String helpers ─────────────────────────────────────── */
  function norm(str) {
    if (str == null) return '';
    return String(str).trim();
  }

  function normLower(str) {
    if (str == null) return '';
    return String(str).toLowerCase().trim().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
  }

  function normTitle(str) {
    if (str == null) return '';
    const clean = String(str).trim();
    if (!clean) return '';
    return clean
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /* ── UOM Normalizer ─────────────────────────────────────── */
  const UOM_PATTERNS = [
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)$/i,  unit: 'KG' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)$/i,        unit: 'G' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:l|ltr|ltrs|liter|litres|litre)$/i, unit: 'L' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:ml|milliliter|millilitres)$/i, unit: 'ML' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces)$/i,        unit: 'PCS' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:pk|pack|packs|pkt|packet)$/i,  unit: 'PACK' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:unit|units)$/i,                unit: 'UNIT' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:box|boxes)$/i,                 unit: 'BOX' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:btl|bottle|bottles)$/i,        unit: 'BOTTLE' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:can|cans)$/i,                  unit: 'CAN' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:tin|tins)$/i,                  unit: 'TIN' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:jar|jars)$/i,                  unit: 'JAR' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:pouch|pouches)$/i,             unit: 'POUCH' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:bag|bags|sack|sacks)$/i,       unit: 'BAG' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:roll|rolls)$/i,                unit: 'ROLL' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:strip|strips)$/i,              unit: 'STRIP' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:sachet|sachets)$/i,            unit: 'SACHET' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:set|sets)$/i,                  unit: 'SET' },
    { pattern: /^(\d+(?:\.\d+)?)\s*(?:pair|pairs)$/i,                unit: 'PAIR' },
  ];

  function normalizeUOM(rawUOM, productName) {
    const raw = norm(rawUOM);
    for (const { pattern, unit } of UOM_PATTERNS) {
      const match = raw.match(pattern);
      if (match) {
        return {
          normalized_uom: `${match[1]} ${unit}`,
          uom_size: parseFloat(match[1]),
          uom_type: unit
        };
      }
    }

    if (productName) {
      const nameMatch = productName.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|l|ltr|ml|pcs|pack|pk|units?)\b/i);
      if (nameMatch) {
        const val = nameMatch[1];
        const rawUnit = nameMatch[2].toUpperCase();
        let mappedUnit = rawUnit;
        if (['KG', 'KGS'].includes(rawUnit)) mappedUnit = 'KG';
        else if (['G', 'GM', 'GMS'].includes(rawUnit)) mappedUnit = 'G';
        else if (['L', 'LTR'].includes(rawUnit)) mappedUnit = 'L';
        else if (rawUnit === 'ML') mappedUnit = 'ML';
        else if (['PCS', 'PACK', 'PK', 'UNIT', 'UNITS'].includes(rawUnit)) mappedUnit = 'PCS';

        return {
          normalized_uom: `${val} ${mappedUnit}`,
          uom_size: parseFloat(val),
          uom_type: mappedUnit
        };
      }
    }

    return {
      normalized_uom: raw || '1 Unit',
      uom_size: 1,
      uom_type: 'UNIT'
    };
  }

  function parseWeightToKG(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const str = String(val).trim().toLowerCase();
    if (!str || str === '-') return null;

    const kgMatch = str.match(/^([\d.]+)\s*(?:kg|kgs|kilogram|kilograms)$/);
    if (kgMatch) return parseFloat(kgMatch[1]);

    const gMatch = str.match(/^([\d.]+)\s*(?:g|gm|gms|gram|grams)$/);
    if (gMatch) return parseFloat(gMatch[1]) / 1000;

    const pureNum = Number(str.replace(/,/g, ''));
    if (!isNaN(pureNum)) return pureNum;

    return null;
  }

  function extractWeightKG(uomStr, nameStr) {
    const combined = `${uomStr || ''} ${nameStr || ''}`.toLowerCase();
    const kgMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs)\b/);
    if (kgMatch) return parseFloat(kgMatch[1]);

    const gMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/);
    if (gMatch) return parseFloat(gMatch[1]) / 1000;

    const lMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:l|ltr|liter|litres)\b/);
    if (lMatch) return parseFloat(lMatch[1]);

    const mlMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:ml)\b/);
    if (mlMatch) return parseFloat(mlMatch[1]) / 1000;

    return null;
  }

  function toNumber(val) {
    if (val == null) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const str = String(val)
             .replace(/[^0-9.-]/g, '')
             .replace(/,/g, '')
             .replace(/\s+/g, '')
             .trim();

    if (!str || str === '-') return null;
    const n = Number(str);
    return isNaN(n) ? null : n;
  }

  /* ── Brand cleaning ─────────────────────────────────────── */
  function cleanBrand(raw, productName) {
    let b = norm(raw);
    if (!b && productName) {
      const firstWord = norm(productName).split(' ')[0];
      if (firstWord && firstWord.length > 2) b = firstWord;
    }
    if (!b) return 'Unknown Brand';
    return normTitle(b
      .replace(/\s*(pvt\.?\s*ltd\.?|ltd\.?|inc\.?|corp\.?|private limited|grocery)$/i, '')
      .replace(/\s+/g,' ')
      .trim()
    );
  }

  /* ── Product name cleaning ──────────────────────────────── */
  function cleanProductName(raw) {
    if (!raw) return 'Unnamed Product';
    return normTitle(String(raw)
      .replace(/\s+/g,' ')
      .trim()
    );
  }

  /* ── Core cleaner ───────────────────────────────────────── */
  function cleanRecord(rec) {
    const raw = rec._raw || {};
    const raw_name  = rec.name  || rec.product_name || rec.Product_Name || raw['Product Name'] || raw.name || '';
    const raw_brand = rec.brand || raw.brand || raw.Brand || '';
    const raw_cat   = rec.l0    || rec.category || rec.Category || raw.Category || raw.l0 || '';
    const raw_wh    = rec.entity_name || rec.warehouse || rec.Warehouse || raw.Warehouse || raw.entity_name || '';
    const raw_uom   = rec.variant_uom_text || rec.uom || rec.UOM || raw.uom || raw.UOM || '';
    
    // Separate individual source fields cleanly
    const raw_item_type = norm(rec.item_type || rec.Type || rec.type || raw.item_type || raw.Type || raw.type || raw['Item Type'] || '');
    const raw_inv_status = norm(rec.inventory_status || rec.status || rec.Status || raw.inventory_status || raw.Status || raw.status || raw['Inventory Status'] || '');
    const raw_bad_type_explicit = norm(rec.bad_inventory_type || raw.bad_inventory_type || raw['Bad Inventory Type'] || raw['Damage Type'] || '');
    
    const raw_remarks_plural = norm(rec.remarks || rec.Remarks || raw.Remarks || raw.remarks || raw.Notes || raw.notes || '');
    const raw_remark_singular = norm(rec.Remark || rec.remark || raw.Remark || raw.remark || '');
    const raw_remarks = raw_remarks_plural || raw_remark_singular;

    const raw_condition = norm(rec.condition || rec.Condition || raw.Condition || raw.condition || raw['Stock Condition'] || '');
    const raw_disposition = norm(rec.disposition || rec.Disposition || raw.Disposition || raw.disposition || raw.Action || raw.action || '');

    // If singular Remark contains an explicit status token (saleable/non_saleable/etc), promote to inventory_status if empty
    let effective_inv_status = raw_inv_status;
    if (!effective_inv_status && raw_remark_singular) {
      const normSingular = normLower(raw_remark_singular);
      if (['saleable', 'salable', 'sellable', 'non saleable', 'nonsaleable', 'non sellable', 'damaged', 'expired', 'quarantine', 'active', 'in stock'].includes(normSingular)) {
        effective_inv_status = raw_remark_singular;
      }
    }

    // Status fallback for bad_inventory_type: check explicit property first, then sheet name
    let raw_bad_type = raw_bad_type_explicit;
    if (!raw_bad_type || raw_bad_type.toLowerCase() === 'unknown') {
      const sheetLower = normLower(rec._sheet_name || rec._raw_sheet_name || raw._sheet_name || '');
      if (sheetLower.includes('( saleable )') || sheetLower.includes('( sellable )')) {
        raw_bad_type = 'saleable';
      } else if (sheetLower.includes('( dump )') || sheetLower.includes('non saleable') || sheetLower.includes('nonsaleable')) {
        raw_bad_type = 'dump';
      } else if (sheetLower.includes('damage') || sheetLower.includes('dn prn')) {
        raw_bad_type = 'damaged';
      } else if (sheetLower.includes('expired')) {
        raw_bad_type = 'expired';
      } else if (sheetLower.includes('near expiry') || sheetLower.includes('nearexpiry')) {
        raw_bad_type = 'near_expiry';
      } else if (sheetLower.includes('dump') || sheetLower.includes('quarantine') || sheetLower.includes('scrap')) {
        raw_bad_type = sheetLower.includes('dump') ? 'dump' : (sheetLower.includes('scrap') ? 'scrap' : 'quarantine');
      } else if (sheetLower.includes('bad rtv') || sheetLower.includes('rtv')) {
        raw_bad_type = 'bad_rtv';
      } else if (sheetLower.includes('saleable') || sheetLower.includes('salable') || sheetLower.includes('good') || sheetLower.includes('active') || sheetLower.includes('available')) {
        raw_bad_type = 'saleable';
      } else {
        raw_bad_type = raw_bad_type || 'unknown';
      }
    }

    const qty = toNumber(rec.qty || rec.quantity || rec.Sum_of_QTY || raw.qty || raw['Sum of QTY'] || raw.quantity) ?? 0;
    const variant_mrp = toNumber(rec.variant_mrp || rec.mrp || rec.price || rec.selling_price || rec.rate || rec.cost || raw.mrp || raw.variant_mrp);
    
    // Value fallback: rec.Value || (mrp * qty)
    let source_value = toNumber(rec.Value || rec.value || rec.amount || rec.total_value || rec.inventory_value || raw.Value || raw.value || raw.amount);
    if (source_value == null && variant_mrp != null && qty > 0) {
      source_value = variant_mrp * qty;
    }
    source_value = source_value ?? 0;

    // Weight disambiguation: unit weight vs total weight
    const raw_total_wt = parseWeightToKG(rec['Total Weight'] || rec.total_weight || rec.gross_weight || rec.batch_weight || raw['Total Weight']);
    const raw_unit_wt  = parseWeightToKG(rec.Weight || rec.weight || rec.unit_weight || rec.net_weight || raw.Weight || raw.weight);
    const extractedPackWeight = extractWeightKG(raw_uom, raw_name);

    let unit_weight = raw_unit_wt;
    if (unit_weight == null) {
      unit_weight = extractedPackWeight;
    }

    let total_weight = raw_total_wt;
    if (total_weight == null || total_weight === 0) {
      if (raw_unit_wt != null) {
        if (extractedPackWeight != null && extractedPackWeight > 0 && qty > 1 &&
            Math.abs(raw_unit_wt - (extractedPackWeight * qty)) < 0.05 * (extractedPackWeight * qty) &&
            Math.abs(raw_unit_wt - extractedPackWeight) >= 0.05 * extractedPackWeight) {
          total_weight = raw_unit_wt;
          unit_weight = extractedPackWeight;
        } else {
          total_weight = unit_weight * qty;
        }
      } else if (unit_weight != null && unit_weight > 0) {
        total_weight = unit_weight * qty;
      } else {
        total_weight = 0;
      }
    }

    unit_weight = unit_weight ?? 0;
    total_weight = total_weight ?? 0;

    const uomNorm = normalizeUOM(raw_uom, raw_name);

    return {
      ...rec,

      // RAW fields (kept exactly as-is for traceability)
      raw_entity_name:        norm(raw_wh),
      raw_product_name:       norm(raw_name),
      raw_brand:              norm(raw_brand),
      raw_category:           norm(raw_cat),
      raw_uom:                norm(raw_uom),
      raw_mrp:                rec.variant_mrp ?? rec.mrp ?? rec.price ?? raw.mrp,
      raw_qty:                rec.qty ?? rec.quantity ?? raw.qty ?? raw['Sum of QTY'],
      raw_value:              rec.Value ?? rec.value ?? rec.amount ?? raw.Value,
      raw_weight:             rec.Weight ?? rec.weight ?? raw.Weight,
      raw_total_weight:       rec['Total Weight'] ?? rec.total_weight ?? rec.gross_weight ?? raw['Total Weight'],
      raw_item_type:          raw_item_type,
      raw_inventory_status:   effective_inv_status,
      raw_bad_inventory_type: raw_bad_type || 'unknown',
      raw_remarks:            raw_remarks,
      raw_condition:          raw_condition,
      raw_disposition:        raw_disposition,

      // CANONICAL FIELDS
      item_type:              raw_item_type,
      inventory_status:       effective_inv_status,
      bad_inventory_type:     raw_bad_type_explicit || raw_bad_type || 'unknown',
      remarks:                raw_remarks,
      condition:              raw_condition,
      disposition:            raw_disposition,

      // NORMALIZED
      normalized_warehouse:     normTitle(raw_wh) || 'Unknown Warehouse',
      normalized_product_name:  cleanProductName(raw_name),
      normalized_brand:         cleanBrand(raw_brand, raw_name),

      // Numbers
      qty,
      variant_mrp,
      source_value,
      weight: unit_weight,
      total_weight,

      // UOM
      normalized_uom: uomNorm.normalized_uom,

      // Source category preserved
      source_category: norm(raw_cat),
    };
  }

  function cleanAll(records) {
    return records.map(cleanRecord);
  }

  return { cleanRecord, cleanAll, normalizeUOM, cleanBrand, normLower, norm, normTitle, toNumber, extractWeightKG, parseWeightToKG };
})();
