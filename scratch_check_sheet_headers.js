const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, {type: 'buffer'});

console.log('=== MULTI-SHEET COLUMN MAPPING ANALYSIS ===');

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {header: 1});
  if (aoa.length < 2) return;
  const headers = aoa[0].map(h => (h||'').toString().trim());
  console.log(`Sheet "${sheetName}": ${aoa.length - 1} data rows`);
  console.log(`  Headers (${headers.length}):`, headers);
});
