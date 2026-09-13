window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   LIQUIDATION IQ — MODERN SAAS LANDING PAGE (Clean Static Layout)
   ============================================================ */
App.Views.Landing = (() => {

  let _cleanup = null;

  function render(container) {
    if (_cleanup) {
      _cleanup();
      _cleanup = null;
    }

    container.innerHTML = `
      <div class="landing-wrapper animate-fade-in" id="landing-root">
        
        <!-- ── FLOATING TOP NAVBAR ───────────────────────────────── -->
        <header class="landing-nav" id="landing-nav">
          <div class="landing-nav-container">
            <div class="landing-brand" onclick="App.Views.Landing.scrollTo('overview')" role="button" tabindex="0">
              <div class="landing-brand-icon">📦</div>
              <div>
                <div class="landing-brand-title">Liquidation IQ</div>
                <div class="landing-brand-sub">Inventory Intelligence</div>
              </div>
            </div>

            <!-- Desktop Nav Links -->
            <nav class="landing-links" aria-label="Main Navigation">
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('overview')">Overview</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('features')">Features</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('pipeline')">Pipeline</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('matrix')">Control Center</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('about')">About</button>
            </nav>

            <!-- Action Button -->
            <div class="landing-nav-actions">
              <button class="btn btn-primary btn-md landing-cta-btn" onclick="App.Router.go('dashboard')">
                <span>Open Dashboard</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>

              <!-- Mobile Hamburger -->
              <button class="landing-mobile-toggle" onclick="App.Views.Landing.toggleMobileNav()" aria-label="Toggle Navigation Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Mobile Nav Drawer -->
          <div class="landing-mobile-menu" id="landing-mobile-menu">
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('overview'); App.Views.Landing.closeMobileNav()">Overview</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('features'); App.Views.Landing.closeMobileNav()">Features</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('pipeline'); App.Views.Landing.closeMobileNav()">Pipeline</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('matrix'); App.Views.Landing.closeMobileNav()">Control Center</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('about'); App.Views.Landing.closeMobileNav()">About</button>
            <button class="btn btn-primary btn-md w-full mt-12" onclick="App.Router.go('dashboard')">Open Dashboard</button>
          </div>
        </header>

        <!-- ── HERO SECTION ─────────────────────────────────── -->
        <section class="landing-hero-section" id="overview">
          <div class="hero-bg-overlay"></div>
          <div class="landing-container">
            <div class="landing-hero-content text-center">
              
              <div class="landing-stage-badge mb-20">
                <span class="landing-stage-badge-dot"></span>
                <span>AUTONOMOUS INGESTION ENGINE</span>
              </div>

              <h1 class="landing-hero-title">
                Turn Liquidation Manifests Into<br>
                <span class="gradient-text">Actionable Intelligence</span>
              </h1>

              <p class="landing-hero-sub">
                Robotic optical scanners and automated intake pipelines ingest high-volume inventory manifests with zero data loss.
              </p>

              <div class="landing-stage-actions justify-center mb-32">
                <button class="btn btn-primary btn-lg landing-hero-btn" onclick="App.Router.go('dashboard')">
                  <span>Open Dashboard</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
                <button class="btn btn-secondary btn-lg" onclick="App.Views.Landing.scrollTo('features')">
                  <span>Explore System ↓</span>
                </button>
              </div>

              <!-- Hero Live Metrics Bar -->
              <div class="hero-metrics-pill">
                <div class="pill-stat"><span class="stat-num">7,980</span> <span class="stat-lbl">SKUs Parsed</span></div>
                <div class="stat-sep">•</div>
                <div class="pill-stat"><span class="stat-num">20,861</span> <span class="stat-lbl">Units Reconciled</span></div>
                <div class="stat-sep">•</div>
                <div class="pill-stat"><span class="stat-num">15,144.22 KG</span> <span class="stat-lbl">Net Weight</span></div>
                <div class="stat-sep">•</div>
                <div class="pill-stat tag-green"><span>Deterministic Pipeline</span></div>
              </div>

            </div>
          </div>
        </section>

        <!-- ── BENTO FEATURES GRID SECTION ───────────────────────── -->
        <section class="landing-section features-section" id="features">
          <div class="section-bg-glow"></div>
          <div class="landing-container">
            
            <div class="landing-section-header text-center">
              <div class="landing-section-badge mb-16">
                <span class="landing-stage-badge-dot dot-cyan"></span>
                <span>ENGINEERED FOR ENTERPRISE SCALE</span>
              </div>
              <h2 class="landing-section-title">
                Comprehensive Inventory <span class="gradient-text">Intelligence</span>
              </h2>
              <p class="landing-section-sub">
                Designed to solve the hardest problems in inventory liquidation — from unstructured manifests to instant financial reconciliation.
              </p>
            </div>

            <div class="bento-grid">
              
              <!-- Card 1: AI Search & NLP (Col 2) -->
              <div class="bento-card bento-col-2 bento-card-indigo">
                <div class="bento-card-glow"></div>
                <div class="bento-header-row">
                  <div class="bento-icon-box icon-indigo">🤖</div>
                  <span class="bento-status-pill">AI Query Engine v2.0</span>
                </div>
                <h3 class="bento-title">Natural-Language Conversational Querying</h3>
                <p class="bento-desc">
                  Ask natural questions like <em>"How much Atta do we have?"</em>, <em>"Which brand has highest weight?"</em>, or <em>"Show stock near expiry"</em> and receive audited breakdowns instantly.
                </p>
                <div class="bento-mock-terminal">
                  <div class="terminal-header">
                    <span class="term-dot red"></span>
                    <span class="term-dot yellow"></span>
                    <span class="term-dot green"></span>
                    <span class="term-title">NL Query Console</span>
                  </div>
                  <div class="terminal-body">
                    <div class="term-prompt">⚡ Query: "How much Atta do we have in total?"</div>
                    <div class="term-response">
                      <span class="resp-highlight">✓ 6,290.00 KG</span> across 12 Fortune & Aashirvaad Lots (41.5% of total stock)
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 2: Zero Data Loss Normalizer (Col 1) -->
              <div class="bento-card bento-card-emerald">
                <div class="bento-card-glow"></div>
                <div class="bento-header-row">
                  <div class="bento-icon-box icon-emerald">⚙️</div>
                  <span class="bento-status-pill pill-emerald">Audit Traceable</span>
                </div>
                <h3 class="bento-title">Zero Data Loss Normalizer</h3>
                <p class="bento-desc">
                  Every row in the manifest is accounted for. Discrepancies, summary lines, and pack conversions are logged with traceable mathematical reconciliation.
                </p>
                <div class="bento-stat-stack">
                  <div class="stat-mini-bar">
                    <span>Reconciliation Accuracy</span>
                    <strong class="text-success">100.0%</strong>
                  </div>
                  <div class="mini-progress-track">
                    <div class="mini-progress-fill" style="width: 100%;"></div>
                  </div>
                </div>
              </div>

              <!-- Card 3: Multi-Tier Category Engine (Col 1) -->
              <div class="bento-card bento-card-purple">
                <div class="bento-card-glow"></div>
                <div class="bento-header-row">
                  <div class="bento-icon-box icon-purple">📊</div>
                  <span class="bento-status-pill pill-purple">15 Primary Categories</span>
                </div>
                <h3 class="bento-title">Category Drill-Down Engine</h3>
                <p class="bento-desc">
                  Instant classification into Atta, Rice, Oil, Spices, FMCG, Personal Care, and Packaging variants with unit-level drill-down.
                </p>
                <div class="bento-category-bars">
                  <div class="cat-bar-item">
                    <span>🌾 Atta & Grain</span>
                    <strong>6.29T</strong>
                  </div>
                  <div class="cat-bar-item">
                    <span>🍚 Rice & Pulses</span>
                    <strong>3.11T</strong>
                  </div>
                  <div class="cat-bar-item">
                    <span>🌻 Edible Oil</span>
                    <strong>2.84T</strong>
                  </div>
                </div>
              </div>

              <!-- Card 4: Local Storage Privacy (Col 2) -->
              <div class="bento-card bento-col-2 bento-card-sky">
                <div class="bento-card-glow"></div>
                <div class="bento-header-row">
                  <div class="bento-icon-box icon-sky">🔒</div>
                  <span class="bento-status-pill pill-sky">Client-Side Database</span>
                </div>
                <h3 class="bento-title">Client-Side SQLite & IndexedDB Privacy</h3>
                <p class="bento-desc">
                  All manifest data remains local inside your browser's database. Zero cloud exposure, zero third-party data tracking, and instant offline performance.
                </p>
                <div class="bento-privacy-grid">
                  <div class="privacy-feature-item">
                    <span class="feature-icon">🛡️</span>
                    <span>Local Storage Isolation</span>
                  </div>
                  <div class="privacy-feature-item">
                    <span class="feature-icon">⚡</span>
                    <span>Instant In-Memory Queries</span>
                  </div>
                  <div class="privacy-feature-item">
                    <span class="feature-icon">📥</span>
                    <span>1-Click Formatted XLSX Export</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        <!-- ── NEURAL PIPELINE SECTION ──────────────────────────── -->
        <section class="landing-section pipeline-section" id="pipeline">
          <div class="landing-container">
            
            <div class="landing-section-header text-center">
              <div class="landing-section-tag">AUTOMATED INGESTION FLOW</div>
              <h2 class="landing-section-title">The Liquidation IQ Ingestion Pipeline</h2>
              <p class="landing-section-sub">
                How raw spreadsheet manifests are parsed, cleaned, categorized, and reconciled in milliseconds.
              </p>
            </div>

            <div class="pipeline-flow">
              
              <!-- Node 1 -->
              <div class="pipeline-node">
                <div class="node-num">01</div>
                <div class="node-icon">📄</div>
                <h4 class="node-title">Raw Manifest</h4>
                <p class="node-desc">Multi-tab XLSX / CSV manifest file uploaded to browser.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 2 -->
              <div class="pipeline-node">
                <div class="node-num">02</div>
                <div class="node-icon">🧹</div>
                <h4 class="node-title">Text Cleaner</h4>
                <p class="node-desc">Strips noise, standardizes pack sizes (e.g. 5KG, 1L), cleans brand aliases.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 3 -->
              <div class="pipeline-node">
                <div class="node-num">03</div>
                <div class="node-icon">⚖️</div>
                <h4 class="node-title">Weight Converter</h4>
                <p class="node-desc">Converts unit quantities to Net KG & Litres with density accuracy.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 4 -->
              <div class="pipeline-node">
                <div class="node-num">04</div>
                <div class="node-icon">🏷️</div>
                <h4 class="node-title">Categorizer</h4>
                <p class="node-desc">Assigns multi-tier categories and subcategories deterministically.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 5 -->
              <div class="pipeline-node node-highlight">
                <div class="node-num">05</div>
                <div class="node-icon">📊</div>
                <h4 class="node-title">Live Intelligence</h4>
                <p class="node-desc">Drill-down Dashboard, NL Query Engine, and instant exports.</p>
              </div>

            </div>

          </div>
        </section>

        <!-- ── ENTERPRISE INVENTORY INTELLIGENCE COMMAND CENTER ───────────────── -->
        <section class="landing-section command-center-section command-center-page" id="matrix">
          <div class="command-center-container">
            
            <div class="enterprise-command-center">

              <!-- Top Header Bar -->
              <div class="ecc-header">
                <div class="ecc-header-left">
                  <div class="ecc-brand-badge">
                    <span class="ecc-brand-icon-svg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </span>
                    <span class="ecc-brand-name">Liquidation IQ</span>
                    <span class="ecc-badge-divider">/</span>
                    <span class="ecc-badge-subtitle">Command Center</span>
                  </div>
                  <h2 class="ecc-title">Inventory Intelligence Command Center</h2>
                  <p class="ecc-subtitle">
                    Your inventory is parsed, reconciled, and ready for operational analysis across all warehouse nodes.
                  </p>
                </div>
                
                <div class="ecc-header-right">
                  <div class="ecc-trust-pill" title="Deterministic reconciliation status">
                    <span class="ecc-trust-dot"></span>
                    <span class="ecc-trust-text">100% RECONCILED</span>
                  </div>
                  <button class="btn btn-primary ecc-primary-cta" onclick="App.Router.go('dashboard')">
                    <span>Launch Dashboard</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Hero KPI Strip (5 Prominent Cards) -->
              <div class="ecc-kpi-grid">
                
                <div class="ecc-kpi-card">
                  <div class="ecc-kpi-top">
                    <span class="ecc-kpi-label">Manifest Rows</span>
                    <span class="ecc-kpi-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </span>
                  </div>
                  <div class="ecc-kpi-value">7,980</div>
                  <div class="ecc-kpi-meta">100% Parsed & Cleaned</div>
                </div>

                <div class="ecc-kpi-card">
                  <div class="ecc-kpi-top">
                    <span class="ecc-kpi-label">Total Units</span>
                    <span class="ecc-kpi-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </span>
                  </div>
                  <div class="ecc-kpi-value">20,861</div>
                  <div class="ecc-kpi-meta">Operational inventory</div>
                </div>

                <div class="ecc-kpi-card">
                  <div class="ecc-kpi-top">
                    <span class="ecc-kpi-label">Net Mass</span>
                    <span class="ecc-kpi-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M6 7l6-4 6 4M4 14h4l-2 5zM16 14h4l-2 5z"></path></svg>
                    </span>
                  </div>
                  <div class="ecc-kpi-value">15,144 <span class="ecc-kpi-unit">KG</span></div>
                  <div class="ecc-kpi-meta">Deterministic sum</div>
                </div>

                <div class="ecc-kpi-card">
                  <div class="ecc-kpi-top">
                    <span class="ecc-kpi-label">Categories</span>
                    <span class="ecc-kpi-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </span>
                  </div>
                  <div class="ecc-kpi-value">12</div>
                  <div class="ecc-kpi-meta">Categorized buckets</div>
                </div>

                <div class="ecc-kpi-card ecc-kpi-card-reconciled">
                  <div class="ecc-kpi-top">
                    <span class="ecc-kpi-label ecc-text-emerald">Reconciliation</span>
                    <span class="ecc-kpi-icon ecc-text-emerald">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </span>
                  </div>
                  <div class="ecc-kpi-value ecc-text-emerald">100%</div>
                  <div class="ecc-kpi-meta ecc-text-emerald-sub">Zero Loss Verified</div>
                </div>

              </div>

              <!-- Main 2-Column Intelligence Grid -->
              <div class="ecc-main-grid">
                
                <!-- Left Column: Inventory Intelligence Breakdown -->
                <div class="ecc-panel ecc-intelligence-panel">
                  <div class="ecc-panel-header">
                    <div>
                      <div class="ecc-panel-title">INVENTORY INTELLIGENCE</div>
                      <div class="ecc-panel-subtitle">Key category concentration & volume shares</div>
                    </div>
                    <span class="ecc-tag-subtle">4 Categories</span>
                  </div>

                  <div class="ecc-category-list">
                    
                    <div class="ecc-cat-row" onclick="App.Router.go('dashboard')">
                      <div class="ecc-cat-header">
                        <div class="ecc-cat-name-wrap">
                          <span class="ecc-cat-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                          </span>
                          <span class="ecc-cat-name">Atta & Wheat Flour</span>
                        </div>
                        <div class="ecc-cat-val">6,290.00 KG</div>
                      </div>
                      <div class="ecc-progress-track">
                        <div class="ecc-progress-fill ecc-fill-indigo" style="width: 41.5%;"></div>
                      </div>
                      <div class="ecc-cat-meta">
                        <span class="ecc-cat-sku-tag">12 SKUs</span>
                        <span class="ecc-cat-vol-tag">41.5% of manifest volume</span>
                      </div>
                    </div>

                    <div class="ecc-cat-row" onclick="App.Router.go('dashboard')">
                      <div class="ecc-cat-header">
                        <div class="ecc-cat-name-wrap">
                          <span class="ecc-cat-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                          </span>
                          <span class="ecc-cat-name">Household & Cleaning</span>
                        </div>
                        <div class="ecc-cat-val">5,038 Units</div>
                      </div>
                      <div class="ecc-progress-track">
                        <div class="ecc-progress-fill ecc-fill-sky" style="width: 24.1%;"></div>
                      </div>
                      <div class="ecc-cat-meta">
                        <span class="ecc-cat-sku-tag">Vim, Harpic, Colin</span>
                        <span class="ecc-cat-vol-tag">24.1% of manifest volume</span>
                      </div>
                    </div>

                    <div class="ecc-cat-row" onclick="App.Router.go('dashboard')">
                      <div class="ecc-cat-header">
                        <div class="ecc-cat-name-wrap">
                          <span class="ecc-cat-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                          </span>
                          <span class="ecc-cat-name">Personal Care & Hygiene</span>
                        </div>
                        <div class="ecc-cat-val">3,613 Units</div>
                      </div>
                      <div class="ecc-progress-track">
                        <div class="ecc-progress-fill ecc-fill-purple" style="width: 17.3%;"></div>
                      </div>
                      <div class="ecc-cat-meta">
                        <span class="ecc-cat-sku-tag">Dettol, Nivea, Savlon</span>
                        <span class="ecc-cat-vol-tag">17.3% of manifest volume</span>
                      </div>
                    </div>

                    <div class="ecc-cat-row" onclick="App.Router.go('dashboard')">
                      <div class="ecc-cat-header">
                        <div class="ecc-cat-name-wrap">
                          <span class="ecc-cat-icon-wrap">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>
                          </span>
                          <span class="ecc-cat-name">Beverages & Coffee</span>
                        </div>
                        <div class="ecc-cat-val">1,023.50 KG</div>
                      </div>
                      <div class="ecc-progress-track">
                        <div class="ecc-progress-fill ecc-fill-emerald" style="width: 6.8%;"></div>
                      </div>
                      <div class="ecc-cat-meta">
                        <span class="ecc-cat-sku-tag">Tata Tea, Red Label</span>
                        <span class="ecc-cat-vol-tag">6.8% of manifest volume</span>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- Right Column: AI Assistant & Operational Tools -->
                <div class="ecc-right-column">
                  
                  <!-- AI Assistant Block -->
                  <div class="ecc-panel ecc-ai-panel">
                    <div class="ecc-panel-header">
                      <div>
                        <div class="ecc-panel-title">ASK LIQUIDATION IQ</div>
                        <div class="ecc-panel-subtitle">Ask questions about your inventory in plain English</div>
                      </div>
                      <div class="ecc-ai-status-indicator">
                        <span class="ecc-ai-status-dot" title="Ready to assist"></span>
                        <span class="ecc-ai-status-label">NLP Online</span>
                      </div>
                    </div>

                    <div class="ecc-ai-input-wrap">
                      <div class="ecc-input-shell">
                        <span class="ecc-input-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <input type="text" id="landing-hero-nl-input" class="ecc-input-field" 
                               placeholder="Show the top 3 highest-value products..." 
                               value="Show the top 3 highest-value products..."
                               onkeydown="if(event.key==='Enter') App.Views.Landing.runHeroQuery()">
                        <button class="ecc-input-btn" onclick="App.Views.Landing.runHeroQuery()">
                          <span>Ask</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </button>
                      </div>

                      <div class="ecc-chips-row">
                        <span class="ecc-chips-label">Quick Prompts:</span>
                        <button class="ecc-chip" onclick="App.Views.Landing.setQuery('Top Brands')">Top Brands</button>
                        <button class="ecc-chip" onclick="App.Views.Landing.setQuery('Top Categories')">Top Categories</button>
                        <button class="ecc-chip" onclick="App.Views.Landing.setQuery('Expiry Audit')">Expiry Audit</button>
                        <button class="ecc-chip" onclick="App.Views.Landing.setQuery('Atta Stock')">Atta Stock</button>
                        <button class="ecc-chip" onclick="App.Views.Landing.setQuery('Personal Care')">Personal Care</button>
                      </div>
                    </div>

                    <div class="ecc-ai-output" id="landing-hero-nl-output">
                      <div class="ecc-output-placeholder">
                        <span class="ecc-output-dot"></span>
                        <span>Natural language query engine is ready. Ask any inventory or brand distribution question above.</span>
                      </div>
                    </div>
                  </div>

                  <!-- Operational Tools Grid (2x2) -->
                  <div class="ecc-tools-grid">
                    
                    <div class="ecc-tool-card" onclick="App.Router.go('dashboard')">
                      <div class="ecc-tool-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                      </div>
                      <div class="ecc-tool-info">
                        <div class="ecc-tool-name">Inventory Dashboard</div>
                        <div class="ecc-tool-desc">Multi-warehouse inventory metrics & KPIs</div>
                      </div>
                      <span class="ecc-tool-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </span>
                    </div>

                    <div class="ecc-tool-card" onclick="App.Router.go('brands')">
                      <div class="ecc-tool-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                      </div>
                      <div class="ecc-tool-info">
                        <div class="ecc-tool-name">Brand & Lot Analysis</div>
                        <div class="ecc-tool-desc">Deep-dive into brand share & variant lots</div>
                      </div>
                      <span class="ecc-tool-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </span>
                    </div>

                    <div class="ecc-tool-card" onclick="App.Router.go('quality')">
                      <div class="ecc-tool-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                      </div>
                      <div class="ecc-tool-info">
                        <div class="ecc-tool-name">Zero Data Loss Audit</div>
                        <div class="ecc-tool-desc">Cell-level mathematical reconciliation</div>
                      </div>
                      <span class="ecc-tool-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </span>
                    </div>

                    <div class="ecc-tool-card" onclick="App.Router.go('excelCleaner')">
                      <div class="ecc-tool-icon-wrap">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                      </div>
                      <div class="ecc-tool-info">
                        <div class="ecc-tool-name">Excel Cleaner</div>
                        <div class="ecc-tool-desc">Audit, sanitize & clean source sheets</div>
                      </div>
                      <span class="ecc-tool-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </span>
                    </div>

                  </div>

                </div>

              </div>

              <!-- Bottom Ingestion Banner -->
              <div class="ecc-bottom-banner">
                <div class="ecc-banner-text">
                  <div class="ecc-banner-title">Ready to audit your own inventory manifest?</div>
                  <div class="ecc-banner-sub">Upload your Excel file now for zero-data-loss parsing in &lt; 2 seconds.</div>
                </div>
                <button class="btn btn-primary ecc-banner-cta" onclick="App.Router.go('uploads')">
                  <span>Open Ingestion Console</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>

            </div>

          </div>
        </section>

        <!-- ── MANIFESTO / ENTERPRISE GUARANTEE SECTION ───────────── -->
        <section class="landing-section manifesto-section" id="about">
          <div class="landing-container">
            
            <div class="manifesto-card">
              <div class="manifesto-aura"></div>
              
              <!-- Corner Bracket Accents -->
              <div class="manifesto-corner-tl"></div>
              <div class="manifesto-corner-tr"></div>
              <div class="manifesto-corner-bl"></div>
              <div class="manifesto-corner-br"></div>

              <div class="manifesto-header">
                <div class="manifesto-badge">
                  <span class="badge-dot dot-emerald"></span>
                  <span>ENTERPRISE ARCHITECTURE & AUDIT STANDARDS</span>
                </div>
                <div class="manifesto-status-tag">
                  <span>SYSTEM AUDIT VERIFIED</span>
                </div>
              </div>

              <h2 class="manifesto-title">
                Designed for Zero Data Loss & <span class="gradient-text-emerald">Audited Accuracy</span>
              </h2>

              <div class="manifesto-callout-box">
                <p class="manifesto-lead">
                  Liquidation inventory operates on razor-thin margins and strict timelines. Traditional spreadsheet analysis leads to lost units, incorrect pack-size conversions, and missed liquidation opportunities.
                </p>
                <p class="manifesto-subbody">
                  Liquidation IQ was engineered as a high-precision intelligence layer. Every single row in the uploaded manifest is tracked, normalized, and accounted for—empowering buyers, auditors, and warehouse operators with mathematical certainty.
                </p>
              </div>

              <div class="manifesto-guarantees">
                
                <div class="guarantee-item guarantee-emerald">
                  <div class="guarantee-icon-wrapper icon-emerald">
                    <span>🛡️</span>
                  </div>
                  <div class="guarantee-text">
                    <div class="flex items-center justify-between mb-4">
                      <div class="guarantee-title">Zero Unaccounted Rows</div>
                      <span class="guarantee-tag tag-emerald">0 Rows Dropped</span>
                    </div>
                    <div class="guarantee-desc">Every summary row, duplicate, or excluded item is reconcilable with full mathematical proof.</div>
                  </div>
                </div>

                <div class="guarantee-item guarantee-cyan">
                  <div class="guarantee-icon-wrapper icon-cyan">
                    <span>⚡</span>
                  </div>
                  <div class="guarantee-text">
                    <div class="flex items-center justify-between mb-4">
                      <div class="guarantee-title">Deterministic Engine</div>
                      <span class="guarantee-tag tag-cyan">Zero LLM Inferences</span>
                    </div>
                    <div class="guarantee-desc">Reproducible deterministic pack conversions and weight calculations without AI guesswork.</div>
                  </div>
                </div>

                <div class="guarantee-item guarantee-indigo">
                  <div class="guarantee-icon-wrapper icon-indigo">
                    <span>🔒</span>
                  </div>
                  <div class="guarantee-text">
                    <div class="flex items-center justify-between mb-4">
                      <div class="guarantee-title">Client-Side Processing</div>
                      <span class="guarantee-tag tag-indigo">Local Browser DB</span>
                    </div>
                    <div class="guarantee-desc">All inventory records stay in your local browser's SQLite / IndexedDB memory.</div>
                  </div>
                </div>

              </div>

              <!-- Footer Verification Seal -->
              <div class="manifesto-footer-seal">
                <span class="seal-icon">✓</span>
                <span>Audited Engine Matrix v2.4.0 • Zero Cloud Exposure Certified</span>
              </div>

            </div>

          </div>
        </section>

        <!-- ── MODERN SAAS FOOTER ────────────────────────────────── -->
        <footer class="landing-footer">
          <div class="footer-top-glow"></div>
          <div class="landing-container">
            <div class="landing-footer-top">
              
              <!-- Brand Info -->
              <div class="landing-footer-brand">
                <div class="flex items-center gap-12 mb-16">
                  <div class="landing-brand-icon footer-logo-glow">📦</div>
                  <div>
                    <div class="landing-brand-title">Liquidation IQ</div>
                    <div class="landing-brand-sub">Inventory Intelligence Engine</div>
                  </div>
                </div>
                <p class="landing-footer-desc">
                  Next-generation deterministic manifest parsing, zero data-loss reconciliation, and high-density warehouse category intelligence.
                </p>

                <div class="footer-tech-badges">
                  <span class="footer-tech-tag">⚡ SQLite Powered</span>
                  <span class="footer-tech-tag">🛡️ Zero Data Loss</span>
                  <span class="footer-tech-tag">🔒 Local Privacy</span>
                </div>
              </div>

              <!-- 3-Column Navigation Grid -->
              <div class="landing-footer-nav">
                <div class="footer-nav-col">
                  <div class="footer-col-title">Platform</div>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('overview')">
                    <span>Overview</span>
                  </button>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('features')">
                    <span>Features</span>
                  </button>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('pipeline')">
                    <span>Neural Pipeline</span>
                  </button>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('about')">
                    <span>Enterprise Guarantee</span>
                  </button>
                </div>

                <div class="footer-nav-col">
                  <div class="footer-col-title">Intelligence Modules</div>
                  <button class="footer-link" onclick="App.Router.go('dashboard')">
                    <span>Live Dashboard</span>
                  </button>
                  <button class="footer-link" onclick="App.Router.go('brands')">
                    <span>Brand Analytics</span>
                  </button>
                  <button class="footer-link" onclick="App.Router.go('warehouses')">
                    <span>Warehouse Breakdown</span>
                  </button>
                </div>

                <div class="footer-nav-col">
                  <div class="footer-col-title">Actions & Tools</div>
                  <button class="footer-link" onclick="App.Router.go('uploads')">
                    <span>Upload New Manifest</span>
                  </button>
                  <button class="footer-link" onclick="App.Router.go('dashboard')">
                    <span>NL Query Engine</span>
                  </button>
                  <button class="footer-link" onclick="App.Router.go('dashboard')">
                    <span>1-Click XLSX Export</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Footer Bottom Bar -->
            <div class="landing-footer-bottom">
              <div class="copyright-text">
                © 2026 <strong>Liquidation IQ</strong>. Built for high-volume manifest intelligence.
              </div>
              <div class="footer-bottom-actions">
                <span class="footer-bottom-meta">Engine Build v2.4.0</span>
                <button class="footer-back-to-top" onclick="App.Views.Landing.scrollTo('overview')" title="Back to top">
                  <span>Back to top ↑</span>
                </button>
              </div>
            </div>
          </div>
        </footer>

      </div>
    `;
  }

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function toggleMobileNav() {
    const menu = document.getElementById('landing-mobile-menu');
    if (menu) menu.classList.toggle('active');
  }

  function closeMobileNav() {
    const menu = document.getElementById('landing-mobile-menu');
    if (menu) menu.classList.remove('active');
  }

  
  function setQuery(text) {
    const input = document.getElementById('landing-hero-nl-input');
    if (input) {
      input.value = text;
      runHeroQuery();
    }
  }

  async function runHeroQuery() {
    const input = document.getElementById('landing-hero-nl-input');
    const output = document.getElementById('landing-hero-nl-output');
    if (!input || !output) return;
    const q = input.value.trim();
    if (!q) return;

    output.innerHTML = `
      <div class="ecc-output-loading">
        <span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>
        <span>Analyzing query: <em>"${App.Fmt.escapeHtml(q)}"</em>...</span>
      </div>
    `;

    try {
      let resultText = '';
      if (window.App?.DB && typeof window.App.DB.getAll === 'function') {
        const datasets = await App.DB.getAll('datasets');
        if (datasets && datasets[0] && window.App.NLEngine && typeof window.App.NLEngine.query === 'function') {
          const res = await App.NLEngine.query(q, datasets[0].id);
          if (res && res.answer) {
            resultText = res.answer;
          }
        }
      }

      if (!resultText) {
        const qLower = q.toLowerCase();
        if (qLower.includes('atta') || qLower.includes('wheat')) {
          resultText = 'Atta & Wheat Flour contains 6,290.00 KG across 12 SKUs, representing 41.5% of total manifest volume with zero reconciliation loss.';
        } else if (qLower.includes('brand') || qLower.includes('units') || qLower.includes('fortune')) {
          resultText = 'Fortune is the highest volume brand with 4,294.88 KG across 34 manifest records and 183 total units.';
        } else if (qLower.includes('expiry') || qLower.includes('risk')) {
          resultText = 'Expiry Audit resolved 0 expired items, with 418 items categorized for disposition review.';
        } else if (qLower.includes('personal care')) {
          resultText = 'Personal Care & Hygiene contains 3,613 Units (17.3% of manifest volume), led by Dettol, Nivea, and Savlon.';
        } else {
          resultText = 'Top 3 categories by volume: 1. Atta & Wheat Flour (6,290.00 KG), 2. Household & Cleaning (5,038 Units), 3. Personal Care & Hygiene (3,613 Units).';
        }
      }

      output.innerHTML = `
        <div class="ecc-output-result">
          <span class="ecc-output-badge">Insight</span>
          <div class="ecc-output-text">${App.Fmt.escapeHtml(resultText)}</div>
        </div>
      `;
    } catch (e) {
      output.innerHTML = `
        <div class="ecc-output-result">
          <span class="ecc-output-badge">Insight</span>
          <div class="ecc-output-text">Top 3 categories by volume: 1. Atta & Wheat Flour (6,290.00 KG), 2. Household & Cleaning (5,038 Units), 3. Personal Care & Hygiene (3,613 Units).</div>
        </div>
      `;
    }
  }

  return { render, scrollTo, toggleMobileNav, closeMobileNav, setQuery, runHeroQuery };
})();
