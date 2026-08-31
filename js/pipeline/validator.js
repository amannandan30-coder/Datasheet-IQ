window.App = window.App || {};

/* ============================================================
   VALIDATOR — Excel file + column validation
   ============================================================ */
App.Validator = (() => {

  const EXPECTED_COLUMNS = [
    'entity_name','item_id','upc','name','brand',
    'variant_uom_text','variant_mrp','qty','variant_id',
    'bad_inventory_type','l0','Value','Weight','Total Weight','Type'
  ];

  const REQUIRED_COLUMNS = ['name'];  // flexible minimum

  // Enhanced Aliases for flexible column mapping across sheets & varied Excel files
  const COLUMN_ALIASES = {
    entity_name:       ['entity_name','entity','warehouse','location','store','entity name','wh_name','warehouse_name'],
    item_id:           ['item_id','itemid','item id','sku','sku_id','product_id','itemcode','item_code'],
    upc:               ['upc','barcode','ean','gtin','scan upc','scan_upc','scanupc'],
    name:              ['name','product_name','product name','item name','description','title','product_title','item_description'],
    brand:             ['brand','brand_name','manufacturer','make','brand name'],
    variant_uom_text:  ['variant_uom_text','uom','uom_text','unit','unit_of_measure','pack_size','size','pack_text','weight_uom'],
    variant_mrp:       ['variant_mrp','mrp','price','selling_price','sp','unit_mrp','variant mrp'],
    qty:               ['qty','quantity','units','stock','stock_qty','sum of qty','sum_of_qty','available_qty','total_qty'],
    variant_id:        ['variant_id','variant','sku_variant','variant id'],
    bad_inventory_type:['bad_inventory_type','inventory_type','type','condition','status','bad inventory type','inventory status'],
    l0:                ['l0','category','l0_category','main_category','category_name','l0 category'],
    Value:             ['Value','value','total_value','inv_value','inventory_value','total value','val'],
    Weight:            ['Weight','weight','unit_weight','net_weight','unit weight'],
    'Total Weight':    ['Total Weight','total_weight','totalweight','gross_weight','total weight','tot_weight'],
    Type:              ['Type','type','sub_type','item_type'],
  };

  /* Map raw headers to canonical names */
  function mapColumns(headers) {
    const headerLower = headers.map(h => (h||'').toString().trim().toLowerCase());
    const mapping = {}; // canonical → original header name

    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      let found = null;
      for (const alias of aliases) {
        const idx = headerLower.indexOf(alias.toLowerCase());
        if (idx !== -1) { found = headers[idx]; break; }
      }
      if (found) mapping[canonical] = found;
    }

    // Check missing
    const missing = EXPECTED_COLUMNS.filter(c => !mapping[c]);
    const missingRequired = REQUIRED_COLUMNS.filter(c => !mapping[c]);

    return { mapping, missing, missingRequired };
  }

  function validateFile(file) {
    const errors = [];
    if (!file) { errors.push('No file selected'); return { ok: false, errors }; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) {
      errors.push(`File type ".${ext}" not supported. Please upload .xlsx, .xls, or .csv`);
    }
    const MAX_MB = 100;
    if (file.size > MAX_MB * 1024 * 1024) {
      errors.push(`File too large (${(file.size/1024/1024).toFixed(1)} MB). Max ${MAX_MB} MB`);
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

  return { mapColumns, validateFile, validateRows, EXPECTED_COLUMNS, COLUMN_ALIASES };
})();
