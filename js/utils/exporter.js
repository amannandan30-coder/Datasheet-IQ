window.App = window.App || {};

App.Exporter = (() => {

  function exportToCSV(filename, records) {
    if (!records || !records.length) return;
    
    const headers = [
      'Source Sheet', 'Item ID', 'UPC', 'Product Name', 'Brand', 
      'Category', 'Subcategory', 'Quantity', 'MRP', 'Source Value', 
      'Weight (KG)', 'Warehouse', 'Status'
    ];

    const rows = records.map(r => [
      r._raw_sheet_name || '',
      r.item_id || '',
      r.upc || '',
      `"${(r.normalized_product_name || r.name || '').replace(/"/g, '""')}"`,
      `"${(r.normalized_brand || '').replace(/"/g, '""')}"`,
      `"${(r.normalized_category || '').replace(/"/g, '""')}"`,
      `"${(r.subcategory || '').replace(/"/g, '""')}"`,
      r.qty || 0,
      r.mrp || 0,
      r.source_value || 0,
      (r.total_weight || 0).toFixed(3),
      `"${(r.warehouse_id || '').replace(/"/g, '""')}"`,
      `"${(r.bad_inventory_type || r.status || '').replace(/"/g, '""')}"`
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
  }

  function exportToXLSX(filename, records) {
    if (typeof XLSX === 'undefined' || !records || !records.length) {
      exportToCSV(filename, records);
      return;
    }

    const data = records.map(r => ({
      'Source Sheet': r._raw_sheet_name || '',
      'Item ID': r.item_id || '',
      'UPC': r.upc || '',
      'Product Name': r.normalized_product_name || r.name || '',
      'Brand': r.normalized_brand || '',
      'Category': r.normalized_category || '',
      'Subcategory': r.subcategory || '',
      'Quantity': r.qty || 0,
      'MRP': r.mrp || 0,
      'Source Value': r.source_value || 0,
      'Weight (KG)': Number((r.total_weight || 0).toFixed(3)),
      'Warehouse': r.warehouse_id || '',
      'Status': r.bad_inventory_type || r.status || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  return { exportToCSV, exportToXLSX };
})();
