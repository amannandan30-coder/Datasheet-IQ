window.App = window.App || {};
App.Services = App.Services || {};

/* ============================================================
   LIQUIDATION IQ - CLOUDFLARE R2 ORIGINAL FILE ARCHIVE SERVICE
   ============================================================
   Goal: Archiving the exact, untouched original uploaded file
   to Cloudflare R2 using short-lived pre-signed PUT URLs.
   ============================================================ */

App.Storage = (() => {

  /**
   * Compute SHA-256 hash of an ArrayBuffer, Uint8Array, or File/Blob
   * @param {File|Blob|ArrayBuffer|Uint8Array} fileOrBuffer
   * @returns {Promise<string>} 64-character hex string
   */
  async function computeSHA256(fileOrBuffer) {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer.buffer instanceof ArrayBuffer && fileOrBuffer.byteLength !== undefined) {
      arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
    } else if (typeof fileOrBuffer.arrayBuffer === 'function') {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('Unsupported input type for SHA-256 calculation');
    }

    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    throw new Error('Web Crypto API (crypto.subtle.digest) is required for SHA-256 verification');
  }

  /**
   * Sanitize a filename for use in storage object paths
   * @param {string} filename
   * @returns {string}
   */
  function sanitizeStorageFilename(filename) {
    if (!filename || typeof filename !== 'string') return 'uploaded_file.xlsx';
    const clean = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return clean || 'uploaded_file.xlsx';
  }

  /**
   * Retrieve current Firebase Auth ID token
   * @returns {Promise<string|null>}
   */
  async function getAuthIdToken() {
    try {
      if (App.Auth && typeof App.Auth.getIdToken === 'function') {
        const token = await App.Auth.getIdToken();
        if (token) return token;
      }
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return await firebase.auth().currentUser.getIdToken();
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to acquire Firebase ID token:', e.message);
    }
    return null;
  }

  /**
   * Archive an untouched original file to Cloudflare R2 using pre-signed PUT URLs.
   * Flow:
   *   1. compute SHA-256 on untouched original File bytes
   *   2. POST /api/archive/create-upload -> get short-lived presigned PUT URL
   *   3. direct PUT of raw original File bytes to R2
   *   4. POST /api/archive/complete -> verify and record archive metadata
   *
   * @param {File|Blob} originalFile - The pristine raw browser File/Blob from input
   * @param {Object} [customMeta={}] - Additional metadata tags
   * @returns {Promise<Object>} Archive result with metadata
   */
  async function archiveOriginalFile(originalFile, customMeta = {}) {
    if (!originalFile || !(originalFile instanceof Blob)) {
      console.error('[STORAGE] archive:failed - Input is not a valid File/Blob');
      return {
        ok: false,
        archiveStatus: 'failed',
        error: 'No valid file provided for archiving'
      };
    }

    const originalFilename = originalFile.name || customMeta.originalFilename || 'unnamed_file.xlsx';
    const fileSize = originalFile.size || 0;
    const mimeType = originalFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const uploadId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : ('up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
    const timestamp = new Date().toISOString();

    // ── Transition: archive:start ──────────────────────────────
    console.log(`[STORAGE] archive:start | filename="${originalFilename}" | size=${fileSize} bytes | uploadId=${uploadId}`);

    let sha256 = null;
    try {
      sha256 = await computeSHA256(originalFile);
    } catch (hashErr) {
      console.error(`[STORAGE] archive:failed - SHA-256 computation failed: ${hashErr.message}`);
      return {
        ok: false,
        archiveId: uploadId,
        originalFilename,
        fileSize,
        mimeType,
        uploadedAt: timestamp,
        archiveStatus: 'failed',
        error: `Integrity check failed: ${hashErr.message}`
      };
    }

    // Acquire Firebase Auth ID token
    const idToken = await getAuthIdToken();
    if (!idToken) {
      console.warn(`[STORAGE] archive:failed - User is unauthenticated (Firebase ID token unavailable)`);
      return {
        ok: false,
        archiveId: uploadId,
        originalFilename,
        sha256,
        fileSize,
        mimeType,
        uploadedAt: timestamp,
        archiveStatus: 'failed',
        error: 'Authentication required: User is not signed in to Firebase'
      };
    }

    // ── Step 1: POST /api/archive/create-upload ─────────────────
    console.log(`[STORAGE] archive:presign | requesting presigned URL for uploadId=${uploadId}`);
    let createData = null;
    try {
      const createSignal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) 
        ? AbortSignal.timeout(15000) 
        : undefined;

      const createRes = await fetch('/api/archive/create-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          filename: originalFilename,
          fileSize,
          mimeType,
          sha256,
          uploadId
        }),
        signal: createSignal
      });

      if (createRes.status === 503) {
        const errJson = await createRes.json().catch(() => ({}));
        console.warn(`[STORAGE] archive:skipped - ${errJson.error || 'Cloudflare R2 is not configured'}`);
        return {
          ok: false,
          archiveId: uploadId,
          originalFilename,
          sha256,
          fileSize,
          mimeType,
          uploadedAt: timestamp,
          archiveStatus: 'skipped',
          error: errJson.error || 'Cloudflare R2 is not configured on this server'
        };
      }

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({ error: createRes.statusText }));
        if (errJson.code === 'R2_NOT_CONFIGURED') {
          console.warn(`[STORAGE] archive:skipped - ${errJson.error}`);
          return {
            ok: false,
            archiveId: uploadId,
            originalFilename,
            sha256,
            fileSize,
            mimeType,
            uploadedAt: timestamp,
            archiveStatus: 'skipped',
            error: errJson.error
          };
        }
        throw new Error(errJson.error || `HTTP ${createRes.status} from create-upload`);
      }

      createData = await createRes.json();
      if (!createData.ok || !createData.uploadUrl) {
        throw new Error(createData.error || 'Failed to obtain R2 presigned upload URL');
      }
    } catch (createErr) {
      console.error(`[STORAGE] archive:failed - Create-upload failed: ${createErr.message}`);
      return {
        ok: false,
        archiveId: uploadId,
        originalFilename,
        sha256,
        fileSize,
        mimeType,
        uploadedAt: timestamp,
        archiveStatus: 'failed',
        error: `Archive presign error: ${createErr.message}`
      };
    }

    const { uploadUrl, storagePath } = createData;

    // ── Step 2: Direct PUT of raw File bytes to R2 ───────────────
    console.log(`[STORAGE] archive:upload | sending ${fileSize} raw bytes directly to presigned URL | path=${storagePath}`);
    try {
      // Dynamic timeout: at least 60 seconds, scaling appropriately for file size (~50 KB/s transfer assumption)
      const uploadTimeoutMs = Math.max(60000, Math.min(300000, Math.ceil(fileSize / (50 * 1024)) * 1000));
      const uploadSignal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) 
        ? AbortSignal.timeout(uploadTimeoutMs) 
        : undefined;

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType
        },
        body: originalFile,
        signal: uploadSignal
      });

      if (!putRes.ok) {
        throw new Error(`R2 upload rejected with status ${putRes.status} (${putRes.statusText})`);
      }
    } catch (putErr) {
      console.error(`[STORAGE] archive:failed - Direct PUT to R2 failed: ${putErr.message}`);
      return {
        ok: false,
        archiveId: uploadId,
        storagePath,
        originalFilename,
        sha256,
        fileSize,
        mimeType,
        uploadedAt: timestamp,
        archiveStatus: 'failed',
        error: `R2 transfer error: ${putErr.message}`
      };
    }

    // ── Step 3: POST /api/archive/complete ──────────────────────
    console.log(`[STORAGE] archive:complete | finalizing archive metadata for uploadId=${uploadId}`);
    try {
      const compSignal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) 
        ? AbortSignal.timeout(15000) 
        : undefined;

      const compRes = await fetch('/api/archive/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uploadId,
          storagePath,
          sha256,
          fileSize,
          filename: originalFilename
        }),
        signal: compSignal
      });

      if (!compRes.ok) {
        const compErrJson = await compRes.json().catch(() => ({ error: compRes.statusText }));
        throw new Error(compErrJson.error || `HTTP ${compRes.status} from complete`);
      }

      const compData = await compRes.json();
      console.log(`[STORAGE] archive:complete | successfully archived to ${storagePath} (SHA-256: ${sha256})`);

      return {
        ok: true,
        archiveId: uploadId,
        storagePath,
        originalFilename,
        sha256,
        fileSize,
        mimeType,
        uploadedAt: compData.archivedAt || timestamp,
        archiveStatus: 'uploaded'
      };
    } catch (compErr) {
      console.warn(`[STORAGE] archive:failed - Completion notification failed: ${compErr.message}`);
      // The file was transferred, but completion confirmation had an issue
      return {
        ok: true,
        archiveId: uploadId,
        storagePath,
        originalFilename,
        sha256,
        fileSize,
        mimeType,
        uploadedAt: timestamp,
        archiveStatus: 'uploaded',
        archiveWarning: `Completion confirmation warning: ${compErr.message}`
      };
    }
  }

  return {
    archiveOriginalFile,
    computeSHA256,
    sanitizeStorageFilename,
    getAuthIdToken
  };
})();
