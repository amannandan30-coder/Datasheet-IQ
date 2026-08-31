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
      const tabsHtml = subcats.map((sc,i) => `
        <button class="btn ${i===0?'btn-primary':'btn-ghost'} btn-sm" 
                onclick="App.Views.CategoryDetail.showSubcat('${escHtml(sc.name)}')" 
                id="tab-${escHtml(sc.name).replace(/\s/g,'_')}">
          ${sc.name}
          <span class="badge badge-muted">${App.Fmt.number(sc.qty)}</span>
        </button>`).join('');
      container.insertAdjacentHTML('beforeend', `
        <div class="flex gap-6 mb-20" style="flex-wrap:wrap" id="subcat-tabs">${tabsHtml}</div>
      `);
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
      document.querySelectorAll('#subcat-tabs .btn').forEach(b => b.className = 'btn btn-ghost btn-sm');
      const tab = document.getElementById(`tab-${sc.replace(/\s/g,'_')}`);
      if (tab) tab.className = 'btn btn-primary btn-sm';
    };

    App.Views.CategoryDetail.sort = (by) => {
      const filtered = catRecords; // could respect subcat filter too
      buildBrandList(filtered, container.querySelector('#brand-list-wrap'), totalValue, by);
    };
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

  function escHtml(s) { return (s||'').replace(/['"<>&]/g,'_'); }

  return { render, showSubcat:()=>{}, sort:()=>{} };
})();
