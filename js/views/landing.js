window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   LIQUIDATION IQ — CINEMATIC SCROLL-DRIVEN LANDING PAGE
   Futuristic AI Warehouse Storyboard Scrubbing Engine (240 Frames)
   ============================================================ */
App.Views.Landing = (() => {

  // Cleanup reference for scroll & resize listeners
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
            <div class="landing-brand" onclick="App.Views.Landing.scrollTo('hero-track')" role="button" tabindex="0">
              <div class="landing-brand-icon">📦</div>
              <div>
                <div class="landing-brand-title">Liquidation IQ</div>
                <div class="landing-brand-sub">Inventory Intelligence</div>
              </div>
            </div>

            <!-- Desktop Nav Links -->
            <nav class="landing-links" aria-label="Main Navigation">
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('hero-track')">Overview</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('features')">Features</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('pipeline')">Pipeline</button>
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
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('hero-track'); App.Views.Landing.closeMobileNav()">Overview</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('features'); App.Views.Landing.closeMobileNav()">Features</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('pipeline'); App.Views.Landing.closeMobileNav()">Pipeline</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('about'); App.Views.Landing.closeMobileNav()">About</button>
            <button class="btn btn-primary btn-md w-full mt-12" onclick="App.Router.go('dashboard')">Open Dashboard</button>
          </div>
        </header>

        <!-- ── CINEMATIC HERO SCROLL TRACK (450vh) ────────────────── -->
        <section class="landing-scroll-track" id="hero-track">
          <div class="landing-canvas-sticky">
            
            <!-- Background Canvas scrubbing 240 frames -->
            <canvas id="hero-scroll-canvas" aria-hidden="true"></canvas>

            <!-- Cinematic Vignette & Depth Overlays -->
            <div class="landing-canvas-vignette"></div>
            <div class="landing-canvas-gradient-bottom"></div>

            <!-- ── SYNCHRONIZED STORYBOARD STAGES ─────────────────── -->
            <div class="landing-stage-overlay">

              <!-- STAGE 1: Frames 001 - 060 (Autonomous Ingestion & Scan) -->
              <div class="landing-stage active" id="stage-1">
                <div class="landing-stage-inner text-center">
                  <div class="landing-stage-badge">
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

                  <div class="landing-stage-actions">
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
                </div>
              </div>

              <!-- STAGE 2: Frames 061 - 120 (Neural Normalization Core) -->
              <div class="landing-stage" id="stage-2">
                <div class="landing-stage-grid stage-2-layout">
                  <div class="hud-glass-card animate-hud">
                    <div class="hud-card-header">
                      <div class="flex items-center gap-8">
                        <div class="hud-pulse-dot"></div>
                        <span class="hud-title-tag">CORE PIPELINE ACTIVATION</span>
                      </div>
                      <span class="hud-status-badge">100% DETERMINISTIC</span>
                    </div>

                    <h2 class="hud-headline">Neural Normalization Core</h2>
                    <p class="hud-desc">
                      Raw manifest text streams directly into the normalization engine, standardizing inconsistent brand names, packaging units, and liquid densities.
                    </p>

                    <div class="hud-metrics-row">
                      <div class="hud-metric-box">
                        <div class="hud-metric-val">7,980</div>
                        <div class="hud-metric-lbl">SKUs Parsed</div>
                      </div>
                      <div class="hud-metric-box">
                        <div class="hud-metric-val">20,861</div>
                        <div class="hud-metric-lbl">Units Standardized</div>
                      </div>
                      <div class="hud-metric-box">
                        <div class="hud-metric-val">15</div>
                        <div class="hud-metric-lbl">Primary Categories</div>
                      </div>
                      <div class="hud-metric-box">
                        <div class="hud-metric-val">0</div>
                        <div class="hud-metric-lbl">Data Loss</div>
                      </div>
                    </div>

                    <div class="hud-footer-tag">
                      <span class="tag-icon">⚡</span>
                      <span>Real-time Manifest Ingestion active</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- STAGE 3: Frames 121 - 180 (Holographic Decision Intelligence) -->
              <div class="landing-stage" id="stage-3">
                <div class="landing-stage-grid stage-3-layout">
                  <div class="hud-glass-card hud-right-card animate-hud">
                    <div class="hud-card-header">
                      <div class="flex items-center gap-8">
                        <div class="hud-pulse-dot dot-emerald"></div>
                        <span class="hud-title-tag">DECISION INTELLIGENCE MATRIX</span>
                      </div>
                      <span class="hud-status-badge badge-emerald">AUDIT READY</span>
                    </div>

                    <h2 class="hud-headline">Holographic Inventory HUD</h2>
                    <p class="hud-desc">
                      Dynamic valuation algorithms synthesize lot metrics into instant actionable insights, highlighting near-expiry inventory and high-value brand clusters.
                    </p>

                    <div class="hud-key-stats">
                      <div class="hud-stat-pill">
                        <div class="pill-icon">💰</div>
                        <div>
                          <div class="pill-val">₹35,47,255.97</div>
                          <div class="pill-lbl">Verified Lot Valuation</div>
                        </div>
                      </div>
                      <div class="hud-stat-pill">
                        <div class="pill-icon">⚖️</div>
                        <div>
                          <div class="pill-val">15.14 Tonnes</div>
                          <div class="pill-lbl">Normalized Stock Weight</div>
                        </div>
                      </div>
                      <div class="hud-stat-pill">
                        <div class="pill-icon">⚠️</div>
                        <div>
                          <div class="pill-val">Near-Expiry & Damaged</div>
                          <div class="pill-lbl">Real-time Quality Triage</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- STAGE 4: Frames 181 - 240 (Complete Liquidation Control) -->
              <div class="landing-stage" id="stage-4">
                <div class="landing-stage-inner text-center">
                  <div class="hud-launch-card animate-hud">
                    <div class="landing-stage-badge">
                      <span class="landing-stage-badge-dot dot-cyan"></span>
                      <span>SYSTEMS FULLY SYNCHRONIZED</span>
                    </div>

                    <h2 class="landing-hero-title launch-title">
                      Complete Liquidation Control
                    </h2>

                    <p class="landing-hero-sub launch-sub">
                      Your liquidation inventory is ready for action. Seamlessly drill down from multi-warehouse lots into brands, product families, and unit variants.
                    </p>

                    <div class="landing-stage-actions justify-center">
                      <button class="btn btn-primary btn-lg landing-hero-btn launch-btn" onclick="App.Router.go('dashboard')">
                        <span>Launch Live Dashboard →</span>
                      </button>
                    </div>

                    <div class="launch-card-tags">
                      <span class="about-pill">✓ SQLite & IndexedDB Ready</span>
                      <span class="about-pill">✓ Conversational AI Connected</span>
                      <span class="about-pill">✓ 1-Click XLSX Export</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- ── BENTO FEATURES GRID SECTION ───────────────────────── -->
        <section class="landing-section" id="features">
          <div class="landing-container">
            
            <div class="landing-section-header text-center">
              <div class="landing-section-tag">ENGINEERED FOR SCALE</div>
              <h2 class="landing-section-title">Comprehensive Inventory Intelligence</h2>
              <p class="landing-section-sub">
                Designed to solve the hardest problems in inventory liquidation — from messy unstructured manifests to instant financial reconciliation.
              </p>
            </div>

            <div class="bento-grid">
              
              <!-- Card 1: Normalization -->
              <div class="bento-card bento-col-2">
                <div class="bento-icon-box icon-indigo">🔬</div>
                <h3 class="bento-title">Smart Normalization Engine</h3>
                <p class="bento-desc">
                  Strips corporate suffixes, irregular pack-size strings, and messy SKU variations. Automatically extracts clean brand names, packaging units, and volumetric densities without altering raw data.
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">Deterministic Parsing</span>
                  <span class="bento-tag">Fluid & Solid Density Rules</span>
                </div>
              </div>

              <!-- Card 2: Category Hierarchy -->
              <div class="bento-card">
                <div class="bento-icon-box icon-emerald">🏷️</div>
                <h3 class="bento-title">Category Drill-Down Hierarchy</h3>
                <p class="bento-desc">
                  Instant 4-tier drill-down: Category → Subcategory → Brand → SKU Variant. Explore quantities, values, and weight profiles in real time.
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">15 Categories</span>
                </div>
              </div>

              <!-- Card 3: AI Assistant -->
              <div class="bento-card">
                <div class="bento-icon-box icon-purple">🤖</div>
                <h3 class="bento-title">Natural Language AI Assistant</h3>
                <p class="bento-desc">
                  Ask natural questions in plain English or Hinglish: "How much atta do we have?", "Top brands by value", or "Damaged stock in Gurgaon".
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">Zero-Hallucination Query Engine</span>
                </div>
              </div>

              <!-- Card 4: Warehouse Intelligence -->
              <div class="bento-card bento-col-2">
                <div class="bento-icon-box icon-sky">🏭</div>
                <h3 class="bento-title">Multi-Warehouse Stock Distribution</h3>
                <p class="bento-desc">
                  Compare inventory across fulfillment centers and warehouse hubs. Track unit counts, gross weight in tonnes, and MRP valuations with automated discrepancy detection.
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">Facility Stock Balancing</span>
                  <span class="bento-tag">Damaged & Near-Expiry Isolation</span>
                </div>
              </div>

              <!-- Card 5: Quality Assurance -->
              <div class="bento-card">
                <div class="bento-icon-box icon-amber">⚠️</div>
                <h3 class="bento-title">Quality Assurance & Lot Reconciliation</h3>
                <p class="bento-desc">
                  Isolate damaged units, near-expiry lots, and unresolvable items. Audit total source rows against processed rows with full mathematical proof.
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">Forensic Audit Gates</span>
                </div>
              </div>

              <!-- Card 6: Data Export -->
              <div class="bento-card bento-col-2">
                <div class="bento-icon-box icon-rose">📥</div>
                <h3 class="bento-title">Instant XLSX & CSV Export Engine</h3>
                <p class="bento-desc">
                  Generate presentation-ready, cleaned Excel and CSV workbooks with all normalized fields, weight metrics, and financial calculations ready for downstream ERP integration.
                </p>
                <div class="bento-badge-row">
                  <span class="bento-tag">Formatted Excel (.xlsx)</span>
                  <span class="bento-tag">Raw CSV Export</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        <!-- ── DETERMINISTIC PIPELINE ARCHITECTURE SECTION ──────── -->
        <section class="landing-section pipeline-section" id="pipeline">
          <div class="landing-container">
            
            <div class="landing-section-header text-center">
              <div class="landing-section-tag">DATA INTEGRITY PIPELINE</div>
              <h2 class="landing-section-title">From Raw Manifest to Actionable Intelligence</h2>
              <p class="landing-section-sub">
                Our 5-stage deterministic engine processes raw manifests without altering source truths or injecting synthetic records.
              </p>
            </div>

            <div class="pipeline-flow">
              
              <!-- Node 1 -->
              <div class="pipeline-node">
                <div class="node-num">01</div>
                <div class="node-icon">📂</div>
                <h4 class="node-title">Raw Manifest</h4>
                <p class="node-desc">Reads complex multi-sheet Excel & CSV workbooks with messy headers.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 2 -->
              <div class="pipeline-node">
                <div class="node-num">02</div>
                <div class="node-icon">🧹</div>
                <h4 class="node-title">Smart Cleaner</h4>
                <p class="node-desc">Excludes totals, cleans noise, parses dates, and sanitizes values.</p>
              </div>

              <div class="pipeline-connector">
                <div class="connector-line"></div>
                <div class="connector-pulse"></div>
              </div>

              <!-- Node 3 -->
              <div class="pipeline-node">
                <div class="node-num">03</div>
                <div class="node-icon">🔬</div>
                <h4 class="node-title">Product Engine</h4>
                <p class="node-desc">Extracts clean brands, pack sizes, and canonical weight metrics.</p>
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

        <!-- ── CINEMATIC CLOSING CTA ─────────────────────────────── -->
        <section class="landing-section cta-section">
          <div class="landing-container">
            <div class="closing-cta-card">
              <div class="cta-glow-effect"></div>
              
              <div class="landing-stage-badge">
                <span class="landing-stage-badge-dot"></span>
                <span>INSTANT DEPLOYMENT</span>
              </div>

              <h2 class="closing-cta-title">
                Ready to Turn Liquidation Inventory into Actionable Intelligence?
              </h2>

              <p class="closing-cta-sub">
                Launch the application now to analyze lots, inspect high-value brands, and query inventory instantly.
              </p>

              <button class="btn btn-primary btn-lg closing-cta-btn" onclick="App.Router.go('dashboard')">
                <span>Open Dashboard</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
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

                <div class="system-status-pill mt-16">
                  <span class="status-indicator-dot"></span>
                  <span>Neural Ingestion Core Operational</span>
                </div>
              </div>

              <!-- 3-Column Navigation Grid -->
              <div class="landing-footer-nav">
                <div class="footer-nav-col">
                  <div class="footer-col-title">Platform</div>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('hero-track')">
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
                  <button class="footer-link" onclick="App.Router.go('quality')">
                    <span>Data Reconciliation</span>
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
                <button class="footer-back-to-top" onclick="App.Views.Landing.scrollTo('hero-track')" title="Back to top">
                  <span>Back to top ↑</span>
                </button>
              </div>
            </div>
          </div>
        </footer>

      </div>
    `;

    // Initialize the GPU-Accelerated Scroll Scrubbing Engine
    initScrollEngine();
  }

  /* ── 240-FRAME CANVAS SCROLL SCRUBBING ENGINE ────────────── */
  function initScrollEngine() {
    const canvas = document.getElementById('hero-scroll-canvas');
    const track = document.getElementById('hero-track');
    const scrubBar = document.getElementById('scrub-bar');
    const scrubLabel = document.getElementById('scrub-label');

    if (!canvas || !track) return;
    const ctx = canvas.getContext('2d');

    const TOTAL_FRAMES = 240;
    const FRAME_ASPECT = 1280 / 720; // 16:9
    const frames = new Array(TOTAL_FRAMES + 1);
    let currentRenderedFrame = -1;
    let isRendering = false;
    let destroyed = false;

    // High performance device pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resizeCanvas() {
      if (destroyed || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        currentRenderedFrame = -1; // force redraw on next frame
        renderCurrentFrame();
      }
    }

    // Format path to frame: assets/frames/frame-0001.jpg
    function getFramePath(index) {
      const padded = String(index).padStart(4, '0');
      return `assets/frames/frame-${padded}.jpg`;
    }

    // Load single image with cache
    function loadFrame(index, callback) {
      if (frames[index]) {
        if (callback && frames[index].complete) callback(frames[index]);
        return frames[index];
      }
      const img = new Image();
      img.src = getFramePath(index);
      img.onload = () => {
        if (callback && !destroyed) callback(img);
        // If this newly loaded frame is close to what we need, redraw
        if (Math.abs(targetFrameIndex - index) < 3) {
          renderCurrentFrame();
        }
      };
      frames[index] = img;
      return img;
    }

    // Find nearest loaded frame for zero-flicker scrubbing
    function getNearestLoadedFrame(targetIdx) {
      if (frames[targetIdx] && frames[targetIdx].complete) {
        return frames[targetIdx];
      }
      // Look forward and backward
      for (let offset = 1; offset < 30; offset++) {
        const back = targetIdx - offset;
        if (back >= 1 && frames[back] && frames[back].complete) {
          return frames[back];
        }
        const fwd = targetIdx + offset;
        if (fwd <= TOTAL_FRAMES && frames[fwd] && frames[fwd].complete) {
          return frames[fwd];
        }
      }
      // Fallback to frame 1
      return (frames[1] && frames[1].complete) ? frames[1] : null;
    }

    // Draw the image filling the canvas (aspect cover, top-aligned)
    function drawImageCover(img) {
      if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const canvasAspect = cw / ch;

      let drawW, drawH, drawX, drawY;

      if (canvasAspect > FRAME_ASPECT) {
        drawW = cw;
        drawH = cw / FRAME_ASPECT;
        drawX = 0;
        drawY = 0; // top-aligned: never crop the top
      } else {
        drawH = ch;
        drawW = ch * FRAME_ASPECT;
        drawX = (cw - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    let targetFrameIndex = 1;

    function renderCurrentFrame() {
      if (destroyed || !canvas) return;
      const img = getNearestLoadedFrame(targetFrameIndex);
      if (img && img !== currentRenderedFrame) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImageCover(img);
        currentRenderedFrame = img;
      }
    }

    // Progressive loading pipeline
    function startProgressiveLoading() {
      // 1. Immediately load frame 1 for instant first paint
      loadFrame(1, (img) => {
        resizeCanvas();
        drawImageCover(img);
        currentRenderedFrame = img;

        // 2. Load intermediate milestone frames (every 10th frame)
        for (let i = 10; i <= TOTAL_FRAMES; i += 10) {
          loadFrame(i);
        }

        // 3. Incrementally load chunks in idle moments
        let currentChunk = 2;
        function loadNextChunk() {
          if (destroyed || currentChunk > TOTAL_FRAMES) return;
          const limit = Math.min(currentChunk + 8, TOTAL_FRAMES);
          for (let i = currentChunk; i <= limit; i++) {
            if (!frames[i]) loadFrame(i);
          }
          currentChunk = limit + 1;

          if (window.requestIdleCallback) {
            window.requestIdleCallback(loadNextChunk, { timeout: 80 });
          } else {
            setTimeout(loadNextChunk, 25);
          }
        }

        setTimeout(loadNextChunk, 100);
      });
    }

    // Stages elements references
    const stage1 = document.getElementById('stage-1');
    const stage2 = document.getElementById('stage-2');
    const stage3 = document.getElementById('stage-3');
    const stage4 = document.getElementById('stage-4');

    // Update synchronized stages based on scroll progress
    function updateStages(progress) {
      if (scrubBar) scrubBar.style.width = `${(progress * 100).toFixed(1)}%`;
      if (scrubLabel) {
        const currentPadded = String(targetFrameIndex).padStart(3, '0');
        scrubLabel.textContent = `FRAME ${currentPadded} / 240`;
      }

      // Stage 1: 0.00 - 0.25 (Fades out 0.18 - 0.24)
      if (stage1) {
        if (progress < 0.24) {
          stage1.classList.add('active');
          const op = progress < 0.16 ? 1 : (0.24 - progress) / 0.08;
          stage1.style.opacity = Math.max(0, Math.min(1, op));
          stage1.style.transform = `translateY(${-progress * 60}px)`;
        } else {
          stage1.classList.remove('active');
          stage1.style.opacity = '0';
        }
      }

      // Stage 2: 0.25 - 0.50 (Fades in 0.23-0.28, fades out 0.46-0.51)
      if (stage2) {
        if (progress >= 0.22 && progress < 0.51) {
          stage2.classList.add('active');
          let op = 1;
          if (progress < 0.28) op = (progress - 0.22) / 0.06;
          else if (progress > 0.45) op = (0.51 - progress) / 0.06;
          stage2.style.opacity = Math.max(0, Math.min(1, op));
          stage2.style.transform = `translateY(${-(progress - 0.25) * 40}px)`;
        } else {
          stage2.classList.remove('active');
          stage2.style.opacity = '0';
        }
      }

      // Stage 3: 0.50 - 0.75 (Fades in 0.49-0.54, fades out 0.71-0.76)
      if (stage3) {
        if (progress >= 0.48 && progress < 0.76) {
          stage3.classList.add('active');
          let op = 1;
          if (progress < 0.54) op = (progress - 0.48) / 0.06;
          else if (progress > 0.70) op = (0.76 - progress) / 0.06;
          stage3.style.opacity = Math.max(0, Math.min(1, op));
          stage3.style.transform = `translateY(${-(progress - 0.50) * 40}px)`;
        } else {
          stage3.classList.remove('active');
          stage3.style.opacity = '0';
        }
      }

      // Stage 4: 0.75 - 1.00 (Fades in 0.74-0.80)
      if (stage4) {
        if (progress >= 0.73) {
          stage4.classList.add('active');
          const op = progress < 0.81 ? (progress - 0.73) / 0.08 : 1;
          stage4.style.opacity = Math.max(0, Math.min(1, op));
          stage4.style.transform = `translateY(${-(progress - 0.75) * 30}px)`;
        } else {
          stage4.classList.remove('active');
          stage4.style.opacity = '0';
        }
      }
    }

    // Scroll Handler synchronized with requestAnimationFrame
    function onScroll() {
      if (destroyed || !track) return;

      const rect = track.getBoundingClientRect();
      const maxScroll = rect.height - window.innerHeight;
      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / maxScroll, 0), 1);

      // Map progress to frame index 1 to 240
      const newFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.floor(progress * (TOTAL_FRAMES - 1)) + 1));

      if (newFrame !== targetFrameIndex) {
        targetFrameIndex = newFrame;
        loadFrame(targetFrameIndex);
        // Also pre-fetch adjacent frames
        if (targetFrameIndex + 1 <= TOTAL_FRAMES) loadFrame(targetFrameIndex + 1);
        if (targetFrameIndex - 1 >= 1) loadFrame(targetFrameIndex - 1);
      }

      updateStages(progress);

      if (!isRendering) {
        isRendering = true;
        requestAnimationFrame(() => {
          renderCurrentFrame();
          isRendering = false;
        });
      }
    }

    // Window Listeners
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Initial Trigger
    startProgressiveLoading();
    resizeCanvas();
    onScroll();

    // Register cleanup callback
    _cleanup = () => {
      destroyed = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resizeCanvas);
    };
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
