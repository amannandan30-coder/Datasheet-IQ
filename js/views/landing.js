window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   PREMIUM SAAS LANDING PAGE — VISUAL OVERHAUL
   3D Inventory Data Intelligence Scene + Interactive Glass UI
   ============================================================ */
App.Views.Landing = (() => {

  let _animId = null;
  let _mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function render(container) {
    container.innerHTML = `
      <div class="landing-wrapper animate-fade-in" id="landing-root">
        
        <!-- ── AMBIENT ATMOSPHERIC BACKGROUND ───────────────────── -->
        <div class="landing-ambient-bg">
          <div class="ambient-glow glow-1"></div>
          <div class="ambient-glow glow-2"></div>
          <div class="ambient-grid"></div>
        </div>

        <!-- ── LANDING NAVBAR ────────────────────────────────────── -->
        <header class="landing-nav" id="landing-nav">
          <div class="landing-nav-container">
            <div class="landing-brand" onclick="App.Views.Landing.scrollTo('hero')">
              <div class="landing-brand-icon">📦</div>
              <div>
                <div class="landing-brand-title">Liquidation IQ</div>
                <div class="landing-brand-sub">Inventory Intelligence</div>
              </div>
            </div>

            <!-- Nav Links -->
            <nav class="landing-links">
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('hero')">Home</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('features')">Features</button>
              <button class="landing-link" onclick="App.Views.Landing.scrollTo('about')">About</button>
            </nav>

            <!-- Action CTA -->
            <div class="landing-nav-actions">
              <button class="btn btn-primary landing-cta-btn" onclick="App.Router.go('dashboard')">
                <span>Open Dashboard</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>

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

        <!-- ── HERO SECTION WITH 3D INVENTORY VISUALIZATION ───────── -->
        <section class="landing-hero" id="hero">
          <div class="landing-hero-container">
            
            <!-- Hero Left / Header -->
            <div class="landing-hero-header">
              <div class="landing-live-badge">
                <span class="live-pulse-dot"></span>
                <span>LIVE INVENTORY INTELLIGENCE</span>
              </div>

              <h1 class="landing-hero-title">
                Turn Liquidation Inventory Into<br>
                <span class="gradient-text-3d">Actionable Intelligence</span>
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
            </div>

            <!-- ── 3D INVENTORY INTELLIGENCE CENTERPIECE ────────────── -->
            <div class="hero-3d-viewport" id="hero-3d-viewport">
              <div class="hero-3d-card-wrap" id="hero-3d-card-wrap">
                
                <!-- 3D Canvas Layer -->
                <canvas id="hero-3d-canvas" class="hero-3d-canvas"></canvas>

                <!-- Floating Glass Metric Cards -->
                <div class="glass-metric-card pos-top-left" onclick="App.Router.go('dashboard')">
                  <div class="glass-card-icon">📋</div>
                  <div>
                    <div class="glass-card-val">7,980 Records</div>
                    <div class="glass-card-lbl">Parsed & Normalized</div>
                  </div>
                  <span class="glass-card-tag green">ACTIVE</span>
                </div>

                <div class="glass-metric-card pos-top-right" onclick="App.Router.go('dashboard')">
                  <div class="glass-card-icon">💰</div>
                  <div>
                    <div class="glass-card-val">₹35.47 Lakhs</div>
                    <div class="glass-card-lbl">Total Inventory Value</div>
                  </div>
                  <span class="glass-card-tag amber">MRP VALUE</span>
                </div>

                <div class="glass-metric-card pos-bottom-left" onclick="App.Router.go('dashboard')">
                  <div class="glass-card-icon">⚖️</div>
                  <div>
                    <div class="glass-card-val">15.14 Tonnes</div>
                    <div class="glass-card-lbl">Gross Stock Weight</div>
                  </div>
                  <span class="glass-card-tag blue">NORMALIZED</span>
                </div>

                <div class="glass-metric-card pos-bottom-right" onclick="App.Router.go('dashboard')">
                  <div class="glass-card-icon">📦</div>
                  <div>
                    <div class="glass-card-val">5,513 SKUs</div>
                    <div class="glass-card-lbl">Unique Product Families</div>
                  </div>
                  <span class="glass-card-tag purple">CATALOG</span>
                </div>

                <!-- Floating Scan Status Overlay -->
                <div class="hero-scan-overlay">
                  <div class="scan-beam-line"></div>
                  <div class="scan-status-pill">
                    <span class="scan-spinner"></span>
                    <span>Scanning Raw Lots → Categorizing → Normalizing</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        <!-- ── FEATURES SECTION WITH MINI VISUAL WIDGETS ─────────── -->
        <section class="landing-section" id="features">
          <div class="landing-container">
            <div class="landing-section-header text-center">
              <div class="landing-section-tag">POWERFUL ANALYTICS</div>
              <h2 class="landing-section-title">Built for Modern Inventory Operations</h2>
              <p class="landing-section-sub">Everything you need to turn raw liquidation inventory data into clear, actionable business decisions.</p>
            </div>

            <div class="landing-features-grid">
              
              <!-- Card 1 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-scan">
                    <div class="mini-scan-beam"></div>
                    <div class="mini-box b1"></div>
                    <div class="mini-box b2"></div>
                    <div class="mini-box b3"></div>
                  </div>
                </div>
                <h3 class="feature-title">Inventory Intelligence</h3>
                <p class="feature-desc">Understand your inventory with clear, actionable insights and automated metrics calculation.</p>
              </div>

              <!-- Card 2 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-bars">
                    <span class="bar bar-1"></span>
                    <span class="bar bar-2"></span>
                    <span class="bar bar-3"></span>
                    <span class="bar bar-4"></span>
                  </div>
                </div>
                <h3 class="feature-title">Smart Analytics</h3>
                <p class="feature-desc">Analyze quantity, value, weight, categories, and brand distributions with instant visual charts.</p>
              </div>

              <!-- Card 3 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-ai">
                    <div class="ai-core-ring ring-1"></div>
                    <div class="ai-core-ring ring-2"></div>
                    <div class="ai-core-dot">🤖</div>
                  </div>
                </div>
                <h3 class="feature-title">AI Inventory Assistant</h3>
                <p class="feature-desc">Ask natural-language questions about your inventory like "Which brand has the most units?".</p>
              </div>

              <!-- Card 4 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-nodes">
                    <div class="node n1"></div>
                    <div class="node n2"></div>
                    <div class="node n3"></div>
                    <svg class="node-lines" width="100%" height="100%"><line x1="20%" y1="30%" x2="50%" y2="70%" stroke="rgba(99,102,241,0.4)" stroke-width="1.5"/><line x1="80%" y1="30%" x2="50%" y2="70%" stroke="rgba(99,102,241,0.4)" stroke-width="1.5"/></svg>
                  </div>
                </div>
                <h3 class="feature-title">Brand & Product Insights</h3>
                <p class="feature-desc">Identify top brands, high-value SKUs, and variant breakdowns quickly across all inventory lots.</p>
              </div>

              <!-- Card 5 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-map">
                    <div class="wh-pin p1">🏭</div>
                    <div class="wh-pin p2">🏭</div>
                  </div>
                </div>
                <h3 class="feature-title">Warehouse Intelligence</h3>
                <p class="feature-desc">Understand inventory distribution and stock levels across multiple fulfillment centers.</p>
              </div>

              <!-- Card 6 -->
              <div class="landing-feature-card">
                <div class="feature-widget-wrap">
                  <div class="mini-widget widget-export">
                    <div class="export-file">📊 XLSX</div>
                    <div class="export-arrow">↓</div>
                  </div>
                </div>
                <h3 class="feature-title">Data Export</h3>
                <p class="feature-desc">Export normalized inventory insights to CSV and XLSX for reporting and offline analysis.</p>
              </div>

            </div>
          </div>
        </section>

        <!-- ── ABOUT SECTION WITH CONNECTED DATA ENGINE DIAGRAM ──── -->
        <section class="landing-section landing-about-bg" id="about">
          <div class="landing-container">
            <div class="landing-about-grid">
              
              <!-- About Left: Text -->
              <div class="landing-about-text-col">
                <div class="landing-section-tag">PLATFORM ARCHITECTURE</div>
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

              <!-- About Right: Visual Connected Core Diagram -->
              <div class="landing-about-visual-col">
                <div class="about-diagram-container">
                  <div class="about-core-node">
                    <div class="core-node-icon">📦</div>
                    <div class="core-node-label">LIQUIDATION IQ ENGINE</div>
                  </div>

                  <!-- Satellite Nodes -->
                  <div class="sat-node sat-1"><span>🛒</span> Categories</div>
                  <div class="sat-node sat-2"><span>🏷️</span> Brands</div>
                  <div class="sat-node sat-3"><span>🏭</span> Warehouses</div>
                  <div class="sat-node sat-4"><span>🤖</span> NL Chatbot</div>

                  <!-- Connected Laser Rays (SVG) -->
                  <svg class="about-svg-rays" width="100%" height="100%">
                    <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="url(#rayGrad1)" stroke-width="2" stroke-dasharray="4,4"/>
                    <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="url(#rayGrad1)" stroke-width="2" stroke-dasharray="4,4"/>
                    <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="url(#rayGrad1)" stroke-width="2" stroke-dasharray="4,4"/>
                    <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="url(#rayGrad1)" stroke-width="2" stroke-dasharray="4,4"/>
                    <defs>
                      <linearGradient id="rayGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8"/>
                        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.3"/>
                      </linearGradient>
                    </defs>
                  </svg>
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
              <div class="landing-section-tag">GET STARTED IMMEDIATELY</div>
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

        <!-- ── FOOTER ────────────────────────────────────────────── -->
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

    // Initialize 3D Canvas Engine & Parallax Interactions
    setTimeout(() => {
      initHero3DEngine();
      initMouseParallax();
    }, 50);
  }

  /* ── 3D CANVAS INVENTORY ENGINE ──────────────────────────── */
  function initHero3DEngine() {
    const canvas = document.getElementById('hero-3d-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const viewport = document.getElementById('hero-3d-viewport');
    if (!viewport) return;

    let width = (canvas.width = viewport.clientWidth || 800);
    let height = (canvas.height = viewport.clientHeight || 500);

    window.addEventListener('resize', () => {
      if (document.getElementById('hero-3d-canvas')) {
        width = canvas.width = viewport.clientWidth || 800;
        height = canvas.height = viewport.clientHeight || 500;
      }
    });

    // Generate 3D box objects
    const boxes = [];
    const colors = ['#6366f1', '#818cf8', '#38bdf8', '#a855f7', '#10b981', '#f59e0b'];
    
    for (let i = 0; i < 28; i++) {
      boxes.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 200 + 40,
        z: Math.random() * 400 - 200,
        size: 28 + Math.random() * 24,
        color: colors[i % colors.length],
        floatOffset: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.02,
        label: `SKU-${1000 + i}`,
      });
    }

    // Floating particles
    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.6,
        speedY: -0.3 - Math.random() * 0.5,
      });
    }

    let time = 0;
    let scanLineX = 0;

    function renderFrame() {
      if (!document.getElementById('hero-3d-canvas')) return;
      ctx.clearRect(0, 0, width, height);

      time += 0.03;
      scanLineX = (scanLineX + 2.5) % (width + 200);

      // Mouse Parallax Offset
      _mouse.x += (_mouse.targetX - _mouse.x) * 0.05;
      _mouse.y += (_mouse.targetY - _mouse.y) * 0.05;

      const centerX = width / 2 + _mouse.x * 30;
      const centerY = height / 2 + 30 + _mouse.y * 20;

      // 1. Draw Perspective Grid Floor
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      const gridY = centerY + 120;
      for (let x = -600; x <= 600; x += 60) {
        ctx.beginPath();
        ctx.moveTo(centerX + x * 0.3, centerY);
        ctx.lineTo(centerX + x * 1.5, gridY + 200);
        ctx.stroke();
      }
      for (let y = 0; y <= 200; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, gridY + y);
        ctx.lineTo(width, gridY + y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw Floating 3D Inventory Boxes
      boxes.sort((a, b) => a.z - b.z);

      boxes.forEach((b) => {
        const floatY = b.y + Math.sin(time * b.speed + b.floatOffset) * 12;
        const scale = 300 / (300 + b.z);
        const bx = centerX + b.x * scale;
        const by = centerY + floatY * scale;
        const size = b.size * scale;

        const isScanned = Math.abs(bx - (scanLineX - 100)) < 40;

        // Draw 3D Box (Isometric Faces)
        ctx.save();

        // Box Top Face
        ctx.fillStyle = isScanned ? '#818cf8' : b.color;
        ctx.globalAlpha = isScanned ? 0.95 : 0.75;
        ctx.beginPath();
        ctx.moveTo(bx, by - size * 0.5);
        ctx.lineTo(bx + size * 0.7, by - size * 0.2);
        ctx.lineTo(bx, by + size * 0.1);
        ctx.lineTo(bx - size * 0.7, by - size * 0.2);
        ctx.closePath();
        ctx.fill();

        // Box Left Face
        ctx.fillStyle = isScanned ? '#6366f1' : 'rgba(30, 34, 53, 0.9)';
        ctx.beginPath();
        ctx.moveTo(bx - size * 0.7, by - size * 0.2);
        ctx.lineTo(bx, by + size * 0.1);
        ctx.lineTo(bx, by + size * 0.8);
        ctx.lineTo(bx - size * 0.7, by + size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Box Right Face
        ctx.fillStyle = isScanned ? '#4f46e5' : 'rgba(19, 21, 30, 0.95)';
        ctx.beginPath();
        ctx.moveTo(bx, by + size * 0.1);
        ctx.lineTo(bx + size * 0.7, by - size * 0.2);
        ctx.lineTo(bx + size * 0.7, by + size * 0.5);
        ctx.lineTo(bx, by + size * 0.8);
        ctx.closePath();
        ctx.fill();

        // Box Borders
        ctx.strokeStyle = isScanned ? '#c084fc' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isScanned ? 1.5 : 1;
        ctx.stroke();

        // Small SKU Tag on Scanned Box
        if (isScanned) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(b.label, bx - 18, by - size * 0.6);
        }

        ctx.restore();
      });

      // 3. Draw Scanning Beam Light Ray
      ctx.save();
      const beamX = scanLineX - 100;
      const grad = ctx.createLinearGradient(beamX - 30, 0, beamX + 30, 0);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
      grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.35)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(beamX - 30, 0, 60, height);

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beamX, 0);
      ctx.lineTo(beamX, height);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Floating Ambient Particles
      ctx.save();
      ctx.fillStyle = 'rgba(129, 140, 248, 0.6)';
      particles.forEach((p) => {
        p.y += p.speedY;
        if (p.y < 0) p.y = height;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      _animId = requestAnimationFrame(renderFrame);
    }

    renderFrame();
  }

  /* ── MOUSE PARALLAX INTERACTION ──────────────────────────── */
  function initMouseParallax() {
    const hero = document.getElementById('hero');
    const cardWrap = document.getElementById('hero-3d-card-wrap');
    if (!hero || !cardWrap) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      _mouse.targetX = x;
      _mouse.targetY = y;

      const rotX = -y * 12;
      const rotY = x * 14;

      cardWrap.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });

    hero.addEventListener('mouseleave', () => {
      _mouse.targetX = 0;
      _mouse.targetY = 0;
      cardWrap.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    });
  }

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
