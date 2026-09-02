window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   LANDING PAGE VIEW
   Professional SaaS Landing Page shown before Dashboard
   ============================================================ */
App.Views.Landing = (() => {

  function render(container) {
    container.innerHTML = `
      <div class="landing-wrapper animate-fade-in">
        
        <!-- ── LANDING NAVBAR ────────────────────────────────────── -->
        <header class="landing-nav">
          <div class="landing-nav-container">
            <div class="landing-brand" onclick="App.Views.Landing.scrollTo('hero')">
              <div class="landing-brand-icon">📦</div>
              <div>
                <div class="landing-brand-title">Liquidation IQ</div>
                <div class="landing-brand-sub">Inventory Intelligence</div>
              </div>
            </div>

            <!-- Desktop Nav Links -->
            <nav class="landing-links">
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('hero')">Home</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('features')">Features</button>
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
              <button class="landing-mobile-toggle" onclick="App.Views.Landing.toggleMobileNav()" aria-label="Toggle Menu">
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
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('hero'); App.Views.Landing.closeMobileNav()">Home</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('features'); App.Views.Landing.closeMobileNav()">Features</button>
            <button class="landing-mobile-link" onclick="App.Views.Landing.scrollTo('about'); App.Views.Landing.closeMobileNav()">About</button>
            <button class="btn btn-primary btn-md w-full mt-12" onclick="App.Router.go('dashboard')">Open Dashboard</button>
          </div>
        </header>

        <!-- ── HERO SECTION ──────────────────────────────────────── -->
        <section class="landing-hero" id="hero">
          <div class="landing-hero-glow"></div>
          <div class="landing-hero-content">
            
            <div class="landing-badge">
              <span class="landing-badge-dot"></span>
              <span>LIQUIDATION INVENTORY INTELLIGENCE</span>
            </div>

            <h1 class="landing-hero-title">
              Turn Liquidation Inventory Into<br>
              <span class="gradient-text">Actionable Intelligence</span>
            </h1>

            <p class="landing-hero-sub">
              Analyze inventory, identify high-value products, understand categories and brands, and make faster inventory decisions from one intelligent dashboard.
            </p>

            <div class="landing-hero-actions">
              <button class="btn btn-primary btn-lg landing-hero-btn" onclick="App.Router.go('dashboard')">
                <span>Open Dashboard</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
              <button class="btn btn-secondary btn-lg" onclick="App.Views.Landing.scrollTo('features')">
                <span>Explore Features</span>
              </button>
            </div>

            <!-- Hero Mock Preview / Card Summary -->
            <div class="landing-hero-preview" onclick="App.Router.go('dashboard')">
              <div class="landing-preview-header">
                <div class="landing-preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <div class="landing-preview-title">Liquidation IQ — Intelligent Inventory Overview</div>
                <div class="landing-preview-badge">LIVE APP</div>
              </div>
              <div class="landing-preview-body">
                <div class="landing-stat-pill">
                  <span class="stat-icon">📋</span>
                  <div>
                    <div class="stat-val">7,980 Records</div>
                    <div class="stat-lbl">Parsed & Normalized</div>
                  </div>
                </div>
                <div class="landing-stat-pill">
                  <span class="stat-icon">💰</span>
                  <div>
                    <div class="stat-val">₹35,47,255.97</div>
                    <div class="stat-lbl">Total Inventory Value</div>
                  </div>
                </div>
                <div class="landing-stat-pill">
                  <span class="stat-icon">⚖️</span>
                  <div>
                    <div class="stat-val">15.14 Tonnes</div>
                    <div class="stat-lbl">Normalized Stock Weight</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- ── FEATURES SECTION ──────────────────────────────────── -->
        <section class="landing-section" id="features">
          <div class="landing-container">
            <div class="landing-section-header text-center">
              <div class="landing-section-tag">POWERFUL ANALYTICS</div>
              <h2 class="landing-section-title">Built for Modern Inventory Operations</h2>
              <p class="landing-section-sub">Everything you need to turn raw liquidation inventory data into clear, actionable business decisions.</p>
            </div>

            <div class="landing-features-grid">
              
              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-indigo">🔬</div>
                <h3 class="feature-title">Inventory Intelligence</h3>
                <p class="feature-desc">Understand your inventory with clear, actionable insights and automated metrics calculation.</p>
              </div>

              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-emerald">📊</div>
                <h3 class="feature-title">Smart Analytics</h3>
                <p class="feature-desc">Analyze quantity, value, weight, categories, and brand distributions with instant visual charts.</p>
              </div>

              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-purple">🤖</div>
                <h3 class="feature-title">AI Inventory Assistant</h3>
                <p class="feature-desc">Ask natural-language questions about your inventory like "Which brand has the most units?".</p>
              </div>

              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-amber">🏷️</div>
                <h3 class="feature-title">Brand & Product Insights</h3>
                <p class="feature-desc">Identify top brands, high-value SKUs, and variant breakdowns quickly across all inventory lots.</p>
              </div>

              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-sky">🏭</div>
                <h3 class="feature-title">Warehouse Intelligence</h3>
                <p class="feature-desc">Understand inventory distribution and stock levels across multiple fulfillment centers.</p>
              </div>

              <div class="landing-feature-card">
                <div class="feature-icon-wrap icon-rose">📥</div>
                <h3 class="feature-title">Data Export</h3>
                <p class="feature-desc">Export normalized inventory insights to CSV and XLSX for reporting and offline analysis.</p>
              </div>

            </div>
          </div>
        </section>

        <!-- ── ABOUT SECTION ─────────────────────────────────────── -->
        <section class="landing-section landing-about-bg" id="about">
          <div class="landing-container">
            <div class="landing-about-card">
              <div class="landing-about-content">
                <div class="landing-section-tag">PLATFORM PURPOSE</div>
                <h2 class="landing-about-title">About Liquidation IQ</h2>
                <p class="landing-about-text">
                  Liquidation IQ is an inventory intelligence platform designed to turn complex liquidation inventory data into clear, useful business insights.
                </p>
                <p class="landing-about-subtext">
                  From source file parsing and normalization to deep category drill-downs and natural-language queries, Liquidation IQ empowers inventory managers, auditors, and resellers to make data-backed decisions instantly.
                </p>
                <div class="landing-about-badges">
                  <span class="about-pill">✓ Zero Data Loss</span>
                  <span class="about-pill">✓ 100% Deterministic Parsing</span>
                  <span class="about-pill">✓ Real-time NL Engine</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── CTA BANNER SECTION ────────────────────────────────── -->
        <section class="landing-cta-section">
          <div class="landing-container">
            <div class="landing-cta-card">
              <div class="landing-cta-glow"></div>
              <h2 class="landing-cta-title">Ready to explore your inventory?</h2>
              <p class="landing-cta-sub">Open your dashboard and start discovering what your inventory is telling you.</p>
              <button class="btn btn-primary btn-lg landing-cta-main-btn" onclick="App.Router.go('dashboard')">
                <span>Open Dashboard</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <!-- ── LANDING FOOTER ────────────────────────────────────── -->
        <footer class="landing-footer">
          <div class="landing-container">
            <div class="landing-footer-top">
              <div class="landing-footer-brand">
                <div class="flex items-center gap-10 mb-10">
                  <div class="landing-brand-icon">📦</div>
                  <span class="landing-brand-title">Liquidation IQ</span>
                </div>
                <p class="landing-footer-desc">
                  Turn complex liquidation inventory data into clear, actionable business decisions.
                </p>
              </div>

              <div class="landing-footer-nav">
                <div class="footer-nav-col">
                  <div class="footer-col-title">Navigation</div>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('hero')">Home</button>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('features')">Features</button>
                  <button class="footer-link" onclick="App.Views.Landing.scrollTo('about')">About</button>
                </div>
                <div class="footer-nav-col">
                  <div class="footer-col-title">Application</div>
                  <button class="footer-link" onclick="App.Router.go('dashboard')">Dashboard</button>
                  <button class="footer-link" onclick="App.Router.go('uploads')">Uploads</button>
                </div>
              </div>
            </div>

            <div class="landing-footer-bottom">
              <div class="copyright-text">© 2026 Liquidation IQ. All rights reserved.</div>
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
