window.App = window.App || {};

/* ============================================================
   MAIN APP — Router + State + UI helpers
   ============================================================ */

// Global timestamp baseline and Boot ID
const _appT0 = performance.now();
const BOOT_ID = 'boot_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
function _appTs() { return (performance.now() - _appT0).toFixed(1) + 'ms'; }

console.log(`[EDGE-LOOP] ${_appTs()} APP_START (BOOT_ID = ${BOOT_ID})`);

// Global error handlers for JS exceptions and unhandled promise rejections
window.onerror = function(msg, source, line, col, error) {
  console.error(`[EDGE-LOOP] ${_appTs()} JS_ERROR: msg="${msg}" at ${source}:${line}:${col}`, error);
};
window.addEventListener('unhandledrejection', function(event) {
  console.error(`[EDGE-LOOP] ${_appTs()} UNHANDLED_PROMISE: reason="${event.reason}"`, event.reason);
});

// Detect page lifecycle and reload events
window.addEventListener('DOMContentLoaded', function() {
  console.log(`[EDGE-LOOP] ${_appTs()} DOMContentLoaded (BOOT_ID = ${BOOT_ID})`);
});
window.addEventListener('load', function() {
  console.log(`[EDGE-LOOP] ${_appTs()} WINDOW_LOAD (BOOT_ID = ${BOOT_ID})`);
});
window.addEventListener('beforeunload', function() {
  console.log(`[EDGE-LOOP] ${_appTs()} PAGE_RELOAD / beforeunload (BOOT_ID = ${BOOT_ID})`);
});

// Monkey-patch history pushState and replaceState to catch all programmatic navigations
(function instrumentHistory() {
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function(state, title, url) {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`[EDGE-LOOP] ${_appTs()} NAVIGATION (history.pushState) FROM="${window.location.hash}" TO="${url}" CALLER="${caller}" AUTH_USER="${App.Auth?.currentUser?.email || 'null'}"`);
    return origPush.apply(this, arguments);
  };
  history.replaceState = function(state, title, url) {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`[EDGE-LOOP] ${_appTs()} NAVIGATION (history.replaceState) FROM="${window.location.hash}" TO="${url}" CALLER="${caller}" AUTH_USER="${App.Auth?.currentUser?.email || 'null'}"`);
    return origReplace.apply(this, arguments);
  };
})();

App.State = {
  dataset_id: null,
  route: 'dashboard',
  params: {},
};

/* ── Router ──────────────────────────────────────────────── */
App.Router = {
  historyStack: [],

  go(page, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const targetHash = '#/' + page + (qs ? '?' + qs : '');
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    const fromRoute = App.State?.route || 'unknown';
    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE\n  FROM: ${fromRoute}\n  TO: ${page}\n  REASON: Router.go\n  CALLER/FUNCTION: ${caller}\n  AUTH_USER: ${App.Auth?.currentUser?.email || 'null'}`);

    if (window.location.hash === targetHash) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE (same hash, re-rendering): "${targetHash}"`);
      App.UI.render();
    } else {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE (setting hash): "${targetHash}"`);
      window.location.hash = targetHash;
    }
  },

  back() {
    if (this.historyStack.length > 1) {
      window.history.back();
    } else {
      this.go('dashboard');
    }
  },

  parse() {
    const rawHash = window.location.hash.slice(2) || 'landing';
    const [page, qs] = rawHash.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs));
    const prevRoute = App.State.route;
    App.State.route  = page || 'landing';
    App.State.params = params;
    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHECK: prev="${prevRoute}" current="${App.State.route}" hash="${window.location.hash}" isAuthenticated=${App.Auth?.isAuthenticated}`);

    const currentHash = rawHash;
    const stack = this.historyStack;

    if (stack.length === 0) {
      stack.push(currentHash);
    } else if (stack[stack.length - 1] !== currentHash) {
      const prevIdx = stack.lastIndexOf(currentHash);
      if (prevIdx !== -1) {
        this.historyStack = stack.slice(0, prevIdx + 1);
      } else {
        stack.push(currentHash);
      }
    }
  },
};

/* ── UI ──────────────────────────────────────────────────── */
App.UI = {

  toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  },

  closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  },

  /* Render the current route into #main-content */
  _renderCount: 0,
  async render() {
    this._renderCount = (this._renderCount || 0) + 1;
    const renderNum = this._renderCount;
    App.UI.closeMobileMenu();
    App.Router.parse();
    const { route, params } = App.State;
    const dataset_id = App.State.dataset_id;
    const main = document.getElementById('main-content');
    if (!main) return;

    console.log(`[EDGE-LOOP] ${_appTs()} RENDER #${renderNum} START: route="${route}" hash="${window.location.hash}" dataset_id=${dataset_id}`);

    // ── FIREBASE AUTHENTICATION ROUTE GUARD ──────────────────
    const PUBLIC_ROUTES = ['landing', 'home', 'login', 'signup', 'forgot-password'];
    const AUTH_PAGES = ['login', 'signup', 'forgot-password'];

    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_GUARD_START: route="${route}" isInitialized=${App.Auth?.isInitialized} isAuthenticated=${App.Auth?.isAuthenticated}`);

    // 1. If Auth service is initializing, render clean loading state (NEVER redirect while pending)
    if (window.App.Auth && !App.Auth.isInitialized) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_GUARD_DECISION: WAITING (auth initializing)`);
      main.innerHTML = `
        <div class="flex flex-col items-center justify-center" style="height:70vh">
          <div class="spinner mb-16" style="width:36px;height:36px"></div>
          <div class="text-muted font-medium text-sm">Authenticating Liquidation IQ…</div>
        </div>`;
      return;
    }

    const isAuthenticated = App.Auth ? App.Auth.isAuthenticated : false;

    // 2. Guard: Authenticated user attempting to visit Login, Signup, or Forgot Password
    if (isAuthenticated && AUTH_PAGES.includes(route)) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE\n  FROM: ${route}\n  TO: dashboard\n  REASON: authenticated user visiting auth page\n  CALLER/FUNCTION: App.UI.render()\n  AUTH_USER: ${App.Auth?.currentUser?.email || 'null'}`);
      App.Router.go('dashboard');
      return;
    }

    // 3. Guard: Unauthenticated user attempting to access a protected route
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(route)) {
      App.Router.go('login');
      return;
    }

    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_GUARD_DECISION: ALLOW "${route}" (isAuthenticated=${isAuthenticated})`);

    // Toggle Landing / Auth Fullscreen Mode layout on document.body AND html element
    const isFullScreenPage = PUBLIC_ROUTES.includes(route);
    if (isFullScreenPage) {
      document.body.classList.add('is-landing');
      document.documentElement.classList.add('is-landing-html');
    } else {
      document.body.classList.remove('is-landing');
      document.documentElement.classList.remove('is-landing-html');
    }

    // Update Topbar User Header Control
    App.UI.updateUserHeader();

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
    console.log(`[AUTH-FLOW] ${_appTs()} ROUTE DISPATCH: "${route}" (render #${renderNum})`);
    switch (route) {
      case 'landing':
      case 'home':            await App.Views.Landing.render(main); break;
      case 'login':           await App.Views.Login.render(main); break;
      case 'signup':          await App.Views.Signup.render(main); break;
      case 'forgot-password': await App.Views.ForgotPassword.render(main); break;
      case 'dashboard':       await App.Views.Dashboard.render(main, dataset_id); break;
      case 'category':        await App.Views.CategoryDetail.render(main, params, dataset_id); break;
      case 'brand':           await App.Views.BrandDetail.render(main, params, dataset_id); break;
      case 'brands':          await App.Views.AllBrands.render(main, params, dataset_id); break;
      case 'warehouses':
      case 'warehouse':       await App.Views.WarehouseView.render(main, params, dataset_id); break;
      case 'quality':         await App.Views.DataQuality.render(main, params, dataset_id); break;
      case 'uploads':         await App.Views.UploadsHistory.render(main); break;
      case 'inventory':       await App.Views.InventoryTable.render(main, params, dataset_id); break;
      case 'suggestions':     await App.Views.DataQuality.render(main, params, dataset_id); break;
      case 'about':           await App.Views.About.render(main); break;
      default:                
        if (isAuthenticated) {
          await App.Views.Dashboard.render(main, dataset_id);
        } else {
          await App.Views.Login.render(main);
        }
    }
    console.log(`[AUTH-FLOW] ${_appTs()} RENDER #${renderNum} COMPLETE, final route="${App.State.route}", hash="${window.location.hash}"`);
  },

  updateBreadcrumb(route, params) {
    const bc = document.getElementById('breadcrumb');
    const backBtn = document.getElementById('topbar-back-btn');

    if (backBtn) {
      if (route === 'dashboard' || (App.Router.historyStack.length <= 1 && route === 'dashboard')) {
        backBtn.style.display = 'none';
      } else {
        backBtn.style.display = 'inline-flex';
      }
    }

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

  /* Custom Confirmation Modal */
  showConfirmModal({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', danger = true, onConfirm }) {
    document.getElementById('confirm-modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'confirm-modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close" onclick="document.getElementById('confirm-modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body" style="padding:16px 20px">
          <div style="font-size:14px;color:var(--text-primary);line-height:1.5">${message}</div>
        </div>
        <div class="modal-footer" style="padding:12px 20px">
          <button class="btn btn-ghost" onclick="document.getElementById('confirm-modal-overlay').remove()">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-modal-btn">${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirm-modal-btn').onclick = async () => {
      overlay.remove();
      if (onConfirm) await onConfirm();
    };
  },

  /* Delete dataset */
  async deleteDataset(id) {
    const ds = await App.DB.getDataset(id);
    const fname = ds ? ds.filename : 'this dataset';
    App.UI.showConfirmModal({
      title: '🗑️ Delete Dataset',
      message: `Are you sure you want to delete <strong>${fname}</strong>?<br><br><span style="color:var(--text-muted);font-size:12px">This will remove all associated inventory records, brands, categories, and KPI stats. This action cannot be undone.</span>`,
      confirmText: 'Delete Dataset',
      danger: true,
      onConfirm: async () => {
        try {
          await App.DB.deleteDataset(id);
          if (App.State.dataset_id === id) {
            App.State.dataset_id = null;
            localStorage.removeItem('liq_active_dataset');
            const remaining = await App.DB.getAllDatasets();
            if (remaining.length > 0) {
              App.State.dataset_id = remaining[0].id;
              localStorage.setItem('liq_active_dataset', remaining[0].id);
            }
            await App.UI.updateDatasetDisplay();
          }
          await App.UI.render();
          App.UI.toast('Dataset deleted ✅');
        } catch (err) {
          console.error('[Delete Dataset]', err);
          App.UI.toast('Failed to delete dataset: ' + err.message);
        }
      }
    });
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

  /* ── User Header Control (Dashboard Topbar) ───────────── */
  updateUserHeader() {
    const container = document.getElementById('user-header-control');
    if (!container) return;

    if (!window.App.Auth || !App.Auth.isAuthenticated || !App.Auth.currentUser) {
      container.innerHTML = '';
      return;
    }

    const user = App.Auth.currentUser;
    const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
    const photoURL = user.photoURL;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    const email = user.email || 'authenticated_user';
    const providerLabel = user.providerId === 'google.com' ? '🌐 Google' : '🔑 Email';

    container.innerHTML = `
      <div class="user-profile-badge" id="user-profile-toggle" onclick="App.UI.toggleUserDropdown(event)" title="User Profile: ${name}">
        <div class="user-avatar-circle">
          ${photoURL ? `<img src="${photoURL}" alt="${name}" class="user-avatar-img">` : `<span>${initial}</span>`}
        </div>
        <span class="user-header-name">${name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="user-dropdown-menu" id="user-dropdown-menu">
        <div class="user-dropdown-header">
          <div class="user-dropdown-name">${name}</div>
          <div class="user-dropdown-email">${email}</div>
          <span class="user-dropdown-provider">${providerLabel}</span>
        </div>
        <button class="user-signout-btn" onclick="App.UI.handleSignOut()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    `;
  },

  toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('active');
  },

  async handleSignOut() {
    try {
      console.log(`[AUTH-FLOW] ${_appTs()} HANDLE SIGN-OUT START`);
      if (App.Auth) {
        await App.Auth.signOut();
      }
      console.log(`[AUTH-FLOW] ${_appTs()} HANDLE SIGN-OUT COMPLETE, navigating to login`);
      App.UI.toast('Signed out successfully 👋');
      App.Router.go('login');
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_appTs()} HANDLE SIGN-OUT ERROR:`, err);
      App.UI.toast('Sign out failed: ' + err.message);
    }
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
  console.log(`[EDGE-LOOP] ${_appTs()} ========== APP BOOT START ========== (BOOT_ID = ${BOOT_ID})`);
  console.log(`[EDGE-LOOP] ${_appTs()} CURRENT_URL: ${window.location.href}`);
  console.log(`[EDGE-LOOP] ${_appTs()} CURRENT_HASH: ${window.location.hash}`);
  console.log(`[EDGE-LOOP] ${_appTs()} CURRENT_ORIGIN: ${window.location.origin}`);
  console.log(`[EDGE-LOOP] ${_appTs()} CURRENT_HOSTNAME: ${window.location.hostname}`);

  console.log(`[EDGE-LOOP] ${_appTs()} INDEXEDDB_INIT_START`);
  await App.DB.open();
  console.log(`[EDGE-LOOP] ${_appTs()} INDEXEDDB_INIT_COMPLETE`);

  // Initialize Firebase Authentication Service & await first auth state resolution
  if (window.App && window.App.Auth) {
    console.log(`[EDGE-LOOP] ${_appTs()} AUTH_INIT_AWAIT_START`);
    await App.Auth.init();
    console.log(`[EDGE-LOOP] ${_appTs()} AUTH_INIT_AWAIT_COMPLETE: isInitialized=${App.Auth.isInitialized} isAuthenticated=${App.Auth.isAuthenticated} user=${App.Auth.currentUser?.email || 'null'}`);
  } else {
    console.warn(`[EDGE-LOOP] ${_appTs()} App.Auth NOT FOUND, skipping auth init`);
  }

  // Restore active dataset
  console.log(`[EDGE-LOOP] ${_appTs()} DATA_INIT_START`);
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
  console.log(`[EDGE-LOOP] ${_appTs()} DATA_INIT_COMPLETE: dataset_id=${App.State.dataset_id}`);

  // Close dropdown menu on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown-menu');
    const toggle = document.getElementById('user-profile-toggle');
    if (dropdown && dropdown.classList.contains('active')) {
      if (toggle && (toggle.contains(e.target) || toggle === e.target)) return;
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    }
  });

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    console.log(`[EDGE-LOOP] ${_appTs()} HASHCHANGE EVENT: new hash="${window.location.hash}", isAuthenticated=${App.Auth?.isAuthenticated}`);
    App.UI.render();
  });

  // Initial render
  console.log(`[EDGE-LOOP] ${_appTs()} INITIAL_RENDER_START`);
  App.UI.updateDatasetDisplay();
  App.UI.render();

  // Render sidebar
  renderSidebar();

  // Setup global search
  setupGlobalSearch();

  console.log(`[EDGE-LOOP] ${_appTs()} ========== APP BOOT COMPLETE ========== (BOOT_ID = ${BOOT_ID}) Dataset: ${App.State.dataset_id}`);

  // Post-boot auth state monitor: watch for unexpected state changes for 15 seconds
  let _authMonitorCount = 0;
  const _authMonitorUnsub = App.Auth?.onAuthStateChanged?.((authState) => {
    _authMonitorCount++;
    console.log(`[EDGE-LOOP] ${_appTs()} POST_BOOT_AUTH_MONITOR #${_authMonitorCount}: isAuthenticated=${authState.isAuthenticated} user=${authState.currentUser?.email || 'null'}`);
  });
  setTimeout(() => {
    if (_authMonitorUnsub) _authMonitorUnsub();
    console.log(`[EDGE-LOOP] ${_appTs()} POST_BOOT_AUTH_MONITOR ENDED after ${_authMonitorCount} events`);
  }, 15000);
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
      { route:'about',    icon:'ℹ️',   label:'About' },
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
    if (s === 'expired') return 'badge-purple';
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
        const status = r.raw_bad_inventory_type || r.bad_inventory_type || r.status || '';

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
