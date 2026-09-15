const fs = require('fs');
const assert = require('assert');
const XLSX = require('./vendor/xlsx.full.min.js');

global.XLSX = XLSX;
global.window = global;
global.document = {
  createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {} }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};
global.FileReader = class {
  readAsArrayBuffer(file) {
    setTimeout(() => {
      this.onload({ target: { result: file.buffer || file } });
    }, 5);
  }
};
global.App = {
  Views: {},
  Fmt: {
    number: n => String(n),
    currency: n => '₹' + n,
    mass: n => n + ' kg',
    volume: n => n + ' L',
    date: () => '2026-09-15',
    escapeHtml: s => String(s || '')
  }
};

// Load pipeline files
eval(fs.readFileSync('./js/pipeline/validator.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/parser.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/cleaner.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/categorizer.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/brandEngine.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/productIdentityProfiles.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/productEngine.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/inventoryStatusResolver.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/aggregator.js', 'utf8'));
eval(fs.readFileSync('./js/pipeline/pipeline.js', 'utf8'));
eval(fs.readFileSync('./js/views/dataQuality.js', 'utf8'));

async function runDQTests() {
  console.log('================================================================');
  console.log('  DATA QUALITY CENTER — AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('    ' + err.message);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. App.DQAudit Module Exists & Public API
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. App.DQAudit Public API ---');
  test('App.DQAudit is defined', () => {
    assert(App.DQAudit, 'App.DQAudit must be defined');
    assert.strictEqual(typeof App.DQAudit.getAudit, 'function');
    assert.strictEqual(typeof App.DQAudit.invalidateCache, 'function');
  });

  test('emptyResult returned on null or empty input', () => {
    const res = App.DQAudit.getAudit('empty_test', []);
    assert.strictEqual(res.total, 0);
    assert.strictEqual(res.overall, 100);
    assert.strictEqual(res.severity.critical, 0);
    assert.strictEqual(res.severity.warning, 0);
    assert.strictEqual(res.severity.info, 0);
    App.DQAudit.invalidateCache();
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Severity Amplification & Mathematical Scoring (Formula Check)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Severity Amplification & Mathematical Scoring ---');
  test('CRITICAL issue penalty >> INFO issue penalty (8000 records)', () => {
    const total = 8000;
    // Scenario 1: 1000 INFO missing UPC
    const infoRecords = Array.from({ length: total }, (_, i) => ({
      id: 'rec_' + i,
      item_id: 'ITM_' + i,
      upc: i < 1000 ? '' : '123456789012',
      normalized_category: 'Grocery',
      normalized_brand: 'BrandA',
      resolved_status: 'sellable',
      status_confidence: 'HIGH',
      is_status_conflict: false,
      total_weight: 1.0,
      total_volume_l: 1.0,
      qty: 10,
      variant_mrp: 100,
      source_value: 1000
    }));

    App.DQAudit.invalidateCache();
    const infoAudit = App.DQAudit.getAudit('ds_info', infoRecords);

    // Scenario 2: 10 CRITICAL negative value
    const critRecords = Array.from({ length: total }, (_, i) => ({
      id: 'rec_' + i,
      item_id: 'ITM_' + i,
      upc: '123456789012',
      normalized_category: 'Grocery',
      normalized_brand: 'BrandA',
      resolved_status: 'sellable',
      status_confidence: 'HIGH',
      is_status_conflict: false,
      total_weight: 1.0,
      total_volume_l: 1.0,
      qty: 10,
      variant_mrp: 100,
      source_value: i < 10 ? -50 : 1000
    }));

    App.DQAudit.invalidateCache();
    const critAudit = App.DQAudit.getAudit('ds_crit', critRecords);

    console.log(`    1000 INFO Missing UPC -> Identity Score: ${infoAudit.dims.identity.score}% | Overall: ${infoAudit.overall}%`);
    console.log(`    10 CRITICAL Negative Value -> Financial Score: ${critAudit.dims.financial.score}% | Overall: ${critAudit.overall}%`);

    // 10 critical issues must cause a larger drop in its dimension than 1000 info issues in its dimension
    const infoDimPenalty = 100 - infoAudit.dims.identity.score;
    const critDimPenalty = 100 - critAudit.dims.financial.score;
    assert(critDimPenalty > infoDimPenalty, `CRITICAL penalty (${critDimPenalty}%) must exceed INFO penalty (${infoDimPenalty}%)`);
    assert(infoAudit.dims.identity.score > 90, `1000 optional INFO issues should maintain score > 90% (got ${infoAudit.dims.identity.score}%)`);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Zero Value vs Missing Value Separation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Zero Value vs Missing Value Separation ---');
  test('Differentiates explicit 0 from null/undefined/NaN', () => {
    const records = [
      { id: 'r1', item_id: '1', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 5, variant_mrp: null, source_value: undefined },
      { id: 'r2', item_id: '2', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 5, variant_mrp: 0, source_value: 0 },
      { id: 'r3', item_id: '3', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 5, variant_mrp: 100, source_value: 500 }
    ];

    App.DQAudit.invalidateCache();
    const audit = App.DQAudit.getAudit('zero_vs_missing', records);

    assert(audit.checks.missing_mrp.ids.includes('r1'), 'r1 must be missing_mrp (WARNING)');
    assert(!audit.checks.zero_mrp.ids.includes('r1'), 'r1 must NOT be zero_mrp');

    assert(audit.checks.zero_mrp.ids.includes('r2'), 'r2 must be zero_mrp (INFO)');
    assert(!audit.checks.missing_mrp.ids.includes('r2'), 'r2 must NOT be missing_mrp');

    assert(audit.checks.missing_value.ids.includes('r1'), 'r1 must be missing_value (WARNING)');
    assert(audit.checks.zero_value.ids.includes('r2'), 'r2 must be zero_value (INFO)');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Status Conflict & Status Resolution Integration
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Status Conflict & Canonical Status Integration ---');
  test('Detects is_status_conflict without overriding resolved_status', () => {
    const records = [
      { id: 'r1', item_id: '1', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 1, variant_mrp: 10, source_value: 10, is_status_conflict: true, resolved_status: 'unknown', status_confidence: 'LOW' },
      { id: 'r2', item_id: '2', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 1, variant_mrp: 10, source_value: 10, is_status_conflict: false, resolved_status: 'sellable', status_confidence: 'HIGH' }
    ];

    App.DQAudit.invalidateCache();
    const audit = App.DQAudit.getAudit('status_test', records);

    assert(audit.checks.status_conflict.ids.includes('r1'), 'r1 must trigger status_conflict');
    assert(!audit.checks.status_conflict.ids.includes('r2'), 'r2 must NOT trigger status_conflict');
    assert(audit.checks.low_conf_status.ids.includes('r1'), 'r1 has LOW confidence status');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Caching & Determinism
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Caching & Determinism ---');
  test('Repeated calls return exact same cached object reference and score', () => {
    const records = [
      { id: 'r1', item_id: '1', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 5, variant_mrp: 100, source_value: 500 },
      { id: 'r2', item_id: '2', upc: '12345678', normalized_category: 'Food', normalized_brand: 'B', qty: 5, variant_mrp: 100, source_value: 500 }
    ];
    App.DQAudit.invalidateCache();
    const a1 = App.DQAudit.getAudit('cache_ds', records);
    const a2 = App.DQAudit.getAudit('cache_ds', records);

    assert.strictEqual(a1, a2, 'Same dataset_id must return identical cached object');
    assert.strictEqual(a1.overall, a2.overall, 'Score must be deterministic');

    App.DQAudit.invalidateCache();
    const a3 = App.DQAudit.getAudit('cache_ds', records);
    assert.notStrictEqual(a1, a3, 'After invalidateCache, a new result object is computed');
    assert.strictEqual(a1.overall, a3.overall, 'Computed score must match exactly');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Read-Only Invariant: Zero Mutation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Read-Only Invariant ---');
  test('Records are never mutated by App.DQAudit.getAudit', () => {
    const record = {
      id: 'r_immutable',
      item_id: 'ITM_TEST',
      upc: '123456789012',
      normalized_category: 'Other / Uncategorized',
      normalized_brand: 'Unknown',
      qty: 0,
      variant_mrp: null,
      source_value: -100
    };
    const snapshot = JSON.stringify(record);

    App.DQAudit.invalidateCache();
    App.DQAudit.getAudit('immutable_ds', [record]);

    assert.strictEqual(JSON.stringify(record), snapshot, 'Record was mutated by DQ audit!');
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Real Dataset Audit Verification (B:/Excel File/sheet 1.xlsx)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Real Dataset End-to-End Audit (B:/Excel File/sheet 1.xlsx) ---');
  if (fs.existsSync('B:/Excel File/sheet 1.xlsx')) {
    const buf = fs.readFileSync('B:/Excel File/sheet 1.xlsx');
    const parsed = await App.Parser.parse({ name: 'sheet 1.xlsx', size: buf.length, buffer: buf });
    const cleaned = App.Cleaner.cleanAll(parsed.rows);
    
    // Assign IDs if needed by pipeline
    cleaned.forEach((r, idx) => { if (!r.id) r.id = 'rec_' + idx; });

    console.log(`    Loaded Sheet 1: ${cleaned.length} canonical records`);

    App.DQAudit.invalidateCache();
    const audit = App.DQAudit.getAudit('real_sheet1', cleaned);

    test('Data Quality total record count matches canonical dataset count', () => {
      assert.strictEqual(audit.total, cleaned.length, `audit.total (${audit.total}) must match cleaned.length (${cleaned.length})`);
    });

    test('Overall quality score is a valid number between 0 and 100', () => {
      assert(typeof audit.overall === 'number' && !isNaN(audit.overall), 'Score must be a number');
      assert(audit.overall >= 0 && audit.overall <= 100, `Score must be in [0, 100], got ${audit.overall}`);
      console.log(`    Real Dataset DQ Score: ${audit.overall} / 100`);
    });

    test('Dimension breakdown scores are valid and bounded', () => {
      for (const [dimKey, dim] of Object.entries(audit.dims)) {
        assert(dim.score >= 0 && dim.score <= 100, `Dimension ${dimKey} score out of bounds: ${dim.score}`);
        console.log(`      ${dimKey.padEnd(16)}: ${dim.score}% (affected: ${dim.affected})`);
      }
    });

    test('Severity counts sum to total issue instances', () => {
      const sum = audit.severity.critical + audit.severity.warning + audit.severity.info;
      assert.strictEqual(sum, audit.totalIssueInstances, `Severity sum (${sum}) must equal totalIssueInstances (${audit.totalIssueInstances})`);
      console.log(`    Severity: Critical=${audit.severity.critical}, Warning=${audit.severity.warning}, Info=${audit.severity.info}`);
    });

    test('Dashboard DQ score matches Data Quality page audit score exactly', () => {
      // Dashboard calls App.DQAudit.getAudit(dataset_id, records)
      const dashAudit = App.DQAudit.getAudit('real_sheet1', cleaned);
      assert.strictEqual(dashAudit.overall, audit.overall, 'Dashboard DQ score must match Data Quality page score exactly');
    });

    test('Multiple consecutive calls produce deterministic score', () => {
      const call1 = App.DQAudit.getAudit('real_sheet1', cleaned).overall;
      const call2 = App.DQAudit.getAudit('real_sheet1', cleaned).overall;
      assert.strictEqual(call1, call2, 'Audit must produce identical score on consecutive calls');
    });
  } else {
    console.log('    Skipped real dataset test (file not found)');
  }

  // ─────────────────────────────────────────────────────────────
  // Final Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runDQTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
