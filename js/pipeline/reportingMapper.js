window.App = window.App || {};

/*
   REPORTING PROFILE MAPPER & BUSINESS SCOPE RECONCILER
   Decouples generic Canonical Taxonomy from Company/Vendor-specific
   Business Reporting profiles (e.g. Grofers FM 20-Bucket Profile).
   Supports bucket-specific scope rules, dynamic category predicates,
   immutable row keys (dataset_id + sheet + source_row), and exact
   set reconciliation with zero static hardcoding or canonical corruption.
*/
App.ReportingMapper = (() => {

  // Built-in Reporting Profiles
  const PROFILES = {
    GROFERS_FM_20: 'Grofers Fast-Moving (FM 20-Bucket)',
    CANONICAL_STANDARD: 'Standard Canonical Taxonomy'
  };

  // 20 Business FM Target Values & Bucket-Specific Scope Configs
  const GROFERS_FM_BUCKET_CONFIG = {
    'Atta': {
      target: 233149,
      scopeRule: 'dedicated_atta_sheet',
      allowedSheets: ['atta'],
      scopeLabel: 'Dedicated Atta Sheet Scope',
      description: 'Dedicated Atta sheet source inventory rows',
      canonicalAliases: ['Atta & Flours', 'Atta', 'Flours']
    },
    'Dry Fruits': {
      target: 56125,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Dry Fruits & Nuts', 'Dry Fruits', 'Nuts', 'Dry Fruits & Seeds']
    },
    'Rice': {
      target: 43859,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Rice', 'Basmati Rice', 'Rice & Grains']
    },
    'Detergent Powder & Bars': {
      target: 43584,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Detergent Powder & Bars', 'Detergents & Laundry', 'Detergent Powder', 'Laundry', 'Detergents']
    },
    'Chips & Crisps': {
      target: 43517,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Chips & Crisps', 'Snacks & Namkeen', 'Biscuits & Cookies', 'Chips', 'Snacks']
    },
    'Oil': {
      target: 40257,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Edible Oils', 'Oils', 'Oil', 'Cooking Oil']
    },
    'Ghee & Vanaspati': {
      target: 39081,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Ghee & Vanaspati', 'Ghee', 'Vanaspati']
    },
    'Protein and Workout Supplements': {
      target: 33172,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Protein and Workout Supplements', 'Protein & Workout Supplements', 'Supplements', 'Health Drinks']
    },
    'Diapers & More': {
      target: 19550,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Diapers & More', 'Baby Care', 'Diapers']
    },
    'Sugar': {
      target: 19231,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Sugar', 'Sugar & Jaggery', 'Sweeteners']
    },
    'Soft Drinks': {
      target: 18420,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Soft Drinks', 'Beverages', 'Juices & Drinks', 'Cold Drinks']
    },
    'Fresheners': {
      target: 16661,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Fresheners', 'Air Fresheners', 'Home Fragrance']
    },
    'Besan, Sooji & Maida': {
      target: 14915,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Besan, Sooji & Maida', 'Flours & Grains', 'Besan', 'Flours']
    },
    'Toor, Urad & Chana': {
      target: 14911,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Toor, Urad & Chana', 'Pulses', 'Dals & Pulses', 'Pulses & Lentils']
    },
    'Tea': {
      target: 14261,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Tea', 'Tea & Coffee']
    },
    'Repellents': {
      target: 13420,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Repellents', 'Pest Control', 'Mosquito Repellents']
    },
    'Moong & Masoor': {
      target: 12917,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Moong & Masoor', 'Pulses', 'Dals & Pulses', 'Pulses & Lentils']
    },
    'Coffee': {
      target: 12188,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Coffee', 'Tea & Coffee']
    },
    'Liquid Detergents': {
      target: 10476,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Liquid Detergents', 'Detergents & Laundry', 'Fabric Care', 'Liquid Detergent']
    },
    'Dates & Seeds': {
      target: 8801,
      scopeRule: 'saleable_sheet',
      allowedSheets: ['Saleable'],
      scopeLabel: 'Saleable Sheet Scope',
      description: 'Saleable sheet inventory rows',
      canonicalAliases: ['Dates & Seeds', 'Dry Fruits & Seeds', 'Seeds', 'Dates']
    }
  };

  const GROFERS_FM_TARGETS = {};
  for (const [k, v] of Object.entries(GROFERS_FM_BUCKET_CONFIG)) {
    GROFERS_FM_TARGETS[k] = v.target;
  }

  // Dynamic Pure Predicates for Business Buckets
  const BUCKET_PREDICATES = {
    'Atta': (r) => {
      const sheet = r._sheet_name || r._raw_sheet_name || '';
      if (sheet === 'atta') return true;
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(atta|chakki|multigrain atta|wheat atta)\b/i.test(name) && !/\b(rice flour|besan|maida|sooji|rava)\b/i.test(name);
    },
    'Coffee': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      const brand = String(r.normalized_brand || r.brand || '').toLowerCase();
      return (/\b(coffee|nescafe|bru|davidoff|continental|sleepy owl|blue tokai)\b/i.test(name) ||
              /\b(nescafe|bru|davidoff|continental|sleepy owl|blue tokai)\b/i.test(brand)) &&
             !/\b(sweet karam coffee|mug|face|scrub|body|shampoo|pakoda|mixture|murukku|mysore pak|chewing gum|mint|barley)\b/i.test(name) &&
             !/\b(sweet karam coffee)\b/i.test(brand);
    },
    'Liquid Detergents': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return (/\b(liquid detergent|surf excel matic liquid|ariel matic liquid|genteel|godrej easi|easy liquid|vanish liquid|tide liquid|comfort fabric conditioner|fabric conditioner|fabric softener)\b/i.test(name) ||
              (/\b(detergent|wash)\b/i.test(name) && /\b(liquid|gel|matic liquid)\b/i.test(name)));
    },
    'Detergent Powder & Bars': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return (/\b(detergent|washing powder|surf excel|ariel|tide|wheel|rin|active wheel|ghadi|nirma|henko|detergent bar|washing bar|rin bar|surf bar)\b/i.test(name) &&
              !/\b(liquid|gel|matic liquid|fabric conditioner|fabric softener|genteel|easi)\b/i.test(name));
    },
    'Repellents': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(repellent|mosquito|good knight|goodknight|all out|allout|hit|mortein|vaporizer|liquid refill|coils|maxo|fast card)\b/i.test(name) &&
             !/\b(cockroach spray|rat kill|ant powder)\b/i.test(name);
    },
    'Fresheners': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(freshener|air freshener|pocket freshener|room spray|odonil|godrej aer|ambipur|ambi pur|glade|camphor cone|bathroom freshener|block|camphor)\b/i.test(name) &&
             !/\b(mouth|body|deodorant|perfume)\b/i.test(name);
    },
    'Diapers & More': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(diaper|diapers|wipes|pampers|huggies|mamy poko|baby pants|pull up pants|baby wipe)\b/i.test(name) &&
             !/\b(adult diaper|sanitary)\b/i.test(name);
    },
    'Tea': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(tea|chai|green tea|black tea|lemon tea|masala tea|taj mahal|red label|tata tea|society tea|wagh bakri|lipton|tetley|twinings|earl grey|chamomile|herbal tea)\b/i.test(name) &&
             !/\b(ice tea|iced tea|tea tree|trail mix)\b/i.test(name);
    },
    'Soft Drinks': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(coke|coca cola|coca-cola|pepsi|thums up|thumsup|sprite|fanta|mirinda|limca|mountain dew|7up|seven up|sting|red bull|monster|appy fizz|jeera soda|soda|tonic water|ginger ale|energy drink|soft drink|carbonated|lemonade|cold drink|real|tropicana|paper boat|minute maid|slice|maaza|frooti|fruit juice|fruit drink|squash|syrup)\b/i.test(name) &&
             !/\b(trail mix|dry fruit|milk|shake|lassi|chaas|water)\b/i.test(name);
    },
    'Sugar': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(sugar|jaggery|gur|guda|bura|shakkar|icing sugar|brown sugar|sweetener|sugarfree|sugar free|stevia)\b/i.test(name) &&
             !/\b(scrub|cookie|cookies|candy|chocolate|syrup|beverage|cashew|biscuit)\b/i.test(name);
    },
    'Moong & Masoor': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(moong|masoor|mung|masur|malka)\b/i.test(name) &&
             !/\b(papad|namkeen|chips|biscuit|toor|urad|chana)\b/i.test(name);
    },
    'Toor, Urad & Chana': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(toor|arhar|urad|chana)\b/i.test(name) &&
             /\b(dal|whole|sabut|chilka|dhuli|mota|desi|safed|kala|kabuli)\b/i.test(name) &&
             !/\b(moong|masoor|papad|namkeen|chips|biscuit|sattu|atta|besan|roasted|burfi)\b/i.test(name);
    },
    'Besan, Sooji & Maida': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(besan|sooji|suji|maida|rava|semolina|gram flour|fine flour|all purpose flour|all-purpose flour)\b/i.test(name) &&
             !/\b(jowar|bajra|ragi|jau|barley|rajgira|sattu|singhara|kuttu|dalia|daliya)\b/i.test(name);
    },
    'Ghee & Vanaspati': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return (/\b(ghee|vanaspati|cow ghee|desi ghee|shuddh ghee)\b/i.test(name) ||
              (/\bdalda\b/i.test(name) && !/\bmustard oil|refined oil|sarson\b/i.test(name))) &&
             !/\b(diya|batti|wax|candle|burfi|mithai)\b/i.test(name);
    },
    'Oil': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(mustard oil|refined oil|sunflower oil|soyabean oil|groundnut oil|canola oil|rice bran oil|olive oil|sesame oil|til oil|sarson|fortune oil|emami oil|saffola|dhara|kachi ghani|cooking oil|edible oil)\b/i.test(name) &&
             !/\b(hair|body|massage|baby oil|skin|beard|lamp|puja|engine|makhana|olive oil roasted)\b/i.test(name);
    },
    'Rice': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return (/\b(rice|basmati|chawal|kolam|sona masoori|gobindobhog)\b/i.test(name) || /\bpoha\b/i.test(name)) &&
             !/\b(hair|gel|face|cream|dog food|pet|roli|paper|vermicelli|chips|bran oil|cooking oil|blended oil|sunflower)\b/i.test(name);
    },
    'Protein and Workout Supplements': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(protein|whey|creatine|bcaa|mass gainer|muscle|workout|pre-workout|isolate|casein|glutamine|multivitamin sports|nutrition supplement|optimum nutrition|muscleblaze|myprotein|gnc|raw whey|biozyme)\b/i.test(name) &&
             !/\b(shampoo|hair|biscuit|flour|atta|chips|ragi chips)\b/i.test(name);
    },
    'Chips & Crisps': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(chips|crisps|nachos|lays|lay's|pringles|bingo|kurkure|doritos|cornitos|potato chips|banana chips|wafers|crax|mad angles)\b/i.test(name) &&
             !/\b(namkeen|bhujia|sev|mixture)\b/i.test(name);
    },
    'Dates & Seeds': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(dates|date|khajoor|khajur|chia seeds|flax seeds|pumpkin seeds|sunflower seeds|watermelon seeds|basil seeds|sabja|hemp seeds|sesame seeds|til seeds|seed mix|mixed seeds)\b/i.test(name) &&
             !/\b(oil|face|scrub|biscuit|cookie|chocolate|sweet|mithai)\b/i.test(name);
    },
    'Dry Fruits': (r) => {
      const name = String(r.normalized_product_name || r.name || '').toLowerCase();
      return /\b(almond|badam|cashew|kaju|walnut|akhrot|pista|pistachio|raisin|kismis|kishmish|makhana|fox nuts|anjeer|fig|hazelnut|prunes|apricot|khubani|dry fruit|dry fruits)\b/i.test(name) &&
             !/\b(dates|khajoor|khajur|chia|flax|pumpkin seeds|sunflower seeds|watermelon seeds|sesame seeds|til seeds|chocolate|biscuit|cookie|ice cream|burfi|mithai)\b/i.test(name);
    }
  };

  // Immutable row key generator (dataset_id + sheet + source_row)
  function getRowKey(rec, idx) {
    if (!rec) return null;
    const datasetId = rec.dataset_id || rec._dataset_id || 'ds';
    const sheet = rec._sheet_name || rec._raw_sheet_name || (rec._raw && rec._raw._sheet_name) || 'main';
    const rowNum = rec._source_row || rec.source_row || (rec._raw && rec._raw._source_row) || (rec._raw_row_index != null ? rec._raw_row_index + 2 : (idx != null ? idx + 2 : '0'));
    return datasetId + ':' + sheet + ':row_' + rowNum;
  }

  // Dynamic Bucket Resolver for a record
  function getBucketForRecord(rec, idx) {
    if (!rec) return null;
    const rawSheet = rec._sheet_name || rec._raw_sheet_name || (rec._raw && rec._raw._sheet_name) || 'Saleable';
    const sheet = String(rawSheet).trim().toLowerCase();
    
    // Dedicated Atta sheet rule
    if (sheet === 'atta' || sheet.startsWith('atta')) {
      return 'Atta';
    }

    // Evaluate predicates in order for Saleable sheet
    for (const [bucketName, pred] of Object.entries(BUCKET_PREDICATES)) {
      if (bucketName === 'Atta') continue;
      const cfg = GROFERS_FM_BUCKET_CONFIG[bucketName];
      if (cfg && cfg.allowedSheets) {
        const allowedLower = cfg.allowedSheets.map(s => String(s).trim().toLowerCase());
        if (!allowedLower.includes(sheet)) continue;
      }
      if (pred(rec)) {
        return bucketName;
      }
    }

    return null;
  }

  function getFMBucketForSubcat(subcat, cat) {
    if (!subcat) return null;
    const s = subcat.trim().toLowerCase();
    for (const [bName, cfg] of Object.entries(GROFERS_FM_BUCKET_CONFIG)) {
      if (bName.toLowerCase() === s) return bName;
      if (cfg.canonicalAliases && cfg.canonicalAliases.some(a => a.toLowerCase() === s)) {
        return bName;
      }
    }
    return null;
  }

  // Map dataset records to Business Profile with bucket-specific scope filtering
  function mapToBusinessProfile(records, profileName, options) {
    profileName = profileName || PROFILES.GROFERS_FM_20;
    options = options || {};
    const scopeFilter = options.scope || 'business_fm_scope';
    
    const scopedRecords = (records || []).filter(r => {
      const sheet = (r._sheet_name || r._raw_sheet_name || 'Saleable');
      if (sheet === 'Summary') return false;
      if (scopeFilter === 'atta_sheet_only') return sheet === 'atta';
      if (scopeFilter === 'saleable_only') return sheet === 'Saleable';
      if (scopeFilter === 'business_fm_scope') return sheet === 'Saleable' || sheet === 'atta';
      return true;
    });

    const bucketResults = {};
    for (const [bucketName, cfg] of Object.entries(GROFERS_FM_BUCKET_CONFIG)) {
      bucketResults[bucketName] = {
        bucket: bucketName,
        targetValue: cfg.target,
        scopeRule: cfg.scopeRule,
        scopeLabel: cfg.scopeLabel,
        allowedSheets: cfg.allowedSheets,
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
      const matchedBucket = getBucketForRecord(rec, idx);
      const val = Number(rec.source_value || 0);
      const qty = Number(rec.qty || 0);

      if (matchedBucket && bucketResults[matchedBucket]) {
        const bucketCfg = GROFERS_FM_BUCKET_CONFIG[matchedBucket];
        if (bucketCfg && bucketCfg.allowedSheets && !bucketCfg.allowedSheets.includes(sheet)) {
          unmappedCount++;
          unmappedValue += val;
          continue;
        }

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

  // Exact row-level reconciliation between Canonical records and Business Scope records
  function getCategoryReconciliation(catName, subcatName, allDatasetRecords, profileName, options) {
    profileName = profileName || (window.App && window.App.State && window.App.State.activeReportingProfile) || PROFILES.CANONICAL_STANDARD;
    if (!allDatasetRecords || !allDatasetRecords.length) {
      return { hasBusinessScope: false, isConfigured: false };
    }

    if (profileName === PROFILES.CANONICAL_STANDARD) {
      return { hasBusinessScope: false, isProfileApplicable: false, isConfigured: false, profileName };
    }

    const isApplicable = (options && options.force) ? true : isProfileApplicable(profileName, allDatasetRecords);
    if (!isApplicable) {
      return { hasBusinessScope: false, isProfileApplicable: false, isConfigured: false };
    }

    const matchedBucketName = getFMBucketForSubcat(subcatName, catName);
    if (!matchedBucketName || !GROFERS_FM_BUCKET_CONFIG[matchedBucketName]) {
      return {
        hasBusinessScope: false,
        isProfileApplicable: true,
        isConfigured: false,
        subcatName: subcatName || catName,
        profileName: profileName
      };
    }

    const bucketCfg = GROFERS_FM_BUCKET_CONFIG[matchedBucketName];

    // 1. Canonical records (filtered by semantic taxonomy)
    const canonicalRecords = allDatasetRecords.filter(r => {
      const sName = r.subcategory || '';
      if (subcatName && sName === subcatName) return true;
      if (sName === matchedBucketName) return true;
      if (bucketCfg.canonicalAliases && bucketCfg.canonicalAliases.some(a => a.toLowerCase() === sName.toLowerCase())) {
        return true;
      }
      return false;
    });

    // 2. Business scope records (filtered dynamically by bucket-specific scope rule & predicates)
    const businessRecords = allDatasetRecords.filter((rec, idx) => {
      const rawSheet = rec._sheet_name || rec._raw_sheet_name || 'Saleable';
      const sheet = String(rawSheet).trim().toLowerCase();
      if (bucketCfg.allowedSheets) {
        const allowedLower = bucketCfg.allowedSheets.map(s => String(s).trim().toLowerCase());
        if (!allowedLower.includes(sheet)) return false;
      }
      const b = getBucketForRecord(rec, idx);
      return b === matchedBucketName;
    });

    // 3. Exact row-set comparison based on immutable row keys
    const canonicalKeyMap = new Map();
    canonicalRecords.forEach((r, idx) => {
      const k = getRowKey(r, idx);
      if (k) canonicalKeyMap.set(k, r);
    });

    const businessKeyMap = new Map();
    businessRecords.forEach((r, idx) => {
      const k = getRowKey(r, idx);
      if (k) businessKeyMap.set(k, r);
    });

    const intersection = [];
    const canonicalOnly = [];
    const businessOnly = [];

    for (const [k, r] of canonicalKeyMap.entries()) {
      if (businessKeyMap.has(k)) {
        intersection.push(r);
      } else {
        canonicalOnly.push(r);
      }
    }

    for (const [k, r] of businessKeyMap.entries()) {
      if (!canonicalKeyMap.has(k)) {
        businessOnly.push(r);
      }
    }

    const sumVal = (arr) => Number(arr.reduce((s, r) => s + (Number(r.source_value) || 0), 0).toFixed(2));
    const sumQty = (arr) => arr.reduce((s, r) => s + (Number(r.qty) || 0), 0);

    const unitsDelta = sumQty(canonicalRecords) - sumQty(businessRecords);
    const valueDelta = Number((sumVal(canonicalRecords) - sumVal(businessRecords)).toFixed(2));
    const expectedRows = businessRecords.length;
    const actualRows = canonicalRecords.length;
    const missingRows = businessOnly.length;
    const extraRows = canonicalOnly.length;

    return {
      hasBusinessScope: true,
      isConfigured: true,
      profileName: profileName,
      bucketName: matchedBucketName,
      targetValue: bucketCfg.target,
      scopeRule: bucketCfg.scopeRule,
      scopeLabel: bucketCfg.scopeLabel,
      scopeDescription: bucketCfg.description,
      allowedSheets: bucketCfg.allowedSheets,
      expectedRows: expectedRows,
      actualRows: actualRows,
      missingRows: missingRows,
      extraRows: extraRows,
      unitsDelta: unitsDelta,
      valueDelta: valueDelta,
      canonical: {
        records: canonicalRecords.length,
        units: sumQty(canonicalRecords),
        value: sumVal(canonicalRecords),
        rows: canonicalRecords
      },
      business: {
        records: businessRecords.length,
        units: sumQty(businessRecords),
        value: sumVal(businessRecords),
        rows: businessRecords
      },
      reconciliation: {
        intersectionCount: intersection.length,
        intersectionUnits: sumQty(intersection),
        intersectionValue: sumVal(intersection),
        intersectionRows: intersection,
        canonicalOnlyCount: canonicalOnly.length,
        canonicalOnlyUnits: sumQty(canonicalOnly),
        canonicalOnlyValue: sumVal(canonicalOnly),
        canonicalOnlyRows: canonicalOnly,
        businessOnlyCount: businessOnly.length,
        businessOnlyUnits: sumQty(businessOnly),
        businessOnlyValue: sumVal(businessOnly),
        businessOnlyRows: businessOnly
      }
    };
  }

  // Calculate summary across different business and inventory scopes
  function getScopesSummary(records) {
    if (!records || !records.length) return {};
    
    const allRecords = records.filter(r => (r._sheet_name || r._raw_sheet_name) !== 'Summary');
    const sumVal = (arr) => Number(arr.reduce((s, r) => s + (Number(r.source_value) || 0), 0).toFixed(2));
    const sumQty = (arr) => arr.reduce((s, r) => s + (Number(r.qty) || 0), 0);

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

    const saleableRecords = allRecords.filter(r => {
      const s = String(r._sheet_name || r._raw_sheet_name || 'Saleable').trim().toLowerCase();
      return s === 'saleable' || s === 'sellable' || s.includes('saleable') || s.includes('sellable');
    });
    const attaRecords = allRecords.filter(r => {
      const s = String(r._sheet_name || r._raw_sheet_name || '').trim().toLowerCase();
      return s === 'atta' || s.startsWith('atta');
    });
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
    if (!profileName) return false;
    const pNorm = String(profileName).toLowerCase().trim();
    if (pNorm.includes('canonical') || pNorm.includes('standard')) return true;
    
    // Explicit opt-in only:
    // Grofers FM 20-Bucket or other historical business profiles are NEVER automatically activated
    // for arbitrary workbooks based on loose heuristics (sheet names like 'atta' or generic warehouse terms).
    // It is only applicable if explicitly enabled on the application state / active profile.
    if (typeof window !== 'undefined' && window.App && window.App.State && window.App.State.activeReportingProfile) {
      const activeP = String(window.App.State.activeReportingProfile).toLowerCase().trim();
      if (activeP === pNorm || (activeP.includes('grofers') && pNorm.includes('grofers'))) {
        return true;
      }
    }
    return false;
  }

  return {
    PROFILES,
    GROFERS_FM_TARGETS,
    GROFERS_FM_BUCKET_CONFIG,
    BUCKET_PREDICATES,
    getRowKey,
    getBucketForRecord,
    getFMBucketForSubcat,
    mapToBusinessProfile,
    getCategoryReconciliation,
    getScopesSummary,
    isProfileApplicable
  };
})();