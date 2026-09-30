window.App = window.App || {};
console.log('[ROUTE-DIAG] app.js v3.3 ACTIVE | ' + new Date().toISOString());

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
  scrollPositions: new Map(),
  _isHistoryNavigation: false,
  _currentRouteKey: '',

  getCurrentRouteKey() {
    return window.location.hash || ('#/' + (App.State?.route || 'landing'));
  },

  saveScrollPosition(routeKey) {
    const key = routeKey || this._currentRouteKey || this.getCurrentRouteKey();
    if (!key) return;
    const main = document.getElementById('main-content');
    const top = main ? main.scrollTop : 0;
    const left = main ? main.scrollLeft : 0;
    const winY = window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || 0;
    const winX = window.scrollX || window.pageXOffset || document.documentElement?.scrollLeft || 0;
    this.scrollPositions.set(key, { top, left, winY, winX });
  },

  restoreScroll(main, saved) {
    if (!saved) return;
    const top = saved.top || 0;
    const left = saved.left || 0;
    const winY = saved.winY || 0;
    const winX = saved.winX || 0;

    if (main) {
      const prevBehavior = main.style.scrollBehavior;
      main.style.scrollBehavior = 'auto';
      main.scrollTop = top;
      main.scrollLeft = left;

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (main) {
            main.scrollTop = top;
            main.scrollLeft = left;
            window.requestAnimationFrame(() => {
              if (main) {
                main.scrollTop = top;
                main.scrollLeft = left;
                main.style.scrollBehavior = prevBehavior;
              }
            });
          }
        });
      } else {
        main.style.scrollBehavior = prevBehavior;
      }
    }

    if (winY || winX) {
      window.scrollTo({ left: winX, top: winY, behavior: 'auto' });
    }
  },

  go(page, params = {}) {
    this.saveScrollPosition();
    this._isHistoryNavigation = false;
    const qs = new URLSearchParams(params).toString();
    const targetHash = '#/' + page + (qs ? '?' + qs : '');
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    const fromRoute = App.State?.route || 'unknown';
    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE\n  FROM: ${fromRoute}\n  TO: ${page}\n  REASON: Router.go\n  CALLER/FUNCTION: ${caller}\n  AUTH_USER: ${App.Auth?.currentUser?.email || 'null'}`);
    console.log(`[ROUTE-DIAG] ROUTER_GO_${page.toUpperCase()} | ROUTE_BEFORE=${fromRoute} | HASH_BEFORE=${window.location.hash} | targetHash=${targetHash} | caller=${caller}`);

    if (window.location.hash === targetHash) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE (same hash, re-rendering): "${targetHash}"`);
      console.log(`[ROUTE-DIAG] HASH_SAME: "${targetHash}" (re-rendering directly)`);
      App.UI.render();
    } else {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE (setting hash): "${targetHash}"`);
      console.log(`[ROUTE-DIAG] HASH_BEFORE: ${window.location.hash} -> setting to: ${targetHash}`);
      window.location.hash = targetHash;
      console.log(`[ROUTE-DIAG] HASH_AFTER: ${window.location.hash}`);
    }
  },

  back() {
    this.saveScrollPosition();
    this._isHistoryNavigation = true;
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
    console.log(`[ROUTE-DIAG] ROUTE_BEFORE: "${prevRoute}" | ROUTE_AFTER: "${App.State.route}" | HASH: "${window.location.hash}" | isAuthenticated=${App.Auth?.isAuthenticated}`);

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

    const isHistoryNav = App.Router._isHistoryNavigation;
    const incomingRouteKey = window.location.hash || ('#/' + (App.State?.route || 'landing'));

    // Save previous route scroll position if we are navigating away
    if (App.Router._currentRouteKey && App.Router._currentRouteKey !== incomingRouteKey) {
      App.Router.saveScrollPosition(App.Router._currentRouteKey);
    }

    const savedPos = isHistoryNav ? (App.Router.scrollPositions.get(incomingRouteKey) || null) : null;
    App.Router._currentRouteKey = incomingRouteKey;
    App.Router._isHistoryNavigation = false;

    App.Router.parse();
    const { route, params } = App.State;
    const dataset_id = App.State.dataset_id;
    const main = document.getElementById('main-content');
    if (!main) return;

    // Attach passive scroll listeners to main and window if not already attached
    if (!main._scrollListenerAttached) {
      main._scrollListenerAttached = true;
      main.addEventListener('scroll', () => {
        if (App.Router._currentRouteKey) {
          App.Router.saveScrollPosition(App.Router._currentRouteKey);
        }
      }, { passive: true });
    }
    if (!window._scrollListenerAttached) {
      window._scrollListenerAttached = true;
      window.addEventListener('scroll', () => {
        if (App.Router._currentRouteKey) {
          App.Router.saveScrollPosition(App.Router._currentRouteKey);
        }
      }, { passive: true });
    }

    const isAuthenticated = !!(App.Auth && App.Auth.isAuthenticated);

    console.log(`[EDGE-LOOP] ${_appTs()} RENDER #${renderNum} START: route="${route}" hash="${window.location.hash}" dataset_id=${dataset_id}`);
    console.log(`[ROUTE-DIAG] RENDER_START #${renderNum} | route="${route}" | HASH="${window.location.hash}" | isAuthenticated=${isAuthenticated}`);

    // ── FIREBASE AUTHENTICATION ROUTE GUARD ──────────────────
    const PUBLIC_ROUTES = ['landing', 'home', 'login', 'signup', 'forgot-password'];
    const AUTH_PAGES = ['login', 'signup', 'forgot-password'];

    console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_GUARD_START: route="${route}" isInitialized=${App.Auth?.isInitialized} isAuthenticated=${isAuthenticated}`);

    // 1. If Auth service is initializing, render clean loading state (NEVER redirect while pending)
    if (window.App.Auth && !App.Auth.isInitialized) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_GUARD_DECISION: WAITING (auth initializing)`);
      main.innerHTML = `
        <div class="flex flex-col items-center justify-center" style="height:70vh">
          <div class="spinner mb-16" style="width:36px;height:36px"></div>
          <div class="text-muted font-medium text-sm">Authenticating DataSheet IQ...</div>
        </div>`;
      return;
    }

    // 2. Guard: Authenticated user attempting to visit Login, Signup, or Forgot Password
    if (isAuthenticated && AUTH_PAGES.includes(route)) {
      console.log(`[EDGE-LOOP] ${_appTs()} ROUTE_CHANGE\n  FROM: ${route}\n  TO: dashboard\n  REASON: authenticated user visiting auth page\n  CALLER/FUNCTION: App.UI.render()\n  AUTH_USER: ${App.Auth?.currentUser?.email || 'null'}`);
      console.log(`[ROUTE-DIAG] ROUTER_GO_DASHBOARD (auth guard: authenticated user visiting ${route}) | HASH_BEFORE=${window.location.hash}`);
      App.Router.go('dashboard');
      return;
    }

    // 3. Guard: Unauthenticated user attempting to access a protected route
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(route)) {
      console.log(`[ROUTE-DIAG] ROUTER_GO_LOGIN (auth guard: unauthenticated on protected route ${route}) | HASH_BEFORE=${window.location.hash}`);
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
    if (!savedPos) {
      main.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-route="${route}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update breadcrumb
    App.UI.updateBreadcrumb(route, params);

    // Route dispatch
    console.log(`[AUTH-FLOW] ${_appTs()} ROUTE DISPATCH: "${route}" (render #${renderNum})`);
    console.log(`[ROUTE-DIAG] ROUTE_DISPATCH: "${route}" (render #${renderNum}) | HASH=${window.location.hash}`);

    // Analytics: track page_view only when route/page identity actually changes (deduplicated)
    try {
      const pageKey = route + (params && Object.keys(params).length ? '?' + Object.keys(params).sort().join('&') : '');
      if (App.UI._lastTrackedPageKey !== pageKey) {
        App.UI._lastTrackedPageKey = pageKey;
        if (App.Analytics && typeof App.Analytics.track === 'function') {
          App.Analytics.track('page_view', { page: route, is_authenticated: isAuthenticated });
        }
      }
    } catch (_) { /* analytics must never crash app */ }

    switch (route) {
      case 'landing':
      case 'home':            await App.Views.Landing.render(main); break;
      case 'login':           await App.Views.Login.render(main); break;
      case 'signup':          await App.Views.Signup.render(main); break;
      case 'forgot-password': await App.Views.ForgotPassword.render(main); break;
      case 'dashboard':
        await App.Views.Dashboard.render(main, dataset_id);
        if (App.UI._pendingDashboardReached) {
          App.UI._pendingDashboardReached = false;
          try {
            if (App.Analytics && typeof App.Analytics.track === 'function') {
              App.Analytics.track('dashboard_reached', { dataset_loaded: true });
            }
          } catch (_) {}
        }
        break;
      case 'category':        await App.Views.CategoryDetail.render(main, params, dataset_id); break;
      case 'brand':           await App.Views.BrandDetail.render(main, params, dataset_id); break;
      case 'brands':          await App.Views.AllBrands.render(main, params, dataset_id); break;
      case 'warehouses':
      case 'warehouse':       await App.Views.WarehouseView.render(main, params, dataset_id); break;
      case 'quality':         await App.Views.DataQuality.render(main, params, dataset_id); break;
      case 'uploads':         await App.Views.UploadsHistory.render(main); break;
      case 'inventory':       await App.Views.InventoryTable.render(main, params, dataset_id); break;
      case 'suggestions':     await App.Views.DataQuality.render(main, params, dataset_id); break;
      case 'clean-excel':    await App.Views.ExcelCleaner.render(main); break;
      case 'about':           await App.Views.About.render(main); break;
      default:                
        if (isAuthenticated) {
          await App.Views.Dashboard.render(main, dataset_id);
          if (App.UI._pendingDashboardReached) {
            App.UI._pendingDashboardReached = false;
            try {
              if (App.Analytics && typeof App.Analytics.track === 'function') {
                App.Analytics.track('dashboard_reached', { dataset_loaded: true });
              }
            } catch (_) {}
          }
        } else {
          await App.Views.Login.render(main);
        }
    }

    if (savedPos) {
      App.Router.restoreScroll(main, savedPos);
    }

    console.log(`[AUTH-FLOW] ${_appTs()} RENDER #${renderNum} COMPLETE, final route="${App.State.route}", hash="${window.location.hash}"`);
    console.log(`[ROUTE-DIAG] FINAL_URL: ${window.location.href} | ROUTE_AFTER="${App.State.route}" | HASH_AFTER="${window.location.hash}" | isAuthenticated=${isAuthenticated}`);
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
      if (params.subcat) {
        crumbs.push({ label: decodeURIComponent(params.name), route: 'category', routeParams: { name: params.name } });
        crumbs.push({ label: decodeURIComponent(params.subcat), active: true });
      } else {
        crumbs.push({ label: decodeURIComponent(params.name), active: true });
      }
    } else if (route === 'brand' && params.id) {
      if (params.cat) {
        crumbs.push({ label: decodeURIComponent(params.cat), route: 'category', routeParams: { name: params.cat } });
        if (params.subcat) {
          crumbs.push({
            label: decodeURIComponent(params.subcat),
            route: 'category',
            routeParams: { name: params.cat, subcat: params.subcat }
          });
        }
      } else {
        crumbs.push({ label: 'All Brands', route: 'brands' });
      }
      crumbs.push({ label: decodeURIComponent(params.id), active: true });
    } else if (route !== 'dashboard') {
      crumbs.push({ label: route.charAt(0).toUpperCase()+route.slice(1), active: true });
    }

    bc.innerHTML = crumbs.map((c,i) => {
      if (c.active) return `<span class="breadcrumb-item active">${c.label}</span>`;
      return `<span class="breadcrumb-item" onclick="App.Router.go('${c.route}',${JSON.stringify(c.routeParams||{})})">${c.label}</span>${i<crumbs.length-1?'<span class="breadcrumb-sep">/</span>':''}`;
    }).join('');
  },

  /* Load a dataset as active */
  async loadDataset(id) {
    App.State.dataset_id = id;
    localStorage.setItem('liq_active_dataset', id);
    App.UI.updateDatasetDisplay();
    App.Router.go('dashboard');
    App.UI.toast('Dataset loaded successfully');
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
          <button class="modal-close" onclick="document.getElementById('confirm-modal-overlay').remove()" aria-label="Close">&times;</button>
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
      title: 'Delete Dataset',
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
          App.UI.toast('Dataset deleted ');
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
    const filename = `${(dataset.filename || 'inventory_export').replace(/\.[^/.]+$/, '')}_category_summary`;
    if (format === 'xlsx') {
      App.Exporter.exportCategorySummaryXLSX(filename, records);
      App.UI.toast(`Exported Category Summary XLSX — ${records.length} records`);
    } else {
      App.Exporter.exportToCSV(filename, records);
      App.UI.toast(`Exported ${records.length} records to CSV`);
    }
  },

  /* ── Upload Modal ────────────────────────────────────────── */
  showUploadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'upload-modal-overlay';
    overlay.innerHTML = `
      <div class="modal" id="upload-modal" style="max-width:560px">
        <div class="modal-header">
          <div class="modal-title flex items-center gap-8"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Inventory Spreadsheet</div>
          <button class="modal-close" onclick="App.UI.closeUploadModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="drop-zone" id="drop-zone">
            <div class="drop-zone-icon" style="display:flex;justify-content:center;align-items:center;margin-bottom:12px"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#6366f1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="10 13 12 11 14 13"></polyline><line x1="12" y1="11" x2="12" y2="17"></line></svg></div>
            <div class="drop-zone-title">Drag & Drop your Excel or CSV file here</div>
            <div class="drop-zone-sub">or click to browse &mdash; supports .xlsx, .xls, .csv (up to 100 MB)</div>
            <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none">
          </div>

          <div id="file-info" style="display:none" class="mt-16 card" style="background:var(--bg-surface-2);padding:12px 16px">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-10">
                <span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span>
                <div>
                  <div class="font-semibold text-sm" id="file-name"></div>
                  <div class="text-xs text-muted" id="file-size"></div>
                </div>
              </div>
              <span class="badge badge-success" id="file-status-badge">Validated</span>
            </div>
            <div id="sheet-preview-list" style="font-size:12px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:8px;margin-top:8px;display:none">
              <strong>Detected Worksheets:</strong> <span id="sheet-preview-names"></span>
            </div>
          </div>

          <div id="pipeline-stages-wrap" style="display:none" class="mt-16">
            <div class="flex justify-between items-center mb-8">
              <div class="text-xs font-semibold text-muted" id="pipeline-current-action">Processing pipeline...</div>
              <div class="text-xs font-bold text-primary" id="pipeline-progress-pct">0%</div>
            </div>
            <div style="width:100%;height:6px;background:var(--bg-surface-2);border-radius:3px;overflow:hidden;margin-bottom:14px">
              <div id="pipeline-progress-bar" style="width:0%;height:100%;background:linear-gradient(90deg, #6366f1, #10b981);transition:width 0.3s ease"></div>
            </div>
            <div class="pipeline-stages" id="pipeline-stages">
              ${App.Pipeline.STAGES.map(s => `
                <div class="pipeline-stage pending" id="stage-${s.id}">
                  <div class="stage-icon" id="stage-icon-${s.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg></div>
                  <div class="stage-name">${s.label}</div>
                  <div class="stage-status" id="stage-status-${s.id}"></div>
                </div>`).join('')}
            </div>
          </div>

          <div id="upload-error" class="mt-12" style="display:none">
            <div class="card" style="background:#ef444415;border:1px solid #ef444455;color:#ef4444;font-size:13px;padding:12px;white-space:pre-wrap;line-height:1.4" id="upload-error-msg"></div>
          </div>

          <div class="mt-16 flex items-center gap-8" style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:10px">
            <span style="display:inline-flex;align-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>
            <span><strong>Technical Privacy Standard:</strong> Client-Side Execution. File data is processed solely in local browser memory and IndexedDB with zero remote transmission.</span>
          </div>
        </div>
        <div class="modal-footer" id="modal-footer">
          <button class="btn btn-ghost" onclick="App.UI.closeUploadModal()">Cancel</button>
          <button class="btn btn-primary" id="process-btn" onclick="App.UI.processFile()" disabled>
            Process Spreadsheet
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

  async _setFile(file) {
    App.UI._pendingFile = file;
    const validation = App.Validator.validateFile(file);
    const errEl  = document.getElementById('upload-error');
    const errMsg = document.getElementById('upload-error-msg');
    const btn    = document.getElementById('process-btn');
    const info   = document.getElementById('file-info');
    const fname  = document.getElementById('file-name');
    const fsize  = document.getElementById('file-size');
    const sheetListEl = document.getElementById('sheet-preview-list');
    const sheetNamesEl = document.getElementById('sheet-preview-names');

    // Analytics: file_selected
    try {
      if (App.Analytics && typeof App.Analytics.track === 'function') {
        App.Analytics.track('file_selected', {
          file_extension: file.name.split('.').pop().toLowerCase(),
          file_size_mb: +(file.size / 1024 / 1024).toFixed(2),
          is_valid: validation.ok,
        });
      }
    } catch (_) { /* analytics must never crash app */ }

    if (!validation.ok) {
      errEl.style.display = ''; errMsg.textContent = validation.errors.join('\n');
      btn.disabled = true; return;
    }
    errEl.style.display = 'none';
    info.style.display  = '';
    fname.textContent   = file.name;
    fsize.textContent   = `${(file.size/1024/1024).toFixed(2)} MB`;
    btn.disabled        = false;

    // Optional lightweight sheet inspection
    if (typeof XLSX !== 'undefined' && file.name.endsWith('.xlsx')) {
      try {
        const slice = file.slice(0, Math.min(file.size, 1024 * 1024 * 5));
        const buf = await slice.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', bookSheets: true });
        if (wb && wb.SheetNames && wb.SheetNames.length) {
          sheetListEl.style.display = 'block';
          sheetNamesEl.textContent = wb.SheetNames.join(', ');
        }
      } catch (e) {
        // Non-blocking preview failure
      }
    }
  },

  async processFile() {
    const file = App.UI._pendingFile;
    if (!file) return;

    const _processStartTime = Date.now();

    document.getElementById('process-btn').disabled = true;
    document.getElementById('process-btn').innerHTML = '<div class="spinner" style="width:16px;height:16px"></div> Processing...';
    document.getElementById('pipeline-stages-wrap').style.display = '';
    document.getElementById('modal-footer').style.display = 'none';

    const stageIds = App.Pipeline.STAGES.map(s => s.id);
    let completedStages = 0;

    const result = await App.Pipeline.run(file, (stageId, status, msg) => {
      const stageEl   = document.getElementById(`stage-${stageId}`);
      const iconEl    = document.getElementById(`stage-icon-${stageId}`);
      const statusEl  = document.getElementById(`stage-status-${stageId}`);
      const pctEl     = document.getElementById(`pipeline-progress-pct`);
      const barEl     = document.getElementById(`pipeline-progress-bar`);
      const actEl     = document.getElementById(`pipeline-current-action`);

      if (!stageEl) return;

      stageEl.className = `pipeline-stage ${status}`;
      if (status === 'active') {
        iconEl.innerHTML = '<div class="spinner" style="width:16px;height:16px"></div>';
        if (actEl) actEl.textContent = msg || `Running stage: ${stageId}`;
      }
      if (status === 'done') {
        iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        completedStages++;
        const pct = Math.min(Math.round((completedStages / stageIds.length) * 100), 100);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (barEl) barEl.style.width = `${pct}%`;
      }
      if (status === 'error') {
        iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      }
      if (statusEl) statusEl.textContent = msg || '';
    });

    if (result.ok) {
      // Ingestion succeeded: prepare dashboard_reached for when dashboard renders with dataset
      App.UI._pendingDashboardReached = true;

      // Analytics: processing_success
      try {
        if (App.Analytics && typeof App.Analytics.track === 'function') {
          App.Analytics.track('processing_success', {
            row_count: result.stats?.rowCount || 0,
            brand_count: result.stats?.brandCount || 0,
            family_count: result.stats?.familyCount || 0,
            processing_duration_ms: Date.now() - _processStartTime,
          });
        }
      } catch (_) { /* analytics must never crash app */ }

      App.UI._pendingFile = null;
      const pctEl = document.getElementById(`pipeline-progress-pct`);
      const barEl = document.getElementById(`pipeline-progress-bar`);
      if (pctEl) pctEl.textContent = '100%';
      if (barEl) barEl.style.width = '100%';

      setTimeout(async () => {
        App.UI.closeUploadModal();
        await App.UI.loadDataset(result.dataset_id);
        App.UI.toast(`✓ "${file.name}" processed: ${App.Fmt.number(result.stats.rowCount)} records, ${result.stats.brandCount} brands, ${result.stats.familyCount} product families`);
      }, 700);
    } else {
      // Analytics: processing_failed (sanitized category only, no column names or raw data)
      try {
        if (App.Analytics && typeof App.Analytics.track === 'function') {
          const category = (App.Analytics.categorizeError && App.Analytics.categorizeError(result.error)) || 'PROCESSING_ERROR';
          App.Analytics.track('processing_failed', { error_category: category });
        }
      } catch (_) { /* analytics must never crash app */ }

      const errEl = document.getElementById('upload-error');
      const errMsg= document.getElementById('upload-error-msg');
      errEl.style.display = '';
      errMsg.textContent  = result.error;
      document.getElementById('modal-footer').style.display = '';
      document.getElementById('process-btn').disabled = false;
      document.getElementById('process-btn').textContent = 'Retry Upload';
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

    // Analytics: meaningful_action (inspect record)
    try { App.Analytics && App.Analytics.track('meaningful_action', { action: 'inspect_record' }); } catch (_) {}

    // Remove existing drawer
    document.getElementById('drawer-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawer-overlay';
    overlay.onclick = () => { overlay.remove(); };

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.onclick = e => e.stopPropagation();

    const rawSt    = rec.status || rec.resolved_status || (typeof App.InventoryStatusResolver !== 'undefined' ? App.InventoryStatusResolver.resolveRecordStatus(rec) : 'unknown');
    const displayStatus = (rawSt === 'sellable' || rawSt === 'saleable') ? 'Sellable' : ((rawSt === 'non_sellable' || rawSt === 'non-sellable') ? 'Non-Sellable' : (rawSt === 'unknown' ? 'Unknown' : (rawSt.charAt(0).toUpperCase() + rawSt.slice(1))));
    const badgeCls = (rawSt === 'sellable' || rawSt === 'saleable') ? 'badge-success' : ((rawSt === 'non_sellable' || rawSt === 'non-sellable' || rawSt === 'damaged') ? 'badge-danger': rawSt.includes('expir') ? 'badge-warning' : 'badge-muted');

    const unitValue = (rec.source_value != null && rec.qty && rec.qty > 1)
      ? (rec.source_value / rec.qty)
      : (rec.source_value != null ? rec.source_value : (rec.variant_mrp != null ? rec.variant_mrp : null));

    const massSource = (rec.total_weight > 0 || rec.weight > 0)
      ? (rec.source_total_weight_kg > 0
          ? 'Source Total Weight column'
          : (rec.weight_source && rec.weight_source.startsWith('source_unit')
              ? 'Source Unit Weight column'
              : 'Package-derived mass'))
      : null;

    drawer.innerHTML = `
      <div class="drawer-header">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-lg font-bold">${rec.normalized_product_name || 'Product Detail'}</div>
            <div class="text-sm text-muted mt-4">${rec.normalized_brand||'—'} &bull; ${rec.normalized_category||'—'}</div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('drawer-overlay').remove()" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="flex gap-6 mt-10">
          <span class="badge ${badgeCls}">${displayStatus}</span>
          <span class="badge badge-muted">${rec.subcategory||'—'}</span>
          ${rec.normalization_confidence ? `<span class="badge ${App.Fmt.badge_confidence(rec.normalization_confidence)}">${rec.normalization_confidence}</span>` : ''}
        </div>
      </div>
      <div class="drawer-body">

        <div class="drawer-section">
          <div class="drawer-section-title">Inventory Details</div>
          ${drawerField('Quantity',    1,                          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>')}
          ${drawerField('MRP',         rec.variant_mrp ? App.Fmt.currencyFull(rec.variant_mrp) : '&mdash;', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>')}
          ${drawerField('Value',       unitValue != null ? App.Fmt.currencyFull(unitValue) : '&mdash;', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>')}
          ${drawerField('Unit Mass',   rec.weight ? App.Fmt.mass(rec.weight) : '&mdash;',  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>')}
          ${drawerField('Unit Volume', rec.unit_volume_l ? App.Fmt.volume(rec.unit_volume_l) : '&mdash;', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8M12 2v6M5 8h14l-2 13H7L5 8z"/></svg>')}
          ${massSource ? drawerField('Mass Source', massSource, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>') : ''}
          ${(rec.unit_volume_l > 0 || rec.total_volume_l > 0) ? drawerField('Volume Source', 'Variant UOM declaration', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8M12 2v6M5 8h14l-2 13H7L5 8z"/></svg>') : ''}
          ${((rec.weight > 0 || rec.total_weight > 0) && (rec.unit_volume_l > 0 || rec.total_volume_l > 0)) ? drawerField('Measurement Note', 'Dual physical tracking (Zero density conversion)', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>') : ''}
          ${drawerField('UOM',          rec.normalized_uom || rec.raw_uom || '&mdash;', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>')}
          ${drawerField('Warehouse',    rec.normalized_warehouse || '&mdash;', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M4 7l8-4 8 4"/><line x1="10" y1="12" x2="14" y2="12"/></svg>')}
          ${drawerField('Status', displayStatus, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>')}
          ${rec.resolution_source ? drawerField('Resolution Source', rec.resolution_source, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>') : ''}
          ${rec.resolution_rule ? drawerField('Resolution Rule', rec.resolution_rule, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>') : ''}
          ${rec.raw_bad_inventory_type && rec.raw_bad_inventory_type !== 'unknown' ? drawerField('Condition / Bad Bucket', rec.raw_bad_inventory_type, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>') : ''}
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">Identification</div>
          ${drawerField('Item ID',    rec.item_id    || '—', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3M18.5 4.5l2 2"/></svg>')}
          ${drawerField('UPC',         rec.upc        || '—', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/></svg>')}
          ${drawerField('Variant ID',  rec.variant_id || '—', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>')}
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
          <div class="drawer-section-title flex items-center gap-6"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Original Excel Record (RAW)</div>
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
    // Analytics: meaningful_action (download reconciliation)
    try { App.Analytics && App.Analytics.track('meaningful_action', { action: 'download_reconciliation' }); } catch (_) {}

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
    const isGoogle = user.providerId === 'google.com' || (user.providerData && user.providerData.some(p => p.providerId === 'google.com'));

    container.innerHTML = `
      <button type="button" class="user-profile-badge" id="user-profile-toggle" onclick="App.UI.toggleUserDropdown(event)" aria-haspopup="menu" aria-expanded="false" aria-controls="user-dropdown-menu" title="User Profile: ${name}">
        <div class="user-avatar-circle">
          ${photoURL ? `<img src="${photoURL}" alt="${name}" class="user-avatar-img" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span style="display:none">${initial}</span>` : `<span>${initial}</span>`}
        </div>
        <span class="user-header-name">${name}</span>
        <svg class="user-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="user-dropdown-menu" id="user-dropdown-menu" role="menu" aria-label="User Account Menu">
        <div class="user-dropdown-identity">
          <div class="user-dropdown-avatar">
            ${photoURL ? `<img src="${photoURL}" alt="${name}" class="user-dropdown-avatar-img" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="user-dropdown-avatar-fallback" style="display:none">${initial}</span>` : `<span class="user-dropdown-avatar-fallback">${initial}</span>`}
          </div>
          <div class="user-dropdown-details">
            <div class="user-dropdown-name" title="${name}">${name}</div>
            <div class="user-dropdown-email" title="${email}">${email}</div>
          </div>
        </div>

        <div class="user-dropdown-provider-row">
          ${isGoogle ? `
            <svg class="google-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Signed in with Google</span>
          ` : `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>Signed in with Email</span>
          `}
        </div>

        <div class="user-dropdown-divider" role="separator"></div>

        <button type="button" class="user-signout-btn" onclick="App.UI.handleSignOut()" role="menuitem" aria-label="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    `;
  },

  toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('user-dropdown-menu');
    const toggle = document.getElementById('user-profile-toggle');
    if (menu) {
      const isActive = menu.classList.toggle('active');
      if (toggle) {
        toggle.classList.toggle('active', isActive);
        toggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      }
    }
  },

  async handleSignOut() {
    try {
      console.log(`[AUTH-FLOW] ${_appTs()} HANDLE SIGN-OUT START`);
      if (App.Auth) {
        await App.Auth.signOut();
      }
      console.log(`[AUTH-FLOW] ${_appTs()} HANDLE SIGN-OUT COMPLETE, navigating to login`);
      App.UI.toast('Signed out successfully ');
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
        if (toggle) {
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dropdown = document.getElementById('user-dropdown-menu');
      const toggle = document.getElementById('user-profile-toggle');
      if (dropdown && dropdown.classList.contains('active')) {
        dropdown.classList.remove('active');
        if (toggle) {
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      }
    }
  });

  // Listen for browser back / forward navigation (popstate)
  window.addEventListener('popstate', () => {
    console.log(`[EDGE-LOOP] ${_appTs()} POPSTATE EVENT: hash="${window.location.hash}"`);
    App.Router._isHistoryNavigation = true;
  });

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    console.log(`[EDGE-LOOP] ${_appTs()} HASHCHANGE EVENT: new hash="${window.location.hash}", isAuthenticated=${App.Auth?.isAuthenticated}`);
    console.log(`[ROUTE-DIAG] HASHCHANGE: new hash="${window.location.hash}" | isAuthenticated=${App.Auth?.isAuthenticated} | route=${App.State?.route}`);
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
      { 
        route: 'dashboard', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>', 
        label: 'Dashboard' 
      },
      { 
        route: 'inventory', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>', 
        label: 'Inventory' 
      },
    ]},
    { label: 'Analysis', items: [
      { 
        route: 'brands', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>', 
        label: 'Brands' 
      },
      { 
        route: 'warehouses', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M3 7v14"></path><path d="M21 7v14"></path><path d="M4 7l8-4 8 4"></path><line x1="10" y1="12" x2="14" y2="12"></line></svg>', 
        label: 'Warehouses' 
      },
    ]},
    { label: 'Quality', items: [
      { 
        route: 'quality', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>', 
        label: 'Data Quality' 
      },
    ]},
    { label: 'Tools', items: [
      { 
        route: 'clean-excel', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>', 
        label: 'Excel Cleaner' 
      },
    ]},
    { label: 'Settings', items: [
      { 
        route: 'uploads', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>', 
        label: 'Uploads' 
      },
      { 
        route: 'about', 
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>', 
        label: 'About' 
      },
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
        const rawSt = r.status || r.resolved_status || (typeof App.InventoryStatusResolver !== 'undefined' ? App.InventoryStatusResolver.resolveRecordStatus(r) : '');
        const status = (rawSt === 'sellable' || rawSt === 'saleable') ? 'Sellable' : ((rawSt === 'non_sellable' || rawSt === 'non-sellable') ? 'Non-Sellable' : (rawSt === 'unknown' ? 'Unknown' : rawSt));

        const metaParts = [];
        if (brand) metaParts.push(brand);
        if (cat) metaParts.push(cat);
        if (uom) metaParts.push(uom);

        return `
          <div class="search-result-card" onclick="App.UI.openDrawer('${r.id}');document.getElementById('global-search').value='';document.getElementById('search-results-dropdown').style.display='none'">
            <div class="search-result-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>
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
