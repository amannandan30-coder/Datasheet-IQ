window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   DQ AUDIT ENGINE — Shared, cached, single-pass quality audit
   Consumed by both Data Quality page and Dashboard card.
   READ-ONLY: never mutates records or writes to DB.
   ============================================================ */
App.DQAudit = (() => {
  let _cache = { dataset_id: null, result: null };

  const SEV = { INFO: 'info', WARNING: 'warning', CRITICAL: 'critical' };
  const AMP = { info: 0.1, warning: 1.0, critical: 5.0 };
  const DIM_WEIGHTS = { identity: 0.25, classification: 0.20, status: 0.15, measurement: 0.20, financial: 0.20 };

  /* ── Run full audit (single pass) ──────────────────────── */
  function runAudit(dataset_id, records) {
    if (!records || !records.length) return emptyResult();

    const total = records.length;

    // ── Check accumulators ──
    const checks = {
      // Identity
      missing_item_id:    { dim: 'identity', label: 'Missing Item ID',               sev: SEV.WARNING,  ids: [] },
      missing_upc:        { dim: 'identity', label: 'Missing UPC',                   sev: SEV.INFO,     ids: [] },
      invalid_upc:        { dim: 'identity', label: 'Invalid UPC Format',            sev: SEV.WARNING,  ids: [] },
      duplicate_item_id:  { dim: 'identity', label: 'Duplicate Item ID',             sev: SEV.CRITICAL, ids: [] },
      // Classification
      uncategorized:      { dim: 'classification', label: 'Uncategorized',           sev: SEV.WARNING,  ids: [] },
      unknown_brand:      { dim: 'classification', label: 'Unknown Brand',           sev: SEV.WARNING,  ids: [] },
      low_conf_class:     { dim: 'classification', label: 'Low Confidence Classification', sev: SEV.INFO, ids: [] },
      // Status
      status_conflict:    { dim: 'status', label: 'Status Conflict',                 sev: SEV.WARNING,  ids: [] },
      low_conf_status:    { dim: 'status', label: 'Low Confidence Status',           sev: SEV.INFO,     ids: [] },
      // Measurement
      missing_weight:     { dim: 'measurement', label: 'Missing Weight',             sev: SEV.INFO,     ids: [] },
      missing_volume:     { dim: 'measurement', label: 'Missing Volume',             sev: SEV.INFO,     ids: [] },
      negative_weight:    { dim: 'measurement', label: 'Negative Weight',            sev: SEV.CRITICAL, ids: [] },
      negative_volume:    { dim: 'measurement', label: 'Negative Volume',            sev: SEV.CRITICAL, ids: [] },
      zero_quantity:      { dim: 'measurement', label: 'Zero Quantity',              sev: SEV.CRITICAL, ids: [] },
      negative_quantity:  { dim: 'measurement', label: 'Negative Quantity',          sev: SEV.CRITICAL, ids: [] },
      // Financial
      missing_mrp:        { dim: 'financial', label: 'Missing MRP',                  sev: SEV.WARNING,  ids: [] },
      zero_mrp:           { dim: 'financial', label: 'Zero MRP',                     sev: SEV.INFO,     ids: [] },
      missing_value:      { dim: 'financial', label: 'Missing Value',                sev: SEV.WARNING,  ids: [] },
      zero_value:         { dim: 'financial', label: 'Zero Value',                   sev: SEV.INFO,     ids: [] },
      negative_mrp:       { dim: 'financial', label: 'Negative MRP',                 sev: SEV.CRITICAL, ids: [] },
      negative_value:     { dim: 'financial', label: 'Negative Value',               sev: SEV.CRITICAL, ids: [] },
      value_discrepancy:  { dim: 'financial', label: 'Value Discrepancy',            sev: SEV.WARNING,  ids: [] },
    };

    // ── Duplicate detection: build item_id frequency map ──
    const itemIdCounts = new Map();
    for (const r of records) {
      const iid = String(r.item_id ?? '').trim();
      if (iid) itemIdCounts.set(iid, (itemIdCounts.get(iid) || 0) + 1);
    }
    const dupItemIds = new Set();
    for (const [iid, count] of itemIdCounts) {
      if (count > 1) dupItemIds.add(iid);
    }

    // ── Single pass over all records ──
    for (const r of records) {
      const rid = r.id;

      // Identity
      const iid = String(r.item_id ?? '').trim();
      if (!iid) checks.missing_item_id.ids.push(rid);
      else if (dupItemIds.has(iid)) checks.duplicate_item_id.ids.push(rid);

      const upc = String(r.upc ?? '').trim();
      if (!upc) {
        checks.missing_upc.ids.push(rid);
      } else {
        const digits = upc.replace(/\D/g, '');
        if (![8, 12, 13, 14].includes(digits.length)) checks.invalid_upc.ids.push(rid);
      }

      // Classification
      const cat = String(r.normalized_category ?? '').trim();
      if (!cat || cat === 'Other / Uncategorized' || cat === 'Uncategorized') checks.uncategorized.ids.push(rid);

      const brand = String(r.normalized_brand ?? '').trim();
      if (!brand || brand === 'Unknown') checks.unknown_brand.ids.push(rid);

      const subConf = String(r.subcategory_confidence ?? '').toUpperCase();
      if (subConf === 'LOW') checks.low_conf_class.ids.push(rid);

      // Status — use canonical resolved_status fields
      if (r.is_status_conflict === true) checks.status_conflict.ids.push(rid);
      const statusConf = String(r.status_confidence ?? '').toUpperCase();
      if (statusConf === 'LOW') checks.low_conf_status.ids.push(rid);

      // Measurement
      const wt = r.total_weight;
      if (wt == null || wt === 0 || (typeof wt === 'number' && isNaN(wt))) checks.missing_weight.ids.push(rid);
      else if (typeof wt === 'number' && wt < 0) checks.negative_weight.ids.push(rid);

      const vol = r.total_volume_l;
      if (vol == null || vol === 0 || (typeof vol === 'number' && isNaN(vol))) checks.missing_volume.ids.push(rid);
      else if (typeof vol === 'number' && vol < 0) checks.negative_volume.ids.push(rid);

      const qty = r.qty;
      if (typeof qty === 'number' && qty < 0) checks.negative_quantity.ids.push(rid);
      else if (qty === 0 || qty == null) checks.zero_quantity.ids.push(rid);

      // Financial — separate missing (null/undefined/NaN) from zero (explicit 0)
      const mrp = r.variant_mrp;
      if (mrp == null || (typeof mrp === 'number' && isNaN(mrp))) {
        checks.missing_mrp.ids.push(rid);
      } else if (mrp === 0) {
        checks.zero_mrp.ids.push(rid);
      } else if (typeof mrp === 'number' && mrp < 0) {
        checks.negative_mrp.ids.push(rid);
      }

      const val = r.source_value;
      if (val == null || (typeof val === 'number' && isNaN(val))) {
        if ((qty || 0) > 0) checks.missing_value.ids.push(rid);
      } else if (val === 0) {
        if ((qty || 0) > 0) checks.zero_value.ids.push(rid);
      } else if (typeof val === 'number' && val < 0) {
        checks.negative_value.ids.push(rid);
      }

      // Value discrepancy
      if (val && mrp && qty && typeof val === 'number' && typeof mrp === 'number' && typeof qty === 'number') {
        const calculated = mrp * qty;
        const diff = Math.abs(val - calculated);
        const pct = diff / Math.max(val, 1);
        if (pct > 0.05 && diff > 10) checks.value_discrepancy.ids.push(rid);
      }
    }

    // ── Compute dimension scores using sqrt-dampened formula ──
    const dims = {};
    for (const dimKey of Object.keys(DIM_WEIGHTS)) {
      const dimChecks = Object.values(checks).filter(c => c.dim === dimKey);
      let penalty = 0;
      for (const c of dimChecks) {
        if (c.ids.length > 0) {
          penalty += AMP[c.sev] * Math.sqrt(c.ids.length / total);
        }
      }
      penalty = Math.min(1.0, penalty);
      const score = Math.max(0, Math.round((1 - penalty) * 1000) / 10); // one decimal
      const passed = dimChecks.reduce((s, c) => s + (total - c.ids.length), 0);
      const affected = new Set(dimChecks.flatMap(c => c.ids)).size;
      dims[dimKey] = { score, penalty, passed, affected, checks: dimChecks };
    }

    // ── Overall score ──
    let overall = 0;
    for (const [dimKey, w] of Object.entries(DIM_WEIGHTS)) {
      overall += dims[dimKey].score * w;
    }
    overall = Math.round(overall * 10) / 10;

    // ── Severity summary ──
    let criticalCount = 0, warningCount = 0, infoCount = 0;
    const allAffected = new Set();
    for (const c of Object.values(checks)) {
      if (c.ids.length === 0) continue;
      if (c.sev === SEV.CRITICAL)  criticalCount += c.ids.length;
      else if (c.sev === SEV.WARNING) warningCount += c.ids.length;
      else                            infoCount += c.ids.length;
      for (const id of c.ids) allAffected.add(id);
    }

    return {
      dataset_id,
      total,
      overall,
      dims,
      checks,
      severity: { critical: criticalCount, warning: warningCount, info: infoCount },
      totalIssueInstances: criticalCount + warningCount + infoCount,
      totalAffectedRecords: allAffected.size,
    };
  }

  function emptyResult() {
    const dims = {};
    for (const k of Object.keys(DIM_WEIGHTS)) {
      dims[k] = { score: 100, penalty: 0, passed: 0, affected: 0, checks: [] };
    }
    return { dataset_id: null, total: 0, overall: 100, dims, checks: {}, severity: { critical: 0, warning: 0, info: 0 }, totalIssueInstances: 0, totalAffectedRecords: 0 };
  }

  /* ── Public API with caching ──────────────────────────── */
  function getAudit(dataset_id, records) {
    if (_cache.dataset_id === dataset_id && _cache.result) return _cache.result;
    const result = runAudit(dataset_id, records);
    _cache = { dataset_id, result };
    return result;
  }

  function invalidateCache() {
    _cache = { dataset_id: null, result: null };
  }

  return { getAudit, invalidateCache, SEV };
})();


/* ============================================================
   DATA QUALITY VIEW — Full Data Quality Center
   ============================================================ */
App.Views.DataQuality = (() => {

  // ── Shared state for issue filtering ──
  let _audit = null;
  let _records = [];
  let _filteredIssueIds = [];
  let _filterSev = 'all';
  let _filterCheck = 'all';
  let _filterSearch = '';
  let _issuePage = 0;
  const PAGE_SIZE = 50;

  async function render(container, params, dataset_id) {
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <div class="font-bold text-base mb-8">Data Quality</div>
          <div class="text-sm text-muted mb-4">No dataset loaded</div>
          <div class="text-sm text-muted mb-16">Upload an Excel file to run data-quality checks.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Auditing data quality…</span></div>`;

    const dataset = await App.DB.getDataset(dataset_id);
    if (!dataset) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="font-bold text-base mb-8">No Dataset Loaded</div></div>`; return; }

    _records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
    if (!_records.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="font-bold text-base mb-8">No Records Found</div></div>`; return; }

    _audit = App.DQAudit.getAudit(dataset_id, _records);
    _filterSev = 'all'; _filterCheck = 'all'; _filterSearch = ''; _issuePage = 0;

    container.innerHTML = '';

    // ── Page header ──
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Data Quality Center</div>
          <div class="page-sub">${dataset.filename} · ${App.Fmt.number(_audit.total)} records audited · ${App.Fmt.date(Date.now())}</div>
        </div>
      </div>
    `);

    // ── Hero Score + Severity Cards ──
    renderHeroSection(container);

    // ── Five Dimension Cards ──
    renderDimensionCards(container);

    // ── Check Detail List ──
    renderCheckList(container);

    // ── Affected Records Table ──
    renderIssueTable(container);

    // ── Quality Rules Explainer ──
    renderExplainer(container);

    // ── Existing Reconciliation + Excluded Records ──
    const excludedRecords = await App.DB.getAllByIndex('excluded_records', 'dataset_id', dataset_id);
    if (_records.length && dataset) renderReconciliation(container, _records, dataset);
    if (excludedRecords.length) renderExcludedRecords(container, excludedRecords);
  }

  /* ── Hero Score Section ─────────────────────────────────── */
  function renderHeroSection(container) {
    const a = _audit;
    const scoreColor = a.overall >= 90 ? '#10b981' : a.overall >= 70 ? '#f59e0b' : '#ef4444';
    const pct = Math.round(a.overall * 3.6); // degrees for conic gradient

    container.insertAdjacentHTML('beforeend', `
      <div class="dq-hero-grid mb-24">
        <div class="dq-score-card">
          <div class="dq-score-ring" style="--score-color:${scoreColor};--score-deg:${pct}deg">
            <div class="dq-score-inner">
              <div class="dq-score-value">${Math.round(a.overall)}</div>
              <div class="dq-score-label">/ 100</div>
            </div>
          </div>
          <div class="dq-score-meta">
            <div class="dq-score-title">Data Quality Score</div>
            <div class="text-sm text-muted">${App.Fmt.number(a.total)} records checked</div>
            <div class="text-sm text-muted">${App.Fmt.number(a.totalAffectedRecords)} affected records</div>
            <div class="text-sm text-muted">${App.Fmt.number(a.totalIssueInstances)} issue instances</div>
          </div>
        </div>
        <div class="dq-severity-cards">
          <div class="dq-sev-card dq-sev-critical">
            <div class="dq-sev-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
            <div class="dq-sev-count">${App.Fmt.number(a.severity.critical)}</div>
            <div class="dq-sev-label">Critical</div>
          </div>
          <div class="dq-sev-card dq-sev-warning">
            <div class="dq-sev-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div class="dq-sev-count">${App.Fmt.number(a.severity.warning)}</div>
            <div class="dq-sev-label">Warning</div>
          </div>
          <div class="dq-sev-card dq-sev-info">
            <div class="dq-sev-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
            <div class="dq-sev-count">${App.Fmt.number(a.severity.info)}</div>
            <div class="dq-sev-label">Info</div>
          </div>
        </div>
      </div>
    `);
  }

  /* ── Dimension Cards ────────────────────────────────────── */
  function renderDimensionCards(container) {
    const dimMeta = {
      identity:       { icon: '🆔', label: 'Identity' },
      classification: { icon: '🏷️', label: 'Classification' },
      status:         { icon: '📊', label: 'Status' },
      measurement:    { icon: '⚖️', label: 'Measurement' },
      financial:      { icon: '💰', label: 'Financial' },
    };

    let html = '<div class="dq-dim-grid mb-24">';
    for (const [key, meta] of Object.entries(dimMeta)) {
      const d = _audit.dims[key];
      const color = d.score >= 90 ? '#10b981' : d.score >= 70 ? '#f59e0b' : '#ef4444';
      const healthy = _audit.total - d.affected;
      html += `
        <div class="dq-dim-card">
          <div class="dq-dim-header">
            <span class="dq-dim-icon">${meta.icon}</span>
            <span class="dq-dim-label">${meta.label}</span>
            <span class="dq-dim-score" style="color:${color}">${d.score}%</span>
          </div>
          <div class="dq-dim-bar-track"><div class="dq-dim-bar-fill" style="width:${d.score}%;background:${color}"></div></div>
          <div class="dq-dim-stats">
            <span class="text-success">${App.Fmt.number(healthy)} healthy</span>
            <span class="text-muted">·</span>
            <span style="color:${d.affected > 0 ? '#f59e0b' : 'var(--text-muted)'}">${App.Fmt.number(d.affected)} affected</span>
          </div>
        </div>`;
    }
    html += '</div>';
    container.insertAdjacentHTML('beforeend', html);
  }

  /* ── Check List ─────────────────────────────────────────── */
  function renderCheckList(container) {
    const section = document.createElement('div');
    section.className = 'card mb-24';
    section.style.cssText = 'padding:0;overflow:hidden';

    let rows = '';
    const dimLabels = { identity:'Identity', classification:'Classification', status:'Status', measurement:'Measurement', financial:'Financial' };
    let lastDim = '';

    for (const [key, c] of Object.entries(_audit.checks)) {
      if (c.dim !== lastDim) {
        lastDim = c.dim;
        rows += `<tr class="dq-check-group-header"><td colspan="4" style="padding:10px 18px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);background:rgba(255,255,255,0.02);border-top:1px solid var(--border-subtle)">${dimLabels[c.dim] || c.dim}</td></tr>`;
      }
      const sevBadge = c.sev === 'critical' ? 'badge-danger' : c.sev === 'warning' ? 'badge-warning' : 'badge-muted';
      const countColor = c.ids.length === 0 ? 'var(--text-muted)' : (c.sev === 'critical' ? 'var(--danger)' : c.sev === 'warning' ? 'var(--warning)' : 'var(--text-secondary)');
      rows += `
        <tr style="transition:background 0.15s">
          <td style="padding:10px 18px"><span class="badge ${sevBadge}" style="font-size:10px;min-width:60px;text-align:center">${c.sev.toUpperCase()}</span></td>
          <td style="padding:10px 18px;font-size:13px;font-weight:500;color:var(--text-primary)">${c.label}</td>
          <td style="padding:10px 18px;font-size:13px;font-weight:600;color:${countColor};text-align:right;font-variant-numeric:tabular-nums">${App.Fmt.number(c.ids.length)}</td>
          <td style="padding:10px 18px;text-align:right">${c.ids.length > 0 ? `<button class="btn btn-xs btn-ghost" onclick="App.Views.DataQuality.filterByCheck('${key}')">View Records</button>` : '<span class="text-muted text-xs">—</span>'}</td>
        </tr>`;
    }

    section.innerHTML = `
      <div style="padding:14px 18px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02)">
        <div class="font-bold text-sm" style="color:var(--text-primary)">Quality Checks</div>
        <div class="text-xs text-muted mt-2">All checks run on ${App.Fmt.number(_audit.total)} canonical records in a single pass. Click "View Records" to inspect affected rows.</div>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" style="margin:0;width:100%">
          <thead><tr>
            <th style="padding:8px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);width:80px">Severity</th>
            <th style="padding:8px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Check</th>
            <th style="padding:8px 18px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);width:80px">Affected</th>
            <th style="padding:8px 18px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);width:100px">Action</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    container.appendChild(section);
  }

  /* ── Issue Table ─────────────────────────────────────────── */
  function renderIssueTable(container) {
    const wrap = document.createElement('div');
    wrap.id = 'dq-issue-table-section';
    wrap.className = 'card mb-24';
    wrap.style.cssText = 'padding:0;overflow:hidden';
    container.appendChild(wrap);
    rebuildIssueTable();
  }

  function rebuildIssueTable() {
    const wrap = document.getElementById('dq-issue-table-section');
    if (!wrap) return;

    // Build flat issue list: { record, checkKey, checkLabel, severity }
    let issues = [];
    for (const [key, c] of Object.entries(_audit.checks)) {
      if (c.ids.length === 0) continue;
      for (const rid of c.ids) {
        issues.push({ rid, checkKey: key, label: c.label, sev: c.sev, dim: c.dim });
      }
    }

    // Apply filters
    if (_filterSev !== 'all') issues = issues.filter(i => i.sev === _filterSev);
    if (_filterCheck !== 'all') issues = issues.filter(i => i.checkKey === _filterCheck);
    if (_filterSearch) {
      const q = _filterSearch.toLowerCase();
      issues = issues.filter(i => {
        const r = _records.find(r => r.id === i.rid);
        if (!r) return false;
        return String(r.normalized_product_name || '').toLowerCase().includes(q)
            || String(r.item_id || '').toLowerCase().includes(q)
            || String(r.upc || '').toLowerCase().includes(q)
            || String(r.normalized_brand || '').toLowerCase().includes(q);
      });
    }

    // Deduplicate by record (show worst severity per record)
    const dedupMap = new Map();
    for (const i of issues) {
      if (!dedupMap.has(i.rid)) {
        dedupMap.set(i.rid, { ...i, allLabels: [i.label] });
      } else {
        const existing = dedupMap.get(i.rid);
        existing.allLabels.push(i.label);
        // Keep worst severity
        const sevOrder = { critical: 3, warning: 2, info: 1 };
        if ((sevOrder[i.sev] || 0) > (sevOrder[existing.sev] || 0)) {
          existing.sev = i.sev;
        }
      }
    }
    const dedupIssues = [...dedupMap.values()];

    // Sort: critical first, then warning, then info
    const sevOrd = { critical: 0, warning: 1, info: 2 };
    dedupIssues.sort((a, b) => (sevOrd[a.sev] || 3) - (sevOrd[b.sev] || 3));

    const totalFiltered = dedupIssues.length;
    const pageStart = _issuePage * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, totalFiltered);
    const pageItems = dedupIssues.slice(pageStart, pageEnd);
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

    // Build check options for filter
    const checkOptions = Object.entries(_audit.checks)
      .filter(([, c]) => c.ids.length > 0)
      .map(([key, c]) => `<option value="${key}" ${_filterCheck === key ? 'selected' : ''}>${c.label} (${c.ids.length})</option>`)
      .join('');

    let rowsHtml = '';
    for (const item of pageItems) {
      const r = _records.find(r => r.id === item.rid);
      if (!r) continue;
      const sevBadge = item.sev === 'critical' ? 'badge-danger' : item.sev === 'warning' ? 'badge-warning' : 'badge-muted';
      rowsHtml += `
        <tr style="transition:background 0.15s">
          <td style="padding:10px 14px;font-size:12.5px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);font-weight:500">${App.Fmt.escapeHtml(r.normalized_product_name || '—')}</td>
          <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary);font-variant-numeric:tabular-nums">${App.Fmt.escapeHtml(r.item_id || '—')}</td>
          <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary);font-variant-numeric:tabular-nums">${App.Fmt.escapeHtml(r.upc || '—')}</td>
          <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">${App.Fmt.escapeHtml(r.normalized_category || '—')}</td>
          <td style="padding:10px 14px;font-size:12px;color:var(--text-secondary)">${App.Fmt.escapeHtml(r.normalized_brand || '—')}</td>
          <td style="padding:10px 14px;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.allLabels.map(l => `<span class="badge ${sevBadge}" style="font-size:9.5px;margin-right:4px">${l}</span>`).join('')}</td>
          <td style="padding:10px 14px"><span class="badge ${sevBadge}" style="font-size:10px">${item.sev.toUpperCase()}</span></td>
        </tr>`;
    }

    if (!rowsHtml) {
      rowsHtml = `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted)">No issues match the current filters.</td></tr>`;
    }

    wrap.innerHTML = `
      <div style="padding:14px 18px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div class="font-bold text-sm" style="color:var(--text-primary)">Affected Records <span class="badge badge-muted" style="font-size:11px;margin-left:6px">${App.Fmt.number(totalFiltered)}</span></div>
        <div class="flex gap-8 items-center" style="flex-wrap:wrap">
          <input type="text" class="input" id="dq-issue-search" placeholder="Search product, ID, UPC, brand…" value="${App.Fmt.escapeHtml(_filterSearch)}" style="width:200px;height:30px;font-size:12px" oninput="App.Views.DataQuality.onSearchChange(this.value)">
          <select class="input" id="dq-issue-sev-filter" style="width:110px;height:30px;font-size:12px" onchange="App.Views.DataQuality.onSevChange(this.value)">
            <option value="all" ${_filterSev === 'all' ? 'selected' : ''}>All Severity</option>
            <option value="critical" ${_filterSev === 'critical' ? 'selected' : ''}>Critical</option>
            <option value="warning" ${_filterSev === 'warning' ? 'selected' : ''}>Warning</option>
            <option value="info" ${_filterSev === 'info' ? 'selected' : ''}>Info</option>
          </select>
          <select class="input" id="dq-issue-check-filter" style="width:180px;height:30px;font-size:12px" onchange="App.Views.DataQuality.onCheckChange(this.value)">
            <option value="all" ${_filterCheck === 'all' ? 'selected' : ''}>All Checks</option>
            ${checkOptions}
          </select>
          ${_filterCheck !== 'all' || _filterSev !== 'all' || _filterSearch ? `<button class="btn btn-xs btn-ghost" onclick="App.Views.DataQuality.clearFilters()">Clear</button>` : ''}
        </div>
      </div>
      <div style="overflow-x:auto;max-height:440px;overflow-y:auto">
        <table class="data-table" style="margin:0;width:100%">
          <thead><tr>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Product Name</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Item ID</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">UPC</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Category</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Brand</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Issues</th>
            <th style="padding:8px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Severity</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      ${totalPages > 1 ? `
        <div style="padding:10px 18px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center">
          <span class="text-xs text-muted">Page ${_issuePage + 1} of ${totalPages}</span>
          <div class="flex gap-6">
            <button class="btn btn-xs btn-ghost" ${_issuePage === 0 ? 'disabled' : ''} onclick="App.Views.DataQuality.prevPage()">← Prev</button>
            <button class="btn btn-xs btn-ghost" ${_issuePage >= totalPages - 1 ? 'disabled' : ''} onclick="App.Views.DataQuality.nextPage()">Next →</button>
          </div>
        </div>
      ` : ''}
    `;
  }

  /* ── Quality Rules Explainer ─────────────────────────────── */
  function renderExplainer(container) {
    container.insertAdjacentHTML('beforeend', `
      <details class="card mb-24" style="cursor:pointer">
        <summary style="padding:14px 18px;font-size:13px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          How is the Data Quality Score calculated?
        </summary>
        <div style="padding:0 18px 16px 18px;font-size:12.5px;line-height:1.7;color:var(--text-secondary)">
          <p><strong>Score Formula:</strong> Each quality check contributes a penalty using <code>severity_amplifier × √(affected / total)</code>. The square root dampens high-count optional fields, while severity amplifiers ensure critical issues have outsized impact.</p>
          <p style="margin-top:8px"><strong>Severity Amplifiers:</strong> INFO = 0.1 · WARNING = 1.0 · CRITICAL = 5.0</p>
          <p style="margin-top:8px"><strong>Dimension Weights:</strong> Identity 25% · Classification 20% · Status 15% · Measurement 20% · Financial 20%</p>
          <hr style="border-color:var(--border-subtle);margin:12px 0">
          <p><strong>Missing data is not always an error:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0">
            <li>Missing UPC is scored as INFO — many products legitimately lack a barcode.</li>
            <li>Missing weight or volume is INFO — non-liquid products may not have volume; weight may not be in the source Excel.</li>
            <li>Zero MRP or zero value is INFO — may represent free/sample items.</li>
          </ul>
          <p style="margin-top:8px"><strong>Critical issues matter most:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0">
            <li>Duplicate Item IDs can corrupt uniqueness guarantees.</li>
            <li>Negative quantities, weights, or values can distort inventory totals.</li>
            <li>Even a small number of critical issues significantly lowers the quality score.</li>
          </ul>
          <p style="margin-top:8px"><strong>Status resolution:</strong> Uses the canonical resolved status from the pipeline (explicit status → sheet context → default Sellable). The DQ audit does not re-resolve status.</p>
        </div>
      </details>
    `);
  }

  /* ── Reconciliation (preserved from existing code) ────── */
  function renderReconciliation(container, records, dataset) {
    const srcUnits  = records.reduce((s,r) => s+(r.qty||0), 0);
    const srcValue  = records.reduce((s,r) => s+(r.source_value||0), 0);
    const srcWeight = records.reduce((s,r) => s+(r.total_weight||0), 0);

    const metrics = [
      { label:'Total Records', desc:'Row count in dataset', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', source:dataset.rowCount, proc:records.length, fmt:App.Fmt.number },
      { label:'Total Units', desc:'Physical quantity total', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', source:srcUnits, proc:srcUnits, fmt:App.Fmt.number },
      { label:'Total Value (₹)', desc:'Cumulative inventory monetary value', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>', source:srcValue, proc:srcValue, fmt:App.Fmt.currency },
      { label:'Total Weight', desc:'Physical mass', icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>', source:srcWeight, proc:srcWeight, fmt:App.Fmt.mass },
    ];

    const rowsHtml = metrics.map(m => {
      const diff = (m.proc||0)-(m.source||0);
      const isOk = Math.abs(diff) < 0.001;
      return `<tr style="transition:background 0.15s">
        <td style="padding:14px 20px"><div style="display:flex;align-items:center;gap:10px"><div style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0">${m.icon}</div><div><div style="font-size:13.5px;font-weight:600;color:var(--text-primary)">${m.label}</div><div style="font-size:11.5px;color:var(--text-muted)">${m.desc}</div></div></div></td>
        <td style="padding:14px 20px;text-align:right;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${m.fmt(m.source)}</td>
        <td style="padding:14px 20px;text-align:right;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${m.fmt(m.proc)}</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums"><span style="color:${isOk?'var(--success)':'var(--danger)'}">${isOk?'✓ 0':((diff>0?'+':'')+m.fmt(diff))}</span></td>
        <td style="padding:14px 20px;text-align:center"><span class="badge ${isOk?'badge-success':'badge-danger'}" style="font-size:11px;font-weight:600;padding:4px 10px">${isOk?'Exact Match':'Variance'}</span></td>
      </tr>`;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-24" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:var(--bg-surface-2);border-radius:var(--r-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;color:var(--success);flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></div>
            <div><div style="font-size:14px;font-weight:600;color:var(--text-primary)">Reconciliation Check</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">Verifies processed totals match source spreadsheet data.</div></div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" style="margin:0;width:100%"><thead><tr>
            <th style="padding:10px 20px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Metric</th>
            <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source</th>
            <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Processed</th>
            <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Drift</th>
            <th style="padding:10px 20px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Status</th>
          </tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
      </div>
    `);
  }

  /* ── Excluded Records (preserved from existing code) ──── */
  function renderExcludedRecords(container, excludedRecords) {
    const summaryRows = excludedRecords.filter(r => r._exclude_reason === 'summary_row');
    const noNameRows  = excludedRecords.filter(r => r._exclude_reason === 'missing_product_name');

    const rowsHtml = excludedRecords.map(r => `
      <tr style="transition:background 0.15s">
        <td style="padding:12px 18px"><span class="badge ${r._exclude_reason === 'summary_row' ? 'badge-warning' : 'badge-danger'}" style="display:inline-flex;align-items:center;gap:6px;font-weight:600">${r._exclude_reason === 'summary_row' ? 'Summary Row' : 'Missing Name'}</span></td>
        <td style="padding:12px 18px;font-weight:500;color:var(--text-primary)">${r._sheet_name || 'Sheet'}</td>
        <td style="padding:12px 18px;color:var(--text-secondary);font-variant-numeric:tabular-nums">Row ${r._source_row}</td>
        <td style="padding:12px 18px">${r.upc ? `<code style="font-size:11.5px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:var(--text-secondary)">${r.upc}</code>` : '<span style="color:var(--text-muted)">&mdash;</span>'}</td>
        <td style="padding:12px 18px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${r.qty ? App.Fmt.number(r.qty) : '<span style="color:var(--text-muted)">&mdash;</span>'}</td>
        <td style="padding:12px 18px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">${r.value ? App.Fmt.currency(r.value) : '<span style="color:var(--text-muted)">&mdash;</span>'}</td>
      </tr>
    `).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-24" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:var(--bg-surface-2);border-radius:var(--r-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);display:flex;align-items:center;justify-content:center;color:var(--warning);flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
            <div>
              <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px;font-weight:600;color:var(--text-primary)">Excluded &amp; Unresolved Source Records</span><span class="badge badge-warning" style="font-size:11px;font-weight:600">${excludedRecords.length} Set Aside</span></div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px"><strong>${summaryRows.length} summary/total row${summaryRows.length !== 1 ? 's' : ''}</strong> and <strong>${noNameRows.length} unresolved row${noNameRows.length !== 1 ? 's' : ''}</strong>.</div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="App.Views.DataQuality.downloadExcludedCSV()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export Excluded (CSV)</button>
        </div>
        <div style="max-height:340px;overflow-y:auto">
          <table class="data-table" style="margin:0;width:100%">
            <thead><tr>
              <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Reason</th>
              <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Sheet</th>
              <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Row</th>
              <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">UPC / Code</th>
              <th style="padding:10px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Quantity</th>
              <th style="padding:10px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Value</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `);
  }

  /* ── Filter handlers ─────────────────────────────────────── */
  function filterByCheck(checkKey) {
    _filterCheck = checkKey;
    _filterSev = 'all';
    _filterSearch = '';
    _issuePage = 0;
    rebuildIssueTable();
    document.getElementById('dq-issue-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onSevChange(val) { _filterSev = val; _issuePage = 0; rebuildIssueTable(); }
  function onCheckChange(val) { _filterCheck = val; _issuePage = 0; rebuildIssueTable(); }
  function onSearchChange(val) { _filterSearch = val.trim(); _issuePage = 0; rebuildIssueTable(); }
  function clearFilters() { _filterSev = 'all'; _filterCheck = 'all'; _filterSearch = ''; _issuePage = 0; rebuildIssueTable(); }
  function prevPage() { if (_issuePage > 0) { _issuePage--; rebuildIssueTable(); } }
  function nextPage() { _issuePage++; rebuildIssueTable(); }

  /* ── Merge handlers (preserved from existing code) ────── */
  window.handleSuggestion = async (suggId, status) => {
    const sugg = await App.DB.get('normalization_suggestions', suggId);
    if (sugg) { sugg.status = status; await App.DB.put('normalization_suggestions', sugg); }
    const el = document.getElementById(`sugg-${suggId}`);
    if (el) { el.style.opacity = '0.4'; el.querySelector('.dq-actions').innerHTML = `<span class="badge badge-muted">Marked as ${status}</span>`; }
  };

  window.handleMerge = async (suggId, dataset_id, brandIdA, brandIdB, keep) => {
    try {
      const keepId = keep === 'keep_a' ? brandIdA : brandIdB;
      const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
      const brands  = await App.DB.getAllByIndex('brands', 'dataset_id', dataset_id);
      const { records: updRecords, brands: updBrands } = App.BrandEngine.applyMerge(records, brands, brandIdA, brandIdB, keepId);
      await App.DB.putBulk('inventory_records', updRecords);
      const removeId = keepId === brandIdA ? brandIdB : brandIdA;
      await App.DB.del('brands', removeId);
      for (const b of updBrands) await App.DB.put('brands', b);
      await handleSuggestion(suggId, 'approved');
      const { warehouses, dqIssues, kpis } = App.Aggregator.run(updRecords, dataset_id);
      const dataset = await App.DB.getDataset(dataset_id);
      if (dataset) { dataset.kpis = kpis; await App.DB.saveDataset(dataset); }
      App.DQAudit.invalidateCache();
      App.UI.toast('Brand merge applied successfully!');
      App.UI.render();
    } catch(err) {
      console.error('Error applying merge:', err);
      App.UI.toast(`Error applying merge: ${err.message}`);
    }
  };

  /* ── Excluded CSV download ──────────────────────────────── */
  async function downloadExcludedCSV() {
    const dataset_id = App.State.dataset_id;
    if (!dataset_id) return;
    const excludedRecords = await App.DB.getAllByIndex('excluded_records', 'dataset_id', dataset_id);
    if (!excludedRecords || !excludedRecords.length) { App.UI.toast('No excluded records to export'); return; }
    const ds = await App.DB.getDataset(dataset_id);
    const fname = `${(ds?.filename || 'inventory').replace(/\.[^/.]+$/, '')}_excluded_records`;
    App.Exporter.exportExcludedRecordsToCSV(fname, excludedRecords);
    App.UI.toast(`Exported ${excludedRecords.length} excluded records ✅`);
  }

  return { render, downloadExcludedCSV, filterByCheck, onSevChange, onCheckChange, onSearchChange, clearFilters, prevPage, nextPage };
})();
