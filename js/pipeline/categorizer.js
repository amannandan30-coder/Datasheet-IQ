window.App = window.App || {};

/* ============================================================
   CATEGORIZER — Category + Subcategory classification
   ============================================================ */
App.Categorizer = (() => {

  /* ── Category → Subcategory → keyword rules ──────────────── */
  const CATEGORY_RULES = {
    'Grocery': {
      icon: '🛒',
      color: '#f59e0b',
      subcategories: {
        'General Staples':     { kw: ['staple','grocery','food'] },
        'Atta & Flours':       { kw: ['\\batta\\b','\\bflour\\b','\\bflours\\b','\\bmaida\\b','\\bbesan\\b','\\bsuji\\b','\\brava\\b','\\bchakki\\b','multigrain atta','multigrain flour'] },
        'Rice':                { kw: ['\\brice\\b','\\bbasmati\\b','\\bsella\\b','\\bmogra\\b','\\bpoha\\b'] },
        'Pulses & Lentils':    { kw: ['\\bdal\\b','\\bdaal\\b','\\bmoong\\b','\\bmasoor\\b','\\burad\\b','\\bchana\\b','\\brajma\\b','\\barhar\\b','\\btoor\\b','\\blentil\\b','\\bpulses\\b'] },
        'Oils & Ghee':         { kw: ['\\boil\\b','\\boils\\b','\\bghee\\b','\\bdalda\\b','sunflower','mustard','olive','refined'] },
        'Sugar & Salt':        { kw: ['\\bsugar\\b','\\bsalt\\b','\\bjaggery\\b','\\bnamak\\b','\\bcheeni\\b','\\bshakkar\\b'] },
        'Spices & Masalas':    { kw: ['\\bmasala\\b','\\bmasalas\\b','\\bspice\\b','\\bspices\\b','chilli','turmeric','cumin','coriander','garam masala','pepper','haldi','jeera'] },
        'Tea & Coffee':        { kw: ['\\btea\\b','\\bcoffee\\b','\\bchai\\b','green tea','tata tea','brooke bond','bru','nescafe'] },
        'Snacks & Biscuits':   { kw: ['biscuit','biscuits','cookie','cookies','snack','chips','namkeen','cracker','rusk','wafer','popcorn','munchies'] },
        'Breakfast Cereals':   { kw: ['oats','cornflakes','muesli','cereal','quaker','kellogg','upma','daliya','dalia'] },
        'Noodles & Pasta':     { kw: ['noodle','noodles','pasta','maggi','macaroni','spaghetti','vermicelli'] },
        'Sauces & Condiments': { kw: ['sauce','ketchup','pickle','chutney','jam','jelly','vinegar','mayonnaise','spread'] },
        'Beverages':           { kw: ['juice','drink','squash','syrup','sharbat','cold drink','energy drink','nimbu','cola'] },
        'Dairy Products':      { kw: ['milk','curd','paneer','butter','cheese','yogurt','lassi','khoa','cream'] },
        'Chocolates & Sweets': { kw: ['chocolate','candy','toffee','sweet','mithai','barfi','halwa','gum','laddu','ladoo','laddoo','burfi'] },
      }
    },
    'Cleaning Essentials': {
      icon: '🧹',
      color: '#10b981',
      subcategories: {
        'Detergents & Laundry':{ kw: ['detergent','washing powder','laundry','surf','tide','ariel','rin','fena','ghadi','vim bar','washing liquid','fabric'] },
        'Dishwash':            { kw: ['dishwash','dish wash','dish soap','utensil','vim','pril','exo','bar','liquid dish'] },
        'Toilet Cleaners':     { kw: ['toilet','bathroom','harpic','lizol','loo','commode','acid'] },
        'Air Fresheners':      { kw: ['air freshener','freshener','odonil','febreze','glade','room spray','fragrance'] },
        'Floor Cleaners':      { kw: ['floor','mop','phenyl','lizol','dettol floor','cleaner'] },
        'Personal Hygiene':    { kw: ['soap','handwash','sanitizer','antiseptic','dettol','lifebuoy','lux','dove','body wash'] },
        'Repellents':          { kw: ['mosquito','repellent','coil','mat','liquid repellent','allout','goodknight','hit','baygon'] },
      }
    },
    'Electronics & Electricals': {
      icon: '⚡',
      color: '#6366f1',
      subcategories: {
        'Lighting':            { kw: ['\\bbulb\\b','\\bbulbs\\b','\\bled\\b','\\bbatten\\b','spotlight','lantern','torch','lamp','cfl','tubelight'] },
        'Fans':                { kw: ['\\bfan\\b','\\bfans\\b','ceiling fan','table fan','exhaust','cooler'] },
        'Batteries':           { kw: ['\\bbattery\\b','\\bbatteries\\b','\\bcell\\b','alkaline','aa','aaa','eveready','duracell'] },
        'Mobile Accessories':  { kw: ['charger','cable','earphone','headphone','power bank','usb','lightning','type-c','adapter','case','cover','screen guard','tempered','zebronics'] },
        'Computer Accessories':{ kw: ['keyboard','mouse','pen drive','usb drive','flash drive','hub','laptop','monitor','webcam','speaker'] },
        'Personal Electronics':{ kw: ['trimmer','shaver','iron','hair dryer','grooming','electric','lifelong'] },
        'Electrical Accessories':{ kw: ['switch','socket','plug','extension','wire','cable','board','mcb','fuse','holder','havells'] },
        'Home Appliances':     { kw: ['mixer','grinder','juicer','blender','kettle','toaster','oven','microwave','refrigerator','washing','ac','television','tv'] },
      }
    },
    'Home Care': {
      icon: '🏠',
      color: '#38bdf8',
      subcategories: {
        'Plastic Containers':  { kw: ['container','box','tub','jar','storage','tupperware','milton','cello'] },
        'Kitchen Accessories': { kw: ['plate','bowl','glass','cup','tray','spatula','ladle','pan','pressure cooker','kadai'] },
        'Bedding & Linen':     { kw: ['bedsheet','pillow','blanket','towel','quilt','mattress'] },
        'Decor':               { kw: ['frame','vase','candle','lamp shade','decor','ornament','figurine'] },
      }
    },
    'Toys & Games': {
      icon: '🧸',
      color: '#a78bfa',
      subcategories: {
        'Board Games':         { kw: ['board game','chess','ludo','carrom','monopoly','puzzle','jenga'] },
        'Soft Toys':           { kw: ['soft toy','stuffed','teddy','plush','doll'] },
        'Action Figures':      { kw: ['action figure','robot','car','truck','vehicle','superhero'] },
        'Educational':         { kw: ['educational','learning','alphabet','number','abacus','drawing'] },
        'Outdoor Toys':        { kw: ['cricket','badminton','football','frisbee','kite','skipping'] },
      }
    },
    'Personal Care': {
      icon: '💄',
      color: '#fb923c',
      subcategories: {
        'Skin Care':           { kw: ['moisturizer','cream','lotion','sunscreen','face wash','cleanser','toner','serum'] },
        'Hair Care':           { kw: ['shampoo','conditioner','hair oil','hair mask','serum','headandshoulders','pantene','dove shampoo'] },
        'Oral Care':           { kw: ['toothpaste','toothbrush','mouthwash','floss','colgate','closeup','pepsodent','oral-b'] },
        'Deodorants':          { kw: ['deodorant','deo','perfume','body spray','axe','dove deo','rexona'] },
        'Feminine Hygiene':    { kw: ['sanitary','pad','tampon','whisper','stayfree','sofy'] },
        'Baby Care':           { kw: ['baby','diaper','nappy','johnsons','pampers','huggies','baby wipe'] },
      }
    },
    'Stationery & Office': {
      icon: '📝',
      color: '#34d399',
      subcategories: {
        'Writing':             { kw: ['pen','pencil','marker','highlighter','gel pen','ballpoint'] },
        'Paper Products':      { kw: ['notebook','register','paper','notepad','diary','file','folder'] },
        'Craft':               { kw: ['glue','tape','scissor','craft','coloring','crayon','paint'] },
      }
    },
    'Food & Beverages': {
      icon: '🍽️',
      color: '#f59e0b',
      subcategories: {
        'Packaged Foods':      { kw: ['packaged','ready to eat','instant','frozen','canned'] },
        'Beverages':           { kw: ['water','soft drink','cola','juice','energy','sports drink'] },
      }
    },
  };

  /* Direct mapping for raw source l0 categories */
  const RAW_CATEGORY_MAP = {
    'atta, rice & dal':         { category: 'Grocery', subcategory: null },
    'dry fruits, masala & oil': { category: 'Grocery', subcategory: null },
    'bakery & biscuits':        { category: 'Grocery', subcategory: 'Snacks & Biscuits' },
    'tea, coffee & milk drinks':{ category: 'Grocery', subcategory: 'Tea & Coffee' },
    'cold drinks & juices':     { category: 'Grocery', subcategory: 'Beverages' },
    'sweet tooth':              { category: 'Grocery', subcategory: 'Chocolates & Sweets' },
    'munchies':                 { category: 'Grocery', subcategory: 'Snacks & Biscuits' },
    'dairy & breakfast':        { category: 'Grocery', subcategory: 'Dairy Products' },
    'sauces & spreads':         { category: 'Grocery', subcategory: 'Sauces & Condiments' },
    'instant & frozen food':    { category: 'Grocery', subcategory: 'Noodles & Pasta' },
    'cleaning essentials':      { category: 'Cleaning Essentials', subcategory: null },
    'electronics & electricals':{ category: 'Electronics & Electricals', subcategory: null },
    'personal care':            { category: 'Personal Care', subcategory: null },
    'beauty & cosmetics':       { category: 'Personal Care', subcategory: null },
    'baby care':                { category: 'Personal Care', subcategory: null },
    'home care':                { category: 'Home Care', subcategory: null },
    'home furnishing & decor':  { category: 'Home Care', subcategory: null },
    'kitchen & dining':         { category: 'Home Care', subcategory: null },
    'toys & games':             { category: 'Toys & Games', subcategory: null },
    'stationery needs':         { category: 'Stationery & Office', subcategory: null },
    'pet care':                 { category: 'Home Care', subcategory: null },
  };

  const DEFAULT_CATEGORY = {
    icon: '📦',
    color: '#64748b',
    subcategories: { 'General': { kw: [] } }
  };

  function normLower(s) { return (s||'').toLowerCase().trim(); }

  function matchWord(text, kw) {
    if (kw.startsWith('\\b')) {
      const re = new RegExp(kw, 'i');
      return re.test(text);
    }
    return text.toLowerCase().includes(kw.toLowerCase());
  }

  function getCategoryConfig(catName) {
    for (const [k, v] of Object.entries(CATEGORY_RULES)) {
      if (normLower(k) === normLower(catName)) return { canonical: k, ...v };
    }
    return { canonical: catName, ...DEFAULT_CATEGORY };
  }

  /* Infer category and subcategory */
  function classify(sourceCategory, productName, brand) {
    const rawCatLower  = normLower(sourceCategory);
    const prodLower    = normLower(productName);
    const combinedText = normLower(`${productName || ''} ${brand || ''}`);

    let mainCat = null;
    let subCat  = null;

    // 1. Check direct raw category mapping
    if (rawCatLower && RAW_CATEGORY_MAP[rawCatLower]) {
      mainCat = RAW_CATEGORY_MAP[rawCatLower].category;
      subCat  = RAW_CATEGORY_MAP[rawCatLower].subcategory;
    }

    // 2. Check canonical category match
    if (!mainCat && rawCatLower) {
      for (const [k] of Object.entries(CATEGORY_RULES)) {
        if (normLower(k) === rawCatLower || rawCatLower.includes(normLower(k).split(' ')[0])) {
          mainCat = k;
          break;
        }
      }
    }

    // 3. Product keyword checks (Precedence-aware signal rules)
    const isSweet = /\b(laddu|ladoo|laddoo|burfi|barfi|halwa|sweet|mithai|toffee|candy|chocolate)\b/i.test(prodLower);
    const isCereal = /\b(daliya|dalia|oats|muesli|cornflakes)\b/i.test(prodLower);
    const isSnack = /\b(chips|namkeen|munchies|popcorn|rusk|wafer|biscuit|cookie)\b/i.test(prodLower);

    const attaKeywordMatch = /\b(atta|flour|flours|chakki|maida|besan|suji|rava)\b/i.test(prodLower);
    const attaExclude = /\b(sunflower|batteries|attract|rattan|flourish|flower)\b/i.test(prodLower) ||
                        /\b(zero|no|no[\s-]added)\s+maida\b/i.test(prodLower) ||
                        isSweet || isCereal || isSnack;
    const isAtta = attaKeywordMatch && !attaExclude;

    if (isSweet) {
      mainCat = 'Grocery';
      subCat  = 'Chocolates & Sweets';
    } else if (isCereal) {
      mainCat = 'Grocery';
      subCat  = 'Breakfast Cereals';
    } else if (isSnack) {
      mainCat = 'Grocery';
      subCat  = 'Snacks & Biscuits';
    } else if (isAtta) {
      mainCat = 'Grocery';
      subCat  = 'Atta & Flours';
    } else if (/\b(basmati|rice|poha)\b/i.test(prodLower)) {
      mainCat = 'Grocery';
      subCat  = 'Rice';
    } else if (/\b(dal|daal|moong|masoor|urad|chana|rajma|arhar|toor|lentil)\b/i.test(prodLower)) {
      mainCat = 'Grocery';
      subCat  = 'Pulses & Lentils';
    } else if (/\b(bulb|bulbs|led|batten|torch|trimmer|battery|batteries|charger|extension)\b/i.test(prodLower)) {
      mainCat = 'Electronics & Electricals';
    } else if (/\b(detergent|surf|tide|ariel|rin|harpic|lizol|dettol|dishwash)\b/i.test(prodLower)) {
      mainCat = 'Cleaning Essentials';
    }

    // Fallback main category
    if (!mainCat) {
      mainCat = sourceCategory && sourceCategory !== 'Uncategorized' ? sourceCategory : 'Grocery';
    }

    // Classify subcategory if not set
    const catCfg = getCategoryConfig(mainCat);
    if (!subCat || !catCfg.subcategories[subCat]) {
      let bestMatch = null;
      let bestScore = 0;
      for (const [sc, { kw }] of Object.entries(catCfg.subcategories)) {
        if (sc === 'Atta & Flours' && attaExclude) continue;
        let score = 0;
        for (const k of kw) {
          if (matchWord(combinedText, k)) score += k.length;
        }
        if (score > bestScore) { bestScore = score; bestMatch = sc; }
      }
      subCat = bestMatch || Object.keys(catCfg.subcategories)[0] || 'General';
    }

    return {
      normalized_category: mainCat,
      category_icon:  catCfg.icon || '📦',
      category_color: catCfg.color || '#64748b',
      subcategory: subCat,
      subcategory_confidence: 'HIGH'
    };
  }

  function processRecord(rec) {
    const res = classify(rec.source_category, rec.normalized_product_name, rec.normalized_brand);
    return {
      ...rec,
      ...res
    };
  }

  function processAll(records) { return records.map(processRecord); }

  return { processRecord, processAll, getCategoryConfig, getAllCategoryConfigs: () => CATEGORY_RULES, DEFAULT_CATEGORY };
})();
