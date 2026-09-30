window.App = window.App || {};

/* ============================================================
   EXPORTER — High-Fidelity CSV & Multi-Tab XLSX Export Utility
   ============================================================ */
App.Exporter = (() => {

  function sanitizeCellValue(val) {
    if (val == null) return '';
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).trim();
    if (/^[=+@\t\r\-]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }

  function sanitizeCSVField(val) {
    if (val == null) return '""';
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let str = String(val).trim();
    if (/^[=+@\t\r\-]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return `"${str}"`;
  }

  function sanitizeSheetName(name) {
    let clean = String(name).replace(/[\\/?*[\]:]/g, '_').trim();
    if (clean.length > 31) clean = clean.substring(0, 31);
    return clean || 'Sheet1';
  }

  function exportToCSV(filename, records) {
    if (!records || !records.length) return;

    // Analytics: meaningful_action (CSV export)
    try { App.Analytics && App.Analytics.track('meaningful_action', { action: 'export_csv', record_count: records.length }); } catch (_) {}
    
    const headers = [
      'Source Sheet', 'Item ID', 'UPC', 'Product Name', 'Brand', 
      'Category', 'Subcategory', 'Quantity', 'MRP', 'Source Value', 
      'Weight (KG)', 'Warehouse', 'Item Type', 'Inventory Status',
      'Bad Inventory Type', 'Remarks', 'Resolved Sellability', 'Confidence'
    ];

    const rows = records.map(r => {
      const detailedStatus = App.InventoryStatusResolver ? App.InventoryStatusResolver.resolveRecordStatusDetailed(r) : { status: r.raw_bad_inventory_type || 'unknown', confidence: 'HIGH' };
      return [
        sanitizeCSVField(r._raw_sheet_name || r._sheet_name || ''),
        sanitizeCSVField(r.item_id || ''),
        sanitizeCSVField(r.upc || ''),
        sanitizeCSVField(r.normalized_product_name || r.name || ''),
        sanitizeCSVField(r.normalized_brand || ''),
        sanitizeCSVField(r.normalized_category || ''),
        sanitizeCSVField(r.subcategory || ''),
        typeof r.qty === 'number' ? r.qty : sanitizeCSVField(r.qty || 0),
        typeof r.variant_mrp === 'number' ? r.variant_mrp : (typeof r.mrp === 'number' ? r.mrp : sanitizeCSVField(r.variant_mrp || r.mrp || 0)),
        typeof r.source_value === 'number' ? r.source_value : sanitizeCSVField(r.source_value || 0),
        typeof r.total_weight === 'number' ? Number(r.total_weight.toFixed(3)) : (r.weight != null ? Number(Number(r.weight).toFixed(3)) : 0),
        sanitizeCSVField(r.normalized_warehouse || r.warehouse_id || ''),
        sanitizeCSVField(r.raw_item_type || r.item_type || r.Type || ''),
        sanitizeCSVField(r.raw_inventory_status || r.inventory_status || r.status || ''),
        sanitizeCSVField(r.raw_bad_inventory_type || r.bad_inventory_type || ''),
        sanitizeCSVField(r.raw_remarks || r.remarks || ''),
        sanitizeCSVField(detailedStatus.status || 'unknown'),
        sanitizeCSVField(detailedStatus.confidence || r.subcategory_confidence || 'HIGH')
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportToXLSX(filename, records) {
    if (typeof XLSX === 'undefined' || !records || !records.length) {
      exportToCSV(filename, records);
      return;
    }

    // Analytics: meaningful_action (XLSX export)
    try { App.Analytics && App.Analytics.track('meaningful_action', { action: 'export_xlsx', record_count: records.length }); } catch (_) {}

    const wb = XLSX.utils.book_new();

    // ── 1. Create Executive Summary Sheet ──
    const totalRecords = records.length;
    const totalUnits = records.reduce((s, r) => s + (r.qty || 0), 0);
    const totalValue = records.reduce((s, r) => s + (r.source_value || 0), 0);
    const totalWeight = records.reduce((s, r) => s + (r.total_weight || 0), 0);
    const uniqueCats = new Set(records.map(r => r.normalized_category || 'Other')).size;
    const uniqueBrands = new Set(records.map(r => r.normalized_brand || 'Unknown')).size;

    const summaryData = [
      { 'Metric': 'Executive Inventory Summary', 'Value': '' },
      { 'Metric': 'Export Timestamp', 'Value': new Date().toISOString() },
      { 'Metric': 'Total Records', 'Value': totalRecords },
      { 'Metric': 'Total Units', 'Value': totalUnits },
      { 'Metric': 'Total Valuation (INR)', 'Value': totalValue },
      { 'Metric': 'Total Weight (KG)', 'Value': Number(totalWeight.toFixed(3)) },
      { 'Metric': 'Categories Count', 'Value': uniqueCats },
      { 'Metric': 'Brands Count', 'Value': uniqueBrands },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'Category Breakdown', 'Value': 'Valuation (INR)' }
    ];

    const catMap = {};
    for (const r of records) {
      const c = r.normalized_category || 'Other';
      catMap[c] = (catMap[c] || 0) + (r.source_value || 0);
    }
    for (const [catName, val] of Object.entries(catMap)) {
      summaryData.push({
        'Metric': sanitizeCellValue(catName),
        'Value': Math.round(val * 100) / 100
      });
    }

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // ── 2. Partition records by source sheet ──
    const sheetGroups = new Map();
    for (const r of records) {
      const sName = r._raw_sheet_name || r._sheet_name || 'Inventory';
      if (!sheetGroups.has(sName)) sheetGroups.set(sName, []);
      sheetGroups.get(sName).push(r);
    }

    const usedSheetNames = new Set(['Summary']);

    for (const [rawSheetName, sheetRecords] of sheetGroups.entries()) {
      let sheetTitle = sanitizeSheetName(rawSheetName);
      let dedupeIdx = 1;
      while (usedSheetNames.has(sheetTitle)) {
        sheetTitle = sanitizeSheetName(`${rawSheetName.substring(0, 27)}_${dedupeIdx}`);
        dedupeIdx++;
      }
      usedSheetNames.add(sheetTitle);

      const sheetData = sheetRecords.map(r => {
        const detailedStatus = App.InventoryStatusResolver ? App.InventoryStatusResolver.resolveRecordStatusDetailed(r) : { status: r.raw_bad_inventory_type || 'unknown', confidence: 'HIGH' };
        return {
          'Source Sheet': sanitizeCellValue(r._raw_sheet_name || r._sheet_name || ''),
          'Item ID': sanitizeCellValue(r.item_id || ''),
          'UPC': sanitizeCellValue(r.upc || ''),
          'Product Name': sanitizeCellValue(r.normalized_product_name || r.name || ''),
          'Brand': sanitizeCellValue(r.normalized_brand || ''),
          'Category': sanitizeCellValue(r.normalized_category || ''),
          'Subcategory': sanitizeCellValue(r.subcategory || ''),
          'Quantity': typeof r.qty === 'number' ? r.qty : Number(r.qty || 0),
          'MRP': typeof r.variant_mrp === 'number' ? r.variant_mrp : Number(r.variant_mrp || r.mrp || 0),
          'Source Value': typeof r.source_value === 'number' ? r.source_value : Number(r.source_value || 0),
          'Weight (KG)': typeof r.total_weight === 'number' ? Number(r.total_weight.toFixed(3)) : (r.weight != null ? Number(Number(r.weight).toFixed(3)) : 0),
          'Warehouse': sanitizeCellValue(r.normalized_warehouse || r.warehouse_id || ''),
          'Item Type': sanitizeCellValue(r.raw_item_type || r.item_type || r.Type || ''),
          'Inventory Status': sanitizeCellValue(r.raw_inventory_status || r.inventory_status || r.status || ''),
          'Bad Inventory Type': sanitizeCellValue(r.raw_bad_inventory_type || r.bad_inventory_type || ''),
          'Remarks': sanitizeCellValue(r.raw_remarks || r.remarks || ''),
          'Resolved Sellability': sanitizeCellValue(detailedStatus.status || 'unknown'),
          'Confidence': sanitizeCellValue(detailedStatus.confidence || r.subcategory_confidence || 'HIGH')
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    }

    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  function exportExcludedRecordsToCSV(filename, excludedRecords) {
    if (!excludedRecords || !excludedRecords.length) return;

    const headers = [
      'Exclusion Reason', 'Source Sheet', 'Source Row', 'Raw UPC / Code',
      'Raw Name / Description', 'Quantity', 'Source Value', 'Warehouse'
    ];

    const rows = excludedRecords.map(r => [
      sanitizeCSVField(r._exclude_reason || 'unknown'),
      sanitizeCSVField(r._sheet_name || ''),
      r._source_row || '',
      sanitizeCSVField(r.upc || r.item_id || ''),
      sanitizeCSVField(r.name || r.normalized_product_name || ''),
      typeof r.qty === 'number' ? r.qty : sanitizeCSVField(r.qty || ''),
      typeof r.value === 'number' ? r.value : sanitizeCSVField(r.source_value || r.value || ''),
      sanitizeCSVField(r.warehouse || r.warehouse_id || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     CATEGORY / SUBCATEGORY SUMMARY XLSX EXPORT
     Generates a professional multi-sheet workbook:
       Sheet 1 — Executive Summary (KPIs, timestamp, totals)
       Sheet 2 — Category Summary  (one row per category)
       Sheet 3 — Subcategory Detail (one row per category+subcategory)
     ============================================================ */
  function exportCategorySummaryXLSX(filename, records) {
    if (typeof XLSX === 'undefined') {
      console.error('[Exporter] SheetJS (XLSX) library not loaded — cannot export.');
      return;
    }
    if (!records || !records.length) {
      console.warn('[Exporter] No records to export.');
      return;
    }

    // ── Use records as-is from the active canonical dataset ──
    // Classification has already been applied by the pipeline.
    // Do NOT re-classify here — Dashboard and Export must reconcile
    // to the same classification decisions.

    // ── Aggregate by Category ──
    const catMap = new Map();
    const subcatMap = new Map(); // key = "Category|||Subcategory"

    for (const r of records) {
      const cat = r.normalized_category || 'Other / Uncategorized';
      const sub = r.subcategory || 'General';
      const qty = Number(r.qty) || 0;
      const val = Number(r.source_value) || 0;
      const wt  = Number(r.total_weight) || 0;
      const vol = Number(r.total_volume_l) || 0;
      const pfId = r.product_family_id || r.item_id || '';
      const brand = r.normalized_brand || 'Unknown';

      // Category aggregate
      if (!catMap.has(cat)) {
        catMap.set(cat, { name: cat, units: 0, value: 0, weight: 0, volume: 0, skus: new Set(), brands: new Set(), subcats: new Set(), records: 0 });
      }
      const c = catMap.get(cat);
      c.units   += qty;
      c.value   += val;
      c.weight  += wt;
      c.volume  += vol;
      c.records += 1;
      if (pfId) c.skus.add(pfId);
      if (brand) c.brands.add(brand);
      c.subcats.add(sub);

      // Subcategory aggregate
      const sKey = `${cat}|||${sub}`;
      if (!subcatMap.has(sKey)) {
        subcatMap.set(sKey, { category: cat, subcategory: sub, units: 0, value: 0, weight: 0, volume: 0, skus: new Set(), brands: new Set(), records: 0 });
      }
      const s = subcatMap.get(sKey);
      s.units   += qty;
      s.value   += val;
      s.weight  += wt;
      s.volume  += vol;
      s.records += 1;
      if (pfId) s.skus.add(pfId);
      if (brand) s.brands.add(brand);
    }

    // Totals
    const totalRecords = records.length;
    const totalUnits   = records.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const totalValue   = records.reduce((s, r) => s + (Number(r.source_value) || 0), 0);
    const totalWeight  = records.reduce((s, r) => s + (Number(r.total_weight) || 0), 0);
    const totalVolume  = records.reduce((s, r) => s + (Number(r.total_volume_l) || 0), 0);
    const totalCats    = catMap.size;
    const totalSubcats = subcatMap.size;

    const wb = XLSX.utils.book_new();

    // ════════════════════════════════════════════════════════════
    // Sheet 1 — Executive Summary
    // ════════════════════════════════════════════════════════════
    const summaryRows = [
      ['DataSheet IQ — Category Summary Report'],
      [''],
      ['Export Timestamp', new Date().toLocaleString()],
      ['Source File', (records[0] && (records[0]._raw_sheet_name || records[0]._sheet_name)) || 'N/A'],
      [''],
      ['KEY PERFORMANCE INDICATORS', ''],
      ['Total Records', totalRecords],
      ['Total Units', totalUnits],
      ['Total Valuation (₹)', Math.round(totalValue * 100) / 100],
      ['Total Weight (KG)', Math.round(totalWeight * 1000) / 1000],
      ['Total Volume (L)', Math.round(totalVolume * 1000) / 1000],
      ['Categories', totalCats],
      ['Subcategories', totalSubcats],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

    // Column widths
    ws1['!cols'] = [{ wch: 32 }, { wch: 24 }];

    // Bold the title row and KPI header
    const boldCells = ['A1', 'A6'];
    for (const addr of boldCells) {
      if (ws1[addr]) {
        ws1[addr].s = { font: { bold: true, sz: 14 } };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

    // ════════════════════════════════════════════════════════════
    // Sheet 2 — Category Summary
    // ════════════════════════════════════════════════════════════
    const catHeaders = [
      'Category', 'Records', 'Total Units', 'Total Value (₹)',
      'Total Weight (KG)', 'Total Volume (L)',
      'Unique SKUs', 'Unique Brands', 'Subcategories',
      '% of Total Value'
    ];

    const catRows = [...catMap.values()]
      .sort((a, b) => b.value - a.value)
      .map(c => [
        sanitizeCellValue(c.name),
        c.records,
        c.units,
        Math.round(c.value * 100) / 100,
        Math.round(c.weight * 1000) / 1000,
        Math.round(c.volume * 1000) / 1000,
        c.skus.size,
        c.brands.size,
        c.subcats.size,
        totalValue > 0 ? Math.round((c.value / totalValue) * 10000) / 100 : 0
      ]);

    // Grand total row
    catRows.push([
      'GRAND TOTAL',
      totalRecords,
      totalUnits,
      Math.round(totalValue * 100) / 100,
      Math.round(totalWeight * 1000) / 1000,
      Math.round(totalVolume * 1000) / 1000,
      '', '', '',
      100
    ]);

    const ws2Data = [catHeaders, ...catRows];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);

    // Column widths
    ws2['!cols'] = [
      { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }
    ];

    // Freeze top row + auto filter
    ws2['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ws2Data.length - 1, c: catHeaders.length - 1 } }) };

    XLSX.utils.book_append_sheet(wb, ws2, 'Category Summary');

    // ════════════════════════════════════════════════════════════
    // Sheet 3 — Subcategory Detail
    // ════════════════════════════════════════════════════════════
    const subHeaders = [
      'Category', 'Subcategory', 'Records', 'Total Units',
      'Total Value (₹)', 'Total Weight (KG)', 'Total Volume (L)',
      'Unique SKUs', 'Unique Brands', '% of Category Value',
      '% of Total Value'
    ];

    // Sort: by category name, then by value descending within each category
    const subRows = [...subcatMap.values()]
      .sort((a, b) => {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return b.value - a.value;
      })
      .map(s => {
        const parentCat = catMap.get(s.category);
        const catValue = parentCat ? parentCat.value : 0;
        return [
          sanitizeCellValue(s.category),
          sanitizeCellValue(s.subcategory),
          s.records,
          s.units,
          Math.round(s.value * 100) / 100,
          Math.round(s.weight * 1000) / 1000,
          Math.round(s.volume * 1000) / 1000,
          s.skus.size,
          s.brands.size,
          catValue > 0 ? Math.round((s.value / catValue) * 10000) / 100 : 0,
          totalValue > 0 ? Math.round((s.value / totalValue) * 10000) / 100 : 0
        ];
      });

    // Grand total row
    subRows.push([
      'GRAND TOTAL', '',
      totalRecords,
      totalUnits,
      Math.round(totalValue * 100) / 100,
      Math.round(totalWeight * 1000) / 1000,
      Math.round(totalVolume * 1000) / 1000,
      '', '', '',
      100
    ]);

    const ws3Data = [subHeaders, ...subRows];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);

    // Column widths
    ws3['!cols'] = [
      { wch: 28 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
      { wch: 18 }, { wch: 16 }, { wch: 16 },
      { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }
    ];

    // Freeze top row + auto filter
    ws3['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws3['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ws3Data.length - 1, c: subHeaders.length - 1 } }) };

    XLSX.utils.book_append_sheet(wb, ws3, 'Subcategory Detail');

    // ── Write workbook ──
    const exportName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, exportName);
    console.log(`[Exporter] Category Summary XLSX exported: ${exportName} | ${totalCats} categories, ${totalSubcats} subcategories, ${totalRecords} records`);
  }

  return { 
    exportToCSV, 
    exportToXLSX,
    exportCategorySummaryXLSX,
    exportExcludedRecordsToCSV, 
    sanitizeCellValue, 
    sanitizeCSVField,
    sanitizeSheetName 
  };
})();
