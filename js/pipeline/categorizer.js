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
        'Atta':                { kw: ['\\batta\\b','\\bchakki\\b','multigrain atta','wheat atta','gehun'] },
        'Flours':              { kw: ['\\bflour\\b','\\bflours\\b','\\bmaida\\b','\\bbesan\\b','\\bsuji\\b','\\brava\\b','\\bsooji\\b','multigrain flour','rice flour','corn flour','gram flour','wheat flour'] },
        'Rice':                { kw: ['\\brice\\b','\\bbasmati\\b','\\bsella\\b','\\bmogra\\b','\\bpoha\\b'] },
        'Pulses & Lentils':    { kw: ['\\bdal\\b','\\bdaal\\b','\\bmoong\\b','\\bmasoor\\b','\\burad\\b','\\bchana\\b','\\brajma\\b','\\barhar\\b','\\btoor\\b','\\blentil\\b','\\bpulses\\b'] },
        'Oils':                { kw: ['\\boil\\b','\\boils\\b','sunflower','mustard','olive','refined','groundnut','sesame','canola','coconut oil','rice bran','cooking oil','edible oil'] },
        'Ghee':                { kw: ['\\bghee\\b','\\bdalda\\b','vanaspati','cow ghee','desi ghee'] },
        'Sugar':               { kw: ['\\bsugar\\b','\\bjaggery\\b','\\bcheeni\\b','\\bshakkar\\b','\\bgur\\b','brown sugar','white sugar','mishri','boora','bura'] },
        'Salt':                { kw: ['\\bsalt\\b','\\bnamak\\b','sendha','rock salt','black salt','iodized salt','table salt','tata salt'] },
        'Spices & Masalas':    { kw: ['\\bmasala\\b','\\bmasalas\\b','\\bspice\\b','\\bspices\\b','chilli','turmeric','cumin','coriander','garam masala','pepper','haldi','jeera'] },
        'Tea':                 { kw: ['\\btea\\b','\\bchai\\b','green tea','tata tea','brooke bond','black tea','tea bags','red label','taj mahal','wagh bakri','lipton'] },
        'Coffee':              { kw: ['\\bcoffee\\b','bru','nescafe','instant coffee','ground coffee','cappuccino','espresso','davidoff'] },
        'Biscuits & Cookies':  { kw: ['biscuit','biscuits','cookie','cookies','rusk','wafer','bourbon','good day','parle','oreo','marie','cracker','krackjack','monaco','hide & seek','hide and seek'] },
        'Snacks & Namkeen':    { kw: ['snack','snacks','chips','namkeen','popcorn','munchies','bhujia','kurkure','lays','bingo','nachos','sev','mixture','gathiya','chanachur'] },
        'Breakfast Cereals':   { kw: ['oats','cornflakes','muesli','cereal','quaker','kellogg','upma','daliya','dalia'] },
        'Noodles':             { kw: ['noodle','noodles','maggi','yippee','ramen','chowmein','hakka noodles','wai wai','top ramen'] },
        'Pasta & Macaroni':    { kw: ['pasta','macaroni','spaghetti','vermicelli','fusilli','penne','lasagna','sewai','seviyan'] },
        'Sauces & Ketchups':   { kw: ['sauce','sauces','ketchup','ketchups','mayonnaise','spread','chilli sauce','soya sauce','schezwan','tomato sauce'] },
        'Pickles & Chutneys':  { kw: ['pickle','pickles','achar','aachar','chutney','chutneys','jam','jelly','vinegar'] },
        'Beverages':           { kw: ['juice','drink','squash','syrup','sharbat','cold drink','energy drink','nimbu','cola'] },
        'Dairy Products':      { kw: ['milk','curd','paneer','butter','cheese','yogurt','lassi','khoa','cream'] },
        'Chocolates':          { kw: ['chocolate','chocolates','cadbury','dairy milk','kitkat','snickers','gems','candy','toffee','lollipop','gum','eclairs','perk','5 star','munch'] },
        'Sweets & Mithai':     { kw: ['sweet','sweets','mithai','barfi','burfi','halwa','laddu','ladoo','laddoo','gulab jamun','rasgulla','soan papdi','peda','kaju katli','sonpapdi'] },
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
    const isChocolate = /\b(chocolate|chocolates|cadbury|dairy milk|kitkat|snickers|gems|candy|toffee|lollipop|gum|eclairs|perk|5 star|munch|ferrero)\b/i.test(prodLower);
    const isMithai = /\b(laddu|ladoo|laddoo|burfi|barfi|halwa|mithai|gulab jamun|rasgulla|soan papdi|peda|kaju katli|sonpapdi|sweet|sweets)\b/i.test(prodLower) && !isChocolate;
    const isCereal = /\b(daliya|dalia|oats|muesli|cornflakes)\b/i.test(prodLower);
    const isBiscuit = /\b(biscuit|biscuits|cookie|cookies|rusk|wafer|bourbon|good day|parle|oreo|marie|cracker|krackjack|monaco)\b/i.test(prodLower);
    const isNamkeen = /\b(chips|namkeen|munchies|popcorn|bhujia|kurkure|lays|bingo|nachos|sev|mixture|gathiya|chanachur|snack|snacks)\b/i.test(prodLower) && !isBiscuit;
    const isNoodle = /\b(noodle|noodles|maggi|yippee|ramen|chowmein|hakka noodles|wai wai|top ramen)\b/i.test(prodLower);
    const isPasta = /\b(pasta|macaroni|spaghetti|vermicelli|fusilli|penne|lasagna|sewai|seviyan)\b/i.test(prodLower);

    const isTea = /\b(tea|chai|green tea|tea bags|red label|taj mahal|wagh bakri)\b/i.test(prodLower) && !/\b(tree oil|tree|cookie|biscuit)\b/i.test(prodLower);
    const isCoffee = /\b(coffee|bru|nescafe|cappuccino|espresso|davidoff)\b/i.test(prodLower);

    const isGhee = /\b(ghee|dalda|vanaspati)\b/i.test(prodLower);
    const isOil = /\b(oil|oils|sunflower|mustard|olive|refined|groundnut|sesame|canola)\b/i.test(prodLower) && !isGhee && !/\b(hair oil|body oil|engine|massage)\b/i.test(prodLower);

    const isSugar = /\b(sugar|jaggery|cheeni|shakkar|gur|mishri|boora|bura)\b/i.test(prodLower);
    const isSalt = /\b(salt|namak|sendha)\b/i.test(prodLower) && !isSugar;

    const isSauce = /\b(ketchup|mayonnaise|spread|chilli sauce|soya sauce|schezwan|tomato sauce)\b/i.test(prodLower) || (/\bsauce\b/i.test(prodLower) && !/\b(pasta|noodle)\b/i.test(prodLower));
    const isPickle = /\b(pickle|pickles|achar|aachar|chutney|chutneys|jam|jelly|vinegar)\b/i.test(prodLower);

    const attaExclude = /\b(sunflower|batteries|attract|rattan|flourish|flower)\b/i.test(prodLower) ||
                        /\b(zero|no|no[\s-]added)\s+maida\b/i.test(prodLower) ||
                        isChocolate || isMithai || isCereal || isBiscuit || isNamkeen || isNoodle || isPasta;
    const isAtta = /\b(atta|chakki|multigrain atta|gehun)\b/i.test(prodLower) && !attaExclude;
    const isFlour = /\b(flour|flours|maida|besan|suji|rava|sooji)\b/i.test(prodLower) && !attaExclude && !isAtta;

    if (isChocolate) {
      mainCat = 'Grocery';
      subCat  = 'Chocolates';
    } else if (isMithai) {
      mainCat = 'Grocery';
      subCat  = 'Sweets & Mithai';
    } else if (isCereal) {
      mainCat = 'Grocery';
      subCat  = 'Breakfast Cereals';
    } else if (isBiscuit) {
      mainCat = 'Grocery';
      subCat  = 'Biscuits & Cookies';
    } else if (isNamkeen) {
      mainCat = 'Grocery';
      subCat  = 'Snacks & Namkeen';
    } else if (isNoodle) {
      mainCat = 'Grocery';
      subCat  = 'Noodles';
    } else if (isPasta) {
      mainCat = 'Grocery';
      subCat  = 'Pasta & Macaroni';
    } else if (isSauce) {
      mainCat = 'Grocery';
      subCat  = 'Sauces & Ketchups';
    } else if (isPickle) {
      mainCat = 'Grocery';
      subCat  = 'Pickles & Chutneys';
    } else if (isTea) {
      mainCat = 'Grocery';
      subCat  = 'Tea';
    } else if (isCoffee) {
      mainCat = 'Grocery';
      subCat  = 'Coffee';
    } else if (isGhee) {
      mainCat = 'Grocery';
      subCat  = 'Ghee';
    } else if (isOil) {
      mainCat = 'Grocery';
      subCat  = 'Oils';
    } else if (isSugar) {
      mainCat = 'Grocery';
      subCat  = 'Sugar';
    } else if (isSalt) {
      mainCat = 'Grocery';
      subCat  = 'Salt';
    } else if (isAtta) {
      mainCat = 'Grocery';
      subCat  = 'Atta';
    } else if (isFlour) {
      mainCat = 'Grocery';
      subCat  = 'Flours';
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
        if ((sc === 'Atta' || sc === 'Flours') && attaExclude) continue;
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
