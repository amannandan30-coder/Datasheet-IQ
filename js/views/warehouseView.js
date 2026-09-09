window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   WAREHOUSE VIEW
   ============================================================ */
App.Views.WarehouseView = (() => {

  async function render(container, params, dataset_id) {
    const whName = params && params.name ? decodeURIComponent(params.name) : null;

    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view warehouse breakdown.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading warehouses…</span></div>`;

    if (whName) {
      await renderWarehouseDetail(container, whName, dataset_id);
      return;
    }

    const warehouses = await App.DB.getAllByIndex('warehouses','dataset_id',dataset_id);
    const records    = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Records Found</div>
          <div class="text-sm text-muted mb-16">No warehouse records found in the active dataset.</div>
          <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">Back to Dashboard</button>
        </div>`;
      return;
    }

    container.innerHTML = '';

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Warehouses</div>
          <div class="page-sub">${warehouses.length} warehouse${warehouses.length!==1?'s':''} in this dataset</div>
        </div>
      </div>
    `);

    const whMap = new Map();
    for (const r of records) {
      const wh = r.normalized_warehouse || 'Unknown';
      if (!whMap.has(wh)) whMap.set(wh, { name:wh, qty:0, value:0, weight:0, skus:new Set(), damaged:0, nearExpiry:0, expired:0 });
      const w = whMap.get(wh);
      w.qty    += (r.qty||0);
      w.value  += (r.source_value||0);
      w.weight += (r.total_weight||0);
      w.skus.add(r.product_family_id);
      const t = (r.raw_bad_inventory_type||'').toLowerCase();
      if (t === 'damaged') w.damaged += (r.source_value||0);
      if (t === 'expired') w.expired += (r.source_value||0);
      if (t.includes('near')) w.nearExpiry += (r.source_value||0);
    }

    const whs = [...whMap.values()].sort((a,b) => b.value-a.value);

    // Chart
    container.insertAdjacentHTML('beforeend', `
      <div class="chart-wrap mb-24">
        <div class="section-title mb-12">Warehouse Value Comparison</div>
        <div class="chart-canvas-wrap"><canvas id="wh-chart"></canvas></div>
      </div>
      <div class="grid-3" id="wh-grid"></div>
    `);

    const grid = container.querySelector('#wh-grid');
    const COLORS = ['#6366f1','#10b981','#f59e0b','#38bdf8','#a78bfa','#fb923c'];

    whs.forEach((wh, i) => {
      const color = COLORS[i % COLORS.length];
      const el = document.createElement('div');
      el.className = 'warehouse-card animate-fade-in-up';
      el.style.animationDelay = `${i*0.06}s`;
      el.innerHTML = `
        <div class="warehouse-card-header">
          <div class="warehouse-icon" style="background:${color}22;color:${color}">🏭</div>
          <div>
            <div class="warehouse-name">${wh.name}</div>
            <div class="warehouse-sub">${wh.skus.size} SKUs · ${App.Fmt.number(wh.qty)} units</div>
          </div>
        </div>
        <div class="warehouse-stats">
          <div class="warehouse-stat">
            <div class="warehouse-stat-val">${wh.skus.size}</div>
            <div class="warehouse-stat-lbl">SKUs</div>
          </div>
          <div class="warehouse-stat">
            <div class="warehouse-stat-val">${App.Fmt.number(wh.qty)}</div>
            <div class="warehouse-stat-lbl">Units</div>
          </div>
          <div class="warehouse-stat">
            <div class="warehouse-stat-val">${App.Fmt.currency(wh.value)}</div>
            <div class="warehouse-stat-lbl">Value</div>
          </div>
          <div class="warehouse-stat">
            <div class="warehouse-stat-val">${App.Fmt.weight(wh.weight)}</div>
            <div class="warehouse-stat-lbl">Weight</div>
          </div>
        </div>
        ${(wh.damaged || wh.nearExpiry || wh.expired) ? `<div class="flex gap-8 mt-12 flex-wrap" style="border-top:1px solid var(--border);padding-top:10px">
          ${wh.damaged ? `<span class="text-xs text-muted">Damaged: <strong class="text-danger">${App.Fmt.currency(wh.damaged)}</strong></span>` : ''}
          ${wh.nearExpiry ? `<span class="text-xs text-muted">Near Expiry: <strong style="color:#f59e0b">${App.Fmt.currency(wh.nearExpiry)}</strong></span>` : ''}
          ${wh.expired ? `<span class="text-xs text-muted">Expired: <strong style="color:#a855f7">${App.Fmt.currency(wh.expired)}</strong></span>` : ''}
        </div>` : ''}
      `;
      el.onclick = () => App.Router.go('warehouse', { name: encodeURIComponent(wh.name) });
      grid.appendChild(el);
    });

    // Chart
    requestAnimationFrame(() => {
      const canvas = document.getElementById('wh-chart');
      if (!canvas || !whs.length) return;
      if (window._whChart) window._whChart.destroy();
      window._whChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: whs.map(w => w.name),
          datasets: [
            { label:'Total Value', data: whs.map(w => w.value), backgroundColor: '#6366f1cc', borderRadius:4 },
            { label:'Damaged',     data: whs.map(w => w.damaged), backgroundColor: '#ef4444cc', borderRadius:4 },
            { label:'Near Expiry', data: whs.map(w => w.nearExpiry), backgroundColor: '#f59e0bcc', borderRadius:4 },
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ labels:{ color:'#94a3b8' } } },
          scales:{
            x:{ ticks:{color:'#64748b'}, grid:{color:'#1a1d28'} },
            y:{ ticks:{color:'#64748b', callback:v=>App.Fmt.currency(v)}, grid:{color:'#1a1d28'} }
          }
        }
      });
    });
  }

  async function renderWarehouseDetail(container, whName, dataset_id) {
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    const whRecs  = records.filter(r => r.normalized_warehouse === whName);

    if (!whRecs.length) {
      container.innerHTML = `<div class="empty-state"><div>No records for "${whName}"</div></div>`;
      return;
    }

    const totalQty   = whRecs.reduce((s,r) => s+(r.qty||0), 0);
    const totalValue = whRecs.reduce((s,r) => s+(r.source_value||0), 0);
    const totalWeight= whRecs.reduce((s,r) => s+(r.total_weight||0), 0);
    const skuCount   = new Set(whRecs.map(r => r.product_family_id)).size;

    // Group by category
    const catMap = new Map();
    for (const r of whRecs) {
      const c = r.normalized_category || 'Uncategorized';
      if (!catMap.has(c)) catMap.set(c, { name:c, qty:0, value:0, brands: new Set() });
      catMap.get(c).qty   += (r.qty||0);
      catMap.get(c).value += (r.source_value||0);
      catMap.get(c).brands.add(r.normalized_brand);
    }

    container.innerHTML = '';
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div class="flex items-center gap-12">
          <div style="font-size:32px">🏭</div>
          <div>
            <div class="page-title">${whName}</div>
            <div class="page-sub">${skuCount} SKUs · ${catMap.size} categories</div>
          </div>
        </div>
      </div>
      <div class="grid-4 mb-24">
        ${kpi('Units',   App.Fmt.number(totalQty),    '📊','#10b981')}
        ${kpi('Value',   App.Fmt.currency(totalValue),'💰','#f59e0b')}
        ${kpi('Weight',  App.Fmt.weight(totalWeight), '⚖️','#38bdf8')}
        ${kpi('SKUs',    App.Fmt.number(skuCount),    '📦','#6366f1')}
      </div>
      <div class="section-title mb-16">Categories in this Warehouse</div>
      <div class="card">
        ${[...catMap.values()].sort((a,b)=>b.value-a.value).map((c,i) => `
          <div class="brand-row" onclick="App.Router.go('category',{name:encodeURIComponent('${c.name}')})">
            <div class="brand-rank">${i+1}</div>
            <div class="brand-name-block">
              <div class="brand-name">${c.name}</div>
              <div class="brand-aliases">${c.brands.size} brands</div>
            </div>
            <div class="brand-stats">
              <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.number(c.qty)}</div><div class="brand-stat-lbl">Units</div></div>
              <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.currency(c.value)}</div><div class="brand-stat-lbl">Value</div></div>
            </div>
          </div>`).join('')}
      </div>
    `);
  }

  function kpi(label, value, icon, color) {
    return `<div class="kpi-card" style="--kpi-color:${color}">
      <div class="kpi-icon" style="background:${color}22;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
  }

  return { render };
})();
