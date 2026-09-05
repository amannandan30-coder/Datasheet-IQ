window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   BRAND DETAIL VIEW
   Shows product families → variants (with expand)
   ============================================================ */
App.Views.BrandDetail = (() => {

  async function render(container, params, dataset_id) {
    const brandName = decodeURIComponent(params.id || '');
    const catName   = decodeURIComponent(params.cat || '');
    const subcatName= decodeURIComponent(params.subcat || params.subcategory || '');

    if (!dataset_id) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="font-bold text-base mb-8">No Dataset Loaded</div>
          <div class="text-sm text-muted mb-16">Please upload or select an inventory spreadsheet to view brand details.</div>
          <button class="btn btn-primary" onclick="App.UI.showUploadModal()"><span>📂</span> Upload Spreadsheet</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading ${brandName}…</span></div>`;

    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    let allBrandRecords = records.filter(r => r.normalized_brand === brandName || r.raw_brand === brandName);

    // Ensure accurate subcategory classification on all brand records
    if (window.App && window.App.Categorizer && typeof window.App.Categorizer.classify === 'function') {
      for (const r of allBrandRecords) {
        const res = App.Categorizer.classify(r.source_category || r.normalized_category, r.normalized_product_name, r.normalized_brand);
        if (res && res.subcategory) r.subcategory = res.subcategory;
      }
    }

    let brandRecords = allBrandRecords;
    if (catName) brandRecords = brandRecords.filter(r => r.normalized_category === catName);
    if (subcatName) brandRecords = brandRecords.filter(r => (r.subcategory || 'General') === subcatName);

    if (!brandRecords.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div>No records for "${brandName}"${catName ? ' in ' + catName : ''}${subcatName ? ' › ' + subcatName : ''}</div>
          <button class="btn btn-secondary mt-12" onclick="App.Router.go('brand',{id:'${encodeURIComponent(brandName)}'})">View All ${brandName} Inventory</button>
        </div>`;
      return;
    }

    const totalUnits = brandRecords.reduce((s,r) => s+(r.qty||0), 0);
    const totalValue = brandRecords.reduce((s,r) => s+(r.source_value||0), 0);
    const totalWeight= brandRecords.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalSKUs  = new Set(brandRecords.map(r => r.product_family_id)).size;
    const cats       = [...new Set(brandRecords.map(r => r.normalized_category))];

    // Group by product family
    const familyMap = new Map();
    for (const r of brandRecords) {
      const fid = r.product_family_id;
      if (!familyMap.has(fid)) familyMap.set(fid, {
        id: fid,
        name: r.normalized_product_name,
        brand: brandName,
        category: r.normalized_category,
        subcategory: r.subcategory,
        qty:0, value:0, weight:0,
        variants: new Map(), // variant_id → variant
        records: [],
      });
      const f = familyMap.get(fid);
      f.qty    += (r.qty||0);
      f.value  += (r.source_value||0);
      f.weight += (r.total_weight||0);
      f.records.push(r);

      // Group variants
      const vid = r.product_variant_id;
      if (!f.variants.has(vid)) f.variants.set(vid, {
        id: vid, uom: r.normalized_uom||r.raw_uom||'', mrp: r.variant_mrp,
        raw_uom: r.raw_uom, qty:0, value:0, weight:0, records:[]
      });
      const v = f.variants.get(vid);
      v.qty    += (r.qty||0);
      v.value  += (r.source_value||0);
      v.weight += (r.total_weight||0);
      v.records.push(r);
    }

    const families = [...familyMap.values()].sort((a,b) => b.value - a.value);

    container.innerHTML = '';

    /* ── Header ──────────────────────────────────────────── */
    let pageSub = '';
    if (catName && subcatName) {
      pageSub = `${catName} › ${subcatName} · ${families.length} product families`;
    } else if (catName) {
      pageSub = `${catName} · ${families.length} product families`;
    } else {
      pageSub = `${cats.join(' · ')} · ${families.length} product families`;
    }

    let filterControlsHtml = '';
    if (subcatName) {
      filterControlsHtml = `
        <div class="flex items-center gap-8">
          <div class="badge badge-primary" style="font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px">
            Context: ${catName} › ${subcatName}
            <button class="btn-ghost text-xs font-bold ml-4" style="color:inherit;border:none;background:none;cursor:pointer;padding:0"
                    onclick="App.Router.go('brand',{id:'${encodeURIComponent(brandName)}'})" title="Clear filter (View all products of ${brandName})">✕</button>
          </div>
        </div>`;
    } else if (catName) {
      filterControlsHtml = `
        <div class="flex items-center gap-8">
          <div class="badge badge-primary" style="font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px">
            Context: ${catName}
            <button class="btn-ghost text-xs font-bold ml-4" style="color:inherit;border:none;background:none;cursor:pointer;padding:0"
                    onclick="App.Router.go('brand',{id:'${encodeURIComponent(brandName)}'})" title="Clear filter (View all products of ${brandName})">✕</button>
          </div>
        </div>`;
    } else {
      filterControlsHtml = `
        <select class="select" onchange="filterFamilies(this.value)">
          <option value="">All Categories</option>
          ${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>`;
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div class="flex items-center gap-14">
          <div class="brand-avatar" style="width:52px;height:52px;font-size:22px;border-radius:14px">
            ${brandName[0]?.toUpperCase()||'?'}
          </div>
          <div>
            <div class="page-title">${brandName}</div>
            <div class="page-sub">${pageSub}</div>
          </div>
        </div>
        <div class="flex gap-8">
          ${filterControlsHtml}
        </div>
      </div>

      <div class="grid-4 mb-24">
        ${kpi('SKUs',    App.Fmt.number(totalSKUs),    '📦', '#6366f1')}
        ${kpi('Units',   App.Fmt.number(totalUnits),   '📊', '#10b981')}
        ${kpi('Value',   App.Fmt.currency(totalValue), '💰', '#f59e0b')}
        ${kpi('Weight',  App.Fmt.weight(totalWeight),  '⚖️', '#38bdf8')}
      </div>

      <div class="section-header">
        <div class="section-title">Product Families</div>
        <div class="flex gap-8">
          <input class="input" style="width:200px" placeholder="Search products…" 
                 oninput="filterProductFamilies(this.value)">
        </div>
      </div>
      <div id="product-families-list"></div>
    `);

    window._brandFamilies = families;
    renderFamilies(families, container.querySelector('#product-families-list'));

    window.filterFamilies = (cat) => {
      const filt = cat ? families.filter(f => f.category === cat) : families;
      renderFamilies(filt, container.querySelector('#product-families-list'));
    };

    window.filterProductFamilies = (q) => {
      const items = document.querySelectorAll('.product-row[data-name]');
      items.forEach(el => {
        el.style.display = el.dataset.name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
      });
    };
  }

  function renderFamilies(families, wrap) {
    wrap.innerHTML = '';
    families.forEach((fam, i) => {
      const variants = [...fam.variants.values()];
      const el = document.createElement('div');
      el.className = 'product-row animate-fade-in';
      el.dataset.name = fam.name || '';
      el.style.animationDelay = `${i*0.04}s`;
      el.innerHTML = `
        <div class="product-row-header" onclick="toggleFamily('${fam.id}')">
          <div class="product-expand-btn" id="expand-${fam.id}" aria-label="Expand">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <div class="product-name-block">
            <div class="product-name">${App.Fmt.escapeHtml(fam.name || 'Unknown Product')}</div>
            <div class="product-meta">${variants.length} variant${variants.length!==1?'s':''} · ${App.Fmt.escapeHtml(fam.subcategory||'')}</div>
          </div>
          <div class="product-summary-stats">
            <div class="product-summary-stat">
              <div class="product-summary-val">${App.Fmt.number(fam.qty)}</div>
              <div class="product-summary-lbl">Units</div>
            </div>
            <div class="product-summary-stat">
              <div class="product-summary-val">${App.Fmt.weight(fam.weight)}</div>
              <div class="product-summary-lbl">Weight</div>
            </div>
            <div class="product-summary-stat">
              <div class="product-summary-val">${App.Fmt.currency(fam.value)}</div>
              <div class="product-summary-lbl">Value</div>
            </div>
          </div>
        </div>
        <div class="product-variants-list" id="variants-${fam.id}">
          ${variants.map(v => variantRow(v, fam.id)).join('')}
        </div>
      `;
      wrap.appendChild(el);
    });

    if (!families.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>No products found</div></div>';
    }

    window.toggleFamily = (id) => {
      const list = document.getElementById(`variants-${id}`);
      const btn  = document.getElementById(`expand-${id}`);
      if (!list) return;
      const isOpen = list.classList.toggle('open');
      if (btn) btn.classList.toggle('open', isOpen);
    };
  }

  function variantRow(v, fam_id) {
    const cleanUom = App.Fmt.escapeHtml(v.uom || 'N/A');
    const cleanRaw = App.Fmt.escapeHtml(v.raw_uom || '');
    return `<div class="variant-row" onclick="App.UI.openDrawer('${v.records[0]?.id}')">
      <div class="variant-uom-badge">${cleanUom}</div>
      <div class="variant-name">
        MRP: ${v.mrp ? App.Fmt.currencyFull(v.mrp) : '—'}
        <span class="text-muted text-xs" style="margin-left:6px">${v.raw_uom !== v.uom ? `(raw: ${cleanRaw})` : ''}</span>
      </div>

      <div class="variant-stats">
        <div class="variant-stat">
          <div class="variant-stat-val">${App.Fmt.number(v.qty)}</div>
          <div class="variant-stat-lbl">Units</div>
        </div>
        <div class="variant-stat">
          <div class="variant-stat-val">${App.Fmt.weight(v.weight)}</div>
          <div class="variant-stat-lbl">Weight</div>
        </div>
        <div class="variant-stat">
          <div class="variant-stat-val">${App.Fmt.currency(v.value)}</div>
          <div class="variant-stat-lbl">Value</div>
        </div>
        <div class="variant-stat">
          <span class="badge ${statusBadge(v.records[0]?.raw_bad_inventory_type)}">${v.records[0]?.raw_bad_inventory_type || 'unknown'}</span>
        </div>
      </div>
    </div>`;
  }

  function statusBadge(type) {
    const t = (type||'').toLowerCase();
    if (t === 'damaged')     return 'badge-danger';
    if (t === 'expired')     return 'badge-purple';
    if (t.includes('expir')) return 'badge-warning';
    return 'badge-muted';
  }

  function kpi(label, value, icon, color) {
    return `<div class="kpi-card" style="--kpi-color:${color}">
      <div class="kpi-icon" style="background:${color}22;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
    </div>`;
  }

  return { render };
})();
