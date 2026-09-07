window.App = window.App || {};

/* ============================================================
   VALIDATOR — Excel file + column validation & error recovery
   ============================================================ */
App.Validator = (() => {

  const EXPECTED_COLUMNS = [
    'entity_name', 'item_id', 'upc', 'name', 'brand',
    'variant_uom_text', 'variant_mrp', 'qty', 'variant_id',
    'item_type', 'inventory_status', 'bad_inventory_type',
    'remarks', 'condition', 'disposition',
    'l0', 'subcategory', 'Value', 'Weight', 'Total Weight', 'Type'
  ];

  const REQUIRED_COLUMNS = ['name'];  // flexible minimum

  function normalizeHeader(h) {
    if (h == null) return '';
    return String(h)
      .toLowerCase()
      .trim()
      .replace(/[\-_\.]+/g, ' ')
      .replace(/[^a-z0-9\u0900-\u097F\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Enhanced Aliases for enterprise workbooks, distribution sheets & diverse ERPs
  const COLUMN_ALIASES = {
    entity_name: [
      'entity_vendor_name', 'entity vendor name', 'vendor_entity_name', 'vendor entity name', 'vendor_name', 'vendor name',
      'entity_name','entity','warehouse','location','store','entity name','wh_name','warehouse_name','wh name',
      'dc','distribution center','distribution_center','facility','storage facility','storage location','storage_location','plant',
      'warehouse location','warehouse_location','depot','wh','warehouse name'
    ],
    item_id: [
      'item_id','itemid','item id','sku','sku_id','sku id','product_id','product id','itemcode','item_code','item code',
      'material_id','material_code','material code','material id','sku code','sku_code',
      'article_code','article code','articlecode','material_number','material number','sku_number','sku number','mat_code','mat code'
    ],
    upc: [
      'upc','barcode','ean','gtin','scan upc','scan_upc','scanupc','upc code','upc_code','barcode no','barcode_no'
    ],
    name: [
      'name','product_name','product name','product description','product_description','product title','product_title',
      'product label','product_label','product','article','article name','article_name','item','item name','item_name',
      'item title','item_title','item description','item_description','description','title',
      'sku description','sku_description','sku name','sku_name','material','material name','material_name',
      'material description','material_description','style product','style / product','product style','style','style description',
      'product details','product_details','item details','item_details','item desc','item_desc','prod_name','prod name'
    ],
    brand: [
      'brand','brand_name','brand name','product brand','product_brand','manufacturer','mfr','make','vendor','principal','principal brand','principal_brand',
      'mfr_brand','mfr brand','manufacturer_brand','mfr_name','mfr name','brand label','brand_label'
    ],
    variant_uom_text: [
      'variant_uom_text','uom','uom_text','uom text','unit','unit_of_measure','unit of measure','pack_size','pack size','size','pack_text','pack text','weight_uom','weight uom','pack',
      'uom_code','uom code','pack_spec','pack spec','uom description','packaging'
    ],
    variant_mrp: [
      'variant_mrp','variant mrp','mrp','price','selling_price','selling price','sp','unit_mrp','unit mrp',
      'unit price','unit_price','rate','unit rate','unit_rate','cost','unit cost','unit_cost','list price','list_price',
      'currency unit rate','currency_unit_rate','rate per unit',
      'mrp_inr','mrp inr','unit_price_inr','unit price inr','rate_inr','rate inr','unit rate inr','mrp (inr)','unit price (inr)'
    ],
    qty: [
      'qty','quantity','units','units in stock','units_in_stock','inventory','stock','stock_qty','stock qty',
      'available_qty','available qty','available stock','available_stock','closing stock','closing_stock','on hand','on_hand',
      'net qty','net_qty','gross qty','gross_qty','total units','total_units','total qty','total_qty','sum of qty','sum_of_qty','sum of quantity','count',
      'qty_in_hand','qty in hand','qty on hand','stock on hand','current stock','current_stock','closing_units'
    ],
    variant_id: [
      'variant_id','variant','sku_variant','variant id','sku variant'
    ],
    item_type: [
      'item_type','item type','type','sub_type','sub type','stock_type','stock type','inventory_type','inventory type',
      'material_type','material type','product_type','product type'
    ],
    Type: [
      'type','Type','item_type','item type','sub_type','sub type'
    ],
    inventory_status: [
      'status','inventory_status','inventory status','stock_status','stock status','item_status','item status',
      'inv_status','inv status','quality_status','quality status','inventory_state','inventory state',
      'sellability','saleability','sellable_status','saleable_status'
    ],
    bad_inventory_type: [
      'bad_inventory_type','bad inventory type','bad_inv_type','bad inv type','damage_type','damage type',
      'damage_reason','damage reason','defect_type','defect type','rejection_type','rejection type',
      'fault_type','fault type','loss_type','loss type'
    ],
    remarks: [
      'remarks','remark','item_remarks','item remarks','notes','note','comments','comment',
      'reason','reasons','narrative','item_notes','item notes','description_remarks'
    ],
    condition: [
      'condition','stock_condition','stock condition','item_condition','item condition',
      'grade','stock grade','stock_grade','quality','quality_grade','item_grade'
    ],
    disposition: [
      'disposition','item_disposition','item disposition','action','action_type','action type',
      'recommended_action','recommended action','lot_disposition'
    ],
    l0: [
      'l0','category','category name','category_name','product category','product_category','main category','main_category',
      'l0_category','l0 category','department','segment','group','division','domain'
    ],
    subcategory: [
      'subcategory','sub category','sub_category','sub group','sub_group','class','product class','product_class','l1','l1 category','l1_category'
    ],
    Value: [
      'Value','value','total value','total_value','amount','total amount','total_amount','inventory value','inventory_value',
      'stock value','stock_value','inv amount','inv_amount','inv value','inv_value','valuation','total valuation','total_valuation',
      'extended cost','extended_cost','extended amount','extended_amount','total extended amount','total_extended_amount',
      'line total','line_total','total inv value','total_inv_value','net valuation','net_valuation','net amount','net_amount','val','stock val',
      'valuation_amount','valuation amount','stock_valuation','stock valuation','extended_value','extended value'
    ],
    Weight: [
      'Weight','weight','unit weight','unit_weight','unit weight kg','unit_weight_kg','item weight','item_weight','piece weight','piece_weight',
      'weight kg','weight_kg','net weight','net_weight','net weight kg','net_weight_kg','net weight spec','net_weight_spec',
      'net wt','net_wt','net wt kg','net_wt_kg','single weight'
    ],
    'Total Weight': [
      'Total Weight','total weight','total weight kg','total_weight_kg','total_weight','totalweight',
      'gross weight','gross_weight','gross weight kg','gross_weight_kg','gross wt','gross_wt','gross wt kg','gross_wt_kg',
      'total wt','total_wt','total wt kg','total_wt_kg','tot_weight','tot weight','batch weight','batch_weight','total gross weight'
    ],
  };

  /**
   * Suggests near-matches for missing columns to help the user identify headers
   */
  function suggestColumnMatches(rawHeaders, missingCols) {
    const suggestions = {};
    const normalizedRaw = (rawHeaders || []).map(h => ({ raw: h, norm: normalizeHeader(h) }));

    for (const missing of missingCols) {
      const targetAliases = COLUMN_ALIASES[missing] || [missing];
      let bestCandidate = null;
      let highestSimilarity = 0;

      for (const { raw, norm } of normalizedRaw) {
        for (const alias of targetAliases) {
          const normAlias = normalizeHeader(alias);
          if (norm.includes(normAlias) || normAlias.includes(norm)) {
            const sim = Math.min(norm.length, normAlias.length) / Math.max(norm.length, normAlias.length);
            if (sim > highestSimilarity && sim > 0.4) {
              highestSimilarity = sim;
              bestCandidate = raw;
            }
          }
        }
      }

      if (bestCandidate) {
        suggestions[missing] = bestCandidate;
      }
    }
    return suggestions;
  }

  /* Map raw headers to canonical names */
  function mapColumns(headers) {
    const rawHeaders = headers || [];
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const mapping = {}; // canonical -> original header name

    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      let found = null;
      for (const alias of aliases) {
        const normAlias = normalizeHeader(alias);
        const idx = normalizedHeaders.indexOf(normAlias);
        if (idx !== -1) { found = rawHeaders[idx]; break; }
      }
      if (found) mapping[canonical] = found;
    }

    // Check missing
    const missing = EXPECTED_COLUMNS.filter(c => !mapping[c]);
    const missingRequired = REQUIRED_COLUMNS.filter(c => !mapping[c]);
    const suggestions = suggestColumnMatches(rawHeaders, missingRequired);

    return { mapping, missing, missingRequired, suggestions };
  }

  function validateFile(file) {
    const errors = [];
    if (!file) { errors.push('No file selected'); return { ok: false, errors }; }
    const name = file.name || '';
    const ext = name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) {
      errors.push(`File type ".${ext}" is not supported. Please upload a valid .xlsx, .xls, or .csv spreadsheet.`);
    }
    const MAX_MB = 100;
    if (file.size > MAX_MB * 1024 * 1024) {
      errors.push(`File too large (${(file.size/1024/1024).toFixed(1)} MB). Maximum allowed size is ${MAX_MB} MB.`);
    }
    if (file.size === 0) {
      errors.push('The selected file is empty (0 bytes).');
    }
    return { ok: errors.length === 0, errors };
  }

  function validateRows(rows, mapping) {
    const valid   = [];
    const review  = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIssues = [];

      const name  = row[mapping.name] || row.name;
      const qty   = row[mapping.qty]  || row.qty;

      if (!name || String(name).trim() === '') rowIssues.push('Missing product name');
      if (qty != null && isNaN(Number(qty)))  rowIssues.push('Invalid quantity format');

      if (rowIssues.length === 0) valid.push(i);
      else review.push({ rowIndex: i, issues: rowIssues });
    }

    return { valid, review };
  }

  return { mapColumns, validateFile, validateRows, suggestColumnMatches, normalizeHeader, EXPECTED_COLUMNS, COLUMN_ALIASES };
})();
