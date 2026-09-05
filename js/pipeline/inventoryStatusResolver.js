window.App = window.App || {};

/* ============================================================
   INVENTORY STATUS RESOLVER — Generic 3-Way Status Resolution
   Resolves records into:
     - Total Inventory
     - Sellable Items
     - Non-Sellable Items
     - Unknown / Undetermined Status
   Based on strict status evidence hierarchy:
     1. Explicit source status field
     2. Explicit source category / metadata
     3. Worksheet status semantics
     4. Strong normalized textual status evidence
     5. Unknown / Ambiguous fallback
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
    'quarantined', 'bad'
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

    // 1. Priority 1: Explicit Source Status field
    const explicitStatusFields = [
      record.raw_bad_inventory_type,
      record.bad_inventory_type,
      record.status,
      record.inventory_status,
      record.item_status,
      record.stock_condition,
      record.condition,
      record.stock_type,
      record.type
    ];

    for (const rawField of explicitStatusFields) {
      const normVal = normalizeText(rawField);
      if (normVal && normVal !== 'unknown' && normVal !== 'null' && normVal !== 'undefined') {
        // Non-sellable check takes precedence on composite/bad indicators
        if (hasNonSellableSignal(normVal)) {
          return 'non_sellable';
        }
        if (hasSellableSignal(normVal)) {
          return 'sellable';
        }
      }
    }

    // 2. Priority 2: Explicit Source Category / Condition Metadata
    const categoryVal = normalizeText(record.source_category || record.raw_category || record.l0 || '');
    if (categoryVal) {
      if (hasNonSellableSignal(categoryVal)) {
        return 'non_sellable';
      }
      if (hasSellableSignal(categoryVal)) {
        return 'sellable';
      }
    }

    // 3. Priority 3: Worksheet Status Semantics
    const sheetVal = normalizeText(record._sheet_name || record._raw_sheet_name || '');
    if (sheetVal) {
      if (hasNonSellableSignal(sheetVal)) {
        return 'non_sellable';
      }
      if (hasSellableSignal(sheetVal)) {
        return 'sellable';
      }
      // Non-saleable reference/batch sheets in multi-sheet liquidation files (e.g. 'atta' sheet in Dasna)
      if (sheetVal === 'atta') {
        return 'non_sellable';
      }
    }

    // 4. Priority 4: Default Fallback - Unknown / Undetermined
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

    let sellableCount = 0;
    let sellableUnits = 0;
    let sellableValue = 0;

    let nonSellableCount = 0;
    let nonSellableUnits = 0;
    let nonSellableValue = 0;

    let unknownCount = 0;
    let unknownUnits = 0;
    let unknownValue = 0;

    for (const rec of validRecords) {
      const qty = Number(rec.qty) || 0;
      const val = Number(rec.source_value) || 0;

      totalUnits += qty;
      totalValue += val;

      const st = resolveRecordStatus(rec);
      if (st === 'sellable') {
        sellableCount++;
        sellableUnits += qty;
        sellableValue += val;
      } else if (st === 'non_sellable') {
        nonSellableCount++;
        nonSellableUnits += qty;
        nonSellableValue += val;
      } else {
        unknownCount++;
        unknownUnits += qty;
        unknownValue += val;
      }
    }

    totalValue = Number(totalValue.toFixed(2));
    sellableValue = Number(sellableValue.toFixed(2));
    nonSellableValue = Number(nonSellableValue.toFixed(2));
    unknownValue = Number(unknownValue.toFixed(2));

    const recDiff = validRecords.length - (sellableCount + nonSellableCount + unknownCount);
    const unitDiff = totalUnits - (sellableUnits + nonSellableUnits + unknownUnits);
    const valDiff = Number((totalValue - (sellableValue + nonSellableValue + unknownValue)).toFixed(2));

    const isReconciled = (recDiff === 0) && (unitDiff === 0) && (Math.abs(valDiff) < 0.01);

    return {
      total: {
        records: validRecords.length,
        units: totalUnits,
        value: totalValue
      },
      sellable: {
        records: sellableCount,
        units: sellableUnits,
        value: sellableValue,
        status: 'Sellable'
      },
      nonSellable: {
        records: nonSellableCount,
        units: nonSellableUnits,
        value: nonSellableValue,
        status: 'Non-Sellable'
      },
      unknown: {
        records: unknownCount,
        units: unknownUnits,
        value: unknownValue,
        status: 'Unknown'
      },
      reconciled: isReconciled,
      difference: {
        records: recDiff,
        units: unitDiff,
        value: valDiff
      }
    };
  }

  return {
    resolveRecordStatus,
    resolveDataset
  };
})();
