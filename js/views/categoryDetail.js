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

  async function render(container, params, dataset_id) {
    const catName = decodeURIComponent(params.name || '');
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
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
          <div class="empty-state-icon">📭</div>
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
      if (!subcatMap.has(sc)) subcatMap.set(sc, { name:sc, qty:0, value:0, weight:0, skus:new Set(), brands:new Set(), records:[] });
      const s = subcatMap.get(sc);
      s.qty    += (r.qty||0);
      s.value  += (r.source_value||0);
      s.weight += (r.total_weight||0);
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
          <div class="text-sm text-muted">Complete breakdown of inventory, brand share, and scope-aware reconciliation.</div>
        </div>
        <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">
          <span>←</span> Back to Dashboard
        </button>
      </div>

      <!-- Category KPIs (Canonical Totals) -->
      <div class="kpi-grid mb-24">
        ${kpi('Total Value (Canonical)', App.Fmt.currency(totalValue), '💰', '#10b981')}
        ${kpi('Total Units',            App.Fmt.number(totalUnits),   '📊', '#6366f1')}
        ${kpi('Total Weight',           App.Fmt.weight(totalWeight),  '⚖️', '#38bdf8')}
        ${kpi('Total SKUs',             App.Fmt.number(totalSKUs),    '📦', '#f59e0b')}
        ${kpi('Active Brands',          App.Fmt.number(brandSet.size),'🏷️', '#a78bfa')}
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
          <button class="subcat-summary-close" onclick="App.Views.CategoryDetail.closeSummary()">✕</button>
        </div>
        <div class="subcat-summary-grid" id="subcat-summary-grid"></div>
      </div>

      <!-- Scope Row Filter Bar -->
      <div id="scope-filter-bar" class="flex items-center justify-between mb-16" style="display:none;"></div>

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

    // Helper to render scope reconciliation
    function renderScopeReconciliation(scName) {
      const reconWrap = container.querySelector('#scope-recon-container');
      if (!reconWrap) return;

      if (!App.ReportingMapper || typeof App.ReportingMapper.getCategoryReconciliation !== 'function') {
        reconWrap.innerHTML = '';
        return;
      }

      const recon = App.ReportingMapper.getCategoryReconciliation(catName, scName, allDatasetRecords);
      _currentRecon = recon;

      if (!recon || !recon.hasBusinessScope) {
        reconWrap.innerHTML = '';
        return;
      }

      const deltaVal = recon.canonical.value - recon.business.value;
      const deltaRows = recon.canonical.records - recon.business.records;
      const isExactMatch = deltaVal === 0 && deltaRows === 0;

      reconWrap.innerHTML = `
        <div class="card p-20" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px;">
          <div class="flex items-center justify-between mb-16 flex-wrap gap-8">
            <div class="flex items-center gap-10">
              <span style="font-size: 20px;">🎯</span>
              <div>
                <div class="font-bold text-base flex items-center gap-8">
                  <span>Scope-Aware Business Reconciliation</span>
                  <span class="badge badge-primary">${escHtml(recon.bucketName)}</span>
                  <span class="badge badge-neutral">${escHtml(recon.scopeLabel)}</span>
                </div>
                <div class="text-xs text-muted">${escHtml(recon.scopeDescription)} — ${escHtml(recon.profileName)}</div>
              </div>
            </div>
            <div class="flex items-center gap-8">
              <span class="text-xs font-semibold px-8 py-4 rounded" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
                Target: ${App.Fmt.currency(recon.targetValue)}
              </span>
            </div>
          </div>

          <!-- Comparative Scope Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;" class="mb-16">
            <!-- Canonical Scope Card -->
            <div class="p-12 rounded" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-xs text-muted mb-4 font-semibold uppercase">Canonical All-Inventory</div>
              <div class="text-xl font-bold" style="color: #6366f1;">${App.Fmt.currency(recon.canonical.value)}</div>
              <div class="text-xs text-muted mt-2">${App.Fmt.number(recon.canonical.records)} source rows | ${App.Fmt.number(recon.canonical.units)} units</div>
            </div>

            <!-- Business Reference Scope Card -->
            <div class="p-12 rounded" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);">
              <div class="text-xs text-muted mb-4 font-semibold uppercase" style="color: #10b981;">Business Reference Scope</div>
              <div class="text-xl font-bold" style="color: #10b981;">${App.Fmt.currency(recon.business.value)}</div>
              <div class="text-xs text-muted mt-2">${App.Fmt.number(recon.business.records)} scoped rows | ${App.Fmt.number(recon.business.units)} units</div>
            </div>

            <!-- Scope Delta Card -->
            <div class="p-12 rounded" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25);">
              <div class="text-xs text-muted mb-4 font-semibold uppercase" style="color: #f59e0b;">Scope Reconciliation Delta</div>
              <div class="text-xl font-bold" style="color: ${deltaVal === 0 ? '#10b981' : '#f59e0b'};">
                ${deltaVal > 0 ? '+' : ''}${App.Fmt.currency(deltaVal)}
              </div>
              <div class="text-xs text-muted mt-2">${deltaRows > 0 ? '+' : ''}${deltaRows} rows difference</div>
            </div>

            <!-- Overlap / Intersection Card -->
            <div class="p-12 rounded" style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25);">
              <div class="text-xs text-muted mb-4 font-semibold uppercase" style="color: #38bdf8;">Exact Row Overlap</div>
              <div class="text-xl font-bold" style="color: #38bdf8;">${App.Fmt.currency(recon.reconciliation.intersectionValue)}</div>
              <div class="text-xs text-muted mt-2">${recon.reconciliation.intersectionCount} rows in both scopes</div>
            </div>
          </div>

          <!-- Scope Row Set Filter Tabs -->
          <div class="flex items-center justify-between flex-wrap gap-8 pt-12" style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <div class="flex items-center gap-6 flex-wrap">
              <span class="text-xs font-semibold text-muted mr-4">View Scope:</span>
              <button class="btn btn-xs ${_activeScopeMode === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('all')">
                📊 All Canonical (${recon.canonical.records})
              </button>
              <button class="btn btn-xs ${_activeScopeMode === 'business' ? 'btn-success' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('business')">
                🎯 Business Scope (${recon.business.records})
              </button>
              ${recon.reconciliation.canonicalOnlyCount > 0 ? `
                <button class="btn btn-xs ${_activeScopeMode === 'delta_canonical' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_canonical')">
                  🔵 Canonical-Only (${recon.reconciliation.canonicalOnlyCount})
                </button>
              ` : ''}
              ${recon.reconciliation.businessOnlyCount > 0 ? `
                <button class="btn btn-xs ${_activeScopeMode === 'delta_biz' ? 'btn-warning' : 'btn-secondary'}" onclick="App.Views.CategoryDetail.setScopeMode('delta_biz')">
                  🟠 Business-Only (${recon.reconciliation.businessOnlyCount})
                </button>
              ` : ''}
            </div>
            <div class="text-xs text-muted">
              ${_activeScopeMode === 'business' ? `Displaying exact ${recon.business.records} ${recon.scopeLabel} rows (${App.Fmt.currency(recon.business.value)})` : 
                _activeScopeMode === 'delta_canonical' ? `Displaying ${recon.reconciliation.canonicalOnlyCount} rows present in Canonical but outside ${recon.scopeLabel}` :
                _activeScopeMode === 'delta_biz' ? `Displaying ${recon.reconciliation.businessOnlyCount} rows mapped to ${recon.bucketName} in Business Profile` :
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

    titleEl.innerHTML = `<span class="subcat-summary-icon">📋</span> ${escHtml(scData.name)}`;

    let businessScopeCardHtml = '';
    if (recon && recon.hasBusinessScope) {
      businessScopeCardHtml = `
        <div class="subcat-stat-card" style="--stat-color: #ec4899">
          <div class="subcat-stat-icon">🎯</div>
          <div class="subcat-stat-info">
            <div class="subcat-stat-value">${App.Fmt.currency(recon.business.value)}</div>
            <div class="subcat-stat-label">Business Scope (${recon.scopeLabel})</div>
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = `
      <div class="subcat-stat-card" style="--stat-color: #6366f1">
        <div class="subcat-stat-icon">📦</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(skuCount)}</div>
          <div class="subcat-stat-label">SKUs</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #10b981">
        <div class="subcat-stat-icon">📊</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(scData.qty)}</div>
          <div class="subcat-stat-label">Units <span class="subcat-stat-pct">(${unitsPct}%)</span></div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #f59e0b">
        <div class="subcat-stat-icon">💰</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.currency(scData.value)}</div>
          <div class="subcat-stat-label">Canonical Value <span class="subcat-stat-pct">(${valuePct}%)</span></div>
        </div>
      </div>
      ${businessScopeCardHtml}
      <div class="subcat-stat-card" style="--stat-color: #38bdf8">
        <div class="subcat-stat-icon">⚖️</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.weight(scData.weight)}</div>
          <div class="subcat-stat-label">Weight</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #a78bfa">
        <div class="subcat-stat-icon">🏷️</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${App.Fmt.number(brandCount)}</div>
          <div class="subcat-stat-label">Brands</div>
        </div>
      </div>
      <div class="subcat-stat-card" style="--stat-color: #fb923c">
        <div class="subcat-stat-icon">💵</div>
        <div class="subcat-stat-info">
          <div class="subcat-stat-value">${scData.qty ? App.Fmt.currency(scData.value / scData.qty) : '—'}</div>
          <div class="subcat-stat-label">Avg Value / Unit</div>
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
        name:b, brand_id:r.brand_id, qty:0, value:0, weight:0, skus:new Set()
      });
      const bm = brandMap.get(b);
      bm.qty    += (r.qty||0);
      bm.value  += (r.source_value||0);
      bm.weight += (r.total_weight||0);
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
            <div class="brand-stat-val">${App.Fmt.weight(b.weight)}</div>
            <div class="brand-stat-lbl">Weight</div>
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
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>No brands found in this scope</div></div>';
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
