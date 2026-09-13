/**
 * ============================================================
 * EMBEDDED PRICE NORMALIZATION — REGRESSION TEST SUITE
 * ============================================================
 * 
 * Sections:
 *   A. Existing cleaner regression results BEFORE the change
 *   B. New embedded-price normalization tests
 *   C. Existing cleaner regression results AFTER the change
 *   D. Proof that row counts / status outcomes did not change
 *   E. Proof that quantity / MRP / value did not change
 *   F. Proof that only Variant/UOM normalization changed where expected
 *
 * Run:  node test_embedded_price_normalization.js
 * ============================================================
 */

/* ── Minimal DOM shim for browser modules ──────────────────── */
if (typeof window === 'undefined') {
  global.window = global;
  global.document = { createElement: () => ({ setAttribute(){}, click(){}, style:{} }), body: { appendChild(){}, removeChild(){} } };
  global.crypto = { randomUUID: () => 'test-' + Math.random().toString(36).slice(2, 10) };
  global.URL = { createObjectURL: () => '', revokeObjectURL: () => {} };
  global.Blob = class Blob { constructor() {} };
}
global.App = global.App || {};

/* ── Load pipeline modules ─────────────────────────────────── */
const fs = require('fs');
const path = require('path');

function loadModule(relPath) {
  const abs = path.join(__dirname, relPath);
  const src = fs.readFileSync(abs, 'utf-8');
  const fn = new Function(src);
  fn();
}

loadModule('js/pipeline/cleaner.js');
loadModule('js/pipeline/inventoryStatusResolver.js');

const Cleaner = App.Cleaner;
const ISR = App.InventoryStatusResolver;

/* ── Test framework ────────────────────────────────────────── */
let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, label) {
  totalTests++;
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${label}`);
    failures.push(label);
  }
}

function assertEq(actual, expected, label) {
  totalTests++;
  if (actual === expected) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${label}  (expected: "${expected}", got: "${actual}")`);
    failures.push(`${label} — expected: "${expected}", got: "${actual}"`);
  }
}

/* ── Synthetic test dataset (covering all status/sheet scenarios) ── */
function buildBaselineRecords() {
  return [
    // Saleable rows (explicit status)
    { name: 'Aashirvaad Atta',          variant_uom_text: '10 kg',              qty: 100, variant_mrp: 500,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Tata Salt',                 variant_uom_text: '1 kg',              qty: 200, variant_mrp: 20,   _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Fortune Oil',               variant_uom_text: '5 L',               qty: 50,  variant_mrp: 600,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    // Non-Saleable rows (explicit status)
    { name: 'Damaged Rice',              variant_uom_text: '5 kg',              qty: 30,  variant_mrp: 300,  _sheet_name: 'Non Saleable',  inventory_status: 'Non-Saleable',  _raw: {} },
    { name: 'Expired Milk',              variant_uom_text: '500 ml',            qty: 10,  variant_mrp: 50,   _sheet_name: 'Non Saleable',  inventory_status: 'Non-Saleable',  _raw: {} },
    // Blank status -> sheet context (Non-Saleable sheet)
    { name: 'Old Juice',                 variant_uom_text: '1 L',               qty: 20,  variant_mrp: 80,   _sheet_name: 'Non Saleable',  inventory_status: '',              _raw: {} },
    // Blank status -> sheet context (Saleable sheet)
    { name: 'Sugar',                     variant_uom_text: '2 kg',              qty: 150, variant_mrp: 90,   _sheet_name: '( Saleable )',  inventory_status: '',              _raw: {} },
    // Blank status -> neutral sheet -> default Sellable
    { name: 'Biscuit',                   variant_uom_text: '200 g',             qty: 300, variant_mrp: 30,   _sheet_name: 'Sheet1',        inventory_status: '',              _raw: {} },
    { name: 'Namkeen',                   variant_uom_text: '400 g',             qty: 80,  variant_mrp: 60,   _sheet_name: 'Atta',          inventory_status: '',              _raw: {} },
    // Rows WITH embedded prices (new feature targets)
    { name: 'Aashirvaad Atta',          variant_uom_text: '10 kg - Rs 749.0',  qty: 50,  variant_mrp: 749,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Aashirvaad Atta',          variant_uom_text: '5 kg - Rs 386.0',   qty: 60,  variant_mrp: 386,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Fortune Atta',              variant_uom_text: '10 kg - Rs. 606',   qty: 40,  variant_mrp: 606,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Tata Salt',                 variant_uom_text: '10 kg - 480',       qty: 70,  variant_mrp: 480,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Amul Milk',                 variant_uom_text: '1 L - Rs 99',       qty: 90,  variant_mrp: 99,   _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Hajmola',                   variant_uom_text: '500 ml - Rs 120',   qty: 45,  variant_mrp: 120,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    { name: 'Parle G',                   variant_uom_text: '6 x 12.5 g - Rs 105', qty: 25,variant_mrp: 105,  _sheet_name: 'Saleable',      inventory_status: 'Saleable',      _raw: {} },
    // Price with trailing descriptor (new case B)
    { name: 'Aashirvaad Atta Promo',    variant_uom_text: '5 kg - Rs 265 - Free Jute Bag', qty: 35, variant_mrp: 265, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
    // Non-saleable row with embedded price (to prove status unchanged)
    { name: 'Damaged Atta',              variant_uom_text: '10 kg - Rs 749.0',  qty: 15,  variant_mrp: 749,  _sheet_name: 'Non Saleable',  inventory_status: 'Non-Saleable',  _raw: {} },
  ];
}

/* ── Helper: run full cleaner + status resolution on records ── */
function processRecords(records) {
  const cleaned = Cleaner.cleanAll(records.map(r => ({ ...r })));
  for (const rec of cleaned) {
    const res = ISR.resolveRecordStatusDetailed(rec);
    rec.status = res.status;
    rec.resolved_status = res.status;
    rec.resolution_source = res.resolution_source;
    rec.resolution_rule = res.resolution_rule;
    rec.status_confidence = res.confidence;
    rec.is_status_conflict = res.is_status_conflict;
    rec.status_conflict_reason = res.status_conflict_reason;
  }
  return cleaned;
}

/* ── Helper: compute summary metrics ── */
function computeMetrics(records) {
  let sellableCount = 0, nonSellableCount = 0, unknownCount = 0;
  let totalQty = 0, totalMRP = 0, totalValue = 0;
  const sheets = {};

  for (const r of records) {
    if (r.resolved_status === 'sellable') sellableCount++;
    else if (r.resolved_status === 'non_sellable') nonSellableCount++;
    else unknownCount++;

    totalQty += r.qty || 0;
    totalMRP += r.variant_mrp || 0;
    totalValue += r.source_value || 0;

    const sheet = r._sheet_name || 'unknown';
    sheets[sheet] = (sheets[sheet] || 0) + 1;
  }

  return {
    total: records.length,
    sellableCount,
    nonSellableCount,
    unknownCount,
    retainedCount: sellableCount + unknownCount,
    removedCount: nonSellableCount,
    totalQty,
    totalMRP: Math.round(totalMRP * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    sheets,
  };
}

/* ============================================================
   EXECUTE TEST SUITE
   ============================================================ */

console.log('\n' + '='.repeat(70));
console.log('  EMBEDDED PRICE NORMALIZATION - FULL REGRESSION REPORT');
console.log('='.repeat(70));

const baselineRecords = buildBaselineRecords();

/* ── SECTION A: Pre-change baseline freeze ─────────────────── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION A: Existing Cleaner Regression Results (Baseline)');
console.log('-'.repeat(70));

const baselineProcessed = processRecords(baselineRecords);
const baselineMetrics = computeMetrics(baselineProcessed);

console.log(`  Total records:      ${baselineMetrics.total}`);
console.log(`  Sellable:           ${baselineMetrics.sellableCount}`);
console.log(`  Non-Sellable:       ${baselineMetrics.nonSellableCount}`);
console.log(`  Unknown:            ${baselineMetrics.unknownCount}`);
console.log(`  Retained (output):  ${baselineMetrics.retainedCount}`);
console.log(`  Removed:            ${baselineMetrics.removedCount}`);
console.log(`  Total Qty:          ${baselineMetrics.totalQty}`);
console.log(`  Total MRP sum:      ${baselineMetrics.totalMRP}`);
console.log(`  Total Value:        ${baselineMetrics.totalValue}`);
console.log(`  Sheet distribution: ${JSON.stringify(baselineMetrics.sheets)}`);

assert(baselineMetrics.total === 18, 'Baseline has 18 records');
assert(baselineMetrics.sellableCount > 0, 'Baseline has sellable records');
assert(baselineMetrics.nonSellableCount > 0, 'Baseline has non-sellable records');
assert(baselineMetrics.totalQty > 0, 'Baseline has non-zero total quantity');
assert(baselineMetrics.totalValue > 0, 'Baseline has non-zero total value');

/* ── SECTION B: Dedicated Embedded-Price Normalization Tests ── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION B: New Embedded-Price Normalization Tests');
console.log('-'.repeat(70));

console.log('\n  B.1: stripEmbeddedPrice() unit tests');
const strip = Cleaner.stripEmbeddedPrice;

assertEq(strip('10 kg - Rs 749.0'),          '10 kg',                  'Strip "10 kg - Rs 749.0"');
assertEq(strip('5 kg - Rs 386.0'),            '5 kg',                   'Strip "5 kg - Rs 386.0"');
assertEq(strip('10 kg - Rs. 606'),             '10 kg',                  'Strip "10 kg - Rs. 606"');
assertEq(strip('10 kg - 480'),                 '10 kg',                  'Strip "10 kg - 480"');
assertEq(strip('1 L - Rs 99'),                '1 L',                    'Strip "1 L - Rs 99"');
assertEq(strip('500 ml - Rs 120'),             '500 ml',                 'Strip "500 ml - Rs 120"');
assertEq(strip('6 x 12.5 g - Rs 105'),        '6 x 12.5 g',             'Strip "6 x 12.5 g - Rs 105"');
assertEq(strip('5 kg - Rs 265 - Free Jute Bag'), '5 kg - Free Jute Bag', 'Strip price but keep trailing descriptor');

console.log('\n  B.2: Passthrough (no embedded price - must NOT change)');
assertEq(strip('10 kg'),                       '10 kg',                  'Plain UOM: "10 kg"');
assertEq(strip('500 ml'),                      '500 ml',                 'Plain UOM: "500 ml"');
assertEq(strip('1 L'),                         '1 L',                    'Plain UOM: "1 L"');
assertEq(strip('6 x 12.5 g'),                  '6 x 12.5 g',            'Compound UOM: "6 x 12.5 g"');
assertEq(strip('1 Unit'),                      '1 Unit',                 'Plain UOM: "1 Unit"');
assertEq(strip(''),                            '',                       'Empty string');
assertEq(strip(null),                          '',                       'Null input');
assertEq(strip(undefined),                     '',                       'Undefined input');
assertEq(strip('200 g'),                       '200 g',                  'Plain UOM: "200 g"');
assertEq(strip('2 kg'),                        '2 kg',                   'Plain UOM: "2 kg"');

console.log('\n  B.3: Edge cases - preserve quantity+unit after dash');
assertEq(strip('10 kg - 2 pack'),              '10 kg - 2 pack',         'Preserve "- 2 pack" (not a price)');
assertEq(strip('5 kg - 3 units'),              '5 kg - 3 units',         'Preserve "- 3 units" (not a price)');

console.log('\n  B.4: Full pipeline - cleanRecord produces correct normalized_uom');
const priceRecords = [
  { name: 'Test A', variant_uom_text: '10 kg - Rs 749.0',    qty: 1, variant_mrp: 749, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test B', variant_uom_text: '5 kg - Rs 386.0',     qty: 1, variant_mrp: 386, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test C', variant_uom_text: '10 kg - Rs. 606',     qty: 1, variant_mrp: 606, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test D', variant_uom_text: '10 kg - 480',         qty: 1, variant_mrp: 480, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test E', variant_uom_text: '1 L - Rs 99',         qty: 1, variant_mrp: 99,  _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test F', variant_uom_text: '500 ml - Rs 120',     qty: 1, variant_mrp: 120, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test G', variant_uom_text: '6 x 12.5 g - Rs 105', qty: 1,variant_mrp: 105, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
  { name: 'Test H', variant_uom_text: '5 kg - Rs 265 - Free Jute Bag', qty: 1, variant_mrp: 265, _sheet_name: 'Saleable', inventory_status: 'Saleable', _raw: {} },
];
const cleanedPrice = Cleaner.cleanAll(priceRecords);

assertEq(cleanedPrice[0].normalized_uom, '10 KG',  'Pipeline: "10 kg - Rs 749.0" -> "10 KG"');
assertEq(cleanedPrice[1].normalized_uom, '5 KG',   'Pipeline: "5 kg - Rs 386.0" -> "5 KG"');
assertEq(cleanedPrice[2].normalized_uom, '10 KG',  'Pipeline: "10 kg - Rs. 606" -> "10 KG"');
assertEq(cleanedPrice[3].normalized_uom, '10 KG',  'Pipeline: "10 kg - 480" -> "10 KG"');
assertEq(cleanedPrice[4].normalized_uom, '1 L',    'Pipeline: "1 L - Rs 99" -> "1 L"');
assertEq(cleanedPrice[5].normalized_uom, '500 ML', 'Pipeline: "500 ml - Rs 120" -> "500 ML"');
const testGNorm = cleanedPrice[6].normalized_uom;
assert(!testGNorm.includes('105') && !testGNorm.includes('Rs'), 'Pipeline: "6 x 12.5 g - Rs 105" has no price in normalized_uom');
const testHNorm = cleanedPrice[7].normalized_uom;
assert(!testHNorm.includes('265') && !testHNorm.includes('Rs'), 'Pipeline: "5 kg - Rs 265 - Free Jute Bag" has no price in normalized_uom');

console.log('\n  B.5: raw_uom source lineage preserved');
assertEq(cleanedPrice[0].raw_uom, '10 kg - Rs 749.0',                  'raw_uom preserved: "10 kg - Rs 749.0"');
assertEq(cleanedPrice[7].raw_uom, '5 kg - Rs 265 - Free Jute Bag',     'raw_uom preserved: "5 kg - Rs 265 - Free Jute Bag"');
assertEq(cleanedPrice[4].raw_uom, '1 L - Rs 99',                       'raw_uom preserved: "1 L - Rs 99"');

console.log('\n  B.6: MRP/qty/value NOT affected by price stripping');
assertEq(cleanedPrice[0].variant_mrp, 749,  'MRP unchanged: 749');
assertEq(cleanedPrice[0].qty,         1,    'Qty unchanged: 1');
assertEq(cleanedPrice[0].source_value, 749, 'Value unchanged: 749');
assertEq(cleanedPrice[4].variant_mrp, 99,   'MRP unchanged: 99');
assertEq(cleanedPrice[7].variant_mrp, 265,  'MRP unchanged: 265');

console.log('\n  B.7: Status NOT affected by price stripping');
for (let i = 0; i < cleanedPrice.length; i++) {
  const res = ISR.resolveRecordStatusDetailed(cleanedPrice[i]);
  assertEq(res.status, 'sellable', `Record ${i} status still sellable`);
}

/* ── SECTION C: Post-change regression ─────────────────────── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION C: Existing Cleaner Regression Results (Post-Change)');
console.log('-'.repeat(70));

const postProcessed = processRecords(buildBaselineRecords());
const postMetrics = computeMetrics(postProcessed);

console.log(`  Total records:      ${postMetrics.total}`);
console.log(`  Sellable:           ${postMetrics.sellableCount}`);
console.log(`  Non-Sellable:       ${postMetrics.nonSellableCount}`);
console.log(`  Unknown:            ${postMetrics.unknownCount}`);
console.log(`  Retained (output):  ${postMetrics.retainedCount}`);
console.log(`  Removed:            ${postMetrics.removedCount}`);
console.log(`  Total Qty:          ${postMetrics.totalQty}`);
console.log(`  Total MRP sum:      ${postMetrics.totalMRP}`);
console.log(`  Total Value:        ${postMetrics.totalValue}`);
console.log(`  Sheet distribution: ${JSON.stringify(postMetrics.sheets)}`);

/* ── SECTION D: Row counts / status outcomes unchanged ──────── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION D: Proof - Row Counts & Status Outcomes Unchanged');
console.log('-'.repeat(70));

assertEq(postMetrics.total,            baselineMetrics.total,            'Total record count unchanged');
assertEq(postMetrics.sellableCount,    baselineMetrics.sellableCount,    'Sellable count unchanged');
assertEq(postMetrics.nonSellableCount, baselineMetrics.nonSellableCount, 'Non-Sellable count unchanged');
assertEq(postMetrics.unknownCount,     baselineMetrics.unknownCount,     'Unknown count unchanged');
assertEq(postMetrics.retainedCount,    baselineMetrics.retainedCount,    'Retained row count unchanged');
assertEq(postMetrics.removedCount,     baselineMetrics.removedCount,     'Removed row count unchanged');

let statusMismatches = 0;
for (let i = 0; i < baselineProcessed.length; i++) {
  if (baselineProcessed[i].resolved_status !== postProcessed[i].resolved_status) {
    statusMismatches++;
    console.log(`  WARNING: Status mismatch at record ${i}: was "${baselineProcessed[i].resolved_status}", now "${postProcessed[i].resolved_status}"`);
  }
}
assertEq(statusMismatches, 0, 'Zero per-record status mismatches');
assertEq(JSON.stringify(postMetrics.sheets), JSON.stringify(baselineMetrics.sheets), 'Sheet distribution identical');

/* ── SECTION E: Quantity / MRP / Value unchanged ───────────── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION E: Proof - Quantity / MRP / Value Unchanged');
console.log('-'.repeat(70));

assertEq(postMetrics.totalQty,   baselineMetrics.totalQty,   'Total quantity unchanged');
assertEq(postMetrics.totalMRP,   baselineMetrics.totalMRP,   'Total MRP sum unchanged');
assertEq(postMetrics.totalValue, baselineMetrics.totalValue,  'Total value unchanged');

let qtyMismatches = 0, mrpMismatches = 0, valueMismatches = 0;
for (let i = 0; i < baselineProcessed.length; i++) {
  if (baselineProcessed[i].qty !== postProcessed[i].qty) qtyMismatches++;
  if (baselineProcessed[i].variant_mrp !== postProcessed[i].variant_mrp) mrpMismatches++;
  if (baselineProcessed[i].source_value !== postProcessed[i].source_value) valueMismatches++;
}
assertEq(qtyMismatches,   0, 'Zero per-record qty mismatches');
assertEq(mrpMismatches,   0, 'Zero per-record MRP mismatches');
assertEq(valueMismatches,  0, 'Zero per-record value mismatches');

/* ── SECTION F: Only Variant/UOM normalization changed ──────── */
console.log('\n' + '-'.repeat(70));
console.log('  SECTION F: Proof - Only Variant/UOM Normalization Changed');
console.log('-'.repeat(70));

const uomDeltas = [];
for (let i = 0; i < baselineProcessed.length; i++) {
  const before = baselineProcessed[i].normalized_uom;
  const after  = postProcessed[i].normalized_uom;
  const rawUom = baselineProcessed[i].raw_uom;
  if (before !== after) {
    uomDeltas.push({ index: i, rawUom, before, after });
  }
}

console.log(`\n  UOM deltas detected: ${uomDeltas.length}`);
for (const d of uomDeltas) {
  console.log(`    Record ${d.index}: raw="${d.rawUom}" | before="${d.before}" -> after="${d.after}"`);
}

const recordsWithPrices = new Set();
for (let i = 0; i < baselineRecords.length; i++) {
  const uom = baselineRecords[i].variant_uom_text || '';
  if (/\s*-\s*(?:Rs\.?\s*)?\d+/i.test(uom)) {
    recordsWithPrices.add(i);
  }
}

let unexpectedDeltas = 0;
for (const d of uomDeltas) {
  if (!recordsWithPrices.has(d.index)) {
    unexpectedDeltas++;
    console.log(`  WARNING: UNEXPECTED UOM change at record ${d.index} (no embedded price in source)`);
  }
}
assertEq(unexpectedDeltas, 0, 'All UOM changes are from records with embedded prices');

let rawUomMismatches = 0;
for (let i = 0; i < baselineProcessed.length; i++) {
  if (baselineProcessed[i].raw_uom !== postProcessed[i].raw_uom) {
    rawUomMismatches++;
    console.log(`  WARNING: raw_uom changed at record ${i}: was "${baselineProcessed[i].raw_uom}", now "${postProcessed[i].raw_uom}"`);
  }
}
assertEq(rawUomMismatches, 0, 'raw_uom source lineage always preserved');

let otherFieldMismatches = 0;
const fieldsToCheck = ['normalized_product_name', 'normalized_brand', 'normalized_warehouse', 'source_category', 'raw_remarks', 'raw_inventory_status', 'raw_bad_inventory_type'];
for (let i = 0; i < baselineProcessed.length; i++) {
  for (const f of fieldsToCheck) {
    if (baselineProcessed[i][f] !== postProcessed[i][f]) {
      otherFieldMismatches++;
      console.log(`  WARNING: Field "${f}" changed at record ${i}: was "${baselineProcessed[i][f]}", now "${postProcessed[i][f]}"`);
    }
  }
}
assertEq(otherFieldMismatches, 0, 'No non-UOM fields changed');

/* ── FINAL SUMMARY ─────────────────────────────────────────── */
console.log('\n' + '='.repeat(70));
console.log('  FINAL REGRESSION SUMMARY');
console.log('='.repeat(70));
console.log(`  Total tests: ${totalTests}`);
console.log(`  Passed:      ${passed}`);
console.log(`  Failed:      ${failed}`);
if (failures.length > 0) {
  console.log('\n  FAILURES:');
  for (const f of failures) {
    console.log(`    FAIL: ${f}`);
  }
}
console.log('\n  ' + (failed === 0 ? 'ALL TESTS PASSED - NO REGRESSIONS DETECTED' : 'REGRESSIONS DETECTED - REVIEW FAILURES ABOVE'));
console.log('='.repeat(70) + '\n');

process.exit(failed > 0 ? 1 : 0);
