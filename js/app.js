window.App = window.App || {};

/* ============================================================
   MAIN APP — Router + State + UI helpers
   ============================================================ */

App.State = {
  dataset_id: null,
  route: 'dashboard',
  params: {},
};

/* ── Router ──────────────────────────────────────────────── */
App.Router = {
  go(page, params = {}) {
    App.State.route  = page;
    App.State.params = params;
    window.location.hash = '#/' + page + '?' + new URLSearchParams(params).toString();
    App.UI.render();
  },

  parse() {
    const hash = window.location.hash.slice(2) || '';
    const [page, qs] = hash.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs));
    App.State.route  = page || 'dashboard';
    App.State.params = params;
  },
};

/* ── UI ──────────────────────────────────────────────────── */
App.UI = {

  /* Render the current route into #main-content */
  async render() {
    App.Router.parse();
    const { route, params } = App.State;
    const dataset_id = App.State.dataset_id;
    const main = document.getElementById('main-content');
    if (!main) return;

    // Clear previous charts
    ['_statusChart','_catValueChart','_catUnitsChart','_whChart'].forEach(k => {
      if (window[k]) { try { window[k].destroy(); } catch(e){} window[k]=null; }
    });

    main.innerHTML = '';
    main.scrollTop = 0;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-route="${route}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update breadcrumb
    App.UI.updateBreadcrumb(route, params);

    // Route dispatch
    switch (route) {
      case 'dashboard':   await App.Views.Dashboard.render(main, dataset_id); break;
      case 'category':    await App.Views.CategoryDetail.render(main, params, dataset_id); break;
      case 'brand':       await App.Views.BrandDetail.render(main, params, dataset_id); break;
      case 'brands':      await App.Views.AllBrands.render(main, params, dataset_id); break;
      case 'warehouses':
      case 'warehouse':   await App.Views.WarehouseView.render(main, params, dataset_id); break;
      case 'quality':     await App.Views.DataQuality.render(main, params, dataset_id); break;
      case 'uploads':     await App.Views.UploadsHistory.render(main); break;
      case 'inventory':   await App.Views.InventoryTable.render(main, params, dataset_id); break;
      case 'suggestions': await App.Views.DataQuality.render(main, params, dataset_id); break;
      default:            await App.Views.Dashboard.render(main, dataset_id);
    }
  },

  updateBreadcrumb(route, params) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const crumbs = [{ label: 'Dashboard', route: 'dashboard' }];
    if (route === 'category' && params.name) {
      crumbs.push({ label: decodeURIComponent(params.name), active: true });
    } else if (route === 'brand' && params.id) {
      if (params.cat) crumbs.push({ label: decodeURIComponent(params.cat), route: 'category', routeParams: {name:params.cat} });
      crumbs.push({ label: decodeURIComponent(params.id), active: true });
    } else if (route !== 'dashboard') {
      crumbs.push({ label: route.charAt(0).toUpperCase()+route.slice(1), active: true });
    }

    bc.innerHTML = crumbs.map((c,i) => {
      if (c.active) return `<span class="breadcrumb-item active">${c.label}</span>`;
      return `<span class="breadcrumb-item" onclick="App.Router.go('${c.route}',${JSON.stringify(c.routeParams||{})})">${c.label}</span>${i<crumbs.length-1?'<span class="breadcrumb-sep">›</span>':''}`;
    }).join('');
  },

  /* Load a dataset as active */
  async loadDataset(id) {
    App.State.dataset_id = id;
    localStorage.setItem('liq_active_dataset', id);
    App.UI.updateDatasetDisplay();
    App.Router.go('dashboard');
    App.UI.toast('Dataset loaded ✅');
  },

  /* Delete dataset */
  async deleteDataset(id) {
    if (!confirm('Delete this dataset? This cannot be undone.')) return;
    await App.DB.deleteDataset(id);
    if (App.State.dataset_id === id) {
      App.State.dataset_id = null;
      localStorage.removeItem('liq_active_dataset');
      App.UI.updateDatasetDisplay();
    }
    App.Router.go('uploads');
    App.UI.toast('Dataset deleted');
  },

  /* Update sidebar dataset display */
  async updateDatasetDisplay() {
    const sel = document.getElementById('dataset-selector');
    if (!sel) return;
    if (!App.State.dataset_id) {
      sel.innerHTML = `<div class="dataset-selector-label">No Dataset</div>
        <div class="dataset-selector-name" style="color:var(--text-muted)">Upload a file to begin</div>`;
      return;
    }
    const ds = await App.DB.getDataset(App.State.dataset_id);
    if (!ds) return;
    sel.innerHTML = `
      <div class="dataset-selector-label">Active Dataset</div>
      <div class="dataset-selector-name">${ds.filename}</div>
      <div class="dataset-selector-meta">${App.Fmt.number(ds.rowCount)} rows · ${App.Fmt.shortDate(ds.uploadedAt)}</div>`;
  },

  async exportDataset(format = 'csv') {
    const dataset_id = App.State.dataset_id;
    if (!dataset_id) {
      App.UI.toast('No active dataset loaded to export');
      return;
    }
    const dataset = await App.DB.getDataset(dataset_id);
    const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
    if (!records || !records.length) {
      App.UI.toast('No records found for current dataset');
      return;
    }
    const filename = `${(dataset.filename || 'inventory_export').replace(/\.[^/.]+$/, '')}_export`;
    if (format === 'xlsx') {
      App.Exporter.exportToXLSX(filename, records);
    } else {
      App.Exporter.exportToCSV(filename, records);
    }
    App.UI.toast(`Exported ${records.length} records to ${format.toUpperCase()} ✅`);
  },

  /* ── Upload Modal ────────────────────────────────────────── */
  showUploadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'upload-modal-overlay';
    overlay.innerHTML = `
      <div class="modal" id="upload-modal">
        <div class="modal-header">
          <div class="modal-title">📂 Upload Inventory File</div>
          <button class="modal-close" onclick="App.UI.closeUploadModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="drop-zone" id="drop-zone">
            <div class="drop-zone-icon">📊</div>
            <div class="drop-zone-title">Drag & Drop your Excel file here</div>
            <div class="drop-zone-sub">or click to browse — supports .xlsx, .xls, .csv (max 50 MB)</div>
            <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none">
          </div>

          <div id="file-info" style="display:none" class="mt-16">
            <div class="flex items-center gap-10 mb-12">
              <span style="font-size:24px">📄</span>
              <div>
                <div class="font-semibold" id="file-name"></div>
                <div class="text-xs text-muted" id="file-size"></div>
              </div>
            </div>
          </div>

          <div id="pipeline-stages-wrap" style="display:none" class="mt-16">
            <div class="pipeline-stages" id="pipeline-stages">
              ${App.Pipeline.STAGES.map(s => `
                <div class="pipeline-stage pending" id="stage-${s.id}">
                  <div class="stage-icon" id="stage-icon-${s.id}">⋯</div>
                  <div class="stage-name">${s.label}</div>
                  <div class="stage-status" id="stage-status-${s.id}"></div>
                </div>`).join('')}
            </div>
          </div>

          <div id="upload-error" class="mt-12" style="display:none">
            <div class="badge badge-danger" id="upload-error-msg"></div>
          </div>
        </div>
        <div class="modal-footer" id="modal-footer">
          <button class="btn btn-ghost" onclick="App.UI.closeUploadModal()">Cancel</button>
          <button class="btn btn-primary" id="process-btn" onclick="App.UI.processFile()" disabled>
            Process File
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const dropZone = document.getElementById('drop-zone');
    const fileInput= document.getElementById('file-input');

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => App.UI._setFile(e.target.files[0]);

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragging'); };
    dropZone.ondragleave= () => dropZone.classList.remove('dragging');
    dropZone.ondrop     = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      const f = e.dataTransfer.files[0];
      if (f) App.UI._setFile(f);
    };
  },

  _pendingFile: null,

  _setFile(file) {
    App.UI._pendingFile = file;
    const validation = App.Validator.validateFile(file);
    const errEl  = document.getElementById('upload-error');
    const errMsg = document.getElementById('upload-error-msg');
    const btn    = document.getElementById('process-btn');
    const info   = document.getElementById('file-info');
    const fname  = document.getElementById('file-name');
    const fsize  = document.getElementById('file-size');

    if (!validation.ok) {
      errEl.style.display = ''; errMsg.textContent = validation.errors.join(' | ');
      btn.disabled = true; return;
    }
    errEl.style.display = 'none';
    info.style.display  = '';
    fname.textContent   = file.name;
    fsize.textContent   = `${(file.size/1024/1024).toFixed(2)} MB`;
    btn.disabled        = false;
  },

  async processFile() {
    const file = App.UI._pendingFile;
    if (!file) return;

    document.getElementById('process-btn').disabled = true;
    document.getElementById('process-btn').innerHTML = '<div class="spinner" style="width:16px;height:16px"></div> Processing…';
    document.getElementById('pipeline-stages-wrap').style.display = '';
    document.getElementById('modal-footer').style.display = 'none';

    const result = await App.Pipeline.run(file, (stageId, status, msg) => {
      const stageEl   = document.getElementById(`stage-${stageId}`);
      const iconEl    = document.getElementById(`stage-icon-${stageId}`);
      const statusEl  = document.getElementById(`stage-status-${stageId}`);
      if (!stageEl) return;

      stageEl.className = `pipeline-stage ${status}`;
      if (status === 'active') iconEl.innerHTML = '<div class="spinner" style="width:16px;height:16px"></div>';
      if (status === 'done')   iconEl.textContent = '✅';
      if (status === 'error')  iconEl.textContent = '❌';
      if (statusEl) statusEl.textContent = msg || '';
    });

    if (result.ok) {
      App.UI._pendingFile = null;
      setTimeout(async () => {
        App.UI.closeUploadModal();
        await App.UI.loadDataset(result.dataset_id);
        App.UI.toast(`✅ "${file.name}" processed: ${App.Fmt.number(result.stats.rowCount)} records, ${result.stats.brandCount} brands, ${result.stats.familyCount} product families`);
      }, 800);
    } else {
      const errEl = document.getElementById('upload-error');
      const errMsg= document.getElementById('upload-error-msg');
      errEl.style.display = '';
      errMsg.textContent  = result.error;
      document.getElementById('modal-footer').style.display = '';
      document.getElementById('process-btn').disabled = false;
      document.getElementById('process-btn').textContent = 'Retry';
    }
  },

  closeUploadModal() {
    const el = document.getElementById('upload-modal-overlay');
    if (el) el.remove();
  },

  /* ── Record Drawer ───────────────────────────────────────── */
  async openDrawer(record_id) {
    const rec = await App.DB.get('inventory_records', record_id);
    if (!rec) return;

    // Remove existing drawer
    document.getElementById('drawer-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawer-overlay';
    overlay.onclick = () => { overlay.remove(); };

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.onclick = e => e.stopPropagation();

    const invType  = (rec.raw_bad_inventory_type||'unknown').toLowerCase();
    const badgeCls = invType==='damaged'?'badge-danger':invType.includes('expir')?'badge-warning':'badge-muted';

    drawer.innerHTML = `
      <div class="drawer-header">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-lg font-bold">${rec.normalized_product_name || 'Product Detail'}</div>
            <div class="text-sm text-muted mt-4">${rec.normalized_brand||'—'} · ${rec.normalized_category||'—'}</div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('drawer-overlay').remove()">✕</button>
        </div>
        <div class="flex gap-6 mt-10">
          <span class="badge ${badgeCls}">${rec.raw_bad_inventory_type||'unknown'}</span>
          <span class="badge badge-muted">${rec.subcategory||'—'}</span>
          ${rec.normalization_confidence ? `<span class="badge ${App.Fmt.badge_confidence(rec.normalization_confidence)}">${rec.normalization_confidence}</span>` : ''}
        </div>
      </div>
      <div class="drawer-body">

        <div class="drawer-section">
          <div class="drawer-section-title">Inventory Details</div>
          ${drawerField('Quantity',    rec.qty,                    '📦')}
          ${drawerField('MRP',         rec.variant_mrp ? App.Fmt.currencyFull(rec.variant_mrp) : '—', '💰')}
          ${drawerField('Value',        rec.source_value ? App.Fmt.currencyFull(rec.source_value) : '—','💵')}
          ${drawerField('Weight (unit)',rec.weight ? App.Fmt.weight(rec.weight) : '—',  '⚖️')}
          ${drawerField('Total Weight', rec.total_weight ? App.Fmt.weight(rec.total_weight) : '—', '⚖️')}
          ${drawerField('UOM',          rec.normalized_uom || rec.raw_uom || '—', '📏')}
          ${drawerField('Warehouse',    rec.normalized_warehouse || '—', '🏭')}
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">Identification</div>
          ${drawerField('Item ID',    rec.item_id    || '—', '🔑')}
          ${drawerField('UPC',         rec.upc        || '—', '📊')}
          ${drawerField('Variant ID',  rec.variant_id || '—', '🏷️')}
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">Normalized Values</div>
          ${drawerField('Category',   rec.normalized_category    || '—', '')}
          ${drawerField('Subcategory',rec.subcategory             || '—', '')}
          ${drawerField('Brand',      rec.normalized_brand        || '—', '')}
          ${drawerField('Product',    rec.normalized_product_name || '—', '')}
          ${drawerField('Grouping',   rec.grouping_method         || '—', '')}
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">📄 Original Excel Record (RAW)</div>
          ${Object.entries(rec._raw||{}).map(([k,v]) => `
            <div class="raw-record-field">
              <div class="raw-field-key">${k}</div>
              <div class="raw-field-val">${v != null ? v : '<em style="color:var(--text-disabled)">null</em>'}</div>
            </div>`).join('')}
        </div>
      </div>
    `;

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);
  },

  /* ── Toast ───────────────────────────────────────────────── */
  toast(msg, duration = 3500) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:20px;right:20px;background:var(--bg-surface-2);border:1px solid var(--border-strong);color:var(--text-primary);padding:12px 18px;border-radius:var(--r-md);font-size:13px;box-shadow:var(--shadow-lg);z-index:9999;animation:fadeInUp 0.3s ease;max-width:400px;line-height:1.4`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, duration);
  },

  async downloadReconciliation(dataset_id) {
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    const dataset = await App.DB.getDataset(dataset_id);
    const lines = [
      'Reconciliation Report',
      `File: ${dataset.filename}`,
      `Date: ${new Date(dataset.uploadedAt).toLocaleString()}`,
      '',
      'Metric,Source,Processed,Difference',
      `Total Records,${dataset.rowCount},${records.length},${records.length-dataset.rowCount}`,
      `Total Units,${records.reduce((s,r)=>s+(r.qty||0),0)},${records.reduce((s,r)=>s+(r.qty||0),0)},0`,
      `Total Value,${records.reduce((s,r)=>s+(r.source_value||0),0)},${records.reduce((s,r)=>s+(r.source_value||0),0)},0`,
      `Total Weight,${records.reduce((s,r)=>s+(r.total_weight||0),0)},${records.reduce((s,r)=>s+(r.total_weight||0),0)},0`,
    ];
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='reconciliation.csv'; a.click();
    URL.revokeObjectURL(url);
  },
};

function drawerField(label, value, icon) {
  return `<div class="raw-record-field">
    <div class="raw-field-key">${icon} ${label}</div>
    <div class="raw-field-val">${value}</div>
  </div>`;
}

/* ── Global search ───────────────────────────────────────── */
App.GlobalSearch = {
  async search(q) {
    if (!q || !App.State.dataset_id) return [];
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',App.State.dataset_id);
    const ql = q.toLowerCase();
    return records.filter(r =>
      (r.normalized_product_name||'').toLowerCase().includes(ql) ||
      (r.normalized_brand||'').toLowerCase().includes(ql) ||
      (r.normalized_category||'').toLowerCase().includes(ql) ||
      (r.normalized_warehouse||'').toLowerCase().includes(ql) ||
      (r.item_id||'').toString().toLowerCase().includes(ql) ||
      (r.upc||'').toString().toLowerCase().includes(ql)
    ).slice(0,20);
  }
};

/* ── Boot ────────────────────────────────────────────────── */
(async function init() {
  await App.DB.open();

  // Restore active dataset
  const savedId = localStorage.getItem('liq_active_dataset');
  if (savedId) {
    const ds = await App.DB.getDataset(savedId);
    if (ds) App.State.dataset_id = savedId;
  }

  // Auto-load most recent dataset if none active
  if (!App.State.dataset_id) {
    const all = await App.DB.getAllDatasets();
    if (all.length) {
      App.State.dataset_id = all[0].id;
      localStorage.setItem('liq_active_dataset', all[0].id);
    }
  }

  // Listen for hash changes
  window.addEventListener('hashchange', () => App.UI.render());

  // Initial render
  App.UI.updateDatasetDisplay();
  App.UI.render();

  // Render sidebar
  renderSidebar();

  // Setup global search
  setupGlobalSearch();

  console.log('[LiqIQ] Ready. Dataset:', App.State.dataset_id);
})();

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const NAV = [
    { label: 'Main', items: [
      { route:'dashboard', icon:'🏠', label:'Dashboard' },
      { route:'inventory', icon:'📋', label:'Inventory' },
    ]},
    { label: 'Analysis', items: [
      { route:'brands',     icon:'🏷️',  label:'Brands' },
      { route:'warehouses', icon:'🏭',  label:'Warehouses' },
    ]},
    { label: 'Quality', items: [
      { route:'quality',  icon:'⚠️',   label:'Data Quality' },
      { route:'suggestions', icon:'🔀', label:'Merge Review' },
    ]},
    { label: 'Settings', items: [
      { route:'uploads',  icon:'📂',   label:'Uploads' },
    ]},
  ];

  nav.innerHTML = NAV.map(section => `
    <div class="nav-section-label">${section.label}</div>
    ${section.items.map(item => `
      <button class="nav-item ${App.State.route===item.route?'active':''}" 
              data-route="${item.route}"
              onclick="App.Router.go('${item.route}')">
        <span class="nav-icon">${item.icon}</span>
        ${item.label}
      </button>`).join('')}
  `).join('');
}

function setupGlobalSearch() {
  const inp = document.getElementById('global-search');
  const results = document.getElementById('search-results-dropdown');
  if (!inp || !results) return;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getBadgeClass(status) {
    if (!status) return 'badge-muted';
    const s = String(status).toLowerCase();
    if (s === 'damaged') return 'badge-danger';
    if (s.includes('expir')) return 'badge-warning';
    if (s === 'saleable') return 'badge-success';
    return 'badge-muted';
  }

  let timeout;
  inp.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = inp.value.trim();
    if (!q) { results.style.display = 'none'; return; }
    timeout = setTimeout(async () => {
      const hits = await App.GlobalSearch.search(q);
      if (!hits.length) {
        results.style.display = 'block';
        results.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">No matching inventory records found</div>`;
        return;
      }
      results.style.display = 'block';
      results.innerHTML = hits.map(r => {
        const prodName = escapeHtml(r.normalized_product_name || r.name || 'Unmapped Product');
        const brand = escapeHtml(r.normalized_brand || '');
        const cat = escapeHtml(r.normalized_category || '');
        const uom = escapeHtml(r.uom || r.variant_uom_text || '');
        const wh = escapeHtml(r.warehouse_id || r.normalized_warehouse || 'Unknown Warehouse');
        const status = r.bad_inventory_type || r.status || '';

        const metaParts = [];
        if (brand) metaParts.push(brand);
        if (cat) metaParts.push(cat);
        if (uom) metaParts.push(uom);

        return `
          <div class="search-result-card" onclick="App.UI.openDrawer('${r.id}');document.getElementById('global-search').value='';document.getElementById('search-results-dropdown').style.display='none'">
            <div class="search-result-icon">📦</div>
            <div class="search-result-info">
              <div class="search-result-name" title="${prodName}">${prodName}</div>
              ${metaParts.length ? `<div class="search-result-meta">${metaParts.join(' · ')}</div>` : ''}
              <div class="search-result-wh" title="${wh}">${wh}</div>
            </div>
            <div class="search-result-right">
              <div class="search-result-qty-val">
                <span class="search-result-qty">${App.Fmt.number(r.qty || 0)} units</span>
                ${r.source_value ? `<span class="search-result-val">${App.Fmt.currency(r.source_value)}</span>` : ''}
              </div>
              ${status ? `<span class="badge ${getBadgeClass(status)} search-result-status">${escapeHtml(status)}</span>` : ''}
            </div>
          </div>`;
      }).join('');
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!inp.contains(e.target) && !results.contains(e.target)) results.style.display = 'none';
  });
}
