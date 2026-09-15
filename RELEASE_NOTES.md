# DataSheet IQ — Release Notes

**Version:** `v3.4.0-RC1`  
**Build Identifier:** `Build 20260905.01`  
**Release Classification:** Release Candidate (Frozen)  
**Release Date:** September 5, 2026  
**Lead Architect:** Aman Nandan  

---

## Executive Summary

DataSheet IQ `v3.4.0-RC1` is the enterprise-grade, deterministic inventory intelligence platform engineered for rapid ingestion, forensic reconciliation, and natural-language exploration of complex, multi-worksheet liquidation manifests.

All six qualification phases (Phase 3C, Phase 2D, Phase 3D, Phase 3D.1, Phase 4, and Phase 5) have completed with **100% test pass rates across 913 evaluated assertions**.

---

## What's New in v3.4.0-RC1

### 1. High-Precision Deterministic Categorizer & Disambiguation Engine (Phase 3C)
- **Zero AI Guesswork:** Eliminated stochastic LLM hallucination in inventory categorization. Classifications are reproducible, rule-bounded, and audit-traceable.
- **Contextual Boundary Disambiguation:** Resolves multi-token conflicts (e.g., *Plum Rice Water Face Gel* $\rightarrow$ `Personal Care / Skin Care`, *Sweet Karam Madras Mixture Coffee* $\rightarrow$ `Grocery / Snacks & Namkeen`, *Clay Craft Coffee Mug* $\rightarrow$ `Home Care / Kitchen Accessories`).
- **Sports Nutrition Canonical Domain:** High-protein and fitness supplements (`Whey`, `Creatine`, `BCAA`, `Mass Gainer`) are accurately isolated into dedicated `Sports Nutrition / Protein & Workout Supplements` domain.

### 2. Multi-Profile Business Reporting Mapper (Phase 3C & 3D)
- **Canonical Standard vs. Business FM Reporting:** Dynamic profile selector supporting both standard 12-domain categorization and the 20-bucket Grofers/Blinkit business reference framework.
- **Scope-Aware Valuation:** Instant switching between:
  - *All Sheets (Full Manifest):* ₹2,560,489.66 across 8,567 records.
  - *Saleable Only:* ₹1,460,421.64 across 6,197 records.
  - *Business FM Scope:* ₹708,495.00 across 20 reference buckets.
  - *Dedicated Atta Scope:* ₹233,149.00 on dedicated flour worksheet.
- **Zero Scope Leakage:** Non-grocery manifests (e.g., Healthcare, Electronics) automatically suppress inapplicable business profiles.

### 3. Enterprise Hardening & Universal Ingestion (Phase 4)
- **Universal Enterprise Column Aliases:** Automatic fuzzy header mapping for non-standard manifests (`Article_Code`, `Item_Code`, `Desc`, `Mfr_Brand`, `Closing_Stock`, `Valuation_Amount`).
- **Formula Injection (CSV/Excel Injection) Defense:** Automatic neutralization of executable spreadsheet prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) with leading single quote `'` in all XLSX exports while strictly preserving native numeric types.
- **Universal XSS Protection:** 100% sanitized HTML rendering across table cells, modal dialogs, search highlights, and chat message bubbles.
- **Dataset Isolation & Cascade Purge:** True multi-tenant dataset isolation in browser IndexedDB with single-click zero-residue cascade deletion.

### 4. Multilingual Natural Language Intelligence Engine (Phase 5)
- **Zero-Latency Client-Side NLP:** In-browser query parser resolving category queries, brand summaries, stock valuations, and expiry audits in < 5 ms.
- **Multilingual Support:** Audited semantic query understanding across English, Hindi (*"कॉफी का कुल मूल्य कितना है?"*), and Hinglish (*"Atta ka total stock kitna hai?"*).
- **Scope-Aware Querying:** Chatbot responses adapt dynamically to the active worksheet filter or business reporting profile.

---

## Production File Manifest

| File | Purpose | Checksum Status |
| :--- | :--- | :--- |
| `index.html` | Application root shell & modal containers | Verified |
| `css/design-system.css` | Core design tokens, theme variables & layout grid | Verified |
| `css/components.css` | UI components, cards, tables, badges & HUD styles | Verified |
| `js/app.js` | Core application controller, routing & state lifecycle | Verified |
| `js/db.js` | IndexedDB client-side database layer | Verified |
| `js/pipeline/validator.js` | Pre-flight file validation, extension & size checks | Verified |
| `js/pipeline/parser.js` | Multi-worksheet XLSX parser & summary row detection | Verified |
| `js/pipeline/cleaner.js` | String normalization, unit conversions & pack extraction | Verified |
| `js/pipeline/categorizer.js` | Deterministic 12-domain & subcategory rule engine | Verified |
| `js/pipeline/brandEngine.js` | Brand deduplication, noise filtering & canonical resolution | Verified |
| `js/pipeline/productEngine.js` | SKU family clustering & variant grouping | Verified |
| `js/pipeline/reportingMapper.js` | 20-bucket Business FM profile & scope mapper | Verified |
| `js/pipeline/aggregator.js` | Financial aggregation, confidence scoring & KPI rollup | Verified |
| `js/pipeline/pipeline.js` | Master orchestration pipeline with progress callbacks | Verified |
| `js/utils/exporter.js` | Multi-sheet sanitized XLSX export engine | Verified |
| `js/utils/formatters.js` | Currency (₹), weight (KG/g/L/ml), and date formatters | Verified |
| `js/utils/nlEngine.js` | Multilingual natural-language query matrix | Verified |
| `js/views/landing.js` | Premium interactive HUD landing & query sandbox | Verified |
| `js/views/dashboard.js` | Executive KPI dashboard, scope toggles & audit tables | Verified |
| `js/views/categoryDetail.js` | Subcategory drill-down & partition views | Verified |
| `js/views/brandDetail.js` | Brand intelligence & SKU variant explorer | Verified |
| `js/views/dataQuality.js` | Data health transparency & confidence audit console | Verified |
| `js/views/uploadsHistory.js` | Dataset management & cascade delete interface | Verified |
| `js/views/about.js` | Architecture overview & creator technical manifesto | Verified |

---

## Verified Benchmarks

| Dataset Volume | Classification & ETL | Dashboard Hydration | Instant Filter / Search | Multi-Sheet XLSX Export |
| :--- | :--- | :--- | :--- | :--- |
| **10,000 Rows** | 720.5 ms | 44.3 ms | 0.98 ms | 140.7 ms |
| **50,000 Rows** | 3,278.0 ms | 88.4 ms | 12.63 ms | 1,209.8 ms |
| **100,000 Rows** | 6,447.9 ms | 214.9 ms | 7.53 ms | 2,573.5 ms |

---

## Release Candidate Verification Verdict

- **Automated Regression Suite:** 913 / 913 Passed (100.0%)
- **Source Truth Invariants:** 100% Reconciled (Grofers, Dasna-3, Business FM, Apex Healthcare)
- **Security Audit:** 0 Vulnerabilities (XSS Safe, Formula Safe, Zero External Transmission)
- **Final Release Verdict:** **GO FOR DEPLOYMENT**
