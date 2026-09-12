window.App = window.App || {};

/* ============================================================
   CLEANER - Text normalization without losing raw data
   Strict Weight & Volume Physical Provenance Hierarchy:
     Priority 1: Authoritative Source Total Weight (when unit is verified KG)
     Priority 2: Derived from Source Unit Weight * Qty (when unit is verified KG)
     Priority 3: Derived mass from generic mass units (kg/g only in name/UOM)
     Rule: Bare numeric values without schema/header evidence remain UNKNOWN unit.
     Rule: Volume (L/ml) is tracked separately and NEVER converted to mass.
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
          normalized_uom: match[1] + ' ' + unit,
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
          normalized_uom: val + ' ' + mappedUnit,
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

  /* ── Header unit detection ──────────────────────────────── */
  function detectHeaderUnit(h) {
    if (!h) return null;
    const s = String(h).toLowerCase();
    if (/\b(?:kg|kgs|kilogram|kilograms)\b|_kg|\(kg\)/.test(s)) return 'KG';
    if (/\b(?:g|gm|gms|gram|grams)\b|_g|\(g\)/.test(s)) return 'G';
    if (/\b(?:l|ltr|ltrs|liter|litres|litre)\b|_l|\(l\)/.test(s)) return 'L';
    if (/\b(?:ml)\b|_ml|\(ml\)/.test(s)) return 'ML';
    return null;
  }

  /* ── Unit-aware weight value parser ─────────────────────── */
  function parseWeightValue(val, headerName, options) {
    if (val == null || val === '') return null;
    const opts = options || {};
    const headerUnit = opts.schemaUnit || detectHeaderUnit(headerName);

    if (typeof val === 'string') {
      const s = val.trim();
      if (!s || s === '-') return null;

      // Explicit mass unit in string
      const kgMatch = s.match(/^([\d.]+)\s*(?:kg|kgs|kilogram|kilograms)$/i);
      if (kgMatch) {
        const num = parseFloat(kgMatch[1]);
        return { raw_value: num, unit: 'KG', value_kg: num, provenance: 'source_explicit' };
      }
      const gMatch = s.match(/^([\d.]+)\s*(?:g|gm|gms|gram|grams)$/i);
      if (gMatch) {
        const num = parseFloat(gMatch[1]);
        return { raw_value: num, unit: 'G', value_kg: num / 1000, provenance: 'source_explicit' };
      }

      // Volume in string -> NOT mass
      if (/^([\d.]+)\s*(?:l|ltr|ltrs|liter|litres|litre|ml|milliliter|millilitres)$/i.test(s)) {
        return null;
      }

      const cleanNum = Number(s.replace(/,/g, ''));
      if (!isNaN(cleanNum)) {
        val = cleanNum;
      } else {
        return null;
      }
    }

    if (typeof val === 'number') {
      if (isNaN(val)) return null;
      if (headerUnit === 'KG') {
        return { raw_value: val, unit: 'KG', value_kg: val, provenance: 'source_schema' };
      } else if (headerUnit === 'G') {
        return { raw_value: val, unit: 'G', value_kg: val / 1000, provenance: 'source_schema' };
      } else {
        return { raw_value: val, unit: 'UNKNOWN', value_kg: null, provenance: 'unknown' };
      }
    }

    return null;
  }

  // Legacy compatibility helper (only converts when unit is known KG)
  function parseWeightToKG(val, headerName, options) {
    const res = parseWeightValue(val, headerName, options);
    return res ? res.value_kg : null;
  }

  // Generic mass extraction: kg / g ONLY (never volume)
  function extractMassKG(uomStr, nameStr) {
    const combined = ((uomStr || '') + ' ' + (nameStr || '')).toLowerCase();
    const kgMatch = combined.match(/\b(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)\b/);
    if (kgMatch) return parseFloat(kgMatch[1]);

    const gMatch = combined.match(/\b(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/);
    if (gMatch) return parseFloat(gMatch[1]) / 1000;

    return null;
  }

  // Generic volume extraction: L / ml ONLY (never mass)
  function extractVolumeL(uomStr, nameStr) {
    const combined = ((uomStr || '') + ' ' + (nameStr || '')).toLowerCase();
    const lMatch = combined.match(/\b(\d+(?:\.\d+)?)\s*(?:l|ltr|ltrs|liter|litres|litre)\b/);
    if (lMatch) return parseFloat(lMatch[1]);

    const mlMatch = combined.match(/\b(\d+(?:\.\d+)?)\s*(?:ml|milliliter|millilitres)\b/);
    if (mlMatch) return parseFloat(mlMatch[1]) / 1000;

    return null;
  }

  // Legacy compatibility alias
  function extractWeightKG(uomStr, nameStr) {
    return extractMassKG(uomStr, nameStr);
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
  function cleanRecord(rec, options) {
    const raw = rec._raw || {};
    const raw_name  = rec.name  || rec.product_name || rec.Product_Name || raw['Product Name'] || raw.name || '';
    const raw_brand = rec.brand || raw.brand || raw.Brand || '';
    const raw_cat   = rec.l0    || rec.category || rec.Category || raw.Category || raw.l0 || '';
    const raw_wh    = rec.entity_name || rec.entity_vendor_name || raw.entity_vendor_name || raw.vendor_name || raw.vendor || raw.location || rec.entity_name || rec.warehouse || rec.Warehouse || raw.Warehouse || raw.entity_name || '';
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

    // If Remark/Remarks contains an explicit status token, promote to inventory_status if empty
    let effective_inv_status = raw_inv_status;
    if (!effective_inv_status && raw_remarks) {
      if (typeof App.InventoryStatusResolver !== 'undefined' && App.InventoryStatusResolver.hasSellableSignal) {
        if (App.InventoryStatusResolver.hasSellableSignal(raw_remarks) || App.InventoryStatusResolver.hasNonSellableSignal(raw_remarks)) {
          effective_inv_status = raw_remarks;
        }
      } else {
        const normRem = normLower(raw_remarks);
        if (['saleable', 'salable', 'sellable', 'non saleable', 'nonsaleable', 'non sellable', 'unsellable', 'unsaleable', 'active', 'in stock'].includes(normRem)) {
          effective_inv_status = raw_remarks;
        }
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

    // ── STRICT WEIGHT & VOLUME PHYSICAL PROVENANCE HIERARCHY ──
    const rawTotalWeightVal = rec['Total Weight'] ?? rec.total_weight ?? rec.gross_weight ?? rec.batch_weight ?? raw['Total Weight'];
    const rawUnitWeightVal  = rec.Weight ?? rec.weight ?? rec.unit_weight ?? rec.net_weight ?? raw.Weight ?? raw.weight;

    const parsedTotalWeight = parseWeightValue(rawTotalWeightVal, rec._total_weight_header || 'Total Weight', { schemaUnit: options?.totalWeightSchemaUnit || options?.schemaUnit });
    const parsedUnitWeight  = parseWeightValue(rawUnitWeightVal, rec._weight_header || 'Weight', { schemaUnit: options?.weightSchemaUnit || options?.schemaUnit });

    const extractedMass = extractMassKG(raw_uom, raw_name);
    const extractedVol  = extractVolumeL(raw_uom, raw_name);

    let source_total_weight_kg = null;
    let derived_source_weight_kg = null;
    let derived_name_mass_kg = null;

    let total_weight_value = parsedTotalWeight ? parsedTotalWeight.raw_value : null;
    let total_weight_unit  = parsedTotalWeight ? parsedTotalWeight.unit : 'UNKNOWN';
    let weight_value       = parsedUnitWeight ? parsedUnitWeight.raw_value : null;
    let weight_unit        = parsedUnitWeight ? parsedUnitWeight.unit : 'UNKNOWN';
    let weight_unit_source = 'unknown';
    let weight_source      = 'unavailable';
    let weight_validation_status = 'N/A';

    // Priority 1: Authoritative Source Total Weight (when unit is verified KG)
    if (parsedTotalWeight != null && parsedTotalWeight.raw_value > 0) {
      if (parsedTotalWeight.unit === 'KG' || parsedTotalWeight.unit === 'G') {
        total_weight_unit = 'KG';
        source_total_weight_kg = parsedTotalWeight.value_kg;
        weight_source = 'source_total_weight';
        weight_unit_source = parsedTotalWeight.provenance;
      }
      if (parsedUnitWeight != null && parsedUnitWeight.raw_value > 0) {
        if ((parsedUnitWeight.unit === 'KG' || parsedUnitWeight.unit === 'G') &&
            (parsedTotalWeight.unit === 'KG' || parsedTotalWeight.unit === 'G')) {
          const unitKgVal = parsedUnitWeight.value_kg;
          const totalKgVal = parsedTotalWeight.value_kg;
          const expectedTw = unitKgVal * qty;
          const diff = Math.abs(totalKgVal - expectedTw);
          if (diff < 1e-5) weight_validation_status = 'EXACT';
          else if (diff <= 0.01 || diff / Math.max(totalKgVal, 1) < 0.005) weight_validation_status = 'MINOR_ROUNDING';
          else weight_validation_status = 'MATERIAL_MISMATCH';
        } else {
          weight_validation_status = 'UNKNOWN_UNIT';
        }
      }
    }
    // Priority 2: Derived from Source Unit Weight * Qty (when unit is verified KG and Total Weight is blank/0)
    else if (parsedUnitWeight != null && parsedUnitWeight.raw_value > 0) {
      if (parsedUnitWeight.unit === 'KG' || parsedUnitWeight.unit === 'G') {
        derived_source_weight_kg = parsedUnitWeight.value_kg * qty;
        weight_source = 'source_unit_weight_qty';
        weight_unit_source = parsedUnitWeight.provenance;
        weight_validation_status = 'EXACT';
      }
    }

    // Priority 3: Derived mass from verified generic mass units in Product Name / UOM (kg/g only)
    if (source_total_weight_kg == null && derived_source_weight_kg == null && extractedMass != null && extractedMass > 0) {
      derived_name_mass_kg = extractedMass * qty;
      weight_source = 'derived_mass_uom';
      weight_unit_source = 'derived_from_uom';
      weight_value = extractedMass;
      weight_unit  = 'KG';
    }

    // Canonical total_weight in KG (for backward compatibility, never contains volume and never assumes unverified bare numbers as KG)
    const total_weight = source_total_weight_kg ?? derived_source_weight_kg ?? derived_name_mass_kg ?? 0;
    const unit_weight  = source_total_weight_kg != null ? (qty > 0 ? source_total_weight_kg / qty : source_total_weight_kg) :
                         (derived_source_weight_kg != null ? (parsedUnitWeight.value_kg) :
                         (derived_name_mass_kg != null ? extractedMass : 0));

    // Volume tracking (strictly separated from mass)
    const total_volume_l = (extractedVol != null && extractedVol > 0) ? extractedVol * qty : 0;
    const unit_volume_l  = extractedVol ?? 0;
    const volume_uom     = extractedVol != null ? 'L' : null;

    
    let mass_status = 'UNKNOWN';
    if (source_total_weight_kg != null && source_total_weight_kg > 0) {
      mass_status = 'VERIFIED';
    } else if ((derived_source_weight_kg != null && derived_source_weight_kg > 0) || (derived_name_mass_kg != null && derived_name_mass_kg > 0)) {
      mass_status = 'DERIVED';
    } else if (total_volume_l > 0) {
      mass_status = 'NOT_APPLICABLE';
    } else if (qty > 0 && (rawUnitWeightVal != null || rawTotalWeightVal != null)) {
      mass_status = 'UNKNOWN';
    } else {
      mass_status = 'NOT_APPLICABLE';
    }

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
      raw_weight:             rawUnitWeightVal,
      raw_total_weight:       rawTotalWeightVal,
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

      // Weight & Mass Provenance
      weight: unit_weight,
      total_weight,
      source_total_weight_kg,
      derived_source_weight_kg,
      derived_name_mass_kg,
      weight_value,
      weight_unit,
      total_weight_value,
      total_weight_unit,
      weight_source,
      weight_unit_source,
      weight_validation_status,
      mass_status,

      // Volume Tracking
      unit_volume: unit_volume_l,
      total_volume: total_volume_l,
      unit_volume_l,
      total_volume_l,
      volume_uom,

      // UOM
      normalized_uom: uomNorm.normalized_uom,

      // Source category preserved
      source_category: norm(raw_cat),
    };
  }

  function cleanAll(records, options) {
    return records.map(r => cleanRecord(r, options));
  }

  return { cleanRecord, cleanAll, normalizeUOM, cleanBrand, normLower, norm, normTitle, toNumber, parseWeightValue, parseWeightToKG, extractMassKG, extractVolumeL, extractWeightKG, detectHeaderUnit };
})();
