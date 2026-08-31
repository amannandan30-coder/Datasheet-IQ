window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   ABOUT VIEW — Creator & Application Information
   ============================================================ */
App.Views.About = (() => {

  async function render(container) {
    container.innerHTML = '';

    container.insertAdjacentHTML('beforeend', `
      <div class="page-header">
        <div>
          <div class="page-title flex items-center gap-10">
            <span>ℹ️</span> About Liquidation IQ
          </div>
          <div class="page-sub">System Information, Architecture & Creator Profile</div>
        </div>
        <div class="badge badge-success" style="padding:6px 12px;font-size:12px">v2.0 • Production Ready</div>
      </div>

      <!-- ── CREATOR CARD ────────────────────────────────────── -->
      <div class="card mb-24" style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06));border:1px solid rgba(99,102,241,0.25);position:relative;overflow:hidden">
        <div style="position:absolute;top:-20px;right:-20px;font-size:140px;opacity:0.04;pointer-events:none">👨‍💻</div>
        
        <div class="flex items-start gap-16 flex-wrap about-creator-flex" style="position:relative;z-index:2">
          <div class="about-creator-avatar" style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg, #6366f1, #8b5cf6);display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 8px 24px rgba(99,102,241,0.3);flex-shrink:0">
            👨‍💻
          </div>
          <div style="flex:1;min-width:200px">
            <div class="flex items-center gap-10 flex-wrap">
              <div class="text-xl font-bold" style="color:#ffffff">Aman Nandan</div>
              <span class="badge badge-accent">Creator & Lead Architect</span>
            </div>
            <div class="text-xs text-muted mt-4">Designed & Engineered Liquidation Inventory Intelligence</div>
            <div class="text-sm text-secondary mt-12" style="line-height:1.6;max-width:780px">
              "Liquidation IQ was engineered to solve a major real-world bottleneck: analyzing massive, messy, multi-worksheet liquidation Excel files without manual spreadsheet cleanup. It automatically normalizes product names, resolves brand duplicates, separates variants, and calculates accurate inventory valuation with 100% offline privacy."
            </div>
            
            <div class="flex gap-12 mt-16 flex-wrap about-creator-tags">
              <div class="tag" style="background:rgba(99,102,241,0.15);color:#818cf8;border-color:rgba(99,102,241,0.3);padding:4px 10px">
                ⚡ 100% Client-Side ETL
              </div>
              <div class="tag" style="background:rgba(16,185,129,0.15);color:#34d399;border-color:rgba(16,185,129,0.3);padding:4px 10px">
                🔒 Zero Server Data Leakage
              </div>
              <div class="tag" style="background:rgba(245,158,11,0.15);color:#fbbf24;border-color:rgba(245,158,11,0.3);padding:4px 10px">
                📦 Multi-Worksheet Reconciliation
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── WHAT IT DOES / PROBLEM SOLVED ───────────────────── -->
      <div class="section-title mb-16">What Problems Liquidation IQ Solves</div>
      
      <div class="grid-3 mb-24">
        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🧹</div>
          <div class="font-bold text-base mb-6">Automated Name Normalization</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            Converts messy, inconsistent product descriptions into clean canonical product families and distinct UOM pack variants (e.g. 1 KG vs 5 KG).
          </div>
        </div>

        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🚫</div>
          <div class="font-bold text-base mb-6">Summary Row Deduplication</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            Detects and isolates summary total rows embedded inside Excel sheets to prevent aggregate double-counting bugs in total inventory metrics.
          </div>
        </div>

        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🏷️</div>
          <div class="font-bold text-base mb-6">Brand Deduplication & Fingerprinting</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            Strips corporate noise words (<code class="text-xs">Pvt Ltd</code>, <code class="text-xs">Co</code>, <code class="text-xs">Brand</code>) and normalizes brand names while providing human-in-the-loop merge reviews.
          </div>
        </div>

        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🎯</div>
          <div class="font-bold text-base mb-6">Contextual False-Positive Prevention</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            Enforces exact word-boundary classification rules. Prevents false matches such as <i>Zero Maida</i> cookies in flour or cosmetic <i>(Tube)</i> packaging in electronics.
          </div>
        </div>

        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🔍</div>
          <div class="font-bold text-base mb-6">4-Level Inventory Drill-Down</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            Traverse instantly from high-level Category overview down to Subcategory, Brand, Product Family, Variant, and original raw Excel row data.
          </div>
        </div>

        <div class="card">
          <div style="font-size:24px;margin-bottom:10px">🔒</div>
          <div class="font-bold text-base mb-6">100% Local First & Privacy Focused</div>
          <div class="text-xs text-muted" style="line-height:1.5">
            All files are parsed and stored locally using IndexedDB. No confidential inventory or financial data is ever uploaded to external cloud servers.
          </div>
        </div>
      </div>

      <!-- ── TECHNICAL PIPELINE HIGHLIGHTS ──────────────────── -->
      <div class="section-title mb-16">Technical Pipeline Highlights</div>
      <div class="card mb-24">
        <div class="grid-4" style="gap:16px;font-size:12px">
          <div style="background:var(--bg-surface-2);padding:12px 14px;border-radius:10px;border:1px solid var(--border)">
            <div class="font-semibold text-primary mb-4">1. Validator & Parser</div>
            <div class="text-xs text-muted">Ingests multi-sheet workbooks, maps canonical columns, and captures excluded records.</div>
          </div>
          <div style="background:var(--bg-surface-2);padding:12px 14px;border-radius:10px;border:1px solid var(--border)">
            <div class="font-semibold text-primary mb-4">2. Cleaner & Categorizer</div>
            <div class="text-xs text-muted">Standardizes UOM units (KG, GM, L, ML) and applies contextual regex classification rules.</div>
          </div>
          <div style="background:var(--bg-surface-2);padding:12px 14px;border-radius:10px;border:1px solid var(--border)">
            <div class="font-semibold text-primary mb-4">3. Brand & Product Engines</div>
            <div class="text-xs text-muted">Executes fingerprinting, token similarity matching (70% Jaccard index), and variant extraction.</div>
          </div>
          <div style="background:var(--bg-surface-2);padding:12px 14px;border-radius:10px;border:1px solid var(--border)">
            <div class="font-semibold text-primary mb-4">4. Aggregator & IndexedDB</div>
            <div class="text-xs text-muted">Computes totals, status distributions, warehouse metrics, and persists indexed datasets locally.</div>
          </div>
        </div>
      </div>

      <!-- ── FOOTER ──────────────────────────────────────────── -->
      <div class="text-center p-20 text-xs text-muted" style="border-top:1px solid var(--border)">
        Liquidation Inventory Intelligence (Liquidation IQ) • Built with precision by <strong>Aman Nandan</strong>
      </div>
    `);
  }

  return { render };
})();
