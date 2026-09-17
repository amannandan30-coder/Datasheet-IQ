const fs = require('fs');
const XLSX = require('./vendor/xlsx.full.min.js');

global.window = global;
global.App = {};
global.XLSX = XLSX;
global.crypto = require('crypto');

require('./js/utils/formatters.js');
require('./js/pipeline/validator.js');
require('./js/pipeline/parser.js');
require('./js/pipeline/cleaner.js');
require('./js/pipeline/categorizer.js');
require('./js/pipeline/brandEngine.js');
require('./js/pipeline/productEngine.js');
require('./js/pipeline/aggregator.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('======================================================================');
console.log('  WEIGHT/UOM ROOT-CAUSE FIX — REGRESSION & VERIFICATION SUITE');
console.log('======================================================================\n');

// ── PART 1: Focused Unit & Precedence Tests ──
console.log('----------------------------------------------------------------------');
console.log('  PART 1: Focused Unit & Precedence Tests');
console.log('----------------------------------------------------------------------');

// T1: 10 kg x 2 = 20 kg
const r1 = App.Cleaner.cleanRecord({
  name: 'Aashirvaad Superior MP Atta',
  Weight: '10 kg',
  qty: 2
});
assert(r1.total_weight === 20, '10 kg × 2 = 20 kg total mass');
assert(r1.weight === 10, '10 kg unit weight = 10 kg');
assert(r1.total_volume_l === 0, '10 kg produces 0 volume');
assert(r1.normalized_uom === '10 KG', '10 kg normalized_uom is 10 KG');
assert(r1.weight_source === 'source_unit_weight_qty', 'Weight source is source_unit_weight_qty');

// T2: 50 g x 2 = 0.1 kg
const r2 = App.Cleaner.cleanRecord({
  name: 'Darkins 70% Dark Chocolate',
  Weight: '50 g',
  qty: 2
});
assert(Math.abs(r2.total_weight - 0.1) < 1e-6, '50 g × 2 = 0.1 kg total mass');
assert(Math.abs(r2.weight - 0.05) < 1e-6, '50 g unit weight = 0.05 kg');
assert(r2.total_volume_l === 0, '50 g produces 0 volume');
assert(r2.normalized_uom === '50 G', '50 g normalized_uom is 50 G');

// T3: 1 L x 5 = 5 L
const r3 = App.Cleaner.cleanRecord({
  name: 'Real Fruit Power Apple Juice',
  Weight: '1 l',
  qty: 5
});
assert(r3.total_volume_l === 5, '1 L × 5 = 5 L total volume');
assert(r3.unit_volume_l === 1, '1 L unit volume = 1 L');
assert(r3.total_weight === 0, '1 L produces 0 mass (never converted to kg)');
assert(r3.normalized_uom === '1 L', '1 L normalized_uom is 1 L');

// T4: 500 ml x 2 = 1 L
const r4 = App.Cleaner.cleanRecord({
  name: 'Dhara Mustard Oil',
  Weight: '500 ml',
  qty: 2
});
assert(Math.abs(r4.total_volume_l - 1.0) < 1e-6, '500 ml × 2 = 1 L total volume');
assert(Math.abs(r4.unit_volume_l - 0.5) < 1e-6, '500 ml unit volume = 0.5 L');
assert(r4.total_weight === 0, '500 ml produces 0 mass');
assert(r4.normalized_uom === '500 ML', '500 ml normalized_uom is 500 ML');

// T5: 5 L x 2 = 10 L
const r5 = App.Cleaner.cleanRecord({
  name: 'Fortune Sunlite Sunflower Oil',
  Weight: '5 L',
  qty: 2
});
assert(r5.total_volume_l === 10, '5 L × 2 = 10 L total volume');
assert(r5.unit_volume_l === 5, '5 L unit volume = 5 L');
assert(r5.total_weight === 0, '5 L produces 0 mass');
assert(r5.normalized_uom === '5 L', '5 L normalized_uom is 5 L');

// T6: 24 x 250 ml x 1 = 6 L
const r6 = App.Cleaner.cleanRecord({
  name: 'Bisleri Mineral Water Pack',
  Weight: '24 x 250 ml',
  qty: 1
});
assert(Math.abs(r6.total_volume_l - 6.0) < 1e-6, '24 × 250 ml × 1 = 6.00 L total volume');
assert(Math.abs(r6.unit_volume_l - 6.0) < 1e-6, '24 × 250 ml unit volume = 6.00 L');
assert(r6.total_weight === 0, '24 × 250 ml produces 0 mass');
assert(r6.normalized_uom === '24 x 250 ml', '24 × 250 ml normalized_uom preserved');

// T7: 24 x 250 ml x 2 = 12 L
const r7 = App.Cleaner.cleanRecord({
  name: 'Bisleri Mineral Water Pack',
  Weight: '24 x 250 ml',
  qty: 2
});
assert(Math.abs(r7.total_volume_l - 12.0) < 1e-6, '24 × 250 ml × 2 = 12.00 L total volume');
assert(r7.total_weight === 0, '24 × 250 ml × 2 produces 0 mass');

// T8: 6 x 12.5 g x 1 = 0.075 kg
const r8 = App.Cleaner.cleanRecord({
  name: 'Open Secret Choco Almond Nutty Cookies',
  Weight: '6 x 12.5 g',
  qty: 1
});
assert(Math.abs(r8.total_weight - 0.075) < 1e-6, '6 × 12.5 g × 1 = 0.075 kg total mass');
assert(Math.abs(r8.weight - 0.075) < 1e-6, '6 × 12.5 g unit mass = 0.075 kg');
assert(r8.total_volume_l === 0, '6 × 12.5 g produces 0 volume');
assert(r8.weight_source === 'derived_mass_uom', '6 × 12.5 g weight source is derived_mass_uom');

// T9: 4 x 225 g x 1 = 0.900 kg
const r9 = App.Cleaner.cleanRecord({
  name: 'Patanjali Dishwash Bar Super Saver Pack',
  Weight: '4 x 225 g',
  qty: 1
});
assert(Math.abs(r9.total_weight - 0.9) < 1e-6, '4 × 225 g × 1 = 0.900 kg total mass');
assert(Math.abs(r9.weight - 0.9) < 1e-6, '4 × 225 g unit mass = 0.900 kg');
assert(r9.total_volume_l === 0, '4 × 225 g produces 0 volume');

// T10: 2 units preserves UOM
const r10 = App.Cleaner.cleanRecord({
  name: 'Godrej Aer Pocket Air Freshener',
  Weight: '2 units',
  qty: 1
});
assert(r10.normalized_uom === '2 UNIT', '2 units preserves UOM as 2 UNIT');
assert(r10.qty === 1, 'Quantity remains 1');
assert(r10.total_weight === 0, '2 units produces 0 mass');
assert(r10.total_volume_l === 0, '2 units produces 0 volume');

// T11: 1 pair preserves UOM
const r11 = App.Cleaner.cleanRecord({
  name: 'Scotch-Brite Heavy Duty Gloves',
  Weight: '1 pair',
  qty: 1
});
assert(r11.normalized_uom === '1 PAIR', '1 pair preserves UOM as 1 PAIR');
assert(r11.qty === 1, 'Quantity remains 1');
assert(r11.total_weight === 0, '1 pair produces 0 mass');
assert(r11.total_volume_l === 0, '1 pair produces 0 volume');

// T12: L/ml never becomes KG & No density conversion
const r12 = App.Cleaner.cleanRecord({
  name: 'Mother Dairy Pure Ghee',
  Weight: '1 l',
  qty: 10
});
assert(r12.total_weight === 0, 'L/ml never converted to KG (total_weight = 0)');
assert(r12.total_volume_l === 10, '1 L × 10 = 10 L volume tracked');

// T13: No double multiplication
const r13 = App.Cleaner.cleanRecord({
  name: 'Bisleri 24-pack',
  Weight: '24 x 250 ml',
  qty: 3
});
assert(Math.abs(r13.total_volume_l - 18.0) < 1e-6, '24 × 250 ml × 3 = 18.00 L (no double multiplication)');

// T14: Both Weight + variant_uom_text does not double-process
const r14 = App.Cleaner.cleanRecord({
  name: 'Dhara Mustard Oil',
  variant_uom_text: '500 ml',
  Weight: '500 ml',
  qty: 2
});
assert(Math.abs(r14.total_volume_l - 1.0) < 1e-6, 'Both Weight & variant_uom_text: volume is exactly 1.0 L');
assert(r14.total_weight === 0, 'Both Weight & variant_uom_text: mass is 0');

// T15: Source Total Weight precedence
const r15 = App.Cleaner.cleanRecord({
  name: 'Bulk Atta',
  'Total Weight': '50 kg',
  Weight: '10 kg',
  variant_uom_text: '5 kg',
  qty: 5
});
assert(r15.total_weight === 50, 'Source Total Weight takes top precedence (50 kg)');
assert(r15.weight_source === 'source_total_weight', 'Weight source is source_total_weight');

// T16: Source Weight numeric mass precedence over UOM
const r16 = App.Cleaner.cleanRecord({
  name: 'Sample Pack 200g in title',
  Weight: '10 kg',
  qty: 2
});
assert(r16.total_weight === 20, 'Source Weight numeric mass takes precedence over title mass');
assert(r16.weight_source === 'source_unit_weight_qty', 'Weight source is source_unit_weight_qty');

// ── PART 2: Real Workbook End-to-End Ingestion on Sheet2_cleaned_saleable.xlsx ──
console.log('\n----------------------------------------------------------------------');
console.log('  PART 2: Full Pipeline Reconciliation on Sheet2_cleaned_saleable.xlsx');
console.log('----------------------------------------------------------------------');

const buf = fs.readFileSync('B:/Excel File/Sheet2_cleaned_saleable.xlsx');
const fileObj = { name: 'Sheet2_cleaned_saleable.xlsx', size: buf.length, buffer: buf };
global.FileReader = class {
  readAsArrayBuffer(file) { setTimeout(() => { this.onload({ target: { result: file.buffer } }); }, 10); }
};

(async () => {
  const parsed = await App.Parser.parse(fileObj);
  const mapped = App.Parser.applyMapping(parsed.rows, {});
  const cleaned = App.Cleaner.cleanAll(mapped);

  let totalQty = 0;
  let totalMass = 0;
  let totalVolume = 0;
  let countWithMass = 0;
  let countWithVol = 0;
  let weightColLmlCount = 0;
  let compoundCount = 0;

  cleaned.forEach(r => {
    totalQty += (r.qty || 0);
    totalMass += (r.total_weight || 0);
    totalVolume += (r.total_volume_l || 0);
    if ((r.total_weight || 0) > 0) countWithMass++;
    if ((r.total_volume_l || 0) > 0) countWithVol++;
    const w = String(r.raw_weight || '');
    if (/(?:l|lt|ltr|ltrs|liter|litres|litre|ml|milliliter|millilitres)\b/i.test(w)) weightColLmlCount++;
    if (/\d+\s*(?:x|\*)\s*\d+/i.test(w)) compoundCount++;
  });

  console.log(`  Total Ingested Records:      ${cleaned.length}`);
  console.log(`  Total Inventory Qty:         ${totalQty}`);
  console.log(`  Total Mass:                  ${totalMass.toFixed(3)} kg`);
  console.log(`  Total Volume:                ${totalVolume.toFixed(3)} L`);
  console.log(`  Records with Mass:           ${countWithMass}`);
  console.log(`  Records with Volume:         ${countWithVol}`);
  console.log(`  Weight-col L/ml Records:     ${weightColLmlCount}`);
  console.log(`  Compound Descriptor Records: ${compoundCount}`);

  assert(cleaned.length === 5981, 'Total ingested records is 5,981');
  assert(totalQty === 7892, 'Total inventory quantity is 7,892');
  assert(countWithVol >= 870, `Volume extracted for ${countWithVol} records (expected >= 870)`);
  assert(countWithMass >= 4117, `Mass extracted for ${countWithMass} records (expected >= 4117)`);
  assert(totalVolume > 1100, `Total volume is ${totalVolume.toFixed(2)} L (expected > 1100 L)`);
  assert(totalMass > 6400, `Total mass is ${totalMass.toFixed(2)} kg (expected > 6400 kg)`);

  // ── PART 3: Verification of 20 Representative Rows ──
  console.log('\n----------------------------------------------------------------------');
  console.log('  PART 3: 20 Real Workbook Rows (Before vs After Verification)');
  console.log('----------------------------------------------------------------------');

  const testProducts = [
    { match: 'Aashirvaad Select Atta', expectedType: 'mass' },
    { match: 'Rajdhani Besan', expectedType: 'mass' },
    { match: 'Tata Salt', expectedType: 'mass' },
    { match: 'Dhampur Green', expectedType: 'mass' },
    { match: 'Darkins', expectedType: 'mass' },
    { match: 'Catch Chilli', expectedType: 'mass' },
    { match: 'Vibhor', expectedType: 'mass' },
    { match: 'Mother Dairy Cow Ghee', expectedType: 'volume' },
    { match: 'Sunflower Oil', expectedType: 'volume' },
    { match: 'Real Fruit Power', expectedType: 'volume' },
    { match: 'Fanta Orange', expectedType: 'volume' },
    { match: 'Dhara', expectedType: 'volume' },
    { match: 'Fogg', expectedType: 'volume' },
    { match: 'Knack Pro', expectedType: 'volume' },
    { match: 'Naturali', expectedType: 'volume' },
    { match: 'Bisleri', expectedType: 'volume' },
    { match: 'Pepsi', expectedType: 'volume' },
    { match: 'Open Secret', expectedType: 'mass' },
    { match: 'Patanjali Dishwash Bar', expectedType: 'mass' },
    { match: 'More Light Detergent', expectedType: 'mass' },
  ];

  let verifiedRows = 0;
  testProducts.forEach((tp, idx) => {
    const found = cleaned.find(r => (r.raw_product_name || '').toLowerCase().includes(tp.match.toLowerCase()));
    if (found) {
      verifiedRows++;
      console.log(`  Row ${idx + 1}: ${found.raw_product_name.substring(0, 40).padEnd(40)} | Wt: ${(found.raw_weight || '—').padEnd(12)} | Qty: ${String(found.qty).padEnd(3)} | UOM: ${(found.normalized_uom || '—').padEnd(12)} | Vol: ${String(found.total_volume_l).padEnd(6)} L | Mass: ${String(found.total_weight).padEnd(6)} kg`);
      if (tp.expectedType === 'volume' && /(?:l|lt|ml)/i.test(String(found.raw_weight))) {
        assert(found.total_volume_l > 0, `${tp.match} has positive volume (${found.total_volume_l} L)`);
        assert(found.total_weight === 0, `${tp.match} has 0 mass`);
      } else if (tp.expectedType === 'mass') {
        assert(found.total_weight > 0, `${tp.match} has positive mass (${found.total_weight} kg)`);
      }
    }
  });

  // ── PART 4: Oil/Litre Products Verification ──
  console.log('\n----------------------------------------------------------------------');
  console.log('  PART 4: Oil Products Verification (1L, 3L, 5L)');
  console.log('----------------------------------------------------------------------');

  const oilRecords = cleaned.filter(r => {
    const name = (r.raw_product_name || '').toLowerCase();
    const w = String(r.raw_weight || '').toLowerCase();
    return (name.includes('oil') || name.includes('ghee')) && (w.includes('1 l') || w.includes('3 l') || w.includes('5 l') || w.includes('1lt') || w.includes('1 lt') || w.includes('5l'));
  });

  console.log(`  Found ${oilRecords.length} Oil/Ghee records with 1L/3L/5L:`);
  oilRecords.slice(0, 10).forEach(r => {
    console.log(`    - ${r.raw_product_name.substring(0, 38).padEnd(38)} | Excel Weight: ${(r.raw_weight || '').padEnd(6)} | Qty: ${r.qty} | UOM: ${(r.normalized_uom || '').padEnd(6)} | unit_vol: ${r.unit_volume_l} L | total_vol: ${r.total_volume_l} L | total_weight: ${r.total_weight} kg`);
    assert(r.total_volume_l > 0, `Oil/ghee product ${r.raw_product_name.substring(0, 25)} has valid volume`);
    assert(r.total_weight === 0, `Oil/ghee product ${r.raw_product_name.substring(0, 25)} has 0 mass (no density inference)`);
  });

  // ── FINAL SUMMARY ──
  console.log('\n======================================================================');
  console.log(`  FINAL TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
})();
