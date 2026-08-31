window.App = window.App || {};

/* ============================================================
   PARSER — Excel → Raw records with multi-sheet support
   ============================================================ */
App.Parser = (() => {

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

          for (const wsName of wb.SheetNames) {
            const ws = wb.Sheets[wsName];
            if (!ws || !ws['!ref']) continue;

            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
            if (!aoa || aoa.length < 2) continue; // Skip empty sheets

            const headers = aoa[0].map(h => h == null ? '' : String(h).trim());
            headers.forEach(h => { if (h) allHeadersSet.add(h); });

            const { mapping } = App.Validator.mapColumns(headers);
            const dataRows = aoa.slice(1).filter(r => r.some(c => c != null && c !== ''));

            // Detect and skip summary/total rows:
            // These have no product name but contain aggregate totals, or
            // contain the literal text "Total" in any cell.
            const nameColIdx = mapping.name
              ? headers.indexOf(mapping.name)
              : -1;

            const filteredDataRows = [];
            const excludedRows = [];

            // Find UPC column for excluded row tracking
            const upcColIdx = mapping.upc ? headers.indexOf(mapping.upc) : -1;
            const qtyColIdx = mapping.qty ? headers.indexOf(mapping.qty) : -1;
            const mrpColIdx = mapping.mrp ? headers.indexOf(mapping.mrp) : -1;
            const valColIdx = mapping.value ? headers.indexOf(mapping.value) : -1;

            for (let ri = 0; ri < dataRows.length; ri++) {
              const row = dataRows[ri];
              let excludeReason = null;

              // Check for summary/total rows
              for (const cell of row) {
                if (cell != null && String(cell).trim().toLowerCase() === 'total') {
                  excludeReason = 'summary_row';
                  break;
                }
              }
              // Check for empty product name
              if (!excludeReason && nameColIdx >= 0) {
                const nameVal = row[nameColIdx];
                if (nameVal == null || String(nameVal).trim() === '') {
                  excludeReason = 'missing_product_name';
                }
              }

              if (excludeReason) {
                excludedRows.push({
                  _sheet_name: wsName,
                  _source_row: ri + 2, // Excel row (1-indexed + header)
                  _exclude_reason: excludeReason,
                  upc: upcColIdx >= 0 ? row[upcColIdx] : null,
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
              headers.forEach((h, i) => { rawObj[h] = row[i] ?? null; });

              const mapped = {
                _raw_row_index: idx,
                _raw_sheet_name: wsName,
                _raw: rawObj
              };

              // Map canonical columns using sheet-specific mapping
              for (const [canonical, originalHeader] of Object.entries(mapping)) {
                mapped[canonical] = rawObj[originalHeader] ?? null;
              }

              // Sheet name fallback for category/type if missing
              mapped._sheet_name = wsName;

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
    // Parser already maps columns per sheet, so return rows directly if already mapped
    return rows.map(r => {
      if (r._raw && !r.name && globalMapping.name) {
        for (const [canonical, originalHeader] of Object.entries(globalMapping)) {
          if (!r[canonical]) r[canonical] = r._raw[originalHeader] ?? null;
        }
      }
      return r;
    });
  }

  return { parse, applyMapping };
})();
