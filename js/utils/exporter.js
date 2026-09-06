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

  return { 
    exportToCSV, 
    exportToXLSX, 
    exportExcludedRecordsToCSV, 
    sanitizeCellValue, 
    sanitizeCSVField,
    sanitizeSheetName 
  };
})();
