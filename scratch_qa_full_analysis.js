const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, {type: 'buffer'});

console.log('Sheet Names in File:', wb.SheetNames);

function analyzeSheet(sheetName) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, {defval: null});
  
  console.log(`\n======================================================`);
  console.log(`INDEPENDENT QA ANALYSIS: Sheet "${sheetName}"`);
  console.log(`Total Records: ${rows.length}`);
  console.log(`======================================================`);

  let totalQty = 0;
  let totalValue = 0;
  let totalWeight = 0;
  let damagedVal = 0;
  let nearExpiryVal = 0;
  
  const categories = {};
  const brands = {};
  const warehouses = {};
  const itemIds = new Set();
  const upcs = new Set();
  const statuses = {};

  // Atta tracking
  let attaQty = 0;
  let attaValue = 0;
  let attaWeight = 0;
  const attaBrands = {};

  // Electronics tracking
  let elecQty = 0;
  let elecValue = 0;
  let elecWeight = 0;
  const elecBrands = {};

  rows.forEach((r, idx) => {
    const qty = Number(r.qty || r.quantity || r['Sum of QTY'] || 0) || 0;
    const val = Number(r.Value || r.value || 0) || 0;
    const wt = Number(r['Total Weight'] || r.total_weight || (Number(r.Weight || r.weight || 0) * qty) || 0) || 0;
    const st = (r.bad_inventory_type || r.Type || 'unknown').toString().toLowerCase().trim();
    const l0 = (r.l0 || r.category || 'Uncategorized').toString().trim();
    const brand = (r.brand || 'Unknown').toString().trim();
    const wh = (r.entity_name || 'Unknown Warehouse').toString().trim();
    const name = (r.name || r['Product Name'] || '').toString().trim();

    totalQty += qty;
    totalValue += val;
    totalWeight += wt;

    if (r.item_id) itemIds.add(r.item_id);
    if (r.upc || r['Scan upc']) upcs.add(r.upc || r['Scan upc']);

    // Status
    if (st.includes('damaged')) damagedVal += val;
    if (st.includes('expir')) nearExpiryVal += val;
    statuses[st] = (statuses[st] || 0) + qty;

    // Categories
    if (!categories[l0]) categories[l0] = { count: 0, qty: 0, val: 0, wt: 0 };
    categories[l0].count++;
    categories[l0].qty += qty;
    categories[l0].val += val;
    categories[l0].wt += wt;

    // Brands
    if (!brands[brand]) brands[brand] = { count: 0, qty: 0, val: 0, wt: 0 };
    brands[brand].count++;
    brands[brand].qty += qty;
    brands[brand].val += val;
    brands[brand].wt += wt;

    // Warehouses
    if (!warehouses[wh]) warehouses[wh] = { count: 0, qty: 0, val: 0, wt: 0 };
    warehouses[wh].count++;
    warehouses[wh].qty += qty;
    warehouses[wh].val += val;
    warehouses[wh].wt += wt;

    // Atta Detection (check category or name/brand containing atta/flour)
    const isAtta = l0.toLowerCase().includes('atta') || 
                  name.toLowerCase().includes('atta') || 
                  name.toLowerCase().includes('chakki') ||
                  (name.toLowerCase().includes('flour') && !name.toLowerCase().includes('flower'));
    if (isAtta) {
      attaQty += qty;
      attaValue += val;
      attaWeight += wt;
      if (!attaBrands[brand]) attaBrands[brand] = { qty: 0, val: 0, wt: 0, count: 0 };
      attaBrands[brand].qty += qty;
      attaBrands[brand].val += val;
      attaBrands[brand].wt += wt;
      attaBrands[brand].count++;
    }

    // Electronics Detection
    const isElec = l0.toLowerCase().includes('electr') || 
                  l0.toLowerCase().includes('appliance') ||
                  name.toLowerCase().includes('led') ||
                  name.toLowerCase().includes('bulb') ||
                  name.toLowerCase().includes('trimmer') ||
                  name.toLowerCase().includes('battery');
    if (isElec) {
      elecQty += qty;
      elecValue += val;
      elecWeight += wt;
      if (!elecBrands[brand]) elecBrands[brand] = { qty: 0, val: 0, wt: 0, count: 0 };
      elecBrands[brand].qty += qty;
      elecBrands[brand].val += val;
      elecBrands[brand].wt += wt;
      elecBrands[brand].count++;
    }
  });

  console.log(`\n--- GLOBAL METRICS ---`);
  console.log(`Total Records: ${rows.length}`);
  console.log(`Unique Item IDs: ${itemIds.size}`);
  console.log(`Unique UPCs: ${upcs.size}`);
  console.log(`Total Qty: ${totalQty}`);
  console.log(`Total Value: ₹${totalValue.toFixed(2)}`);
  console.log(`Total Weight: ${totalWeight.toFixed(2)} KG`);
  console.log(`Damaged Value: ₹${damagedVal.toFixed(2)}`);
  console.log(`Near Expiry Value: ₹${nearExpiryVal.toFixed(2)}`);

  console.log(`\n--- CATEGORY BREAKDOWN ---`);
  Object.keys(categories).sort((a,b) => categories[b].val - categories[a].val).forEach(cat => {
    const c = categories[cat];
    console.log(`- "${cat}": ${c.count} recs, ${c.qty} units, ₹${c.val.toFixed(2)}, ${c.wt.toFixed(2)} KG`);
  });

  console.log(`\n--- TOP 10 BRANDS BY VALUE ---`);
  Object.keys(brands).sort((a,b) => brands[b].val - brands[a].val).slice(0, 10).forEach(bName => {
    const b = brands[bName];
    console.log(`- "${bName}": ${b.count} recs, ${b.qty} units, ₹${b.val.toFixed(2)}, ${b.wt.toFixed(2)} KG`);
  });

  console.log(`\n--- ATTA TEST ANALYSIS ---`);
  console.log(`Atta Total Qty: ${attaQty} units`);
  console.log(`Atta Total Value: ₹${attaValue.toFixed(2)}`);
  console.log(`Atta Total Weight: ${attaWeight.toFixed(2)} KG`);
  console.log(`Atta Brands Count: ${Object.keys(attaBrands).length}`);
  Object.keys(attaBrands).sort((a,b) => attaBrands[b].qty - attaBrands[a].qty).forEach(bName => {
    const b = attaBrands[bName];
    console.log(`  * ${bName}: ${b.qty} units, ₹${b.val.toFixed(2)}, ${b.wt.toFixed(2)} KG`);
  });

  console.log(`\n--- ELECTRONICS TEST ANALYSIS ---`);
  console.log(`Electronics Total Qty: ${elecQty} units`);
  console.log(`Electronics Total Value: ₹${elecValue.toFixed(2)}`);
  console.log(`Electronics Total Weight: ${elecWeight.toFixed(2)} KG`);
  console.log(`Electronics Brands Count: ${Object.keys(elecBrands).length}`);
  Object.keys(elecBrands).sort((a,b) => elecBrands[b].val - elecBrands[a].val).slice(0, 5).forEach(bName => {
    const b = elecBrands[bName];
    console.log(`  * ${bName}: ${b.qty} units, ₹${b.val.toFixed(2)}, ${b.wt.toFixed(2)} KG`);
  });
}

wb.SheetNames.forEach(analyzeSheet);
