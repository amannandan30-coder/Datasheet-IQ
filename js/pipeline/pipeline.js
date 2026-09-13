window.App = window.App || {};

/* ============================================================
   PIPELINE ORCHESTRATOR
   Runs all stages in sequence, reporting progress
   ============================================================ */
App.Pipeline = (() => {

  const STAGES = [
    { id:'validate',  label:'File Validation' },
    { id:'parse',     label:'Parsing Excel' },
    { id:'store_raw', label:'Storing Raw Data' },
    { id:'clean',     label:'Cleaning & Normalizing' },
    { id:'categorize',label:'Category Classification' },
    { id:'brands',    label:'Brand Normalization' },
    { id:'products',  label:'Product Grouping' },
    { id:'aggregate', label:'Computing Aggregates' },
    { id:'quality',   label:'Data Quality Checks' },
    { id:'save',      label:'Saving to Database' },
  ];

  /* onProgress(stageId, status, message) */
  async function run(file, onProgress, options = {}) {
    const dataset_id = crypto.randomUUID();
    const now = Date.now();

    const prog = (id, status, msg) => onProgress && onProgress(id, status, msg);

    // ── Archive Original File Lineage Verification ──────────────
    // Guarantee that ONLY pristine File/Blob selected by user is archived BEFORE parsing or cleaning
    if (!(file instanceof Blob)) {
      console.warn('[PIPELINE] Input is not a File/Blob instance. Archiving skipped.');
    } else {
      console.log(`[PIPELINE] Pristine user input file received: "${file.name}" (${file.size} bytes, type: "${file.type}")`);
    }

    // Archive original file in parallel using pristine, unparsed File object
    const archivePromise = options.archivePromise || (App.Storage && typeof App.Storage.archiveOriginalFile === 'function' && (file instanceof Blob)
      ? App.Storage.archiveOriginalFile(file).catch(err => {
          console.warn('[STORAGE] Background archive failed:', err);
          return { ok: false, archiveStatus: 'failed', error: err.message };
        })
      : null);

    try {
      // ── 1. Validate file ───────────────────────────────────────
      prog('validate','active','Checking file...');
      const fileValidation = App.Validator.validateFile(file);
      if (!fileValidation.ok) throw new Error(fileValidation.errors.join(', '));
      prog('validate','done',`Valid ${file.name.split('.').pop().toUpperCase()} file`);

      // ── 2. Parse ───────────────────────────────────────────────
      prog('parse','active','Reading Excel data...');
      const { headers, rows, excludedRows, rowCount, sheetName, sheetStats: parsedSheetStats } = await App.Parser.parse(file);
      prog('parse','done',`${rowCount.toLocaleString()} rows found in "${sheetName}"${excludedRows.length ? ` (${excludedRows.length} excluded)` : ''}`);

      // ── 3. Column mapping ──────────────────────────────────────
      const { mapping, missing, missingRequired, suggestions } = App.Validator.mapColumns(headers);
      if (missingRequired.length) {
        let msg = `Required column missing: "${missingRequired.join(', ')}".\nDetected columns in file: [${headers.join(', ')}].`;
        const suggList = Object.entries(suggestions || {}).map(([col, match]) => `Did you mean "${match}" for "${col}"?`);
        if (suggList.length > 0) {
          msg += `\nSuggestion: ${suggList.join('; ')}`;
        }
        throw new Error(msg);
      }

      // Apply mapping
      const mappedRows = App.Parser.applyMapping(rows, mapping);
      const weightSchema = App.Validator.detectWeightSchema ? App.Validator.detectWeightSchema(headers, mappedRows, mapping) : {};

      // Row-level validation
      const { valid, review } = App.Validator.validateRows(rows, mapping);

      // ── 4. Store raw records ───────────────────────────────────
      prog('store_raw','active','Preserving raw data...');
      const rawRecords = mappedRows.map((row, idx) => ({
        ...row,
        id:         crypto.randomUUID(),
        dataset_id,
        created_at: now,
      }));
      prog('store_raw','done',`${rawRecords.length} raw records preserved`);

      // ── 5. Clean ───────────────────────────────────────────────
      prog('clean','active','Normalizing text & numbers...');
      const cleaned = App.Cleaner.cleanAll(rawRecords, weightSchema);
      // Resolve and persist canonical inventory status on all records
      if (App.InventoryStatusResolver && typeof App.InventoryStatusResolver.resolveRecordStatusDetailed === 'function') {
        for (const rec of cleaned) {
          const res = App.InventoryStatusResolver.resolveRecordStatusDetailed(rec);
          rec.status = res.status;
          rec.resolved_status = res.status;
          rec.resolution_source = res.resolution_source;
          rec.resolution_rule = res.resolution_rule;
          rec.status_confidence = res.confidence;
          rec.is_status_conflict = res.is_status_conflict;
          rec.status_conflict_reason = res.status_conflict_reason;
        }
      }
      prog('clean','done','UOM, brand names, weights normalized');

      // ── 6. Categorize ──────────────────────────────────────────
      prog('categorize','active','Classifying categories...');
      const categorized = App.Categorizer.processAll(cleaned);
      prog('categorize','done','Category + subcategory assigned');

      // ── 7. Brand normalization ─────────────────────────────────
      prog('brands','active','Building brand master...');
      const { brands, suggestions: brandSuggestions, records: brandedRecords } =
        App.BrandEngine.buildBrandMaster(categorized, dataset_id);
      prog('brands','done',`${brands.length} brands found, ${brandSuggestions.length} merge suggestions`);

      // ── 8. Product grouping ────────────────────────────────────
      prog('products','active','Grouping product families & variants...');
      const { records: productsRecords, product_families, product_variants } =
        App.ProductEngine.groupProducts(brandedRecords, dataset_id);
      prog('products','done',`${product_families.length} product families, ${product_variants.length} variants`);

      // ── 9. Aggregate ───────────────────────────────────────────
      prog('aggregate','active','Computing totals...');
      const { warehouses, dqIssues, kpis } = App.Aggregator.run(productsRecords, dataset_id);
      prog('aggregate','done',`KPIs computed for ${warehouses.length} warehouses`);

      // ── 10. Quality checks ─────────────────────────────────────
      prog('quality','active','Running data quality checks...');
      prog('quality','done',`${dqIssues.length} data quality issues detected`);

      // ── 11. Save everything ────────────────────────────────────
      prog('save','active','Saving to database...');

      // ── Await archive result with bounded timeout (never blocks DB persistence indefinitely)
      let archiveInfo = null;
      if (archivePromise) {
        try {
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('ARCHIVE_TIMEOUT'), 10000));
          const winner = await Promise.race([archivePromise, timeoutPromise]);
          if (winner === 'ARCHIVE_TIMEOUT') {
            console.warn('[PIPELINE] Archive upload still running in background. Proceeding with DB save without blocking.');
            archiveInfo = { ok: false, archiveStatus: 'uploading', error: 'Upload in progress' };
            // Update dataset in IndexedDB once background archive completes
            archivePromise.then(async (finalArch) => {
              try {
                if (App.DB && typeof App.DB.getDataset === 'function') {
                  const ds = await App.DB.getDataset(dataset_id);
                  if (ds) {
                    ds.archiveId = finalArch?.archiveId || ds.archiveId;
                    ds.storagePath = finalArch?.storagePath || ds.storagePath;
                    ds.sha256 = finalArch?.sha256 || ds.sha256;
                    ds.archiveStatus = finalArch?.archiveStatus || ds.archiveStatus;
                    ds.archiveError = finalArch?.error || null;
                    await App.DB.saveDataset(ds);
                    console.log(`[PIPELINE] Background archive finalized for dataset ${dataset_id}: status=${ds.archiveStatus}`);
                  }
                }
              } catch (bgErr) {
                console.warn('[PIPELINE] Failed to update dataset with background archive result:', bgErr);
              }
            });
          } else {
            archiveInfo = winner;
          }
        } catch (archErr) {
          archiveInfo = { ok: false, archiveStatus: 'failed', error: archErr.message };
        }
      }

      // Save dataset record
      const dataset = {
        id: dataset_id,
        filename:   file.name,
        fileSize:   file.size,
        uploadedAt: now,
        rowCount:   rawRecords.length,
        columnCount: headers.length,
        detectedColumns: headers,
        missingColumns:  missing,
        missingRequired,
        validRows:   valid.length,
        reviewRows:  review.length,
        excludedRows: excludedRows.length,
        excludedSummaryRows: excludedRows.filter(e => e._exclude_reason === 'summary_row').length,
        excludedNoNameRows: excludedRows.filter(e => e._exclude_reason === 'missing_product_name').length,
        sourceRowCount: rawRecords.length + excludedRows.length,
        sheetBreakdown: parsedSheetStats,
        status:      'processed',
        kpis,
        sheetName,
        // Original File Archive Reference
        archiveId: archiveInfo?.archiveId || null,
        storagePath: archiveInfo?.storagePath || null,
        originalFilename: archiveInfo?.originalFilename || file.name,
        sha256: archiveInfo?.sha256 || null,
        archiveStatus: archiveInfo?.archiveStatus || 'pending',
        archiveError: archiveInfo?.error || null,
      };

      if (App.DB && typeof App.DB.saveDataset === 'function') {
        await App.DB.saveDataset(dataset);

        // Save warehouses
        for (const w of warehouses) await App.DB.put('warehouses', w);

        // Save brands
        for (const b of brands) await App.DB.put('brands', b);

        // Save product families
        for (const pf of product_families) await App.DB.put('product_families', pf);

        // Save product variants
        for (const pv of product_variants) await App.DB.put('product_variants', pv);

        // Save brand suggestions
        for (const s of brandSuggestions) await App.DB.put('normalization_suggestions', s);

        // Save DQ issues
        for (const dq of dqIssues) await App.DB.put('data_quality_issues', dq);

        // Save excluded/unresolved records
        if (excludedRows.length > 0) {
          const excludedRecords = excludedRows.map(er => ({
            ...er,
            id: crypto.randomUUID(),
            dataset_id,
            created_at: now,
          }));
          for (const er of excludedRecords) await App.DB.put('excluded_records', er);
        }

        // Save inventory records in bulk (largest payload)
        await App.DB.putBulk('inventory_records', productsRecords);
      }

      prog('save','done',`Dataset "${file.name}" ready`);

      return {
        ok: true,
        dataset_id,
        dataset,
        archive: archiveInfo,
        stats: {
          rowCount:         rawRecords.length,
          brandCount:       brands.length,
          familyCount:      product_families.length,
          variantCount:     product_variants.length,
          warehouseCount:   warehouses.length,
          dqIssueCount:     dqIssues.length,
          excludedCount:    excludedRows.length,
          suggestionCount:  brandSuggestions.length,
          missingColumns:   missing,
          reviewRows:       review.length,
          kpis,
        },
      };

    } catch (err) {
      console.error('[Pipeline]', err);
      return { ok: false, error: err.message };
    }
  }

  return { run, STAGES };
})();
