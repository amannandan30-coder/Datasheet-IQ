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
   INVENTORY TABLE VIEW (all records with debounced search/filter & pagination)
   ============================================================ */
App.Views.InventoryTable = (() => {

  function getRecordStatus(r) {
    if (r.status) return r.status;
    if (r.resolved_status) return r.resolved_status;
    if (typeof App.InventoryStatusResolver !== 'undefined' && App.InventoryStatusResolver.resolveRecordStatus) {
      return App.InventoryStatusResolver.resolveRecordStatus(r);
    }
    return 'unknown';
  }

  function formatStatusLabel(st) {
    if (!st) return 'Unknown';
    const s = String(st).toLowerCase();
    if (s === 'sellable' || s === 'saleable') return 'Sellable';
    if (s === 'non_sellable' || s === 'non-sellable' || s === 'nonsaleable') return 'Non-Sellable';
    if (s === 'unknown') return 'Unknown';
    return App.Cleaner ? App.Cleaner.normTitle(s) : (s.charAt(0).toUpperCase() + s.slice(1));
  }


  let _allRecords = [];
  let _filtered   = [];
  let _page       = 0;
  const PAGE_SIZE = 50;
  let _searchTimeout = null;

  async function render(container, params, dataset_id) {
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view inventory records.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><span>📂</span> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading inventory…</span></div>`;

    _allRecords = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    _filtered   = [..._allRecords];
    _page       = 0;

    if (!_allRecords.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Records Found</div>
          <div class="text-sm text-muted mb-16">No inventory records found in the active dataset.</div>
          <button class="btn btn-secondary" onclick="App.Router.go('dashboard')">Back to Dashboard</button>
        </div>`;
      return;
    }

    container.innerHTML = '';

    /* ── Filters bar ─────────────────────────────────────── */
    const cats    = [...new Set(_allRecords.map(r => r.normalized_category).filter(Boolean))].sort();
    const brands  = [...new Set(_allRecords.map(r => r.normalized_brand).filter(Boolean))].sort();
    const whs     = [...new Set(_allRecords.map(r => r.normalized_warehouse || r.warehouse_id).filter(Boolean))].sort();
    const statuses= [...new Set(_allRecords.map(r => getRecordStatus(r)))].filter(Boolean).sort();

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Inventory Records</div>
          <div class="page-sub" id="inv-count">${App.Fmt.number(_allRecords.length)} records</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary" onclick="exportFiltered('csv')">⬇️ Export CSV</button>
          <button class="btn btn-primary" onclick="exportFiltered('xlsx')">📊 Export XLSX</button>
        </div>
      </div>

      <div class="card mb-16" style="overflow:visible">
        <div class="filter-row" id="filter-row">
          <input class="input" placeholder="Search product, brand, item ID…" oninput="applySearchDebounced(this.value)" id="inv-search">
          <select class="select" onchange="applyFilter('cat',this.value)"><option value="">All Categories</option>${cats.map(c=>`<option value="${App.Fmt.escapeHtml(c)}">${App.Fmt.escapeHtml(c)}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('brand',this.value)"><option value="">All Brands</option>${brands.map(b=>`<option value="${App.Fmt.escapeHtml(b)}">${App.Fmt.escapeHtml(b)}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('wh',this.value)"><option value="">All Warehouses</option>${whs.map(w=>`<option value="${App.Fmt.escapeHtml(w)}">${App.Fmt.escapeHtml(w)}</option>`).join('')}</select>
          <select class="select" onchange="applyFilter('status',this.value)"><option value="">All Statuses</option>${statuses.map(s=>`<option value="${App.Fmt.escapeHtml(s)}">${App.Fmt.escapeHtml(formatStatusLabel(s))}</option>`).join('')}</select>
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
                <th onclick="sortBy('status')">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inv-tbody"></tbody>
          </table>
        </div>
        <div class="data-table-pagination" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
          <span id="inv-page-info" style="font-size:13px;color:var(--text-muted)"></span>
          <div class="flex gap-8 items-center">
            <button class="btn btn-sm btn-secondary" onclick="prevPage()" id="inv-prev-btn">← Prev</button>
            <button class="btn btn-sm btn-secondary" onclick="nextPage()" id="inv-next-btn">Next →</button>
          </div>
        </div>
      </div>
    `);

    renderPage();

    /* ── Active filters state ────────────────────────────── */
    window._invFilters = { search:'', cat:'', brand:'', wh:'', status:'' };

    window.applySearchDebounced = (q) => {
      clearTimeout(_searchTimeout);
      _searchTimeout = setTimeout(() => {
        window._invFilters.search = q;
        rebuildFiltered();
      }, 200);
    };

    window.applyFilter = (key, val) => { window._invFilters[key] = val; rebuildFiltered(); };
    window.sortBy      = (col) => { _filtered.sort((a,b) => { const av = col === 'status' ? getRecordStatus(a) : a[col]; const bv = col === 'status' ? getRecordStatus(b) : b[col]; return typeof bv==='number'?bv-av:(bv||'').toString().localeCompare((av||'').toString()); }); _page=0; renderPage(); };
    window.prevPage    = () => { if(_page > 0){_page--;renderPage();} };
    window.nextPage    = () => { if((_page+1)*PAGE_SIZE < _filtered.length){_page++;renderPage();} };
    window.exportFiltered = (fmt) => {
      if (!_filtered.length) {
        App.UI.toast('No records to export');
        return;
      }
      const fname = `inventory_filtered_${Date.now()}`;
      if (fmt === 'xlsx') {
        App.Exporter.exportToXLSX(fname, _filtered);
      } else {
        App.Exporter.exportToCSV(fname, _filtered);
      }
      App.UI.toast(`Exported ${_filtered.length} filtered records to ${fmt.toUpperCase()} ✅`);
    };
  }

  function rebuildFiltered() {
    const f = window._invFilters;
    _filtered = _allRecords.filter(r => {
      if (f.search) {
        const fullStr = `${r.normalized_product_name||''} ${r.name||''} ${r.normalized_brand||''} ${r.item_id||''} ${r.upc||''}`.toLowerCase();
        if (!fullStr.includes(f.search.toLowerCase())) return false;
      }
      if (f.cat    && r.normalized_category !== f.cat)    return false;
      if (f.brand  && r.normalized_brand    !== f.brand)  return false;
      if (f.wh     && (r.normalized_warehouse || r.warehouse_id) !== f.wh) return false;
      if (f.status && getRecordStatus(r) !== f.status) return false;
      return true;
    });
    _page = 0;
    renderPage();
    const countEl = document.getElementById('inv-count');
    if (countEl) countEl.textContent = `${App.Fmt.number(_filtered.length)} records (filtered)`;
  }

  function renderPage() {
    const tbody  = document.getElementById('inv-tbody');
    const info   = document.getElementById('inv-page-info');
    const prevBtn= document.getElementById('inv-prev-btn');
    const nextBtn= document.getElementById('inv-next-btn');
    if (!tbody) return;

    const total  = _filtered.length;
    const start  = _page * PAGE_SIZE;
    const slice  = _filtered.slice(start, start + PAGE_SIZE);

    if (total === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text-muted)">No matching records found</td></tr>`;
      if (info) info.textContent = 'Showing 0 of 0 records';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    tbody.innerHTML = slice.map(r => {
      const prodName = App.Fmt.escapeHtml(r.normalized_product_name || r.name || '—');
      const brand    = App.Fmt.escapeHtml(r.normalized_brand || '—');
      const cat      = App.Fmt.escapeHtml(r.normalized_category || '—');
      const subcat   = App.Fmt.escapeHtml(r.subcategory || '—');
      const uom      = App.Fmt.escapeHtml(r.normalized_uom || r.raw_uom || '—');
      const wh       = App.Fmt.escapeHtml(r.normalized_warehouse || r.warehouse_id || '—');
      const rawSt    = getRecordStatus(r);
      const status   = App.Fmt.escapeHtml(formatStatusLabel(rawSt));

      return `
        <tr>
          <td class="truncate" style="max-width:200px" title="${prodName}">${prodName}</td>
          <td>${brand}</td>
          <td>${cat}</td>
          <td>${subcat}</td>
          <td><span class="tag">${uom}</span></td>
          <td>${r.variant_mrp ? App.Fmt.currencyFull(r.variant_mrp) : (r.mrp ? App.Fmt.currencyFull(r.mrp) : '—')}</td>
          <td class="font-semibold">${App.Fmt.number(r.qty || 0)}</td>
          <td>${r.source_value ? App.Fmt.currency(r.source_value) : '—'}</td>
          <td>${App.Fmt.weight(r.total_weight || r.weight)}</td>
          <td>${wh}</td>
          <td><span class="badge ${statusBadge(rawSt)}">${status}</span></td>
          <td><button class="btn btn-sm btn-ghost" onclick="App.UI.openDrawer('${r.id}')">Inspect</button></td>
        </tr>`;
    }).join('');

    const maxPage = Math.ceil(total / PAGE_SIZE);
    if (info) info.textContent = `Showing ${start+1}–${Math.min(start+PAGE_SIZE, total)} of ${App.Fmt.number(total)} records (Page ${_page+1} of ${maxPage})`;
    if (prevBtn) prevBtn.disabled = (_page <= 0);
    if (nextBtn) nextBtn.disabled = ((_page + 1) * PAGE_SIZE >= total);
  }

  function statusBadge(type) {
    const t = (type || '').toLowerCase();
    if (t === 'sellable' || t === 'saleable') return 'badge-success';
    if (t === 'non_sellable' || t === 'non-sellable' || t === 'nonsaleable' || t === 'damaged') return 'badge-danger';
    if (t === 'expired') return 'badge-purple';
    if (t.includes('expir')) return 'badge-warning';
    return 'badge-muted';
  }

  return { render };
})();

