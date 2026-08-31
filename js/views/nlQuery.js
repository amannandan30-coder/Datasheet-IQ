window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   NL QUERY VIEW (inline section on dashboard)
   ============================================================ */
App.Views.NLQuery = (() => {

  const EXAMPLES = [
    'How much atta do we have?',
    'Show all atta brands',
    'Which atta brand has the most units?',
    'Top 20 products by value',
    'Show damaged inventory',
    'Which category has highest value?',
  ];

  function render(container, dataset_id) {
    container.innerHTML = `
      <div class="nl-query-wrap mb-24" id="nl-wrap">
        <div class="flex items-center gap-10 mb-10">
          <span style="font-size:20px">🤖</span>
          <span class="font-semibold">Ask about your inventory…</span>
        </div>
        <input class="nl-query-input" id="nl-input" placeholder="e.g. How much atta do we have? / Which brand has the most units?" 
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
      result.innerHTML = `<div class="nl-result flex items-center gap-10"><div class="spinner"></div><span class="text-muted">Searching…</span></div>`;

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

    if (res.data?.brands) {
      html += `<div class="mb-12">${res.data.brands.map(b => `
        <div class="brand-row" onclick="App.Router.go('brand',{id:encodeURIComponent('${b.name}')})">
          <div class="brand-avatar">${(b.name||'?')[0].toUpperCase()}</div>
          <div class="brand-name-block"><div class="brand-name">${b.name}</div></div>
          <div class="brand-stats">
            <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.number(b.qty)}</div><div class="brand-stat-lbl">Units</div></div>
            <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.currency(b.value)}</div><div class="brand-stat-lbl">Value</div></div>
          </div>
        </div>`).join('')}</div>`;
    }

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

    html += `</div>`;
    wrap.innerHTML = html;
  }

  function statusBadge(type) {
    const t = (type||'').toLowerCase();
    if (t==='damaged') return 'badge-danger';
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
    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading brands…</span></div>`;

    const brands  = await App.DB.getAllByIndex('brands','dataset_id',dataset_id);
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);

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
          <div class="brand-stat-item"><div class="brand-stat-val">${App.Fmt.weight(b.weight)}</div><div class="brand-stat-lbl">Weight</div></div>
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
