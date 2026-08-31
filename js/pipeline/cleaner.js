window.App = window.App || {};

/* ============================================================
   CLEANER — Text normalization without losing raw data
   ============================================================ */
App.Cleaner = (() => {

  /* ── String helpers ──────────────────────────────────────── */
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

  /* ── UOM Normalization ───────────────────────────────────── */
  const UOM_PATTERNS = [
    { re: /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms?)\b/i, fn: m => `${parseFloat(m[1])} KG` },
    { re: /(\d+(?:\.\d+)?)\s*(?:gm?s?|grams?)\b/i,               fn: m => `${parseFloat(m[1])} G`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:ltr?s?|liters?|litres?)\b/i,     fn: m => `${parseFloat(m[1])} L`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i,            fn: m => `${parseFloat(m[1])} ML` },
    { re: /(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|units?|nos?)\b/i,   fn: m => `${parseInt(m[1])} PCS`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:pk|packs?|pouch(?:es)?|packet)\b/i, fn: m => `${parseInt(m[1])} PACK` },
    { re: /(\d+(?:\.\d+)?)\s*(?:tabs?|tablets?)\b/i,              fn: m => `${parseInt(m[1])} TABS` },
    { re: /(\d+(?:\.\d+)?)\s*(?:m|meters?)\b/i,                   fn: m => `${parseFloat(m[1])} M`  },
    { re: /(\d+(?:\.\d+)?)\s*(?:w|watts?)\b/i,                    fn: m => `${parseFloat(m[1])} W`  },
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

  /* Extract weight in KG from UOM or product name */
  function extractWeightKG(uomText, productName) {
    const text = `${uomText || ''} ${productName || ''}`.trim();
    const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)\b/i);
    if (kgMatch) return parseFloat(kgMatch[1]);
    const gmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:gm?s?|grams?)\b/i);
    if (gmMatch) return parseFloat(gmMatch[1]) / 1000.0;
    const lMatch  = text.match(/(\d+(?:\.\d+)?)\s*(?:ltr?s?|liters?)\b/i);
    if (lMatch) return parseFloat(lMatch[1]);
    const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i);
    if (mlMatch) return parseFloat(mlMatch[1]) / 1000.0;
    return null;
  }

  /* ── Number helpers ──────────────────────────────────────── */
  function toNumber(v) {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/,/g,''));
    return isNaN(n) ? null : n;
  }

  /* ── Brand cleaning ──────────────────────────────────────── */
  function cleanBrand(raw, productName) {
    let b = norm(raw);
    if (!b && productName) {
      // Infer brand from first word of product name if missing
      const firstWord = norm(productName).split(' ')[0];
      if (firstWord && firstWord.length > 2) b = firstWord;
    }
    if (!b) return 'Unknown Brand';
    return normTitle(b
      .replace(/\s*(pvt\.?\s*ltd\.?|ltd\.?|inc\.?|corp\.?|private limited)$/i, '')
      .replace(/\s+/g,' ')
      .trim()
    );
  }

  /* ── Product name cleaning ───────────────────────────────── */
  function cleanProductName(raw) {
    if (!raw) return 'Unnamed Product';
    return normTitle(String(raw)
      .replace(/\s+/g,' ')
      .trim()
    );
  }

  /* ── Core cleaner ────────────────────────────────────────── */
  function cleanRecord(rec) {
    const raw_name  = rec.name  || rec.product_name || rec.Product_Name || '';
    const raw_brand = rec.brand || '';
    const raw_cat   = rec.l0    || rec.category || rec.Category || '';
    const raw_wh    = rec.entity_name || rec.warehouse || rec.Warehouse || '';
    const raw_uom   = rec.variant_uom_text || rec.uom || rec.UOM || '';
    const raw_type  = rec.bad_inventory_type || rec.Type || rec.type || 'damaged';

    const qty = toNumber(rec.qty || rec.quantity || rec.Sum_of_QTY) ?? 0;
    const variant_mrp = toNumber(rec.variant_mrp || rec.mrp);
    
    // Value fallback: rec.Value || (mrp * qty)
    let source_value = toNumber(rec.Value || rec.value);
    if (source_value == null && variant_mrp != null && qty > 0) {
      source_value = variant_mrp * qty;
    }
    source_value = source_value ?? 0;

    // Weight fallback calculation
    const raw_total_wt = toNumber(rec['Total Weight'] || rec.total_weight);
    const raw_unit_wt  = toNumber(rec.Weight || rec.weight);
    
    let unit_weight = raw_unit_wt;
    if (unit_weight == null) {
      unit_weight = extractWeightKG(raw_uom, raw_name);
    }

    let total_weight = raw_total_wt;
    if (total_weight == null || total_weight === 0) {
      if (unit_weight != null && unit_weight > 0) {
        total_weight = unit_weight * qty;
      } else {
        total_weight = 0;
      }
    }

    const uomNorm = normalizeUOM(raw_uom, raw_name);

    return {
      ...rec,

      // RAW fields (kept exactly as-is)
      raw_entity_name:      norm(raw_wh),
      raw_product_name:     norm(raw_name),
      raw_brand:            norm(raw_brand),
      raw_category:         norm(raw_cat),
      raw_uom:              norm(raw_uom),
      raw_mrp:              rec.variant_mrp ?? rec.mrp,
      raw_qty:              rec.qty ?? rec.quantity,
      raw_value:            rec.Value ?? rec.value,
      raw_weight:           rec.Weight ?? rec.weight,
      raw_total_weight:     rec['Total Weight'] ?? rec.total_weight,
      raw_bad_inventory_type: norm(raw_type) || 'damaged',

      // NORMALIZED
      normalized_warehouse:     normTitle(raw_wh) || 'Unknown Warehouse',
      normalized_product_name:  cleanProductName(raw_name),
      normalized_brand:         cleanBrand(raw_brand, raw_name),

      // Numbers
      qty,
      variant_mrp,
      source_value,
      weight: unit_weight ?? 0,
      total_weight,

      // UOM
      raw_uom: uomNorm.raw_uom,
      normalized_uom: uomNorm.normalized_uom,

      // Source category preserved
      source_category: norm(raw_cat),
    };
  }

  function cleanAll(records) {
    return records.map(cleanRecord);
  }

  return { cleanRecord, cleanAll, normalizeUOM, cleanBrand, normLower, norm, normTitle, toNumber, extractWeightKG };
})();
