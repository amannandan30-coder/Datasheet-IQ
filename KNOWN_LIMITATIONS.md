# DataSheet IQ — Known Limitations & Operational Guidelines

**Version:** `v3.4.0-RC1`  
**Build Identifier:** `Build 20260905.01`  
**Document Status:** Release Baseline Documentation  
**Date:** September 5, 2026  

---

## 1. Scope & Architecture Boundaries

DataSheet IQ is designed from the ground up as a **100% client-side, local-first inventory intelligence web application**. All file parsing, data cleaning, brand deduplication, classification, and financial reconciliation happen within the user's local browser memory and IndexedDB storage.

While this architecture guarantees privacy and avoids server data leakage, it comes with operational boundaries documented below.

---

## 2. Documented Operational Limitations

### A. Client Browser Memory Ceilings
- **Recommended Manifest Size:** Up to **100,000 inventory rows** per individual Excel workbook.
- **Maximum Tested Volume:** Tested successfully up to **100,000 rows** in 6.4 seconds.
- **Extreme Scale (> 300,000 rows):** Browser tab memory limits (typically 2 GB in modern Chromium browsers) may cause UI throttling or GC pauses during synchronous table re-renders if a single sheet exceeds 300,000 rows without pagination.
- **Mitigation:** DataSheet IQ utilizes virtualized list rendering and 25-row paginated tables to maintain smooth 60 FPS scrolling regardless of dataset size.

### B. Password-Protected & Encrypted Spreadsheets
- **Current Behavior:** Excel spreadsheets encrypted with native Microsoft Excel password protection cannot be decrypted client-side without the password provider module.
- **User Guidance:** The file ingestion pipeline cleanly detects unreadable password streams, catches the parse exception gracefully, and presents a clear modal message: *"Unable to decrypt password-protected workbook. Please unlock the file in Excel prior to upload."*

### C. Non-Standard Macro-Enabled Formats (.xlsm / .xlsb)
- **Supported Formats:** Standard Modern Excel (`.xlsx`), Legacy Excel (`.xls`), and Comma-Separated Values (`.csv`).
- **Binary/Macro Workbooks:** `.xlsm` and `.xlsb` workbooks containing embedded VBA macros are parsed for raw data cells only; macro execution is deliberately bypassed for security reasons.

### D. Extreme Image / Drawing Bloat in Excel
- **Current Behavior:** Workbooks embedded with thousands of uncompressed product images will experience longer initial array buffer load times during raw file read.
- **Mitigation:** The parser extracts cell textual and numeric values while discarding heavy binary drawing blobs to conserve client memory.

### E. Business FM Reference Profile Applicability
- **Profile Scope:** The 20-bucket Business FM Profile is calibrated specifically for FMCG and Grocery liquidation manifests (Grofers, Blinkit, Zepto, BigBasket formats).
- **Behavior on Non-Grocery Workbooks:** When non-grocery workbooks (e.g., Electronics, Automotive, Healthcare) are uploaded, DataSheet IQ automatically defaults to the Universal Canonical 12-Domain Standard and safely hides the FMCG-specific 20-bucket selector to prevent user confusion.

---

## 3. Recommended Operational Best Practices

1. **Browser Selection:** Use modern Chromium-based browsers (Chrome, Edge, Brave, Opera) or Firefox for optimal WebAssembly and IndexedDB transaction throughput.
2. **Multi-Workbook Management:** Use the built-in *Uploads History* interface (`#/uploads`) to switch between datasets or execute clean cascade purges when finished analyzing sensitive manifests.
3. **Export Integrity:** When opening exported multi-sheet XLSX files in external spreadsheet tools, formula safety protection prefixes may display a leading apostrophe on cells originally beginning with `=`, `+`, or `-`. This is intentional security hardening.
