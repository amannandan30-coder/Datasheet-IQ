/* ============================================================
   EXCEL CLEANER VIEW (excelCleaner.js)
   Standalone tool: Upload Excel -> Strip Non-Saleable rows -> Download Cleaned Excel.
   Preserves 100% of original formatting, types, formulas, and column structures.
   
   Finalized Status Resolution Rules:
     1. Row has explicit Non-Saleable token -> Non-Saleable (checked FIRST)
     2. Row has explicit Saleable token -> Saleable
     3. Blank/other token -> Follow Sheet Context (Non-Saleable sheet vs Saleable sheet vs Neutral default)
   ============================================================ */
App.Views.ExcelCleaner = (() => {

  let _state = {
    file: null,
    filename: '',
    processing: false,
    results: null,
  };

  function _reset() {
    _state = { file: null, filename: '', processing: false, results: null };
  }

  function _escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtNum(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0';
    return n.toLocaleString('en-IN');
  }

  // Parse Workbook (Standalone - no pipeline dependency)
  function _parseWorkbook(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: false, cellFormula: true, cellStyles: true, cellNF: true, cellText: true });

          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            reject(new Error('Workbook has no sheets'));
            return;
          }

          const allRows = [];
          const sheetStats = [];
          let globalRowIdx = 0;

          for (const wsName of wb.SheetNames) {
            const ws = wb.Sheets[wsName];
            if (!ws || !ws['!ref']) continue;

            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
            if (!aoa || aoa.length < 2) {
              sheetStats.push({ name: wsName, totalRows: 0, headerRow: [], skipped: true });
              continue;
            }

            if (/^\s*summary\s*$/i.test(wsName)) {
              sheetStats.push({ name: wsName, totalRows: aoa.length - 1, headerRow: [], skipped: true, isSummary: true });
              continue;
            }

            let headerIdx = 0;
            for (let i = 0; i < Math.min(10, aoa.length); i++) {
              const nonEmpty = (aoa[i] || []).filter(c => c != null && String(c).trim() !== '').length;
              if (nonEmpty >= 3) { headerIdx = i; break; }
            }

            const rawHeaders = (aoa[headerIdx] || []).map(h => h != null ? String(h).trim() : '');
            const dataRows = aoa.slice(headerIdx + 1);

            let sheetRowCount = 0;
            for (let ri = 0; ri < dataRows.length; ri++) {
              const row = dataRows[ri];
              if (!row || row.every(c => c == null || String(c).trim() === '')) continue;

              const record = { _sheet_name: wsName, _raw_sheet_name: wsName, _source_row: headerIdx + 2 + ri };
              const rawFields = {};
              for (let ci = 0; ci < rawHeaders.length; ci++) {
                const key = rawHeaders[ci];
                const val = row[ci] != null ? row[ci] : '';
                if (key) {
                  rawFields[key] = val;
                  const normKey = key.toLowerCase().trim();
                  if (normKey === 'status' || normKey === 'inventory status' || normKey === 'inventory_status') {
                    record.inventory_status = String(val);
                  }
                  if (normKey === 'type' || normKey === 'item type' || normKey === 'item_type') {
                    record.item_type = String(val);
                  }
                  if (normKey === 'remarks' || normKey === 'remark') {
                    record.remarks = String(val);
                  }
                  if (normKey === 'condition') {
                    record.condition = String(val);
                  }
                  if (normKey === 'disposition') {
                    record.disposition = String(val);
                  }
                  if (normKey === 'item id' || normKey === 'item_id' || normKey === 'sr no' || normKey === 'sr. no' || normKey === 'sr.no' || normKey === 's.no' || normKey === 'sno') {
                    record.item_id = String(val);
                  }
                  if (normKey === 'upc' || normKey === 'barcode' || normKey === 'ean') {
                    record.upc = String(val);
                  }
                  if (normKey.includes('product') || normKey.includes('name') || normKey.includes('description') || normKey.includes('item name') || normKey.includes('item_name')) {
                    if (!record.name) record.name = String(val);
                  }
                  if (normKey === 'brand') {
                    record.brand = String(val);
                  }
                  if (normKey === 'category') {
                    record.category = String(val);
                  }
                  if (normKey === 'qty' || normKey === 'quantity' || normKey === 'units' || normKey === 'total qty' || normKey === 'total_qty') {
                    record.qty = parseFloat(val) || 0;
                  }
                  if (normKey === 'mrp' || normKey === 'price' || normKey === 'rate') {
                    record.mrp = parseFloat(val) || 0;
                  }
                  if (normKey === 'value' || normKey === 'total value' || normKey === 'total_value' || normKey === 'source value' || normKey === 'amount') {
                    record.source_value = parseFloat(val) || 0;
                  }
                }
              }

              record._raw = rawFields;
              record._raw_headers = rawHeaders;
              record._raw_row_data = row;
              record._global_idx = globalRowIdx++;

              allRows.push(record);
              sheetRowCount++;
            }

            sheetStats.push({
              name: wsName,
              totalRows: sheetRowCount,
              headerRow: rawHeaders,
              skipped: false
            });
          }

          resolve({ allRows, sheetStats, originalArrayBuffer: data });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Finalized Status Resolver (Deterministic 3-level rule):
  // 1. Explicit Non-Saleable -> non_sellable (checked FIRST)
  // 2. Explicit Saleable     -> saleable
  // 3. Blank / Ignored words -> Follow Sheet Context:
  //    - Non-Saleable Sheet  -> non_sellable
  //    - Saleable Sheet      -> saleable
  //    - Neutral Sheet       -> saleable (default)
  // NOTE: Damage, Expired, Broken, Scrap, Defect, Quarantine, Good, OK are ignored for status.
  function _resolveRecordStatus(record) {
    const sheetName = String(record._raw_sheet_name || record._sheet_name || '').trim();
    const rawStatus = String(record.inventory_status || (record._raw ? (record._raw.Status || record._raw.status || record._raw['Inventory Status'] || record._raw['inventory_status'] || record._raw.Remarks || record._raw.Remark || record._raw.remarks || record._raw.remark) : '') || '').trim();
    const normStatus = rawStatus.toLowerCase().replace(/[^a-z0-9-]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Check Non-Saleable FIRST
    const isExplicitNonSaleable = /^(non[ -]?(saleable|sellable|salable)|unsaleable|unsellable|non-saleable\/dump)$/i.test(normStatus) ||
      /\b(non[ -]?(saleable|sellable|salable)|unsaleable|unsellable)\b/i.test(normStatus);
    if (isExplicitNonSaleable) {
      return { status: 'non_sellable', rule: 'explicit_non_saleable' };
    }

    // 2. Check Explicit Saleable
    const isExplicitSaleable = /^(saleable|sellable|salable)$/i.test(normStatus) ||
      /\b(saleable|sellable|salable)\b/i.test(normStatus);
    if (isExplicitSaleable) {
      return { status: 'saleable', rule: 'explicit_saleable' };
    }

    // 3. Follow Sheet Context
    const normSheet = sheetName.toLowerCase().replace(/[^a-z0-9-]/g, ' ').replace(/\s+/g, ' ').trim();
    const isNonSaleableSheet = /non[ -]?(saleable|sellable|salable)|unsaleable|unsellable|dump/i.test(normSheet);
    if (isNonSaleableSheet) {
      return { status: 'non_sellable', rule: 'sheet_context_non_saleable' };
    }

    const isSaleableSheet = /\b(saleable|sellable|salable)\b/i.test(normSheet);
    if (isSaleableSheet) {
      return { status: 'saleable', rule: 'sheet_context_saleable' };
    }

    // Neutral sheet default -> saleable
    return { status: 'saleable', rule: 'sheet_context_neutral_default' };
  }

  // Process: Resolve status + filter using Finalized Status Rule
  function _processRows(allRows) {
    const saleableRows = [];
    const removedRows = [];

    for (const row of allRows) {
      const resolved = _resolveRecordStatus(row);
      row._resolved_status = resolved.status;
      row._resolution_rule = resolved.rule;

      if (resolved.status === 'non_sellable') {
        removedRows.push(row);
      } else {
        saleableRows.push(row);
      }
    }

    return { saleableRows, removedRows };
  }

  // Delete one row from a worksheet by shifting all subsequent rows upward.
  function _deleteSheetRow(ws, rowIdx, currentRange) {
    for (let r = rowIdx; r < currentRange.e.r; r++) {
      for (let c = currentRange.s.c; c <= currentRange.e.c; c++) {
        const curr = XLSX.utils.encode_cell({ r: r, c: c });
        const next = XLSX.utils.encode_cell({ r: r + 1, c: c });
        if (ws[next]) {
          ws[curr] = ws[next];
        } else {
          delete ws[curr];
        }
      }
    }
    // Erase the vacated last row
    for (let c = currentRange.s.c; c <= currentRange.e.c; c++) {
      delete ws[XLSX.utils.encode_cell({ r: currentRange.e.r, c: c })];
    }
  }

  // Adjust relative row references in a formula string after row deletions.
  // Supports single cells, ranges (with interior or endpoint deletions), absolute/mixed ($A$1, A$1),
  // and preserves cross-sheet references (e.g. Summary!B2 or 'Summary Sheet'!B2).
  // Strictly contracts ranges to surviving rows within [minOrig, maxOrig].
  // If entire range was deleted, deterministically resolves to #REF! (never expands outside).
  function _adjustFormulaRowRefs(formula, origToNew, headerRowIdx) {
    const tokenPattern = /(?:('(?:[^']|'')+'|[A-Za-z0-9_]+)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?:\s*:\s*(?:('(?:[^']|'')+'|[A-Za-z0-9_]+)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+))?(?!\s*\()/g;

    return formula.replace(tokenPattern, function(match, s1, cd1, c1, rd1, r1, s2, cd2, c2, rd2, r2, offset, fullStr) {
      if (offset > 0 && /[A-Za-z0-9_]/.test(fullStr[offset - 1])) return match;

      const isRange = typeof r2 !== 'undefined' && r2 !== null && r2 !== '';

      if (isRange) {
        if (s1 || s2) return match; // cross-sheet range preserved

        const origR1 = parseInt(r1, 10);
        const origR2 = parseInt(r2, 10);
        const minOrig = Math.min(origR1, origR2);
        const maxOrig = Math.max(origR1, origR2);

        // Find all surviving rows strictly WITHIN the original interval [minOrig, maxOrig]
        const surviving = [];
        for (let r = minOrig; r <= maxOrig; r++) {
          const idx = r - 1;
          if (idx <= headerRowIdx) {
            surviving.push(r);
          } else if (origToNew.has(idx)) {
            surviving.push(r);
          }
        }

        // If entire range was deleted: resolve to #REF! (never expand outside interval)
        if (surviving.length === 0) {
          return '#REF!';
        }

        const firstSurviving = (origR1 <= origR2) ? surviving[0] : surviving[surviving.length - 1];
        const lastSurviving  = (origR1 <= origR2) ? surviving[surviving.length - 1] : surviving[0];

        let newR1 = r1;
        if (rd1 !== '$') {
          const idx1 = firstSurviving - 1;
          if (idx1 <= headerRowIdx) newR1 = firstSurviving;
          else if (origToNew.has(idx1)) newR1 = origToNew.get(idx1) + 1;
        }

        let newR2 = r2;
        if (rd2 !== '$') {
          const idx2 = lastSurviving - 1;
          if (idx2 <= headerRowIdx) newR2 = lastSurviving;
          else if (origToNew.has(idx2)) newR2 = origToNew.get(idx2) + 1;
        }

        return (cd1 || '') + c1 + (rd1 || '') + newR1 + ':' + (cd2 || '') + c2 + (rd2 || '') + newR2;
      } else {
        // Single cell reference
        if (s1) return match; // cross-sheet preserved
        if (rd1 === '$') return match; // absolute row preserved

        const excelRow = parseInt(r1, 10);
        const origIdx  = excelRow - 1;
        if (origIdx <= headerRowIdx) return match;
        if (origToNew.has(origIdx)) {
          const newRow = origToNew.get(origIdx) + 1;
          return (cd1 || '') + c1 + newRow;
        } else {
          return '#REF!';
        }
      }
    });
  }

  // Export Cleaned XLSX - SOURCE FIDELITY ARCHITECTURE
  function _exportCleanedXLSX(filename) {
    const results = _state.results;
    if (!results) { App.UI.toast('No results to export.'); return; }

    const { saleableRows, removedRows, originalArrayBuffer } = results;
    if (!originalArrayBuffer) {
      App.UI.toast('Original workbook buffer missing. Please re-upload the file.');
      return;
    }
    if (!saleableRows || !saleableRows.length) {
      App.UI.toast('No saleable rows to export.');
      return;
    }

    // Re-read a FRESH workbook from the stored ArrayBuffer.
    const wb = XLSX.read(originalArrayBuffer, {
      type: 'array',
      cellDates: false,
      cellFormula: true,
      cellStyles: true,
      cellNF: true,
      cellText: true,
    });

    const removeBySheet = new Map();
    for (const row of removedRows) {
      const sName = row._raw_sheet_name || row._sheet_name;
      if (!sName) continue;
      if (!removeBySheet.has(sName)) removeBySheet.set(sName, new Set());
      removeBySheet.get(sName).add((row._source_row || 1) - 1);
    }

    const saleableBySheet = new Map();
    for (const row of saleableRows) {
      const sName = row._raw_sheet_name || row._sheet_name;
      if (!sName) continue;
      if (!saleableBySheet.has(sName)) saleableBySheet.set(sName, new Set());
      saleableBySheet.get(sName).add((row._source_row || 1) - 1);
    }

    // Process each sheet in original workbook order
    for (const wsName of wb.SheetNames) {
      const ws = wb.Sheets[wsName];
      if (!ws || !ws['!ref']) continue;

      if (/^\s*summary\s*$/i.test(wsName)) continue;

      let range = XLSX.utils.decode_range(ws['!ref']);

      let headerRowIdx = range.s.r;
      for (let i = range.s.r; i <= Math.min(range.s.r + 9, range.e.r); i++) {
        let nonEmpty = 0;
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r: i, c })];
          if (cell && cell.v != null && String(cell.v).trim() !== '') nonEmpty++;
        }
        if (nonEmpty >= 3) { headerRowIdx = i; break; }
      }

      let remarkColIdx = -1;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
        if (cell && /^remarks?$/i.test(String(cell.v || '').trim())) {
          remarkColIdx = c; break;
        }
      }

      if (remarkColIdx === -1) {
        remarkColIdx = range.e.c + 1;
        ws[XLSX.utils.encode_cell({ r: headerRowIdx, c: remarkColIdx })] = { t: 's', v: 'Remark' };
        range.e.c = remarkColIdx;
      }

      const saleableRowSet = saleableBySheet.get(wsName) || new Set();
      for (const rowIdx of saleableRowSet) {
        ws[XLSX.utils.encode_cell({ r: rowIdx, c: remarkColIdx })] = { t: 's', v: 'Saleable' };
      }

      const rowsToRemove = removeBySheet.get(wsName) || new Set();
      const sortedRemovals = [...rowsToRemove].sort((a, b) => b - a);
      const origMaxRow = range.e.r;

      for (const delRowIdx of sortedRemovals) {
        const snapRange = {
          s: { r: range.s.r, c: range.s.c },
          e: { r: range.e.r, c: range.e.c }
        };
        _deleteSheetRow(ws, delRowIdx, snapRange);
        range.e.r -= 1;
      }

      if (rowsToRemove.size > 0) {
        const origToNew = new Map();
        let fCursor = headerRowIdx + 1;
        for (let fr = headerRowIdx + 1; fr <= origMaxRow; fr++) {
          if (rowsToRemove.has(fr)) continue;
          origToNew.set(fr, fCursor++);
        }
        for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r: r, c: c });
            const cell = ws[addr];
            if (!cell || !cell.f) continue;
            const adjusted = _adjustFormulaRowRefs(cell.f, origToNew, headerRowIdx);
            if (adjusted !== cell.f) {
              cell.f = adjusted;
            }
          }
        }
      }
      ws['!ref'] = XLSX.utils.encode_range(range);
    }

    const outName = filename.replace(/\.[^/.]+$/, '') + '_cleaned_saleable.xlsx';
    XLSX.writeFile(wb, outName, { cellStyles: true, cellNF: true });
    App.UI.toast('Downloaded ' + outName + ' with ' + saleableRows.length + ' saleable rows.');
  }

  // Handle File Upload
  async function _handleUpload(file, main) {
    if (!file) return;
    _state.file = file;
    _state.filename = file.name || 'workbook.xlsx';
    _state.processing = true;
    _state.results = null;
    _renderPage(main);

    try {
      const { allRows, sheetStats, originalArrayBuffer } = await _parseWorkbook(file);
      const { saleableRows, removedRows } = _processRows(allRows);

      _state.results = {
        allRows,
        saleableRows,
        removedRows,
        sheetStats,
        sourceRowCount: allRows.length,
        saleableCount: saleableRows.length,
        removedCount: removedRows.length,
        originalArrayBuffer,
      };
      _state.processing = false;
      _renderPage(main);
    } catch (err) {
      console.error('[ExcelCleaner] Parse error:', err);
      _state.processing = false;
      _state.results = null;
      _renderPage(main);
      App.UI.toast('Error parsing file: ' + err.message);
    }
  }

  // Render Page
  function _renderPage(main) {
    main.innerHTML = '<div class="excel-cleaner-page">' +
      '<div class="ec-header">' +
        '<div class="ec-header-text">' +
          '<h1 class="ec-title">Excel Cleaner</h1>' +
          '<p class="ec-subtitle">Upload an inventory Excel file. Remove Non-Saleable rows. Download cleaned Saleable-only workbook.</p>' +
        '</div>' +
      '</div>' +
      (_state.processing ? _renderProcessing() : '') +
      (!_state.processing && !_state.results ? _renderUploadZone() : '') +
      (!_state.processing && _state.results ? _renderResults() : '') +
    '</div>';

    _bindEvents(main);
  }

  function _renderUploadZone() {
    return '<div class="ec-upload-section">' +
      '<div class="ec-upload-zone" id="ec-drop-zone" role="button" tabindex="0" title="Click or drop Excel file to upload">' +
        '<div class="ec-upload-icon">' +
          '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
            '<polyline points="17 8 12 3 7 8"></polyline>' +
            '<line x1="12" y1="3" x2="12" y2="15"></line>' +
          '</svg>' +
        '</div>' +
        '<div class="ec-upload-text">' +
          '<span class="ec-upload-primary">Click or drop your Excel file here</span>' +
          '<span class="ec-upload-secondary">or <span class="ec-browse-link">browse from your computer</span></span>' +
          '<span class="ec-upload-hint">Supports .xlsx, .xls files</span>' +
        '</div>' +
        '<input type="file" id="ec-file-input" accept=".xlsx,.xls" style="display:none" aria-label="Upload Excel File">' +
      '</div>' +
      '<div class="ec-rules-card">' +
        '<div class="ec-rules-title">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:text-bottom;">' +
            '<circle cx="12" cy="12" r="10"></circle>' +
            '<line x1="12" y1="16" x2="12" y2="12"></line>' +
            '<line x1="12" y1="8" x2="12.01" y2="8"></line>' +
          '</svg>' +
          'Status Resolution Rules' +
        '</div>' +
        '<div class="ec-rules-list">' +
          '<div class="ec-rule"><span class="ec-rule-num">1</span> Row has explicit <strong>Saleable</strong> &rarr; <span class="ec-tag-green">Saleable</span></div>' +
          '<div class="ec-rule"><span class="ec-rule-num">2</span> Row has explicit <strong>Non-Saleable</strong> &rarr; <span class="ec-tag-red">Non-Saleable</span></div>' +
          '<div class="ec-rule"><span class="ec-rule-num">3</span> Blank/neutral row &rarr; Use <strong>Sheet Context</strong></div>' +
          '<div class="ec-rule"><span class="ec-rule-num">4</span> Neutral sheet context &rarr; <span class="ec-tag-green">Saleable by default</span></div>' +
        '</div>' +
        '<div class="ec-rules-note">Damage, Expired, Scrap, Quarantine are <strong>ignored</strong> in status resolution</div>' +
      '</div>' +
    '</div>';
  }

  function _renderProcessing() {
    return '<div class="ec-processing">' +
      '<div class="ec-spinner"></div>' +
      '<div class="ec-processing-text">Processing <strong>' + _escHtml(_state.filename) + '</strong>...</div>' +
      '<div class="ec-processing-sub">Parsing sheets, resolving status, filtering non-saleable rows</div>' +
    '</div>';
  }

  function _renderResults() {
    const r = _state.results;
    const pctSaleable = r.sourceRowCount > 0 ? ((r.saleableCount / r.sourceRowCount) * 100).toFixed(1) : '0';
    const pctRemoved = r.sourceRowCount > 0 ? ((r.removedCount / r.sourceRowCount) * 100).toFixed(1) : '0';
    const reconciled = (r.saleableCount + r.removedCount) === r.sourceRowCount;

    const barChartSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
    const checkBadgeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    const banCircleSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';
    const passShieldSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>';
    const warnTriangleSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

    let html = '<div class="ec-results">' +
      '<div class="ec-summary-grid">' +
        '<div class="ec-stat-card ec-stat-source"><div class="ec-stat-icon">' + barChartSvg + '</div><div class="ec-stat-info"><div class="ec-stat-value">' + _fmtNum(r.sourceRowCount) + '</div><div class="ec-stat-label">Source Rows</div></div></div>' +
        '<div class="ec-stat-card ec-stat-saleable"><div class="ec-stat-icon">' + checkBadgeSvg + '</div><div class="ec-stat-info"><div class="ec-stat-value">' + _fmtNum(r.saleableCount) + '</div><div class="ec-stat-label">Saleable (' + pctSaleable + '%)</div></div></div>' +
        '<div class="ec-stat-card ec-stat-removed"><div class="ec-stat-icon">' + banCircleSvg + '</div><div class="ec-stat-info"><div class="ec-stat-value">' + _fmtNum(r.removedCount) + '</div><div class="ec-stat-label">Non-Saleable Removed (' + pctRemoved + '%)</div></div></div>' +
        '<div class="ec-stat-card ec-stat-recon ' + (reconciled ? 'ec-recon-pass' : 'ec-recon-fail') + '"><div class="ec-stat-icon">' + (reconciled ? passShieldSvg : warnTriangleSvg) + '</div><div class="ec-stat-info"><div class="ec-stat-value">' + (reconciled ? 'RECONCILED' : 'MISMATCH') + '</div><div class="ec-stat-label">Reconciliation: ' + _fmtNum(r.saleableCount) + ' + ' + _fmtNum(r.removedCount) + ' = ' + _fmtNum(r.saleableCount + r.removedCount) + '</div></div></div>' +
      '</div>';

    // Sheet Breakdown Table
    html += '<div class="ec-section"><div class="ec-section-header">Sheet Breakdown</div><div class="ec-table-wrap"><table class="ec-table"><thead><tr><th>Sheet Name</th><th>Total Rows</th><th>Saleable</th><th>Non-Saleable</th><th>Status</th></tr></thead><tbody>';
    for (const s of r.sheetStats) {
      if (s.skipped) {
        html += '<tr class="ec-row-muted"><td>' + _escHtml(s.name) + '</td><td>' + s.totalRows + '</td><td>&mdash;</td><td>&mdash;</td><td><span class="ec-tag-muted">' + (s.isSummary ? 'Summary' : 'Skipped') + '</span></td></tr>';
      } else {
        const sheetSaleable = r.saleableRows.filter(x => x._raw_sheet_name === s.name).length;
        const sheetRemoved = r.removedRows.filter(x => x._raw_sheet_name === s.name).length;
        html += '<tr><td><strong>' + _escHtml(s.name) + '</strong></td><td>' + _fmtNum(s.totalRows) + '</td><td><span class="ec-tag-green">' + _fmtNum(sheetSaleable) + '</span></td><td><span class="ec-tag-red">' + _fmtNum(sheetRemoved) + '</span></td><td><span class="ec-tag-muted">' + (sheetSaleable + sheetRemoved === s.totalRows ? 'Reconciled' : 'Check') + '</span></td></tr>';
      }
    }
    html += '</tbody></table></div></div>';

    // Preview: Saleable
    html += '<div class="ec-section"><div class="ec-section-header">Retained Saleable Rows (Preview - first 50)</div>' + _renderPreviewTable(r.saleableRows.slice(0, 50), 'saleable') + '</div>';

    // Preview: Removed
    if (r.removedCount > 0) {
      html += '<div class="ec-section"><div class="ec-section-header">Removed Non-Saleable Rows (Preview - first 50)</div>' + _renderPreviewTable(r.removedRows.slice(0, 50), 'removed') + '</div>';
    }

    // Buttons
    html += '<div class="ec-actions">' +
      '<button class="ec-btn ec-btn-primary" id="ec-download-btn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ' +
        'Download Cleaned Excel (' + _fmtNum(r.saleableCount) + ' rows)' +
      '</button>' +
      '<button class="ec-btn ec-btn-ghost" id="ec-reset-btn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> ' +
        'Upload Another File' +
      '</button>' +
    '</div></div>';

    return html;
  }

  function _renderPreviewTable(rows, type) {
    if (!rows.length) return '<div class="ec-empty">No rows</div>';

    let html = '<div class="ec-table-wrap"><table class="ec-table ec-table-preview"><thead><tr>' +
      '<th>#</th><th>Sheet</th><th>Row</th><th>Product / Item</th><th>Qty</th><th>Value</th><th>Remark</th><th>Resolved Status</th><th>Resolution Rule</th>' +
      '</tr></thead><tbody>';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nm = r.name || '';
      const displayName = nm.length > 50 ? nm.substring(0, 50) + '...' : nm;
      const remarkCell = type === 'saleable'
        ? '<span class="ec-tag-green">Saleable</span>'
        : '<span class="ec-tag-red">' + _escHtml(r.remarks || (r._raw ? (r._raw.Remarks || r._raw.Remark || '') : '')) + '</span>';
      const statusTag = r._resolved_status === 'non_sellable'
        ? '<span class="ec-tag-red">Non-Saleable</span>'
        : '<span class="ec-tag-green">Saleable</span>';

      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + _escHtml(r._raw_sheet_name || r._sheet_name || '') + '</td>' +
        '<td>' + (r._source_row || '') + '</td>' +
        '<td title="' + _escHtml(nm) + '">' + _escHtml(displayName) + '</td>' +
        '<td>' + _fmtNum(r.qty || 0) + '</td>' +
        '<td>' + _fmtNum(r.source_value || 0) + '</td>' +
        '<td>' + remarkCell + '</td>' +
        '<td>' + statusTag + '</td>' +
        '<td class="ec-rule-cell">' + _escHtml(r._resolution_rule || '') + '</td>' +
      '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
  }

  function _bindEvents(main) {
    const fileInput = document.getElementById('ec-file-input');
    const dropZone = document.getElementById('ec-drop-zone');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });

      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.value = '';
          fileInput.click();
        }
      });

      fileInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          _handleUpload(e.target.files[0], main);
        }
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('ec-drag-active');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('ec-drag-active');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('ec-drag-active');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          _handleUpload(e.dataTransfer.files[0], main);
        }
      });
    }

    const dlBtn = document.getElementById('ec-download-btn');
    if (dlBtn && _state.results) {
      dlBtn.addEventListener('click', () => {
        _exportCleanedXLSX(_state.filename);
      });
    }

    const resetBtn = document.getElementById('ec-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        _reset();
        _renderPage(main);
      });
    }
  }

  async function render(main) {
    _reset();
    _renderPage(main);
  }

  return { render };

})();
