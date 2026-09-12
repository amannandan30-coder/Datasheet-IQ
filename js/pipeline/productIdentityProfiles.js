window.App = window.App || {};

/* ============================================================
   PRODUCT IDENTITY PROFILES
   Configurable domain-specific identity tokens and marketing claim dictionaries.
   Allows ProductEngine to remain 100% generic while domain modules register profiles.
   Default: null (Generic mode - opt-in domain profiles).
   ============================================================ */
App.ProductIdentityProfiles = (() => {

  const PROFILES = {};

  // Registered Grocery & FMCG profile
  PROFILES['grocery_fmcg'] = {
    name: 'Grocery & FMCG Identity Profile',
    identityTokens: new Set([
      // Colors & Formulations
      'brown', 'white', 'red', 'green', 'yellow', 'black', 'golden',
      'organic', 'khapli', 'emmer', 'sharbati', 'multigrain', 'multigrains', 'keto', 'carb',
      'sella', 'parmal', 'raw', 'boiled', 'broken', 'matta', 'govindo', 'bhog', 'biryani',
      // Rice tiers & grades
      'mogra', 'everyday', 'rozzana', 'feast', 'super', 'tibbar', 'dubar', 'sona', 'masoori', 'kolam', 'idli', 'poha',
      // Tea & beverage blends
      'care', 'natural', 'leaf', 'rose', 'deccan', 'tulsi', 'agni', 'gold', 'elaichi', 'cardamom', 'masala', 'premix',
      // Oil types
      'sunflower', 'soyabean', 'soya', 'mustard', 'sarso', 'groundnut', 'peanut', 'ricebran', 'sesame', 'til', 'olive', 'coconut', 'blended', 'active', 'total',
      // Ghee sources
      'cow', 'desi', 'a2', 'buffalo',
      // Coffee flavors & types
      'mochaccino', 'hazelnut', 'vanilla', 'caramel', 'filter', 'roast', 'cold', 'chicory', 'grand', 'original',
      // Spices & blends
      'chole', 'sambhar', 'sambar', 'garam', 'meat', 'chicken', 'rasam', 'chaat', 'kasuri', 'methi', 'hing', 'asafoetida', 'amchur', 'dhania', 'coriander', 'jeera', 'cumin', 'haldi', 'turmeric', 'mirch', 'chilli'
    ]),
    marketingClaims: new Set([
      '100', '0', 'pure', 'hygienic', 'fresh', 'premium', 'superior', 'quality', 'mini', 'select', 'regular', 'special', 'classic'
    ]),
    nonIdentitySubstitutions: [/^(maida|atta)$/]
  };

  // DEFAULT: null (Generic mode unless explicitly activated or configured)
  let activeProfileName = null;

  function registerProfile(name, config) {
    if (!name || !config) return;
    PROFILES[name] = {
      name: config.name || name,
      identityTokens: new Set(config.identityTokens || []),
      marketingClaims: new Set(config.marketingClaims || []),
      nonIdentitySubstitutions: config.nonIdentitySubstitutions || []
    };
  }

  function getProfile(name) {
    return PROFILES[name] || null;
  }

  function setActiveProfile(name) {
    if (name === null || name === false) {
      activeProfileName = null;
    } else if (PROFILES[name]) {
      activeProfileName = name;
    }
  }

  function getActiveProfile() {
    return activeProfileName ? PROFILES[activeProfileName] : null;
  }

  function listProfiles() {
    return Object.keys(PROFILES);
  }

  return {
    registerProfile,
    getProfile,
    setActiveProfile,
    getActiveProfile,
    listProfiles,
    PROFILES
  };
})();
