window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   CATEGORY DETAIL VIEW
   Shows subcategories + brand table for one category
   ============================================================ */
App.Views.CategoryDetail = (() => {

  async function render(container, params, dataset_id) {
    const catName = decodeURIComponent(params.name || '');
    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading ${catName}…</span></div>`;

    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    const catRecords = records.filter(r => r.normalized_category === catName);

    if (!catRecords.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div>No records found for "${catName}"</div></div>`;
      return;
    }

    const catCfg    = App.Categorizer.getCategoryConfig(catName);
    const totalUnits = catRecords.reduce((s,r) => s+(r.qty||0), 0);
    const totalValue = catRecords.reduce((s,r) => s+(r.source_value||0), 0);
    const totalWeight= catRecords.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalSKUs  = new Set(catRecords.map(r => r.product_family_id)).size;
    const brandSet   = new Set(catRecords.map(r => r.normalized_brand));

    // Ensure accurate real-time subcategory classification
    for (const r of catRecords) {
      if (!r.subcategory || r.subcategory.includes(' & ') || r.subcategory === 'Atta & Flours' || r.subcategory === 'Oils & Ghee' || r.subcategory === 'Sugar & Salt' || r.subcategory === 'Tea & Coffee' || r.subcategory === 'Snacks & Biscuits' || r.subcategory === 'Noodles & Pasta' || r.subcategory === 'Chocolates & Sweets' || r.subcategory === 'Sauces & Condiments' || r.subcategory === 'Detergents & Laundry') {
        const res = App.Categorizer.classify(r.source_category || catName, r.normalized_product_name, r.normalized_brand);
        r.subcategory = res.subcategory;
      }
    }

    // Group by subcategory
    const subcatMap = new Map();
    for (const r of catRecords) {
      const sc = r.subcategory || 'General';
      if (!subcatMap.has(sc)) subcatMap.set(sc, { name:sc, qty:0, value:0, weight:0, skus:new Set(), brands:new Set() });
      const s = subcatMap.get(sc);
      s.qty    += (r.qty||0);
      s.value  += (r.source_value||0);
      s.weight += (r.total_weight||0);
      s.skus.add(r.product_family_id);
      s.brands.add(r.normalized_brand);
    }

    container.innerHTML = '';

    /* ── Header ──────────────────────────────────────────── */
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div class="flex items-center gap-12">
          <div style="font-size:32px">${catCfg.icon||'📦'}</div>
          <div>
            <div class="page-title">${catName}</div>
            <div class="page-sub">${brandSet.size} brands · ${totalSKUs} SKUs</div>
          </div>
        </div>
        <div class="flex gap-8">
          <select class="select" id="cat-sort" onchange="App.Views.CategoryDetail.sort(this.value)">
            <option value="value">Sort by Value</option>
            <option value="units">Sort by Units</option>
            <option value="weight">Sort by Weight</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      <div class="grid-4 mb-24">
        ${kpi('SKUs',    App.Fmt.number(totalSKUs),    '📦', '#6366f1')}
        ${kpi('Units',   App.Fmt.number(totalUnits),   '📊', '#10b981')}
        ${kpi('Value',   App.Fmt.currency(totalValue), '💰', '#f59e0b')}
        ${kpi('Weight',  App.Fmt.weight(totalWeight),  '⚖️', '#38bdf8')}
      </div>
    `);

    /* ── Subcategory tabs ────────────────────────────────── */
    const subcats = [...subcatMap.values()].sort((a,b) => b.value - a.value);
    if (subcats.length > 1) {
      const tabsHtml = subcats.map((sc,i) => {
        const safeId = `tab-${sc.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        return `
          <button class="subcat-tab ${i===0?'active':''}"
                  onclick="App.Views.CategoryDetail.showSubcat(this.dataset.subcat)"
                  data-subcat="${escHtml(sc.name)}"
                  id="${safeId}">
            ${escHtml(sc.name)}
            <span class="subcat-tab-badge">${App.Fmt.number(sc.qty)}</span>
          </button>`;
      }).join('');
      container.insertAdjacentHTML('beforeend', `
        <div class="subcat-tabs-wrap mb-20" id="subcat-tabs">${tabsHtml}</div>
      `);

      /* ── Subcategory Summary Panel ─────────────────────── */
      container.insertAdjacentHTML('beforeend', `
        <div class="subcat-summary-panel" id="subcat-summary">
          <div class="subcat-summary-inner">
            <div class="subcat-summary-header">
              <div class="subcat-summary-title" id="subcat-summary-title"></div>
              <button class="subcat-summary-close" onclick="App.Views.CategoryDetail.closeSummary()" title="Close summary">✕</button>
            </div>
            <div class="subcat-summary-grid" id="subcat-summary-grid"></div>
          </div>
        </div>
      `);

      // Show summary for the first (default active) subcategory
      const firstSc = subcats[0];
      _showSubcatSummary(firstSc, totalValue, totalUnits, totalWeight, totalSKUs);
    }

    /* ── Brand table ─────────────────────────────────────── */
    container.insertAdjacentHTML('beforeend', `
      <div class="section-header">
        <div class="section-title">Brands</div>
        <div class="flex gap-8">
          <input class="input" style="width:200px" placeholder="Search brands…" oninput="filterBrands(this.value)" id="brand-search">
        </div>
      </div>
      <div class="card" id="brand-list-wrap"></div>
    `);

    window._catBrandMap  = new Map();
    window._catRecords   = catRecords;
    window._catTotalVal  = totalValue;
    window._catName      = catName;

    // Store totals for subcategory summary calculations
    window._catTotalUnits  = totalUnits;
    window._catTotalWeight = totalWeight;
    window._catTotalSKUs   = totalSKUs;
    window._subcatMap      = subcatMap;

    buildBrandList(catRecords, container.querySelector('#brand-list-wrap'), totalValue);

    // Subcategory selector
    window.filterBrands = (q) => {
      const items = document.querySelectorAll('.brand-row[data-brand]');
      items.forEach(el => {
        const match = el.dataset.brand.toLowerCase().includes(q.toLowerCase());
        el.style.display = match ? '' : 'none';
      });
    };

    App.Views.CategoryDetail.showSubcat = (sc) => {
      const filtered = catRecords.filter(r => (r.subcategory||'General') === sc);
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), totalValue);
      // Deactivate all tabs, then activate the matching one by data-subcat attribute
      document.querySelectorAll('#subcat-tabs .subcat-tab, #subcat-tabs .btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-ghost');
      });
      const tab = document.querySelector(`#subcat-tabs [data-subcat="${escHtml(sc)}"]`);
      if (tab) {
        tab.classList.add('active');
        tab.classList.remove('btn-ghost');
      }

      // Show subcategory summary
      const scData = window._subcatMap?.get(sc);
      if (scData) {
        _showSubcatSummary(scData, totalValue, totalUnits, totalWeight, totalSKUs);
      }
    };

    App.Views.CategoryDetail.closeSummary = () => {
      const panel = document.getElementById('subcat-summary');
      if (panel) {
        panel.classList.remove('visible');
      }
    };

    App.Views.CategoryDetail.sort = (by) => {
      const filtered = catRecords; // could respect subcat filter too
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), totalValue, by);
    };
  }

  function _showSubcatSummary(scData, totalValue, totalUnits, totalWeight, totalSKUs) {
    const panel = document.getElementById('subcat-summary');
    const titleEl = document.getElementById('subcat-summary-title');
    const gridEl = document.getElementById('subcat-summary-grid');
    if (!panel || !titleEl || !gridEl) return;

    const skuCount = scData.skus instanceof Set ? scData.skus.size : (scData.skus || 0);
    const brandCount = scData.brands instanceof Set ? scData.brands.size : (scData.brands || 0);
    const valuePct = totalValue ? ((scData.value / totalValue) * 100).toFixed(1) : '0';
    const unitsPct = totalUnits ? ((scData.qty / totalUnits) * 100).toFixed(1) : '0';

    titleEl.innerHTML = `<span class="subcat-summary-icon">📋</span> ${scData.name}`;

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
          <div class="subcat-stat-label">Value <span class="subcat-stat-pct">(${valuePct}%)</span></div>
        </div>
      </div>
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

  function buildBrandList(records, wrap, totalValue, sortBy = 'value') {
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
        <div class="brand-avatar">${b.name[0]?.toUpperCase()||'?'}</div>
        <div class="brand-name-block">
          <div class="brand-name">${b.name}</div>
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
            <div class="brand-stat-lbl">of Category</div>
          </div>
        </div>
        <div class="brand-pct-bar"><div class="brand-pct-fill" style="width:${Math.min(100,parseFloat(pct)*3)}%"></div></div>
      `;
      el.onclick = () => App.Router.go('brand', {
        id: encodeURIComponent(b.name),
        cat: encodeURIComponent(window._catName||'')
      });
      wrap.appendChild(el);
    });

    if (!brands.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>No brands found</div></div>';
    }
  }

  function kpi(label, value, icon, color) {
    return `<div class="kpi-card" style="--kpi-color:${color}">
      <div class="kpi-icon" style="background:${color}22;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
  }

  // escHtml: produces HTML-attribute-safe strings using proper entity encoding.
  // IMPORTANT: Only use this for display/HTML insertion. NEVER use the output
  // as a data key or query value — use the original string for all app logic.
  function escHtml(s) {
    return (s||'')
      .replace(/&/g, '&amp;')   // must be first — prevents double-encoding
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { render, showSubcat:()=>{}, sort:()=>{}, closeSummary:()=>{} };
})();
