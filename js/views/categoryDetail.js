window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   CATEGORY DETAIL VIEW (SCOPE-AWARE & CANONICAL COMPATIBLE)
   Shows subcategories + brand table for one category, with
   row-level scope-aware business reference reconciliation.
   ============================================================ */
App.Views.CategoryDetail = (() => {

  let _activeScopeMode = 'all'; // 'all' | 'business' | 'delta_canonical' | 'delta_biz'
  let _currentRecon = null;

  const targetIconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
  const allCanonicalSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;flex-shrink:0"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
  const businessScopeSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
  const extraRowsSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  const missingRowsSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  const docIconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
  const skuStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>';
  const unitsStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
  const valStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg>';
  const scopeStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
  const weightStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"></path></svg>';
  const brandStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path></svg>';
  const avgStatSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>';

  async function render(container, params, dataset_id) {
    const catName = decodeURIComponent(params.name || '');
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="display:flex;justify-content:center;margin-bottom:8px"><svg width="36" height="36" style="opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view category details.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><span>📂</span> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading ${catName}…</span></div>`;

    const allDatasetRecords = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    const catRecords = allDatasetRecords.filter(r => r.normalized_category === catName);

    if (!catRecords.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="display:flex;justify-content:center;margin-bottom:8px"><svg width="36" height="36" style="opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
          <div class="font-bold text-base mb-8">No Records Found</div>
          <div class="text-sm text-muted mb-16">No records found for category "${catName}" in the active dataset.</div>
          <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">Back to Dashboard</button>
        </div>`;
      return;
    }

    const catCfg     = App.Categorizer.getCategoryConfig(catName);
    const totalUnits = catRecords.reduce((s,r) => s+(r.qty||0), 0);
    const totalValue = catRecords.reduce((s,r) => s+(r.source_value||0), 0);
    const totalWeight= catRecords.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalMass  = catRecords.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalVolume= catRecords.reduce((s,r) => s+(r.total_volume_l||0), 0);
    const totalSKUs  = new Set(catRecords.map(r => r.product_family_id)).size;
    const brandSet   = new Set(catRecords.map(r => r.normalized_brand));

    // Ensure accurate real-time subcategory classification
    if (window.App && window.App.Categorizer && typeof window.App.Categorizer.classify === 'function') {
      for (const r of catRecords) {
        const res = App.Categorizer.classify(r.source_category || catName, r.normalized_product_name, r.normalized_brand);
        if (res && res.subcategory) {
          r.subcategory = res.subcategory;
        }
      }
    }

    // Group by subcategory
    const subcatMap = new Map();
    for (const r of catRecords) {
      const sc = r.subcategory || 'General';
      if (!subcatMap.has(sc)) subcatMap.set(sc, { name:sc, qty:0, value:0, weight:0, mass:0, volume:0, skus:new Set(), brands:new Set(), records:[] });
      const s = subcatMap.get(sc);
      s.qty    += (r.qty||0);
      s.value  += (r.source_value||0);
      s.weight += (r.total_weight||0);
      s.mass   += (r.total_weight||0);
      s.volume += (r.total_volume_l||0);
      s.skus.add(r.product_family_id);
      s.brands.add(r.normalized_brand);
      s.records.push(r);
    }

    const subcats = [...subcatMap.values()].sort((a,b) => b.value - a.value);

    // Initial selected subcat from params or default to all
    const initialSubcat = params.subcat ? decodeURIComponent(params.subcat) : '';

    container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item" onclick="App.Router.go('dashboard')">Dashboard</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-item active">${catCfg.icon||'📦'} ${catName}</span>
      </div>

      <!-- Category Header -->
      <div class="category-header mb-24">
        <div class="cat-header-icon" style="background:${catCfg.color}22;color:${catCfg.color}">
          ${catCfg.icon||'📦'}
        </div>
        <div class="cat-header-info">
          <div class="flex items-center gap-12 mb-4">
            <h1 class="text-2xl font-bold">${catName}</h1>
            <span class="badge badge-neutral">${subcats.length} subcategories</span>
            <span class="badge badge-neutral">${brandSet.size} brands</span>
          </div>
          <div class="text-sm text-muted">Complete breakdown of inventory, brand share, and SKU analytics.</div>
        </div>
        <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back to Dashboard
        </button>
      </div>

      <!-- Category KPIs (Canonical Totals) -->
      <div class="kpi-grid mb-24">
        ${kpi('Total Value (Canonical)', App.Fmt.currency(totalValue), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>', '#10b981')}
        ${kpi('Total Units',            App.Fmt.number(totalUnits),   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', '#6366f1')}
        ${kpi('Total Mass',             App.Fmt.mass(totalMass),      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>', '#38bdf8')}
        ${kpi('Total Volume',           App.Fmt.volume(totalVolume),  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8M12 2v6M5 8h14l-2 13H7L5 8z"/></svg>', '#06b6d4')}
        ${kpi('Total SKUs',             App.Fmt.number(totalSKUs),    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', '#f59e0b')}
        ${kpi('Active Brands',          App.Fmt.number(brandSet.size),'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>', '#a78bfa')}
      </div>

      <!-- Scope-Aware Business Reconciliation Section -->
      <div id="scope-recon-container" class="mb-24"></div>

      <!-- Subcategory Tabs -->
      <div class="subcat-tabs-wrap mb-20">
        <div class="subcat-tabs" id="subcat-tabs">
          <button class="subcat-tab ${!initialSubcat ? 'active' : ''}" data-subcat="" onclick="App.Views.CategoryDetail.showSubcat('')">
            All ${catName}
          </button>
          ${subcats.map(sc => `
            <button class="subcat-tab ${initialSubcat === sc.name ? 'active' : ''}" data-subcat="${escHtml(sc.name)}" onclick="App.Views.CategoryDetail.showSubcat('${escHtml(sc.name)}')">
              ${escHtml(sc.name)}
              <span class="subcat-tab-badge">${App.Fmt.currency(sc.value)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Subcategory Summary Panel -->
      <div id="subcat-summary" class="subcat-summary-panel mb-24">
        <div class="subcat-summary-header">
          <div class="subcat-summary-title" id="subcat-summary-title"></div>
          <button class="subcat-summary-close" onclick="App.Views.CategoryDetail.closeSummary()" title="Close summary" aria-label="Close summary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="subcat-summary-grid" id="subcat-summary-grid"></div>
      </div>

      <!-- Brand Breakdown Table -->
      <div class="card p-20">
        <div class="flex items-center justify-between mb-16">
          <div>
            <div class="font-bold text-base" id="brand-list-title">Brand Breakdown</div>
            <div class="text-xs text-muted" id="brand-list-subtitle">Ranked by inventory valuation</div>
          </div>
          <div class="flex items-center gap-8">
            <span class="text-xs text-muted">Sort by:</span>
            <button class="btn btn-xs btn-secondary" onclick="App.Views.CategoryDetail.sort('value')">Value</button>
            <button class="btn btn-xs btn-secondary" onclick="App.Views.CategoryDetail.sort('units')">Units</button>
            <button class="btn btn-xs btn-secondary" onclick="App.Views.CategoryDetail.sort('weight')">Weight</button>
            <button class="btn btn-xs btn-secondary" onclick="App.Views.CategoryDetail.sort('alpha')">A–Z</button>
          </div>
        </div>
        <div id="brand-list-wrap"></div>
      </div>
    `;

    // Save globals for view lifecycle
    window._catRecords = catRecords;
    window._allDatasetRecords = allDatasetRecords;
    window._catName = catName;
    window._activeSubcat = initialSubcat;
    window._subcatMap = subcatMap;
    window._activeScopeMode = 'all';

    // Helper to render scope reconciliation (only when explicitly opted in)
    function renderScopeReconciliation(scName) {
      const reconWrap = container.querySelector('#scope-recon-container');
      if (!reconWrap) return;

      const activeProfile = window.App?.State?.activeReportingProfile;
      const isExplicitBusinessProfile = activeProfile && 
        !String(activeProfile).toLowerCase().includes('canonical') && 
        !String(activeProfile).toLowerCase().includes('standard');

      if (!isExplicitBusinessProfile || !App.ReportingMapper || typeof App.ReportingMapper.getCategoryReconciliation !== 'function') {
        reconWrap.innerHTML = '';
        _currentRecon = null;
        return;
      }

      // If viewing category-level (scName is empty)
      if (!scName) {
        const configuredBuckets = [];
        for (const sc of subcats) {
          const b = App.ReportingMapper.getFMBucketForSubcat(sc.name, catName);
          if (b && !configuredBuckets.some(x => x.bucketName === b)) {
            const r = App.ReportingMapper.getCategoryReconciliation(catName, sc.name, allDatasetRecords, activeProfile);
            if (r && r.hasBusinessScope) {
              configuredBuckets.push(r);
            }
          }
        }

        if (configuredBuckets.length > 0) {
          const recon = configuredBuckets[0];
          const deltaVal = recon.valueDelta;
          const deltaRows = recon.actualRows - recon.expectedRows;
          reconWrap.innerHTML = `
        <div class="card p-18 scope-recon-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%); border: 1px solid rgba(99, 102, 241, 0.18); border-radius: 12px; margin-bottom: 16px;">
          <div class="flex items-center justify-between mb-14 flex-wrap gap-8">
            <div class="flex items-center gap-10">
              <span class="flex items-center text-primary" style="background: rgba(99, 102, 241, 0.12); padding: 6px; border-radius: 8px;">${targetIconSvg}</span>
              <div>
                <div class="font-bold text-sm flex items-center gap-8 text-primary">
                  <span>Scope-Aware Business Reconciliation</span>
                  <span class="badge badge-primary" style="font-size: 11px; padding: 2px 8px;">${escHtml(recon.bucketName)}</span>
                  <span class="badge badge-neutral" style="font-size: 11px; padding: 2px 8px;">${escHtml(recon.scopeLabel)}</span>
                </div>
                <div class="text-xs text-muted" style="margin-top: 2px;">${escHtml(recon.scopeDescription)} &mdash; ${escHtml(recon.profileName)}</div>
              </div>
            </div>
            <div class="flex items-center gap-8">
              <span class="text-xs font-semibold px-8 py-4 rounded" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);">
                Target Value: ${App.Fmt.currency(recon.targetValue)}
              </span>
            </div>
          </div>

          <!-- Comparative Scope Grid -->
          <div class="recon-cards-grid mb-14" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <!-- Canonical Scope Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); display: flex; flex-direction: column; justify-content: space-between; min-height: 84px;">
              <div class="text-xs text-muted font-semibold uppercase" style="font-size: 10.5px; letter-spacing: 0.03em;">Actual Canonical Inventory</div>
              <div class="text-lg font-bold" style="color: #818cf8; margin: 3px 0;">${App.Fmt.currency(recon.canonical.value)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${App.Fmt.number(recon.actualRows)}</strong> source rows &middot; <strong>${App.Fmt.number(recon.canonical.units)}</strong> units</div>
            </div>

            <!-- Business Reference Scope Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); display: flex; flex-direction: column; justify-content: space-between; min-height: 84px;">
              <div class="text-xs font-semibold uppercase" style="color: #10b981; font-size: 10.5px; letter-spacing: 0.03em;">Expected Business Scope</div>
              <div class="text-lg font-bold" style="color: #10b981; margin: 3px 0;">${App.Fmt.currency(recon.business.value)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${App.Fmt.number(recon.expectedRows)}</strong> scoped rows &middot; <strong>${App.Fmt.number(recon.business.units)}</strong> units</div>
            </div>

            <!-- Value & Units Delta Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); display: flex; flex-direction: column; justify-content: space-between; min-height: 84px;">
              <div class="text-xs font-semibold uppercase" style="color: #f59e0b; font-size: 10.5px; letter-spacing: 0.03em;">Scope Delta</div>
              <div class="text-lg font-bold" style="color: ${deltaVal === 0 ? '#10b981' : '#f59e0b'}; margin: 3px 0;">
                ${deltaVal > 0 ? '+' : ''}${App.Fmt.currency(deltaVal)}
              </div>
              <div class="text-xs text-muted" style="font-size: 11px;">Units &Delta;: <strong>${recon.unitsDelta > 0 ? '+' : ''}${recon.unitsDelta}</strong> &middot; Rows &Delta;: <strong>${deltaRows > 0 ? '+' : ''}${deltaRows}</strong></div>
            </div>

            <!-- Exact Overlap / Intersection Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); display: flex; flex-direction: column; justify-content: space-between; min-height: 84px;">
              <div class="text-xs font-semibold uppercase" style="color: #38bdf8; font-size: 10.5px; letter-spacing: 0.03em;">Exact Row Overlap</div>
              <div class="text-lg font-bold" style="color: #38bdf8; margin: 3px 0;">${App.Fmt.currency(recon.reconciliation.intersectionValue)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${recon.reconciliation.intersectionCount}</strong> rows in both scopes</div>
            </div>

            <!-- Missing & Extra Rows Breakdown Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.2); display: flex; flex-direction: column; justify-content: space-between; min-height: 84px;">
              <div class="text-xs font-semibold uppercase" style="color: #a78bfa; font-size: 10.5px; letter-spacing: 0.03em;">Set Differences</div>
              <div class="text-xs font-semibold" style="margin-top: 3px;">
                <span style="color: #f59e0b;">Extra Rows: <strong>${recon.extraRows}</strong></span> (${App.Fmt.currency(recon.reconciliation.canonicalOnlyValue)})
              </div>
              <div class="text-xs font-semibold" style="margin-top: 2px;">
                <span style="color: #ec4899;">Missing Rows: <strong>${recon.missingRows}</strong></span> (${App.Fmt.currency(recon.reconciliation.businessOnlyValue)})
              </div>
            </div>
          </div>

          <!-- Scope Row Set Filter Tabs -->
          <div class="flex items-center justify-between flex-wrap gap-8 pt-10" style="border-top: 1px solid rgba(255, 255, 255, 0.06);">
            <div class="flex items-center gap-6 flex-wrap">
              <span class="text-xs font-semibold text-muted mr-4">View Scope:</span>
              <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('all')">
                ${allCanonicalSvg} All Canonical (${recon.actualRows})
              </button>
              <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'business' ? 'btn-success' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('business')">
                ${businessScopeSvg} Business Scope (${recon.expectedRows})
              </button>
              ${recon.extraRows > 0 ? `
                <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'delta_canonical' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_canonical')">
                  ${extraRowsSvg} Extra Canonical Rows (${recon.extraRows})
                </button>
              ` : ''}
              ${recon.missingRows > 0 ? `
                <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'delta_biz' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_biz')">
                  ${missingRowsSvg} Missing / Business-Only (${recon.missingRows})
                </button>
              ` : ''}
            </div>
            <div class="text-xs text-muted">
              ${_activeScopeMode === 'business' ? `Displaying exact ${recon.expectedRows} ${recon.scopeLabel} rows (${App.Fmt.currency(recon.business.value)})` : 
                _activeScopeMode === 'delta_canonical' ? `Displaying ${recon.extraRows} extra rows present in Canonical but outside ${recon.scopeLabel}` :
                _activeScopeMode === 'delta_biz' ? `Displaying ${recon.missingRows} missing rows mapped to ${recon.bucketName} in Business Profile` :
                `Displaying independent Canonical Category inventory (${App.Fmt.currency(recon.canonical.value)})`}
            </div>
          </div>
        </div>
      `;
        } else {
          reconWrap.innerHTML = '';
        }
        _currentRecon = null;
        return;
      }

      const recon = App.ReportingMapper.getCategoryReconciliation(catName, scName, allDatasetRecords, activeProfile);
      _currentRecon = recon;

      if (!recon || !recon.hasBusinessScope) {
        reconWrap.innerHTML = '';
        return;
      }

      const deltaVal = recon.valueDelta;
      const deltaRows = recon.actualRows - recon.expectedRows;

      reconWrap.innerHTML = `
        <div class="card p-18 scope-recon-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%); border: 1px solid rgba(99, 102, 241, 0.16); border-radius: 12px; margin-bottom: 16px;">
          <div class="flex items-center justify-between mb-12 flex-wrap gap-8">
            <div class="flex items-center gap-10">
              <span class="flex items-center text-primary" style="background: rgba(99, 102, 241, 0.12); padding: 6px; border-radius: 8px;">${targetIconSvg}</span>
              <div>
                <div class="font-bold text-sm flex items-center gap-8 text-primary">
                  <span>Scope-Aware Business Reconciliation</span>
                  <span class="badge badge-primary" style="font-size: 11px; padding: 2px 8px;">${escHtml(recon.bucketName)}</span>
                  <span class="badge badge-neutral" style="font-size: 11px; padding: 2px 8px;">${escHtml(recon.scopeLabel)}</span>
                </div>
                <div class="text-xs text-muted" style="margin-top: 2px;">${escHtml(recon.scopeDescription)} &mdash; ${escHtml(recon.profileName)}</div>
              </div>
            </div>
            <div class="flex items-center gap-8">
              <span class="text-xs font-semibold px-8 py-4 rounded" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);">
                Target Value: ${App.Fmt.currency(recon.targetValue)}
              </span>
            </div>
          </div>

          <!-- Comparative Scope Grid -->
          <div class="recon-cards-grid mb-12" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <!-- Canonical Scope Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06); display: flex; flex-direction: column; justify-content: space-between; min-height: 82px;">
              <div class="text-xs text-muted font-semibold uppercase" style="font-size: 10.5px; letter-spacing: 0.03em;">Actual Canonical Inventory</div>
              <div class="text-lg font-bold" style="color: #818cf8; margin: 2px 0;">${App.Fmt.currency(recon.canonical.value)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${App.Fmt.number(recon.actualRows)}</strong> source rows &middot; <strong>${App.Fmt.number(recon.canonical.units)}</strong> units</div>
            </div>

            <!-- Business Reference Scope Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 82px;">
              <div class="text-xs font-semibold uppercase" style="color: #10b981; font-size: 10.5px; letter-spacing: 0.03em;">Expected Business Scope</div>
              <div class="text-lg font-bold" style="color: #10b981; margin: 2px 0;">${App.Fmt.currency(recon.business.value)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${App.Fmt.number(recon.expectedRows)}</strong> scoped rows &middot; <strong>${App.Fmt.number(recon.business.units)}</strong> units</div>
            </div>

            <!-- Value & Units Delta Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(245, 158, 11, 0.04); border: 1px solid rgba(245, 158, 11, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 82px;">
              <div class="text-xs font-semibold uppercase" style="color: #f59e0b; font-size: 10.5px; letter-spacing: 0.03em;">Scope Delta</div>
              <div class="text-lg font-bold" style="color: ${deltaVal === 0 ? '#10b981' : '#f59e0b'}; margin: 2px 0;">
                ${deltaVal > 0 ? '+' : ''}${App.Fmt.currency(deltaVal)}
              </div>
              <div class="text-xs text-muted" style="font-size: 11px;">Units &Delta;: <strong>${recon.unitsDelta > 0 ? '+' : ''}${recon.unitsDelta}</strong> &middot; Rows &Delta;: <strong>${deltaRows > 0 ? '+' : ''}${deltaRows}</strong></div>
            </div>

            <!-- Exact Overlap / Intersection Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(56, 189, 248, 0.04); border: 1px solid rgba(56, 189, 248, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 82px;">
              <div class="text-xs font-semibold uppercase" style="color: #38bdf8; font-size: 10.5px; letter-spacing: 0.03em;">Exact Row Overlap</div>
              <div class="text-lg font-bold" style="color: #38bdf8; margin: 2px 0;">${App.Fmt.currency(recon.reconciliation.intersectionValue)}</div>
              <div class="text-xs text-muted" style="font-size: 11px;"><strong>${recon.reconciliation.intersectionCount}</strong> rows in both scopes</div>
            </div>

            <!-- Missing & Extra Rows Breakdown Card -->
            <div class="p-12 rounded recon-kpi-card" style="background: rgba(167, 139, 250, 0.04); border: 1px solid rgba(167, 139, 250, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 82px;">
              <div class="text-xs font-semibold uppercase" style="color: #a78bfa; font-size: 10.5px; letter-spacing: 0.03em;">Set Differences</div>
              <div class="text-xs font-semibold" style="margin-top: 2px;">
                <span style="color: #f59e0b;">Extra Rows: <strong>${recon.extraRows}</strong></span> (${App.Fmt.currency(recon.reconciliation.canonicalOnlyValue)})
              </div>
              <div class="text-xs font-semibold" style="margin-top: 1px;">
                <span style="color: #ec4899;">Missing Rows: <strong>${recon.missingRows}</strong></span> (${App.Fmt.currency(recon.reconciliation.businessOnlyValue)})
              </div>
            </div>
          </div>

          <!-- Scope Row Set Filter Tabs -->
          <div class="flex items-center justify-between flex-wrap gap-8 pt-10" style="border-top: 1px solid rgba(255, 255, 255, 0.05);">
            <div class="flex items-center gap-6 flex-wrap">
              <span class="text-xs font-semibold text-muted mr-4">View Scope:</span>
              <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('all')">
                ${allCanonicalSvg} All Canonical (${recon.actualRows})
              </button>
              <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'business' ? 'btn-success' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('business')">
                ${businessScopeSvg} Business Scope (${recon.expectedRows})
              </button>
              ${recon.extraRows > 0 ? `
                <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'delta_canonical' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_canonical')">
                  ${extraRowsSvg} Extra Canonical Rows (${recon.extraRows})
                </button>
              ` : ''}
              ${recon.missingRows > 0 ? `
                <button class="btn btn-xs scope-filter-tab ${_activeScopeMode === 'delta_biz' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_biz')">
                  ${missingRowsSvg} Missing / Business-Only (${recon.missingRows})
                </button>
              ` : ''}
            </div>
            <div class="text-xs text-muted">
              ${_activeScopeMode === 'business' ? `Displaying exact ${recon.expectedRows} ${recon.scopeLabel} rows (${App.Fmt.currency(recon.business.value)})` : 
                _activeScopeMode === 'delta_canonical' ? `Displaying ${recon.extraRows} extra rows present in Canonical but outside ${recon.scopeLabel}` :
                _activeScopeMode === 'delta_biz' ? `Displaying ${recon.missingRows} missing rows mapped to ${recon.bucketName} in Business Profile` :
                `Displaying independent Canonical Category inventory (${App.Fmt.currency(recon.canonical.value)})`}
            </div>
          </div>
        </div>
      `;
    }

    // Function to filter displayed records by current active scope mode
    function getActiveDisplayRecords(sc) {
      if (!_currentRecon || !_currentRecon.hasBusinessScope || _activeScopeMode === 'all') {
        return sc ? catRecords.filter(r => (r.subcategory||'General') === sc) : catRecords;
      }
      if (_activeScopeMode === 'business') {
        return _currentRecon.business.rows;
      }
      if (_activeScopeMode === 'delta_canonical') {
        return _currentRecon.reconciliation.canonicalOnlyRows;
      }
      if (_activeScopeMode === 'delta_biz') {
        return _currentRecon.reconciliation.businessOnlyRows;
      }
      return sc ? catRecords.filter(r => (r.subcategory||'General') === sc) : catRecords;
    }

    // Bind subcategory click handler
    App.Views.CategoryDetail.showSubcat = (sc) => {
      window._activeSubcat = sc;
      _activeScopeMode = 'all';

      // Update URL hash without re-rendering everything
      const newHash = sc 
        ? `#/category?name=${encodeURIComponent(catName)}&subcat=${encodeURIComponent(sc)}`
        : `#/category?name=${encodeURIComponent(catName)}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }

      renderScopeReconciliation(sc);

      const filtered = getActiveDisplayRecords(sc);
      const displayTotalVal = filtered.reduce((s, r) => s + (r.source_value || 0), 0);
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), displayTotalVal || totalValue, 'value', sc || '');

      document.querySelectorAll('#subcat-tabs .subcat-tab').forEach(b => {
        if ((b.dataset.subcat || '') === (sc || '')) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Show subcategory summary
      if (sc && window._subcatMap?.has(sc)) {
        _showSubcatSummary(window._subcatMap.get(sc), totalValue, totalUnits, totalWeight, totalSKUs, _currentRecon);
      } else {
        App.Views.CategoryDetail.closeSummary();
      }
    };

    App.Views.CategoryDetail.setScopeMode = (mode) => {
      _activeScopeMode = mode;
      const currentSc = window._activeSubcat;
      renderScopeReconciliation(currentSc);

      const filtered = getActiveDisplayRecords(currentSc);
      const displayTotalVal = filtered.reduce((s, r) => s + (r.source_value || 0), 0);
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), displayTotalVal || totalValue, 'value', currentSc || '');
    };

    App.Views.CategoryDetail.closeSummary = () => {
      const panel = document.getElementById('subcat-summary');
      if (panel) {
        panel.classList.remove('visible');
      }
    };

    App.Views.CategoryDetail.sort = (by) => {
      const currentSc = window._activeSubcat;
      const filtered = getActiveDisplayRecords(currentSc);
      const displayTotalVal = filtered.reduce((s, r) => s + (r.source_value || 0), 0);
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), displayTotalVal || totalValue, by, currentSc);
    };

    // Initial render
    renderScopeReconciliation(initialSubcat);
    const initialFiltered = getActiveDisplayRecords(initialSubcat);
    buildBrandList(initialFiltered, container.querySelector('#brand-list-wrap'), totalValue, 'value', initialSubcat);

    if (initialSubcat && subcatMap.has(initialSubcat)) {
      _showSubcatSummary(subcatMap.get(initialSubcat), totalValue, totalUnits, totalWeight, totalSKUs, _currentRecon);
    }
  }

  function _showSubcatSummary(scData, totalValue, totalUnits, totalWeight, totalSKUs, recon) {
    const panel = document.getElementById('subcat-summary');
    const titleEl = document.getElementById('subcat-summary-title');
    const gridEl = document.getElementById('subcat-summary-grid');
    if (!panel || !titleEl || !gridEl) return;

    const skuCount = scData.skus instanceof Set ? scData.skus.size : (scData.skus || 0);
    const brandCount = scData.brands instanceof Set ? scData.brands.size : (scData.brands || 0);
    const valuePct = totalValue ? ((scData.value / totalValue) * 100).toFixed(1) : '0';
    const unitsPct = totalUnits ? ((scData.qty / totalUnits) * 100).toFixed(1) : '0';

    titleEl.innerHTML = `<span class="subcat-summary-icon" style="display:inline-flex;align-items:center;color:var(--primary)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span> ${escHtml(scData.name)}`;

    let businessScopeCardHtml = '';
    const activeProfile = window.App?.State?.activeReportingProfile;
    const isExplicitBusinessProfile = activeProfile && 
      !String(activeProfile).toLowerCase().includes('canonical') && 
      !String(activeProfile).toLowerCase().includes('standard');

    if (recon && recon.hasBusinessScope && isExplicitBusinessProfile) {
      businessScopeCardHtml = `
        <div class="subcat-stat-card" style="--stat-color: #ec4899">
          <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>
          <div class="subcat-stat-info">
            <div class="subcat-stat-value">${App.Fmt.currency(recon.business.value)}</div>
            <div class="subcat-stat-label">Business Scope (${recon.scopeLabel})</div>
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = `
      <div class="subcat-stat-card" style="--stat-color: #6366f1">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(skuCount)}</div>
          <div class="subcat-stat-label">SKUs</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #10b981">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(scData.qty)}</div>
          <div class="subcat-stat-label">Units <span class="subcat-stat-pct">(${unitsPct}%)</span></div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #f59e0b">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="6" x2="12" y2="18"></line></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.currency(scData.value)}</div>
          <div class="subcat-stat-label">Canonical Value <span class="subcat-stat-pct">(${valuePct}%)</span></div>
        </div>
      </div>
      ${businessScopeCardHtml}
      <div class="subcat-stat-card" style="--stat-color: #38bdf8">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"></path></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.weight(scData.weight)}</div>
          <div class="subcat-stat-label">Mass</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #a78bfa">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(brandCount)}</div>
          <div class="subcat-stat-label">Brands</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #06b6d4">
        <div class="subcat-stat-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/></svg></div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${scData.volume > 0 ? App.Fmt.volume(scData.volume) : '&mdash;'}</div>
          <div class="subcat-stat-label">Volume</div>
        </div>
      </div>
    `;

    // Animate panel in
    requestAnimationFrame(() => {
      panel.classList.add('visible');
    });
  }

  function buildBrandList(records, wrap, totalValue, sortBy = 'value', activeSubcat = window._activeSubcat) {
    const brandMap = new Map();
    for (const r of records) {
      const b = r.normalized_brand || 'Unknown';
      if (!brandMap.has(b)) brandMap.set(b, {
        name:b, brand_id:r.brand_id, qty:0, value:0, weight:0, mass:0, volume:0, skus:new Set()
      });
      const bm = brandMap.get(b);
      bm.qty    += (r.qty||0);
      bm.value  += (r.source_value||0);
      bm.weight += (r.total_weight||0);
      bm.mass   += (r.total_weight||0);
      bm.volume += (r.total_volume_l||0);
      bm.skus.add(r.product_family_id);
    }

    let brands = [...brandMap.values()];
    if (sortBy === 'value')  brands.sort((a,b) => b.value  - a.value);
    if (sortBy === 'units')  brands.sort((a,b) => b.qty    - a.qty);
    if (sortBy === 'weight') brands.sort((a,b) => b.weight - a.weight);
    if (sortBy === 'alpha')  brands.sort((a,b) => a.name.localeCompare(b.name));

    wrap.innerHTML = '';
    brands.forEach((b, i) => {
      const pct = totalValue ? (b.value/totalValue*100).toFixed(1) : 0;
      const el  = document.createElement('div');
      el.className = 'brand-row';
      el.dataset.brand = b.name;
      el.innerHTML = `
        <div class="brand-rank">${i+1}</div>
        <div class="brand-avatar">${(b.name[0]||'?').toUpperCase()}</div>
        <div class="brand-name-block">
          <div class="brand-name">${escHtml(b.name)}</div>
          <div class="brand-aliases">${b.skus.size} SKUs</div>
        </div>
        <div class="brand-stats">
          <div class="brand-stat-item">
            <div class="brand-stat-val">${App.Fmt.number(b.qty)}</div>
            <div class="brand-stat-lbl">Units</div>
          </div>
          <div class="brand-stat-item">
            <div class="brand-stat-val">${App.Fmt.mass(b.mass || b.weight)}</div>
            <div class="brand-stat-lbl">Mass</div>
          </div>
          <div class="brand-stat-item">
            <div class="brand-stat-val">${(b.volume > 0 ? App.Fmt.volume(b.volume) : "—")}</div>
            <div class="brand-stat-lbl">Volume</div>
          </div>
          <div class="brand-stat-item">
            <div class="brand-stat-val">${App.Fmt.currency(b.value)}</div>
            <div class="brand-stat-lbl">Value</div>
          </div>
          <div class="brand-stat-item">
            <div class="brand-stat-val">${pct}%</div>
            <div class="brand-stat-lbl">of View</div>
          </div>
        </div>
        <div class="brand-pct-bar"><div class="brand-pct-fill" style="width:${Math.min(100,parseFloat(pct)*3)}%"></div></div>
      `;
      el.onclick = () => {
        const routeParams = {
          id: encodeURIComponent(b.name),
          cat: encodeURIComponent(window._catName||'')
        };
        const currentSc = activeSubcat || window._activeSubcat;
        if (currentSc) {
          routeParams.subcat = encodeURIComponent(currentSc);
        }
        App.Router.go('brand', routeParams);
      };
      wrap.appendChild(el);
    });

    if (!brands.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon" style="display:flex;justify-content:center;margin-bottom:8px"><svg width="36" height="36" style="opacity:0.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div><div>No brands found in this scope</div></div>';
    }
  }

  function kpi(label, value, icon, color) {
    return `<div class="kpi-card" style="--kpi-color:${color}">
      <div class="kpi-icon" style="background:${color}22;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
  }

  function escHtml(s) {
    return (s||'')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { render, showSubcat:()=>{}, sort:()=>{}, setScopeMode:()=>{}, closeSummary:()=>{} };
})();
