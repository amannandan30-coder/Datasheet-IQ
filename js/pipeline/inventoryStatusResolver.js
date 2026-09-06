window.App = window.App || {};

/* ============================================================
   INVENTORY STATUS RESOLVER — Evidence-Aware Sellability Engine
   ============================================================ */
App.InventoryStatusResolver = (() => {

  const SELLABLE_TOKENS = new Set([
    'saleable', 'salable', 'sellable', 'active', 'active stock', 'activestock',
    'good', 'good condition', 'goodcondition', 'available', 'available stock', 'availablestock',
    'usable', 'usable stock', 'in stock', 'instock', 'ok', 'fresh', 'standard', 'prime',
    'sound', 'sound stock', 'ready for sale', 'ready to sell', 'serviceable', 'normal'
  ]);

  const NON_SELLABLE_TOKENS = new Set([
    'non-sellable', 'non sellable', 'nonsellable', 'non-saleable', 'non saleable', 'nonsaleable',
    'unsellable', 'unsaleable', 'damaged', 'damage', 'dn prn', 'dump', 'quarantine',
    'blocked', 'expired', 'expiry', 'near expiry', 'nearexpiry', 'near_expiry',
    'bad rtv', 'bad_rtv', 'badrtv', 'rtv', 'return to vendor', 'returntovendor',
    'unserviceable', 'rejected', 'reject', 'defect', 'defective', 'hold', 'scrap',
    'salvage', 'dead stock', 'deadstock', 'write off', 'writeoff', 'loss', 'broken',
    'quarantined', 'bad', 'non-saleable/dump', 'non saleable/dump', 'nonsaleable/dump'
  ]);

  const GENERIC_NEUTRAL_SHEETS = new Set([
    'sheet1', 'sheet 1', 'sheet2', 'sheet 2', 'sheet3', 'sheet 3', 'sheet', 'sheets',
    'data', 'dataset', 'table', 'table1', 'export', 'page', 'page1', 'workbook'
  ]);

  function normalizeText(val) {
    if (val == null) return '';
    return String(val).toLowerCase().trim().replace(/[\-_]/g, ' ').replace(/\s+/g, ' ');
  }

  function hasNonSellableSignal(normStr) {
    if (!normStr) return false;
    if (NON_SELLABLE_TOKENS.has(normStr)) return true;
    for (const token of NON_SELLABLE_TOKENS) {
      const regex = new RegExp(`(^|\\s)${token.replace(/ /g, '\\s+')}($|\\s)`, 'i');
      if (regex.test(normStr)) return true;
    }
    return false;
  }

  function hasSellableSignal(normStr) {
    if (!normStr) return false;
    if (SELLABLE_TOKENS.has(normStr)) return true;
    for (const token of SELLABLE_TOKENS) {
      const regex = new RegExp(`(^|\\s)${token.replace(/ /g, '\\s+')}($|\\s)`, 'i');
      if (regex.test(normStr)) return true;
    }
    return false;
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

    // ── Check for Semantic Conflicts ──
    const hasPositiveType = hasSellableSignal(norm_item_type);
    const hasNegativeType = hasNonSellableSignal(norm_item_type);

    const hasPositiveStatus = hasSellableSignal(norm_inv_status) || hasSellableSignal(norm_remarks) || hasSellableSignal(norm_disposition);
    const hasNegativeStatus = hasNonSellableSignal(norm_inv_status) || hasNonSellableSignal(norm_remarks) || hasNonSellableSignal(norm_disposition);

    const hasNegativeBadType = hasNonSellableSignal(norm_bad_type) && norm_bad_type !== 'unknown';
    const hasNegativeCondition = hasNonSellableSignal(norm_condition);

    let is_conflict = false;
    let conflict_reason = null;

    if ((hasPositiveType || hasPositiveStatus) && (hasNegativeBadType || hasNegativeCondition || hasNegativeStatus)) {
      is_conflict = true;
      conflict_reason = `Positive sellability signal (${hasPositiveType ? `Type="${raw_item_type}"` : `Status="${raw_inv_status || raw_remarks}"`}) conflicts with negative condition signal (${hasNegativeBadType ? `BadInventoryType="${raw_bad_type_explicit}"` : `Condition="${raw_condition || raw_inv_status}"`}).`;
    }

    // ── Precedence Rule Hierarchy ──

    // Priority 1: Pure Dump / Scrap Sheet Partition
    if (sheetVal === 'dump' || sheetVal === 'scrap' || sheetVal === 'write off' || sheetVal === 'writeoff') {
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: 'sheet_partition',
        resolution_rule: 'pure_dump_scrap_sheet',
        is_status_conflict: is_conflict,
        status_conflict_reason: conflict_reason,
        evidence
      };
    }

    // Priority 2: Explicit Dedicated Sellability / Status Field (A)
    if (norm_inv_status && norm_inv_status !== 'unknown' && norm_inv_status !== 'null') {
      if (hasSellableSignal(norm_inv_status) && !hasNegativeBadType) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'inventory_status',
          resolution_rule: 'explicit_positive_status',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      if (hasNonSellableSignal(norm_inv_status)) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'inventory_status',
          resolution_rule: 'explicit_negative_status',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
    }

    // Priority 3: Explicit Row-Level Remarks / Disposition / Condition (B)
    for (const [field, normVal, rawVal] of [
      ['disposition', norm_disposition, raw_disposition],
      ['remarks', norm_remarks, raw_remarks],
      ['condition', norm_condition, raw_condition]
    ]) {
      if (normVal && normVal !== 'unknown' && normVal !== 'null' && normVal !== 'na') {
        if (hasNonSellableSignal(normVal)) {
          return {
            status: 'non_sellable',
            confidence: 'HIGH',
            resolution_source: field,
            resolution_rule: `explicit_negative_${field}`,
            is_status_conflict: is_conflict,
            status_conflict_reason: conflict_reason,
            evidence
          };
        }
        if (hasSellableSignal(normVal) && !hasNegativeBadType) {
          return {
            status: 'sellable',
            confidence: 'HIGH',
            resolution_source: field,
            resolution_rule: `explicit_positive_${field}`,
            is_status_conflict: is_conflict,
            status_conflict_reason: conflict_reason,
            evidence
          };
        }
      }
    }

    // Priority 4: Explicit Negative Bad Inventory Type (C)
    if (hasNegativeBadType) {
      if (hasPositiveType) {
        return {
          status: 'unknown',
          confidence: 'LOW',
          resolution_source: 'conflict_unresolved',
          resolution_rule: 'conflicting_type_and_bad_inventory_type',
          is_status_conflict: true,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      return {
        status: 'non_sellable',
        confidence: 'HIGH',
        resolution_source: 'bad_inventory_type',
        resolution_rule: 'explicit_negative_bad_inventory_type',
        is_status_conflict: is_conflict,
        status_conflict_reason: conflict_reason,
        evidence
      };
    }

    // Priority 5: Qualified Worksheet Partition (D)
    if (sheetVal) {
      if (sheetVal.includes('( saleable )') || sheetVal.includes('( sellable )')) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_partition',
          resolution_rule: 'positive_qualified_sheet_partition',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      if (sheetVal.includes('( dump )') || sheetVal.includes('non saleable') || sheetVal.includes('nonsaleable')) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_partition',
          resolution_rule: 'negative_qualified_sheet_partition',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
    }

    // Priority 6: Explicit Positive Item Type (when no negative condition exists)
    if (hasPositiveType && !hasNegativeBadType && !hasNegativeCondition) {
      return {
        status: 'sellable',
        confidence: 'MEDIUM',
        resolution_source: 'item_type',
        resolution_rule: 'explicit_positive_item_type',
        is_status_conflict: is_conflict,
        status_conflict_reason: conflict_reason,
        evidence
      };
    }

    // Priority 7: Worksheet-Level Status Semantics (E)
    if (sheetVal) {
      if (sheetVal === 'saleable' || sheetVal === 'sellable' || sheetVal === 'active stock' || sheetVal === 'available stock' || sheetVal === 'active_stock') {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'positive_sheet_signal',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      if (sheetVal === 'damaged' || sheetVal === 'expired' || sheetVal === 'quarantine' || sheetVal === 'quarantined') {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'negative_sheet_signal',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      if (hasNonSellableSignal(sheetVal)) {
        return {
          status: 'non_sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'negative_sheet_signal',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      if (hasSellableSignal(sheetVal)) {
        return {
          status: 'sellable',
          confidence: 'HIGH',
          resolution_source: 'worksheet_name',
          resolution_rule: 'positive_sheet_signal',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
          evidence
        };
      }
      // Named categorical inventory sheets (e.g. 'atta', 'flour', 'catalog', 'general')
      if (!GENERIC_NEUTRAL_SHEETS.has(sheetVal)) {
        return {
          status: 'sellable',
          confidence: 'MEDIUM',
          resolution_source: 'domain_sheet',
          resolution_rule: 'domain_sheet_fallback',
          is_status_conflict: is_conflict,
          status_conflict_reason: conflict_reason,
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
      is_status_conflict: is_conflict,
      status_conflict_reason: conflict_reason,
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
      const qty = Number(rec.qty ?? 0) || 0;
      const val = Number(rec.source_value ?? rec.Value ?? rec.value ?? ((rec.variant_mrp || 0) * qty)) || 0;

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
