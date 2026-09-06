window.App = window.App || {};

/* ============================================================
   PARSER — Excel -> Raw records with robust multi-sheet support
   ============================================================ */
App.Parser = (() => {

  function getColIdx(rawHeaders, colName) {
    if (!colName || !rawHeaders) return -1;
    const directIdx = rawHeaders.indexOf(colName);
    if (directIdx !== -1) return directIdx;
    const normTarget = App.Validator.normalizeHeader(colName);
    if (!normTarget) return -1;
    return rawHeaders.findIndex(h => App.Validator.normalizeHeader(h) === normTarget);
  }

  async function parse(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb   = XLSX.read(data, { type: 'array', cellDates: true });
          
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            reject(new Error('Workbook has no sheets'));
            return;
          }

          let allMappedRows  = [];
          let allExcludedRows = [];
          const allHeadersSet = new Set();
          const sheetStats    = [];

          const SUMMARY_MARKER_RE = /^\s*(?:total|grand\s*total|sub\s*total|subtotal|total\s*summary|summary|grandtotal|sub-total|grand-total)(?:\s*:|\s*\/|\s*row|\s*count|\s*$|\b)/i;

          for (const wsName of wb.SheetNames) {
            const ws = wb.Sheets[wsName];
            if (!ws || !ws['!ref']) continue;

            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
            if (!aoa || aoa.length < 2) continue; // Skip empty sheets

            // If the worksheet itself is a dedicated workbook Summary sheet, do not ingest as inventory records
            if (/^\s*summary\s*$/i.test(wsName)) {
              sheetStats.push({
                name: wsName,
                count: 0,
                rawCount: aoa.length,
                excludedCount: aoa.length,
                summaryRows: aoa.length,
                noNameRows: 0,
                isSummarySheet: true
              });
              continue;
            }

            // ── 1. Dynamic Header Row Detection (inspect first 10 rows) ──
            let bestHeaderRowIdx = 0;
            let bestScore = -1;
            let bestHeaders = (aoa[0] || []).map(h => h == null ? '' : String(h).trim());
            let bestMapping = App.Validator.mapColumns(bestHeaders).mapping;

            const maxScanRows = Math.min(10, aoa.length);
            for (let r = 0; r < maxScanRows; r++) {
              const rowCandidate = (aoa[r] || []).map(h => h == null ? '' : String(h).trim());
              const nonEmptyCount = rowCandidate.filter(Boolean).length;
              if (nonEmptyCount < 2) continue;

              const { mapping: candidateMapping } = App.Validator.mapColumns(rowCandidate);
              const mappedCount = Object.keys(candidateMapping).length;
              if (mappedCount === 0) continue;

              // Calculate score: mapped canonical count + strong weights for key inventory columns
              let score = mappedCount * 3;
              if (candidateMapping.name) score += 8;
              if (candidateMapping.qty) score += 4;
              if (candidateMapping.Value || candidateMapping.variant_mrp) score += 3;
              if (candidateMapping.brand) score += 2;
              if (candidateMapping.entity_name) score += 2;
              if (candidateMapping.upc || candidateMapping.item_id) score += 3;

              if (score > bestScore) {
                bestScore = score;
                bestHeaderRowIdx = r;
                bestHeaders = rowCandidate;
                bestMapping = candidateMapping;
              }
            }

            const headerRowIdx = bestHeaderRowIdx;
            const headers = bestHeaders;
            const mapping = bestMapping;

            headers.forEach(h => { if (h) allHeadersSet.add(h); });

            const dataRows = aoa.slice(headerRowIdx + 1).filter(r => r.some(c => c != null && c !== ''));

            // ── 2. Detect and skip summary/total rows & missing product names ──
            const nameColIdx = getColIdx(headers, mapping.name);
            const upcColIdx  = getColIdx(headers, mapping.upc);
            const qtyColIdx  = getColIdx(headers, mapping.qty);
            const mrpColIdx  = getColIdx(headers, mapping.variant_mrp || mapping.mrp);
            const valColIdx  = getColIdx(headers, mapping.Value || mapping.value);

            const filteredDataRows = [];
            const excludedRows = [];

            for (let ri = 0; ri < dataRows.length; ri++) {
              const row = dataRows[ri];
              let excludeReason = null;

              let nameVal = nameColIdx >= 0 && row[nameColIdx] != null ? String(row[nameColIdx]).trim() : '';

              // If nameColIdx is not mapped, check if there is an unmapped description or title
              if (!nameVal && nameColIdx < 0) {
                for (let ci = 0; ci < row.length; ci++) {
                  const cell = row[ci];
                  if (cell != null && typeof cell === 'string' && cell.trim().length > 2 && ci !== upcColIdx && ci !== qtyColIdx && ci !== mrpColIdx && ci !== valColIdx) {
                    nameVal = cell.trim();
                    break;
                  }
                }
              }

              // Check if name column explicitly contains a summary marker
              if (nameVal && SUMMARY_MARKER_RE.test(nameVal)) {
                excludeReason = 'summary_row';
              }

              // Check if any cell contains a summary marker while product name is empty or matches
              if (!excludeReason) {
                for (let ci = 0; ci < row.length; ci++) {
                  const cell = row[ci];
                  if (cell != null && SUMMARY_MARKER_RE.test(String(cell).trim())) {
                    // If name is empty, or cell is in the first column, it's a summary row
                    if (!nameVal || ci === 0 || ci === nameColIdx) {
                      excludeReason = 'summary_row';
                      break;
                    }
                  }
                }
              }

              // Check for completely empty product name
              if (!excludeReason && !nameVal) {
                excludeReason = 'missing_product_name';
              }

              if (excludeReason) {
                excludedRows.push({
                  _sheet_name: wsName,
                  _source_row: ri + headerRowIdx + 2, // Excel row (1-indexed + header)
                  _exclude_reason: excludeReason,
                  upc: upcColIdx >= 0 ? row[upcColIdx] : null,
                  name: nameVal || null,
                  qty: qtyColIdx >= 0 ? (Number(row[qtyColIdx]) || 0) : 0,
                  mrp: mrpColIdx >= 0 ? (Number(row[mrpColIdx]) || 0) : 0,
                  value: valColIdx >= 0 ? (Number(row[valColIdx]) || 0) : 0,
                  _raw_cells: row.reduce((o, c, i) => { if (c != null) o[headers[i] || `col_${i}`] = c; return o; }, {}),
                });
              } else {
                filteredDataRows.push(row);
              }
            }

            const sheetMappedRows = filteredDataRows.map((row, idx) => {
              const rawObj = { _sheet_name: wsName };
              headers.forEach((h, i) => { if (h) rawObj[h] = row[i] ?? null; });

              const mapped = {
                _raw_row_index: idx,
                _raw_sheet_name: wsName,
                _sheet_name: wsName,
                _raw: rawObj
              };

              // Map canonical columns using sheet-specific mapping
              for (const [canonical, originalHeader] of Object.entries(mapping)) {
                const ci = getColIdx(headers, originalHeader);
                mapped[canonical] = ci >= 0 ? (row[ci] ?? null) : (rawObj[originalHeader] ?? null);
              }

              // If canonical name is not directly mapped, check alternative text
              if (!mapped.name && nameColIdx >= 0 && row[nameColIdx] != null) {
                mapped.name = row[nameColIdx];
              }

              return mapped;
            });

            sheetStats.push({
              name: wsName,
              count: sheetMappedRows.length,
              rawCount: dataRows.length,
              excludedCount: excludedRows.length,
              summaryRows: excludedRows.filter(e => e._exclude_reason === 'summary_row').length,
              noNameRows: excludedRows.filter(e => e._exclude_reason === 'missing_product_name').length,
            });
            allMappedRows = allMappedRows.concat(sheetMappedRows);
            allExcludedRows = allExcludedRows.concat(excludedRows);
          }

          if (allMappedRows.length === 0) {
            reject(new Error('No valid data rows found in any worksheet'));
            return;
          }

          const combinedHeaders = Array.from(allHeadersSet);

          resolve({
            headers: combinedHeaders,
            rows: allMappedRows,
            excludedRows: allExcludedRows,
            rowCount: allMappedRows.length,
            sheetName: wb.SheetNames.length === 1 ? wb.SheetNames[0] : `${wb.SheetNames.length} sheets (${wb.SheetNames.join(', ')})`,
            sheetCount: wb.SheetNames.length,
            sheetStats
          });
        } catch(err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /* Compatibility helper if mapping is applied separately */
  function applyMapping(rows, globalMapping) {
    return rows.map(r => {
      if (r._raw) {
        for (const [canonical, originalHeader] of Object.entries(globalMapping)) {
          if (r[canonical] == null) {
            const val = r._raw[originalHeader];
            if (val != null) {
              r[canonical] = val;
            } else {
              const normOrig = App.Validator.normalizeHeader(originalHeader);
              for (const [rk, rv] of Object.entries(r._raw)) {
                if (App.Validator.normalizeHeader(rk) === normOrig && rv != null) {
                  r[canonical] = rv;
                  break;
                }
              }
            }
          }
        }
      }
      return r;
    });
  }

  return { parse, applyMapping, getColIdx };
})();
