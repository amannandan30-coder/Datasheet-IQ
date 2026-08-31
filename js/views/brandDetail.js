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
    container.innerHTML = `<div class="flex items-center gap-12"><div class="spinner"></div><span class="text-muted">Loading ${brandName}…</span></div>`;

    const records = await App.DB.getAllByIndex('inventory_records','dataset_id',dataset_id);
    let brandRecords = records.filter(r => r.normalized_brand === brandName || r.raw_brand === brandName);
    if (catName) brandRecords = brandRecords.filter(r => r.normalized_category === catName);

    if (!brandRecords.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div>No records for "${brandName}"</div></div>`;
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
    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div class="flex items-center gap-14">
          <div class="brand-avatar" style="width:52px;height:52px;font-size:22px;border-radius:14px">
            ${brandName[0]?.toUpperCase()||'?'}
          </div>
          <div>
            <div class="page-title">${brandName}</div>
            <div class="page-sub">${cats.join(' · ')} · ${families.length} product families</div>
          </div>
        </div>
        <div class="flex gap-8">
          <select class="select" onchange="filterFamilies(this.value)">
            <option value="">All Categories</option>
            ${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
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
            <div class="product-name">${fam.name || 'Unknown Product'}</div>
            <div class="product-meta">${variants.length} variant${variants.length!==1?'s':''} · ${fam.subcategory||''}</div>
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
    return `<div class="variant-row" onclick="App.UI.openDrawer('${v.records[0]?.id}')">
      <div class="variant-uom-badge">${v.uom || 'N/A'}</div>
      <div class="variant-name">
        MRP: ${v.mrp ? App.Fmt.currencyFull(v.mrp) : '—'}
        <span class="text-muted text-xs" style="margin-left:6px">${v.raw_uom !== v.uom ? `(raw: ${v.raw_uom})` : ''}</span>
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
