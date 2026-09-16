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
    const totalMass  = brandRecords.reduce((s,r) => s+(r.total_weight||0), 0);
    const totalVolume= brandRecords.reduce((s,r) => s+(r.total_volume_l||0), 0);
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
        qty:0, value:0, weight:0, mass:0, volume:0,
        variants: new Map(), // variant_id → variant
        records: [],
      });
      const f = familyMap.get(fid);
      f.qty    += (r.qty||0);
      f.value  += (r.source_value||0);
      f.weight += (r.total_weight||0);
    f.mass   += (r.total_weight||0);
    f.volume += (r.total_volume_l||0);
      f.records.push(r);

      // Group variants
      const vid = r.product_variant_id;
      if (!f.variants.has(vid)) f.variants.set(vid, {
        id: vid, uom: r.normalized_uom||r.raw_uom||'', mrp: r.variant_mrp,
        raw_uom: r.raw_uom, qty:0, value:0, weight:0, mass:0, volume:0, records:[]
      });
      const v = f.variants.get(vid);
      v.qty    += (r.qty||0);
      v.value  += (r.source_value||0);
      v.weight += (r.total_weight||0);
    v.mass   += (r.total_weight||0);
    v.volume += (r.total_volume_l||0);
      v.records.push(r);
    }

    const families = [...familyMap.values()].sort((a,b) => b.value - a.value);

    container.innerHTML = '';

    /* ── Header Meta & Chips ──────────────────────────────── */
    let categoryChipsHtml = '';
    if (catName && subcatName) {
      categoryChipsHtml = `<span class="brand-header-chip chip-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>${App.Fmt.escapeHtml(catName)} › ${App.Fmt.escapeHtml(subcatName)}</span>`;
    } else if (catName) {
      categoryChipsHtml = `<span class="brand-header-chip chip-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>${App.Fmt.escapeHtml(catName)}</span>`;
    } else if (cats.length === 1) {
      categoryChipsHtml = `<span class="brand-header-chip chip-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>${App.Fmt.escapeHtml(cats[0])}</span>`;
    } else if (cats.length > 1) {
      categoryChipsHtml = `<span class="brand-header-chip chip-accent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>${cats.length} Categories</span>`;
    }

    let filterControlsHtml = '';
    if (subcatName) {
      filterControlsHtml = `
        <div class="brand-context-badge">
          <span>Context: ${App.Fmt.escapeHtml(catName)} › ${App.Fmt.escapeHtml(subcatName)}</span>
          <button class="brand-context-clear" onclick="App.Router.go('brand',{id:'${encodeURIComponent(brandName)}'})" title="Clear filter (View all products of ${App.Fmt.escapeHtml(brandName)})">✕</button>
        </div>`;
    } else if (catName) {
      filterControlsHtml = `
        <div class="brand-context-badge">
          <span>Context: ${App.Fmt.escapeHtml(catName)}</span>
          <button class="brand-context-clear" onclick="App.Router.go('brand',{id:'${encodeURIComponent(brandName)}'})" title="Clear filter (View all products of ${App.Fmt.escapeHtml(brandName)})">✕</button>
        </div>`;
    } else {
      filterControlsHtml = `
        <div class="brand-select-wrap">
          <select class="select brand-category-select" onchange="filterFamilies(this.value)" aria-label="Filter by category">
            <option value="">All Categories</option>
            ${cats.map(c=>`<option value="${App.Fmt.escapeHtml(c)}">${App.Fmt.escapeHtml(c)}</option>`).join('')}
          </select>
        </div>`;
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="brand-detail-header mb-24">
        <div class="brand-header-identity">
          <div class="brand-header-avatar">
            ${(brandName[0] || '?').toUpperCase()}
          </div>
          <div class="brand-header-info">
            <h1 class="brand-header-title">${App.Fmt.escapeHtml(brandName)}</h1>
            <div class="brand-header-chips">
              ${categoryChipsHtml}
              <span class="brand-header-chip chip-neutral">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                ${families.length} Product ${families.length === 1 ? 'Family' : 'Families'}
              </span>
            </div>
          </div>
        </div>
        <div class="brand-header-actions">
          ${filterControlsHtml}
        </div>
      </div>

      <div class="brand-kpi-grid mb-24">
        ${kpi('SKUs',    App.Fmt.number(totalSKUs),    '📦', '#6366f1')}
        ${kpi('Units',   App.Fmt.number(totalUnits),   '📊', '#10b981')}
        ${kpi('Value',   App.Fmt.currency(totalValue), '💰', '#f59e0b')}
        ${kpi('Total Mass',   App.Fmt.mass(totalMass),      '⚖️', '#38bdf8')}
        ${kpi('Total Volume', App.Fmt.volume(totalVolume),  '🧪', '#06b6d4')}
      </div>

      <div class="section-header product-families-header">
        <div class="section-title">Product Families</div>
        <div class="product-search-wrap">
          <input class="input product-search-input" placeholder="Search products…" 
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
        <div class="product-row-header" onclick="toggleFamily('${fam.id}')" role="button" tabindex="0" aria-expanded="false">
          <div class="product-card-top">
            <div class="product-expand-btn" id="expand-${fam.id}" aria-label="Expand product family">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            <div class="product-name-block">
              <div class="product-name">${App.Fmt.escapeHtml(fam.name || 'Unknown Product')}</div>
              <div class="product-meta">
                <span class="product-meta-badge">${variants.length} ${variants.length!==1?'variants':'variant'}</span>
                <span class="product-meta-dot" aria-hidden="true">•</span>
                <span class="product-meta-subcat">${App.Fmt.escapeHtml(fam.subcategory || fam.category || '')}</span>
              </div>
            </div>
          </div>
          <div class="product-summary-stats">
            <div class="product-summary-stat product-summary-units">
              <div class="product-summary-val">${App.Fmt.number(fam.qty)}</div>
              <div class="product-summary-lbl">Units</div>
            </div>
            <div class="product-summary-stat product-summary-mass">
              <div class="product-summary-val">${fam.mass > 0 ? App.Fmt.mass(fam.mass) : "—"}</div>
              <div class="product-summary-lbl">Mass</div>
            </div>
            <div class="product-summary-stat product-summary-vol">
              <div class="product-summary-val">${fam.volume > 0 ? App.Fmt.volume(fam.volume) : "—"}</div>
              <div class="product-summary-lbl">Volume</div>
            </div>
            <div class="product-summary-stat product-summary-val-col">
              <div class="product-summary-val product-val-highlight">${App.Fmt.currency(fam.value)}</div>
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

      function getRecordMassProvenance(r) {
    if (!r || !(r.total_weight > 0)) return null;
    if (r.source_total_weight_kg != null && r.source_total_weight_kg > 0) {
      return {
        type: 'source_total',
        label: 'Source col',
        description: 'Source Total Weight column'
      };
    }
    if (r.weight_source === 'source_unit_weight_qty' || r.weight_source === 'source_unit_weight') {
      return {
        type: 'source_unit',
        label: 'Source col',
        description: 'Source Unit Weight column'
      };
    }
    const unitMassStr = r.weight ? App.Fmt.mass(r.weight) : (r.qty > 0 ? App.Fmt.mass(r.total_weight / r.qty) : '');
    const totalMassStr = App.Fmt.mass(r.total_weight);
    const mathStr = (unitMassStr && r.qty > 1) ? (unitMassStr + ' × ' + r.qty + ' = ' + totalMassStr) : totalMassStr;
    return {
      type: 'package_derived',
      label: 'Name/package-derived',
      description: 'Package-derived mass: ' + mathStr
    };
  }

  function getVariantMassProvenance(records, totalQty, totalMass) {
    const massRecs = (records || []).filter(r => (r.total_weight || 0) > 0);
    if (massRecs.length === 0) return { label: '', title: '' };

    const provs = massRecs.map(getRecordMassProvenance).filter(Boolean);
    if (provs.length === 0) return { label: '', title: '' };

    const types = new Set(provs.map(p => p.type));

    if (types.size === 1) {
      const p = provs[0];
      if (p.type === 'package_derived') {
        const firstRec = massRecs[0];
        const unitMass = firstRec.weight || (firstRec.qty > 0 ? firstRec.total_weight / firstRec.qty : 0);
        const unitMassStr = unitMass > 0 ? App.Fmt.mass(unitMass) : '';
        const totalMassStr = App.Fmt.mass(totalMass);
        const formula = (unitMassStr && totalQty > 1) ? (unitMassStr + ' × ' + totalQty + ' = ' + totalMassStr) : totalMassStr;
        return {
          label: 'Name/package-derived',
          title: 'Package-derived mass: ' + formula
        };
      }
      return {
        label: p.label,
        title: 'Mass source: ' + p.description
      };
    }

    const descList = [...new Set(provs.map(p => p.description))].join('; ');
    return {
      label: 'Mixed sources',
      title: 'Mixed sources: ' + descList
    };
  }

  function variantRow(v, fam_id) {
    const cleanUom = App.Fmt.escapeHtml(v.uom || 'N/A');
    const cleanRaw = App.Fmt.escapeHtml(v.raw_uom || '');
    const firstRec = v.records[0] || {};
    
    const massProv = v.mass > 0 ? getVariantMassProvenance(v.records, v.qty, v.mass) : { label: '', title: '' };
    
    let volumeProvenanceTitle = '';
    if (v.volume > 0) {
      const volFormula = v.qty > 1 ? (cleanUom + ' × ' + v.qty + ' = ' + App.Fmt.volume(v.volume)) : cleanUom;
      volumeProvenanceTitle = 'Volume source: Variant UOM declaration (' + volFormula + ')';
    }

    return `<div class="variant-row" onclick="App.UI.openDrawer('${firstRec.id}')">
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
        <div class="variant-stat" ${massProv.title ? `title="${App.Fmt.escapeHtml(massProv.title)}"` : ''}>
          <div class="variant-stat-val">${v.mass > 0 ? App.Fmt.mass(v.mass) : "—"}</div>
          <div class="variant-stat-lbl">Mass</div>
          ${massProv.label ? `<div style="font-size:9px;color:var(--text-muted);opacity:0.85;margin-top:2px">${massProv.label}</div>` : ''}
        </div>
        <div class="variant-stat" ${volumeProvenanceTitle ? `title="${App.Fmt.escapeHtml(volumeProvenanceTitle)}"` : ''}>
          <div class="variant-stat-val">${v.volume > 0 ? App.Fmt.volume(v.volume) : "—"}</div>
          <div class="variant-stat-lbl">Volume</div>
          ${v.volume > 0 ? `<div style="font-size:9px;color:var(--text-muted);opacity:0.85;margin-top:2px">Variant UOM</div>` : ''}
        </div>
        <div class="variant-stat">
          <div class="variant-stat-val">${App.Fmt.currency(v.value)}</div>
          <div class="variant-stat-lbl">Value</div>
        </div>
        <div class="variant-stat">
          <span class="badge ${statusBadge(firstRec.raw_bad_inventory_type)}">${firstRec.raw_bad_inventory_type || 'unknown'}</span>
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
