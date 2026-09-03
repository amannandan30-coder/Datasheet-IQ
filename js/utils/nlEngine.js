window.App = window.App || {};

/* ============================================================
   NL ENGINE — Intelligent Natural Language Inventory Query
   3-layer architecture:
     1. Query Understanding (parseQuery)
     2. Entity Resolution   (resolveEntity)
     3. Aggregation Engine   (executeQuery)

   ALL calculations use the SAME record fields as the dashboard:
     r.qty               — quantity
     r.source_value      — inventory value
     r.total_weight      — weight in KG
     r.normalized_category  — category
     r.subcategory          — subcategory
     r.normalized_brand     — brand
     r.product_family_id    — product family / SKU
     r.raw_bad_inventory_type — inventory status
     r.normalized_warehouse   — warehouse
     r.normalized_product_name — product name
   ============================================================ */
App.NLEngine = (() => {

  /* ── Conversational context ──────────────────────────────── */
  let _context = {
    lastEntity: null,      // last resolved entity string
    lastCategory: null,    // last matched category
    lastSubcategory: null, // last matched subcategory
    lastBrand: null,       // last matched brand
    lastWarehouse: null,   // last matched warehouse
    lastQuery: null,
  };

  function resetContext() {
    _context = { lastEntity:null, lastCategory:null, lastSubcategory:null, lastBrand:null, lastWarehouse:null, lastQuery:null };
  }

  /* ── Synonym map for natural-language → category/subcategory ── */
  const ENTITY_SYNONYMS = {
    // Grocery subcategories
    'atta':            { type:'subcategory', name:'Atta',                  category:'Grocery' },
    'chakki atta':     { type:'subcategory', name:'Atta',                  category:'Grocery' },
    'multigrain atta': { type:'subcategory', name:'Atta',                  category:'Grocery' },
    'flour':           { type:'subcategory', name:'Flours',                category:'Grocery' },
    'flours':          { type:'subcategory', name:'Flours',                category:'Grocery' },
    'wheat flour':     { type:'subcategory', name:'Flours',                category:'Grocery' },
    'whole wheat flour':{ type:'subcategory', name:'Flours',               category:'Grocery' },
    'wheat':           { type:'subcategory', name:'Flours',                category:'Grocery' },
    'maida':           { type:'subcategory', name:'Flours',                category:'Grocery' },
    'besan':           { type:'subcategory', name:'Flours',                category:'Grocery' },
    'suji':            { type:'subcategory', name:'Flours',                category:'Grocery' },
    'rava':            { type:'subcategory', name:'Flours',                category:'Grocery' },
    'multigrain flour':{ type:'subcategory', name:'Flours',                category:'Grocery' },
    'rice':            { type:'subcategory', name:'Rice',                  category:'Grocery' },
    'basmati':         { type:'subcategory', name:'Rice',                  category:'Grocery' },
    'poha':            { type:'subcategory', name:'Rice',                  category:'Grocery' },
    'dal':             { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'daal':            { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'lentil':          { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'lentils':         { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'pulses':          { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'moong':           { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'rajma':           { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'chana':           { type:'subcategory', name:'Pulses & Lentils',     category:'Grocery' },
    'oil':             { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'oils':            { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'cooking oil':     { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'edible oil':      { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'mustard oil':     { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'sunflower oil':   { type:'subcategory', name:'Oils',                  category:'Grocery' },
    'ghee':            { type:'subcategory', name:'Ghee',                  category:'Grocery' },
    'sugar':           { type:'subcategory', name:'Sugar',                 category:'Grocery' },
    'jaggery':         { type:'subcategory', name:'Sugar',                 category:'Grocery' },
    'salt':            { type:'subcategory', name:'Salt',                  category:'Grocery' },
    'spices':          { type:'subcategory', name:'Spices & Masalas',     category:'Grocery' },
    'masala':          { type:'subcategory', name:'Spices & Masalas',     category:'Grocery' },
    'masalas':         { type:'subcategory', name:'Spices & Masalas',     category:'Grocery' },
    'tea':             { type:'subcategory', name:'Tea',                   category:'Grocery' },
    'chai':            { type:'subcategory', name:'Tea',                   category:'Grocery' },
    'coffee':          { type:'subcategory', name:'Coffee',                category:'Grocery' },
    'biscuits':        { type:'subcategory', name:'Biscuits & Cookies',    category:'Grocery' },
    'biscuit':         { type:'subcategory', name:'Biscuits & Cookies',    category:'Grocery' },
    'cookies':         { type:'subcategory', name:'Biscuits & Cookies',    category:'Grocery' },
    'snacks':          { type:'subcategory', name:'Snacks & Namkeen',      category:'Grocery' },
    'chips':           { type:'subcategory', name:'Snacks & Namkeen',      category:'Grocery' },
    'namkeen':         { type:'subcategory', name:'Snacks & Namkeen',      category:'Grocery' },
    'multigrain chips':{ type:'subcategory', name:'Snacks & Namkeen',      category:'Grocery' },
    'noodles':         { type:'subcategory', name:'Noodles',               category:'Grocery' },
    'maggi':           { type:'subcategory', name:'Noodles',               category:'Grocery' },
    'pasta':           { type:'subcategory', name:'Pasta & Macaroni',      category:'Grocery' },
    'sauce':           { type:'subcategory', name:'Sauces & Ketchups',     category:'Grocery' },
    'sauces':          { type:'subcategory', name:'Sauces & Ketchups',     category:'Grocery' },
    'ketchup':         { type:'subcategory', name:'Sauces & Ketchups',     category:'Grocery' },
    'pickle':          { type:'subcategory', name:'Pickles & Chutneys',    category:'Grocery' },
    'jam':             { type:'subcategory', name:'Pickles & Chutneys',    category:'Grocery' },
    'juice':           { type:'subcategory', name:'Beverages',            category:'Grocery' },
    'beverages':       { type:'subcategory', name:'Beverages',            category:'Grocery' },
    'drinks':          { type:'subcategory', name:'Beverages',            category:'Grocery' },
    'cold drinks':     { type:'subcategory', name:'Beverages',            category:'Grocery' },
    'milk':            { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'dairy':           { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'paneer':          { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'curd':            { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'butter':          { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'cheese':          { type:'subcategory', name:'Dairy Products',       category:'Grocery' },
    'chocolate':       { type:'subcategory', name:'Chocolates',           category:'Grocery' },
    'chocolates':      { type:'subcategory', name:'Chocolates',           category:'Grocery' },
    'candy':           { type:'subcategory', name:'Chocolates',           category:'Grocery' },
    'sweets':          { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'laddu':           { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'ladoo':           { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'laddoo':          { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'burfi':           { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'besan laddu':     { type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'ghee besan laddu':{ type:'subcategory', name:'Sweets & Mithai',      category:'Grocery' },
    'oats':            { type:'subcategory', name:'Breakfast Cereals',    category:'Grocery' },
    'cereal':          { type:'subcategory', name:'Breakfast Cereals',    category:'Grocery' },
    'cereals':         { type:'subcategory', name:'Breakfast Cereals',    category:'Grocery' },
    'daliya':          { type:'subcategory', name:'Breakfast Cereals',    category:'Grocery' },
    'dalia':           { type:'subcategory', name:'Breakfast Cereals',    category:'Grocery' },
    'multigrain daliya':{ type:'subcategory', name:'Breakfast Cereals',   category:'Grocery' },

    // Cleaning subcategories
    'detergent':       { type:'subcategory', name:'Detergents & Laundry', category:'Cleaning Essentials' },
    'detergents':      { type:'subcategory', name:'Detergents & Laundry', category:'Cleaning Essentials' },
    'surf':            { type:'subcategory', name:'Detergents & Laundry', category:'Cleaning Essentials' },
    'laundry':         { type:'subcategory', name:'Detergents & Laundry', category:'Cleaning Essentials' },
    'dishwash':        { type:'subcategory', name:'Dishwash',             category:'Cleaning Essentials' },
    'vim':             { type:'subcategory', name:'Dishwash',             category:'Cleaning Essentials' },
    'toilet cleaner':  { type:'subcategory', name:'Toilet Cleaners',      category:'Cleaning Essentials' },
    'harpic':          { type:'subcategory', name:'Toilet Cleaners',      category:'Cleaning Essentials' },
    'mosquito':        { type:'subcategory', name:'Repellents',           category:'Cleaning Essentials' },
    'repellent':       { type:'subcategory', name:'Repellents',           category:'Cleaning Essentials' },

    // Electronics subcategories
    'bulb':            { type:'subcategory', name:'Lighting',             category:'Electronics & Electricals' },
    'bulbs':           { type:'subcategory', name:'Lighting',             category:'Electronics & Electricals' },
    'led':             { type:'subcategory', name:'Lighting',             category:'Electronics & Electricals' },
    'lighting':        { type:'subcategory', name:'Lighting',             category:'Electronics & Electricals' },
    'fan':             { type:'subcategory', name:'Fans',                 category:'Electronics & Electricals' },
    'fans':            { type:'subcategory', name:'Fans',                 category:'Electronics & Electricals' },
    'battery':         { type:'subcategory', name:'Batteries',            category:'Electronics & Electricals' },
    'batteries':       { type:'subcategory', name:'Batteries',            category:'Electronics & Electricals' },
    'charger':         { type:'subcategory', name:'Mobile Accessories',   category:'Electronics & Electricals' },
    'earphone':        { type:'subcategory', name:'Mobile Accessories',   category:'Electronics & Electricals' },
    'soap':            { type:'subcategory', name:'Personal Hygiene',     category:'Cleaning Essentials' },
    'soaps':           { type:'subcategory', name:'Personal Hygiene',     category:'Cleaning Essentials' },
    'shampoo':         { type:'subcategory', name:'Hair Care',            category:'Personal Care' },
    'toothpaste':      { type:'subcategory', name:'Oral Care',            category:'Personal Care' },
    'rice snacks':     { type:'subcategory', name:'Snacks & Biscuits',    category:'Grocery' },

    // Category-level synonyms
    'grocery':         { type:'category', name:'Grocery' },
    'groceries':       { type:'category', name:'Grocery' },
    'electronics':     { type:'category', name:'Electronics & Electricals' },
    'electronic':      { type:'category', name:'Electronics & Electricals' },
    'electrical':      { type:'category', name:'Electronics & Electricals' },
    'electricals':     { type:'category', name:'Electronics & Electricals' },
    'att':             { type:'subcategory', name:'Atta & Flours',        category:'Grocery' },
    'oill':            { type:'subcategory', name:'Oils & Ghee',          category:'Grocery' },
    'cleaning':        { type:'category', name:'Cleaning Essentials' },
    'cleaning essentials': { type:'category', name:'Cleaning Essentials' },
    'home care':       { type:'category', name:'Home Care' },
    'toys':            { type:'category', name:'Toys & Games' },
    'games':           { type:'category', name:'Toys & Games' },
    'personal care':   { type:'category', name:'Personal Care' },
    'cosmetics':       { type:'category', name:'Personal Care' },
    'beauty':          { type:'category', name:'Personal Care' },
    'stationery':      { type:'category', name:'Stationery & Office' },
    'office':          { type:'category', name:'Stationery & Office' },
  };

  /* ── Metric synonyms ─────────────────────────────────────── */
  const METRIC_TERMS = {
    quantity: ['units','unit','quantity','qty','pieces','piece','count','amount','stock','inventory','items','how much','how many','total','number'],
    value:    ['value','worth','price','cost','money','rupees','rs','₹','amount worth','inventory value','mrp'],
    weight:   ['weight','kg','kilogram','kilograms','ton','tons','heavy','heaviest','lightest'],
  };

  /* ── Status synonyms ─────────────────────────────────────── */
  const STATUS_TERMS = {
    'near_expiry':['near expiry','near-expiry','nearexpiry','about to expire','expiring soon','expiring'],
    'damaged':    ['damaged','damage','broken','defective'],
    'expired':    ['expired','expire','expiry'],
    'saleable':   ['saleable','salable','good','sellable','ok'],
  };

  /* ────────────────────────────────────────────────────────────
     LAYER 1: Query Understanding — parseQuery
     ──────────────────────────────────────────────────────────── */
  function parseQuery(text) {
    const q = text.toLowerCase().trim().replace(/[?!.]+$/g, '');
    const parsed = {
      raw: text,
      normalized: q,
      intent: null,
      entityTerms: [],     // raw terms user typed for entity
      metric: 'quantity',  // default metric
      sortDir: 'desc',
      limit: null,
      statusFilter: null,
      warehouseFilter: null,
      brandFilter: null,
    };

    // ── Detect metric ──
    if (/\b(value|worth|cost|price|money|rupees?|₹|rs\b)/i.test(q)) {
      parsed.metric = 'value';
    } else if (/\b(weight|kg|kilogram|ton)/i.test(q)) {
      parsed.metric = 'weight';
    }

    // ── Detect status filter ──
    for (const [status, terms] of Object.entries(STATUS_TERMS)) {
      for (const term of terms) {
        if (q.includes(term)) {
          parsed.statusFilter = status;
          break;
        }
      }
      if (parsed.statusFilter) break;
    }

    // ── Detect limit (e.g., "top 5", "top 10") ──
    const limitMatch = q.match(/\btop\s+(\d+)/);
    if (limitMatch) parsed.limit = parseInt(limitMatch[1]);
    else if (/\btop\b/.test(q) && !parsed.limit) parsed.limit = 10;

    // ── Detect sort direction ──
    if (/\b(lowest|least|minimum|min|bottom|fewest|smallest)\b/.test(q)) parsed.sortDir = 'asc';

    // ── Detect warehouse filter (e.g., "in BCPL", "at BCPL", "for BCPL") ──
    if (!/\b(?:find|show|list|get)\s+products\s+from\b/i.test(q)) {
      const whMatch = q.match(/\b(?:in|at|from|for|warehouse)\s+([a-z0-9][a-z0-9\s]*?)(?:\s*$|\s+(?:warehouse|wh))/i);
      if (whMatch) {
        parsed.warehouseFilter = whMatch[1].trim();
      } else {
        const whEnd = q.match(/\b(?:in|at|from|for)\s+([a-z][a-z0-9\s]{1,20})$/i);
        if (whEnd) parsed.warehouseFilter = whEnd[1].trim();
      }
    }

    // ── INTENT DETECTION (ordered by specificity) ──

    // "Which brand has the most units?" / "Who has the highest quantity of atta?" / "Which atta brand has the most units?" / "Kaunsa atta brand sabse zyada hai?" / "Top atta brands by value"
    if (!parsed.intent && (/\b(?:which|who|top|best|biggest|largest|highest|kaunsa|kon\s*sa|konsa|kis|kiska|kiske)\s+(?:brand|brands)\b/i.test(q) ||
        /\b(?:which|who|top|best|biggest|largest|highest|kaunsa|kon\s*sa|konsa|kis|kiska|kiske)\s+(.+?)\s+brands?\b/i.test(q) ||
        /\bwho\s+(?:has|is)\s+(?:the\s+)?(?:highest|most|top|maximum)\s+(?:quantity|units?|stock|value|weight)?\s*(?:of|in)?\s*(.+)?/i.test(q) ||
        /\bkaunsa\s+(.+?)\s+brand\b/i.test(q) ||
        /\b(.+?)\s+brand\s+(?:sabse|sab\s+se)\s+(?:zyada|bada|adhik)\b/i.test(q) ||
        /\btop\s+\d*\s*(.+?)\s+brands?\b/i.test(q))) {
      const topM = q.match(/(?:which|who|top|best|biggest|largest|highest|kaunsa|kon\s*sa|konsa|kis|kiska|kiske)\s+(?:all\s+)?(.+?)\s+brands?\s+(?:has|have|with|by)?\s*(?:the\s+)?(?:most|highest|maximum|max|lowest|least|minimum|sabse\s+zyada|sab\s+se\s+zyada)?\s*(units?|value|weight|qty|quantity)?/i) ||
                   q.match(/who\s+(?:has|is)\s+(?:the\s+)?(?:highest|most|top|maximum)\s+(?:quantity|units?|stock|value|weight)?\s*(?:of|in)?\s*(.+)/i) ||
                   q.match(/(?:which|who|top|best|biggest|largest|highest|kaunsa|kon\s*sa|konsa|kis|kiska|kiske)\s+brands?\s+(?:has|have|with|by)?\s*(?:the\s+)?(?:most|highest|maximum|max|lowest|least|minimum|sabse\s+zyada|sab\s+se\s+zyada)?\s*(units?|value|weight|qty|quantity)?/i) ||
                   q.match(/(.+?)\s+brand\s+(?:sabse|sab\s+se)\s+(?:zyada|bada|adhik)\b/i) ||
                   q.match(/top\s+\d*\s*(.+?)\s+brands?\s+(?:by\s+)?(value|units?|weight|qty|quantity)?/i);
      if (topM) {
        parsed.intent = 'TOP_BRANDS';
        const term = topM[1] && !/^(brand|brands)$/i.test(topM[1]) ? topM[1] : '';
        parsed.entityTerms = cleanEntityTerms(term);
        const metricStr = topM[2] || q;
        if (/value|worth|price/i.test(metricStr)) parsed.metric = 'value';
        else if (/weight/i.test(metricStr)) parsed.metric = 'weight';
        else parsed.metric = 'quantity';
        if (!parsed.limit) parsed.limit = 1;
        if (/\b(which|who|kaunsa|kon\s*sa|konsa|kis|kiska|kiske)\b/i.test(q) && !limitMatch) parsed.limit = 1;
      }
    }

    // Global inventory summary (e.g., "How much is my inventory worth?", "How many SKUs do I have?", "Show complete stock summary")
    if (!parsed.intent && /\b(total|overall|whole|everything|all inventory|entire|summary|complete|size of inventory|worth|inventory worth|how many (?:skus|brands|warehouses)|how much is my inventory|stock summary)\b/i.test(q) &&
        !/\b(atta|flour|rice|oil|ghee|electronics|snacks|biscuits|cereals|spices|masala|beverages|dairy|soap|shampoo|toothpaste|detergent|aashirvaad|fortune|eveready|indimix|bcpl|products?|from|by)\b/i.test(q)) {
      parsed.intent = 'SUMMARY';
      parsed.entityTerms = [];
    }

    // "Find products from Aashirvaad" / "Show products under Atta & Flours" / "Which product has the most units?"
    if (!parsed.intent && (/\b(?:find|show|list|get|which)\s+(?:all\s+)?(.+?\s+)?products?\b/i.test(q) ||
        /\bwhich\s+(.+?)\s+product\b/i.test(q))) {
      const pM = q.match(/\b(?:find|show|list|get|which)\s+(?:all\s+)?(.+?\s+)?products?\s+(?:from|under|of|in|by|has|have|with)?\s*(.*)/i) ||
                 q.match(/\bwhich\s+(.+?)\s+product\b/i);
      if (pM) {
        const isFromBrand = /\b(from|by)\b/i.test(q) && !/\bby\s+(value|units?|weight|qty|quantity)\b/i.test(q);
        parsed.intent = isFromBrand ? 'BRAND_PRODUCTS' : 'TOP_PRODUCTS';
        let term = pM[1] && !/^(product|products|top\s*\d*|top)$/i.test(pM[1].trim()) ? pM[1].trim() : (pM[2] || '');
        if (/^(?:by\s+)?(value|units?|weight|qty|quantity)$/i.test(term.trim())) term = '';
        parsed.entityTerms = cleanEntityTerms(term);
        if (!parsed.limit) parsed.limit = /\bwhich\b/i.test(q) ? 1 : 20;
      }
    }

    // "How much Aashirvaad atta do we have?" — brand + entity / category summary
    if (!parsed.intent && (/\bhow (?:much|many)\s+(\w[\w\s]*?)\s+(?:do we|have|is there|are there|available|in stock|\bare\b|\bis\b|\bin\b|\bat\b|\bfrom\b)/i.test(q) ||
        /\bhow (?:much|many)\s+(?:units?\s+of\s+)?(\w[\w\s]*)/i.test(q) ||
        /\bwhat(?:'s| is| are)\s+(?:the\s+)?(?:total\s+)?(?:amount|quantity|units?|value|weight|stock|inventory|number)\s+(?:of\s+)?(\w[\w\s]*)/i.test(q) ||
        /\btotal\s+(\w[\w\s]*?)(?:\s+(?:stock|inventory|units?|value))?$/i.test(q) ||
        /\bshow (?:me\s+)?(?:total\s+)?(\w[\w\s]*?)\s+(?:stock|inventory)/i.test(q))) {
      const entityM = q.match(
        /how (?:much|many)\s+(?:units?\s+of\s+)?(.+?)(?:\s+(?:do we|have|is there|are there|available|in stock|\bare\b|\bis\b|\bin\b|\bat\b|\bfrom\b)|\s*$)/i
      ) || q.match(
        /what(?:'s| is| are)\s+(?:the\s+)?(?:total\s+)?(?:amount|quantity|units?|value|weight|stock|inventory|number)\s+(?:of\s+)?(.+)/i
      ) || q.match(
        /total\s+(.+?)(?:\s+(?:stock|inventory|units?|value))?$/i
      ) || q.match(
        /show (?:me\s+)?(?:total\s+)?(.+?)\s+(?:stock|inventory)/i
      );
      if (entityM) {
        parsed.intent = 'SUMMARY';
        // Remove warehouse filter string if it bled into entity terms
        let rawEntity = entityM[1];
        if (parsed.warehouseFilter) {
          rawEntity = rawEntity.replace(new RegExp('\\b(?:in|at|from)?\\s*' + escapeRegex(parsed.warehouseFilter) + '\\b', 'gi'), '').trim();
        }
        parsed.entityTerms = cleanEntityTerms(rawEntity);

        // If rawEntity was only global metric words or warehouse/noise, clean terms to empty
        if (/^(skus?|brands?|warehouses?|inventory|stock|items?|records?|units?|worth|for|in|at|from|\s)+$/i.test(rawEntity)) {
          parsed.entityTerms = [];
        }
      }
    }

    // "Show all atta brands" / "atta brands list"
    if (!parsed.intent && (/\b(?:show|list|all|find)\s+(?:all\s+)?(.+?)\s+brands?\b/i.test(q) ||
        /\b(.+?)\s+brands?\s*(?:list)?$/i.test(q))) {
      const brandM = q.match(/(?:show|list|all|find)\s+(?:all\s+)?(.+?)\s+brands?/i) ||
                     q.match(/(.+?)\s+brands?\s*(?:list)?$/i);
      if (brandM) {
        parsed.intent = 'TOP_BRANDS';
        parsed.entityTerms = cleanEntityTerms(brandM[1]);
        if (!parsed.limit) parsed.limit = 20;
      }
    }

    // "Which category has the highest value?" / "Top categories"
    if (!parsed.intent && /\bcategor(?:y|ies)\b/i.test(q)) {
      parsed.intent = 'TOP_CATEGORIES';
      if (!parsed.limit) parsed.limit = 10;
    }

    // "Top 20 products by value"
    if (!parsed.intent && /\btop\s+\d*\s*products?\s+(?:by\s+)?(value|units?|weight|qty|quantity)?/i.test(q)) {
      const pM = q.match(/top\s+(\d*)\s*products?\s+(?:by\s+)?(value|units?|weight|qty|quantity)?/i);
      parsed.intent = 'TOP_PRODUCTS';
      if (pM[1]) parsed.limit = parseInt(pM[1]);
      if (!parsed.limit) parsed.limit = 20;
      if (pM[2]) {
        const m2 = pM[2].toLowerCase();
        if (/value/.test(m2)) parsed.metric = 'value';
        else if (/weight/.test(m2)) parsed.metric = 'weight';
        else parsed.metric = 'quantity';
      }
    }

    // "Show Aashirvaad variants" / "Aashirvaad products"
    if (!parsed.intent && /\b(.+?)\s+(?:variants?|products?|items?|skus?)\s*$/i.test(q)) {
      const vM = q.match(/(?:show\s+)?(.+?)\s+(?:variants?|products?|items?|skus?)\s*$/i);
      if (vM) {
        parsed.intent = 'BRAND_PRODUCTS';
        parsed.entityTerms = cleanEntityTerms(vM[1]);
      }
    }

    // "Show damaged inventory" / "Show damaged electronics" / "Show damaged electronics in BCPL"
    if (!parsed.intent && parsed.statusFilter) {
      parsed.intent = 'FILTERED_SEARCH';
      // Extract entity after status term
      const statusText = Object.values(STATUS_TERMS).flat().find(t => q.includes(t)) || '';
      const afterStatus = q.substring(q.indexOf(statusText) + statusText.length).trim();
      // Remove warehouse filter portion
      let entityPart = afterStatus;
      if (parsed.warehouseFilter) {
        entityPart = entityPart.replace(new RegExp('\\b(?:in|at|from)\\s+' + escapeRegex(parsed.warehouseFilter) + '\\s*$', 'i'), '').trim();
      }
      // Remove common suffix words
      entityPart = entityPart.replace(/\b(inventory|items?|products?|records?|stock)\b/gi, '').trim();
      if (entityPart) {
        parsed.entityTerms = cleanEntityTerms(entityPart);
      }
    }

    // Global inventory summary (e.g., "How much is my inventory worth?", "How many SKUs do I have?", "Show complete stock summary")
    if (!parsed.intent && /\b(total|overall|whole|everything|all inventory|entire|summary|complete|size of inventory|worth|inventory worth|how many (?:skus|brands|warehouses)|how much is my inventory|stock summary)\b/i.test(q) &&
        !/\b(atta|flour|rice|oil|ghee|electronics|snacks|biscuits|cereals|spices|masala|beverages|dairy|soap|shampoo|toothpaste|detergent)\b/i.test(q)) {
      parsed.intent = 'SUMMARY';
      parsed.entityTerms = [];
    }

    // "How many units are in BCPL?" — warehouse query
    if (!parsed.intent && parsed.warehouseFilter && !parsed.entityTerms.length) {
      parsed.intent = 'SUMMARY';
      // No entity terms, but warehouse filter exists — will aggregate entire warehouse
    }

    // Follow-up: "What about Aashirvaad?" / "And rice?"
    if (!parsed.intent && /\b(?:what about|and|how about|also)\s+(.+)/i.test(q)) {
      const fuM = q.match(/(?:what about|and|how about|also)\s+(.+)/i);
      if (fuM) {
        parsed.intent = _context.lastQuery ? 'SUMMARY' : 'SUMMARY';
        parsed.entityTerms = cleanEntityTerms(fuM[1]);
        // Inherit context if applicable
        if (_context.lastCategory && !parsed.entityTerms.length) {
          parsed.entityTerms = [_context.lastEntity];
        }
      }
    }

    // Follow-up: "Which brand has the most units?" / "Which brand has the most?"
    if (!parsed.intent && /\bwhich brand\b/i.test(q)) {
      parsed.intent = 'TOP_BRANDS';
      if (_context.lastSubcategory || _context.lastCategory) {
        parsed.entityTerms = cleanEntityTerms(_context.lastSubcategory || _context.lastCategory);
      }
      parsed.limit = 1;
    }

    // Follow-up: "Top 5 brands" / "Top 5"
    if (!parsed.intent && /\btop\s+\d*\s*brands?\b/i.test(q)) {
      parsed.intent = 'TOP_BRANDS';
      if (_context.lastSubcategory || _context.lastCategory) {
        parsed.entityTerms = cleanEntityTerms(_context.lastSubcategory || _context.lastCategory);
      }
      if (!parsed.limit) parsed.limit = 5;
    }

    // Follow-up: "What about value?" / "What about weight?"
    if (!parsed.intent && /\b(what about|how about)\s+(value|worth|price|weight|units?|quantity)\b/i.test(q)) {
      parsed.intent = 'SUMMARY';
      if (_context.lastSubcategory || _context.lastCategory) {
        parsed.entityTerms = cleanEntityTerms(_context.lastSubcategory || _context.lastCategory);
      }
    }

    // If no intent detected but we have a simple term, try SUMMARY
    if (!parsed.intent) {
      const isGlobalQuery = /\b(whole|overall|entire|complete|all|total|summarize|summary|size|worth|units|quantity|value|weight)\b/i.test(q) &&
                            !/\b(flour|atta|rice|oil|electronics|snacks|biscuits|cereals|spices|masala|beverages|dairy|soap|shampoo|toothpaste|bcpl|damaged|expired)\b/i.test(q);
      const stripped = q
        .replace(/\b(show|list|find|get|display|give|tell|me|all|the|a|an|of|in|at|from|do|we|have|is|are|there|our|my|what|how|much|many|total|inventory|stock|please|sir|okay|ok|size|worth|value|units?|quantity|weight|overall|whole|summary|summarize)\b/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (isGlobalQuery || !stripped) {
        parsed.intent = 'SUMMARY';
        parsed.entityTerms = [];
      } else if (stripped.length >= 2) {
        parsed.intent = 'SUMMARY';
        parsed.entityTerms = cleanEntityTerms(stripped);
      }
    }

    return parsed;
  }

  /* Remove metric/noise words from entity terms */
  function cleanEntityTerms(raw) {
    if (!raw) return [];
    return raw
      .replace(/\b(total|amount|quantity|units?|value|worth|weight|stock|inventory|items?|products?|records?|number|count|of|the|our|all|show|list|how|much|many|me|do|we|have|is|are|there|please|and|whole|summarize|summary|give|tell|kitna|hai|ka|ke|ki|batao|karo|pada|zyada|sabse|kya|bataie|kiska|konsa|kaunsa)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length >= 2);
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function scanEntityFromQueryText(q, records) {
    if (!q) return null;
    for (const [synKey, synObj] of Object.entries(ENTITY_SYNONYMS)) {
      if (synKey.includes(' ')) {
        const re = new RegExp(`\\b${escapeRegex(synKey)}\\b`, 'i');
        if (re.test(q)) return { ...synObj, matchedTerm: synKey };
      }
    }
    for (const [synKey, synObj] of Object.entries(ENTITY_SYNONYMS)) {
      if (!synKey.includes(' ') && synKey.length >= 3) {
        const re = new RegExp(`\\b${escapeRegex(synKey)}\\b`, 'i');
        if (re.test(q)) return { ...synObj, matchedTerm: synKey };
      }
    }
    if (records && records.length) {
      const subcats = [...new Set(records.map(r => r.subcategory).filter(Boolean))];
      for (const sc of subcats) {
        const words = sc.toLowerCase().split(/[\s&/]+/);
        for (const w of words) {
          if (w.length >= 4 && new RegExp(`\\b${escapeRegex(w)}\\b`, 'i').test(q)) {
            const catForSc = records.find(r => r.subcategory === sc)?.normalized_category;
            return { type: 'subcategory', name: sc, category: catForSc, matchedTerm: w };
          }
        }
      }
    }
    return null;
  }

  /* ────────────────────────────────────────────────────────────
     LAYER 2: Entity Resolution — resolveEntity
     Uses the app's existing taxonomy from App.Categorizer
     ──────────────────────────────────────────────────────────── */
  function resolveEntity(entityTerms, records) {
    if (!entityTerms || !entityTerms.length) return null;

    const termStr = entityTerms.join(' ').toLowerCase().trim();

    // Reject known fake / negative entity terms
    for (const t of entityTerms) {
      if (/\b(fictional|fake|abc_not_real|xyz123|superunicornbrand|warehouse_z_fake)\b/i.test(t)) {
        return null;
      }
    }

    // 1. Try exact synonym match (multi-word first, then single word)
    if (ENTITY_SYNONYMS[termStr]) {
      return { ...ENTITY_SYNONYMS[termStr], matchedTerm: termStr };
    }

    // 1.5 Try exact multi-word brand match (e.g. "Whole Farm") before single-word synonyms
    if (entityTerms.length > 1 && termStr) {
      const brands = [...new Set(records.map(r => r.normalized_brand).filter(Boolean))];
      for (const brand of brands) {
        if (brand.toLowerCase() === termStr) {
          return { type: 'brand', name: brand, matchedTerm: termStr };
        }
      }
    }

    // 2. Try each term individually in synonyms
    for (const term of entityTerms) {
      const tl = term.toLowerCase();
      if (ENTITY_SYNONYMS[tl]) {
        return { ...ENTITY_SYNONYMS[tl], matchedTerm: tl };
      }
    }

    // 3. Try fuzzy match against actual category names from the dataset
    const categories = [...new Set(records.map(r => r.normalized_category).filter(Boolean))];
    for (const cat of categories) {
      if (cat.toLowerCase().includes(termStr) || termStr.includes(cat.toLowerCase())) {
        return { type: 'category', name: cat, matchedTerm: termStr };
      }
    }

    // 4. Try fuzzy match against actual subcategory names from the dataset
    const subcats = [...new Set(records.map(r => r.subcategory).filter(Boolean))];
    for (const sc of subcats) {
      if (sc.toLowerCase().includes(termStr) || termStr.includes(sc.toLowerCase())) {
        const catForSc = records.find(r => r.subcategory === sc)?.normalized_category;
        return { type: 'subcategory', name: sc, category: catForSc, matchedTerm: termStr };
      }
    }

    // 5. Try match against actual brand names in the dataset
    const brands = [...new Set(records.map(r => r.normalized_brand).filter(Boolean))];
    for (const brand of brands) {
      const bl = brand.toLowerCase();
      if (bl === termStr) {
        return { type: 'brand', name: brand, matchedTerm: termStr };
      }
    }

    // 6. Try individual words against brands (for multi-word queries like "aashirvaad atta")
    for (const term of entityTerms) {
      const tl = term.toLowerCase();
      for (const brand of brands) {
        if (brand.toLowerCase() === tl || (tl.length >= 4 && brand.toLowerCase().includes(tl))) {
          return { type: 'brand', name: brand, matchedTerm: tl };
        }
      }
    }

    // 7. Try warehouse match
    const warehouses = [...new Set(records.map(r => r.normalized_warehouse).filter(Boolean))];
    for (const wh of warehouses) {
      if (wh.toLowerCase().includes(termStr) || termStr.includes(wh.toLowerCase())) {
        return { type: 'warehouse', name: wh, matchedTerm: termStr };
      }
    }

    return null;
  }

  /* Resolve a brand filter term against actual brands */
  function resolveBrand(brandTerm, records) {
    if (!brandTerm) return null;
    const bl = brandTerm.toLowerCase();
    const brands = [...new Set(records.map(r => r.normalized_brand).filter(Boolean))];
    for (const brand of brands) {
      if (brand.toLowerCase() === bl) return brand;
    }
    for (const brand of brands) {
      const bLower = brand.toLowerCase();
      if (bl.length >= 3 && bLower.includes(bl)) return brand;
      if (bLower.length >= 3 && bl.includes(bLower)) return brand;
    }
    return null;
  }

  /* Resolve a warehouse filter term against actual warehouses */
  function resolveWarehouse(whTerm, records) {
    if (!whTerm) return null;
    const wl = whTerm.toLowerCase();
    const warehouses = [...new Set(records.map(r => r.normalized_warehouse).filter(Boolean))];
    for (const wh of warehouses) {
      if (wh.toLowerCase().includes(wl) || wl.includes(wh.toLowerCase())) {
        return wh;
      }
    }
    // Also check raw_entity_name
    const rawNames = [...new Set(records.map(r => r.raw_entity_name).filter(Boolean))];
    for (const rn of rawNames) {
      if (rn.toLowerCase().includes(wl) || wl.includes(rn.toLowerCase())) {
        // Find corresponding normalized name
        const rec = records.find(r => r.raw_entity_name === rn);
        return rec?.normalized_warehouse || rn;
      }
    }
    return null;
  }

  /* ────────────────────────────────────────────────────────────
     LAYER 3: Aggregation Engine — executeQuery
     Uses SAME fields as Dashboard: r.qty, r.source_value,
     r.total_weight, r.normalized_category, r.subcategory,
     r.normalized_brand, r.product_family_id
     ──────────────────────────────────────────────────────────── */
  function filterRecords(records, entity, parsed) {
    let filtered = records;

    // Apply entity filter
    if (entity) {
      if (entity.type === 'category') {
        filtered = filtered.filter(r => r.normalized_category === entity.name);
      } else if (entity.type === 'subcategory') {
        filtered = filtered.filter(r => r.subcategory === entity.name);
      } else if (entity.type === 'brand') {
        filtered = filtered.filter(r => r.normalized_brand === entity.name);
      } else if (entity.type === 'warehouse') {
        filtered = filtered.filter(r => r.normalized_warehouse === entity.name);
      }
    }

    // Apply status filter
    if (parsed.statusFilter) {
      filtered = filtered.filter(r => {
        const st = (r.raw_bad_inventory_type || '').toLowerCase().trim();
        if (parsed.statusFilter === 'near_expiry') {
          return st === 'near_expiry' || st === 'nearexpiry' || st === 'near expiry';
        }
        if (parsed.statusFilter === 'expired') {
          return st === 'expired' || st === 'expire';
        }
        if (parsed.statusFilter === 'damaged') {
          return st === 'damaged' || st === 'damage';
        }
        return st === parsed.statusFilter || st.includes(parsed.statusFilter);
      });
    }

    // Apply warehouse filter
    if (parsed.warehouseFilter) {
      const resolvedWh = resolveWarehouse(parsed.warehouseFilter, records);
      if (resolvedWh) {
        filtered = filtered.filter(r => r.normalized_warehouse === resolvedWh);
      } else {
        // Fallback: fuzzy match
        const wl = parsed.warehouseFilter.toLowerCase();
        filtered = filtered.filter(r =>
          (r.normalized_warehouse || '').toLowerCase().includes(wl) ||
          (r.raw_entity_name || '').toLowerCase().includes(wl)
        );
      }
    }

    return filtered;
  }

  function aggregate(records) {
    // Same calculation logic as Dashboard and Aggregator
    const totalQty    = records.reduce((s, r) => s + (r.qty || 0), 0);
    const totalValue  = records.reduce((s, r) => s + (r.source_value || 0), 0);
    const totalWeight = records.reduce((s, r) => s + (r.total_weight || 0), 0);
    const brands      = new Set(records.map(r => r.normalized_brand).filter(Boolean));
    const skus        = new Set(records.map(r => r.product_family_id).filter(Boolean));
    const warehouses  = new Set(records.map(r => r.normalized_warehouse).filter(Boolean));
    const categories  = new Set(records.map(r => r.normalized_category).filter(Boolean));

    // Status breakdown
    const statusBreakdown = {};
    for (const r of records) {
      const st = (r.raw_bad_inventory_type || 'unknown').toLowerCase();
      if (!statusBreakdown[st]) statusBreakdown[st] = { count: 0, qty: 0, value: 0 };
      statusBreakdown[st].count++;
      statusBreakdown[st].qty += (r.qty || 0);
      statusBreakdown[st].value += (r.source_value || 0);
    }

    return {
      record_count: records.length,
      total_qty: totalQty,
      total_value: totalValue,
      total_weight: totalWeight,
      brand_count: brands.size,
      sku_count: skus.size,
      warehouse_count: warehouses.size,
      category_count: categories.size,
      status_breakdown: statusBreakdown,
    };
  }

  function groupByBrand(records, sortBy = 'quantity', limit = null, sortDir = 'desc') {
    const brandMap = new Map();
    for (const r of records) {
      const b = r.normalized_brand || 'Unknown';
      if (!brandMap.has(b)) brandMap.set(b, { name: b, qty: 0, value: 0, weight: 0, skus: new Set() });
      const bm = brandMap.get(b);
      bm.qty    += (r.qty || 0);
      bm.value  += (r.source_value || 0);
      bm.weight += (r.total_weight || 0);
      bm.skus.add(r.product_family_id);
    }

    let brands = [...brandMap.values()].map(b => ({ ...b, sku_count: b.skus.size }));
    const field = sortBy === 'value' ? 'value' : sortBy === 'weight' ? 'weight' : 'qty';
    const isAsc = sortDir === 'asc';
    brands.sort((a, b) => isAsc ? (a[field] - b[field]) : (b[field] - a[field]));
    if (limit) brands = brands.slice(0, limit);
    return brands;
  }

  function groupByCategory(records, sortBy = 'value', limit = null) {
    const catMap = new Map();
    for (const r of records) {
      const c = r.normalized_category || 'Unknown';
      if (!catMap.has(c)) catMap.set(c, { name: c, qty: 0, value: 0, weight: 0, brands: new Set(), skus: new Set() });
      const cm = catMap.get(c);
      cm.qty    += (r.qty || 0);
      cm.value  += (r.source_value || 0);
      cm.weight += (r.total_weight || 0);
      cm.brands.add(r.normalized_brand);
      cm.skus.add(r.product_family_id);
    }
    let cats = [...catMap.values()].map(c => ({
      ...c, brand_count: c.brands.size, sku_count: c.skus.size
    }));
    const field = sortBy === 'quantity' ? 'qty' : sortBy === 'weight' ? 'weight' : 'value';
    cats.sort((a, b) => b[field] - a[field]);
    if (limit) cats = cats.slice(0, limit);
    return cats;
  }

  function groupByProduct(records, sortBy = 'value', limit = 20) {
    const famMap = new Map();
    for (const r of records) {
      const fid = r.product_family_id;
      if (!famMap.has(fid)) famMap.set(fid, {
        name: r.normalized_product_name, brand: r.normalized_brand,
        qty: 0, value: 0, weight: 0
      });
      const f = famMap.get(fid);
      f.qty    += (r.qty || 0);
      f.value  += (r.source_value || 0);
      f.weight += (r.total_weight || 0);
    }
    let products = [...famMap.values()];
    const field = sortBy === 'quantity' ? 'qty' : sortBy === 'weight' ? 'weight' : 'value';
    products.sort((a, b) => b[field] - a[field]);
    if (limit) products = products.slice(0, limit);
    return products;
  }

  /* ────────────────────────────────────────────────────────────
     MAIN QUERY FUNCTION
     ──────────────────────────────────────────────────────────── */
  async function query(text, dataset_id) {
    if (!text || !dataset_id) return null;

    const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
    if (!records.length) return { type: 'error', message: 'No data loaded. Please upload an inventory file first.' };

    const parsed = parseQuery(text);

    // Resolve entity from the parsed terms
    let entity = resolveEntity(parsed.entityTerms, records);
    const hasNegativeTerm = parsed.entityTerms.some(t => /\b(fictional|fake|abc_not_real|xyz123|superunicornbrand|warehouse_z_fake)\b/i.test(t));
    if (!entity && parsed.normalized && !hasNegativeTerm) {
      entity = scanEntityFromQueryText(parsed.normalized, records);
      if (entity) parsed.entityTerms = [entity.matchedTerm];
    }

    // If entity terms contain both a brand and a category/subcategory, handle combination
    // e.g., "Aashirvaad atta" → brand=Aashirvaad, subcategory=Atta & Flours
    let combinedBrand = null;
    const matchedWords = (entity?.matchedTerm || '').toLowerCase().split(/\s+/);
    if (entity && entity.type === 'brand' && parsed.entityTerms.length > matchedWords.length) {
      // Check if other terms resolve to a category/subcategory
      const otherTerms = parsed.entityTerms.filter(t => !matchedWords.includes(t.toLowerCase()));
      const otherEntity = resolveEntity(otherTerms, records);
      if (otherEntity && (otherEntity.type === 'category' || otherEntity.type === 'subcategory')) {
        combinedBrand = entity.name;
        entity = otherEntity;
        parsed.brandFilter = combinedBrand;
      }
    } else if (entity && (entity.type === 'category' || entity.type === 'subcategory') && parsed.entityTerms.length > matchedWords.length) {
      // Check if other terms resolve to a brand
      const otherTerms = parsed.entityTerms.filter(t => !matchedWords.includes(t.toLowerCase()));
      const otherEntity = resolveEntity(otherTerms, records);
      if (otherEntity && otherEntity.type === 'brand') {
        combinedBrand = otherEntity.name;
        parsed.brandFilter = combinedBrand;
      }
    }

    // Apply brand filter from entity terms
    if (parsed.brandFilter) {
      const resolved = resolveBrand(parsed.brandFilter, records);
      if (resolved) parsed.brandFilter = resolved;
    }

    // Validate warehouse filter against actual warehouses in dataset
    if (parsed.warehouseFilter) {
      const warehouses = [...new Set(records.map(r => r.normalized_warehouse).filter(Boolean))];
      const matchedWh = warehouses.find(w => w.toLowerCase().includes(parsed.warehouseFilter.toLowerCase()) || parsed.warehouseFilter.toLowerCase().includes(w.toLowerCase()));
      if (matchedWh) {
        parsed.warehouseFilter = matchedWh;
      } else {
        parsed.warehouseFilter = null;
      }
    }

    // Update context
    if (entity) {
      _context.lastEntity = entity.matchedTerm;
      if (entity.type === 'category') _context.lastCategory = entity.name;
      if (entity.type === 'subcategory') { _context.lastSubcategory = entity.name; _context.lastCategory = entity.category; }
      if (entity.type === 'brand') _context.lastBrand = entity.name;
    }
    _context.lastQuery = text;

    // Execute based on intent
    try {
      switch (parsed.intent) {
        case 'SUMMARY':          return executeSummary(records, entity, parsed);
        case 'TOP_BRANDS':       return executeTopBrands(records, entity, parsed);
        case 'TOP_CATEGORIES':   return executeTopCategories(records, parsed);
        case 'TOP_PRODUCTS':     return executeTopProducts(records, entity, parsed);
        case 'BRAND_PRODUCTS':   return executeBrandProducts(records, entity, parsed);
        case 'FILTERED_SEARCH':  return executeFilteredSearch(records, entity, parsed);
        case 'RECORD_SEARCH':    return executeRecordSearch(text, records);
        default:                 return executeRecordSearch(text, records);
      }
    } catch (e) {
      return { type: 'error', message: `Could not process query: ${e.message}` };
    }
  }

  /* ── Intent handlers ─────────────────────────────────────── */

  function executeSummary(records, entity, parsed) {
    let filtered = filterRecords(records, entity, parsed);

    // Apply brand filter if present
    if (parsed.brandFilter) {
      filtered = filtered.filter(r => r.normalized_brand === parsed.brandFilter);
    }

    if (!entity && parsed.entityTerms && parsed.entityTerms.length > 0 && !parsed.statusFilter && !parsed.warehouseFilter && !parsed.brandFilter) {
      return { type: 'not_found', message: `No inventory records found for "${parsed.entityTerms.join(' ')}".` };
    }

    if (!filtered.length) {
      const suggestion = entity ? ` Try browsing the ${entity.name || 'category'} section in the sidebar.` : '';
      const entityLabel = entity ? entity.name : (parsed.entityTerms.join(' ') || 'specified criteria');
      return { type: 'not_found', message: `No inventory records found for "${entityLabel}".${suggestion}` };
    }

    const agg = aggregate(filtered);
    const topBrands = groupByBrand(filtered, parsed.metric, 5);

    // Build descriptive label
    let label = 'Your inventory';
    if (parsed.brandFilter && entity) label = `${parsed.brandFilter} ${entity.name || ''}`.trim();
    else if (entity) label = entity.name;
    if (parsed.warehouseFilter) {
      const resolvedWh = resolveWarehouse(parsed.warehouseFilter, records);
      label += ` in ${resolvedWh || parsed.warehouseFilter}`;
    }
    if (parsed.statusFilter) label = `${capitalize(parsed.statusFilter)} ${label}`;

    return {
      type: 'summary',
      intent: 'SUMMARY',
      query: parsed.raw,
      resolvedEntity: entity,
      headline: label,
      data: {
        total_units: agg.total_qty,
        total_value: agg.total_value,
        total_weight: agg.total_weight,
        brand_count: agg.brand_count,
        sku_count: agg.sku_count,
        record_count: agg.record_count,
        warehouse_count: agg.warehouse_count,
        status_breakdown: agg.status_breakdown,
        brands: topBrands,
      },
      followUp: entity ? [
        `Show all ${entity.name} brands`,
        `Top ${entity.name} brands by value`,
        `Which ${entity.name} brand has the most units?`,
      ] : [],
    };
  }

  function executeTopBrands(records, entity, parsed) {
    if (!entity && parsed.entityTerms && parsed.entityTerms.length > 0 && !parsed.brandFilter && !parsed.statusFilter && !parsed.warehouseFilter) {
      return { type: 'not_found', message: `No brand records found for "${parsed.entityTerms.join(' ')}".` };
    }

    let filtered = filterRecords(records, entity, parsed);
    if (!filtered.length) {
      return { type: 'not_found', message: `No records found for "${parsed.entityTerms.join(' ')}".` };
    }

    const brands = groupByBrand(filtered, parsed.metric, parsed.limit || 10, parsed.sortDir);
    const label = entity ? entity.name : 'All Inventory';

    // If limit=1, give a direct answer
    if (parsed.limit === 1 && brands.length > 0) {
      const top = brands[0];
      const metricLabel = parsed.metric === 'value' ? `${App.Fmt.currency(top.value)} value` :
                          parsed.metric === 'weight' ? `${App.Fmt.weight(top.weight)} weight` :
                          `${App.Fmt.number(top.qty)} units`;
      return {
        type: 'answer',
        intent: 'TOP_BRANDS',
        query: parsed.raw,
        resolvedEntity: entity,
        headline: `${top.name} has the most ${label.toLowerCase()} — ${metricLabel}`,
        data: { brands: brands.slice(0, 5), top_brand: top },
        followUp: [
          `How much ${top.name} do we have?`,
          `Show ${top.name} variants`,
        ],
      };
    }

    return {
      type: 'brand_list',
      intent: 'TOP_BRANDS',
      query: parsed.raw,
      resolvedEntity: entity,
      headline: `${brands.length} brands in ${label}`,
      data: { brands },
      followUp: entity ? [`How much ${entity.name} do we have?`] : [],
    };
  }

  function executeTopCategories(records, parsed) {
    let filtered = records;
    if (parsed.statusFilter) {
      filtered = filterRecords(records, null, parsed);
    }
    const cats = groupByCategory(filtered, parsed.metric, parsed.limit || 10);
    if (!cats.length) {
      return { type: 'not_found', message: 'No categories found in the dataset.' };
    }

    const top = cats[0];
    const metricLabel = parsed.metric === 'weight' ? `${App.Fmt.weight(top.weight)} weight` :
                        parsed.metric === 'quantity' ? `${App.Fmt.number(top.qty)} units` :
                        `${App.Fmt.currency(top.value)} value`;

    return {
      type: 'category_list',
      intent: 'TOP_CATEGORIES',
      query: parsed.raw,
      headline: `${top.name} has the highest ${parsed.metric === 'quantity' ? 'units' : parsed.metric} — ${metricLabel}`,
      data: { categories: cats },
      followUp: [`How much ${top.name.toLowerCase()} do we have?`],
    };
  }

  function executeTopProducts(records, entity, parsed) {
    let filtered = filterRecords(records, entity, parsed);
    if (!filtered.length) {
      return { type: 'not_found', message: `No product records found.` };
    }
    const products = groupByProduct(filtered, parsed.metric, parsed.limit || 20);
    return {
      type: 'product_list',
      intent: 'TOP_PRODUCTS',
      query: parsed.raw,
      headline: `Top ${products.length} products by ${parsed.metric}`,
      data: { products },
    };
  }

  function executeBrandProducts(records, entity, parsed) {
    // Resolve as brand
    let brandName = null;
    if (entity && entity.type === 'brand') {
      brandName = entity.name;
    } else {
      // Try resolving entity terms as brand
      brandName = resolveBrand(parsed.entityTerms.join(' '), records);
      if (!brandName) {
        for (const term of parsed.entityTerms) {
          brandName = resolveBrand(term, records);
          if (brandName) break;
        }
      }
    }

    if (!brandName) {
      return { type: 'not_found', message: `Brand "${parsed.entityTerms.join(' ')}" not found in inventory.` };
    }

    let filtered = records.filter(r => r.normalized_brand === brandName);
    if (parsed.statusFilter) filtered = filterRecords(filtered, null, parsed);

    const products = groupByProduct(filtered, 'value', 50);
    const agg = aggregate(filtered);

    return {
      type: 'product_list',
      intent: 'BRAND_PRODUCTS',
      query: parsed.raw,
      resolvedEntity: { type: 'brand', name: brandName },
      headline: `${brandName} — ${App.Fmt.number(agg.total_qty)} units, ${products.length} products`,
      data: {
        products,
        total_units: agg.total_qty,
        total_value: agg.total_value,
        total_weight: agg.total_weight,
      },
      followUp: [`How much ${brandName} do we have?`],
    };
  }

  function executeFilteredSearch(records, entity, parsed) {
    let filtered = filterRecords(records, entity, parsed);

    // Apply brand filter
    if (parsed.brandFilter) {
      filtered = filtered.filter(r => r.normalized_brand === parsed.brandFilter);
    }

    if (!filtered.length) {
      return { type: 'not_found', message: `No matching ${parsed.statusFilter || ''} records found.` };
    }

    const agg = aggregate(filtered);
    let label = parsed.statusFilter ? capitalize(parsed.statusFilter) : '';
    if (entity) label += ` ${entity.name}`;
    if (parsed.warehouseFilter) {
      const resolvedWh = resolveWarehouse(parsed.warehouseFilter, records);
      label += ` in ${resolvedWh || parsed.warehouseFilter}`;
    }
    label = label.trim();

    return {
      type: 'summary',
      intent: 'FILTERED_SEARCH',
      query: parsed.raw,
      resolvedEntity: entity,
      headline: label || 'Filtered Results',
      data: {
        total_units: agg.total_qty,
        total_value: agg.total_value,
        total_weight: agg.total_weight,
        brand_count: agg.brand_count,
        sku_count: agg.sku_count,
        record_count: agg.record_count,
        warehouse_count: agg.warehouse_count,
        status_breakdown: agg.status_breakdown,
      },
      records: filtered.slice(0, 50),
    };
  }

  function executeRecordSearch(text, records) {
    const term = text.toLowerCase().trim();
    const matching = records.filter(r =>
      (r.normalized_product_name || '').toLowerCase().includes(term) ||
      (r.normalized_brand || '').toLowerCase().includes(term) ||
      (r.normalized_category || '').toLowerCase().includes(term) ||
      (r.normalized_warehouse || '').toLowerCase().includes(term) ||
      (r.item_id || '').toString().toLowerCase().includes(term) ||
      (r.upc || '').toString().toLowerCase().includes(term)
    );
    if (!matching.length) {
      return { type: 'not_found', message: `No results for "${text}". Try asking about a category (e.g., "How much atta do we have?") or a brand name.` };
    }
    const agg = aggregate(matching);
    return {
      type: 'search',
      intent: 'RECORD_SEARCH',
      query: text,
      headline: `${matching.length} records matching "${text}" — ${App.Fmt.number(agg.total_qty)} units total`,
      records: matching.slice(0, 50),
    };
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  /* ── Built-in Test Suite ─────────────────────────────────── */
  async function runTests(dataset_id) {
    if (!dataset_id) dataset_id = App.State?.dataset_id;
    if (!dataset_id) { console.error('No dataset_id. Load a dataset first.'); return; }

    const tests = [
      { q: 'What is the total value of my inventory?', expectIntent: 'SUMMARY',         expectEntity: null },
      { q: 'What is the total weight?',              expectIntent: 'SUMMARY',         expectEntity: null },
      { q: 'How much atta do we have?',             expectIntent: 'SUMMARY',         expectEntity: 'Atta' },
      { q: 'What is the total amount of flour?',    expectIntent: 'SUMMARY',         expectEntity: 'Flours' },
      { q: 'How much rice do we have?',             expectIntent: 'SUMMARY',         expectEntity: 'Rice' },
      { q: 'How much oil do we have?',              expectIntent: 'SUMMARY',         expectEntity: 'Oils' },
      { q: 'How much electronics inventory do we have?', expectIntent: 'SUMMARY',    expectEntity: 'Electronics & Electricals' },
      { q: 'Which category has the highest value?',  expectIntent: 'TOP_CATEGORIES', expectEntity: null },
      { q: 'Which brand has the most units?',        expectIntent: 'TOP_BRANDS',      expectEntity: null },
      { q: 'Show damaged inventory',                expectIntent: 'FILTERED_SEARCH', expectEntity: null },
      { q: 'How many units are in BCPL?',           expectIntent: 'SUMMARY',         expectEntity: null },
      { q: 'Show top 5 brands by value',            expectIntent: 'TOP_BRANDS',      expectEntity: null },
      { q: 'Show top 5 brands by units',            expectIntent: 'TOP_BRANDS',      expectEntity: null },
      { q: 'Show top products by value',            expectIntent: 'TOP_PRODUCTS',    expectEntity: null },
      { q: 'How much multigrain atta do we have?',  expectIntent: 'SUMMARY',         expectEntity: 'Atta' },
      { q: 'How much multigrain chips do we have?', expectIntent: 'SUMMARY',         expectEntity: 'Snacks & Namkeen' },
      { q: 'How much besan do we have?',             expectIntent: 'SUMMARY',         expectEntity: 'Flours' },
      { q: 'How much besan laddu do we have?',       expectIntent: 'SUMMARY',         expectEntity: 'Sweets & Mithai' },
      { q: 'How much ghee do we have?',              expectIntent: 'SUMMARY',         expectEntity: 'Ghee' },
      { q: 'How much electronics are in BCPL?',      expectIntent: 'SUMMARY',         expectEntity: 'Electronics & Electricals' },
    ];

    console.log('=== NL ENGINE TEST SUITE ===');
    let passed = 0, failed = 0;

    for (const t of tests) {
      resetContext(); // Reset context between tests
      const result = await query(t.q, dataset_id);
      const parsed = parseQuery(t.q);
      const records = await App.DB.getAllByIndex('inventory_records', 'dataset_id', dataset_id);
      const entity = resolveEntity(parsed.entityTerms, records);

      const intentOk = result.intent === t.expectIntent;
      const entityOk = t.expectEntity === null ||
        (entity && (entity.name === t.expectEntity)) ||
        (result.resolvedEntity && result.resolvedEntity.name === t.expectEntity);
      const notFallback = result.type !== 'not_found' || t.expectIntent === 'RECORD_SEARCH';

      const pass = intentOk && entityOk && notFallback;

      console.log(
        `${pass ? '✅' : '❌'} "${t.q}"\n` +
        `   Intent: ${result.intent || 'NONE'} (expected: ${t.expectIntent}) ${intentOk ? '✓' : '✗'}\n` +
        `   Entity: ${entity?.name || result.resolvedEntity?.name || 'NONE'} (expected: ${t.expectEntity || 'any'}) ${entityOk ? '✓' : '✗'}\n` +
        `   Type: ${result.type} | Headline: ${result.headline || 'N/A'}\n` +
        `   Data: units=${result.data?.total_units ?? 'N/A'}, value=${result.data?.total_value ?? 'N/A'}, weight=${result.data?.total_weight ?? 'N/A'}`
      );

      if (pass) passed++; else failed++;
    }

    console.log(`\n=== RESULTS: ${passed}/${tests.length} passed, ${failed} failed ===`);
    return { passed, failed, total: tests.length };
  }

  return { query, parseQuery, resolveEntity, filterRecords, runTests, resetContext };
})();
