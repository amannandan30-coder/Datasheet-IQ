const fs = require('fs');
const assert = require('assert');
const XLSX = require('./vendor/xlsx.full.min.js');
global.XLSX = XLSX;
global.window = global;
global.document = { createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
global.FileReader = class { readAsArrayBuffer(file) { setTimeout(() => { this.onload({ target: { result: file.buffer || file } }); }, 5); } };
global.App = {};

const validatorCode = fs.readFileSync('./js/pipeline/validator.js', 'utf8');
const parserCode = fs.readFileSync('./js/pipeline/parser.js', 'utf8');
const cleanerCode = fs.readFileSync('./js/pipeline/cleaner.js', 'utf8');
const resolverCode = fs.readFileSync('./js/pipeline/inventoryStatusResolver.js', 'utf8');

eval(validatorCode);
eval(parserCode);
eval(cleanerCode);
eval(resolverCode);

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING REGRESSION SUITE: Sheet 1(1).xlsx & Lot-15 Canonical Invariants');
  console.log('================================================================\n');

  // ── TEST A: Sheet 1(1).xlsx Canonical Invariants ──
  console.log('--- TEST A: Sheet 1(1).xlsx Canonical Invariants ---');
  const sheet1Buf = fs.readFileSync('B:/Excel File/Sheet 1.xlsx');
  const sheet1Parsed = await App.Parser.parse({ name: 'Sheet 1(1).xlsx', size: sheet1Buf.length, buffer: sheet1Buf });
  const sheet1Cleaned = App.Cleaner.cleanAll(sheet1Parsed.rows);
  const sheet1Res = App.InventoryStatusResolver.resolveDataset(sheet1Cleaned);

  console.log('Sheet 1 Result:', JSON.stringify(sheet1Res, null, 2));

  assert.strictEqual(sheet1Res.total.records, 7854, `Sheet 1 Total records must be 7,854, got ${sheet1Res.total.records}`);
  assert.strictEqual(sheet1Res.total.units, 13522, `Sheet 1 Total units must be 13,522, got ${sheet1Res.total.units}`);
  assert.strictEqual(sheet1Res.total.value, 3021095.49, `Sheet 1 Total value must be ₹30,21,095.49, got ${sheet1Res.total.value}`);

  assert.strictEqual(sheet1Res.sellable.records, 6683, `Sheet 1 Sellable records must be 6,683, got ${sheet1Res.sellable.records}`);
  assert.strictEqual(sheet1Res.sellable.units, 9506, `Sheet 1 Sellable units must be 9,506, got ${sheet1Res.sellable.units}`);
  assert.strictEqual(sheet1Res.sellable.value, 2244295.50, `Sheet 1 Sellable value must be ₹22,44,295.50, got ${sheet1Res.sellable.value}`);

  assert.strictEqual(sheet1Res.nonSellable.records, 1171, `Sheet 1 Non-Sellable records must be 1,171, got ${sheet1Res.nonSellable.records}`);
  assert.strictEqual(sheet1Res.nonSellable.units, 4016, `Sheet 1 Non-Sellable units must be 4,016, got ${sheet1Res.nonSellable.units}`);
  assert.strictEqual(sheet1Res.nonSellable.value, 776799.99, `Sheet 1 Non-Sellable value must be ₹7,76,799.99, got ${sheet1Res.nonSellable.value}`);

  assert.strictEqual(sheet1Res.unknown.records, 0, `Sheet 1 Unknown records must be 0, got ${sheet1Res.unknown.records}`);
  assert.strictEqual(sheet1Res.unknown.units, 0, `Sheet 1 Unknown units must be 0, got ${sheet1Res.unknown.units}`);
  assert.strictEqual(sheet1Res.unknown.value, 0, `Sheet 1 Unknown value must be ₹0.00, got ${sheet1Res.unknown.value}`);

  assert.strictEqual(sheet1Res.reconciled, true, 'Sheet 1 mathematical reconciliation must be true');
  console.log('✅ TEST A PASSED: Sheet 1(1).xlsx canonical targets match with 0 error!\n');

  // ── TEST B: Lot-15 Canonical Invariants ──
  console.log('--- TEST B: Lot-15 Canonical Invariants ---');
  const lot15Buf = fs.readFileSync('Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx');
  const lot15Parsed = await App.Parser.parse({ name: 'Lot-15.xlsx', size: lot15Buf.length, buffer: lot15Buf });
  
  // Filter for valid named records (7,980)
  const lot15Cleaned = App.Cleaner.cleanAll(lot15Parsed.rows.filter(r => r.name && String(r.name).trim() !== ''));
  const lot15Res = App.InventoryStatusResolver.resolveDataset(lot15Cleaned);

  console.log('Lot-15 Result:', JSON.stringify(lot15Res, null, 2));

  assert.strictEqual(lot15Res.total.records, 7980, `Lot-15 Total records must be 7,980, got ${lot15Res.total.records}`);
  assert.strictEqual(lot15Res.total.units, 20861, `Lot-15 Total units must be 20,861, got ${lot15Res.total.units}`);
  assert.strictEqual(lot15Res.total.value, 3547255.97, `Lot-15 Total value must be ₹35,47,255.97, got ${lot15Res.total.value}`);

  assert.strictEqual(lot15Res.sellable.records, 0, `Lot-15 Sellable records must be 0, got ${lot15Res.sellable.records}`);
  assert.strictEqual(lot15Res.sellable.units, 0, `Lot-15 Sellable units must be 0, got ${lot15Res.sellable.units}`);
  assert.strictEqual(lot15Res.sellable.value, 0, `Lot-15 Sellable value must be ₹0.00, got ${lot15Res.sellable.value}`);

  assert.strictEqual(lot15Res.nonSellable.records, 4788, `Lot-15 Non-Sellable records must be 4,788, got ${lot15Res.nonSellable.records}`);
  assert.strictEqual(lot15Res.nonSellable.units, 13901, `Lot-15 Non-Sellable units must be 13,901, got ${lot15Res.nonSellable.units}`);
  assert.strictEqual(lot15Res.nonSellable.value, 2232975.35, `Lot-15 Non-Sellable value must be ₹22,32,975.35, got ${lot15Res.nonSellable.value}`);

  assert.strictEqual(lot15Res.unknown.records, 3192, `Lot-15 Unknown records must be 3,192, got ${lot15Res.unknown.records}`);
  assert.strictEqual(lot15Res.unknown.units, 6960, `Lot-15 Unknown units must be 6,960, got ${lot15Res.unknown.units}`);
  assert.strictEqual(lot15Res.unknown.value, 1314280.62, `Lot-15 Unknown value must be ₹13,14,280.62, got ${lot15Res.unknown.value}`);

  assert.strictEqual(lot15Res.reconciled, true, 'Lot-15 mathematical reconciliation must be true');
  console.log('✅ TEST B PASSED: Lot-15 canonical targets match with 0 error!\n');

  // ── TEST C: Explicit Status, Conflicts, and Neutral Sheets ──
  console.log('--- TEST C: Explicit Status, Conflicts, and Neutral Sheets ---');

  // 1. Explicit Status
  const r1 = { name: 'Item A', inventory_status: 'Available', qty: 1, source_value: 100 };
  const res1 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r1);
  assert.strictEqual(res1.status, 'sellable');
  assert.strictEqual(res1.resolution_rule, 'explicit_positive_status');

  const r2 = { name: 'Item B', inventory_status: 'Damaged', qty: 1, source_value: 100 };
  const res2 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r2);
  assert.strictEqual(res2.status, 'non_sellable');
  assert.strictEqual(res2.resolution_rule, 'explicit_negative_status');

  // 2. Conflict
  const r3 = { name: 'Item C', item_type: 'Saleable', bad_inventory_type: 'damaged', qty: 1, source_value: 100 };
  const res3 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r3);
  assert.strictEqual(res3.status, 'unknown');
  assert.strictEqual(res3.is_status_conflict, true);
  assert.strictEqual(res3.resolution_rule, 'semantic_status_conflict');

  // 3. Scanning remarks like "Bad mark not available" must NOT trigger non_sellable
  const r4 = { name: 'Item D', _sheet_name: 'No variant', remarks: 'Bad mark not available', qty: 1, source_value: 100 };
  const res4 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r4);
  assert.strictEqual(res4.status, 'sellable'); // domain sheet fallback since remark is not an actual damage condition

  // 4. Actual damage remark MUST trigger non_sellable
  const r5 = { name: 'Item E', _sheet_name: 'No variant', remarks: 'Item is broken and packaging torn', qty: 1, source_value: 100 };
  const res5 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r5);
  assert.strictEqual(res5.status, 'non_sellable');
  assert.strictEqual(res5.resolution_rule, 'explicit_negative_remarks');

  // 5. Generic neutral sheet with no signals must be unknown
  const r6 = { name: 'Item F', _sheet_name: 'Sheet1', qty: 1, source_value: 100 };
  const res6 = App.InventoryStatusResolver.resolveRecordStatusDetailed(r6);
  assert.strictEqual(res6.status, 'unknown');
  assert.strictEqual(res6.resolution_rule, 'no_explicit_signals');

  console.log('✅ TEST C PASSED: Semantic hierarchy, conflict detection, and remark safety verified!\n');

  console.log('================================================================');
  console.log('ALL INVARIANT TESTS PASSED 100%! 🎉');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
