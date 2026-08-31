window.App = window.App || {};

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

  function getCatColor(cat, idx) {
    const cfg = App.Categorizer.getCategoryConfig(cat);
    return cfg.color || CAT_COLORS[idx % CAT_COLORS.length];
  }

  async function render(container, dataset_id) {
    container.innerHTML = `<div class="animate-fade-in"><div class="flex items-center gap-12 mb-24" style="padding:4px 0">
      <div class="spinner"></div><span class="text-muted">Loading dashboard…</span></div></div>`;

    if (!dataset_id) { renderWelcome(container); return; }

    const dataset = await App.DB.getDataset(dataset_id);
    if (!dataset)   { renderWelcome(container); return; }

    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    if (!records.length) { renderWelcome(container); return; }

    // Compute category aggregates fresh from records
    const catMap = new Map();
    for (const r of records) {
      const cat = r.normalized_category || 'Uncategorized';
      if (!catMap.has(cat)) catMap.set(cat, {
        name: cat, qty:0, value:0, weight:0, skus: new Set(),
        brands: new Set(), subcats: new Set(), color: null
      });
      const c = catMap.get(cat);
      c.qty    += (r.qty||0);
      c.value  += (r.source_value||0);
      c.weight += (r.total_weight||0);
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
          ${dqIssues.length ? `<button class="btn btn-secondary" onclick="App.Router.go('quality')"><span>⚠️</span> ${dqIssues.length} Issues</button>` : ''}
          ${pendingSugg.length ? `<button class="btn btn-secondary" onclick="App.Router.go('suggestions')"><span>🔀</span> ${pendingSugg.length} Merge Suggestions</button>` : ''}
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
        ${kpiCard('TOTAL SKUS',    App.Fmt.number(kpis.total_skus),  'Unique product families', '📦', '#6366f1')}
        ${kpiCard('TOTAL UNITS',   App.Fmt.number(kpis.total_units), 'Across all warehouses',   '📊', '#10b981')}
        ${kpiCard('TOTAL VALUE',   App.Fmt.currency(kpis.total_value), 'MRP-based inventory value','💰','#f59e0b')}
        ${kpiCard('TOTAL WEIGHT',  App.Fmt.weight(kpis.total_weight), 'Gross weight',            '⚖️', '#38bdf8')}
        ${kpiCard('DAMAGED',       App.Fmt.currency(kpis.damaged_value), 'Damaged inventory value','❌','#ef4444')}
        ${kpiCard('NEAR EXPIRY',   App.Fmt.currency(kpis.near_expiry_value),'Near expiry value','⏰','#f59e0b')}
      </div>`;
    container.insertAdjacentHTML('beforeend', kpiHtml);

    /* ── Source Data & Unresolved Inventory Banner ─────────────────── */
    if (dataset.sourceRowCount) {
      container.insertAdjacentHTML('beforeend', `
        <div class="card mb-24" style="background:var(--bg-surface);border:1px solid var(--border)">
          <div class="flex items-center justify-between mb-12">
            <div class="font-bold text-sm flex items-center gap-8">
              <span>📋</span> Source File Reconciliation
            </div>
            <button class="btn btn-xs btn-secondary" onclick="App.Router.go('quality')">Inspect Unresolved Records</button>
          </div>
          <div class="grid-4" style="gap:12px;font-size:13px">
            <div style="background:var(--bg-surface-2);padding:10px 14px;border-radius:8px">
              <div class="text-xs text-muted">Total Source Rows</div>
              <div class="font-bold text-base mt-4">${App.Fmt.number(dataset.sourceRowCount)}</div>
            </div>
            <div style="background:var(--bg-surface-2);padding:10px 14px;border-radius:8px">
              <div class="text-xs text-muted">Summary/Total Rows (Excluded)</div>
              <div class="font-bold text-base mt-4 text-warning">${App.Fmt.number(dataset.excludedSummaryRows || 0)}</div>
            </div>
            <div style="background:var(--bg-surface-2);padding:10px 14px;border-radius:8px">
              <div class="text-xs text-muted">Unresolved (No Name) Rows</div>
              <div class="font-bold text-base mt-4 text-danger">${App.Fmt.number(dataset.excludedNoNameRows || 0)}</div>
            </div>
            <div style="background:var(--bg-surface-2);padding:10px 14px;border-radius:8px">
              <div class="text-xs text-muted">Processed Inventory Records</div>
              <div class="font-bold text-base mt-4 text-success">${App.Fmt.number(records.length)}</div>
            </div>
          </div>
        </div>
      `);
    }

    /* ── Status Distribution ─────────────────────────────── */
    if (Object.keys(statusDist).length > 0) {
      const statusHtml = Object.entries(statusDist).map(([k,v]) => {
        const pct = totalStatus ? (v.count/totalStatus*100).toFixed(1) : 0;
        const color = k==='damaged' ? '#ef4444' : k.includes('expir') ? '#f59e0b' : '#10b981';
        return `<div class="flex items-center gap-8" style="margin-bottom:6px">
          <span class="status-dot" style="background:${color}"></span>
          <span class="text-sm" style="flex:1;text-transform:capitalize">${k.replace(/_/g,' ')}</span>
          <span class="text-sm font-semibold">${App.Fmt.number(v.qty)} units</span>
          <span class="badge badge-muted">${pct}%</span>
        </div>`;
      }).join('');

      container.insertAdjacentHTML('beforeend', `
        <div class="grid-2 mb-24">
          <div class="card">
            <div class="section-title mb-16">Inventory Status</div>
            ${statusHtml}
          </div>
          <div class="card" id="status-chart-wrap">
            <div class="section-title mb-12">Value by Status</div>
            <div class="chart-canvas-wrap" style="height:160px">
              <canvas id="status-chart"></canvas>
            </div>
          </div>
        </div>
      `);
      renderStatusChart(statusDist);
    }

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
            <div class="category-stat-val">${App.Fmt.weight(cat.weight)}</div>
            <div class="category-stat-lbl">Weight</div>
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
      <div class="section-header">
        <div class="section-title">Top Brands by Value</div>
        <button class="btn btn-sm btn-ghost" onclick="App.Router.go('brands')">View All →</button>
      </div>
      <div class="card mb-24" id="top-brands-list"></div>
    `);

    const tbList = container.querySelector('#top-brands-list');
    topBrands.forEach((b, i) => {
      const pct = totalValue ? (b.value/totalValue*100).toFixed(1) : 0;
      tbList.insertAdjacentHTML('beforeend', `
        <div class="brand-row" onclick="App.Router.go('brand',{id:'${encodeURIComponent(b.name)}'})">
          <div class="brand-rank">${i+1}</div>
          <div class="brand-avatar">${b.name[0].toUpperCase()}</div>
          <div class="brand-name-block">
            <div class="brand-name">${b.name}</div>
          </div>
          <div class="brand-stats">
            <div class="brand-stat-item">
              <div class="brand-stat-val">${App.Fmt.number(b.qty)}</div>
              <div class="brand-stat-lbl">Units</div>
            </div>
            <div class="brand-stat-item">
              <div class="brand-stat-val">${App.Fmt.currency(b.value)}</div>
              <div class="brand-stat-lbl">Value</div>
            </div>
          </div>
          <div class="brand-pct-bar">
            <div class="brand-pct-fill" style="width:${Math.min(100,pct*5)}%"></div>
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

  function renderStatusChart(statusDist) {
    requestAnimationFrame(() => {
      const canvas = document.getElementById('status-chart');
      if (!canvas) return;
      const labels = Object.keys(statusDist).map(k => k.replace(/_/g,' '));
      const values = Object.values(statusDist).map(v => v.value);
      const colors = ['#ef4444','#f59e0b','#10b981','#6366f1','#38bdf8'];

      if (window._statusChart) window._statusChart.destroy();
      window._statusChart = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0,labels.length), borderWidth:2, borderColor:'#13151e' }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'#94a3b8', font:{size:11} } } } }
      });
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
                    y:{ticks:{color:'#64748b',font:{size:10},callback:(v)=>App.Fmt.currency(v)},grid:{color:'#1a1d28'}}} }
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
        <div class="welcome-title">Liquidation Inventory Intelligence</div>
        <div class="welcome-sub">Upload your Excel inventory file to get started. The app will automatically parse, normalize, and organize your inventory data into a clean, drillable dashboard.</div>
        <button class="btn btn-primary btn-lg" onclick="App.UI.showUploadModal()">
          <span>📂</span> Upload Inventory File
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
            <div class="welcome-feature-desc">Category → Brand → Product → Variant</div>
          </div>
          <div class="welcome-feature">
            <div class="welcome-feature-icon">🔍</div>
            <div class="welcome-feature-name">NL Search</div>
            <div class="welcome-feature-desc">"Which atta brand has most units?"</div>
          </div>
        </div>
      </div>`;
  }

  window.sortCategories = function(by) { /* re-render categories sorted differently */ };

  return { render };
})();
