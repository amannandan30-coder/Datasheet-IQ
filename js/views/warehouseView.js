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
          <div class="page-sub">${warehouses.length} facility location${warehouses.length!==1?'s':''} monitored in this dataset</div>
        </div>
      </div>
    `);

    const whMap = new Map();
    for (const r of records) {
      const wh = r.normalized_warehouse || 'Unknown Warehouse';
      if (!whMap.has(wh)) whMap.set(wh, { name:wh, qty:0, value:0, weight:0, mass:0, volume:0, skus:new Set(), damaged:0, nearExpiry:0, expired:0 });
      const w = whMap.get(wh);
      w.qty    += (r.qty||0);
      w.value  += (r.source_value||0);
      w.weight += (r.total_weight||0);
      w.mass   += (r.total_weight||0);
      w.volume += (r.total_volume_l||0);
      w.skus.add(r.product_family_id);
      const t = (r.raw_bad_inventory_type||'').toLowerCase();
      if (t === 'damaged') w.damaged += (r.source_value||0);
      if (t === 'expired') w.expired += (r.source_value||0);
      if (t.includes('near')) w.nearExpiry += (r.source_value||0);
    }

    const whs = [...whMap.values()].sort((a,b) => b.value-a.value);

    // Chart & Grid wrapper
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
      el.style.setProperty('--card-accent', color);
      el.style.animationDelay = `${i*0.06}s`;

      const hasRisk = Boolean(wh.damaged || wh.nearExpiry || wh.expired);

      el.innerHTML = `
        <div class="warehouse-card-header">
          <div class="warehouse-card-left">
            <div class="warehouse-icon" style="background:${color}18;border:1px solid ${color}35;color:${color}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
                <path d="M6 18h12"/>
                <path d="M6 14h12"/>
                <rect x="10" y="10" width="4" height="4"/>
              </svg>
            </div>
            <div class="warehouse-header-text">
              <div class="warehouse-name" title="${wh.name}">${wh.name}</div>
              <div class="warehouse-sub">
                <span>${wh.skus.size} SKUs</span>
                <span>&bull;</span>
                <span>${App.Fmt.number(wh.qty)} units</span>
              </div>
            </div>
          </div>
          <div class="warehouse-card-right">
            <span class="warehouse-rank-pill">#${i+1}</span>
            <svg class="warehouse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        <div class="warehouse-stats-grid">
          <div class="warehouse-stat-cell">
            <div class="warehouse-stat-lbl">SKUs</div>
            <div class="warehouse-stat-val">${wh.skus.size}</div>
          </div>
          <div class="warehouse-stat-cell">
            <div class="warehouse-stat-lbl">Units</div>
            <div class="warehouse-stat-val">${App.Fmt.number(wh.qty)}</div>
          </div>
          <div class="warehouse-stat-cell">
            <div class="warehouse-stat-lbl">Value</div>
            <div class="warehouse-stat-val">${App.Fmt.currency(wh.value)}</div>
          </div>
          <div class="warehouse-stat-cell">
            <div class="warehouse-stat-lbl">Weight</div>
            <div class="warehouse-stat-val">${App.Fmt.weight(wh.weight)}</div>
          </div>
        </div>

        ${hasRisk ? `
          <div class="warehouse-risk-bar">
            ${wh.damaged ? `
              <span class="warehouse-risk-pill danger" title="Damaged inventory value">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Damaged: ${App.Fmt.currency(wh.damaged)}
              </span>
            ` : ''}
            ${wh.nearExpiry ? `
              <span class="warehouse-risk-pill warning" title="Near expiry inventory value">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Near Expiry: ${App.Fmt.currency(wh.nearExpiry)}
              </span>
            ` : ''}
            ${wh.expired ? `
              <span class="warehouse-risk-pill purple" title="Expired inventory value">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Expired: ${App.Fmt.currency(wh.expired)}
              </span>
            ` : ''}
          </div>
        ` : `
          <div class="warehouse-risk-bar">
            <span class="warehouse-risk-pill success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              100% Saleable Stock
            </span>
          </div>
        `}
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
            y:{ ticks:{color:'#64748b', callback:v=>App.Fmt.currency(v, false)}, grid:{color:'#1a1d28'} }
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
    const totalMass  = whRecs.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalVolume= whRecs.reduce((s,r) => s+(r.total_volume_l||0), 0);
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

    const cleanWhName = App.Fmt.escapeHtml(whName);

    container.innerHTML = '';
    container.insertAdjacentHTML('beforeend', `
      <div class="wh-detail-header mb-24">
        <div class="wh-header-identity">
          <div class="wh-header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
              <path d="M6 18h12"/>
              <path d="M6 14h12"/>
              <rect x="10" y="10" width="4" height="4"/>
            </svg>
          </div>
          <div class="wh-header-info">
            <h1 class="wh-header-title">${cleanWhName}</h1>
            <div class="wh-header-chips">
              <span class="wh-header-chip chip-neutral">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                ${App.Fmt.number(skuCount)} SKUs
              </span>
              <span class="wh-header-chip chip-accent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
                ${catMap.size} Categories Represented
              </span>
              <span class="wh-header-chip chip-cyan">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                ${App.Fmt.number(totalQty)} Units
              </span>
            </div>
          </div>
        </div>
        <div class="wh-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="App.Router.go('warehouses')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            All Warehouses
          </button>
        </div>
      </div>
      <div class="flex gap-12 mb-24" style="flex-wrap:wrap">
        ${kpi('Units',   App.Fmt.number(totalQty), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', '#10b981')}
        ${kpi('Value',   App.Fmt.currency(totalValue), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>', '#f59e0b')}
        ${kpi('Total Mass',   App.Fmt.mass(totalMass), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>', '#38bdf8')}
        ${kpi('Total Volume', App.Fmt.volume(totalVolume), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>', '#06b6d4')}
        ${kpi('SKUs',    App.Fmt.number(skuCount), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', '#6366f1')}
      </div>
      <div class="section-header mb-12" style="display:flex;align-items:center;justify-content:space-between">
        <div class="section-title">Categories in this Warehouse</div>
        <span class="text-xs text-muted font-medium">${catMap.size} categories</span>
      </div>
      <div class="card wh-categories-card mb-24">
        <div class="wh-categories-header">
          <div class="wh-col-rank">#</div>
          <div class="wh-col-cat">Category</div>
          <div class="wh-col-units">Units</div>
          <div class="wh-col-value">Total Value</div>
          <div class="wh-col-share">Share</div>
        </div>
        <div class="wh-categories-list">
          ${(() => {
            const sortedCats = [...catMap.values()].sort((a,b) => b.value - a.value);
            const maxCatVal = sortedCats[0]?.value || 1;
            return sortedCats.map((c, i) => {
              const pct = totalValue ? (c.value / totalValue * 100).toFixed(1) : '0.0';
              const relPct = Math.max(4, Math.min(100, Math.round((c.value / maxCatVal) * 100)));
              const rank = i + 1;
              const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
              const cleanName = App.Fmt.escapeHtml(c.name);

              return `
                <div class="wh-category-row" onclick="App.Router.go('category',{name:encodeURIComponent('${c.name}')})" role="button" tabindex="0" title="View ${cleanName} details">
                  <div class="wh-col-rank">
                    <span class="wh-rank-badge ${rankClass}">${rank}</span>
                  </div>
                  <div class="wh-col-cat">
                    <div class="wh-cat-avatar">${(c.name[0] || '?').toUpperCase()}</div>
                    <div class="wh-cat-info">
                      <span class="wh-cat-name">${cleanName}</span>
                      <span class="wh-cat-brand-pill">${c.brands.size} Brand${c.brands.size === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <div class="wh-col-units">
                    <span class="wh-metric-num">${App.Fmt.number(c.qty)}</span>
                  </div>
                  <div class="wh-col-value">
                    <span class="wh-metric-val">${App.Fmt.currency(c.value)}</span>
                  </div>
                  <div class="wh-col-share">
                    <div class="wh-share-wrap">
                      <span class="wh-share-pct">${pct}%</span>
                      <div class="wh-share-bar">
                        <div class="wh-share-bar-fill" style="width:${relPct}%"></div>
                      </div>
                    </div>
                    <div class="wh-cat-arrow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  </div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
    `);
  }

  function kpi(label, value, iconSvg, color) {
    return `<div class="kpi-card" style="--kpi-color:${color};flex:1;min-width:150px">
      <div class="kpi-icon" style="background:${color}18;color:${color}">${iconSvg}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
  }

  return { render };
})();
