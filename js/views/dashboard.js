window.App = window.App || {};
console.log('[ROUTE-DIAG] dashboard.js v3.2 ACTIVE | ' + new Date().toISOString());

/* ============================================================
   DASHBOARD VIEW
   ============================================================ */
App.Views = App.Views || {};

App.Views.Dashboard = (() => {

  const CAT_ICONS = {
    'Electronics & Electricals':'⚡','Cleaning Essentials':'🧹',
    'Grocery':'🛒','Home Care':'🏠','Toys & Games':'🧸',
    'Personal Care':'💄','Stationery & Office':'📝',
    'Food & Beverages':'🍽️','Uncategorized':'📦',
  };

  const CAT_COLORS = ['#6366f1','#10b981','#f59e0b','#38bdf8','#a78bfa','#fb923c','#34d399','#ef4444','#64748b'];

  const SHEET_PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#a855f7',
    '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16', '#e11d48', '#64748b'
  ];

  function getCatColor(cat, idx) {
    const cfg = App.Categorizer.getCategoryConfig(cat);
    return cfg.color || CAT_COLORS[idx % CAT_COLORS.length];
  }

  function getSheetColor(idx) {
    return SHEET_PALETTE[idx % SHEET_PALETTE.length];
  }

  async function render(container, dataset_id) {
    console.log('[EDGE-LOOP] DASHBOARD_START');
    console.log(`[ROUTE-DIAG] DASHBOARD_VIEW_RENDER_START | HASH=${window.location.hash} | ROUTE=${App.State?.route} | isAuth=${App.Auth?.isAuthenticated}`);
    container.innerHTML = `<div class="animate-fade-in"><div class="flex items-center gap-12 mb-24" style="padding:4px 0">
      <div class="spinner"></div><span class="text-muted">Loading dashboard…</span></div></div>`;

    if (!dataset_id) {
      renderWelcome(container);
      console.log('[EDGE-LOOP] DASHBOARD_COMPLETE (welcome state)');
      console.log(`[ROUTE-DIAG] DASHBOARD_VIEW_RENDER_WELCOME | HASH=${window.location.hash} | ROUTE=${App.State?.route}`);
      return;
    }

    const dataset = await App.DB.getDataset(dataset_id);
    if (!dataset)   { renderWelcome(container); return; }

    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    if (!records.length) { renderWelcome(container); return; }

    // Ensure accurate real-time category & subcategory classification matching canonical pipeline
    if (window.App && window.App.Categorizer && typeof window.App.Categorizer.classify === 'function') {
      for (const r of records) {
        const res = App.Categorizer.classify(r.source_category || r.normalized_category, r.normalized_product_name, r.normalized_brand);
        if (res) {
          if (res.normalized_category) r.normalized_category = res.normalized_category;
          if (res.subcategory) r.subcategory = res.subcategory;
        }
      }
    }

    // Compute category aggregates fresh from records
    const catMap = new Map();
    for (const r of records) {
      const cat = r.normalized_category || 'Uncategorized';
      if (!catMap.has(cat)) catMap.set(cat, {
        name: cat, qty:0, value:0, weight:0, mass:0, volume:0, skus: new Set(),
        brands: new Set(), subcats: new Set(), color: null
      });
      const c = catMap.get(cat);
      c.qty    += (r.qty||0);
      c.value  += (r.source_value||0);
      c.weight += (r.total_weight||0);
      c.mass   += (r.total_weight||0);
      c.volume += (r.total_volume_l||0);
      c.skus.add(r.product_family_id);
      c.brands.add(r.normalized_brand);
      c.subcats.add(r.subcategory);
    }

    const kpis = dataset.kpis || {};
    const totalValue = records.reduce((s,r) => s+(r.source_value||0), 0);
    const dqIssues   = await App.DB.getAllByIndex('data_quality_issues','dataset_id',dataset_id);
    const pendingSugg= (await App.DB.getAllByIndex('normalization_suggestions','dataset_id',dataset_id))
                         .filter(s => s.status === 'pending');

    // Status distribution
    const statusDist = kpis.status_distribution || {};
    const totalStatus = Object.values(statusDist).reduce((s,v) => s+v.count,0);

    container.innerHTML = '';

    /* ── Page header ─────────────────────────────────────── */
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-sub">${dataset.filename} · ${App.Fmt.number(records.length)} records · ${App.Fmt.date(dataset.uploadedAt)}</div>
        </div>
        <div class="flex gap-8">
          ${dqIssues.length ? `<button class="btn btn-secondary" onclick="App.Router.go('quality')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ${dqIssues.length} Issues</button>` : ''}
        </div>
      </div>
    `);

    /* ── NL Query ────────────────────────────────────────── */
    const nlWrap = document.createElement('div');
    nlWrap.id = 'nl-query-section';
    App.Views.NLQuery && App.Views.NLQuery.render(nlWrap, dataset_id);
    container.appendChild(nlWrap);

    /* ── KPI Cards ───────────────────────────────────────── */
    const kpiHtml = `
      <div class="kpi-grid mb-24" id="kpi-grid">
        ${kpiCard('TOTAL SKUS',    App.Fmt.number(kpis.total_skus),  'Unique product families', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>', '#6366f1')}
        ${kpiCard('TOTAL UNITS',   App.Fmt.number(kpis.total_units), 'Across all warehouses',   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', '#10b981')}
        ${kpiCard('TOTAL VALUE',   App.Fmt.currency(kpis.total_value), 'MRP-based inventory value','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>', '#f59e0b')}
        ${kpiCard('TOTAL MASS',    App.Fmt.mass(kpis.total_weight), 'Total physical mass',            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M6 7l6-4 6 4"></path><path d="M4 14h4l-2 5z"></path><path d="M16 14h4l-2 5z"></path></svg>', '#38bdf8')}
        ${kpiCard('TOTAL VOLUME',  App.Fmt.volume(records.reduce((s,r)=>s+(r.total_volume_l||0),0)), 'Total fluid volume', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8M12 2v6M5 8h14l-2 13H7L5 8z"></path></svg>', '#06b6d4')}
        ${kpiCard('DAMAGED',       App.Fmt.currency(kpis.damaged_value), 'Damaged inventory value','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>', '#ef4444')}
        ${kpiCard('NEAR EXPIRY',   App.Fmt.currency(kpis.near_expiry_value),'Near expiry value','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', '#f59e0b')}
      </div>`;
    container.insertAdjacentHTML('beforeend', kpiHtml);

    /* ── Source Data & Unresolved Inventory Banner ─────────────────── */
    if (dataset.sourceRowCount) {
      container.insertAdjacentHTML('beforeend', `
        <div class="card mb-24 source-reconciliation-card">
          <div class="source-recon-header">
            <div class="source-recon-header-left">
              <div class="source-recon-title-row">
                <svg class="source-recon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span class="source-recon-title">Source File Reconciliation</span>
              </div>
              <div class="source-recon-subtitle">Source rows &rarr; processed inventory records</div>
            </div>
            <button class="btn btn-xs btn-secondary source-recon-btn" onclick="App.Router.go('quality')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Inspect Unresolved Records
            </button>
          </div>
          <div class="source-recon-pipeline">
            <div class="source-recon-node">
              <div class="source-recon-node-top">
                <span class="source-recon-dot neutral"></span>
                <span class="source-recon-label">Total Source Rows</span>
              </div>
              <div class="source-recon-value neutral">${App.Fmt.number(dataset.sourceRowCount)}</div>
              <div class="source-recon-desc">All ingested rows</div>
            </div>
            <div class="source-recon-connector">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
            <div class="source-recon-node">
              <div class="source-recon-node-top">
                <span class="source-recon-dot warning"></span>
                <span class="source-recon-label">Excluded</span>
              </div>
              <div class="source-recon-value warning">${App.Fmt.number(dataset.excludedSummaryRows || 0)}</div>
              <div class="source-recon-desc">Summary / total rows</div>
            </div>
            <div class="source-recon-connector">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
            <div class="source-recon-node">
              <div class="source-recon-node-top">
                <span class="source-recon-dot danger"></span>
                <span class="source-recon-label">Unresolved</span>
              </div>
              <div class="source-recon-value danger">${App.Fmt.number(dataset.excludedNoNameRows || 0)}</div>
              <div class="source-recon-desc">No-name rows</div>
            </div>
            <div class="source-recon-connector">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
            <div class="source-recon-node">
              <div class="source-recon-node-top">
                <span class="source-recon-dot success"></span>
                <span class="source-recon-label">Processed</span>
              </div>
              <div class="source-recon-value success">${App.Fmt.number(records.length)}</div>
              <div class="source-recon-desc">Canonical inventory records</div>
            </div>
          </div>
        </div>
      `);
    }

    /* ── Compact Data Quality Card (Shared Audit) ─────────────── */
    if (App.DQAudit && typeof App.DQAudit.getAudit === 'function') {
      const audit = App.DQAudit.getAudit(dataset_id, records);
      const scoreColor = audit.overall >= 90 ? '#10b981' : audit.overall >= 70 ? '#f59e0b' : '#ef4444';
      container.insertAdjacentHTML('beforeend', `
        <div class="card mb-24 dashboard-dq-card" onclick="App.Router.go('quality')" style="cursor:pointer" role="button" tabindex="0" title="Inspect Data Quality Center">
          <div class="dq-card-main">
            <!-- Row 1: Score circle + Title & Badge -->
            <div class="dq-card-header-block">
              <div class="dq-score-circle" style="background:${scoreColor}22;border-color:${scoreColor}">
                <span class="dq-score-num" style="color:${scoreColor}">${Math.round(audit.overall)}</span>
              </div>
              <div class="dq-title-block">
                <div class="dq-title-row">
                  <span class="dq-title-text font-bold text-primary">Data Quality Health</span>
                  <span class="badge dq-status-badge" style="background:${scoreColor}22;color:${scoreColor}">${audit.overall >= 90 ? 'HEALTHY' : audit.overall >= 70 ? 'FAIR' : 'NEEDS ATTENTION'} (${audit.overall}%)</span>
                </div>
                <!-- Desktop description + inline chips -->
                <div class="dq-desc-desktop text-xs text-muted">
                  <span>${App.Fmt.number(audit.totalAffectedRecords)} of ${App.Fmt.number(audit.total)} records have quality notes</span>
                  <span class="dq-bullet">·</span>
                  <span class="text-danger font-semibold">${audit.severity.critical} Critical</span>
                  <span class="dq-bullet">·</span>
                  <span class="text-warning font-semibold">${audit.severity.warning} Warning</span>
                  <span class="dq-bullet">·</span>
                  <span style="color:#38bdf8;font-weight:600">${audit.severity.info} Info</span>
                </div>
              </div>
            </div>

            <!-- Mobile Row 2: Description text -->
            <div class="dq-desc-mobile text-xs text-muted">
              ${App.Fmt.number(audit.totalAffectedRecords)} of ${App.Fmt.number(audit.total)} records have quality notes
            </div>

            <!-- Mobile Row 3: Quality metrics chips grid -->
            <div class="dq-metrics-grid-mobile">
              <div class="dq-metric-chip dq-chip-critical">
                <div class="dq-chip-val text-danger">${App.Fmt.number(audit.severity.critical)}</div>
                <div class="dq-chip-lbl">Critical</div>
              </div>
              <div class="dq-metric-chip dq-chip-warning">
                <div class="dq-chip-val text-warning">${App.Fmt.number(audit.severity.warning)}</div>
                <div class="dq-chip-lbl">Warning</div>
              </div>
              <div class="dq-metric-chip dq-chip-info">
                <div class="dq-chip-val" style="color:#38bdf8">${App.Fmt.number(audit.severity.info)}</div>
                <div class="dq-chip-lbl">Info</div>
              </div>
            </div>
          </div>

          <!-- Row 4 / Right action button -->
          <div class="dq-card-action">
            <button class="btn btn-xs btn-ghost dq-inspect-btn" type="button" aria-label="Inspect Data Quality Center">
              <span>Inspect Data Quality Center</span>
              <span class="dq-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      `);
    }

    /* ── Primary Inventory Status Section (3-Card Simplification) ─── */
    if (App.InventoryStatusResolver && typeof App.InventoryStatusResolver.resolveDataset === 'function') {
      const statusSummary = App.InventoryStatusResolver.resolveDataset(records);
      
      container.insertAdjacentHTML('beforeend', `
        <div class="card mb-24 inventory-status-card">
          <div class="flex items-center justify-between mb-16">
            <div class="font-bold text-sm flex items-center gap-8 text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> Inventory Status
            </div>
            <div class="text-xs text-muted font-medium">From active workbook</div>
          </div>

          <div class="grid-3" style="gap:14px">
            <!-- Card 1: Total Inventory -->
            <div class="reconciliation-box" style="border-left:4px solid #6366f1;padding:14px 16px">
              <div class="text-xs text-muted font-medium">Total Inventory</div>
              <div class="font-bold text-lg mt-4 text-primary">${App.Fmt.currency(statusSummary.total.value)}</div>
              <div class="text-xs text-muted mt-4">${App.Fmt.number(statusSummary.total.records)} Records · ${App.Fmt.number(statusSummary.total.units)} Units</div>
              <div class="badge badge-muted mt-8" style="font-size:10px;padding:2px 6px">All Active Inventory</div>
            </div>

            <!-- Card 2: Sellable Items -->
            <div class="reconciliation-box" style="border-left:4px solid #10b981;padding:14px 16px">
              <div class="text-xs text-muted font-medium">Sellable Items</div>
              <div class="font-bold text-lg mt-4 text-success">${App.Fmt.currency(statusSummary.sellable.value)}</div>
              <div class="text-xs text-muted mt-4">${App.Fmt.number(statusSummary.sellable.records)} Records · ${App.Fmt.number(statusSummary.sellable.units)} Units</div>
              <div class="badge badge-success mt-8" style="font-size:10px;padding:2px 6px">Status: Sellable</div>
            </div>

            <!-- Card 3: Non-Sellable Items -->
            <div class="reconciliation-box" style="border-left:4px solid #ef4444;padding:14px 16px">
              <div class="text-xs text-muted font-medium">Non-Sellable Items</div>
              <div class="font-bold text-lg mt-4 text-danger">${App.Fmt.currency(statusSummary.nonSellable.value)}</div>
              <div class="text-xs text-muted mt-4">${App.Fmt.number(statusSummary.nonSellable.records)} Records · ${App.Fmt.number(statusSummary.nonSellable.units)} Units</div>
              <div class="badge badge-danger mt-8" style="font-size:10px;padding:2px 6px">Status: Non-Sellable</div>
            </div>
          </div>

          ${statusSummary.unknown.records > 0 ? `
            <div class="text-xs text-muted mt-12 flex items-center gap-6" style="padding-top:10px;border-top:1px solid var(--border-subtle)">
              <span>ℹ️</span>
              <span><strong>${App.Fmt.number(statusSummary.unknown.records)}</strong> records (${App.Fmt.currency(statusSummary.unknown.value)}) have undetermined sellability status and are excluded from the Sellable / Non-Sellable split.</span>
            </div>
          ` : ''}

          ${!statusSummary.reconciled ? `
            <div class="badge badge-warning mt-12 w-full text-xs" style="padding:8px 12px;display:flex;align-items:center;justify-content:space-between">
              <span>⚠️ Reconciliation Discrepancy Detected</span>
              <span>Difference: ${statusSummary.difference.records} records · ${statusSummary.difference.units} units · ${App.Fmt.currency(statusSummary.difference.value)}</span>
            </div>
          ` : ''}
        </div>
      `);
    }

    /* ── Workbook Sheet Breakdown (Units by Sheet & Value by Sheet) ──── */
    const sheetMap = new Map();
    for (const r of records) {
      const sheetName = r._raw_sheet_name || r._sheet_name || (r._raw && (r._raw._raw_sheet_name || r._raw._sheet_name)) || 'Sheet 1';
      if (!sheetMap.has(sheetName)) {
        sheetMap.set(sheetName, { name: sheetName, units: 0, value: 0, count: 0 });
      }
      const s = sheetMap.get(sheetName);
      s.units += (r.qty || 0);
      s.value += (r.source_value || 0);
      s.count += 1;
    }

    const allSheets = [...sheetMap.values()].sort((a, b) => b.value - a.value);
    const totalDatasetUnits = records.reduce((s, r) => s + (r.qty || 0), 0);
    const totalDatasetValue = records.reduce((s, r) => s + (r.source_value || 0), 0);

    // Top Contributors
    const topUnitsSheet = [...allSheets].sort((a, b) => b.units - a.units)[0] || { name: '—', units: 0 };
    const topUnitsPct = totalDatasetUnits ? ((topUnitsSheet.units / totalDatasetUnits) * 100).toFixed(1) : '0.0';

    const topValueSheet = allSheets[0] || { name: '—', value: 0 };
    const topValPct = totalDatasetValue ? ((topValueSheet.value / totalDatasetValue) * 100).toFixed(1) : '0.0';

    // Generate Units Legend (top 5 + Other if > 5)
    const unitsLegendSheets = allSheets.length > 5 ? [
      ...allSheets.slice(0, 4),
      {
        name: `Other (${allSheets.length - 4} sheets)`,
        units: allSheets.slice(4).reduce((s, x) => s + x.units, 0),
        value: allSheets.slice(4).reduce((s, x) => s + x.value, 0),
        isOther: true
      }
    ] : allSheets;

    const unitsLegendItemsHtml = unitsLegendSheets.map((s, idx) => {
      const color = s.isOther ? '#64748b' : getSheetColor(idx);
      const unitsPct = totalDatasetUnits ? ((s.units / totalDatasetUnits) * 100).toFixed(1) : '0.0';
      return `
        <div class="sheet-legend-item">
          <div class="sheet-legend-left">
            <span class="sheet-legend-dot" style="background:${color}"></span>
            <span class="sheet-legend-name" title="${App.Fmt.escapeHtml(s.name)}">${App.Fmt.escapeHtml(s.name)}</span>
          </div>
          <div class="sheet-legend-right">
            <span class="sheet-legend-val">${App.Fmt.number(s.units)} units</span>
            <span class="sheet-legend-pct">${unitsPct}%</span>
          </div>
        </div>
      `;
    }).join('');

    // Generate Value Legend (top 5 + Other if > 5)
    const valueLegendSheets = allSheets.length > 5 ? [
      ...allSheets.slice(0, 4),
      {
        name: `Other (${allSheets.length - 4} sheets)`,
        units: allSheets.slice(4).reduce((s, x) => s + x.units, 0),
        value: allSheets.slice(4).reduce((s, x) => s + x.value, 0),
        isOther: true
      }
    ] : allSheets;

    const valueLegendItemsHtml = valueLegendSheets.map((s, idx) => {
      const color = s.isOther ? '#64748b' : getSheetColor(idx);
      const valPct = totalDatasetValue ? ((s.value / totalDatasetValue) * 100).toFixed(1) : '0.0';
      return `
        <div class="sheet-legend-item">
          <div class="sheet-legend-left">
            <span class="sheet-legend-dot" style="background:${color}"></span>
            <span class="sheet-legend-name" title="${App.Fmt.escapeHtml(s.name)}">${App.Fmt.escapeHtml(s.name)}</span>
          </div>
          <div class="sheet-legend-right">
            <span class="sheet-legend-val">${App.Fmt.currency(s.value)}</span>
            <span class="sheet-legend-pct">${valPct}%</span>
          </div>
        </div>
      `;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="sheet-breakdown-section mb-24">
        <div class="sheet-cards-grid">
          <!-- Left Card: Units by Sheet -->
          <div class="card sheet-intel-card">
            <div class="sheet-card-header">
              <div class="sheet-card-title-group">
                <div class="sheet-card-title">Units by Sheet</div>
                <div class="sheet-card-desc">Inventory units distributed across workbook sheets</div>
              </div>
              <div class="sheet-card-total-badge">
                <span class="sheet-card-total-val">${App.Fmt.number(totalDatasetUnits)}</span>
                <span class="sheet-card-total-unit">Units</span>
              </div>
            </div>

            <div class="sheet-card-body">
              <div class="sheet-donut-container">
                <div class="sheet-donut-canvas-wrap">
                  <canvas id="sheet-units-chart"></canvas>
                </div>
                <div class="sheet-donut-center">
                  <span class="sheet-donut-center-label">TOTAL UNITS</span>
                  <span class="sheet-donut-center-value">${App.Fmt.number(totalDatasetUnits)}</span>
                </div>
              </div>
              <div class="sheet-legend-list">
                ${unitsLegendItemsHtml}
              </div>
            </div>

            <div class="sheet-card-footer">
              <div class="sheet-top-contributor">
                <span class="sheet-top-badge">TOP SHEET</span>
                <span class="sheet-top-name" title="${App.Fmt.escapeHtml(topUnitsSheet.name)}">${App.Fmt.escapeHtml(topUnitsSheet.name)}</span>
                <span class="sheet-top-metric">${topUnitsPct}% of Units · ${App.Fmt.number(topUnitsSheet.units)} units</span>
              </div>
            </div>
          </div>

          <!-- Right Card: Value by Sheet -->
          <div class="card sheet-intel-card">
            <div class="sheet-card-header">
              <div class="sheet-card-title-group">
                <div class="sheet-card-title">Value by Sheet</div>
                <div class="sheet-card-desc">Canonical inventory value distributed across workbook sheets</div>
              </div>
              <div class="sheet-card-total-badge">
                <span class="sheet-card-total-val">${App.Fmt.currency(totalDatasetValue)}</span>
              </div>
            </div>

            <div class="sheet-card-body">
              <div class="sheet-donut-container">
                <div class="sheet-donut-canvas-wrap">
                  <canvas id="sheet-value-chart"></canvas>
                </div>
                <div class="sheet-donut-center">
                  <span class="sheet-donut-center-label">TOTAL VALUE</span>
                  <span class="sheet-donut-center-value">${App.Fmt.currency(totalDatasetValue)}</span>
                </div>
              </div>
              <div class="sheet-legend-list">
                ${valueLegendItemsHtml}
              </div>
            </div>

            <div class="sheet-card-footer">
              <div class="sheet-top-contributor">
                <span class="sheet-top-badge">TOP SHEET</span>
                <span class="sheet-top-name" title="${App.Fmt.escapeHtml(topValueSheet.name)}">${App.Fmt.escapeHtml(topValueSheet.name)}</span>
                <span class="sheet-top-metric">${topValPct}% of Value · ${App.Fmt.currency(topValueSheet.value)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    renderSheetCharts(allSheets, totalDatasetUnits, totalDatasetValue);

    /* ── Category Overview ───────────────────────────────── */
    container.insertAdjacentHTML('beforeend', `
      <div class="section-header">
        <div class="section-title">Category Overview</div>
        <div class="flex gap-8">
          <button class="btn btn-sm btn-ghost" id="cat-sort-value" onclick="sortCategories('value')">By Value</button>
          <button class="btn btn-sm btn-ghost" id="cat-sort-units" onclick="sortCategories('units')">By Units</button>
        </div>
      </div>
      <div class="grid-3 mb-24" id="category-grid"></div>
    `);

    const catGrid = container.querySelector('#category-grid');
    const cats    = [...catMap.values()].sort((a,b) => b.value - a.value);

    cats.forEach((cat, idx) => {
      const color = getCatColor(cat.name, idx);
      const icon  = CAT_ICONS[cat.name] || '📦';
      const pct   = totalValue ? (cat.value/totalValue*100).toFixed(1) : 0;

      const el = document.createElement('div');
      el.className = 'category-card animate-fade-in-up';
      el.style.setProperty('--cat-color', color);
      el.style.animationDelay = `${idx*0.05}s`;
      el.innerHTML = `
        <div class="category-card-header">
          <div>
            <div class="category-card-name">${cat.name}</div>
            <div class="category-card-brands">${cat.brands.size} brands · ${cat.subcats.size} subcategories</div>
          </div>
          <div class="category-card-icon" style="background:${color}22;color:${color}">${icon}</div>
        </div>
        <div class="category-card-bar-wrap">
          <div class="category-card-bar-label">
            <span>${App.Fmt.currency(cat.value)}</span>
            <span>${pct}% of total</span>
          </div>
          <div class="category-card-bar-track">
            <div class="category-card-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
        <div class="category-card-stats">
          <div class="category-stat-item">
            <div class="category-stat-val">${App.Fmt.number(cat.qty)}</div>
            <div class="category-stat-lbl">Units</div>
          </div>
          <div class="category-stat-item">
            <div class="category-stat-val">${cat.skus.size}</div>
            <div class="category-stat-lbl">SKUs</div>
          </div>
          <div class="category-stat-item">
            <div class="category-stat-val">${App.Fmt.mass(cat.mass || cat.weight)}</div>
            <div class="category-stat-lbl">Mass</div>
          </div>
          <div class="category-stat-item">
            <div class="category-stat-val">${(cat.volume > 0 ? App.Fmt.volume(cat.volume) : "—")}</div>
            <div class="category-stat-lbl">Volume</div>
          </div>
        </div>`;
      el.onclick = () => App.Router.go('category', { name: encodeURIComponent(cat.name) });
      catGrid.appendChild(el);
    });

    /* ── Category value chart ────────────────────────────── */
    container.insertAdjacentHTML('beforeend', `
      <div class="grid-2 mb-24">
        <div class="chart-wrap">
          <div class="section-title mb-12">Value Distribution</div>
          <div class="chart-canvas-wrap"><canvas id="cat-value-chart"></canvas></div>
        </div>
        <div class="chart-wrap">
          <div class="section-title mb-12">Units Distribution</div>
          <div class="chart-canvas-wrap"><canvas id="cat-units-chart"></canvas></div>
        </div>
      </div>
    `);

    renderCategoryCharts(cats, CAT_COLORS);

    /* ── Top brands across all ───────────────────────────── */
    const brandMap = new Map();
    for (const r of records) {
      const b = r.normalized_brand || 'Unknown';
      if (!brandMap.has(b)) brandMap.set(b, { name:b, qty:0, value:0 });
      brandMap.get(b).qty   += (r.qty||0);
      brandMap.get(b).value += (r.source_value||0);
    }
    const topBrands = [...brandMap.values()].sort((a,b) => b.value-a.value).slice(0,10);

    container.insertAdjacentHTML('beforeend', `
      <div class="section-header" style="margin-bottom: 12px;">
        <div class="section-title">Top Brands by Value</div>
        <button class="btn btn-sm btn-ghost" onclick="App.Router.go('brands')">View All &rarr;</button>
      </div>
      <div class="card top-brands-card mb-24">
        <div class="top-brands-header">
          <div class="tb-col-rank">#</div>
          <div class="tb-col-brand">Brand</div>
          <div class="tb-col-units">Units</div>
          <div class="tb-col-value">Total Value</div>
          <div class="tb-col-share">Share</div>
        </div>
        <div class="top-brands-list" id="top-brands-list"></div>
      </div>
    `);

    const tbList = container.querySelector('#top-brands-list');
    const maxBrandVal = topBrands[0]?.value || 1;
    topBrands.forEach((b, i) => {
      const pct = totalValue ? (b.value / totalValue * 100).toFixed(1) : '0.0';
      const relPct = Math.max(4, Math.min(100, Math.round((b.value / maxBrandVal) * 100)));
      const rank = i + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
      const cleanName = App.Fmt.escapeHtml(b.name);

      tbList.insertAdjacentHTML('beforeend', `
        <div class="top-brand-row" onclick="App.Router.go('brand',{id:'${encodeURIComponent(b.name)}'})" role="button" tabindex="0" title="View ${cleanName} details">
          <div class="tb-col-rank">
            <span class="tb-rank-badge ${rankClass}">${rank}</span>
          </div>
          <div class="tb-col-brand">
            <div class="tb-avatar">${(b.name[0] || '?').toUpperCase()}</div>
            <div class="tb-info">
              <div class="tb-name">${cleanName}</div>
            </div>
          </div>
          <div class="tb-col-units">
            <span class="tb-metric-num">${App.Fmt.number(b.qty)}</span>
          </div>
          <div class="tb-col-value">
            <span class="tb-metric-val">${App.Fmt.currency(b.value)}</span>
          </div>
          <div class="tb-col-share">
            <div class="tb-share-wrap">
              <span class="tb-share-pct">${pct}%</span>
              <div class="tb-share-bar">
                <div class="tb-share-bar-fill" style="width:${relPct}%"></div>
              </div>
            </div>
            <div class="tb-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
        </div>`
      );
    });
  }

  function kpiCard(label, value, sub, icon, color) {
    return `<div class="kpi-card" style="--kpi-color:${color}">
      <div class="kpi-icon" style="background:${color}22;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  }

  function renderSheetCharts(sheets, totalUnits, totalValue) {
    requestAnimationFrame(() => {
      // Prepare display data (top contributors + 'Other' if > 7 sheets for readable doughnut charts)
      let chartSheets = sheets;
      if (sheets.length > 7) {
        const top = sheets.slice(0, 6);
        const others = sheets.slice(6);
        const otherUnits = others.reduce((s, x) => s + x.units, 0);
        const otherValue = others.reduce((s, x) => s + x.value, 0);
        chartSheets = [
          ...top,
          { name: `Other (${others.length} sheets)`, units: otherUnits, value: otherValue, isOther: true }
        ];
      }

      const labels = chartSheets.map(s => s.name);
      const colors = chartSheets.map((s, idx) => s.isOther ? '#64748b' : getSheetColor(idx));

      // Units by Sheet Chart
      const unitsCanvas = document.getElementById('sheet-units-chart');
      if (unitsCanvas) {
        if (window._sheetUnitsChart) window._sheetUnitsChart.destroy();
        window._sheetUnitsChart = new Chart(unitsCanvas, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: chartSheets.map(s => s.units),
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#13151e',
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const val = context.raw || 0;
                    const pct = totalUnits ? ((val / totalUnits) * 100).toFixed(1) : '0.0';
                    return ` ${context.label}: ${App.Fmt.number(val)} units (${pct}%)`;
                  }
                }
              }
            },
            cutout: '72%'
          }
        });
      }

      // Value by Sheet Chart
      const valueCanvas = document.getElementById('sheet-value-chart');
      if (valueCanvas) {
        if (window._sheetValueChart) window._sheetValueChart.destroy();
        window._sheetValueChart = new Chart(valueCanvas, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: chartSheets.map(s => s.value),
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#13151e',
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const val = context.raw || 0;
                    const pct = totalValue ? ((val / totalValue) * 100).toFixed(1) : '0.0';
                    return ` ${context.label}: ${App.Fmt.currency(val, false)} (${pct}%)`;
                  }
                }
              }
            },
            cutout: '72%'
          }
        });
      }
    });
  }

  function renderCategoryCharts(cats, colors) {
    requestAnimationFrame(() => {
      const labels = cats.map(c => c.name.length > 15 ? c.name.slice(0,15)+'…' : c.name);

      // Value chart
      const vc = document.getElementById('cat-value-chart');
      if (vc) {
        if (window._catValueChart) window._catValueChart.destroy();
        window._catValueChart = new Chart(vc, {
          type:'bar',
          data:{ labels, datasets:[{ data: cats.map(c=>c.value), backgroundColor: cats.map((_,i)=>colors[i%colors.length]+'cc'), borderRadius:4 }] },
          options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
            scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'#1a1d28'}},
                    y:{ticks:{color:'#64748b',font:{size:10},callback:(v)=>App.Fmt.currency(v, false)},grid:{color:'#1a1d28'}}} }
        });
      }

      // Units chart
      const uc = document.getElementById('cat-units-chart');
      if (uc) {
        if (window._catUnitsChart) window._catUnitsChart.destroy();
        window._catUnitsChart = new Chart(uc, {
          type:'bar',
          data:{ labels, datasets:[{ data: cats.map(c=>c.qty), backgroundColor: cats.map((_,i)=>colors[i%colors.length]+'cc'), borderRadius:4 }] },
          options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
            scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'#1a1d28'}},
                    y:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'#1a1d28'}}} }
        });
      }
    });
  }

  function renderWelcome(container) {
    container.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-logo">📦</div>
        <div class="welcome-title">No Dataset Loaded</div>
        <div class="welcome-sub">Upload an Excel (.xlsx, .xls) or CSV inventory spreadsheet to get started. DataSheet IQ will automatically parse, normalize, and calculate live metrics for your active dataset.</div>
        <button class="btn btn-primary btn-lg" onclick="App.UI.showUploadModal()">
          <span>📂</span> Upload Inventory Spreadsheet
        </button>
        <div class="welcome-features">
          <div class="welcome-feature">
            <div class="welcome-feature-icon">🔬</div>
            <div class="welcome-feature-name">Smart Normalization</div>
            <div class="welcome-feature-desc">Cleans messy brand/product names automatically</div>
          </div>
          <div class="welcome-feature">
            <div class="welcome-feature-icon">🏷️</div>
            <div class="welcome-feature-name">Category Drill-down</div>
            <div class="welcome-feature-desc">Category → Subcategory → Brand → Product → Variant</div>
          </div>
          <div class="welcome-feature">
            <div class="welcome-feature-icon">🔍</div>
            <div class="welcome-feature-name">NL Search</div>
            <div class="welcome-feature-desc">"Which category has the highest value?"</div>
          </div>
        </div>
      </div>`;
  }

  window.sortCategories = function(by) { /* re-render categories sorted differently */ };

  return { render };
})();
