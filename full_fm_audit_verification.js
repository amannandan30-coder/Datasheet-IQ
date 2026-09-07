const fs = require('fs');
(async () => {
  const XLSX = require('./vendor/xlsx.full.min.js');
  global.XLSX = XLSX;
  global.window = global;
  global.document = { createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  global.FileReader = class { readAsArrayBuffer(file) { setTimeout(() => { this.onload({ target: { result: file.buffer || file } }); }, 5); } };
  global.App = {};
  eval(fs.readFileSync('./js/pipeline/validator.js', 'utf8'));
  eval(fs.readFileSync('./js/pipeline/parser.js', 'utf8'));
  eval(fs.readFileSync('./js/pipeline/cleaner.js', 'utf8'));
  eval(fs.readFileSync('./js/pipeline/inventoryStatusResolver.js', 'utf8'));
  eval(fs.readFileSync('./js/pipeline/categorizer.js', 'utf8'));
  eval(fs.readFileSync('./js/pipeline/reportingMapper.js', 'utf8'));
  const buf = fs.readFileSync('edit sheet.xlsx');
  const parsed = await App.Parser.parse({ name: 'edit sheet.xlsx', size: buf.length, buffer: buf });
  const cleaned = App.Cleaner.cleanAll(parsed.rows);
  const categorized = App.Categorizer.processAll(cleaned);
  categorized.forEach((r, idx) => { r._source_row = r._source_row || (idx + 2); });
  const fullAudit = {};
  for (const [bucket, cfg] of Object.entries(App.ReportingMapper.GROFERS_FM_BUCKET_CONFIG)) {
    const recon = App.ReportingMapper.getCategoryReconciliation(null, bucket, categorized);
    fullAudit[bucket] = {
      bucket, targetValue: cfg.target, scopeRule: cfg.scopeRule, allowedSheets: cfg.allowedSheets,
      businessRowsCount: recon.business.records, businessValue: recon.business.value,
      canonicalRowsCount: recon.canonical.records, canonicalValue: recon.canonical.value,
      unitsDelta: recon.unitsDelta, valueDelta: recon.valueDelta,
      missingRowsCount: recon.missingRows, extraRowsCount: recon.extraRows,
      missingRows: recon.reconciliation.businessOnlyRows.map(r => ({ sheet: r._sheet_name || 'Saleable', sourceRow: r._source_row, name: r.normalized_product_name, brand: r.normalized_brand, qty: r.qty, value: r.source_value, canonicalCategory: r.category, canonicalSubcategory: r.subcategory })),
      extraRows: recon.reconciliation.canonicalOnlyRows.map(r => ({ sheet: r._sheet_name || 'Saleable', sourceRow: r._source_row, name: r.normalized_product_name, brand: r.normalized_brand, qty: r.qty, value: r.source_value, canonicalCategory: r.category, canonicalSubcategory: r.subcategory }))
    };
  }
  fs.writeFileSync('scratch_full_20_bucket_detailed_audit.json', JSON.stringify(fullAudit, null, 2));
  console.log('Saved 20 bucket detailed audit to scratch_full_20_bucket_detailed_audit.json');
  console.log('--- 20 FM BUCKET DETAILED RECONCILIATION SUMMARY ---');
  for (const [b, data] of Object.entries(fullAudit)) {
    console.log(b.padEnd(32) + ' | Target: ' + String(data.targetValue).padStart(7) + ' | BizVal: ' + String(data.businessValue).padStart(7) + ' | CanVal: ' + String(data.canonicalValue).padStart(9) + ' | Missing: ' + String(data.missingRowsCount).padStart(3) + ' | Extra: ' + String(data.extraRowsCount).padStart(3) + ' | ValDelta: ' + data.valueDelta);
  }
})();