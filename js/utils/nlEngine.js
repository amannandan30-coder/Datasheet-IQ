window.App = window.App || {};

/* ============================================================
   NL ENGINE — Pattern-matching natural language query
   No hallucination possible — only queries actual data
   ============================================================ */
App.NLEngine = (() => {

  const PATTERNS = [
    // "how much atta do we have" | "total atta"
    { re: /(?:how much|total|how many units? of)\s+(.+?)(?:\s+do we have|$)/i,
      handler: 'categoryOrProduct' },

    // "show all atta brands" | "atta brands"
    { re: /(?:show all\s+)?(.+?)\s+brands?(?:\s+list)?$/i,
      handler: 'brandsInCategory' },

    // "which atta brand has the most units" | "top atta brand"
    { re: /(?:which|top)\s+(.+?)\s+brand(?:s)?\s+(?:has|have|with|by)?\s+(?:most|highest|maximum|max)\s+(?:units?|qty|quantity)/i,
      handler: 'topBrandInCategory' },

    // "how many philips products" | "philips inventory"
    { re: /(?:how many|show|list)\s+(.+?)\s+(?:products?|items?|inventory|records?)/i,
      handler: 'brandProducts' },

    // "which category has the highest value"
    { re: /which\s+categor(?:y|ies)\s+(?:has|have)\s+(?:highest|most|maximum|max)\s+(?:value|worth)/i,
      handler: 'topCategory' },

    // "show damaged electronics in BCPL"
    { re: /(?:show|list|find)\s+(?:all\s+)?(.+?)\s+(?:in|at|from)\s+(.+)$/i,
      handler: 'filteredSearch' },

    // "top 20 products by value" | "top products by value"
    { re: /top\s+(\d+)?\s*products?\s+by\s+(value|units?|weight|qty)/i,
      handler: 'topProducts' },

    // "show damaged" | "all damaged"
    { re: /(?:show|list|find)?\s*(?:all\s+)?(\w+)\s+(?:inventory|items?|products?|records?)?$/i,
      handler: 'statusFilter' },
  ];

  function normLower(s) { return (s||'').toLowerCase().trim(); }

  async function query(text, dataset_id) {
    if (!text || !dataset_id) return null;

    const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
    if (!records.length) return { type:'error', message: 'No data loaded. Please upload an inventory file first.' };

    for (const { re, handler } of PATTERNS) {
      const m = text.match(re);
      if (m) {
        try {
          return await handlers[handler](m, records, dataset_id, text);
        } catch(e) {
          return { type:'error', message: `Could not process query: ${e.message}` };
        }
      }
    }

    // Fallback: generic search
    return await handlers.genericSearch(text, records, dataset_id);
  }

  const handlers = {

    categoryOrProduct: async (m, records, dataset_id, text) => {
      const term = normLower(m[1]);
      // Check if term matches a category or product type
      const matching = records.filter(r =>
        normLower(r.normalized_category).includes(term) ||
        normLower(r.subcategory).includes(term) ||
        normLower(r.normalized_product_name).includes(term) ||
        normLower(r.raw_brand).includes(term)
      );
      if (!matching.length) return { type:'not_found', message:`No records found matching "${m[1]}"` };

      const totalQty    = matching.reduce((s,r) => s+(r.qty||0), 0);
      const totalValue  = matching.reduce((s,r) => s+(r.source_value||0), 0);
      const totalWeight = matching.reduce((s,r) => s+(r.total_weight||0), 0);
      const brands      = [...new Set(matching.map(r => r.normalized_brand))];

      return {
        type: 'summary',
        query: text,
        headline: `${App.Fmt.number(totalQty)} units of "${m[1].trim()}"`,
        data: {
          total_units:  totalQty,
          total_value:  totalValue,
          total_weight: totalWeight,
          brand_count:  brands.length,
          brands:       brands.slice(0,10),
        },
        records: matching.slice(0,50),
      };
    },

    brandsInCategory: async (m, records, dataset_id, text) => {
      const term = normLower(m[1]);
      const matching = records.filter(r =>
        normLower(r.normalized_category).includes(term) ||
        normLower(r.subcategory).includes(term)
      );
      if (!matching.length) return { type:'not_found', message:`No records found for category "${m[1]}"` };

      // Group by brand
      const brandMap = new Map();
      for (const r of matching) {
        const b = r.normalized_brand || 'Unknown';
        if (!brandMap.has(b)) brandMap.set(b, { name:b, qty:0, value:0, weight:0 });
        const bm = brandMap.get(b);
        bm.qty    += (r.qty||0);
        bm.value  += (r.source_value||0);
        bm.weight += (r.total_weight||0);
      }
      const brandList = [...brandMap.values()].sort((a,b) => b.qty - a.qty);

      return {
        type: 'brand_list',
        query: text,
        headline: `${brandList.length} brands in "${m[1].trim()}"`,
        data: { brands: brandList },
        records: matching.slice(0,50),
      };
    },

    topBrandInCategory: async (m, records, dataset_id, text) => {
      const term = normLower(m[1]);
      const matching = records.filter(r =>
        normLower(r.normalized_category).includes(term) ||
        normLower(r.subcategory).includes(term)
      );
      if (!matching.length) return { type:'not_found', message:`No records for "${m[1]}"` };

      const brandMap = new Map();
      for (const r of matching) {
        const b = r.normalized_brand || 'Unknown';
        if (!brandMap.has(b)) brandMap.set(b, { name:b, qty:0, value:0 });
        brandMap.get(b).qty += (r.qty||0);
        brandMap.get(b).value += (r.source_value||0);
      }
      const top = [...brandMap.values()].sort((a,b) => b.qty - a.qty)[0];

      return {
        type: 'answer',
        query: text,
        headline: `${top.name} has the most ${m[1]} — ${App.Fmt.number(top.qty)} units`,
        data: { top_brand: top },
        records: matching.filter(r => r.normalized_brand === top.name).slice(0,50),
      };
    },

    brandProducts: async (m, records, dataset_id, text) => {
      const term = normLower(m[1]);
      const matching = records.filter(r =>
        normLower(r.normalized_brand).includes(term) ||
        normLower(r.raw_brand).includes(term)
      );
      if (!matching.length) return { type:'not_found', message:`No records for brand "${m[1]}"` };

      const totalQty   = matching.reduce((s,r) => s+(r.qty||0), 0);
      const totalValue = matching.reduce((s,r) => s+(r.source_value||0), 0);
      const skus       = new Set(matching.map(r => r.product_family_id)).size;

      return {
        type: 'summary',
        query: text,
        headline: `${m[1].trim()} — ${App.Fmt.number(totalQty)} units, ${skus} SKUs`,
        data: { total_units: totalQty, total_value: totalValue, sku_count: skus },
        records: matching.slice(0,50),
      };
    },

    topCategory: async (m, records, dataset_id, text) => {
      const catMap = new Map();
      for (const r of records) {
        const c = r.normalized_category || 'Unknown';
        if (!catMap.has(c)) catMap.set(c, { name:c, value:0, qty:0 });
        catMap.get(c).value += (r.source_value||0);
        catMap.get(c).qty   += (r.qty||0);
      }
      const sorted = [...catMap.values()].sort((a,b) => b.value-a.value);
      const top = sorted[0];
      return {
        type: 'answer',
        query: text,
        headline: `${top.name} has the highest value — ${App.Fmt.currency(top.value)}`,
        data: { categories: sorted.slice(0,10) },
        records: records.filter(r => r.normalized_category === top.name).slice(0,50),
      };
    },

    filteredSearch: async (m, records, dataset_id, text) => {
      const what   = normLower(m[1]);
      const where  = normLower(m[2]);
      const matching = records.filter(r =>
        (normLower(r.normalized_category).includes(what) ||
         normLower(r.subcategory).includes(what) ||
         normLower(r.normalized_brand).includes(what) ||
         normLower(r.raw_bad_inventory_type).includes(what)) &&
        (normLower(r.normalized_warehouse).includes(where) ||
         normLower(r.raw_entity_name).includes(where))
      );
      const totalQty = matching.reduce((s,r) => s+(r.qty||0),0);
      return {
        type: 'filtered',
        query: text,
        headline: `${App.Fmt.number(matching.length)} records — ${App.Fmt.number(totalQty)} units`,
        records: matching.slice(0,50),
      };
    },

    topProducts: async (m, records, dataset_id, text) => {
      const N    = parseInt(m[1]) || 20;
      const by   = normLower(m[2]);
      const field= by.includes('value') ? 'source_value' : by.includes('weight') ? 'total_weight' : 'qty';

      const famMap = new Map();
      for (const r of records) {
        const fid = r.product_family_id;
        if (!famMap.has(fid)) famMap.set(fid, { name: r.normalized_product_name, brand: r.normalized_brand, qty:0, value:0, weight:0 });
        const f = famMap.get(fid);
        f.qty    += (r.qty||0);
        f.value  += (r.source_value||0);
        f.weight += (r.total_weight||0);
      }
      const sorted = [...famMap.values()].sort((a,b) => b[field]-a[field]).slice(0,N);

      return {
        type: 'product_list',
        query: text,
        headline: `Top ${N} products by ${by}`,
        data: { products: sorted },
        records: [],
      };
    },

    statusFilter: async (m, records, dataset_id, text) => {
      const term = normLower(m[1]);
      const matching = records.filter(r => normLower(r.raw_bad_inventory_type).includes(term));
      if (!matching.length) return await handlers.genericSearch(text, records, dataset_id);
      const totalQty = matching.reduce((s,r) => s+(r.qty||0),0);
      const totalVal = matching.reduce((s,r) => s+(r.source_value||0),0);
      return {
        type: 'filtered',
        query: text,
        headline: `${App.Fmt.number(matching.length)} "${m[1]}" records — ${App.Fmt.number(totalQty)} units — ${App.Fmt.currency(totalVal)}`,
        records: matching.slice(0,50),
      };
    },

    genericSearch: async (text, records, dataset_id) => {
      const term = normLower(text);
      const matching = records.filter(r =>
        normLower(r.normalized_product_name).includes(term) ||
        normLower(r.normalized_brand).includes(term) ||
        normLower(r.normalized_category).includes(term) ||
        normLower(r.normalized_warehouse).includes(term) ||
        normLower(r.item_id||'').includes(term)
      );
      if (!matching.length) return { type:'not_found', message: `No results for "${text}". Try searching for a brand, category, or product name.` };
      const totalQty = matching.reduce((s,r) => s+(r.qty||0),0);
      return {
        type: 'search',
        query: text,
        headline: `${matching.length} records matching "${text}" — ${App.Fmt.number(totalQty)} units total`,
        records: matching.slice(0,50),
      };
    },
  };

  return { query };
})();
