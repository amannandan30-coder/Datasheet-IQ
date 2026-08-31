window.App = window.App || {};

/* ============================================================
   AGGREGATOR — Compute all rollups + detect data quality issues
   ============================================================ */
App.Aggregator = (() => {

  function run(records, dataset_id) {
    const dqIssues = [];

    /* ── Warehouse aggregation ───────────────────────────────  */
    const warehouseMap = new Map();
    for (const rec of records) {
      const wh = rec.normalized_warehouse || 'Unknown';
      if (!warehouseMap.has(wh)) {
        warehouseMap.set(wh, {
          id:               crypto.randomUUID(),
          dataset_id,
          raw_name:         rec.raw_entity_name || wh,
          normalized_name:  wh,
          sku_count:        new Set(),
          unit_count:       0,
          total_value:      0,
          total_weight:     0,
          damaged_value:    0,
          near_expiry_value:0,
          status_breakdown: {},
        });
      }
      const w = warehouseMap.get(wh);
      w.sku_count.add(rec.product_family_id);
      w.unit_count       += (rec.qty || 0);
      w.total_value      += (rec.source_value || 0);
      w.total_weight     += (rec.total_weight || 0);

      const invType = (rec.raw_bad_inventory_type || '').toLowerCase();
      if (invType === 'damaged')     w.damaged_value     += (rec.source_value || 0);
      if (invType === 'near_expiry' || invType === 'nearexpiry') w.near_expiry_value += (rec.source_value || 0);

      if (!w.status_breakdown[invType || 'unknown']) w.status_breakdown[invType || 'unknown'] = { qty:0, value:0 };
      w.status_breakdown[invType || 'unknown'].qty   += (rec.qty || 0);
      w.status_breakdown[invType || 'unknown'].value += (rec.source_value || 0);
    }
    const warehouses = [...warehouseMap.values()].map(w => ({
      ...w, sku_count: w.sku_count.size
    }));

    /* ── Global KPIs ─────────────────────────────────────────  */
    const totalUnits = records.reduce((s,r) => s + (r.qty||0), 0);
    const totalValue = records.reduce((s,r) => s + (r.source_value||0), 0);
    const totalWeight= records.reduce((s,r) => s + (r.total_weight||0), 0);
    const totalSKUs  = new Set(records.map(r => r.product_family_id)).size;
    const damagedVal = records.filter(r => (r.raw_bad_inventory_type||'').toLowerCase() === 'damaged')
                              .reduce((s,r) => s + (r.source_value||0), 0);
    const nearExpVal = records.filter(r => ['near_expiry','nearexpiry'].includes((r.raw_bad_inventory_type||'').toLowerCase()))
                              .reduce((s,r) => s + (r.source_value||0), 0);

    /* ── Data Quality detection ──────────────────────────────  */
    // 1. Missing brand
    const missingBrand = records.filter(r => !r.raw_brand || r.raw_brand === '');
    if (missingBrand.length) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'missing_brand',
        severity:   'medium',
        count:      missingBrand.length,
        details:    `${missingBrand.length} records have no brand`,
        record_ids: missingBrand.map(r => r.id).slice(0,20),
        created_at: Date.now(),
      });
    }

    // 2. Missing weight
    const missingWeight = records.filter(r => !r.total_weight);
    if (missingWeight.length) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'missing_weight',
        severity:   'low',
        count:      missingWeight.length,
        details:    `${missingWeight.length} records missing Total Weight`,
        record_ids: missingWeight.map(r => r.id).slice(0,20),
        created_at: Date.now(),
      });
    }

    // 3. Source value vs calculated value discrepancy
    let valueMismatch = 0;
    for (const rec of records) {
      if (rec.source_value && rec.variant_mrp && rec.qty) {
        const calculated = rec.variant_mrp * rec.qty;
        const diff = Math.abs(rec.source_value - calculated);
        const pct  = diff / Math.max(rec.source_value, 1);
        if (pct > 0.05 && diff > 10) { // >5% and >₹10 discrepancy
          valueMismatch++;
        }
      }
    }
    if (valueMismatch > 0) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'value_discrepancy',
        severity:   'medium',
        count:      valueMismatch,
        details:    `${valueMismatch} records where Source Value ≠ MRP × Qty (>5% difference)`,
        record_ids: [],
        created_at: Date.now(),
      });
    }

    // 4. Low confidence groupings
    const lowConf = records.filter(r => r.normalization_confidence === 'LOW');
    if (lowConf.length) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'low_confidence_grouping',
        severity:   'high',
        count:      lowConf.length,
        details:    `${lowConf.length} records with low-confidence product grouping — needs review`,
        record_ids: lowConf.map(r => r.id).slice(0,20),
        created_at: Date.now(),
      });
    }

    // 5. Missing MRP
    const missingMRP = records.filter(r => !r.variant_mrp);
    if (missingMRP.length) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'missing_mrp',
        severity:   'medium',
        count:      missingMRP.length,
        details:    `${missingMRP.length} records missing MRP`,
        record_ids: missingMRP.map(r => r.id).slice(0,20),
        created_at: Date.now(),
      });
    }

    // 6. Zero quantity
    const zeroQty = records.filter(r => (r.qty||0) === 0);
    if (zeroQty.length) {
      dqIssues.push({
        id: crypto.randomUUID(), dataset_id,
        issue_type: 'zero_quantity',
        severity:   'high',
        count:      zeroQty.length,
        details:    `${zeroQty.length} records with zero quantity`,
        record_ids: zeroQty.map(r => r.id).slice(0,20),
        created_at: Date.now(),
      });
    }

    /* ── Status distribution ─────────────────────────────────  */
    const statusMap = {};
    for (const rec of records) {
      const st = (rec.raw_bad_inventory_type || 'unknown').toLowerCase();
      if (!statusMap[st]) statusMap[st] = { qty: 0, value: 0, count: 0 };
      statusMap[st].qty   += (rec.qty || 0);
      statusMap[st].value += (rec.source_value || 0);
      statusMap[st].count++;
    }

    const kpis = {
      total_skus:    totalSKUs,
      total_units:   totalUnits,
      total_value:   totalValue,
      total_weight:  totalWeight,
      damaged_value: damagedVal,
      near_expiry_value: nearExpVal,
      warehouse_count: warehouses.length,
      brand_count:   new Set(records.map(r => r.brand_id)).size,
      category_count: new Set(records.map(r => r.normalized_category)).size,
      status_distribution: statusMap,
    };

    return { warehouses, dqIssues, kpis };
  }

  return { run };
})();
