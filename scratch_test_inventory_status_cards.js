/**
 * Inventory Status 3-Card Verification Test Suite
 * Tests App.InventoryStatusResolver and Dashboard 3-Card UI.
 */

const fs = require('fs');
const path = require('path');

// Setup mock browser environment
const createMockEl = (tag) => {
  const el = {
    tag,
    className: '',
    style: { setProperty: () => {} },
    innerHTML: '',
    children: [],
    appendChild: (c) => el.children.push(c),
    insertAdjacentHTML: (pos, html) => { el.innerHTML += html; },
    querySelector: (sel) => createMockEl('div'),
    querySelectorAll: (sel) => [],
    addEventListener: () => {},
    dispatchEvent: () => {},
    value: ''
  };
  return el;
};

const document = {
  body: { classList: { add: () => {}, remove: () => {} } },
  documentElement: { classList: { add: () => {}, remove: () => {} } },
  querySelectorAll: () => [],
  querySelector: (sel) => createMockEl('div'),
  getElementById: (id) => createMockEl('div'),
  createElement: (tag) => createMockEl(tag)
};
global.document = document;
global.requestAnimationFrame = (cb) => cb();
global.Chart = function() { return { destroy: () => {} }; };
global.FileReader = class {
  readAsArrayBuffer(blob) {
    setTimeout(() => {
      this.result = blob.buffer || blob;
      if (this.onload) this.onload({ target: this });
    }, 10);
  }
};
global.window = {
  App: {},
  location: { hash: '' },
  addEventListener: () => {},
  requestAnimationFrame: (cb) => cb(),
  performance: { now: () => 0 }
};
global.App = window.App;

// Load production pipeline modules
require('./js/utils/formatters.js');
require('./js/pipeline/validator.js');
require('./js/pipeline/parser.js');
require('./js/pipeline/cleaner.js');
require('./js/pipeline/categorizer.js');
require('./js/pipeline/brandEngine.js');
require('./js/pipeline/productEngine.js');
require('./js/pipeline/aggregator.js');
require('./js/pipeline/reportingMapper.js');
require('./js/pipeline/inventoryStatusResolver.js');
require('./js/pipeline/pipeline.js');
require('./js/views/dashboard.js');

const XLSX = require('./vendor/xlsx.full.min.js');
global.XLSX = XLSX;

const mockDbData = {
  datasets: new Map(),
  inventory_records: new Map(),
  warehouses: new Map(),
  brands: new Map(),
  data_quality_issues: new Map(),
  normalization_suggestions: new Map()
};

global.App.DB = {
  getDataset: async (id) => mockDbData.datasets.get(id) || null,
  getAllByIndex: async (store, index, value) => {
    const arr = mockDbData[store] ? (mockDbData[store].get(value) || []) : [];
    return JSON.parse(JSON.stringify(arr));
  },
  getAllDatasets: async () => [...mockDbData.datasets.values()],
  saveDataset: async (ds) => { mockDbData.datasets.set(ds.id, ds); return ds; },
  put: async (store, record) => {
    if (store === 'datasets') {
      mockDbData.datasets.set(record.id, record);
    }
    return record;
  },
  bulkPut: async (store, records) => {
    if (!records || !records.length) return;
    const dsId = records[0].dataset_id;
    if (!mockDbData[store]) mockDbData[store] = new Map();
    const existing = mockDbData[store].get(dsId) || [];
    mockDbData[store].set(dsId, existing.concat(records));
  },
  putBulk: async (store, records) => {
    if (!records || !records.length) return;
    const dsId = records[0].dataset_id;
    if (!mockDbData[store]) mockDbData[store] = new Map();
    const existing = mockDbData[store].get(dsId) || [];
    mockDbData[store].set(dsId, existing.concat(records));
  },
  saveRecords: async (store, records) => {
    if (!records || !records.length) return;
    const dsId = records[0].dataset_id;
    if (!mockDbData[store]) mockDbData[store] = new Map();
    const existing = mockDbData[store].get(dsId) || [];
    mockDbData[store].set(dsId, existing.concat(records));
  },
  clearStore: async () => {}
};

global.App.Router = { go: () => {} };
global.App.UI = { showUploadModal: () => {}, toast: () => {} };

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runInventoryStatusTests() {
  console.log('================================================================');
  console.log('TEST SUITE: Inventory Status 3-Card Simplification & Resolver');
  console.log('================================================================\n');

  // TEST 1: No Dataset Loaded State
  console.log('--- TEST 1: No Dataset Loaded State ---');
  const container = document.createElement('div');
  await App.Views.Dashboard.render(container, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'Renders "No Dataset Loaded" when no active dataset');
  assert(container.innerHTML.includes('Upload Inventory Spreadsheet'), 'Contains Upload Spreadsheet CTA');
  assert(!container.innerHTML.includes('Inventory Status'), 'Does not show Inventory Status cards when no dataset is loaded');

  // TEST 2: Dasna Workbook Ingestion & 3-Way Split Verification
  console.log('\n--- TEST 2: Dasna Workbook Real Data Ingestion & Split ---');
  const dasnaFilename = 'Grofers_India_Pvt_Ltd_1788504108_DASNA_D3_LQ_01_to_02_Sep_26.xlsx';
  const dasnaBuf = fs.readFileSync(dasnaFilename);
  const dasnaFile = {
    name: dasnaFilename,
    size: dasnaBuf.length,
    buffer: dasnaBuf
  };

  const dasnaRes = await App.Pipeline.run(dasnaFile);
  assert(dasnaRes.ok === true, 'Pipeline executed successfully for Dasna-3');
  const dasnaRecords = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dasnaRes.dataset_id);

  const dasnaSummary = App.InventoryStatusResolver.resolveDataset(dasnaRecords);
  assert(dasnaSummary.total.records === 8567, `Dasna Total Records: 8,567 (Got: ${dasnaSummary.total.records})`);
  assert(dasnaSummary.total.units === 12331, `Dasna Total Units: 12,331 (Got: ${dasnaSummary.total.units})`);
  assert(Math.abs(dasnaSummary.total.value - 2560489.66) < 0.05, `Dasna Total Value: ₹2,560,489.66 (Got: ₹${dasnaSummary.total.value})`);
  
  // Ground truth sellable split: Saleable (5345) + atta (421) + Bad RTV (Saleable) (187) = 5953 records, 7844 units, ₹1,770,318.40
  assert(dasnaSummary.sellable.records === 5953, `Dasna Sellable Records: 5,953 (Got: ${dasnaSummary.sellable.records})`);
  assert(dasnaSummary.sellable.units === 7844, `Dasna Sellable Units: 7,844 (Got: ${dasnaSummary.sellable.units})`);
  assert(Math.abs(dasnaSummary.sellable.value - 1770318.40) < 0.05, `Dasna Sellable Value: ₹1,770,318.40 (Got: ₹${dasnaSummary.sellable.value})`);
  
  // Ground truth non-sellable split: Dump (2222) + Bad RTV (Dump) (392) = 2614 records, 4487 units, ₹790,171.26
  assert(dasnaSummary.nonSellable.records === 2614, `Dasna Non-Sellable Records: 2,614 (Got: ${dasnaSummary.nonSellable.records})`);
  assert(dasnaSummary.nonSellable.units === 4487, `Dasna Non-Sellable Units: 4,487 (Got: ${dasnaSummary.nonSellable.units})`);
  assert(Math.abs(dasnaSummary.nonSellable.value - 790171.26) < 0.05, `Dasna Non-Sellable Value: ₹790,171.26 (Got: ₹${dasnaSummary.nonSellable.value})`);
  
  assert(dasnaSummary.unknown.records === 0, `Dasna Unknown Records: 0 (Got: ${dasnaSummary.unknown.records})`);
  assert(dasnaSummary.reconciled === true, 'Dasna Arithmetic Equality: Total = Sellable + Non-Sellable');

  // TEST 3: Apex Healthcare Distributors Real Data Ingestion & Split
  console.log('\n--- TEST 3: Apex Healthcare Workbook Status Semantics ---');
  const apexBuf = fs.readFileSync('Apex_Healthcare_Distributors_NorthZone_Sep26.xlsx');
  const apexWb = XLSX.read(apexBuf, { type: 'buffer' });
  const apexRecords = [];

  for (const s of apexWb.SheetNames) {
    if (s === 'Summary') continue;
    const sheetData = XLSX.utils.sheet_to_json(apexWb.Sheets[s]);
    for (const row of sheetData) {
      const rec = {
        dataset_id: 'ds_apex_real',
        _sheet_name: s,
        _raw_sheet_name: s,
        _raw: { ...row, _sheet_name: s },
        normalized_product_name: row['Material_Description'] || 'Med Item',
        normalized_brand: row['Mfr_Brand'] || 'PharmaBrand',
        normalized_category: 'Healthcare & Pharmaceuticals',
        qty: Number(row['Closing_Stock'] || 0),
        source_value: Number(row['Valuation_Amount'] || 0)
      };
      apexRecords.push(rec);
    }
  }

  const apexSummary = App.InventoryStatusResolver.resolveDataset(apexRecords);
  assert(apexSummary.total.records === 1433, `Apex Total Records: 1,433 (Got: ${apexSummary.total.records})`);
  assert(apexSummary.total.units === 65680, `Apex Total Units: 65,680 (Got: ${apexSummary.total.units})`);
  assert(apexSummary.total.value === 23500750, `Apex Total Value: ₹23,500,750 (Got: ${apexSummary.total.value})`);
  assert(apexSummary.sellable.records === 1201, `Apex Sellable (Active_Stock): 1,201 records (Got: ${apexSummary.sellable.records})`);
  assert(apexSummary.nonSellable.records === 232, `Apex Non-Sellable (Quarantine + Damaged): 232 records (Got: ${apexSummary.nonSellable.records})`);
  assert(apexSummary.unknown.records === 0, `Apex Unknown Records: 0 (Got: ${apexSummary.unknown.records})`);
  assert(apexSummary.reconciled === true, 'Apex Arithmetic Equality: Total = Sellable + Non-Sellable');

  // TEST 4: Workbook with Explicit Status Column
  console.log('\n--- TEST 4: Workbook with Explicit Status Column ---');
  const explicitStatusRecords = [
    { _sheet_name: 'Inventory', status: 'Available', qty: 10, source_value: 1000 },
    { _sheet_name: 'Inventory', status: 'In Stock', qty: 5, source_value: 500 },
    { _sheet_name: 'Inventory', status: 'Damaged', qty: 2, source_value: 200 },
    { _sheet_name: 'Inventory', status: 'Expired', qty: 3, source_value: 300 },
    { _sheet_name: 'Inventory', status: 'Quarantined', qty: 1, source_value: 100 }
  ];
  const explicitSummary = App.InventoryStatusResolver.resolveDataset(explicitStatusRecords);
  assert(explicitSummary.total.records === 5, 'Explicit Status: Total Records = 5');
  assert(explicitSummary.sellable.records === 2, 'Explicit Status: Sellable Records = 2 (Available + In Stock)');
  assert(explicitSummary.sellable.value === 1500, 'Explicit Status: Sellable Value = ₹1,500');
  assert(explicitSummary.nonSellable.records === 3, 'Explicit Status: Non-Sellable Records = 3 (Damaged + Expired + Quarantined)');
  assert(explicitSummary.nonSellable.value === 600, 'Explicit Status: Non-Sellable Value = ₹600');
  assert(explicitSummary.unknown.records === 0, 'Explicit Status: Unknown Records = 0');
  assert(explicitSummary.reconciled === true, 'Explicit Status: Reconciled = true');

  // TEST 5: Workbook with Unknown / Undetermined Status (Transparent Fallback)
  console.log('\n--- TEST 5: Workbook with Undetermined / Unknown Status ---');
  const unknownRecords = [
    { _sheet_name: 'Sheet1', qty: 20, source_value: 5000 },
    { _sheet_name: 'Sheet1', qty: 30, source_value: 8000 },
    { _sheet_name: 'Sheet1', status: 'Damaged', qty: 5, source_value: 1000 }
  ];
  const unknownSummary = App.InventoryStatusResolver.resolveDataset(unknownRecords);
  assert(unknownSummary.total.records === 3, 'Unknown Status: Total Records = 3');
  assert(unknownSummary.total.value === 14000, 'Unknown Status: Total Value = ₹14,000');
  assert(unknownSummary.sellable.records === 0, 'Unknown Status: Sellable Records = 0 (No false precision)');
  assert(unknownSummary.nonSellable.records === 1, 'Unknown Status: Non-Sellable Records = 1 (Damaged)');
  assert(unknownSummary.unknown.records === 2, 'Unknown Status: Unknown Records = 2');
  assert(unknownSummary.unknown.value === 13000, 'Unknown Status: Unknown Value = ₹13,000');
  assert(unknownSummary.reconciled === true, 'Unknown Status: Reconciled = true (Total = Sellable + NonSellable + Unknown)');

  // TEST 6: Dashboard 3-Card UI Rendering Verification
  console.log('\n--- TEST 6: Dashboard 3-Card UI Rendering Verification ---');
  mockDbData.datasets.set('ds_dasna_real', {
    id: 'ds_dasna_real',
    filename: 'Dasna_Warehouse_Inventory.xlsx',
    rowCount: 8567,
    uploadedAt: Date.now(),
    kpis: {
      total_records: 8567,
      total_units: 12331,
      total_value: 2560489.66,
      category_count: 15,
      brand_count: 1031,
      family_count: 3619
    }
  });
  mockDbData.inventory_records.set('ds_dasna_real', dasnaRecords);

  const dashboardContainer = document.createElement('div');
  await App.Views.Dashboard.render(dashboardContainer, 'ds_dasna_real');

  const uiHtml = dashboardContainer.innerHTML;
  assert(uiHtml.includes('Inventory Status'), 'Dashboard contains "Inventory Status" section header');
  assert(uiHtml.includes('Total Inventory'), 'Dashboard contains "Total Inventory" card');
  assert(uiHtml.includes('Sellable Items'), 'Dashboard contains "Sellable Items" card');
  assert(uiHtml.includes('Non-Sellable Items'), 'Dashboard contains "Non-Sellable Items" card');
  assert(uiHtml.includes('Status: Sellable'), 'Dashboard displays "Status: Sellable" label');
  assert(uiHtml.includes('Status: Non-Sellable'), 'Dashboard displays "Status: Non-Sellable" label');
  assert(uiHtml.includes('From active workbook'), 'Dashboard displays "From active workbook" metadata');

  // Verify removed obsolete labels
  assert(!uiHtml.includes('Business FM Scope'), 'Dashboard does NOT contain "Business FM Scope"');
  assert(!uiHtml.includes('Dedicated Atta Scope'), 'Dashboard does NOT contain "Dedicated Atta Scope"');
  assert(!uiHtml.includes('708,495 Target'), 'Dashboard does NOT contain "708,495 Target"');
  assert(!uiHtml.includes('Explicit Scope Traceability'), 'Dashboard does NOT contain "Explicit Scope Traceability"');

  // TEST 7: Dataset Switching & State Isolation
  console.log('\n--- TEST 7: Dataset Switching & State Isolation ---');
  mockDbData.datasets.set('ds_apex_real', {
    id: 'ds_apex_real',
    filename: 'Apex_Healthcare_Distributors.xlsx',
    rowCount: 1433,
    uploadedAt: Date.now(),
    kpis: {
      total_records: 1433,
      total_units: 65680,
      total_value: 23500750,
      category_count: 5,
      brand_count: 23,
      family_count: 43
    }
  });
  mockDbData.inventory_records.set('ds_apex_real', apexRecords);

  const apexContainer = document.createElement('div');
  await App.Views.Dashboard.render(apexContainer, 'ds_apex_real');
  const apexUi = apexContainer.innerHTML;

  assert(apexUi.includes('Apex_Healthcare_Distributors.xlsx'), 'Switched to Apex: Displays Apex filename');
  assert(apexUi.includes('235.01 L') || apexUi.includes('23,500,750') || apexUi.includes('2.35 Cr'), 'Switched to Apex: Displays Apex total value');
  assert(!apexUi.includes('25.60 L') && !apexUi.includes('2,560,489'), 'Switched to Apex: Zero bleed from Dasna total value');
  assert(!apexUi.includes('Dasna_Warehouse_Inventory'), 'Switched to Apex: Zero bleed from Dasna name');

  // Switch back to Dasna
  const dasnaContainer2 = document.createElement('div');
  await App.Views.Dashboard.render(dasnaContainer2, 'ds_dasna_real');
  const dasnaUi2 = dasnaContainer2.innerHTML;

  assert(dasnaUi2.includes('Dasna_Warehouse_Inventory.xlsx'), 'Switched back to Dasna: Displays Dasna filename');
  assert(dasnaUi2.includes('25.60 L') || dasnaUi2.includes('2,560,489'), 'Switched back to Dasna: Displays Dasna total value');
  assert(!dasnaUi2.includes('235.01 L') && !dasnaUi2.includes('23,500,750'), 'Switched back to Dasna: Zero bleed from Apex total value');

  // TEST 8: Code Purity & Zero Hardcoding Scan
  console.log('\n--- TEST 8: Code Purity & Zero Hardcoding Scan ---');
  const dashboardCode = fs.readFileSync(path.join(__dirname, 'js/views/dashboard.js'), 'utf8');
  const resolverCode = fs.readFileSync(path.join(__dirname, 'js/pipeline/inventoryStatusResolver.js'), 'utf8');
  
  const targetConstants = ['708495', '708,495', '233149', '233,149', '1460421', '1,460,421', '1770318', '1,770,318', '790171', '790,171'];
  let hardcodingFound = false;
  for (const c of targetConstants) {
    if (dashboardCode.includes(c) || resolverCode.includes(c)) {
      hardcodingFound = true;
      console.error(`  ❌ Target constant "${c}" detected in production code!`);
    }
  }
  assert(!hardcodingFound, 'Zero hardcoded reference target constants in production UI/pipeline');

  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runInventoryStatusTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
