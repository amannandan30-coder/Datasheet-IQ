window.App = window.App || {};

/* ============================================================
   INVENTORY STATUS RESOLVER — Generic 3-Way Status Resolution
   Resolves records into:
     - Total Inventory
     - Sellable Items
     - Non-Sellable Items
     - Unknown / Undetermined Status
   Based on strict status evidence hierarchy:
     1. Pure Dump / Written-off Sheet Partition
     2. Explicit Row-Level Status / Remarks / Condition
     3. Explicit Source Status Metadata
     4. Worksheet-Level Status & Partition Semantics
     5. Default / Unknown Fallback
   ============================================================ */
App.InventoryStatusResolver = (() => {

  // Normalized token sets for evidence ranking
  const SELLABLE_TOKENS = new Set([
    'saleable', 'salable', 'sellable', 'active', 'active stock', 'activestock',
    'available', 'available stock', 'availablestock', 'good', 'good stock', 'goodstock',
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

  /**
   * Determine whether a normalized string contains non-sellable signals.
   */
  function hasNonSellableSignal(normStr) {
    if (!normStr) return false;
    if (NON_SELLABLE_TOKENS.has(normStr)) return true;
    for (const token of NON_SELLABLE_TOKENS) {
      const regex = new RegExp(`(^|\\s)${token.replace(/ /g, '\\s+')}($|\\s)`, 'i');
      if (regex.test(normStr)) return true;
    }
    return false;
  }

  /**
   * Determine whether a normalized string contains sellable signals.
   */
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
   * Resolve a single inventory record's sellability status.
   * Returns: 'sellable' | 'non_sellable' | 'unknown'
   */
  function resolveRecordStatus(record) {
    if (!record) return 'unknown';
    const raw = record._raw || {};
    const sheetVal = normalizeText(record._sheet_name || record._raw_sheet_name || raw._sheet_name || '');

    // 1. Priority 1: Pure Dump / Written-off / Scrap Sheet Partition
    // In warehouse liquidation files, dedicated Dump/Scrap sheets represent non-sellable stock
    if (sheetVal === 'dump' || sheetVal === 'scrap' || sheetVal === 'write off' || sheetVal === 'writeoff') {
      return 'non_sellable';
    }

    // 2. Priority 2: Explicit Row-Level Status / Remarks / Condition / Disposition
    const rowStatusCandidates = [
      record.remarks, record.Remarks, raw.Remarks, raw.remarks, raw.Remark, raw.remark,
      record.status, record.Status, raw.Status, raw.status,
      record.condition, record.Condition, raw.Condition, raw.condition,
      record.disposition, record.Disposition, raw.Disposition, raw.disposition,
      record.stock_condition, raw.stock_condition,
      record.item_status, raw.item_status,
      record.inventory_status, raw.inventory_status,
      record.quality_status, raw.quality_status,
      record.bad_inventory_type, raw.bad_inventory_type
    ];

    for (const cand of rowStatusCandidates) {
      const normVal = normalizeText(cand);
      if (normVal && normVal !== 'unknown' && normVal !== 'null' && normVal !== 'undefined' && normVal !== 'na' && normVal !== 'n/a') {
        if (hasNonSellableSignal(normVal)) {
          return 'non_sellable';
        }
        if (hasSellableSignal(normVal)) {
          return 'sellable';
        }
      }
    }

    // 3. Priority 3: Worksheet-Level Status Semantics & Qualified Partitions
    if (sheetVal) {
      // Qualified sheet names e.g. 'Bad RTV ( Saleable )' vs 'Bad RTV ( Dump )'
      if (sheetVal.includes('( saleable )') || sheetVal.includes('( sellable )') || sheetVal === 'saleable' || sheetVal === 'sellable') {
        if (!sheetVal.includes('( dump )') && !sheetVal.includes('non saleable')) {
          return 'sellable';
        }
      }
      if (sheetVal.includes('( dump )') || sheetVal.includes('non saleable') || sheetVal.includes('nonsaleable')) {
        return 'non_sellable';
      }
      if (hasNonSellableSignal(sheetVal)) {
        return 'non_sellable';
      }
      if (hasSellableSignal(sheetVal)) {
        return 'sellable';
      }
      // Standard categorical inventory sheets (e.g. 'atta', 'active_stock', 'inventory', 'catalog', 'general')
      // Valid worksheets with meaningful domain names and no negative indicators represent valid inventory
      if (!GENERIC_NEUTRAL_SHEETS.has(sheetVal)) {
        return 'sellable';
      }
    }

    // 4. Default Fallback - Unknown / Undetermined
    return 'unknown';
  }

  /**
   * Resolve and aggregate an entire dataset into Total, Sellable, Non-Sellable, and Unknown.
   */
  function resolveDataset(records) {
    if (!records || !records.length) {
      return {
        total: { records: 0, units: 0, value: 0 },
        sellable: { records: 0, units: 0, value: 0, status: 'Sellable' },
        nonSellable: { records: 0, units: 0, value: 0, status: 'Non-Sellable' },
        unknown: { records: 0, units: 0, value: 0, status: 'Unknown' },
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

    for (const rec of validRecords) {
      const qty = Number(rec.qty ?? 0) || 0;
      const val = Number(rec.source_value ?? rec.Value ?? rec.value ?? ((rec.variant_mrp || 0) * qty)) || 0;

      totalUnits += qty;
      totalValue += val;

      const status = resolveRecordStatus(rec);

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

    // Round values to 2 decimal places to avoid floating point precision issues
    totalValue = Math.round(totalValue * 100) / 100;
    sellable.value = Math.round(sellable.value * 100) / 100;
    nonSellable.value = Math.round(nonSellable.value * 100) / 100;
    unknown.value = Math.round(unknown.value * 100) / 100;

    // Mathematical reconciliation check
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
    resolveDataset,
    hasSellableSignal,
    hasNonSellableSignal,
    normalizeText
  };
})();
