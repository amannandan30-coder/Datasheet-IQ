window.App = window.App || {};

/* ============================================================
   CATEGORIZER — Category + Subcategory classification
   Enforces a strict Product Identity Priority System:
   Product Identity > Explicit Trusted Domain > Generic Domain Inference
   > Subcategory Keyword Matching > Default Fallback
   ============================================================ */
App.Categorizer = (() => {

  /* ── Category → Subcategory → keyword rules ──────────────── */
  const CATEGORY_RULES = {
    'Grocery': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      color: '#f59e0b',
      subcategories: {
        'General Staples': { kw: ['staple', 'grocery', 'food'] },
        'Atta': { kw: ['\\batta\\b', '\\bchakki\\b', 'multigrain atta', 'wheat atta', 'gehun'] },
        'Flours': { kw: ['\\bflour\\b', '\\bflours\\b', '\\bmaida\\b', '\\bbesan\\b', '\\bsuji\\b', '\\brava\\b', '\\bsooji\\b', 'multigrain flour', 'rice flour', 'corn flour', 'gram flour', 'wheat flour', 'bajra flour', 'ragi flour', 'sattu', 'jowar', 'bajra', 'ragi', 'jau', 'barley', 'rajgira'] },
        'Rice': { kw: ['\\brice\\b', '\\bbasmati\\b', '\\bsella\\b', '\\bmogra\\b', '\\bpoha\\b'] },
        'Pulses & Lentils': { kw: ['\\bdal\\b', '\\bdaal\\b', '\\bmoong\\b', '\\bmasoor\\b', '\\burad\\b', '\\bchana\\b', '\\brajma\\b', '\\barhar\\b', '\\btoor\\b', '\\blentil\\b', '\\bpulses\\b', 'lobiya'] },
        'Dry Fruits & Nuts': { kw: ['almond', 'almonds', 'badam', 'cashew', 'cashews', 'kaju', 'walnut', 'walnuts', 'akhrot', 'pista', 'pistachio', 'pistachios', 'raisin', 'raisins', 'kismis', 'kishmish', 'makhana', 'foxnut', 'foxnuts', 'dates', 'khajoor', 'khajur', 'anjeer', 'fig', 'figs', 'hazelnut', 'hazelnuts', 'dry fruit', 'dry fruits', 'nut mix', 'trail mix', 'chia seed', 'chia seeds', 'flax seed', 'flax seeds', 'pumpkin seeds', 'sunflower seeds', 'watermelon seeds'] },
        'Oils': { kw: ['\\boil\\b', '\\boils\\b', 'sunflower', 'mustard', 'olive', 'refined', 'groundnut', 'sesame', 'canola', 'coconut oil', 'rice bran', 'cooking oil', 'edible oil'] },
        'Ghee': { kw: ['\\bghee\\b', '\\bdalda\\b', 'vanaspati', 'cow ghee', 'desi ghee'] },
        'Sugar': { kw: ['\\bsugar\\b', '\\bjaggery\\b', '\\bcheeni\\b', '\\bshakkar\\b', '\\bgur\\b', 'brown sugar', 'white sugar', 'mishri', 'boora', 'bura', 'batasha'] },
        'Salt': { kw: ['\\bsalt\\b', '\\bnamak\\b', 'sendha', 'rock salt', 'black salt', 'iodized salt', 'table salt', 'tata salt'] },
        'Spices & Masalas': { kw: ['\\bmasala\\b', '\\bmasalas\\b', '\\bspice\\b', '\\bspices\\b', 'chilli', 'turmeric', 'cumin', 'coriander', 'garam masala', 'pepper', 'haldi', 'jeera', 'ajwain', 'star anise', 'chakriphool', 'saunf', 'fennel', 'methi dana', 'poppy seeds', 'khaskhas', 'dalchini', 'cinnamon', 'cloves', 'laung', 'elaichi', 'cardamom', 'black pepper', 'kali mirch', 'nutmeg', 'jaiphal', 'mace', 'javitri', 'bay leaf', 'tejpatta', 'kasuri methi', 'panch phoron'] },
        'Tea': { kw: ['\\btea\\b', '\\bchai\\b', 'green tea', 'tata tea', 'brooke bond', 'black tea', 'tea bags', 'red label', 'taj mahal', 'wagh bakri', 'lipton'] },
        'Coffee': { kw: ['\\bcoffee\\b', 'bru', 'nescafe', 'instant coffee', 'ground coffee', 'cappuccino', 'espresso', 'davidoff'] },
        'Biscuits & Cookies': { kw: ['biscuit', 'biscuits', 'cookie', 'cookies', 'rusk', 'wafer', 'bourbon', 'good day', 'parle', 'oreo', 'marie', 'cracker', 'krackjack', 'monaco', 'hide & seek', 'hide and seek', 'cake', 'pound cake', 'slice cake', 'muffin', 'brownie', 'pastry', 'donut cake', 'pita bread', 'croissant', 'bun', 'bread'] },
        'Snacks & Namkeen': { kw: ['snack', 'snacks', 'chips', 'namkeen', 'popcorn', 'munchies', 'bhujia', 'kurkure', 'lays', 'bingo', 'nachos', 'sev', 'mixture', 'gathiya', 'chanachur', 'mathri', 'matthi', 'papad', 'appalam', 'khakhra'] },
        'Breakfast Cereals': { kw: ['oats', 'cornflakes', 'muesli', 'cereal', 'quaker', 'kellogg', 'upma', 'daliya', 'dalia', 'chocos', 'cerelac', 'baby cereal'] },
        'Noodles': { kw: ['noodle', 'noodles', 'maggi', 'yippee', 'ramen', 'chowmein', 'hakka noodles', 'wai wai', 'top ramen', 'cup noodles'] },
        'Pasta & Macaroni': { kw: ['pasta', 'macaroni', 'spaghetti', 'vermicelli', 'fusilli', 'penne', 'lasagna', 'sewai', 'seviyan'] },
        'Sauces & Ketchups': { kw: ['sauce', 'sauces', 'ketchup', 'ketchups', 'mayonnaise', 'spread', 'chilli sauce', 'soya sauce', 'schezwan', 'tomato sauce'] },
        'Pickles & Chutneys': { kw: ['pickle', 'pickles', 'achar', 'aachar', 'chutney', 'chutneys', 'jam', 'jelly', 'vinegar'] },
        'Beverages': { kw: ['juice', 'drink', 'squash', 'syrup', 'sharbat', 'cold drink', 'energy drink', 'nimbu', 'cola', 'cold coffee', 'coffee milkshake', 'flavoured milk', 'milkshake', 'protein shake', 'oat beverage', 'soy beverage', 'tonic water', 'sparkling drink', 'bournvita', 'horlicks', 'pediasure', 'complan'] },
        'Dairy Products': { kw: ['milk', 'curd', 'paneer', 'butter', 'cheese', 'yogurt', 'lassi', 'khoa', 'cream', 'doodh'] },
        'Chocolates': { kw: ['chocolate', 'chocolates', 'cadbury', 'dairy milk', 'kitkat', 'snickers', 'gems', 'candy', 'toffee', 'lollipop', 'gum', 'eclairs', 'perk', '5 star', 'munch', 'chewing gum', 'bubble gum', 'mints'] },
        'Sweets & Mithai': { kw: ['sweet', 'sweets', 'mithai', 'barfi', 'burfi', 'halwa', 'laddu', 'ladoo', 'laddoo', 'gulab jamun', 'rasgulla', 'soan papdi', 'peda', 'kaju katli', 'sonpapdi', 'ghevar', 'milk cake', 'mysore pak', 'cham cham', 'rasbhari'] },
      }
    },
    'Cleaning Essentials': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
      color: '#10b981',
      subcategories: {
        'Detergents & Laundry': { kw: ['detergent', 'washing powder', 'laundry', 'surf', 'tide', 'ariel', 'rin', 'fena', 'ghadi', 'vim bar', 'washing liquid', 'fabric'] },
        'Dishwash': { kw: ['dishwash', 'dish wash', 'dish soap', 'utensil', 'vim', 'pril', 'exo', 'bar', 'liquid dish'] },
        'Toilet Cleaners': { kw: ['toilet', 'bathroom', 'harpic', 'lizol', 'loo', 'commode', 'acid'] },
        'Air Fresheners': { kw: ['air freshener', 'freshener', 'odonil', 'febreze', 'glade', 'room spray', 'fragrance'] },
        'Floor Cleaners': { kw: ['floor', 'mop', 'phenyl', 'lizol', 'dettol floor', 'cleaner', 'surface cleaner', 'glass cleaner', 'leather cleaner'] },
        'Personal Hygiene': { kw: ['soap', 'handwash', 'sanitizer', 'antiseptic', 'dettol', 'lifebuoy', 'lux', 'dove', 'body wash'] },
        'Repellents': { kw: ['mosquito', 'repellent', 'coil', 'mat', 'liquid repellent', 'allout', 'goodknight', 'hit', 'baygon'] },
      }
    },
    'Electronics & Electricals': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      color: '#6366f1',
      subcategories: {
        'Lighting': { kw: ['\\bbulb\\b', '\\bbulbs\\b', '\\bled\\b', '\\bbatten\\b', 'spotlight', 'lantern', 'torch', 'lamp', 'cfl', 'tubelight', 'rice light', 'string light', 'fairy light'] },
        'Fans': { kw: ['\\bfan\\b', '\\bfans\\b', 'ceiling fan', 'table fan', 'exhaust', 'cooler'] },
        'Batteries': { kw: ['\\bbattery\\b', '\\bbatteries\\b', '\\bcell\\b', 'alkaline', 'aa', 'aaa', 'eveready', 'duracell'] },
        'Mobile Accessories': { kw: ['charger', 'cable', 'earphone', 'headphone', 'power bank', 'usb', 'lightning', 'type-c', 'adapter', 'case', 'cover', 'screen guard', 'tempered', 'zebronics'] },
        'Computer Accessories': { kw: ['keyboard', 'mouse', 'pen drive', 'usb drive', 'flash drive', 'hub', 'laptop', 'monitor', 'webcam', 'speaker'] },
        'Personal Electronics': { kw: ['trimmer', 'shaver', 'iron', 'hair dryer', 'grooming', 'electric', 'lifelong'] },
        'Electrical Accessories': { kw: ['switch', 'socket', 'plug', 'extension', 'wire', 'cable', 'board', 'mcb', 'fuse', 'holder', 'havells'] },
        'Home Appliances': { kw: ['mixer', 'grinder', 'juicer', 'blender', 'kettle', 'toaster', 'oven', 'microwave', 'refrigerator', 'washing', 'ac', 'television', 'tv', 'coffee maker'] },
      }
    },
    'Home Care': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      color: '#38bdf8',
      subcategories: {
        'Plastic Containers': { kw: ['container', 'box', 'tub', 'jar', 'storage', 'tupperware', 'milton', 'cello'] },
        'Kitchen Accessories': { kw: ['plate', 'bowl', 'glass', 'cup', 'tray', 'spatula', 'ladle', 'pan', 'pressure cooker', 'kadai', 'coffee mug', 'tea mug', 'tea set', 'mug', 'mugs'] },
        'Bedding & Linen': { kw: ['bedsheet', 'pillow', 'blanket', 'towel', 'quilt', 'mattress'] },
        'Decor': { kw: ['frame', 'vase', 'candle', 'lamp shade', 'decor', 'ornament', 'figurine', 'pooja', 'puja', 'diya', 'mirror', 'wall art'] },
        'Pet Care': { kw: ['dog food', 'cat food', 'pedigree', 'whiskas', 'drools', 'me-o', 'dog treat', 'cat treat', 'pet food', 'pet treat', 'dog biscuit', 'puppy food', 'kitten food', 'nootie', 'pet bowl', 'pet food bowl'] }
      }
    },
    'Toys & Games': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>',
      color: '#a78bfa',
      subcategories: {
        'Board Games': { kw: ['board game', 'chess', 'ludo', 'carrom', 'monopoly', 'puzzle', 'jenga'] },
        'Soft Toys': { kw: ['soft toy', 'stuffed', 'teddy', 'plush', 'doll'] },
        'Action Figures': { kw: ['action figure', 'robot', 'car', 'truck', 'vehicle', 'superhero'] },
        'Educational': { kw: ['educational', 'learning', 'alphabet', 'number', 'abacus', 'drawing'] },
        'Outdoor Toys': { kw: ['cricket', 'badminton', 'football', 'frisbee', 'kite', 'skipping'] },
      }
    },
    'Personal Care': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      color: '#fb923c',
      subcategories: {
        'Skin Care': { kw: ['moisturizer', 'cream', 'lotion', 'sunscreen', 'face wash', 'cleanser', 'toner', 'serum', 'lipstick', 'lip', 'gloss', 'kajal', 'eyeliner', 'mascara', 'compact', 'foundation', 'nail polish', 'cosmetics', 'sugar pop', 'tea tree', 'hair removal', 'wax'] },
        'Hair Care': { kw: ['shampoo', 'conditioner', 'hair oil', 'hair mask', 'serum', 'headandshoulders', 'pantene', 'dove shampoo', 'hair spray', 'hair growth', 'hair tonic'] },
        'Oral Care': { kw: ['toothpaste', 'toothbrush', 'mouthwash', 'floss', 'colgate', 'closeup', 'pepsodent', 'oral-b', 'mouth spray'] },
        'Deodorants': { kw: ['deodorant', 'deo', 'perfume', 'body spray', 'axe', 'dove deo', 'rexona'] },
        'Feminine Hygiene': { kw: ['sanitary', 'pad', 'tampon', 'whisper', 'stayfree', 'sofy'] },
        'Baby Care': { kw: ['baby', 'diaper', 'nappy', 'johnsons', 'pampers', 'huggies', 'baby wipe'] },
      }
    },
    'Stationery & Office': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      color: '#34d399',
      subcategories: {
        'Writing': { kw: ['pen', 'pencil', 'marker', 'highlighter', 'gel pen', 'ballpoint'] },
        'Paper Products': { kw: ['notebook', 'register', 'paper', 'notepad', 'diary', 'file', 'folder'] },
        'Craft': { kw: ['glue', 'tape', 'scissor', 'craft', 'coloring', 'crayon', 'paint'] },
      }
    },
    'Food & Beverages': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      color: '#f59e0b',
      subcategories: {
        'Packaged Foods': { kw: ['packaged', 'ready to eat', 'instant', 'frozen', 'canned'] },
        'Beverages': { kw: ['water', 'soft drink', 'cola', 'juice', 'energy', 'sports drink'] },
      }
    },
    'Automotive': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      color: '#ef4444',
      subcategories: {
        'Engine & Oils': { kw: ['engine oil', 'motor oil', 'lubricant', '20w', 'coolant', 'oil', 'filter', 'spark plug', 'gear oil'] },
        'Car Care & Cleaning': { kw: ['car wash', 'shampoo', 'cleaner', 'polish', 'wax', 'sponge', 'dashboard'] },
        'Parts & Tyres': { kw: ['brake', 'tyre', 'tire', 'wiper', 'spark plug', 'battery', 'pad'] },
        'General': { kw: [] }
      }
    },
    'Apparel': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
      color: '#ec4899',
      subcategories: {
        'Topwear': { kw: ['t-shirt', 'shirt', 'top', 'tshirt', 'hoodie', 'jacket', 'sweater'] },
        'Bottomwear': { kw: ['jeans', 'trousers', 'pants', 'shorts', 'skirt', 'leggings'] },
        'Footwear': { kw: ['shoes', 'sneakers', 'sandals', 'slippers', 'boots', 'heels'] },
        'Ethnic Wear': { kw: ['saree', 'kurta', 'kurti', 'lehenga', 'dupatta'] },
        'General': { kw: [] }
      }
    },
    'Industrial': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      color: '#64748b',
      subcategories: {
        'Machinery': { kw: ['machine', 'sifter', 'press', 'expeller', 'cleaner', 'generator'] },
        'Components & Parts': { kw: ['conveyor', 'belt', 'bearing', 'valve', 'pipe', 'fitting'] },
        'General': { kw: [] }
      }
    },
    'Tools': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      color: '#eab308',
      subcategories: {
        'Power Tools': { kw: ['drill', 'saw', 'grinder', 'sander', 'rotary', 'cordless'] },
        'Hand Tools': { kw: ['wrench', 'hammer', 'screwdriver', 'pliers', 'spanner', 'cutter'] },
        'Tool Sets & Kits': { kw: ['tool set', 'tool kit', 'socket set', 'wrench set'] },
        'General': { kw: [] }
      }
    },
    'Furniture': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
      color: '#8b5cf6',
      subcategories: {
        'Seating': { kw: ['chair', 'sofa', 'recliner', 'stool', 'bench', 'office chair'] },
        'Tables & Desks': { kw: ['table', 'desk', 'coffee table', 'dining table'] },
        'Storage & Beds': { kw: ['bed', 'wardrobe', 'cabinet', 'bookshelf', 'shelf'] },
        'General': { kw: [] }
      }
    },
    'Books': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      color: '#06b6d4',
      subcategories: {
        'Fiction': { kw: ['novel', 'fiction', 'story', 'classic'] },
        'Academic & Non-Fiction': { kw: ['textbook', 'algorithms', 'python', 'guide', 'science', 'math'] },
        'General': { kw: [] }
      }
    },
    'Sports': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M2 12a14.5 14.5 0 0 0 20 0"/></svg>',
      color: '#10b981',
      subcategories: {
        'Fitness & Gym': { kw: ['dumbbell', 'gym', 'yoga', 'protein', 'fitness'] },
        'Sports Gear': { kw: ['cricket', 'football', 'badminton', 'racket', 'ball'] },
        'General': { kw: [] }
      }
    },
    'Sports Nutrition': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      color: '#06b6d4',
      subcategories: {
        'Protein & Workout Supplements': { kw: ['whey', 'protein powder', 'mass gainer', 'creatine', 'bcaa', 'pre-workout', 'workout supplement', 'glutamine', 'casein', 'isolate protein', 'plant protein', 'sports nutrition', 'muscleblaze', 'optimum nutrition', 'myprotein', 'isopure', 'as-it-is', 'asitis', 'gnc', 'creamp'] },
        'Vitamins & Daily Supplements': { kw: ['multivitamin', 'fish oil', 'omega 3', 'biotin', 'collagen', 'zinc supplement', 'calcium supplement', 'vitamin c supplement'] }
      }
    },
    'Other / Uncategorized': {
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      color: '#64748b',
      subcategories: {
        'General': { kw: [] }
      }
    }
  };

  /* Direct mapping for raw source l0 categories */
  const RAW_CATEGORY_MAP = {
    'sports nutrition': { category: 'Sports Nutrition', subcategory: 'Protein & Workout Supplements' },
    'health & nutrition': { category: 'Sports Nutrition', subcategory: 'Protein & Workout Supplements' },
    'protein & workout': { category: 'Sports Nutrition', subcategory: 'Protein & Workout Supplements' },
    'fitness & supplements': { category: 'Sports Nutrition', subcategory: 'Protein & Workout Supplements' },
    'atta, rice & dal': { category: 'Grocery', subcategory: null },
    'dry fruits, masala & oil': { category: 'Grocery', subcategory: null },
    'bakery & biscuits': { category: 'Grocery', subcategory: null },
    'tea, coffee & milk drinks': { category: 'Grocery', subcategory: null },
    'cold drinks & juices': { category: 'Grocery', subcategory: 'Beverages' },
    'sweet tooth': { category: 'Grocery', subcategory: null },
    'munchies': { category: 'Grocery', subcategory: null },
    'dairy & breakfast': { category: 'Grocery', subcategory: null },
    'sauces & spreads': { category: 'Grocery', subcategory: null },
    'instant & frozen food': { category: 'Grocery', subcategory: null },
    'cleaning essentials': { category: 'Cleaning Essentials', subcategory: null },
    'electronics & electricals': { category: 'Electronics & Electricals', subcategory: null },
    'electronics': { category: 'Electronics & Electricals', subcategory: null },
    'personal care': { category: 'Personal Care', subcategory: null },
    'beauty & cosmetics': { category: 'Personal Care', subcategory: null },
    'baby care': { category: 'Personal Care', subcategory: null },
    'home care': { category: 'Home Care', subcategory: null },
    'home furnishing & decor': { category: 'Home Care', subcategory: null },
    'home decor': { category: 'Home Care', subcategory: null },
    'kitchen & dining': { category: 'Home Care', subcategory: null },
    'toys & games': { category: 'Toys & Games', subcategory: null },
    'stationery needs': { category: 'Stationery & Office', subcategory: null },
    'stationery & office': { category: 'Stationery & Office', subcategory: null },
    'pet care': { category: 'Home Care', subcategory: 'Pet Care' },
  };

  const DEFAULT_CATEGORY = {
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    color: '#64748b',
    subcategories: { 'General': { kw: [] } }
  };

  function normLower(s) { return (s || '').toLowerCase().trim(); }

  function normTitle(s) {
    const n = (s || '').trim().replace(/\s+/g, ' ');
    if (!n) return '';
    return n.replace(/\b\w/g, c => c.toUpperCase());
  }

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
    return { canonical: catName || 'Other / Uncategorized', ...CATEGORY_RULES['Other / Uncategorized'] };
  }

  /* Infer category and subcategory using strict priority architecture */
  function classify(sourceCategory, productName, brand) {
    const rawCatLower = normLower(sourceCategory);
    const prodLower = normLower(productName);
    const brandLower = normLower(brand);
    const combinedText = normLower(`${productName || ''} ${brand || ''}`);

    const isRiceNonStaple = /\b(rice flour|rice atta|rice bran oil|rice light|rice lights|hair spray|face gel|face cream|facial kit|moisturizing gel|rice water|dog treat|cat treat|dog food|cat food|rice paper|rice vermicelli|rice pasta|rice maize|penne pasta|rice cracker|rice crackers|o'rice|murmura|puffed rice|choley with plain rice|ready to eat)\b/i.test(prodLower);

    function buildOutput(mCat, sCat, conf = 'HIGH', rName = 'identity_priority_match') {
      const cfg = getCategoryConfig(mCat);
      let isAmb = false;
      let ambReason = null;
      if (isRiceNonStaple || /\b(coffee mug|tea mug|tea tree|sugar pop|ghee diya|dog treat|cat treat)\b/i.test(prodLower)) {
        isAmb = true;
        ambReason = 'Resolved multi-token conflict with non-staple identifier';
      }
      return {
        normalized_category: mCat,
        category_icon: cfg.icon || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
        category_color: cfg.color || '#64748b',
        subcategory: sCat || 'General',
        subcategory_confidence: conf,
        classification_confidence: conf,
        classification_rule: rName,
        is_ambiguous: isAmb,
        ambiguity_reason: ambReason
      };
    }

    let mainCat = null;
    let subCat = null;
    let isExplicitNonFoodDomain = false;

    // 1. Direct raw category mapping base
    if (rawCatLower && RAW_CATEGORY_MAP[rawCatLower]) {
      mainCat = RAW_CATEGORY_MAP[rawCatLower].category;
      subCat = RAW_CATEGORY_MAP[rawCatLower].subcategory;
    } else if (rawCatLower && rawCatLower !== 'missing' && rawCatLower !== 'unknown' && rawCatLower !== 'uncategorized' && rawCatLower !== 'general' && rawCatLower !== 'other' && rawCatLower !== 'none') {
      const directCfg = getCategoryConfig(sourceCategory);
      mainCat = directCfg.canonical;
      // If user provided an explicit non-grocery category (Automotive, Industrial, Apparel, Tools, Furniture, Books, Electronics, etc.)
      if (mainCat !== 'Grocery' && mainCat !== 'Food & Beverages' && mainCat !== 'Other / Uncategorized') {
        isExplicitNonFoodDomain = true;
      }
    }

    // P0: If explicit non-food category was provided, lock the domain and protect from food keyword hijacking!
    if (isExplicitNonFoodDomain && mainCat) {
      const catCfg = getCategoryConfig(mainCat);
      if (!subCat) {
        let bestMatch = null, bestScore = 0;
        for (const [sc, { kw }] of Object.entries(catCfg.subcategories)) {
          let score = 0;
          for (const k of kw) {
            if (matchWord(combinedText, k)) score += k.length;
          }
          if (score > bestScore) { bestScore = score; bestMatch = sc; }
        }
        subCat = bestMatch || Object.keys(catCfg.subcategories)[0] || 'General';
      }
      return buildOutput(mainCat, subCat, 'HIGH', 'explicit_domain_lock');
    }

    // =========================================================================
    // PRIORITY 1: NON-FOOD & SPECIALIZED DOMAIN DISAMBIGUATION & INFERENCE
    // =========================================================================

    // 1.0 Sports Nutrition & Workout Supplements
    const isWorkoutSupplement = (/\b(whey protein|protein isolate|whey isolate|mass gainer|creatine|bcaa|pre-workout|post-workout|casein|glutamine|isopure|raw whey|biozyme whey|impact whey|workout supplement|sports nutrition|creamp)\b/i.test(prodLower) ||
      (/\bprotein\b/i.test(prodLower) && /\b(powder|supplement|isolate|concentrate|blend|shake mix|muscle|workout)\b/i.test(prodLower) && !/\b(biscuit|cookie|bread|barley|flour|atta|noodle|pasta|shampoo|hair|cream)\b/i.test(prodLower)) ||
      (/\b(muscleblaze|optimum nutrition|myprotein|gnc|as-it-is|asitis|isopure)\b/i.test(brandLower) && /\b(whey|protein|creatine|bcaa|gainer|glutamine|amino)\b/i.test(prodLower))) &&
      !/\b(hair|shampoo|biscuit|cookie|bread|barley|flour|atta|noodle|pasta)\b/i.test(prodLower);
    if (isWorkoutSupplement && (rawCatLower === 'sports nutrition' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown' || rawCatLower === 'grocery' || rawCatLower === 'health & nutrition')) {
      mainCat = 'Sports Nutrition';
      if (/\b(multivitamin|fish oil|omega|biotin|collagen|zinc|calcium|vitamin)\b/i.test(prodLower)) {
        subCat = 'Vitamins & Daily Supplements';
      } else {
        subCat = 'Protein & Workout Supplements';
      }
      return buildOutput(mainCat, subCat, 'HIGH', 'sports_nutrition_rule');
    }

    // 1.1 Pet Care
    const isPetCare = /\b(dog food|cat food|dog treat|cat treat|dog biscuit|cat biscuit|pet food|pet treat|puppy food|kitten food|pet bowl|pet food bowl|pet toy|aquarium|bird food|pedigree|whiskas|drools|me-o|huft|chip chops|nootie)\b/i.test(prodLower) ||
      /\b(pedigree|whiskas|drools|me-o|huft|chip chops|nootie)\b/i.test(brandLower);
    if (isPetCare) {
      return buildOutput('Home Care', 'Pet Care', 'HIGH', 'pet_care_rule');
    }

    // 1.2 Pooja / Religious Items
    const isPooja = /\b(pooja|puja|diya batti|ghee diya|havan samagri|roli chawal|camphor|kapur|agarbatti|incense)\b/i.test(prodLower) ||
      (/\b(diya|non[- ]edible)\b/i.test(prodLower) && /\bghee\b/i.test(prodLower));
    if (isPooja) {
      return buildOutput('Home Care', 'Decor', 'HIGH', 'pooja_decor_rule');
    }

    // 1.3 Personal Care: Hair Removal, Underarm, Roll-on, Delay Sprays, Mouth Sprays
    const isPersonalSprayOrWax = /\b(hair removal|wax powder|bikini hair removal|delay spray|under arm.*spray|underarm roll-on|mouth spray)\b/i.test(prodLower);
    if (isPersonalSprayOrWax) {
      if (/\bmouth spray\b/i.test(prodLower)) {
        return buildOutput('Personal Care', 'Oral Care', 'HIGH', 'personal_care_oral_rule');
      }
      return buildOutput('Personal Care', 'Skin Care', 'HIGH', 'personal_care_skin_rule');
    }

    // 1.4 Baby Care Non-Food Items
    const isBabyCareNonFood = /\b(baby diaper|diaper|nappy|baby wipes|baby lotion|baby powder|baby wash|baby shampoo|baby massage oil|baby soap|baby toothbrush|baby toothpaste|baby sipper)\b/i.test(prodLower);
    if (isBabyCareNonFood) {
      mainCat = 'Personal Care';
      if (/\b(toothbrush|toothpaste)\b/i.test(prodLower)) subCat = 'Oral Care';
      else if (/\b(shampoo|baby hair oil)\b/i.test(prodLower)) subCat = 'Hair Care';
      else subCat = 'Baby Care';
      return buildOutput(mainCat, subCat, 'HIGH', 'baby_care_rule');
    }

    // 1.5 Electronics & Electricals (Generic keywords + Computer, Mobile, Home Appliances)
    const isTrueElectronic = /\b(laptop|macbook|computer|desktop|monitor|keyboard|mouse|webcam|pen drive|usb drive|flash drive|printer|scanner|smartwatch|tablet|ipad|smartphone|mobile|charger|cable|earphone|headphone|power bank|adapter|router|bluetooth|bulb|bulbs|led|batten|torch|lamp|cfl|tubelight|fan|fans|battery|batteries|cell|speaker|soundbar|trimmer|shaver|iron|hair dryer|switch|socket|plug|extension|wire|board|mcb|fuse|grinder|juicer|blender|kettle|toaster|oven|microwave|refrigerator|rice light|string light|fairy light|coffee maker)\b/i.test(prodLower) &&
      !/\b(drink mixer|sparkling drink|cleaner spray|kitchen cleaner|oven & chimney.*cleaner|cocktail mixer|plant spray|socket set|wrench set)\b/i.test(prodLower);
    if (isTrueElectronic && (rawCatLower === 'electronics' || rawCatLower === 'electronics & electricals' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Electronics & Electricals';
      if (/\b(bulb|bulbs|led|batten|torch|lamp|cfl|tubelight|rice light|string light|fairy light)\b/i.test(prodLower)) subCat = 'Lighting';
      else if (/\b(fan|fans|cooler)\b/i.test(prodLower)) subCat = 'Fans';
      else if (/\b(battery|batteries|cell)\b/i.test(prodLower)) subCat = 'Batteries';
      else if (/\b(charger|cable|earphone|headphone|power bank|usb|adapter|screen guard)\b/i.test(prodLower)) subCat = 'Mobile Accessories';
      else if (/\b(trimmer|shaver|iron|hair dryer)\b/i.test(prodLower)) subCat = 'Personal Electronics';
      else if (/\b(switch|socket|plug|extension|wire|board|mcb|fuse)\b/i.test(prodLower)) subCat = 'Electrical Accessories';
      else if (/\b(mixer|grinder|juicer|blender|kettle|toaster|oven|microwave|coffee maker)\b/i.test(prodLower)) subCat = 'Home Appliances';
      else subCat = 'Computer Accessories';
      return buildOutput(mainCat, subCat, 'HIGH', 'electronics_rule');
    }

    // 1.6 Tools (Power tools, hand tools, tool kits)
    const isTool = /\b(drill|drill machine|rotary drill|impact drill|saw|circular saw|jigsaw|grinder machine|sander|wrench|pipe wrench|spanner|socket set|wrench set|tool set|tool kit|screwdriver|pliers|cutter|hammer|mallet|chainsaw|welding)\b/i.test(prodLower);
    if (isTool && (rawCatLower === 'tools' || rawCatLower === 'hardware' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Tools';
      if (/\b(drill|saw|grinder|sander|cordless|rotary)\b/i.test(prodLower)) subCat = 'Power Tools';
      else if (/\b(wrench|hammer|screwdriver|pliers|spanner)\b/i.test(prodLower)) subCat = 'Hand Tools';
      else if (/\b(tool set|tool kit|socket set|wrench set)\b/i.test(prodLower)) subCat = 'Tool Sets & Kits';
      else subCat = 'General';
      return buildOutput(mainCat, subCat, 'HIGH', 'tools_rule');
    }

    // 1.7 Automotive (Engine oils, car wash, tyre, brake pads, car accessories)
    const isAutomotive = /\b(engine oil|motor oil|car wash|car shampoo|brake pad|brake pads|car tyre|car tire|tyre|coolant|car polish|car cleaner|car wax|20w[- ]40|20w[- ]50|5w[- ]30|10w[- ]40|lubricant 20w|spark plug|wiper blade|gear oil)\b/i.test(prodLower) ||
      (/\b(castrol|motul|mobil 1|shell helix|valvoline)\b/i.test(brandLower));
    if (isAutomotive && (rawCatLower === 'automotive' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Automotive';
      if (/\b(engine oil|motor oil|20w|5w|10w|lubricant|gear oil|coolant)\b/i.test(prodLower)) subCat = 'Engine & Oils';
      else if (/\b(car wash|shampoo|cleaner|polish|wax|sponge|dashboard)\b/i.test(prodLower)) subCat = 'Car Care & Cleaning';
      else if (/\b(brake|tyre|tire|wiper|spark plug)\b/i.test(prodLower)) subCat = 'Parts & Tyres';
      else subCat = 'General';
      return buildOutput(mainCat, subCat, 'HIGH', 'automotive_rule');
    }

    // 1.8 Apparel & Footwear
    const isApparel = /\b(t-shirt|tshirt|shirt|shirts|jeans|denim|trousers|pants|shorts|skirt|dress|saree|sari|kurta|kurti|lehenga|shoes|sneakers|sandals|slippers|socks|jacket|hoodie|sweater|innerwear|bra|briefs|suit|blazer|clothing|apparel)\b/i.test(prodLower);
    if (isApparel && (rawCatLower === 'apparel' || rawCatLower === 'clothing' || rawCatLower === 'fashion' || rawCatLower === 'footwear' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Apparel';
      if (/\b(t-shirt|tshirt|shirt|shirts|top|hoodie|jacket|sweater)\b/i.test(prodLower)) subCat = 'Topwear';
      else if (/\b(jeans|trousers|pants|shorts|skirt|leggings)\b/i.test(prodLower)) subCat = 'Bottomwear';
      else if (/\b(shoes|sneakers|sandals|slippers|boots|heels)\b/i.test(prodLower)) subCat = 'Footwear';
      else if (/\b(saree|sari|kurta|kurti|lehenga|dupatta)\b/i.test(prodLower)) subCat = 'Ethnic Wear';
      else subCat = 'General';
      return buildOutput(mainCat, subCat, 'HIGH', 'apparel_rule');
    }

    // 1.9 Furniture
    const isFurniture = /\b(office chair|chair|chairs|dining table|coffee table|side table|table|desk|sofa|bed|mattress|wardrobe|cabinet|bookshelf|bench|stool|furniture)\b/i.test(prodLower);
    if (isFurniture && (rawCatLower === 'furniture' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Furniture';
      if (/\b(chair|chairs|sofa|stool|bench)\b/i.test(prodLower)) subCat = 'Seating';
      else if (/\b(table|desk|coffee table|side table)\b/i.test(prodLower)) subCat = 'Tables & Desks';
      else if (/\b(bed|wardrobe|cabinet|bookshelf)\b/i.test(prodLower)) subCat = 'Storage & Beds';
      else subCat = 'General';
      return buildOutput(mainCat, subCat, 'HIGH', 'furniture_rule');
    }

    // 1.10 Books
    const isBook = /\b(book|books|novel|paperback|hardcover|textbook|biography|dictionary|encyclopedia|fiction|non-fiction)\b/i.test(prodLower);
    if (isBook && (rawCatLower === 'books' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Books';
      if (/\b(novel|fiction|story|classic)\b/i.test(prodLower)) subCat = 'Fiction';
      else if (/\b(textbook|algorithms|python|guide|science|math|academic)\b/i.test(prodLower)) subCat = 'Academic & Non-Fiction';
      else subCat = 'General';
      return buildOutput(mainCat, subCat, 'HIGH', 'books_rule');
    }

    // 1.11 Cleaning Essentials
    const isCleaningItem = /\b(detergent|washing powder|surf|tide|ariel|rin|fena|ghadi|dishwash|vim|pril|exo|harpic|lizol|toilet cleaner|floor cleaner|air freshener|odonil|repellent|allout|goodknight|hit|baygon|mop|phenyl|surface & glass cleaner|glass cleaner|cleaner spray|multi-surface cleaner|surface cleaner|oven & chimney kitchen cleaner|leather cleaner)\b/i.test(prodLower) ||
      (/\b(colin)\b/i.test(brandLower) && /\bcleaner\b/i.test(prodLower));
    if (isCleaningItem && (rawCatLower === 'cleaning essentials' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Cleaning Essentials';
      if (/\b(dishwash|vim|pril|exo)\b/i.test(prodLower)) subCat = 'Dishwash';
      else if (/\b(toilet|bathroom|harpic|acid)\b/i.test(prodLower)) subCat = 'Toilet Cleaners';
      else if (/\b(air freshener|freshener|odonil|fragrance)\b/i.test(prodLower)) subCat = 'Air Fresheners';
      else if (/\b(floor|mop|phenyl|lizol|surface.*cleaner|glass cleaner|cleaner spray|multi-surface|kitchen cleaner|leather cleaner)\b/i.test(prodLower)) subCat = 'Floor Cleaners';
      else if (/\b(soap|handwash|sanitizer)\b/i.test(prodLower)) subCat = 'Personal Hygiene';
      else if (/\b(mosquito|repellent|allout|hit|rat repellent|termite)\b/i.test(prodLower)) subCat = 'Repellents';
      else subCat = 'Detergents & Laundry';
      return buildOutput(mainCat, subCat, 'HIGH', 'cleaning_essentials_rule');
    }

    // 1.12 Kitchenware (Utensils/Dinnerware, NOT food/drink in Cup/Mug/Kadai/Noodles)
    const isFoodDrinkOrNoodle = /\b(drink|milk|milkshake|hot chocolate|chocolate drink|flavoured milk|kadai doodh|coffee|tea|cup cake|mug cake|noodle|noodles|cup noodles|curd|yogurt|shrikhand|mishti doi|laddu|ladoo|kaju katli)\b/i.test(prodLower) &&
      !/\b(mug set|tea set|dinner set|coffee mug set|bowl set)\b/i.test(prodLower);
    const isTrueKitchenware = (/\b(plate|bowl|glass set|tray|spatula|ladle|pan|pressure cooker|kadai|storage jar|tupperware|milton|cello|borosil|opalware)\b/i.test(prodLower) ||
      (/\b(coffee mug|tea mug|tea set|mug|mugs|cup|cups)\b/i.test(prodLower) && !isFoodDrinkOrNoodle)) &&
      rawCatLower !== 'cold drinks & juices' && rawCatLower !== 'tea, coffee & milk drinks' && rawCatLower !== 'dairy & breakfast' && rawCatLower !== 'instant & frozen food';
    if (isTrueKitchenware && (rawCatLower === 'kitchen & dining' || rawCatLower === 'home care' || rawCatLower === 'home furnishing & decor' || rawCatLower === 'home decor' || rawCatLower === 'missing' || !rawCatLower)) {
      mainCat = 'Home Care';
      subCat = 'Kitchen Accessories';
      return buildOutput(mainCat, subCat, 'HIGH', 'kitchen_accessories_rule');
    }

    // 1.13 Cosmetics & Skincare
    const isFoodItemWithCosmeticKeyword = /\b(chips|popcorn|nachos|puff|namkeen|milkshake|shake|protein milkshake|soft drink|soda|biscuit|cookie|wafer|cake|pastry|ice cream|chocolate bar|chocolate box)\b/i.test(prodLower);
    const isCosmeticOrPersonal = (/\b(skin treatment|treatment cream|moisturizing cream|nourishing.*cream|face gel|face cream|body cream|face wash|body lotion|lotion|after shave|moisturizer|cleanser|sunscreen|anti-acne|pimple|serum|facial kit|rice water.*gel|rice water.*cream|rice water.*facial|rice water.*cleanser|rice water.*brightening|moisturizing gel|kajal|lipstick|lip balm|lip gloss|eyeliner|mascara|compact|foundation|nail polish|cosmetics|shampoo|conditioner|hair oil|hair spray|hair growth|hair mask|hair tonic|toothpaste|toothbrush|mouthwash|deodorant|deo|body spray|perfume|sanitary pad|tampon|soap|body wash|handwash|essential oil|eucalyptus oil|tea tree oil)\b/i.test(prodLower) ||
      (/\b(sugar pop|sugar cosmetics|glamveda|the face shop)\b/i.test(combinedText)) ||
      ((rawCatLower === 'beauty & cosmetics' || rawCatLower === 'personal care') && !isFoodItemWithCosmeticKeyword)) &&
      !isFoodItemWithCosmeticKeyword;
    if (isCosmeticOrPersonal && (rawCatLower === 'personal care' || rawCatLower === 'beauty & cosmetics' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Personal Care';
      if (/\b(shampoo|conditioner|hair oil|hair color|hair spray|hair growth|hair mask|hair tonic)\b/i.test(prodLower)) subCat = 'Hair Care';
      else if (/\b(toothpaste|toothbrush|mouthwash)\b/i.test(prodLower)) subCat = 'Oral Care';
      else if (/\b(deodorant|deo|body spray|perfume)\b/i.test(prodLower)) subCat = 'Deodorants';
      else if (/\b(sanitary|pad|tampon)\b/i.test(prodLower)) subCat = 'Feminine Hygiene';
      else if (/\b(baby|diaper|nappy|wipes)\b/i.test(prodLower)) subCat = 'Baby Care';
      else subCat = 'Skin Care';
      return buildOutput(mainCat, subCat, 'HIGH', 'personal_care_rule');
    }

    // 1.14 Industrial & Machinery
    const isIndustrial = /\b(cleaning machine|sifter machine|flour sifter|oil expeller|expeller press|conveyor belt|hydraulic press|lathe machine|generator set|cnc machine|industrial motor|welding machine)\b/i.test(prodLower);
    if (isIndustrial && (!rawCatLower || rawCatLower === 'industrial' || rawCatLower === 'machinery' || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Industrial';
      if (/\b(machine|sifter|press|expeller|cleaner|lathe|generator)\b/i.test(prodLower)) subCat = 'Machinery';
      else if (/\b(conveyor|belt|bearing|valve|pipe|fitting)\b/i.test(prodLower)) subCat = 'Components & Parts';
      return buildOutput(mainCat, subCat, 'HIGH', 'industrial_rule');
    }

    // 1.15 Toys & Games
    const isToys = /\b(board game|chess set|ludo|carrom board|monopoly|puzzle|jenga|soft toy|teddy bear|plush toy|action figure|toy car|toy truck|educational toy|building blocks|lego|blaster toy|dart blaster|toy|toys)\b/i.test(prodLower);
    if (isToys && (rawCatLower === 'toys & games' || rawCatLower === 'toys' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Toys & Games';
      if (/\b(board game|chess|ludo|carrom|monopoly|puzzle|jenga)\b/i.test(prodLower)) subCat = 'Board Games';
      else if (/\b(soft toy|teddy|plush|doll)\b/i.test(prodLower)) subCat = 'Soft Toys';
      else if (/\b(action figure|robot|toy car|toy truck|vehicle|superhero|blaster|dart)\b/i.test(prodLower)) subCat = 'Action Figures';
      else if (/\b(educational|learning|alphabet|number|abacus|building blocks|lego)\b/i.test(prodLower)) subCat = 'Educational';
      return buildOutput(mainCat, subCat, 'HIGH', 'toys_rule');
    }

    // 1.16 Stationery & Office
    const isStationery = /\b(ballpoint pen|gel pen|fountain pen|highlighter|pencil set|notebook|spiral notebook|notepad|diary|glue stick|fevicol|stapler|geometry box|calculator|sticky notes|whiteboard marker)\b/i.test(prodLower);
    if (isStationery && (rawCatLower === 'stationery & office' || rawCatLower === 'stationery' || rawCatLower === 'stationery needs' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Stationery & Office';
      if (/\b(pen|pencil|marker|highlighter|ballpoint|gel pen)\b/i.test(prodLower)) subCat = 'Writing';
      else if (/\b(notebook|register|paper|notepad|diary|file|folder)\b/i.test(prodLower)) subCat = 'Paper Products';
      else subCat = 'Craft';
      return buildOutput(mainCat, subCat, 'HIGH', 'stationery_rule');
    }

    // 1.17 Sports & Fitness
    const isSports = /\b(dumbbell|dumbbells|kettlebell|barbell|yoga mat|resistance band|gym gloves|skipping rope|cricket bat|badminton racket|shuttlecock|football|basketball|tennis racket)\b/i.test(prodLower);
    if (isSports && (rawCatLower === 'sports' || rawCatLower === 'fitness' || !rawCatLower || rawCatLower === 'missing' || rawCatLower === 'unknown')) {
      mainCat = 'Sports';
      if (/\b(dumbbell|dumbbells|kettlebell|barbell|yoga mat|resistance band|gym gloves|skipping rope|gym|fitness)\b/i.test(prodLower)) subCat = 'Fitness & Gym';
      else subCat = 'Sports Gear';
      return buildOutput(mainCat, subCat, 'HIGH', 'sports_fitness_rule');
    }

    // =========================================================================
    // PRIORITY 2: FOOD & BEVERAGE PRODUCT IDENTITY RESOLUTION
    // =========================================================================

    const isNoodle = /\b(noodle|noodles|cup noodle|cup noodles|maggi|yippee|ramen|chowmein|hakka noodles|wai wai|top ramen)\b/i.test(prodLower);
    const isCoffeeSavoryOrSweetOrChewing = /\b(mixture|murukku|pakoda|bhujia|chips|namkeen|ghee mysore pak|mysore pak|burfi|halwa|mithai|sweets|chewing gum|digestive mint|mint|mints|candy|candies|toffee|biscuit|biscuits|cookie|cookies|cake|chocolate bar|mug|cup|glass set|tumbler)\b/i.test(prodLower);
    const isExplicitCoffeeProduct = /\b(instant coffee|ground coffee|coffee powder|coffee beans|filter coffee|cappuccino|espresso|davidoff|bru|nescafe|sleepy owl|blue tokai|continental coffee|movenpick.*coffee|coffee premix|coffee sachet|coffee roast|roasted coffee|filter coffee powder|pure coffee|cold brew coffee)\b/i.test(prodLower);
    const isCoffee = (isExplicitCoffeeProduct ||
      (/\bcoffee\b/i.test(prodLower) && !isCoffeeSavoryOrSweetOrChewing && !/\b(flavoured milk|milkshake|cold coffee can|protein milkshake|coffee mug|mug|stirrer|popcorn|chips|namkeen|mixture|murukku|pakoda|chakli|laddu|ladoo|burfi|halwa|mithai|sweets|chikki|biscuit|biscuits|cookie|cookies|cake|chocolate bar|candies|candy|toffee|spread|wafer bar|protein bar)\b/i.test(prodLower))) &&
      !isCoffeeSavoryOrSweetOrChewing &&
      !isNoodle;

    const isMaltedOrDrinkMix = /\b(bournvita|horlicks|pediasure|complan|boost|maltova)\b/i.test(prodLower) ||
      /\b(chocolate nutrition drink|nutrition drink mix|chocolate drink mix|hot chocolate drink)\b/i.test(prodLower);
    const isBeverage = (/\b(juice|squash|syrup|sharbat|cold drink|energy drink|nimbu|cola|pepsi|coca[- ]cola|sprite|fanta|maaza|frooti|glucon[- ]d|tang|soda|tonic water|sparkling drink|drink mixer|flavoured milk|milkshake|protein milkshake|oat beverage|soy beverage|almond beverage|plant based.*beverage|cold coffee|coffee milkshake|coffee drink|cold coffee can|milk drink)\b/i.test(prodLower) ||
      (/\bdrink\b/i.test(prodLower) && !/\b(glass|cup|mug|bottle|dispenser)\b/i.test(prodLower)) ||
      isMaltedOrDrinkMix ||
      (rawCatLower === 'cold drinks & juices')) &&
      !isCoffee && !isNoodle;

    const isCereal = (/\b(oats|cornflakes|corn flakes|muesli|cereal|chocos|quaker|kellogg|upma|daliya|dalia|cerelac|baby cereal|infant cereal)\b/i.test(prodLower) ||
      (/\bragi powder baby cereal\b/i.test(prodLower))) &&
      !isBeverage && !isNoodle && !isCoffee;

    const isBakeryBiscuit = (/\b(biscuit|biscuits|cookie|cookies|rusk|wafer|wafers|bourbon|good day|parle|oreo|marie|cracker|krackjack|monaco|hide & seek|hide and seek|cake|pound cake|slice cake|muffin|muffins|brownie|brownies|pastry|donut|croissant|pita bread|bread|buns|pav|toast|khari)\b/i.test(prodLower) ||
      (rawCatLower === 'bakery & biscuits' && !isCereal && !isBeverage && !isNoodle && !isCoffee)) &&
      !/\b(dog biscuit|cat biscuit|ice cream|milkshake)\b/i.test(prodLower) &&
      !isNoodle;

    const isNamkeen = (/\b(chips|namkeen|popcorn|munchies|bhujia|kurkure|lays|bingo|nachos|sev|mixture|gathiya|chanachur|mathri|matthi|papad|appalam|khakhra|dal mathri|dal biji|roasted chana)\b/i.test(prodLower) ||
      (rawCatLower === 'munchies' && !isBakeryBiscuit && !isBeverage && !isNoodle && !isCoffee)) &&
      !isBakeryBiscuit && !isBeverage && !isNoodle;

    const isMithai = /\b(laddu|ladoo|laddoo|burfi|barfi|halwa|mithai|gulab jamun|rasgulla|soan papdi|sonpapdi|peda|kaju katli|milk cake|mysore pak|cham cham|rasbhari|ghevar|chikki|gajak)\b/i.test(prodLower) &&
      !isBakeryBiscuit && !isBeverage && !isNamkeen && !isNoodle;

    const isChocolateConfectionery = (/\b(chocolate|chocolates|cadbury|dairy milk|kitkat|snickers|gems|candy|candies|toffee|toffees|lollipop|lollipops|eclairs|perk|5 star|munch|ferrero|kinder|chewing gum|bubble gum|gum|mints|mentos|orbit|trident|wrigley|happydent|center fresh|center fruit)\b/i.test(prodLower) ||
      (rawCatLower === 'sweet tooth' && !isMithai && !isBakeryBiscuit)) &&
      !isBakeryBiscuit && !isBeverage && !isMithai && !isCereal && !isNamkeen && !isNoodle;

    const isSpice = (/\b(masala|masalas|spice|spices|turmeric|chilli|coriander|haldi|mirch|cumin|garam masala|sambar|rasam|kitchen king|paneer masala|meat masala|chicken masala|biryani masala|ajwain|star anise|chakriphool|saunf|fennel|jeera|methi dana|poppy seeds|khaskhas|dalchini|cinnamon|cloves|laung|elaichi|cardamom|black pepper|kali mirch|nutmeg|jaiphal|mace|javitri|bay leaf|tejpatta|kasuri methi|panch phoron|dry ginger powder|ginger powder|hing|asafoetida)\b/i.test(prodLower) ||
      (/\bwith natural oils\b/i.test(prodLower) && /\b(powder|masala|turmeric|haldi|chilli|coriander)\b/i.test(prodLower))) &&
      !isNamkeen && !isBeverage && !isChocolateConfectionery && !isMithai && !isNoodle;

    const isDryFruit = /\b(almond|almonds|badam|cashew|cashews|kaju|walnut|walnuts|akhrot|pista|pistachio|pistachios|raisin|raisins|kismis|kishmish|makhana|foxnut|foxnuts|dates|khajoor|khajur|anjeer|fig|figs|hazelnut|hazelnuts|dry fruit|dry fruits|nut mix|trail mix|chia seed|chia seeds|flax seed|flax seeds|pumpkin seeds|sunflower seeds|watermelon seeds)\b/i.test(prodLower) &&
      !isBeverage && !isBakeryBiscuit && !isNamkeen && !isChocolateConfectionery && !isMithai && !isNoodle;

    const isGhee = /\b(ghee|dalda|vanaspati)\b/i.test(prodLower) &&
      !isMithai && !isBakeryBiscuit && !isNamkeen && !isPooja && !isNoodle;

    const isOil = (/\b(mustard oil|sunflower oil|olive oil|refined oil|groundnut oil|sesame oil|canola oil|rice bran oil|cooking oil|edible oil|cooking spray|olive oil spray)\b/i.test(prodLower) ||
      (/\boil\b/i.test(prodLower) && /\b(refined|mustard|sunflower|olive|groundnut|sesame|canola|rice bran|soyabean|soybean|edible|cooking|kachi ghani)\b/i.test(prodLower))) &&
      !isGhee && !isSpice && !isBeverage && !isPersonalSprayOrWax && !isNoodle;

    const isSugar = /\b(sugar|jaggery|cheeni|shakkar|gur|mishri|boora|bura|batasha)\b/i.test(prodLower) &&
      !/\b(sugar[\s-]*free|zero[\s-]*sugar|no[\s-]*added[\s-]*sugar|low[\s-]*sugar|sugarless|lipstick|sugar pop)\b/i.test(prodLower) &&
      !isBeverage && !isChocolateConfectionery && !isBakeryBiscuit && !isNamkeen && !isNoodle;

    const isSalt = /\b(salt|namak|sendha)\b/i.test(prodLower) &&
      !/\b(potato chips|chips|namkeen|biscuit|cookie|sauce|peanuts)\b/i.test(prodLower) &&
      !isSugar && !isNamkeen && !isNoodle;

    const isAtta = (/\b(chakki atta|wheat atta|multigrain atta|shudh atta|gehun atta|mp atta|sharbati atta)\b/i.test(prodLower) ||
      (/\batta\b/i.test(prodLower) && !/\b(rice atta|corn atta|jowar atta|bajra atta|ragi atta|jau atta|millet atta|rajgira atta|besan|maida|suji|sooji|rava|flour)\b/i.test(prodLower))) &&
      !isBakeryBiscuit && !isCereal && !isNamkeen && !isBeverage && !isNoodle;

    const isFlour = (/\b(flour|flours|maida|besan|suji|rava|sooji|corn flour|rice flour|gram flour|bajra|ragi|jowar|jau|barley|rajgira|sattu|singhara|kuttu|millet)\b/i.test(prodLower) ||
      /\b(rice atta|corn atta|jowar atta|bajra atta|ragi atta|jau atta|millet atta|rajgira atta)\b/i.test(prodLower)) &&
      !isAtta && !isBakeryBiscuit && !isCereal && !isNamkeen && !isNoodle &&
      !/\b(no[\s-]maida|zero[\s-]maida|0%[\s-]maida)\b/i.test(prodLower);

    const isRice = /\b(basmati|rice|poha|sella|mogra|sonamasuri|sona masoori|govindo bhog|gobindobhog|kolam|raw rice|parboiled rice|broken mogra|broken basmati|tibar basmati|dubar basmati|hamesha.*basmati|super basmati|rozana.*basmati|daily delight.*basmati|everyday basmati|biryani rice|idli rice|red rice|brown rice|red poha|thick poha|indori poha)\b/i.test(prodLower) &&
      !isRiceNonStaple &&
      !isFlour && !isBeverage && !isCereal && !isNoodle && !isNamkeen;

    const isDal = /\b(dal|daal|moong|masoor|urad|chana dal|rajma|arhar|toor|lentil|lobiya)\b/i.test(prodLower) &&
      !isNamkeen && !isBakeryBiscuit && !isFlour && !isNoodle &&
      !/\b(besan|roasted chana|papad|mathri|dal mathri|dal biji)\b/i.test(prodLower);

    const isTea = /\b(tea|chai|green tea|tea bags|red label|taj mahal|wagh bakri|tetley|lipton)\b/i.test(prodLower) &&
      !/\b(tea tree|tea set|tea cup|tea mug|cookie|biscuit|cake)\b/i.test(prodLower) &&
      !isBeverage && !isNoodle;

    const isPasta = /\b(pasta|macaroni|spaghetti|vermicelli|fusilli|penne|lasagna|sewai|seviyan|rice paper|rice vermicelli|rice maize.*pasta)\b/i.test(prodLower) && !isNoodle;

    const isSauce = /\b(ketchup|mayonnaise|spread|chilli sauce|soya sauce|schezwan|tomato sauce|mustard sauce)\b/i.test(prodLower) ||
      (/\bsauce\b/i.test(prodLower) && !/\b(pasta|noodle)\b/i.test(prodLower));
    const isPickle = /\b(pickle|pickles|achar|aachar|chutney|chutneys|jam|jelly|vinegar)\b/i.test(prodLower);

    const isDairy = /\b(paneer|butter|cheese|curd|yogurt|lassi|khoa|dairy cream|fresh cream|amul butter|shrikhand|mishti doi)\b/i.test(prodLower) &&
      !isBakeryBiscuit && !isBeverage && !isMithai && !isChocolateConfectionery && !isNoodle;

    // Assign Grocery Subcategories in strict hierarchy
    if (isNoodle) { mainCat = 'Grocery'; subCat = 'Noodles'; }
    else if (isCoffee) { mainCat = 'Grocery'; subCat = 'Coffee'; }
    else if (isBeverage) { mainCat = 'Grocery'; subCat = 'Beverages'; }
    else if (isCereal) { mainCat = 'Grocery'; subCat = 'Breakfast Cereals'; }
    else if (isBakeryBiscuit) { mainCat = 'Grocery'; subCat = 'Biscuits & Cookies'; }
    else if (isNamkeen) { mainCat = 'Grocery'; subCat = 'Snacks & Namkeen'; }
    else if (isMithai) { mainCat = 'Grocery'; subCat = 'Sweets & Mithai'; }
    else if (isChocolateConfectionery) { mainCat = 'Grocery'; subCat = 'Chocolates'; }
    else if (isSpice) { mainCat = 'Grocery'; subCat = 'Spices & Masalas'; }
    else if (isDryFruit) { mainCat = 'Grocery'; subCat = 'Dry Fruits & Nuts'; }
    else if (isGhee) { mainCat = 'Grocery'; subCat = 'Ghee'; }
    else if (isOil) { mainCat = 'Grocery'; subCat = 'Oils'; }
    else if (isSugar) { mainCat = 'Grocery'; subCat = 'Sugar'; }
    else if (isSalt) { mainCat = 'Grocery'; subCat = 'Salt'; }
    else if (isAtta) { mainCat = 'Grocery'; subCat = 'Atta'; }
    else if (isFlour) { mainCat = 'Grocery'; subCat = 'Flours'; }
    else if (isRice) { mainCat = 'Grocery'; subCat = 'Rice'; }
    else if (isDal) { mainCat = 'Grocery'; subCat = 'Pulses & Lentils'; }
    else if (isTea) { mainCat = 'Grocery'; subCat = 'Tea'; }
    else if (isPasta) { mainCat = 'Grocery'; subCat = 'Pasta & Macaroni'; }
    else if (isSauce) { mainCat = 'Grocery'; subCat = 'Sauces & Ketchups'; }
    else if (isPickle) { mainCat = 'Grocery'; subCat = 'Pickles & Chutneys'; }
    else if (isDairy) { mainCat = 'Grocery'; subCat = 'Dairy Products'; }

    // Fallback main category
    if (!mainCat) {
      if (sourceCategory && sourceCategory !== 'Uncategorized' && sourceCategory !== 'Missing' && sourceCategory !== 'none') {
        mainCat = normTitle(sourceCategory);
      } else {
        mainCat = 'Other / Uncategorized';
      }
    }

    // Classify subcategory if not set
    const catCfg = getCategoryConfig(mainCat);
    if (!subCat || !catCfg.subcategories[subCat]) {
      let bestMatch = null;
      let bestScore = 0;
      for (const [sc, { kw }] of Object.entries(catCfg.subcategories)) {
        let score = 0;
        for (const k of kw) {
          if (matchWord(combinedText, k)) score += k.length;
        }
        if (score > bestScore) { bestScore = score; bestMatch = sc; }
      }
      subCat = bestMatch || Object.keys(catCfg.subcategories)[0] || 'General';
    }

    let ruleName = 'identity_priority_match';
    let confidence = 'HIGH';
    let isAmbiguous = false;
    let ambiguityReason = null;

    if (isRiceNonStaple || /\b(coffee mug|tea mug|tea tree|sugar pop|ghee diya|dog treat|cat treat)\b/i.test(prodLower)) {
      isAmbiguous = true;
      ambiguityReason = 'Resolved multi-token conflict with non-staple identifier';
    }

    if (mainCat === 'Other / Uncategorized') {
      confidence = 'LOW';
      ruleName = 'default_fallback';
    } else if (subCat === 'General' || subCat === 'General Staples') {
      confidence = 'MEDIUM';
      ruleName = 'category_general_fallback';
    }

    return {
      normalized_category: mainCat,
      category_icon: catCfg.icon || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      category_color: catCfg.color || '#64748b',
      subcategory: subCat,
      subcategory_confidence: confidence,
      classification_confidence: confidence,
      classification_rule: ruleName,
      is_ambiguous: isAmbiguous,
      ambiguity_reason: ambiguityReason
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

  return { classify, processRecord, processAll, getCategoryConfig, getAllCategoryConfigs: () => CATEGORY_RULES, DEFAULT_CATEGORY };
})();
