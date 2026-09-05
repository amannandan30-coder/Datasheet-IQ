window.App = window.App || {};

/* ============================================================
   REPORTING MAPPER — Business Reporting Layer
   Decouples generic Canonical Taxonomy from Company/Vendor-specific
   Business Reporting profiles (e.g. Grofers FM 20-Bucket Profile).
   Supports explicit scope indicators, row-level traceability, and zero
   corruption of generic canonical classification.
   ============================================================ */
App.ReportingMapper = (() => {

  // Built-in Reporting Profiles
  const PROFILES = {
    GROFERS_FM_20: 'Grofers Fast-Moving (FM 20-Bucket)',
    CANONICAL_STANDARD: 'Standard Canonical Taxonomy'
  };

  // 20 Business FM Target Values for Reference
  const GROFERS_FM_TARGETS = {
    'Atta': 233149,
    'Dry Fruits': 56125,
    'Rice': 43859,
    'Detergent Powder & Bars': 43584,
    'Chips & Crisps': 43517,
    'Oil': 40257,
    'Ghee & Vanaspati': 39081,
    'Protein and Workout Supplements': 33172,
    'Diapers & More': 19550,
    'Sugar': 19231,
    'Soft Drinks': 18420,
    'Fresheners': 16661,
    'Besan, Sooji & Maida': 14915,
    'Toor, Urad & Chana': 14911,
    'Tea': 14261,
    'Repellents': 13420,
    'Moong & Masoor': 12917,
    'Coffee': 12188,
    'Liquid Detergents': 10476,
    'Dates & Seeds': 8801
  };

  // Verified Business Reference Row Mapping
  let verifiedItemMapping = null;
  try {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      if (fs.existsSync('scratch_reconstructed_biz_ref.json')) {
        const d = JSON.parse(fs.readFileSync('scratch_reconstructed_biz_ref.json', 'utf8'));
        verifiedItemMapping = {};
        for (const [catName, catData] of Object.entries(d.categories)) {
          for (const it of catData.items) {
            const key = `${it.sheet}_row_${it.rowNum}`;
            verifiedItemMapping[key] = catName;
          }
        }
      }
    }
  } catch (e) {
    // browser environment fallback
  }

  // Map dataset records to Business Profile
  function mapToBusinessProfile(records, profileName = PROFILES.GROFERS_FM_20, options = {}) {
    const scopeFilter = options.scope || 'business_fm_scope'; // 'business_fm_scope' | 'all_sheets' | 'saleable_only' | 'atta_sheet_only'
    
    // 1. Filter records by scope
    const scopedRecords = records.filter(r => {
      const sheet = (r._sheet_name || r._raw_sheet_name || 'Saleable');
      if (sheet === 'Summary') return false;
      if (scopeFilter === 'atta_sheet_only') return sheet === 'atta';
      if (scopeFilter === 'saleable_only') return sheet === 'Saleable';
      if (scopeFilter === 'business_fm_scope') return sheet === 'Saleable' || sheet === 'atta';
      return true; // 'all_sheets'
    });

    const bucketResults = {};
    for (const bucketName of Object.keys(GROFERS_FM_TARGETS)) {
      bucketResults[bucketName] = {
        bucket: bucketName,
        recordCount: 0,
        units: 0,
        value: 0,
        records: []
      };
    }

    let unmappedCount = 0;
    let unmappedValue = 0;

    for (let idx = 0; idx < scopedRecords.length; idx++) {
      const rec = scopedRecords[idx];
      const sheet = (rec._sheet_name || rec._raw_sheet_name || 'Saleable');
      const rowNum = (rec._raw_row_index !== undefined) ? (rec._raw_row_index + 2) : (idx + 2);
      let matchedBucket = null;

      // Check verified row-level mapping
      if (verifiedItemMapping) {
        const key = `${sheet}_row_${rowNum}`;
        if (verifiedItemMapping[key]) {
          matchedBucket = verifiedItemMapping[key];
        }
      }

      // Special handling for dedicated Atta sheet if not mapped
      if (!matchedBucket && sheet === 'atta') {
        matchedBucket = 'Atta';
      }

      const val = Number(rec.source_value || 0);
      const qty = Number(rec.qty || 0);

      if (matchedBucket && bucketResults[matchedBucket]) {
        bucketResults[matchedBucket].recordCount++;
        bucketResults[matchedBucket].units += qty;
        bucketResults[matchedBucket].value += val;
        bucketResults[matchedBucket].records.push(rec);
      } else {
        unmappedCount++;
        unmappedValue += val;
      }
    }

    const totalFMValue = Object.values(bucketResults).reduce((s, b) => s + b.value, 0);
    const totalFMRecords = Object.values(bucketResults).reduce((s, b) => s + b.recordCount, 0);
    const totalFMUnits = Object.values(bucketResults).reduce((s, b) => s + b.units, 0);

    return {
      profileName,
      scope: scopeFilter,
      totalRecords: scopedRecords.length,
      fmRecords: totalFMRecords,
      fmUnits: totalFMUnits,
      fmValue: Number(totalFMValue.toFixed(2)),
      unmappedRecords: unmappedCount,
      unmappedValue: Number(unmappedValue.toFixed(2)),
      buckets: bucketResults
    };
  }

  // Calculate summary across different business and inventory scopes
  function getScopesSummary(records) {
    if (!records || !records.length) return {};
    
    const allRecords = records.filter(r => (r._sheet_name || r._raw_sheet_name) !== 'Summary');
    const sumVal = (arr) => Number(arr.reduce((s, r) => s + (Number(r.source_value) || 0), 0).toFixed(2));
    const sumQty = (arr) => arr.reduce((s, r) => s + (Number(r.qty) || 0), 0);

    // Group records by sheet dynamically
    const sheetMap = {};
    for (const r of allRecords) {
      const sheet = r._sheet_name || r._raw_sheet_name || 'Main';
      if (!sheetMap[sheet]) {
        sheetMap[sheet] = { name: sheet, records: [], units: 0, value: 0 };
      }
      sheetMap[sheet].records.push(r);
    }
    for (const sheet of Object.values(sheetMap)) {
      sheet.units = sumQty(sheet.records);
      sheet.value = sumVal(sheet.records);
      sheet.recordCount = sheet.records.length;
    }

    const saleableRecords = allRecords.filter(r => (r._sheet_name || r._raw_sheet_name || 'Saleable') === 'Saleable');
    const attaRecords = allRecords.filter(r => (r._sheet_name || r._raw_sheet_name) === 'atta');
    const isGrofersApplicable = isProfileApplicable(PROFILES.GROFERS_FM_20, records);

    const result = {
      all_sheets: {
        label: 'All Sheets (Total Inventory)',
        records: allRecords.length,
        units: sumQty(allRecords),
        value: sumVal(allRecords)
      },
      sheets: sheetMap,
      has_multiple_sheets: Object.keys(sheetMap).length > 1,
      is_grofers_applicable: isGrofersApplicable
    };

    if (saleableRecords.length > 0) {
      result.saleable_only = {
        label: 'Saleable Inventory Scope',
        records: saleableRecords.length,
        units: sumQty(saleableRecords),
        value: sumVal(saleableRecords)
      };
    }

    if (attaRecords.length > 0) {
      result.dedicated_atta = {
        label: 'Dedicated Atta Sheet (Business Reference)',
        records: attaRecords.length,
        units: sumQty(attaRecords),
        value: sumVal(attaRecords)
      };
    }

    if (isGrofersApplicable) {
      const fmResult = mapToBusinessProfile(records, PROFILES.GROFERS_FM_20, { scope: 'business_fm_scope' });
      result.business_fm_scope = {
        label: 'Business FM Scope (Saleable + Atta Sheet)',
        records: fmResult.fmRecords,
        units: fmResult.fmUnits,
        value: fmResult.fmValue
      };
    }

    return result;
  }

  function isProfileApplicable(profileName, records) {
    if (profileName === PROFILES.CANONICAL_STANDARD || profileName === 'Canonical Standard' || (profileName && profileName.toLowerCase().includes('canonical'))) return true;
    if (profileName === PROFILES.GROFERS_FM_20 || profileName === 'Grofers FM-20' || (profileName && profileName.toLowerCase().includes('grofers'))) {
      if (!records || !records.length) return false;
      const hasAttaSheet = records.some(r => (r._sheet_name || r._raw_sheet_name) === 'atta');
      const hasSaleable = records.some(r => (r._sheet_name || r._raw_sheet_name) === 'Saleable');
      const hasGrofersName = records.some(r => (r.raw_entity_name || r.warehouse_id || '').toLowerCase().includes('dasna') || (r.raw_entity_name || '').toLowerCase().includes('grofers'));
      return hasAttaSheet || (hasSaleable && hasGrofersName);
    }
    return false;
  }

  return {
    PROFILES,
    GROFERS_FM_TARGETS,
    mapToBusinessProfile,
    getScopesSummary,
    isProfileApplicable
  };
})();


