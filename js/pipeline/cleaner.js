window.App = window.App || {};

/* ============================================================
   CLEANER — Text normalization without losing raw data
   ============================================================ */
App.Cleaner = (() => {

  /* ── String helpers ── */
  function norm(s) {
    if (s == null) return '';
    return String(s).trim().replace(/\s+/g, ' ');
  }

  function normLower(s) { return norm(s).toLowerCase(); }

  function normTitle(s) {
    const n = norm(s);
    if (!n) return '';
    return n.replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ── UOM Normalization ── */
  const UOM_PATTERNS = [
    { re: /(\d+(?:\.\d+)?)\s*(?:metric\s*tonnes?|metric\s*tons?|tonnes?|tons?|mt)\b/i, fn: m => `${parseFloat(m[1]) * 1000} KG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)\b/i,                              fn: m => `${parseFloat(m[1])} KG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:gm?s?|grams?)\b/i,                                  fn: m => `${parseFloat(m[1])} G`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:mg|milligrams?)\b/i,                                fn: m => `${parseFloat(m[1])} MG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i,                                  fn: m => `${(parseFloat(m[1]) * 0.45359237).toFixed(3)} KG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/i,                                    fn: m => `${(parseFloat(m[1]) * 0.02834952).toFixed(3)} KG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:l\b|ltr?s?|liters?|litres?)/i,                      fn: m => `${parseFloat(m[1])} L`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i,                               fn: m => `${parseFloat(m[1])} ML` },
    { re: /(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|units?|nos?)\b/i,                      fn: m => `${parseInt(m[1])} PCS`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:pk|packs?|pouch(?:es)?|packet)\b/i,                 fn: m => `${parseInt(m[1])} PACK` },
    { re: /(\d+(?:\.\d+)?)\s*(?:tabs?|tablets?)\b/i,                                fn: m => `${parseInt(m[1])} TABS` },
    { re: /(\d+(?:\.\d+)?)\s*(?:m|meters?)\b/i,                                      fn: m => `${parseFloat(m[1])} M`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:w|watts?)\b/i,                                       fn: m => `${parseFloat(m[1])} W`  },
  ];

  function normalizeUOM(raw, productName) {
    const text = `${raw || ''} ${productName || ''}`.trim();
    for (const { re, fn } of UOM_PATTERNS) {
      const m = text.match(re);
      if (m) return { raw_uom: raw || m[0], normalized_uom: fn(m) };
    }
    if (!raw) return { raw_uom: null, normalized_uom: null };
    const s = String(raw).trim();
    return { raw_uom: s, normalized_uom: s.toUpperCase() };
  }

  /* ── Weight parsing & normalizers ── */
  function parseWeightToKG(v, requireUnit = false) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return requireUnit ? null : (isNaN(v) ? null : v);
    let str = String(v).trim();
    if (!str || str === '-' || str === 'N/A' || str === 'na') return null;

    // Suffix unit conversion
    const tonMatch = str.match(/^([\d.,]+)\s*(?:metric\s*tonnes?|metric\s*tons?|tonnes?|tons?|mt)\b/i);
    if (tonMatch) return parseFloat(tonMatch[1].replace(/,/g, '')) * 1000.0;

    const kgMatch = str.match(/^([\d.,]+)\s*(?:(?:kg|kgs|kilograms?)\b|कि\.?ग्रा\.?|किलो)/i);
    if (kgMatch) return parseFloat(kgMatch[1].replace(/,/g, ''));

    const gmMatch = str.match(/^([\d.,]+)\s*(?:(?:gm?s?|grams?)\b|ग्राम|ग्रा\.?)/i);
    if (gmMatch) return parseFloat(gmMatch[1].replace(/,/g, '')) / 1000.0;

    const mgMatch = str.match(/^([\d.,]+)\s*(?:(?:mg|milligrams?)\b|मि\.?ग्रा\.?)/i);
    if (mgMatch) return parseFloat(mgMatch[1].replace(/,/g, '')) / 1000000.0;

    const lbMatch = str.match(/^([\d.,]+)\s*(?:lbs?|pounds?)\b/i);
    if (lbMatch) return parseFloat(lbMatch[1].replace(/,/g, '')) * 0.45359237;

    const ozMatch = str.match(/^([\d.,]+)\s*(?:oz|ounces?)\b/i);
    if (ozMatch) return parseFloat(ozMatch[1].replace(/,/g, '')) * 0.028349523125;

    if (requireUnit) return null;
    return toNumber(str);
  }

  /* Extract weight in KG from UOM or product name */
  function extractWeightKG(uomText, productName) {
    const text = `${uomText || ''} ${productName || ''}`.trim();
    if (!text) return null;

    // Metric Ton / Tonne
    const tonMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:metric\s*tonnes?|metric\s*tons?|tonnes?|tons?|mt)\b/i);
    if (tonMatch) return parseFloat(tonMatch[1]) * 1000.0;

    // KG / Kilogram
    const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)\b/i);
    if (kgMatch) return parseFloat(kgMatch[1]);

    // Grams (g, gm, gms, grams)
    const gmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:gm?s?|grams?)\b/i);
    if (gmMatch) return parseFloat(gmMatch[1]) / 1000.0;

    // Liters (approx 1L = 1KG for liquids)
    const lMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l\b|ltr?s?|liters?|litres?)/i);
    if (lMatch) return parseFloat(lMatch[1]);

    // ML
    const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i);
    if (mlMatch) return parseFloat(mlMatch[1]) / 1000.0;

    // Pounds (lb / lbs)
    const lbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i);
    if (lbMatch) return parseFloat(lbMatch[1]) * 0.45359237;

    // Explicit UOM weight fallback
    if (uomText) {
      const uomWeight = parseWeightToKG(uomText, true);
      if (uomWeight != null) return uomWeight;
    }

    return null;
  }

  /* ── Number helpers ── */
  function toNumber(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isNaN(v) ? null : v;
    
    let str = String(v).trim();
    if (!str || str === '-' || str === 'N/A' || str === 'na' || str === 'null' || str === 'undefined') return null;

    // Handle parentheses for negative numbers e.g. (1,250.00) -> -1250.00
    if (/^\(.*\)$/.test(str)) {
      str = '-' + str.slice(1, -1).trim();
    }

    // Strip currency symbols and commas
    str = str.replace(/[₹$€£]/g, '')
             .replace(/\b(?:rs\.?|inr|usd|eur|gbp)\b/gi, '')
             .replace(/,/g, '')
             .replace(/\s+/g, '')
             .trim();

    if (!str || str === '-') return null;
    const n = Number(str);
    return isNaN(n) ? null : n;
  }

  /* ── Brand cleaning ── */
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

  /* ── Product name cleaning ── */
  function cleanProductName(raw) {
    if (!raw) return 'Unnamed Product';
    return normTitle(String(raw)
      .replace(/\s+/g,' ')
      .trim()
    );
  }

  /* ── Core cleaner ── */
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
    const raw_remarks = norm(rec.remarks || rec.Remarks || rec.Remark || rec.remark || raw.Remarks || raw.remarks || raw.Remark || raw.remark || raw.Notes || raw.notes || '');
    const raw_condition = norm(rec.condition || rec.Condition || raw.Condition || raw.condition || raw['Stock Condition'] || '');
    const raw_disposition = norm(rec.disposition || rec.Disposition || raw.Disposition || raw.disposition || raw.Action || raw.action || '');

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
      raw_inventory_status:   raw_inv_status,
      raw_bad_inventory_type: raw_bad_type || 'unknown',
      raw_remarks:            raw_remarks,
      raw_condition:          raw_condition,
      raw_disposition:        raw_disposition,

      // CANONICAL FIELDS
      item_type:              raw_item_type,
      inventory_status:       raw_inv_status,
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
