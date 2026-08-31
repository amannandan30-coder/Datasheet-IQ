/* global namespace */
window.App = window.App || {};

/* ============================================================
   DB — IndexedDB Wrapper
   ============================================================ */
App.DB = (() => {
  const DB_NAME    = 'LiquidationIQ';
  const DB_VERSION = 3;
  let _db = null;

  /* ── Schema ──────────────────────────────────────────────── */
  const STORES = {
    datasets:                 { keyPath:'id', indexes: [{ name:'uploadedAt', keyPath:'uploadedAt' }] },
    inventory_records:        { keyPath:'id', indexes: [
      { name:'dataset_id',          keyPath:'dataset_id' },
      { name:'normalized_brand',    keyPath:'normalized_brand' },
      { name:'normalized_category', keyPath:'normalized_category' },
      { name:'warehouse_id',        keyPath:'warehouse_id' },
      { name:'product_family_id',   keyPath:'product_family_id' },
    ]},
    brands:                   { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }] },
    categories:               { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }] },
    subcategories:            { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }] },
    product_families:         { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }, { name:'brand_id', keyPath:'brand_id' }] },
    product_variants:         { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }, { name:'product_family_id', keyPath:'product_family_id' }] },
    warehouses:               { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }] },
    normalization_suggestions:{ keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }, { name:'status', keyPath:'status' }] },
    data_quality_issues:      { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }, { name:'issue_type', keyPath:'issue_type' }] },
    excluded_records:         { keyPath:'id', indexes: [{ name:'dataset_id', keyPath:'dataset_id' }, { name:'_exclude_reason', keyPath:'_exclude_reason' }] },
  };

  /* ── Open ────────────────────────────────────────────────── */
  function open() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [storeName, cfg] of Object.entries(STORES)) {
          let store;
          if (!db.objectStoreNames.contains(storeName)) {
            store = db.createObjectStore(storeName, { keyPath: cfg.keyPath, autoIncrement: false });
          } else {
            store = e.target.transaction.objectStore(storeName);
          }
          if (cfg.indexes) {
            for (const idx of cfg.indexes) {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, { unique: false });
              }
            }
          }
        }
      };
      req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror    = (e) => reject(e.target.error);
    });
  }

  /* ── Generic helpers ─────────────────────────────────────── */
  function tx(store, mode = 'readonly') {
    return _db.transaction(store, mode);
  }

  function wrap(req) {
    return new Promise((res, rej) => {
      req.onsuccess = (e) => res(e.target.result);
      req.onerror   = (e) => rej(e.target.error);
    });
  }

  /* ── Put (single item, id must be set) ───────────────────── */
  async function put(storeName, item) {
    await open();
    if (!item.id) item.id = crypto.randomUUID();
    return wrap(tx(storeName, 'readwrite').objectStore(storeName).put(item));
  }

  /* ── Bulk put ────────────────────────────────────────────── */
  async function putBulk(storeName, items, onProgress) {
    await open();
    return new Promise((resolve, reject) => {
      const t = _db.transaction(storeName, 'readwrite');
      const st = t.objectStore(storeName);
      let i = 0;
      const total = items.length;
      function next() {
        if (i >= total) return;
        const item = items[i];
        if (!item.id) item.id = crypto.randomUUID();
        const req = st.put(item);
        req.onsuccess = () => {
          i++;
          if (onProgress && i % 500 === 0) onProgress(i, total);
          next();
        };
        req.onerror = (e) => reject(e.target.error);
      }
      // Batch in chunks to avoid transaction timeout
      const CHUNK = 500;
      function processBatch() {
        for (let j = 0; j < CHUNK && i < total; j++) {
          const item = items[i];
          if (!item.id) item.id = crypto.randomUUID();
          st.put(item);
          i++;
        }
        if (onProgress) onProgress(i, total);
      }
      t.oncomplete = () => resolve(i);
      t.onerror = (e) => reject(e.target.error);
      // Process all items - IndexedDB batches transactions
      for (const item of items) {
        if (!item.id) item.id = crypto.randomUUID();
        st.put(item);
      }
    });
  }

  /* ── Get by id ───────────────────────────────────────────── */
  async function get(storeName, id) {
    await open();
    return wrap(tx(storeName).objectStore(storeName).get(id));
  }

  /* ── Get all from store ──────────────────────────────────── */
  async function getAll(storeName) {
    await open();
    return wrap(tx(storeName).objectStore(storeName).getAll());
  }

  /* ── Get all by index ────────────────────────────────────── */
  async function getAllByIndex(storeName, indexName, value) {
    await open();
    return wrap(
      tx(storeName).objectStore(storeName).index(indexName).getAll(value)
    );
  }

  /* ── Delete by id ────────────────────────────────────────── */
  async function del(storeName, id) {
    await open();
    return wrap(tx(storeName, 'readwrite').objectStore(storeName).delete(id));
  }

  /* ── Clear store by dataset_id ───────────────────────────── */
  async function clearByDataset(storeName, dataset_id) {
    await open();
    return new Promise((resolve, reject) => {
      const t = _db.transaction(storeName, 'readwrite');
      const st = t.objectStore(storeName);
      const idx = st.index('dataset_id');
      const req = idx.openCursor(IDBKeyRange.only(dataset_id));
      let count = 0;
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) { resolve(count); return; }
        cursor.delete();
        count++;
        cursor.continue();
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /* ── Count all in store ──────────────────────────────────── */
  async function count(storeName) {
    await open();
    return wrap(tx(storeName).objectStore(storeName).count());
  }

  /* ── Count by index ──────────────────────────────────────── */
  async function countByIndex(storeName, indexName, value) {
    await open();
    return wrap(
      tx(storeName).objectStore(storeName).index(indexName).count(IDBKeyRange.only(value))
    );
  }

  /* ── Cursor query with filters ───────────────────────────── */
  async function query(storeName, { indexName, indexValue, filter, limit, offset = 0 } = {}) {
    await open();
    return new Promise((resolve, reject) => {
      const t = _db.transaction(storeName, 'readonly');
      const st = t.objectStore(storeName);
      const source = indexName
        ? st.index(indexName).openCursor(IDBKeyRange.only(indexValue))
        : st.openCursor();

      const results = [];
      let skipped = 0;
      source.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) { resolve(results); return; }
        const item = cursor.value;
        if (!filter || filter(item)) {
          if (skipped < offset) { skipped++; }
          else {
            results.push(item);
            if (limit && results.length >= limit) { resolve(results); return; }
          }
        }
        cursor.continue();
      };
      source.onerror = (e) => reject(e.target.error);
    });
  }

  /* ── Dataset convenience helpers ─────────────────────────── */
  async function saveDataset(ds) { return put('datasets', ds); }
  async function getDataset(id)  { return get('datasets', id); }
  async function getAllDatasets() {
    const all = await getAll('datasets');
    return all.sort((a,b) => b.uploadedAt - a.uploadedAt);
  }
  async function deleteDataset(id) {
    // Delete from all stores
    const stores = ['inventory_records','brands','categories','subcategories','product_families','product_variants','warehouses','normalization_suggestions','data_quality_issues','excluded_records'];
    for (const s of stores) {
      try { await clearByDataset(s, id); } catch(e) { /* ignore */ }
    }
    return del('datasets', id);
  }

  return {
    open, put, putBulk, get, getAll, getAllByIndex, del, clearByDataset,
    count, countByIndex, query,
    saveDataset, getDataset, getAllDatasets, deleteDataset
  };
})();
