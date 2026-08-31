const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, {type: 'buffer'});

console.log('=== WORKBOOK ANALYSIS ===');
console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach((sheetName) => {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, {defval: null});
  console.log(`\n--- SHEET: "${sheetName}" (${rows.length} records) ---`);
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]));
    
    // Sum numeric columns
    let totalQty = 0;
    let totalVal = 0;
    let totalWt = 0;
    
    rows.forEach(r => {
      totalQty += Number(r.qty || r['Sum of QTY'] || 0) || 0;
      totalVal += Number(r.Value || r.value || 0) || 0;
      totalWt += Number(r['Total Weight'] || r.total_weight || 0) || 0;
    });

    console.log(`Total Qty: ${totalQty}`);
    console.log(`Total Value: ${totalVal.toFixed(2)}`);
    console.log(`Total Weight: ${totalWt.toFixed(2)}`);
  }
});
