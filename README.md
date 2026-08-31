# Liquidation Inventory Intelligence (Liquidation IQ)

A production-quality, zero-dependency, offline-first web application designed for importing, normalizing, deduplicating, and visually analyzing messy liquidation and bad-inventory Excel spreadsheets.

![Liquidation IQ Dashboard](https://img.shields.org/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.org/badge/License-MIT-blue)
![Offline](https://img.shields.org/badge/Offline-100%25-orange)

---

## 🌟 Key Features

- **Multi-Worksheet Excel Parsing**: Automatically ingests multi-sheet workbooks (`Saleable`, `Non saleable`, `DN PRN Items`, `Atta`, etc.) while dynamically mapping columns and identifying summary/total rows.
- **Intelligent Classification & Normalization**:
  - Exact word-boundary regex categorization preventing false matches (e.g., `Atta & Flours`, `Rice`, `Electronics & Electricals`, `Personal Care`).
  - Packaging exclusion rules for items like `Zero Maida` bakery goods, `Besan Laddu` sweets, and cosmetics in `(Tube)`.
- **Brand & Product Grouping Engine**:
  - Fingerprint-based brand deduplication with noise-word stripping (`Pvt Ltd`, `Co`, `Brand`).
  - Token-based product family matching (70% Jaccard threshold) preserving distinct packaging variants (e.g., `1 KG` vs `5 KG`).
- **Data Quality & Unresolved Inventory Center**:
  - Source File Reconciliation Banner displaying raw vs summary vs unresolved (no-name) rows.
  - Interactive merge review for brand normalization suggestions.
- **Interactive Drill-Down & Filters**:
  - Category → Subcategory → Brand → Product → Variant → Raw Excel Record hierarchy.
  - Multi-attribute AND-composed filtering (Category + Brand + Warehouse + Status).
- **Fast Fuzzy Search**: Real-time Fuse.js global search across Product Names, Brands, Categories, Item IDs, and Barcodes.
- **Data Export**: Export complete or filtered inventory to **CSV** and **XLSX** formats.
- **100% Offline & Persistent**: IndexedDB storage ensures dataset persistence across browser sessions with zero cloud CDN dependencies.

---

## 🚀 Getting Started

Since this is a client-side web application built with vanilla JavaScript and local vendor libraries, **no build step or npm installation is required**.

### Option 1: Open Directly in Browser
Simply double-click `index.html` or open `file:///path/to/index.html` in any web browser.

### Option 2: Run via Local HTTP Server
```bash
# Using Python
python -m http.server 3000

# Or using Node.js static server
npx serve . -l 3000
```
Then visit `http://localhost:3000`.

---

## 📁 Repository Structure

```
├── css/
│   ├── design-system.css      # Design tokens, variables, typography & layout grid
│   └── components.css         # Component styles (KPI cards, search dropdown, sidebar, tables)
├── js/
│   ├── app.js                 # Router, state management & UI initialization
│   ├── db.js                  # IndexedDB schema & persistence helpers
│   ├── pipeline/              # ETL pipeline stages
│   │   ├── validator.js       # File & schema validator
│   │   ├── parser.js          # Excel AOA parsing & summary row filtering
│   │   ├── cleaner.js         # Normalization & weight conversion (KG/GM/L/ML)
│   │   ├── categorizer.js     # Word-boundary classification rules
│   │   ├── brandEngine.js     # Brand fingerprinting & fuzzy merge detection
│   │   ├── productEngine.js   # Product family grouping & variant extraction
│   │   └── aggregator.js      # Metric aggregation & KPI generation
│   ├── utils/
│   │   ├── formatters.js      # Currency, number & weight formatting
│   │   ├── nlEngine.js        # Natural language query engine
│   │   └── exporter.js        # CSV & XLSX export utility
│   └── views/                 # View controllers (Dashboard, Category, Brand, Quality, etc.)
├── vendor/                    # Local offline libraries (SheetJS, Fuse.js, Chart.js)
├── index.html                 # Main application entry point
└── README.md
```

---

## 📄 License

MIT License © 2026 Aman Kumar
