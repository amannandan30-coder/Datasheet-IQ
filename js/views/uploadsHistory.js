window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   UPLOADS HISTORY VIEW
   ============================================================ */
App.Views.UploadsHistory = (() => {

  async function render(container) {
    const datasets = await App.DB.getAllDatasets();
    container.innerHTML = '';

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Upload History</div>
          <div class="page-sub">${datasets.length} dataset${datasets.length!==1?'s':''} stored</div>
        </div>
        <button class="btn btn-primary" onclick="App.UI.showUploadModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload New File
        </button>
      </div>
    `);

    if (!datasets.length) {
      container.insertAdjacentHTML('beforeend', `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="text-lg font-semibold">No uploads yet</div>
          <div class="text-muted">Upload your first inventory Excel file to get started</div>
          <button class="btn btn-primary mt-16" onclick="App.UI.showUploadModal()">Upload Now</button>
        </div>
      `);
      return;
    }

    for (const ds of datasets) {
      const kpis = ds.kpis || {};
      const isActive = ds.id === App.State.dataset_id;
      const el = document.createElement('div');
      el.className = 'upload-row';
      if (isActive) el.style.borderColor = 'var(--accent)';
      el.innerHTML = `
        <div class="upload-row-icon">${ds.status==='processed'?'✅':'⚙️'}</div>
        <div class="upload-row-info">
          <div class="upload-row-name">${ds.filename}</div>
          <div class="upload-row-meta">
            ${App.Fmt.date(ds.uploadedAt)} · 
            ${App.Fmt.number(ds.rowCount)} rows · 
            ${App.Fmt.number(ds.columnCount)} columns ·
            ${App.Fmt.number(kpis.total_skus)} SKUs ·
            ${App.Fmt.currency(kpis.total_value)}
          </div>
          ${ds.missingColumns?.length ? `<div class="text-xs" style="color:var(--warning);margin-top:3px">Missing columns: ${ds.missingColumns.join(', ')}</div>` : ''}
          ${isActive ? '<div class="badge badge-accent mt-4">Active Dataset</div>' : ''}
        </div>
        <div class="upload-row-actions">
          ${!isActive ? `<button class="btn btn-sm btn-primary" onclick="App.UI.loadDataset('${ds.id}')">Load</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="App.UI.downloadReconciliation('${ds.id}')">📊 Reconciliation</button>
          <button class="btn btn-sm btn-ghost" onclick="App.UI.deleteDataset('${ds.id}')">🗑️</button>
        </div>
      `;
      container.appendChild(el);
    }
  }

  return { render };
})();

/* ============================================================
   INVENTORY TABLE VIEW (all records with search/filter)
   ============================================================ */
App.Views.InventoryTable = (() => {

  let _allRecords = [];
  let _filtered   = [];
  let _page       = 0;
  const PAGE_SIZE = 100;

  async function render(container, params, dataset_id) {
    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading inventory…</span></div>`;

    _allRecords = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    _filtered   = [..._allRecords];
    _page       = 0;

    container.innerHTML = '';

    /* ── Filters bar ─────────────────────────────────────── */
    const cats    = [...new Set(_allRecords.map(r => r.normalized_category))].sort();
    const brands  = [...new Set(_allRecords.map(r => r.normalized_brand))].sort();
    const whs     = [...new Set(_allRecords.map(r => r.normalized_warehouse))].sort();
    const statuses= [...new Set(_allRecords.map(r => r.raw_bad_inventory_type||'unknown'))].sort();

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Inventory Records</div>
          <div class="page-sub" id="inv-count">${App.Fmt.number(_allRecords.length)} records</div>
        </div>
        <button class="btn btn-secondary" onclick="exportCSV()">⬇️ Export CSV</button>
      </div>

      <div class="card mb-16" style="overflow:visible">
        <div class="filter-row" id="filter-row">
          <input class="input" placeholder="Search product, brand, item ID…" oninput="applySearch(this.value)" id="inv-search">
          <select class="select" onchange="applyFilter('cat',this.value)"><option value="">All Categories</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('brand',this.value)"><option value="">All Brands</option>${brands.map(b=>`<option>${b}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('wh',this.value)"><option value="">All Warehouses</option>${whs.map(w=>`<option>${w}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('status',this.value)"><option value="">All Statuses</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select>
        </div>
        <div id="active-filters" class="filter-bar" style="margin-top:8px;display:none"></div>
      </div>

      <div class="data-table-wrap">
        <div class="data-table-scroll" style="max-height:560px">
          <table class="data-table">
            <thead>
              <tr>
                <th onclick="sortBy('normalized_product_name')">Product</th>
                <th onclick="sortBy('normalized_brand')">Brand</th>
                <th onclick="sortBy('normalized_category')">Category</th>
                <th onclick="sortBy('subcategory')">Subcategory</th>
                <th onclick="sortBy('normalized_uom')">UOM</th>
                <th onclick="sortBy('variant_mrp')">MRP</th>
                <th onclick="sortBy('qty')" class="sorted">Qty</th>
                <th onclick="sortBy('source_value')">Value</th>
                <th onclick="sortBy('total_weight')">Weight</th>
                <th onclick="sortBy('normalized_warehouse')">Warehouse</th>
                <th onclick="sortBy('raw_bad_inventory_type')">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inv-tbody"></tbody>
          </table>
        </div>
        <div class="data-table-pagination">
          <span id="inv-page-info"></span>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-secondary" onclick="prevPage()">← Prev</button>
            <button class="btn btn-sm btn-secondary" onclick="nextPage()">Next →</button>
          </div>
        </div>
      </div>
    `);

    renderPage();

    /* ── Active filters state ────────────────────────────── */
    window._invFilters = { search:'', cat:'', brand:'', wh:'', status:'' };

    window.applySearch = (q) => { window._invFilters.search = q; rebuildFiltered(); };
    window.applyFilter = (key, val) => { window._invFilters[key] = val; rebuildFiltered(); };
    window.sortBy      = (col) => { _filtered.sort((a,b) => { const av=a[col], bv=b[col]; return typeof bv==='number'?bv-av:(bv||'').toString().localeCompare((av||'').toString()); }); _page=0; renderPage(); };
    window.prevPage    = () => { if(_page > 0){_page--;renderPage();} };
    window.nextPage    = () => { if((_page+1)*PAGE_SIZE < _filtered.length){_page++;renderPage();} };
    window.exportCSV   = () => exportToCSV(_filtered);
  }

  function rebuildFiltered() {
    const f = window._invFilters;
    _filtered = _allRecords.filter(r => {
      if (f.search  && !`${r.normalized_product_name} ${r.normalized_brand} ${r.item_id||''}`.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.cat    && r.normalized_category !== f.cat)    return false;
      if (f.brand  && r.normalized_brand    !== f.brand)  return false;
      if (f.wh     && r.normalized_warehouse!== f.wh)     return false;
      if (f.status && (r.raw_bad_inventory_type||'unknown') !== f.status) return false;
      return true;
    });
    _page = 0;
    renderPage();
    document.getElementById('inv-count').textContent = `${App.Fmt.number(_filtered.length)} records (filtered)`;
  }

  function renderPage() {
    const tbody  = document.getElementById('inv-tbody');
    const info   = document.getElementById('inv-page-info');
    if (!tbody) return;

    const start  = _page * PAGE_SIZE;
    const slice  = _filtered.slice(start, start + PAGE_SIZE);
    const total  = _filtered.length;

    tbody.innerHTML = slice.map(r => `
      <tr>
        <td class="truncate" style="max-width:200px" title="${r.normalized_product_name||''}">${r.normalized_product_name||'—'}</td>
        <td>${r.normalized_brand||'—'}</td>
        <td>${r.normalized_category||'—'}</td>
        <td>${r.subcategory||'—'}</td>
        <td><span class="tag">${r.normalized_uom||r.raw_uom||'—'}</span></td>
        <td>${r.variant_mrp ? App.Fmt.currencyFull(r.variant_mrp) : '—'}</td>
        <td class="font-semibold">${App.Fmt.number(r.qty)}</td>
        <td>${r.source_value ? App.Fmt.currency(r.source_value) : '—'}</td>
        <td>${App.Fmt.weight(r.total_weight)}</td>
        <td>${r.normalized_warehouse||'—'}</td>
        <td><span class="badge ${statusBadge(r.raw_bad_inventory_type)}">${r.raw_bad_inventory_type||'unknown'}</span></td>
        <td><button class="btn btn-sm btn-ghost" onclick="App.UI.openDrawer('${r.id}')">View</button></td>
      </tr>`).join('');

    if (info) info.textContent = `Showing ${start+1}–${Math.min(start+PAGE_SIZE, total)} of ${App.Fmt.number(total)}`;
  }

  function statusBadge(type) {
    const t = (type||'').toLowerCase();
    if (t==='damaged') return 'badge-danger';
    if (t.includes('expir')) return 'badge-warning';
    return 'badge-muted';
  }

  function exportToCSV(records) {
    const cols = ['normalized_product_name','normalized_brand','normalized_category','subcategory','normalized_uom','variant_mrp','qty','source_value','total_weight','normalized_warehouse','raw_bad_inventory_type','item_id','upc'];
    const header = cols.join(',');
    const rows   = records.map(r => cols.map(c => `"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(','));
    const csv    = [header,...rows].join('\n');
    const blob   = new Blob([csv], {type:'text/csv'});
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a'); a.href=url; a.download='inventory_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return { render };
})();
