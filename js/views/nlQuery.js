window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   NL QUERY VIEW (inline section on dashboard)
   ============================================================ */
App.Views.NLQuery = (() => {

  const EXAMPLES = [
    'What is the total value of my inventory?',
    'Which category has the highest value?',
    'Which brand has the most units?',
    'Top 10 products by value',
    'Show damaged inventory',
    'How much inventory is near expiry?',
  ];

  function render(container, dataset_id) {
    container.innerHTML = `
      <div class="nl-query-wrap mb-24" id="nl-wrap">
        <div class="nl-header">
          <div class="nl-ai-icon-box">🤖</div>
          <span class="nl-title">Ask about your inventory…</span>
        </div>
        <input class="nl-query-input" id="nl-input" placeholder="e.g. What is the total value? / Which brand has the most units?" 
               autocomplete="off">
        <div class="nl-examples" id="nl-examples">
          ${EXAMPLES.map(e => `<span class="nl-example-chip" onclick="setNLQuery(this.textContent)">${e}</span>`).join('')}
        </div>
      </div>
      <div id="nl-result-wrap"></div>
    `;

    const input  = container.querySelector('#nl-input');
    const result = container.querySelector('#nl-result-wrap');

    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      result.innerHTML = `<div class="nl-result flex items-center gap-10"><div class="spinner"></div><span class="text-muted">Analyzing your question…</span></div>`;

      const res = await App.NLEngine.query(q, dataset_id);
      renderNLResult(result, res);
    });

    window.setNLQuery = (q) => { input.value = q; input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  }

  function renderNLResult(wrap, res) {
    if (!res) { wrap.innerHTML = ''; return; }
    if (res.type === 'not_found' || res.type === 'error') {
      wrap.innerHTML = `<div class="nl-result"><div class="flex items-center gap-8"><span>⚠️</span><span>${res.message}</span></div></div>`;
      return;
    }

    let html = `<div class="nl-result">
      <div class="flex items-center gap-8 mb-12">
        <span style="font-size:18px">✨</span>
        <div class="text-xl font-bold">${res.headline}</div>
      </div>`;

    // ── KPI Summary Cards (for SUMMARY and FILTERED_SEARCH) ──
    if (res.data && (res.data.total_units != null || res.data.total_value != null)) {
      html += `<div class="grid-4 mb-16" style="gap:10px">`;
      if (res.data.total_units != null) {
        html += nlKpi('📦', 'Units', App.Fmt.number(res.data.total_units));
      }
      if (res.data.total_value != null) {
        html += nlKpi('💰', 'Value', App.Fmt.currency(res.data.total_value));
      }
      if (res.data.total_weight != null && res.data.total_weight > 0) {
        html += nlKpi('⚖️', 'Weight', App.Fmt.weight(res.data.total_weight));
      }
      if (res.data.brand_count != null) {
        html += nlKpi('🏷️', 'Brands', App.Fmt.number(res.data.brand_count));
      }
      if (res.data.sku_count != null) {
        html += nlKpi('📊', 'SKUs', App.Fmt.number(res.data.sku_count));
      }
      if (res.data.record_count != null) {
        html += nlKpi('📋', 'Records', App.Fmt.number(res.data.record_count));
      }
      if (res.data.warehouse_count != null && res.data.warehouse_count > 0) {
        html += nlKpi('🏭', 'Warehouses', App.Fmt.number(res.data.warehouse_count));
      }
      html += `</div>`;
    }

    // ── Category list ──
    if (res.data?.categories) {
      html += `<div class="mb-12">
        <div class="data-table-wrap"><div class="data-table-scroll"><table class="data-table">
          <thead><tr><th>#</th><th>Category</th><th>Units</th><th>Value</th><th>Brands</th><th>SKUs</th></tr></thead>
          <tbody>${res.data.categories.map((c,i) => `
            <tr style="cursor:pointer" onclick="App.Router.go('category',{name:encodeURIComponent('${c.name}')})">
              <td>${i+1}</td><td><strong>${c.name}</strong></td>
              <td>${App.Fmt.number(c.qty)}</td><td>${App.Fmt.currency(c.value)}</td>
              <td>${c.brand_count || '—'}</td><td>${c.sku_count || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div></div></div>`;
    }

    // ── Brand list ──
    if (res.data?.brands && !res.data?.categories) {
      const isSummary = res.intent === 'SUMMARY';
      if (isSummary) {
        const toggleId = 'summary-brands-' + Math.random().toString(36).substr(2, 6);
        html += `<div class="mb-12">
          <button class="btn btn-sm btn-ghost mb-8" onclick="const el=document.getElementById('${toggleId}'); if(el){ const isHidden=el.style.display==='none'; el.style.display=isHidden?'block':'none'; this.querySelector('.arrow').textContent=isHidden?'▲':'▼'; }">
            <span>🏷️</span> <span>View Brand Breakdown (${res.data.brands.length} brands)</span> <span class="arrow text-xs text-muted" style="margin-left:4px">▼</span>
          </button>
          <div id="${toggleId}" style="display:none" class="animate-fade-in">`;
      } else {
        html += `<div class="mb-12">`;
      }

      html += res.data.brands.map((b,i) => `
        <div class="brand-row" onclick="App.Router.go('brand',{id:encodeURIComponent('${b.name}')})">
          <div class="brand-rank">${i+1}</div>
          <div class="brand-avatar">${(b.name||'?')[0].toUpperCase()}</div>
          <div class="brand-name-block">
            <div class="brand-name">${b.name}</div>
            <div class="brand-aliases">${b.sku_count || b.skus?.size || '—'} SKUs</div>
          </div>
          <div class="brand-stats">
            <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.number(b.qty)}</div><div class="brand-stat-lbl">Units</div></div>
            <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.mass(b.mass || b.weight)}</div><div class="brand-stat-lbl">Mass</div></div><div class="brand-stat-item"><div class="brand-stat-val">${(b.volume > 0 ? App.Fmt.volume(b.volume) : "—")}</div><div class="brand-stat-lbl">Volume</div></div>
            <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.currency(b.value)}</div><div class="brand-stat-lbl">Value</div></div>
          </div>
        </div>`).join('');

      html += `</div>`;
      if (isSummary) html += `</div>`;
    }

    // ── Product table ──
    if (res.data?.products) {
      html += `<div class="mb-12">
        <div class="data-table-wrap"><div class="data-table-scroll"><table class="data-table">
          <thead><tr><th>#</th><th>Product</th><th>Brand</th><th>Units</th><th>Value</th></tr></thead>
          <tbody>${res.data.products.map((p,i) => `
            <tr><td>${i+1}</td><td>${p.name}</td><td>${p.brand}</td>
            <td>${App.Fmt.number(p.qty)}</td><td>${App.Fmt.currency(p.value)}</td></tr>`).join('')}
          </tbody>
        </table></div></div></div>`;
    }

    // ── Raw records (for search/filtered results) ──
    if (res.records?.length) {
      html += `<div class="text-xs text-muted mb-6">Showing ${Math.min(10,res.records.length)} of ${res.records.length} matching records</div>
        <div class="data-table-wrap"><div class="data-table-scroll"><table class="data-table">
          <thead><tr><th>Product</th><th>Brand</th><th>UOM</th><th>Qty</th><th>Value</th><th>Warehouse</th><th>Status</th></tr></thead>
          <tbody>${res.records.slice(0,10).map(r => `
            <tr><td>${r.normalized_product_name||'—'}</td><td>${r.normalized_brand||'—'}</td>
            <td><span class="tag">${r.normalized_uom||'—'}</span></td>
            <td>${App.Fmt.number(r.qty)}</td><td>${App.Fmt.currency(r.source_value)}</td>
            <td>${r.normalized_warehouse||'—'}</td>
            <td><span class="badge ${statusBadge(r.raw_bad_inventory_type)}">${r.raw_bad_inventory_type||'unknown'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div></div>`;
    }

    // ── Follow-up suggestions ──
    if (res.followUp?.length) {
      html += `<div class="nl-examples mt-12" style="padding-top:8px;border-top:1px solid var(--border)">
        ${res.followUp.map(f => `<span class="nl-example-chip" onclick="setNLQuery(this.textContent)">${f}</span>`).join('')}
      </div>`;
    }

    html += `</div>`;
    wrap.innerHTML = html;
  }

  function nlKpi(icon, label, value) {
    return `<div style="background:var(--bg-surface-2);padding:10px 14px;border-radius:8px;text-align:center">
      <div style="font-size:14px">${icon}</div>
      <div class="font-bold text-base mt-4">${value}</div>
      <div class="text-xs text-muted">${label}</div>
    </div>`;
  }

  function statusBadge(type) {
    const t = (type||'').toLowerCase();
    if (t==='damaged') return 'badge-danger';
    if (t==='expired') return 'badge-purple';
    if (t.includes('expir')) return 'badge-warning';
    return 'badge-muted';
  }

  return { render };
})();

/* ============================================================
   ALL BRANDS VIEW
   ============================================================ */
App.Views.AllBrands = (() => {
  async function render(container, params, dataset_id) {
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view brands.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading brands…</span></div>`;

    const brands  = await App.DB.getAllByIndex('brands','dataset_id',dataset_id);
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Records Found</div>
          <div class="text-sm text-muted mb-16">No brand records found in the active dataset.</div>
          <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">Back to Dashboard</button>
        </div>`;
      return;
    }

    // Build brand stats from records
    const brandStats = new Map();
    for (const r of records) {
      const b = r.normalized_brand||'Unknown';
      if (!brandStats.has(b)) brandStats.set(b, {name:b,qty:0,value:0,weight:0,skus:new Set()});
      const s = brandStats.get(b);
      s.qty    += (r.qty||0);
      s.value  += (r.source_value||0);
      s.weight += (r.total_weight||0);
      s.skus.add(r.product_family_id);
    }

    const sortedBrands = [...brandStats.values()].sort((a,b) => b.value-a.value);
    const totalValue   = records.reduce((s,r) => s+(r.source_value||0), 0);

    container.innerHTML = '';
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">All Brands</div>
          <div class="page-sub">${sortedBrands.length} brands</div>
        </div>
        <input class="input" style="width:200px" placeholder="Search brands…" oninput="filterAllBrands(this.value)" id="all-brand-search">
      </div>
      <div class="card" id="all-brands-list"></div>
    `);

    const list = container.querySelector('#all-brands-list');
    renderBrandRows(sortedBrands, list, totalValue);

    window.filterAllBrands = (q) => {
      const filtered = q ? sortedBrands.filter(b => b.name.toLowerCase().includes(q.toLowerCase())) : sortedBrands;
      renderBrandRows(filtered, list, totalValue);
    };
  }

  function renderBrandRows(brands, wrap, totalValue) {
    wrap.innerHTML = '';
    brands.forEach((b, i) => {
      const pct = totalValue ? (b.value/totalValue*100).toFixed(1) : 0;
      const el = document.createElement('div');
      el.className = 'brand-row';
      el.innerHTML = `
        <div class="brand-rank">${i+1}</div>
        <div class="brand-avatar">${b.name[0]?.toUpperCase()||'?'}</div>
        <div class="brand-name-block">
          <div class="brand-name">${b.name}</div>
          <div class="brand-aliases">${b.skus.size} SKUs</div>
        </div>
        <div class="brand-stats">
          <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.number(b.qty)}</div><div class="brand-stat-lbl">Units</div></div>
          <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.mass(b.mass || b.weight)}</div><div class="brand-stat-lbl">Mass</div></div><div class="brand-stat-item"><div class="brand-stat-val">${(b.volume > 0 ? App.Fmt.volume(b.volume) : "—")}</div><div class="brand-stat-lbl">Volume</div></div>
          <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.currency(b.value)}</div><div class="brand-stat-lbl">Value</div></div>
          <div class="brand-stat-item"><div class="brand-stat-val">${pct}%</div><div class="brand-stat-lbl">of Total</div></div>
        </div>
        <div class="brand-pct-bar"><div class="brand-pct-fill" style="width:${Math.min(100,parseFloat(pct)*5)}%"></div></div>
      `;
      el.onclick = () => App.Router.go('brand', { id: encodeURIComponent(b.name) });
      wrap.appendChild(el);
    });
  }

  return { render };
})();
