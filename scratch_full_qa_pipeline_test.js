const fs = require('fs');

// Load vendor XLSX
const XLSX = require('./vendor/xlsx.full.min.js');
global.XLSX = XLSX;

// Mock window and App namespace for headless Node execution
global.window = global;
global.App = {};
global.crypto = require('crypto');

// Load pipeline files in order
require('./js/utils/formatters.js');
require('./js/pipeline/validator.js');
require('./js/pipeline/parser.js');
require('./js/pipeline/cleaner.js');
require('./js/pipeline/categorizer.js');
require('./js/pipeline/brandEngine.js');
require('./js/pipeline/productEngine.js');
require('./js/pipeline/aggregator.js');

console.log('App pipeline modules loaded successfully in Node environment.');

const filePath = 'Grofers_India_Pvt_Ltd_1787979148_Liq_sheet_lot-15_27th_Aug.xlsx_revised__2_.xlsx2nd.xlsx';
const buf = fs.readFileSync(filePath);

const fileObj = {
  name: 'Grofers_Liquidation_Lot15.xlsx',
  size: buf.length,
  buffer: buf
};

global.FileReader = class {
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.onload({ target: { result: file.buffer } });
    }, 10);
  }
};

async function runFullQATest() {
  console.log('\n======================================================');
  console.log('AUTONOMOUS QA TEST — REAL DATASET (ALL SHEETS)');
  console.log('======================================================');

  try {
    const parseResult = await App.Parser.parse(fileObj);
    console.log(`Sheets Processed: ${parseResult.sheetCount} [${parseResult.sheetName}]`);
    console.log(`Total Rows Parsed: ${parseResult.rowCount}`);
    console.log('Sheet Stats:', parseResult.sheetStats);

    const mappedRows = App.Parser.applyMapping(parseResult.rows, {});
    const cleaned    = App.Cleaner.cleanAll(mappedRows);
    const categorized= App.Categorizer.processAll(cleaned);

    const dataset_id = 'test-ds-multisheet';
    const { brands, suggestions, records: brandedRecords } = App.BrandEngine.buildBrandMaster(categorized, dataset_id);
    const { records: productsRecords, product_families, product_variants } = App.ProductEngine.groupProducts(brandedRecords, dataset_id);
    const { warehouses, dqIssues, kpis } = App.Aggregator.run(productsRecords, dataset_id);

    console.log('\n=== PIPELINE OUTPUT SUMMARY ===');
    console.log(`- Total Records: ${productsRecords.length}`);
    console.log(`- Total SKUs: ${kpis.total_skus}`);
    console.log(`- Total Units: ${kpis.total_units}`);
    console.log(`- Total Value: ₹${kpis.total_value.toFixed(2)}`);
    console.log(`- Total Weight: ${kpis.total_weight.toFixed(2)} KG`);
    console.log(`- Total Brands: ${brands.length}`);
    console.log(`- Total Product Families: ${product_families.length}`);
    console.log(`- Total Product Variants: ${product_variants.length}`);
    console.log(`- Total Warehouses: ${warehouses.length}`);

    console.log('\n=== RECONCILIATION SUMMARY ===');
    const srcQty = productsRecords.reduce((s,r) => s + (r.qty||0), 0);
    const srcVal = productsRecords.reduce((s,r) => s + (r.source_value||0), 0);
    const srcWt  = productsRecords.reduce((s,r) => s + (r.total_weight||0), 0);

    console.log(`Record Count Diff: ${productsRecords.length - parseResult.rowCount} (Expected 0)`);
    console.log(`Units Diff: ${srcQty - kpis.total_units} (Expected 0)`);
    console.log(`Value Diff: ₹${(srcVal - kpis.total_value).toFixed(2)} (Expected 0)`);
    console.log(`Weight Diff: ${(srcWt - kpis.total_weight).toFixed(2)} KG (Expected 0)`);

    console.log('\n=== ATTA TEST VERIFICATION ===');
    const attaRecs = productsRecords.filter(r => 
      r.normalized_category === 'Grocery' && r.subcategory === 'Atta & Flours'
    );
    const attaQty = attaRecs.reduce((s,r) => s + (r.qty||0), 0);
    const attaVal = attaRecs.reduce((s,r) => s + (r.source_value||0), 0);
    const attaWt  = attaRecs.reduce((s,r) => s + (r.total_weight||0), 0);
    const attaBrands = [...new Set(attaRecs.map(r => r.normalized_brand))];

    console.log(`Atta Records: ${attaRecs.length}`);
    console.log(`Atta Units: ${attaQty}`);
    console.log(`Atta Value: ₹${attaVal.toFixed(2)}`);
    console.log(`Atta Weight: ${attaWt.toFixed(2)} KG`);
    console.log(`Atta Brands (${attaBrands.length}):`, attaBrands);

    console.log('\n=== ELECTRONICS TEST VERIFICATION ===');
    const elecRecs = productsRecords.filter(r => 
      r.normalized_category === 'Electronics & Electricals'
    );
    const elecQty = elecRecs.reduce((s,r) => s + (r.qty||0), 0);
    const elecVal = elecRecs.reduce((s,r) => s + (r.source_value||0), 0);
    const elecWt  = elecRecs.reduce((s,r) => s + (r.total_weight||0), 0);
    const elecBrands = [...new Set(elecRecs.map(r => r.normalized_brand))];

    console.log(`Electronics Records: ${elecRecs.length}`);
    console.log(`Electronics Units: ${elecQty}`);
    console.log(`Electronics Value: ₹${elecVal.toFixed(2)}`);
    console.log(`Electronics Weight: ${elecWt.toFixed(2)} KG`);
    console.log(`Electronics Brands (${elecBrands.length}):`, elecBrands.slice(0, 10));

  } catch(err) {
    console.error('QA Test Error:', err);
  }
}

runFullQATest();
