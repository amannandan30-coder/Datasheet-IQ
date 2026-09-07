window.App = window.App || {};

/* ============================================================
   INVENTORY STATUS RESOLVER - Pure 4-Level Status Engine
   ============================================================
   Strict Rules:
   1. Row has explicit 'Saleable' token -> sellable
   2. Row has explicit 'Non-Saleable' token -> non_sellable
   3. Row has no explicit status written (Blank / Neutral) -> Check Sheet Context:
      - Sheet context is 'Non-Saleable' -> non_sellable
      - Sheet context is 'Saleable' -> sellable
   4. Sheet context is unclear / neutral (e.g. 'Atta', 'Sheet1', 'No variant') -> sellable by default

   * CRITICAL: Damage, Expired, Scrap, Quarantine, Defect tokens are NOT considered
     in status resolution and no inference is made from them.
   ============================================================ */
App.InventoryStatusResolver = (() => {

  /* ------------------------------------------------------------
     SECTION 0: TEXT NORMALIZATION
     ------------------------------------------------------------ */
  function normalizeText(val) {
    if (val == null) return '';
    return String(val).toLowerCase().trim().replace(/[\-_\/]/g, ' ').replace(/\s+/g, ' ');
  }

  function normalizeTokenSet(rawTokens) {
    const s = new Set();
    for (const t of rawTokens) {
      const n = normalizeText(t);
      if (n) s.add(n);
    }
    return s;
  }

  /* ------------------------------------------------------------
     SECTION 1: TOKEN SETS (Saleable vs Non-Saleable ONLY)
     ------------------------------------------------------------ */
  const SELLABLE_TOKENS = normalizeTokenSet([
    'saleable', 'salable', 'sellable',
    'active', 'active stock', 'activestock',
    'good', 'good condition', 'goodcondition',
    'available', 'available stock', 'availablestock',
    'usable', 'usable stock',
    'in stock', 'instock',
    'prime', 'sound', 'fresh', 'standard', 'ok',
    'ready for sale', 'ready to sell', 'serviceable', 'normal',
    'sellable inventory', 'saleable inventory'
  ]);

  const NON_SELLABLE_TOKENS = normalizeTokenSet([
    'non-saleable', 'non saleable', 'nonsaleable',
    'non-saleable stock', 'non saleable stock', 'nonsaleable stock',
    'non-saleable inventory', 'non saleable inventory',
    'non-sellable', 'non sellable',
    'non-sellable stock', 'non sellable stock',
    'non-sellable inventory', 'non sellable inventory',
    'unsellable', 'unsaleable',
    'non-active', 'non active', 'inactive', 'unserviceable'
  ]);

  /* ------------------------------------------------------------
     SECTION 2: NEGATION-AWARE TOKEN MATCHING
     ------------------------------------------------------------ */
  const NEGATION_WORDS = new Set([
    'no', 'not', 'non', 'un', 'never', 'without', 'nil', 'zero'
  ]);

  function isTokenNegated(normStr, matchStart) {
    if (matchStart <= 0) return false;
    const textBefore = normStr.substring(0, matchStart).trimEnd();
    const lastSpaceIdx = textBefore.lastIndexOf(' ');
    const lastWord = lastSpaceIdx >= 0
      ? textBefore.substring(lastSpaceIdx + 1)
      : textBefore;
    return NEGATION_WORDS.has(lastWord);
  }

  function hasTokenSignal(normStr, tokenSet) {
    if (!normStr) return false;

    // Direct match against curated set
    if (tokenSet.has(normStr)) return true;

    // Substring match with word boundary & negation guard
    for (const token of tokenSet) {
      const escaped = token.replace(/ /g, '\\s+');
      const re = new RegExp('(?:^|\\s)(' + escaped + ')(?=$|\\s)', 'gi');
      let m;
      while ((m = re.exec(normStr)) !== null) {
        const actualStart = m.index + (m[0].length - m[1].length);
        if (!isTokenNegated(normStr, actualStart)) {
          return true;
        }
      }
    }
    return false;
  }

  function hasSellableSignal(normStr) {
    return hasTokenSignal(normStr, SELLABLE_TOKENS);
  }

  function hasNonSellableSignal(normStr) {
    return hasTokenSignal(normStr, NON_SELLABLE_TOKENS);
  }

  /* ------------------------------------------------------------
     SECTION 3: SHEET CONTEXT HELPERS
     ------------------------------------------------------------ */
  function isSheetNonSellable(sheetVal) {
    if (!sheetVal) return false;
    return sheetVal.includes('non saleable') ||
           sheetVal.includes('nonsaleable') ||
           sheetVal.includes('non-saleable') ||
           sheetVal.includes('non sellable') ||
           sheetVal.includes('unsellable') ||
           sheetVal.includes('unsaleable');
  }

  function isSheetSellable(sheetVal) {
    if (!sheetVal) return false;
    return sheetVal === 'saleable' ||
           sheetVal === 'salable' ||
           sheetVal === 'sellable' ||
           sheetVal.includes('( saleable )') ||
           sheetVal.includes('( sellable )') ||
           sheetVal.includes('sellable inventory') ||
           sheetVal.includes('saleable inventory') ||
           sheetVal.includes('active stock') ||
           sheetVal.includes('available stock');
  }

  /* ------------------------------------------------------------
     SECTION 4: 4-LEVEL DETERMINISTIC RECORD STATUS RESOLUTION
     ------------------------------------------------------------ */
  function resolveRecordStatusDetailed(record) {
    if (!record) {
      return {
        status: 'sellable',
        confidence: 'LOW',
        resolution_source: 'fallback',
        resolution_rule: 'empty_record_default_sellable',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence: {}
      };
    }

    const raw = record._raw || {};
    const sheetVal = normalizeText(record._sheet_name || record._raw_sheet_name || raw._sheet_name || '');

    // Extract row-level fields
    const raw_inv_status = record.inventory_status || record.status || raw.inventory_status || raw.Status || raw.status || '';
    const raw_item_type = record.item_type || record.Type || raw.item_type || raw.Type || raw.type || '';
    const raw_remarks = record.remarks || record.Remarks || raw.Remarks || raw.remarks || raw.Remark || raw.remark || '';
    const raw_condition = record.condition || record.Condition || raw.Condition || raw.condition || '';
    const raw_disposition = record.disposition || record.Disposition || raw.Disposition || raw.disposition || '';

    const norm_inv_status = normalizeText(raw_inv_status);
    const norm_item_type = normalizeText(raw_item_type);
    const norm_remarks = normalizeText(raw_remarks);
    const norm_condition = normalizeText(raw_condition);
    const norm_disposition = normalizeText(raw_disposition);

    const evidence = {
      sheet_name: sheetVal,
      inventory_status: raw_inv_status,
      item_type: raw_item_type,
      remarks: raw_remarks,
      condition: raw_condition,
      disposition: raw_disposition
    };

    // Candidates in hierarchy: status -> item_type -> remarks -> condition -> disposition
    const rowCandidates = [
      { name: 'inventory_status', raw: raw_inv_status, norm: norm_inv_status },
      { name: 'item_type', raw: raw_item_type, norm: norm_item_type },
      { name: 'remarks', raw: raw_remarks, norm: norm_remarks },
      { name: 'condition', raw: raw_condition, norm: norm_condition },
      { name: 'disposition', raw: raw_disposition, norm: norm_disposition }
    ];

    let hasRowNonSellable = false;
    let nonSellableSource = null;
    let hasRowSellable = false;
    let sellableSource = null;

    for (const cand of rowCandidates) {
      if (!cand.norm || cand.norm === 'unknown' || cand.norm === 'null' || cand.norm === 'na') continue;
      if (hasNonSellableSignal(cand.norm)) {
        hasRowNonSellable = true;
        if (!nonSellableSource) nonSellableSource = cand.name;
      }
      if (hasSellableSignal(cand.norm)) {
        hasRowSellable = true;
        if (!sellableSource) sellableSource = cand.name;
      }
    }

    // Direct semantic conflict check in row fields
    if (hasRowNonSellable && hasRowSellable) {
      return {
        status: 'unknown',
        confidence: 'LOW',
        resolution_source: 'conflict_unresolved',
        resolution_rule: 'semantic_status_conflict',
        is_status_conflict: true,
        status_conflict_reason: 'Row contains both Saleable (' + sellableSource + ') and Non-Saleable (' + nonSellableSource + ') signals.',
        evidence
      };
    }

    // ══ STEP 1 & 2: Row has explicit status ══
    if (hasRowNonSellable) {
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: nonSellableSource,
        resolution_rule: 'explicit_row_non_sellable',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    if (hasRowSellable) {
      return {
        status: 'sellable',
        confidence: 'HIGH',
        resolution_source: sellableSource,
        resolution_rule: 'explicit_row_sellable',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    // ══ STEP 3: Row is blank -> Check Sheet / File context ══
    if (isSheetNonSellable(sheetVal)) {
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: 'sheet_context',
        resolution_rule: 'sheet_context_non_sellable',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    if (isSheetSellable(sheetVal)) {
      return {
        status: 'sellable',
        confidence: 'HIGH',
        resolution_source: 'sheet_context',
        resolution_rule: 'sheet_context_sellable',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    // ══ STEP 4: Sheet context is unclear / neutral -> Default to Saleable ══
    return {
      status: 'sellable',
      confidence: 'MEDIUM',
      resolution_source: 'default_fallback',
      resolution_rule: 'default_sellable',
      is_status_conflict: false,
      status_conflict_reason: null,
      evidence
    };
  }

  function resolveRecordStatus(record) {
    const detailed = resolveRecordStatusDetailed(record);
    return detailed.status;
  }

  /* ------------------------------------------------------------
     SECTION 5: DATASET-LEVEL AGGREGATION & RECONCILIATION
     ------------------------------------------------------------ */
  function resolveDataset(records) {
    if (!records || !records.length) {
      return {
        total: { records: 0, units: 0, value: 0 },
        sellable: { records: 0, units: 0, value: 0, status: 'Sellable' },
        nonSellable: { records: 0, units: 0, value: 0, status: 'Non-Sellable' },
        unknown: { records: 0, units: 0, value: 0, status: 'Unknown' },
        conflicted: { records: 0, units: 0, value: 0 },
        reconciled: true,
        difference: { records: 0, units: 0, value: 0 }
      };
    }

    const validRecords = records.filter(r => (r._sheet_name || r._raw_sheet_name) !== 'Summary');

    let totalUnits = 0;
    let totalValue = 0;

    const sellable = { records: 0, units: 0, value: 0, status: 'Sellable' };
    const nonSellable = { records: 0, units: 0, value: 0, status: 'Non-Sellable' };
    const unknown = { records: 0, units: 0, value: 0, status: 'Unknown' };
    const conflicted = { records: 0, units: 0, value: 0 };

    for (const rec of validRecords) {
      const rawQty = Number(rec.qty ?? 0);
      const qty = Number.isFinite(rawQty) ? rawQty : 0;
      const rawVal = Number(rec.source_value ?? rec.Value ?? rec.value ?? ((Number.isFinite(Number(rec.variant_mrp)) ? Number(rec.variant_mrp) : 0) * qty));
      const val = Number.isFinite(rawVal) ? rawVal : 0;

      totalUnits += qty;
      totalValue += val;

      const detailed = resolveRecordStatusDetailed(rec);
      const status = detailed.status;

      if (detailed.is_status_conflict) {
        conflicted.records++;
        conflicted.units += qty;
        conflicted.value += val;
      }

      if (status === 'sellable') {
        sellable.records++;
        sellable.units += qty;
        sellable.value += val;
      } else if (status === 'non_sellable') {
        nonSellable.records++;
        nonSellable.units += qty;
        nonSellable.value += val;
      } else {
        unknown.records++;
        unknown.units += qty;
        unknown.value += val;
      }
    }

    totalValue = Math.round(totalValue * 100) / 100;
    sellable.value = Math.round(sellable.value * 100) / 100;
    nonSellable.value = Math.round(nonSellable.value * 100) / 100;
    unknown.value = Math.round(unknown.value * 100) / 100;
    conflicted.value = Math.round(conflicted.value * 100) / 100;

    const sumRecords = sellable.records + nonSellable.records + unknown.records;
    const sumUnits = sellable.units + nonSellable.units + unknown.units;
    const sumValue = Math.round((sellable.value + nonSellable.value + unknown.value) * 100) / 100;

    const diffRecords = validRecords.length - sumRecords;
    const diffUnits = totalUnits - sumUnits;
    const diffValue = Math.round((totalValue - sumValue) * 100) / 100;

    const reconciled = (diffRecords === 0 && diffUnits === 0 && Math.abs(diffValue) < 0.05);

    return {
      total: {
        records: validRecords.length,
        units: totalUnits,
        value: totalValue
      },
      sellable,
      nonSellable,
      unknown,
      conflicted,
      reconciled,
      difference: {
        records: diffRecords,
        units: diffUnits,
        value: diffValue
      }
    };
  }

  return {
    resolveRecordStatus,
    resolveRecordStatusDetailed,
    resolveDataset,
    hasSellableSignal,
    hasNonSellableSignal,
    normalizeText
  };
})();
