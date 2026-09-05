window.App = window.App || {};

/* ============================================================
   BRAND ENGINE
   Priority: strong signals (item_id/UPC) → then fingerprinting & fuzzy
   Never auto-merge without confidence ≥ HIGH
   ============================================================ */
App.BrandEngine = (() => {

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return (maxLen - levenshtein(a, b)) / maxLen;
  }

  /* Legal/entity suffixes and stop words for brand fingerprinting */
  const NOISE_WORDS = new Set([
    'the','a','an','and','or','of','for','by',
    'pvt','ltd','inc','corp','llp','limited','private','co','company'
  ]);

  function fingerprint(brand) {
    if (!brand) return '';
    return brand.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !NOISE_WORDS.has(w))
      .sort()
      .join(' ')
      .trim();
  }

  /* Build brand master from records */
  function buildBrandMaster(records, dataset_id) {
    const fingerprintMap = new Map();

    for (const rec of records) {
      const rawBrand = rec.raw_brand || rec.normalized_brand || 'Unknown Brand';
      const cleanBrand = rec.normalized_brand || rawBrand;
      const fp  = fingerprint(cleanBrand) || fingerprint(rawBrand) || cleanBrand.toLowerCase().trim();

      if (!fingerprintMap.has(fp)) {
        fingerprintMap.set(fp, {
          id: crypto.randomUUID(),
          dataset_id,
          canonical_brand_name: cleanBrand,
          raw_brand_names: new Set([rawBrand]),
          fingerprint: fp,
          status: 'active',
          record_count: 0,
          total_qty: 0,
          total_value: 0,
          total_weight: 0,
        });
      }
      const entry = fingerprintMap.get(fp);
      entry.raw_brand_names.add(rawBrand);
      if (cleanBrand !== rawBrand) entry.raw_brand_names.add(cleanBrand);

      // Keep shortest clean name as canonical if cleaner (e.g. "Pillsbury" over "Pillsbury Atta")
      if (cleanBrand.length < entry.canonical_brand_name.length && cleanBrand.length >= 3) {
        entry.canonical_brand_name = cleanBrand;
      }
      entry.record_count++;
      entry.total_qty    += (rec.qty || 0);
      entry.total_value  += (rec.source_value || 0);
      entry.total_weight += (rec.total_weight || 0);
    }

    const brandList = [];
    const fpToBrandId = new Map();

    for (const [fp, brand] of fingerprintMap) {
      brand.raw_brand_names = [...brand.raw_brand_names];
      brand.aliases         = brand.raw_brand_names.filter(n => n !== brand.canonical_brand_name);
      brandList.push(brand);
      fpToBrandId.set(fp, brand.id);
    }

    // Detect possible brand merge suggestions
    const suggestions = [];
    const brandArr = [...fingerprintMap.values()];

    for (let i = 0; i < brandArr.length; i++) {
      for (let j = i + 1; j < brandArr.length; j++) {
        const a = brandArr[i];
        const b = brandArr[j];
        const sim = similarity(a.fingerprint, b.fingerprint);

        if (sim >= 0.7 && sim < 1.0) {
          const confidence = sim >= 0.85 ? 'MEDIUM' : 'LOW';
          suggestions.push({
            id: crypto.randomUUID(),
            dataset_id,
            type: 'brand_merge',
            brand_id_a: a.id,
            brand_name_a: a.canonical_brand_name,
            brand_id_b: b.id,
            brand_name_b: b.canonical_brand_name,
            similarity: Math.round(sim * 100),
            confidence,
            status: 'pending',
            created_at: Date.now(),
          });
        }
      }
    }

    // Assign brand_id and updated canonical brand name to records
    const enrichedRecords = records.map(rec => {
      const raw = rec.normalized_brand || 'Unknown Brand';
      const fp  = fingerprint(raw) || raw.toLowerCase().trim();
      const brandObj = fingerprintMap.get(fp);
      const brand_id = brandObj ? brandObj.id : null;
      const canonicalName = brandObj ? brandObj.canonical_brand_name : raw;

      return {
        ...rec,
        brand_id,
        brand_fingerprint: fp,
        normalized_brand: canonicalName
      };
    });

    return { brands: brandList, suggestions, records: enrichedRecords };
  }

  /* Apply a brand merge */
  function applyMerge(records, brands, brandIdA, brandIdB, keepId) {
    const removeId    = keepId === brandIdA ? brandIdB : brandIdA;
    const keepBrand   = brands.find(b => b.id === keepId);
    const removeBrand = brands.find(b => b.id === removeId);

    if (!keepBrand || !removeBrand) return { records, brands };

    keepBrand.raw_brand_names = [...new Set([...keepBrand.raw_brand_names, ...removeBrand.raw_brand_names])];
    keepBrand.aliases = keepBrand.raw_brand_names.filter(n => n !== keepBrand.canonical_brand_name);
    keepBrand.record_count += removeBrand.record_count;
    keepBrand.total_qty    += removeBrand.total_qty;
    keepBrand.total_value  += removeBrand.total_value;
    keepBrand.total_weight += removeBrand.total_weight;

    const updRecords = records.map(r => {
      if (r.brand_id === removeId) {
        return { ...r, brand_id: keepId, normalized_brand: keepBrand.canonical_brand_name };
      }
      return r;
    });

    const updBrands = brands.filter(b => b.id !== removeId);
    return { records: updRecords, brands: updBrands };
  }

  return { buildBrandMaster, applyMerge, fingerprint, similarity };
})();
