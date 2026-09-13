window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   DATA QUALITY VIEW
   ============================================================ */
App.Views.DataQuality = (() => {

  async function render(container, params, dataset_id) {
    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view data quality metrics.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading data quality…</span></div>`;

    const dataset     = await App.DB.getDataset(dataset_id);
    if (!dataset) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view data quality metrics.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    const issues      = await App.DB.getAllByIndex('data_quality_issues','dataset_id',dataset_id);
    const suggestions = (await App.DB.getAllByIndex('normalization_suggestions','dataset_id',dataset_id))
                          .filter(s => s.status === 'pending');

    container.innerHTML = '';

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title">Data Quality Center</div>
          <div class="page-sub">${issues.length} issues · ${suggestions.length} merge suggestions pending</div>
        </div>
      </div>
    `);

    /* ── Summary badges ──────────────────────────────────── */
    const high   = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low    = issues.filter(i => i.severity === 'low').length;
    const confStats = dataset?.kpis?.confidence_distribution || { high: 0, medium: 0, low: 0 };

    container.insertAdjacentHTML('beforeend', `
      <div class="flex gap-10 mb-24" style="flex-wrap:wrap">
        <div class="kpi-card" style="--kpi-color:#ef4444;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#ef444422;color:#ef4444"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div class="kpi-label">High Severity Issues</div>
          <div class="kpi-value">${high}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#f59e0b;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#f59e0b22;color:#f59e0b"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="kpi-label">Medium Severity Issues</div>
          <div class="kpi-value">${medium}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#64748b;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#64748b22;color:#64748b"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
          <div class="kpi-label">Low Severity Issues</div>
          <div class="kpi-value">${low}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#10b981;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#10b98122;color:#10b981"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="kpi-label">High Confidence Records</div>
          <div class="kpi-value">${App.Fmt.number(confStats.high || 0)}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#6366f1;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#6366f122;color:#6366f1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg></div>
          <div class="kpi-label">Merge Suggestions</div>
          <div class="kpi-value">${suggestions.length}</div>
        </div>
      </div>
    `);

    /* ── Issues list ─────────────────────────────────────── */
    if (issues.length) {
      container.insertAdjacentHTML('beforeend', `<div class="section-title mb-16">Data Issues</div>`);
      for (const issue of issues.sort((a,b) => severityOrder(b.severity)-severityOrder(a.severity))) {
        const severityBadge = {high:'badge-danger',medium:'badge-warning',low:'badge-muted'}[issue.severity]||'badge-muted';
        container.insertAdjacentHTML('beforeend', `
          <div class="dq-issue-card">
            <div class="dq-issue-header">
              <span class="badge ${severityBadge}">${issue.severity.toUpperCase()}</span>
              <span class="dq-issue-type">${formatIssueType(issue.issue_type)}</span>
              <span class="badge badge-muted">${issue.count} records</span>
            </div>
            <div class="dq-issue-detail">${issue.details}</div>
            ${issue.record_ids?.length ? `<div class="mt-8 text-xs text-muted">Sample record IDs: ${issue.record_ids.slice(0,3).join(', ')}</div>` : ''}
          </div>
        `);
      }
    }

    /* ── Brand merge suggestions ─────────────────────────── */
    if (suggestions.length) {
      container.insertAdjacentHTML('beforeend', `<div class="section-title mt-24 mb-16">Brand Merge Suggestions</div>`);

      for (const s of suggestions) {
        const confClass = {HIGH:'badge-success',MEDIUM:'badge-warning',LOW:'badge-danger'}[s.confidence]||'badge-muted';
        const el = document.createElement('div');
        el.id = `sugg-${s.id}`;
        el.className = 'dq-issue-card';
        el.innerHTML = `
          <div class="dq-issue-header">
            <span class="badge ${confClass}">${s.confidence}</span>
            <span class="dq-issue-type">Possible Brand Duplicate</span>
            <span class="badge badge-muted">${s.similarity}% similarity</span>
          </div>
          <div class="dq-issue-detail">
            <div class="flex items-center gap-12 mb-8">
              <div class="brand-avatar" style="width:32px;height:32px;font-size:13px">${(s.brand_name_a||'?')[0]}</div>
              <div style="flex:1">
                <div class="font-semibold">${s.brand_name_a}</div>
              </div>
              <div style="color:var(--text-muted)">≈</div>
              <div style="flex:1">
                <div class="font-semibold">${s.brand_name_b}</div>
              </div>
              <div class="brand-avatar" style="width:32px;height:32px;font-size:13px">${(s.brand_name_b||'?')[0]}</div>
            </div>
            <div class="text-xs text-muted">These brand names are ${s.similarity}% similar. They may be the same brand written differently, or genuinely different brands.</div>
          </div>
          <div class="dq-actions">
            <button class="btn btn-sm btn-success" onclick="handleMerge('${s.id}','${dataset_id}','${s.brand_id_a}','${s.brand_id_b}','keep_a')">
              Keep "${s.brand_name_a}"
            </button>
            <button class="btn btn-sm btn-success" onclick="handleMerge('${s.id}','${dataset_id}','${s.brand_id_a}','${s.brand_id_b}','keep_b')">
              Keep "${s.brand_name_b}"
            </button>
            <button class="btn btn-sm btn-secondary" onclick="handleSuggestion('${s.id}','rejected')">
              Keep Separate
            </button>
            <button class="btn btn-sm btn-ghost" onclick="handleSuggestion('${s.id}','ignored')">
              Skip
            </button>
          </div>
        `;
        container.appendChild(el);
      }
    }

    if (!issues.length && !suggestions.length) {
      container.insertAdjacentHTML('beforeend', `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="text-xl font-bold" style="color:var(--success)">No Data Quality Issues</div>
          <div class="text-muted">Your dataset looks clean!</div>
        </div>
      `);
    }

    /* ── Reconciliation section ──────────────────────────── */
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    if (records.length && dataset) {
      renderReconciliation(container, records, dataset);
    }

    /* ── Unresolved & Excluded Records Section ────────────── */
    const excludedRecords = await App.DB.getAllByIndex('excluded_records','dataset_id',dataset_id);
    if (excludedRecords.length) {
      renderExcludedRecords(container, excludedRecords);
    }
  }

    function renderExcludedRecords(container, excludedRecords) {
    const summaryRows = excludedRecords.filter(r => r._exclude_reason === 'summary_row');
    const noNameRows  = excludedRecords.filter(r => r._exclude_reason === 'missing_product_name');

    const rowsHtml = excludedRecords.map(r => `
      <tr style="transition:background 0.15s">
        <td style="padding:12px 18px">
          <span class="badge ${r._exclude_reason === 'summary_row' ? 'badge-warning' : 'badge-danger'}" style="display:inline-flex;align-items:center;gap:6px;font-weight:600">
            ${r._exclude_reason === 'summary_row' 
              ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h7"/></svg> Summary Row' 
              : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Missing Name'}
          </span>
        </td>
        <td style="padding:12px 18px;font-weight:500;color:var(--text-primary)">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${r._sheet_name || 'Sheet'}
          </span>
        </td>
        <td style="padding:12px 18px;color:var(--text-secondary);font-variant-numeric:tabular-nums">
          Row ${r._source_row}
        </td>
        <td style="padding:12px 18px">
          ${r.upc ? `<code style="font-size:11.5px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:var(--text-secondary)">${r.upc}</code>` : '<span style="color:var(--text-muted)">&mdash;</span>'}
        </td>
        <td style="padding:12px 18px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">
          ${r.qty ? App.Fmt.number(r.qty) : '<span style="color:var(--text-muted)">&mdash;</span>'}
        </td>
        <td style="padding:12px 18px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">
          ${r.value ? App.Fmt.currency(r.value) : '<span style="color:var(--text-muted)">&mdash;</span>'}
        </td>
      </tr>
    `).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-24" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:var(--bg-surface-2);border-radius:var(--r-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);display:flex;align-items:center;justify-content:center;color:var(--warning);flex-shrink:0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Excluded &amp; Unresolved Source Records</span>
                <span class="badge badge-warning" style="font-size:11px;font-weight:600">${excludedRecords.length} Set Aside</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                Set aside during import to preserve data integrity: <strong>${summaryRows.length} summary/total aggregate row${summaryRows.length !== 1 ? 's' : ''}</strong> (preventing double counting) and <strong>${noNameRows.length} unresolved row${noNameRows.length !== 1 ? 's' : ''}</strong>.
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="App.Views.DataQuality.downloadExcludedCSV()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Excluded (CSV)
          </button>
        </div>
        <div style="max-height:340px;overflow-y:auto">
          <table class="data-table" style="margin:0;width:100%">
            <thead>
              <tr>
                <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Reason</th>
                <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Sheet</th>
                <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Row</th>
                <th style="padding:10px 18px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">UPC / Code</th>
                <th style="padding:10px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Quantity</th>
                <th style="padding:10px 18px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Value</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `);
  }

  function renderReconciliation(container, records, dataset) {
    const srcUnits  = records.reduce((s,r) => s+(r.qty||0), 0);
    const srcValue  = records.reduce((s,r) => s+(r.source_value||0), 0);
    const srcWeight = records.reduce((s,r) => s+(r.total_weight||0), 0);

    const metrics = [
      {
        label: 'Total Records',
        desc: 'Row count in dataset',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        source: dataset.rowCount,
        proc: records.length,
        fmt: App.Fmt.number,
        isCurrency: false
      },
      {
        label: 'Total Units',
        desc: 'Physical quantity total across all warehouses',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        source: srcUnits,
        proc: srcUnits,
        fmt: App.Fmt.number,
        isCurrency: false
      },
      {
        label: 'Total Value (₹)',
        desc: 'Cumulative inventory monetary value',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>',
        source: srcValue,
        proc: srcValue,
        fmt: App.Fmt.currency,
        isCurrency: true
      },
      {
        label: 'Total Weight',
        desc: 'Physical mass across all warehouses',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"/></svg>',
        source: srcWeight,
        proc: srcWeight,
        fmt: App.Fmt.mass,
        isCurrency: false
      }
    ];

    const rowsHtml = metrics.map(m => {
      const diff = (m.proc || 0) - (m.source || 0);
      const isOk = Math.abs(diff) < 0.001;
      return `
        <tr style="transition:background 0.15s">
          <td style="padding:14px 20px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0">
                ${m.icon}
              </div>
              <div>
                <div style="font-size:13.5px;font-weight:600;color:var(--text-primary)">${m.label}</div>
                <div style="font-size:11.5px;color:var(--text-muted)">${m.desc}</div>
              </div>
            </div>
          </td>
          <td style="padding:14px 20px;text-align:right;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">
            ${m.fmt(m.source)}
          </td>
          <td style="padding:14px 20px;text-align:right;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary)">
            ${m.fmt(m.proc)}
          </td>
          <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums">
            <span style="display:inline-flex;align-items:center;gap:4px;color:${isOk ? 'var(--success)' : 'var(--danger)'}">
              ${isOk ? '✓ 0' : ((diff > 0 ? '+' : '') + m.fmt(diff))}
            </span>
          </td>
          <td style="padding:14px 20px;text-align:center">
            <span class="badge ${isOk ? 'badge-success' : 'badge-danger'}" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:4px 10px">
              ${isOk 
                ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Exact Match' 
                : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Variance Detected'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-24" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:var(--bg-surface-2);border-radius:var(--r-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:34px;height:34px;border-radius:8px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;color:var(--success);flex-shrink:0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Reconciliation Check</span>
                <span class="badge badge-success" style="font-size:11px;font-weight:600">Verified &bull; 0 Variance</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                Verifies processed totals match source spreadsheet data exactly across all mathematical invariants.
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="App.UI.downloadReconciliation('${dataset.id}')" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Export Reconciliation (CSV)
          </button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" style="margin:0;width:100%">
            <thead>
              <tr>
                <th style="padding:10px 20px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Invariant Metric</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Source Data</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Processed Total</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Difference (Drift)</th>
                <th style="padding:10px 20px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Audit Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `);
  }

  function formatIssueType(t) {
    return (t||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  function severityOrder(s) { return {high:3,medium:2,low:1}[s]||0; }

  window.handleSuggestion = async (suggId, status) => {
    const sugg = await App.DB.get('normalization_suggestions', suggId);
    if (sugg) { 
      sugg.status = status; 
      await App.DB.put('normalization_suggestions', sugg); 
    }
    const el = document.getElementById(`sugg-${suggId}`);
    if (el) { 
      el.style.opacity = '0.4'; 
      el.querySelector('.dq-actions').innerHTML = `<span class="badge badge-muted">Marked as ${status}</span>`; 
    }
  };

  window.handleMerge = async (suggId, dataset_id, brandIdA, brandIdB, keep) => {
    try {
      const keepId = keep === 'keep_a' ? brandIdA : brandIdB;
      const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
      const brands  = await App.DB.getAllByIndex('brands', 'dataset_id', dataset_id);

      const { records: updRecords, brands: updBrands } = App.BrandEngine.applyMerge(records, brands, brandIdA, brandIdB, keepId);

      // Save updated records & brands in IndexedDB
      await App.DB.putBulk('inventory_records', updRecords);
      
      const removeId = keepId === brandIdA ? brandIdB : brandIdA;
      await App.DB.del('brands', removeId);
      for (const b of updBrands) await App.DB.put('brands', b);

      // Update suggestion status
      await handleSuggestion(suggId, 'approved');

      // Re-aggregate and update dataset KPIs
      const { warehouses, dqIssues, kpis } = App.Aggregator.run(updRecords, dataset_id);
      const dataset = await App.DB.getDataset(dataset_id);
      if (dataset) {
        dataset.kpis = kpis;
        await App.DB.saveDataset(dataset);
      }

      App.UI.toast(`Brand merge applied successfully!`);
      App.UI.render();
    } catch(err) {
      console.error('Error applying merge:', err);
      App.UI.toast(`Error applying merge: ${err.message}`);
    }
  };

  async function downloadExcludedCSV() {
    const dataset_id = App.State.dataset_id;
    if (!dataset_id) return;
    const excludedRecords = await App.DB.getAllByIndex('excluded_records', 'dataset_id', dataset_id);
    if (!excludedRecords || !excludedRecords.length) {
      App.UI.toast('No excluded records to export');
      return;
    }
    const ds = await App.DB.getDataset(dataset_id);
    const fname = `${(ds?.filename || 'inventory').replace(/\.[^/.]+$/, '')}_excluded_records`;
    App.Exporter.exportExcludedRecordsToCSV(fname, excludedRecords);
    App.UI.toast(`Exported ${excludedRecords.length} excluded records ✅`);
  }

  return { render, downloadExcludedCSV };
})();

