/**
 * Dynamic Dataset Integrity & Zero Hardcoding Audit Suite
 * Validates that Liquidation IQ computes 100% dynamically from the active dataset,
 * shows clean empty states when no dataset is loaded, and is decoupled from reference files.
 */

const fs = require('fs');
const path = require('path');

// Mock browser DOM & IndexedDB environment
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
require('./js/pipeline/categorizer.js');
require('./js/pipeline/reportingMapper.js');
require('./js/pipeline/inventoryStatusResolver.js');
require('./js/views/dashboard.js');
require('./js/views/categoryDetail.js');
require('./js/views/brandDetail.js');
require('./js/views/nlQuery.js');
require('./js/views/warehouseView.js');
require('./js/views/dataQuality.js');
require('./js/views/uploadsHistory.js');

// Mock App.DB
const mockDbData = {
  datasets: new Map(),
  records: new Map(),
  warehouses: new Map(),
  brands: new Map(),
  issues: new Map(),
  suggestions: new Map()
};

global.App = window.App;
global.App.DB = {
  getDataset: async (id) => mockDbData.datasets.get(id) || null,
  getAllByIndex: async (store, index, value) => {
    const arr = mockDbData[store] ? (mockDbData[store].get(value) || []) : [];
    return JSON.parse(JSON.stringify(arr));
  },
  getAllDatasets: async () => [...mockDbData.datasets.values()]
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

async function runAudit() {
  console.log('===============================================================');
  console.log('AUDIT SUITE: Dynamic Dataset Integrity & Zero Hardcoding');
  console.log('===============================================================\n');

  // TEST 1: Zero Dataset Loaded - Empty State Verification
  console.log('--- TEST 1: Empty States with No Dataset Loaded ---');
  const container = document.createElement('div');

  // 1.1 Dashboard
  await App.Views.Dashboard.render(container, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'Dashboard renders "No Dataset Loaded" when dataset_id is null');
  assert(container.innerHTML.includes('Upload Inventory Spreadsheet'), 'Dashboard shows "Upload Inventory Spreadsheet" CTA');
  assert(!container.innerHTML.includes('708,495'), 'Dashboard does not contain 708,495');
  assert(!container.innerHTML.includes('233,149'), 'Dashboard does not contain 233,149');

  // 1.2 CategoryDetail
  container.innerHTML = '';
  await App.Views.CategoryDetail.render(container, { name: 'Grocery' }, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'CategoryDetail renders "No Dataset Loaded" when dataset_id is null');

  // 1.3 BrandDetail
  container.innerHTML = '';
  await App.Views.BrandDetail.render(container, { id: 'Tata' }, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'BrandDetail renders "No Dataset Loaded" when dataset_id is null');

  // 1.4 AllBrands
  container.innerHTML = '';
  await App.Views.AllBrands.render(container, {}, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'AllBrands renders "No Dataset Loaded" when dataset_id is null');

  // 1.5 WarehouseView
  container.innerHTML = '';
  await App.Views.WarehouseView.render(container, {}, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'WarehouseView renders "No Dataset Loaded" when dataset_id is null');

  // 1.6 DataQuality
  container.innerHTML = '';
  await App.Views.DataQuality.render(container, {}, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'DataQuality renders "No Dataset Loaded" when dataset_id is null');

  // 1.7 InventoryTable
  container.innerHTML = '';
  await App.Views.InventoryTable.render(container, {}, null);
  assert(container.innerHTML.includes('No Dataset Loaded'), 'InventoryTable renders "No Dataset Loaded" when dataset_id is null');

  // TEST 2: Active Dataset A (Synthetic Auto Parts, Single Sheet)
  console.log('\n--- TEST 2: Active Dataset A (Synthetic Auto Parts, Single Sheet) ---');
  const datasetA = {
    id: 'ds_auto_001',
    filename: 'AutoParts_Catalog.xlsx',
    rowCount: 50,
    uploadedAt: Date.now(),
    kpis: {
      total_skus: 45,
      total_units: 1200,
      total_value: 485000,
      total_weight: 350,
      damaged_value: 0,
      near_expiry_value: 0,
      status_distribution: { saleable: { count: 50, qty: 1200, value: 485000 } }
    }
  };

  const recordsA = [];
  for (let i = 1; i <= 50; i++) {
    recordsA.push({
      dataset_id: 'ds_auto_001',
      _sheet_name: 'Main_Catalog',
      normalized_product_name: `Brake Pad Set Type ${i}`,
      normalized_brand: i % 2 === 0 ? 'Bosch' : 'Brembo',
      normalized_category: 'Automotive & Industrial',
      subcategory: 'Braking Systems',
      qty: 24,
      source_value: 9700,
      total_weight: 7,
      product_family_id: `sku_auto_${i}`
    });
  }

  mockDbData.datasets.set('ds_auto_001', datasetA);
  mockDbData.inventory_records = new Map([['ds_auto_001', recordsA]]);

  const scopesA = App.ReportingMapper.getScopesSummary(recordsA);
  assert(scopesA.all_sheets.records === 50, 'Scopes Summary for Dataset A: 50 records');
  assert(scopesA.all_sheets.units === 1200, 'Scopes Summary for Dataset A: 1200 units');
  assert(scopesA.all_sheets.value === 485000, 'Scopes Summary for Dataset A: ₹485,000 value');
  assert(scopesA.is_grofers_applicable === false, 'Grofers profile is NOT applicable to Dataset A');
  assert(scopesA.has_multiple_sheets === false, 'Dataset A has single sheet');
  assert(scopesA.dedicated_atta === undefined, 'Dataset A has no dedicated atta scope');

  container.innerHTML = '';
  await App.Views.Dashboard.render(container, 'ds_auto_001');
  assert(container.innerHTML.includes('AutoParts_Catalog.xlsx'), 'Dashboard renders Dataset A filename');
  assert(container.innerHTML.includes(App.Fmt.currency(485000)), 'Dashboard renders exact Dataset A total value ' + App.Fmt.currency(485000));
  assert(!container.innerHTML.includes('Business FM Scope'), 'Dashboard does not show Grofers FM Scope for Dataset A');
  assert(!container.innerHTML.includes('Dedicated Atta Scope'), 'Dashboard does not show Atta Scope for Dataset A');

  // TEST 3: Active Dataset B (Synthetic Apparel, Multi-Sheet: Men_Apparel & Women_Footwear)
  console.log('\n--- TEST 3: Active Dataset B (Synthetic Apparel, Multi-Sheet) ---');
  const datasetB = {
    id: 'ds_apparel_002',
    filename: 'Fashion_Spring_2026.xlsx',
    rowCount: 100,
    uploadedAt: Date.now(),
    kpis: {
      total_skus: 90,
      total_units: 650,
      total_value: 175000,
      total_weight: 120,
      damaged_value: 5000,
      near_expiry_value: 0,
      status_distribution: { saleable: { count: 95, qty: 620, value: 170000 }, damaged: { count: 5, qty: 30, value: 5000 } }
    }
  };

  const recordsB = [];
  // 60 records in Men_Apparel (val: 105,000, qty: 400)
  for (let i = 1; i <= 60; i++) {
    recordsB.push({
      dataset_id: 'ds_apparel_002',
      _sheet_name: 'Men_Apparel',
      normalized_product_name: `Cotton T-Shirt Variant ${i}`,
      normalized_brand: 'Zara',
      normalized_category: 'Apparel & Accessories',
      subcategory: 'T-Shirts',
      qty: i <= 50 ? 7 : 5,
      source_value: 1750,
      total_weight: 1.2,
      product_family_id: `sku_men_${i}`
    });
  }
  // 40 records in Women_Footwear (val: 70,000, qty: 250)
  for (let i = 1; i <= 40; i++) {
    recordsB.push({
      dataset_id: 'ds_apparel_002',
      _sheet_name: 'Women_Footwear',
      normalized_product_name: `Leather Sandal Size ${i}`,
      normalized_brand: 'Nike',
      normalized_category: 'Footwear',
      subcategory: 'Sandals',
      qty: i <= 20 ? 7 : 5.5,
      source_value: 1750,
      total_weight: 1.2,
      product_family_id: `sku_women_${i}`
    });
  }

  mockDbData.datasets.set('ds_apparel_002', datasetB);
  mockDbData.inventory_records.set('ds_apparel_002', recordsB);

  const scopesB = App.ReportingMapper.getScopesSummary(recordsB);
  assert(scopesB.all_sheets.records === 100, 'Scopes Summary for Dataset B: 100 records');
  assert(scopesB.all_sheets.value === 175000, 'Scopes Summary for Dataset B: ₹175,000 value');
  assert(scopesB.has_multiple_sheets === true, 'Dataset B has multiple sheets');
  assert(scopesB.sheets['Men_Apparel'].recordCount === 60, 'Men_Apparel sheet: 60 records');
  assert(scopesB.sheets['Women_Footwear'].recordCount === 40, 'Women_Footwear sheet: 40 records');
  assert(scopesB.is_grofers_applicable === false, 'Grofers profile is NOT applicable to Dataset B');

  container.innerHTML = '';
  await App.Views.Dashboard.render(container, 'ds_apparel_002');
  assert(container.innerHTML.includes('Fashion_Spring_2026.xlsx'), 'Dashboard renders Dataset B filename');
  assert(container.innerHTML.includes(App.Fmt.currency(175000)), 'Dashboard renders exact Dataset B total value ' + App.Fmt.currency(175000));
  assert(container.innerHTML.includes('Sellable Items'), 'Dashboard displays dynamic Sellable Items card');
  assert(container.innerHTML.includes('Non-Sellable Items'), 'Dashboard displays dynamic Non-Sellable Items card');
  assert(!container.innerHTML.includes(App.Fmt.currency(485000)), 'Zero bleed from Dataset A value (' + App.Fmt.currency(485000) + ' not present)');
  assert(!container.innerHTML.includes('AutoParts'), 'Zero bleed from Dataset A filename');

  // TEST 4: Profile Applicability Resolution
  console.log('\n--- TEST 4: Business Profile Resolution Rules ---');
  assert(App.ReportingMapper.isProfileApplicable('Standard Canonical Taxonomy', recordsA) === true, 'Canonical Standard is universally applicable');
  assert(App.ReportingMapper.isProfileApplicable('Grofers Fast-Moving (FM 20-Bucket)', recordsA) === false, 'Grofers FM-20 is false for Auto parts');
  assert(App.ReportingMapper.isProfileApplicable('Grofers Fast-Moving (FM 20-Bucket)', recordsB) === false, 'Grofers FM-20 is false for Apparel');

  // Synthetic Grofers dataset with 'atta' sheet
  const recordsGrofers = [
    { dataset_id: 'ds_g1', _sheet_name: 'Saleable', raw_entity_name: 'Grofers Dasna Warehouse', normalized_product_name: 'Fortune Atta 10kg', source_value: 5000, qty: 10 },
    { dataset_id: 'ds_g1', _sheet_name: 'atta', normalized_product_name: 'Aashirvaad Atta 5kg', source_value: 3000, qty: 10 }
  ];
  assert(App.ReportingMapper.isProfileApplicable('Grofers Fast-Moving (FM 20-Bucket)', recordsGrofers) === true, 'Grofers FM-20 is true for Dasna Grofers workbook with atta sheet');

  // TEST 5: Codebase Purity Check (No hardcoded targets in views)
  console.log('\n--- TEST 5: Code Purity Check (No Hardcoded Target Constants in UI) ---');
  const viewFiles = fs.readdirSync('js/views').map(f => path.join('js/views', f));
  let hardcodedLeaks = 0;
  const bannedTargets = ['708,495', '708495'];

  for (const vf of viewFiles) {
    const content = fs.readFileSync(vf, 'utf8');
    for (const bt of bannedTargets) {
      if (content.includes(bt)) {
        console.error(`  ❌ LEAK DETECTED in ${vf}: contains ${bt}`);
        hardcodedLeaks++;
      }
    }
  }
  assert(hardcodedLeaks === 0, 'Zero hardcoded reference target constants in js/views/');

  console.log('\n===============================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
