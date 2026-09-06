window.App = window.App || {};

/* ============================================================
   INVENTORY STATUS RESOLVER - Evidence-Aware Sellability Engine
   ============================================================ */
App.InventoryStatusResolver = (() => {

  /* ------------------------------------------------------------
     SECTION 0  NORMALIZE - single source of truth for text canonicalization
     ------------------------------------------------------------ */
  function normalizeText(val) {
    if (val == null) return '';
    return String(val).toLowerCase().trim().replace(/[\-_\/]/g, ' ').replace(/\s+/g, ' ');
  }

  /** Pre-normalize every entry in a raw token array so lookups and
   *  regex matching always operate on the same canonical form. */
  function normalizeTokenSet(rawTokens) {
    const s = new Set();
    for (const t of rawTokens) {
      const n = normalizeText(t);
      if (n) s.add(n);
    }
    return s;
  }

  /* ------------------------------------------------------------
     SECTION 1  TOKEN SETS  (stored in normalized form)
     ------------------------------------------------------------ */
  const SELLABLE_TOKENS = normalizeTokenSet([
    'saleable', 'salable', 'sellable', 'active', 'active stock', 'activestock',
    'good', 'good condition', 'goodcondition', 'available', 'available stock', 'availablestock',
    'usable', 'usable stock', 'in stock', 'instock', 'ok', 'fresh', 'standard', 'prime',
    'sound', 'sound stock', 'ready for sale', 'ready to sell', 'serviceable', 'normal',
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
    'damaged', 'damage', 'dn prn', 'dump', 'quarantine',
    'blocked', 'expired', 'expiry', 'near expiry', 'nearexpiry', 'near_expiry',
    'bad rtv', 'bad_rtv', 'badrtv', 'rtv', 'return to vendor', 'returntovendor',
    'unserviceable', 'rejected', 'reject', 'defect', 'defective', 'hold', 'scrap',
    'salvage', 'dead stock', 'deadstock', 'write off', 'writeoff', 'loss', 'broken',
    'quarantined',
    'non-saleable/dump', 'non saleable/dump', 'nonsaleable/dump',
    'non-sellable/dump', 'non sellable/dump'
  ]);

  const GENERIC_NEUTRAL_SHEETS = normalizeTokenSet([
    'sheet1', 'sheet 1', 'sheet2', 'sheet 2', 'sheet3', 'sheet 3', 'sheet', 'sheets',
    'data', 'dataset', 'table', 'table1', 'export', 'page', 'page1', 'workbook',
    'general', 'unknown', 'custom', 'default'
  ]);

  const DOMAIN_CATEGORY_SHEETS = normalizeTokenSet([
    'atta', 'flour', 'rice', 'oil', 'dal', 'pulses', 'spices', 'staples',
    'grocery', 'fmcg', 'dairy', 'beverages', 'personal care', 'home care',
    'snacks', 'packaged foods', 'food', 'no variant', 'catalog', 'active catalog',
    'tea', 'coffee', 'sugar', 'salt', 'biscuits', 'cleaning', 'household'
  ]);

  /* ------------------------------------------------------------
     SECTION 2  DOMAIN CATEGORY SHEET - exact match only (cautious)
     ------------------------------------------------------------ */
  function isDomainCategorySheet(sheetVal) {
    if (!sheetVal) return false;
    return DOMAIN_CATEGORY_SHEETS.has(sheetVal);
  }

  /* ------------------------------------------------------------
     SECTION 3  CENTRALIZED NEGATION-AWARE TOKEN MATCHER
     ------------------------------------------------------------ 
     One reusable function handles negation for ALL signal types.
     
     Rules:
       1. Exact full-string match against curated set = true immediately.
          (Curated entries like "non saleable" are trusted as-is.)
       2. Substring match with word boundaries:
          - Locate each token occurrence in the normalized string.
          - Check if the word immediately before is a negation prefix.
          - If negated: skip that match.
          - If not negated: signal found, return true.
       3. All tokens and inputs go through normalizeText(),
          so -, _, / are already converted to spaces.
     ------------------------------------------------------------ */
  const NEGATION_WORDS = new Set([
    'no', 'not', 'non', 'un', 'never', 'without', 'nil', 'zero'
  ]);

  /**
   * Check whether the token that starts at position `matchStart`
   * in `normStr` is immediately preceded by a negation word.
   * Generic � works for any token in any field.
   */
  function isTokenNegated(normStr, matchStart) {
    if (matchStart <= 0) return false;
    var textBefore = normStr.substring(0, matchStart).trimEnd();
    var lastSpaceIdx = textBefore.lastIndexOf(' ');
    var lastWord = lastSpaceIdx >= 0
      ? textBefore.substring(lastSpaceIdx + 1)
      : textBefore;
    return NEGATION_WORDS.has(lastWord);
  }

  /**
   * Generic, reusable, negation-aware signal detector.
   * Returns true if `normStr` contains a non-negated occurrence
   * of any token in `tokenSet`.
   *
   * Used identically by hasSellableSignal and hasNonSellableSignal.
   */
  function hasTokenSignal(normStr, tokenSet) {
    if (!normStr) return false;

    // Path A: exact full-string match (curated sets, trusted)
    if (tokenSet.has(normStr)) return true;

    // Path B: substring match with word boundaries + negation guard
    for (const token of tokenSet) {
      var escaped = token.replace(/ /g, '\\s+');
      var re = new RegExp('(?:^|\\s)(' + escaped + ')(?=$|\\s)', 'gi');
      var m;
      while ((m = re.exec(normStr)) !== null) {
        var actualStart = m.index + (m[0].length - m[1].length);
        if (!isTokenNegated(normStr, actualStart)) {
          return true;
        }
      }
    }
    return false;
  }

  /* ------------------------------------------------------------
     SECTION 4  PUBLIC SIGNAL APIs - thin wrappers over hasTokenSignal
     ------------------------------------------------------------ */
  function hasSellableSignal(normStr) {
    return hasTokenSignal(normStr, SELLABLE_TOKENS);
  }

  function hasNonSellableSignal(normStr) {
    return hasTokenSignal(normStr, NON_SELLABLE_TOKENS);
  }

  /**
   * Detailed sellability resolution with evidence tracking and semantic conflict detection.
   */
  function resolveRecordStatusDetailed(record) {
    if (!record) {
      return {
        status: 'unknown',
        confidence: 'LOW',
        resolution_source: 'none',
        resolution_rule: 'empty_record',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence: {}
      };
    }

    const raw = record._raw || {};
    const sheetVal = normalizeText(record._sheet_name || record._raw_sheet_name || raw._sheet_name || '');

    // Extract individual candidate signals
    const raw_item_type = record.item_type || record.Type || raw.item_type || raw.Type || raw.type || '';
    const raw_inv_status = record.inventory_status || record.status || raw.inventory_status || raw.Status || raw.status || '';
    const raw_bad_type_explicit = record.bad_inventory_type || raw.bad_inventory_type || raw['Bad Inventory Type'] || '';
    const raw_remarks = record.remarks || record.Remarks || raw.Remarks || raw.remarks || raw.Remark || raw.remark || '';
    const raw_condition = record.condition || record.Condition || raw.Condition || raw.condition || '';
    const raw_disposition = record.disposition || record.Disposition || raw.Disposition || raw.disposition || '';

    const norm_item_type = normalizeText(raw_item_type);
    const norm_inv_status = normalizeText(raw_inv_status);
    const norm_bad_type = normalizeText(raw_bad_type_explicit);
    const norm_remarks = normalizeText(raw_remarks);
    const norm_condition = normalizeText(raw_condition);
    const norm_disposition = normalizeText(raw_disposition);

    const evidence = {
      sheet_name: sheetVal,
      item_type: raw_item_type,
      inventory_status: raw_inv_status,
      bad_inventory_type: raw_bad_type_explicit,
      remarks: raw_remarks,
      condition: raw_condition,
      disposition: raw_disposition
    };

    // ══ Row-Level Signal Extraction ══
    const posRowSignals = [];
    const negRowSignals = [];

    if (hasSellableSignal(norm_item_type)) posRowSignals.push('Type="' + raw_item_type + '"');
    if (hasNonSellableSignal(norm_item_type)) negRowSignals.push('Type="' + raw_item_type + '"');

    if (hasSellableSignal(norm_inv_status)) posRowSignals.push('Status="' + raw_inv_status + '"');
    if (hasNonSellableSignal(norm_inv_status)) negRowSignals.push('Status="' + raw_inv_status + '"');

    if (hasSellableSignal(norm_bad_type)) posRowSignals.push('BadInventoryType="' + raw_bad_type_explicit + '"');
    if (hasNonSellableSignal(norm_bad_type) && norm_bad_type !== 'unknown') negRowSignals.push('BadInventoryType="' + raw_bad_type_explicit + '"');

    if (hasSellableSignal(norm_remarks)) posRowSignals.push('Remarks="' + raw_remarks + '"');
    if (hasNonSellableSignal(norm_remarks)) negRowSignals.push('Remarks="' + raw_remarks + '"');

    if (hasSellableSignal(norm_condition)) posRowSignals.push('Condition="' + raw_condition + '"');
    if (hasNonSellableSignal(norm_condition)) negRowSignals.push('Condition="' + raw_condition + '"');

    if (hasSellableSignal(norm_disposition)) posRowSignals.push('Disposition="' + raw_disposition + '"');
    if (hasNonSellableSignal(norm_disposition)) negRowSignals.push('Disposition="' + raw_disposition + '"');

    const isExplicitPosSheet = sheetVal === 'saleable' || sheetVal === 'sellable' || sheetVal === 'active stock' || sheetVal === 'available stock' || sheetVal === 'active_stock' || sheetVal.includes('( saleable )') || sheetVal.includes('( sellable )') || sheetVal.includes('sellable inventory') || sheetVal.includes('saleable inventory');
    const isExplicitNegSheet = sheetVal === 'dump' || sheetVal === 'scrap' || sheetVal === 'damaged' || sheetVal === 'expired' || sheetVal === 'quarantine' || sheetVal === 'quarantined' || sheetVal === 'write off' || sheetVal === 'writeoff' || sheetVal.includes('( dump )') || sheetVal.includes('non saleable') || sheetVal.includes('nonsaleable') || sheetVal.includes('non-saleable stock') || sheetVal.includes('non saleable stock');

    // ══ Direct Conflict Evaluation ══
    let is_conflict = posRowSignals.length > 0 && negRowSignals.length > 0;
    let conflict_reason = is_conflict ? ('Positive row signal (' + posRowSignals.join(', ') + ') conflicts with negative row signal (' + negRowSignals.join(', ') + ').') : null;

    // Explicit Sheet vs Explicit Row Status Conflict
    if (!is_conflict) {
      if (isExplicitPosSheet && (hasNonSellableSignal(norm_inv_status) || hasNonSellableSignal(norm_item_type))) {
        is_conflict = true;
        conflict_reason = 'Positive sheet partition ("' + sheetVal + '") conflicts with explicit negative row status (' + (hasNonSellableSignal(norm_inv_status) ? 'Status="' + raw_inv_status + '"' : 'Type="' + raw_item_type + '"') + ').';
      } else if (isExplicitNegSheet && (hasSellableSignal(norm_inv_status) || hasSellableSignal(norm_item_type))) {
        is_conflict = true;
        conflict_reason = 'Negative sheet partition ("' + sheetVal + '") conflicts with explicit positive row status (' + (hasSellableSignal(norm_inv_status) ? 'Status="' + raw_inv_status + '"' : 'Type="' + raw_item_type + '"') + ').';
      }
    }

    // ══ Conflict Resolution: Never Silently Pick a Side ══
    if (is_conflict) {
      return {
        status: 'unknown',
        confidence: 'LOW',
        resolution_source: 'conflict_unresolved',
        resolution_rule: 'semantic_status_conflict',
        is_status_conflict: true,
        status_conflict_reason: conflict_reason,
        evidence
      };
    }

    // ══ Precedence Rule Hierarchy (When No Conflict Exists) ══

    // Priority 1: Pure Dump / Scrap Sheet Partition
    if (sheetVal === 'dump' || sheetVal === 'scrap' || sheetVal === 'write off' || sheetVal === 'writeoff') {
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: 'sheet_partition',
        resolution_rule: 'pure_dump_scrap_sheet',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    // Priority 2: Explicit Dedicated Sellability / Status Field (A)
    if (norm_inv_status && norm_inv_status !== 'unknown' && norm_inv_status !== 'null') {
      if (hasSellableSignal(norm_inv_status)) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'inventory_status',
          resolution_rule: 'explicit_positive_status',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
      if (hasNonSellableSignal(norm_inv_status)) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'inventory_status',
          resolution_rule: 'explicit_negative_status',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
    }

    // Priority 3: Explicit Row-Level Remarks / Disposition / Condition (B)
    for (const [field, normVal] of [
      ['disposition', norm_disposition],
      ['remarks', norm_remarks],
      ['condition', norm_condition]
    ]) {
      if (normVal && normVal !== 'unknown' && normVal !== 'null' && normVal !== 'na') {
        if (hasNonSellableSignal(normVal)) {
          return {
            status: 'non_sellable',
            confidence: 'HIGH',
            resolution_source: field,
            resolution_rule: 'explicit_negative_' + field,
            is_status_conflict: false,
            status_conflict_reason: null,
            evidence
          };
        }
        if (hasSellableSignal(normVal)) {
          return {
            status: 'sellable',
            confidence: 'HIGH',
            resolution_source: field,
            resolution_rule: 'explicit_positive_' + field,
            is_status_conflict: false,
            status_conflict_reason: null,
            evidence
          };
        }
      }
    }

    // Priority 4: Strong Negative / Positive Inventory-Condition Field (C)
    if (hasNonSellableSignal(norm_bad_type) && norm_bad_type !== 'unknown') {
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: 'bad_inventory_type',
        resolution_rule: 'explicit_negative_bad_inventory_type',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }
    if (hasSellableSignal(norm_bad_type)) {
      return {
        status: 'sellable',
        confidence: 'HIGH',
        resolution_source: 'bad_inventory_type',
        resolution_rule: 'explicit_positive_bad_inventory_type',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    // Priority 5: Qualified Worksheet Partition (D)
    if (sheetVal) {
      if (sheetVal.includes('( saleable )') || sheetVal.includes('( sellable )') || sheetVal.includes('sellable inventory') || sheetVal.includes('saleable inventory')) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_partition',
          resolution_rule: 'positive_qualified_sheet_partition',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
      if (sheetVal.includes('( dump )') || sheetVal.includes('non saleable') || sheetVal.includes('nonsaleable') || sheetVal.includes('non-saleable stock') || sheetVal.includes('non saleable stock')) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_partition',
          resolution_rule: 'negative_qualified_sheet_partition',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
    }

    // Priority 6: Explicit Positive / Negative Item Type
    if (hasSellableSignal(norm_item_type)) {
      return {
        status: 'sellable',
        confidence: 'MEDIUM',
        resolution_source: 'item_type',
        resolution_rule: 'explicit_positive_item_type',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }
    if (hasNonSellableSignal(norm_item_type)) {
      return {
        status: 'non_sellable',
        confidence: 'MEDIUM',
        resolution_source: 'item_type',
        resolution_rule: 'explicit_negative_item_type',
        is_status_conflict: false,
        status_conflict_reason: null,
        evidence
      };
    }

    // Priority 7: Worksheet-Level Status Semantics (E)
    if (sheetVal) {
      if (isExplicitPosSheet || hasSellableSignal(sheetVal)) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'positive_sheet_signal',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
      if (isExplicitNegSheet || hasNonSellableSignal(sheetVal)) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'negative_sheet_signal',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
      // Cautious Domain Category Fallback: only recognized active inventory categories fallback to sellable
      if (isDomainCategorySheet(sheetVal)) {
        return {
          status: 'sellable',
          confidence: 'MEDIUM',
          resolution_source: 'domain_sheet',
          resolution_rule: 'domain_sheet_fallback',
          is_status_conflict: false,
          status_conflict_reason: null,
          evidence
        };
      }
    }

    // Priority 8: Fallback Unknown (F)
    return {
      status: 'unknown',
      confidence: 'LOW',
      resolution_source: 'fallback',
      resolution_rule: 'no_explicit_signals',
      is_status_conflict: false,
      status_conflict_reason: null,
      evidence
    };
  }

  function resolveRecordStatus(record) {
    const detailed = resolveRecordStatusDetailed(record);
    return detailed.status;
  }

  /**
   * Aggregate entire dataset with strict mathematical reconciliation.
   */
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
