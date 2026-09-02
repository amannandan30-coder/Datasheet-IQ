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
                <div class="pill-stat tag-green"><span>100% Deterministic</span></div>
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
                  <span class="bento-status-pill pill-emerald">100% Audit Proof</span>
                </div>
                <h3 class="bento-title">Zero Data Loss Normalizer</h3>
                <p class="bento-desc">
                  Every row in the manifest is accounted for. Discrepancies, summary lines, and pack conversions are logged with 100% mathematical certainty.
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
                    <span>100% Local Encryption</span>
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

        <!-- ── COMMAND & CONTROL MATRIX SECTION ───────────────── -->
        <section class="landing-section matrix-section" id="matrix">
          <div class="stage-4-container">
            
            <div class="hud-command-center animate-hud">
              <div class="hud-corner-tl"></div>
              <div class="hud-corner-tr"></div>
              <div class="hud-corner-bl"></div>
              <div class="hud-corner-br"></div>

              <!-- Top Header Bar -->
              <div class="command-header">
                <div class="flex items-center gap-12">
                  <div class="hud-pulse-dot dot-cyan"></div>
                  <span class="command-status-tag">COMMAND & CONTROL MATRIX ACTIVE</span>
                </div>
                <div class="command-live-time">
                  <span class="live-dot"></span>
                  <span>100% RECONCILED</span>
                </div>
              </div>

              <!-- Headline & Subtitle -->
              <div class="command-title-wrap">
                <h2 class="command-headline">
                  Complete Liquidation <span class="gradient-text-cyan">Intelligence Control</span>
                </h2>
                <p class="command-sub">
                  Your inventory manifest is fully parsed, structured, and ready for instant decision making. Explore category drill-downs, brand breakdown, and zero-loss audit reports.
                </p>
              </div>

              <!-- Main 2-Column Grid -->
              <div class="command-grid">
                
                <!-- Left Column: Live Inventory Snapshot -->
                <div class="command-card-left">
                  <div class="command-card-label">parsed inventory snapshot</div>
                  <div class="command-metrics-list">
                    <div class="command-metric-item">
                      <div class="metric-icon">🌾</div>
                      <div class="metric-info">
                        <div class="metric-title">Atta & Wheat Flour</div>
                        <div class="metric-detail">6,290.00 KG • Fortified & Chakki Fresh</div>
                      </div>
                      <div class="metric-tag tag-green">VERIFIED</div>
                    </div>

                    <div class="command-metric-item">
                      <div class="metric-icon">🍚</div>
                      <div class="metric-info">
                        <div class="metric-title">Rice & Pulses</div>
                        <div class="metric-detail">3,115.00 KG • Premium Basmati & Kolam</div>
                      </div>
                      <div class="metric-tag tag-green">VERIFIED</div>
                    </div>

                    <div class="command-metric-item">
                      <div class="metric-icon">🧴</div>
                      <div class="metric-info">
                        <div class="metric-title">Personal Care & FMCG</div>
                        <div class="metric-detail">1,480 Units • Soaps, Shampoo, Detergent</div>
                      </div>
                      <div class="metric-tag tag-blue">PARSED</div>
                    </div>
                  </div>
                </div>

                <!-- Right Column: Launchpad & Quick Tools -->
                <div class="command-card-right">
                  <div class="command-card-label">system launchpad</div>
                  
                  <button class="btn btn-primary btn-lg command-launch-btn" onclick="App.Router.go('dashboard')">
                    <span class="btn-glow-bg"></span>
                    <span>Launch Live Dashboard</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>

                  <div class="command-quick-tools">
                    <div class="quick-tool-chip" onclick="App.Router.go('dashboard')">
                      <span class="chip-icon">🤖</span>
                      <span>Natural Language AI Chat</span>
                    </div>
                    <div class="quick-tool-chip" onclick="App.Router.go('brands')">
                      <span class="chip-icon">🏷️</span>
                      <span>Brand & Lot Analysis</span>
                    </div>
                    <div class="quick-tool-chip" onclick="App.Router.go('quality')">
                      <span class="chip-icon">🛡️</span>
                      <span>Zero Data Loss Audit</span>
                    </div>
                    <div class="quick-tool-chip" onclick="App.Router.go('uploads')">
                      <span class="chip-icon">📥</span>
                      <span>1-Click XLSX Export</span>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Footer Ticker Line -->
              <div class="command-footer-ticker">
                <div class="ticker-item"><span>⚡ Database:</span> SQLite & IndexedDB Ready</div>
                <div class="ticker-divider">•</div>
                <div class="ticker-item"><span>📊 Manifest SKUs:</span> 7,980 Parsed</div>
                <div class="ticker-divider">•</div>
                <div class="ticker-item"><span>⚖️ Net Weight:</span> 15,144.22 KG Reconciled</div>
              </div>

            </div>

          </div>
        </section>

        <!-- ── ABOUT / ENTERPRISE TRUST SECTION ─────────────────── -->
        <section class="landing-section about-section" id="about">
          <div class="landing-container">
            <div class="manifesto-card">
              <div class="manifesto-badge">
                <span class="badge-dot"></span>
                <span>ENTERPRISE GUARANTEE</span>
              </div>

              <h2 class="manifesto-title">Designed for Zero Data Loss & Absolute Accuracy</h2>

              <p class="manifesto-body">
                Liquidation inventory operates on razor-thin margins and strict timelines. Traditional spreadsheet analysis leads to lost units, incorrect pack-size conversions, and missed liquidation opportunities.
              </p>

              <p class="manifesto-subbody">
                Liquidation IQ was engineered as a high-precision intelligence layer. Every single row in the uploaded manifest is tracked, normalized, and accounted for—empowering buyers, auditors, and warehouse operators with mathematical certainty.
              </p>

              <div class="manifesto-guarantees">
                <div class="guarantee-item">
                  <div class="guarantee-icon">🛡️</div>
                  <div class="guarantee-text">
                    <div class="guarantee-title">Zero Data Loss</div>
                    <div class="guarantee-desc">Every summary row, duplicate, or excluded row is logged and reconcilable.</div>
                  </div>
                </div>

                <div class="guarantee-item">
                  <div class="guarantee-icon">⚡</div>
                  <div class="guarantee-text">
                    <div class="guarantee-title">Deterministic Normalization</div>
                    <div class="guarantee-desc">100% reproducible results without AI hallucination or guesswork.</div>
                  </div>
                </div>

                <div class="guarantee-item">
                  <div class="guarantee-icon">🔒</div>
                  <div class="guarantee-text">
                    <div class="guarantee-title">100% Client-Side Privacy</div>
                    <div class="guarantee-desc">All inventory records stay in your local browser database.</div>
                  </div>
                </div>
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

  return { render, scrollTo, toggleMobileNav, closeMobileNav };
})();
