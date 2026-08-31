const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

const COLUMN_ALIASES = {
  entity_name:       ['entity_name','entity','warehouse','location','store'],
  item_id:           ['item_id','itemid','item id','sku','sku_id'],
  upc:               ['upc','barcode','ean','gtin','scan upc','scan_upc'],
  name:              ['name','product_name','product name','item name','description'],
  brand:             ['brand','brand_name','manufacturer'],
  variant_uom_text:  ['variant_uom_text','uom','uom_text','unit','unit_of_measure','pack_size'],
  variant_mrp:       ['variant_mrp','mrp','price','selling_price','sp'],
  qty:               ['qty','quantity','units','stock','stock_qty','sum of qty','sum_of_qty'],
  variant_id:        ['variant_id','variant','sku_variant'],
  bad_inventory_type:['bad_inventory_type','inventory_type','type','condition','status'],
  l0:                ['l0','category','l0_category','main_category'],
  Value:             ['Value','value','total_value','inv_value','inventory_value'],
  Weight:            ['Weight','weight','unit_weight','net_weight'],
  'Total Weight':    ['Total Weight','total_weight','totalweight','gross_weight'],
  Type:              ['Type','type','inventory_type'],
};

function mapColumns(headers) {
  const headerLower = headers.map(h => (h||'').toString().trim().toLowerCase());
  const mapping = {};
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = headerLower.indexOf(alias.toLowerCase());
      if (idx !== -1) { mapping[canonical] = headers[idx]; break; }
    }
  }
  return mapping;
}

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, {type: 'buffer'});

let allCombinedRecords = [];
let sheetBreakdown = [];

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {header: 1, defval: null, raw: true});
  if (aoa.length < 2) return;

  const headers = aoa[0].map(h => h == null ? '' : String(h).trim());
  const mapping = mapColumns(headers);
  const dataRows = aoa.slice(1).filter(r => r.some(c => c != null && c !== ''));

  let sheetQty = 0;
  let sheetValue = 0;
  let sheetWeight = 0;

  const mapped = dataRows.map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    
    const rec = { _sheet_name: sheetName, _raw: obj };
    for (const [canonical, originalHeader] of Object.entries(mapping)) {
      rec[canonical] = obj[originalHeader] ?? null;
    }

    const qty = Number(rec.qty) || 0;
    const val = Number(rec.Value) || 0;
    const wt = Number(rec['Total Weight']) || (Number(rec.Weight || 0) * qty) || 0;

    sheetQty += qty;
    sheetValue += val;
    sheetWeight += wt;

    return rec;
  });

  sheetBreakdown.push({ sheetName, rowCount: mapped.length, qty: sheetQty, val: sheetValue, wt: sheetWeight });
  allCombinedRecords = allCombinedRecords.concat(mapped);
});

console.log('=== MULTI-SHEET COMBINED ANALYSIS ===');
console.table(sheetBreakdown);

let totalQty = allCombinedRecords.reduce((s,r) => s + (Number(r.qty)||0), 0);
let totalVal = allCombinedRecords.reduce((s,r) => s + (Number(r.Value)||0), 0);
let totalWt  = allCombinedRecords.reduce((s,r) => s + (Number(r['Total Weight']) || (Number(r.Weight||0)*Number(r.qty||0)) || 0), 0);

console.log(`\nCOMBINED TOTALS across ${allCombinedRecords.length} records:`);
console.log(`- Total Qty: ${totalQty}`);
console.log(`- Total Value: ₹${totalVal.toFixed(2)}`);
console.log(`- Total Weight: ${totalWt.toFixed(2)} KG`);
