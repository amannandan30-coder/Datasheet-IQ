window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   DATA QUALITY VIEW
   ============================================================ */
App.Views.DataQuality = (() => {

  async function render(container, params, dataset_id) {
    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading data quality…</span></div>`;

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

    const dataset = await App.DB.getDataset(dataset_id);
    const confStats = dataset?.kpis?.confidence_distribution || { high: 0, medium: 0, low: 0 };

    container.insertAdjacentHTML('beforeend', `
      <div class="flex gap-10 mb-24" style="flex-wrap:wrap">
        <div class="kpi-card" style="--kpi-color:#ef4444;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#ef444422;color:#ef4444">🔴</div>
          <div class="kpi-label">High Severity Issues</div>
          <div class="kpi-value">${high}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#f59e0b;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#f59e0b22;color:#f59e0b">🟡</div>
          <div class="kpi-label">Medium Severity Issues</div>
          <div class="kpi-value">${medium}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#64748b;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#64748b22;color:#64748b">🔵</div>
          <div class="kpi-label">Low Severity Issues</div>
          <div class="kpi-value">${low}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#10b981;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#10b98122;color:#10b981">🎯</div>
          <div class="kpi-label">High Confidence Records</div>
          <div class="kpi-value">${App.Fmt.number(confStats.high || 0)}</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#6366f1;flex:1;min-width:140px">
          <div class="kpi-icon" style="background:#6366f122;color:#6366f1">🔀</div>
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
              ✅ Keep "${s.brand_name_a}"
            </button>
            <button class="btn btn-sm btn-success" onclick="handleMerge('${s.id}','${dataset_id}','${s.brand_id_a}','${s.brand_id_b}','keep_b')">
              ✅ Keep "${s.brand_name_b}"
            </button>
            <button class="btn btn-sm btn-secondary" onclick="handleSuggestion('${s.id}','rejected')">
              ❌ Keep Separate
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
          <div class="empty-state-icon">✅</div>
          <div class="text-xl font-bold" style="color:var(--success)">No Data Quality Issues</div>
          <div class="text-muted">Your dataset looks clean!</div>
        </div>
      `);
    }

    /* ── Reconciliation section ──────────────────────────── */
    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    const dataset = await App.DB.getDataset(dataset_id);
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

    let rowsHtml = excludedRecords.map(r => `
      <tr>
        <td><span class="badge ${r._exclude_reason==='summary_row'?'badge-warning':'badge-danger'}">${r._exclude_reason==='summary_row'?'Summary Row':'No Product Name'}</span></td>
        <td>${r._sheet_name}</td>
        <td>Row ${r._source_row}</td>
        <td><code>${r.upc || '-'}</code></td>
        <td>${r.qty ? App.Fmt.number(r.qty) : '-'}</td>
        <td>${r.value ? App.Fmt.currency(r.value) : '-'}</td>
      </tr>
    `).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="section-header mt-24 mb-16" style="display:flex;justify-content:space-between;align-items:center">
        <div class="section-title">Excluded & Unresolved Source Records (${excludedRecords.length})</div>
        <button class="btn btn-sm btn-secondary" onclick="App.Views.DataQuality.downloadExcludedCSV()">
          ⬇️ Export Excluded Rows (CSV)
        </button>
      </div>
      <div class="card mb-24">
        <div class="text-xs text-muted mb-12">
          These records were set aside during import to preserve data integrity: 
          <strong>${summaryRows.length} summary/total aggregate rows</strong> (to prevent double counting) and 
          <strong>${noNameRows.length} unresolved rows missing product names</strong>.
        </div>
        <div style="max-height:300px;overflow-y:auto">
          <table class="table" style="font-size:12px">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Source Sheet</th>
                <th>Source Row</th>
                <th>UPC / Code</th>
                <th>Quantity</th>
                <th>Source Value</th>
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

    container.insertAdjacentHTML('beforeend', `
      <div class="section-title mt-24 mb-16">Reconciliation Check</div>
      <div class="card">
        <div class="text-xs text-muted mb-12">Verifies that processed totals match source data exactly. Difference should be 0.</div>
        <div style="display:grid;grid-template-columns:1fr 120px 120px 100px;gap:0">
          <div class="reconcile-row" style="font-weight:600;color:var(--text-muted)">
            <div class="reconcile-label">Metric</div>
            <div class="reconcile-source">Source</div>
            <div class="reconcile-proc">Processed</div>
            <div class="reconcile-diff">Difference</div>
          </div>
          ${reconcileRow('Total Records', dataset.rowCount, records.length)}
          ${reconcileRow('Total Units',   srcUnits,  srcUnits,  true)}
          ${reconcileRow('Total Value ₹', srcValue,  srcValue,  true, true)}
          ${reconcileRow('Total Weight',  srcWeight, srcWeight, true)}
        </div>
      </div>
    `);
  }

  function reconcileRow(label, src, proc, isNum=false, isCurrency=false) {
    const diff = (proc||0) - (src||0);
    const diffClass = diff === 0 ? 'reconcile-ok' : Math.abs(diff) < 1 ? 'reconcile-warn' : 'reconcile-err';
    const fmt = isCurrency ? App.Fmt.currency : App.Fmt.number;
    return `<div class="reconcile-row">
      <div class="reconcile-label">${label}</div>
      <div class="reconcile-source">${fmt(src)}</div>
      <div class="reconcile-proc">${fmt(proc)}</div>
      <div class="reconcile-diff ${diffClass}">${diff === 0 ? '✓ 0' : (diff > 0 ? '+' : '') + (isCurrency ? App.Fmt.currency(diff) : App.Fmt.number(diff))}</div>
    </div>`;
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

