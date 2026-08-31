const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, {type: 'buffer'});

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, {defval: null});
  console.log(`\n========================================`);
  console.log(`SHEET: ${sheetName} | Row Count: ${rows.length}`);
  console.log(`========================================`);
  if (rows.length > 0) {
    console.log('Sample Row 0:', JSON.stringify(rows[0], null, 2));
    if (rows.length > 1) console.log('Sample Row 1:', JSON.stringify(rows[1], null, 2));
  }
});
