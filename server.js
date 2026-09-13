const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env file if present
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('[SERVER] Could not read .env file:', e.message);
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;

// Cloudflare R2 S3-compatible configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'liquidation-iq-archives';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

const isR2Configured = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && (R2_ENDPOINT || R2_ACCOUNT_ID));

let s3Client = null;
let PutObjectCommand = null;
let HeadObjectCommand = null;
let GetObjectCommand = null;
let getSignedUrl = null;

if (isR2Configured) {
  try {
    const s3 = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    PutObjectCommand = s3.PutObjectCommand;
    HeadObjectCommand = s3.HeadObjectCommand;
    GetObjectCommand = s3.GetObjectCommand;
    getSignedUrl = presigner.getSignedUrl;

    s3Client = new s3.S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log(`[R2] Cloudflare R2 configured successfully. Bucket: ${R2_BUCKET_NAME}, Endpoint: ${R2_ENDPOINT}`);
  } catch (err) {
    console.error('[R2] Failed to initialize AWS S3 SDK for R2:', err);
    s3Client = null;
  }
} else {
  console.log('[R2] Real Cloudflare R2 credentials not found in environment. Local dev emulator enabled for /api/archive.');
}

// In-memory store for local dev emulator uploads
const mockR2Store = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Helper to read JSON request body
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit for JSON
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Helper to extract user ID from Firebase ID token (JWT)
 */
function parseFirebaseUserId(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  // Development/offline bypass
  if (token === 'dev-token' || token.startsWith('mock_')) return 'dev_user_local';

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    // Verify not expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.warn('[AUTH] Firebase ID token expired');
      return null;
    }
    return payload.user_id || payload.sub || payload.uid || 'authenticated_user';
  } catch (err) {
    console.warn('[AUTH] Failed to decode Firebase JWT payload:', err.message);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const pathname = urlParts[0];
  const queryStr = urlParts[1] || '';

  // ── CORS Headers for API calls ──────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API ROUTES: ORIGINAL FILE ARCHIVE ───────────────────────
  if (pathname === '/api/archive/create-upload' && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'];
      const userId = parseFirebaseUserId(authHeader);

      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Valid Firebase Authentication required' }));
        return;
      }

      const body = await readJsonBody(req);
      const { filename, fileSize, mimeType, sha256, uploadId } = body;

      if (!uploadId || !sha256) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing required uploadId or sha256' }));
        return;
      }

      // Check if simulation mode forces unconfigured behavior
      if (process.env.R2_SIMULATE_UNCONFIGURED === 'true') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          code: 'R2_NOT_CONFIGURED',
          error: 'Cloudflare R2 is not configured on this server'
        }));
        return;
      }

      const cleanFilename = (filename || 'file.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `original-uploads/${userId}/${uploadId}/${cleanFilename}`;

      // Case 1: Real Cloudflare R2 configured
      if (isR2Configured && s3Client) {
        const putCmd = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath,
          ContentType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          Metadata: {
            uploadid: String(uploadId),
            userid: String(userId),
            sha256: String(sha256),
            originalfilename: String(cleanFilename)
          }
        });

        const uploadUrl = await getSignedUrl(s3Client, putCmd, { expiresIn: 300 });
        console.log(`[R2] Generated presigned PUT for key: ${storagePath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          uploadUrl,
          storagePath,
          uploadId,
          expiresIn: 300,
          provider: 'cloudflare-r2'
        }));
        return;
      }

      // Case 2: Local Dev Emulator (when live R2 credentials are not set on local machine)
      const mockPutUrl = `http://localhost:${PORT}/api/archive/mock-r2-upload?uploadId=${encodeURIComponent(uploadId)}&path=${encodeURIComponent(storagePath)}`;
      mockR2Store.set(uploadId, {
        userId,
        storagePath,
        sha256,
        fileSize,
        cleanFilename,
        mimeType,
        status: 'presigned',
        createdAt: Date.now()
      });

      console.log(`[LOCAL-R2] Generated local presigned URL for upload: ${uploadId} -> ${storagePath}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        uploadUrl: mockPutUrl,
        storagePath,
        uploadId,
        expiresIn: 300,
        provider: 'local-dev-emulator'
      }));
      return;
    } catch (apiErr) {
      console.error('[API] /api/archive/create-upload error:', apiErr);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: apiErr.message }));
      return;
    }
  }

  // Local R2 Emulator PUT receiver
  if (pathname === '/api/archive/mock-r2-upload' && req.method === 'PUT') {
    const params = new URLSearchParams(queryStr);
    const uploadId = params.get('uploadId');
    const storagePath = params.get('path');

    if (!uploadId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing uploadId' }));
      return;
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const meta = mockR2Store.get(uploadId) || {};
      meta.status = 'uploaded';
      meta.uploadedBytes = buffer.length;
      meta.uploadedSha256 = computedHash;
      meta.uploadedAt = new Date().toISOString();
      meta.buffer = buffer;
      mockR2Store.set(uploadId, meta);

      console.log(`[LOCAL-R2] Received direct PUT for upload ${uploadId} (${buffer.length} bytes, SHA-256: ${computedHash})`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  if (pathname === '/api/archive/complete' && req.method === 'POST') {
    try {
      const authHeader = req.headers['authorization'];
      const userId = parseFirebaseUserId(authHeader);

      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Valid Firebase Authentication required' }));
        return;
      }

      const body = await readJsonBody(req);
      const { uploadId, storagePath, sha256, fileSize, filename } = body;

      if (!uploadId || !storagePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing uploadId or storagePath' }));
        return;
      }

      // If live R2 configured, optionally verify object exists
      if (isR2Configured && s3Client && HeadObjectCommand) {
        try {
          const headCmd = new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: storagePath
          });
          const headRes = await s3Client.send(headCmd);
          console.log(`[R2] Verified uploaded object in bucket: ${storagePath} (size: ${headRes.ContentLength})`);
        } catch (headErr) {
          console.warn(`[R2] HeadObject verification check: ${headErr.message}`);
        }
      } else {
        const mockMeta = mockR2Store.get(uploadId);
        if (mockMeta) {
          console.log(`[LOCAL-R2] Finalized upload ${uploadId} verified in local store.`);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        archiveId: uploadId,
        storagePath,
        sha256,
        fileSize,
        originalFilename: filename,
        archiveStatus: 'uploaded',
        archivedAt: new Date().toISOString()
      }));
      return;
    } catch (compErr) {
      console.error('[API] /api/archive/complete error:', compErr);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: compErr.message }));
      return;
    }
  }

  // ── API ROUTE: SECURE ARCHIVE DOWNLOAD (WITH USER ISOLATION) ──
  if (pathname === '/api/archive/download' && req.method === 'GET') {
    try {
      const authHeader = req.headers['authorization'];
      const requestingUserId = parseFirebaseUserId(authHeader);

      if (!requestingUserId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Valid Firebase Authentication required' }));
        return;
      }

      const params = new URLSearchParams(queryStr);
      const storagePath = params.get('path');
      const uploadId = params.get('uploadId');

      if (!storagePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing storagePath query parameter' }));
        return;
      }

      // Canonical path: original-uploads/{ownerUserId}/{uploadId}/{filename}
      const pathParts = storagePath.split('/');
      if (pathParts.length < 4 || pathParts[0] !== 'original-uploads') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Malformed storage path' }));
        return;
      }

      const ownerUserId = pathParts[1];

      // ── STRICT USER ISOLATION ENFORCEMENT ───────────────────────
      // If the requesting user does not own this object path, deny immediately with HTTP 403 Forbidden!
      if (requestingUserId !== ownerUserId) {
        console.warn(`[SECURITY] User isolation violation blocked: user "${requestingUserId}" attempted to access archive of user "${ownerUserId}" (path: ${storagePath})`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: 'Forbidden: You do not have permission to access archives belonging to another user',
          code: 'USER_ISOLATION_VIOLATION'
        }));
        return;
      }

      // Case 1: Real Cloudflare R2 configured
      if (isR2Configured && s3Client && GetObjectCommand) {
        const getCmd = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath
        });
        const s3Obj = await s3Client.send(getCmd);
        const filename = pathParts[3] || 'archive.xlsx';

        res.writeHead(200, {
          'Content-Type': s3Obj.ContentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': s3Obj.ContentLength
        });
        s3Obj.Body.pipe(res);
        return;
      }

      // Case 2: Local Dev Emulator store
      const mockMeta = uploadId ? mockR2Store.get(uploadId) : Array.from(mockR2Store.values()).find(m => m.storagePath === storagePath);
      if (mockMeta && mockMeta.buffer) {
        const filename = pathParts[3] || 'archive.xlsx';
        res.writeHead(200, {
          'Content-Type': mockMeta.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': mockMeta.buffer.length
        });
        res.end(mockMeta.buffer);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Archived file not found in storage' }));
      return;
    } catch (downErr) {
      console.error('[API] /api/archive/download error:', downErr);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: downErr.message }));
      return;
    }
  }

  // ── STATIC FILE SERVING ─────────────────────────────────────
  let reqUrl = decodeURI(pathname);
  if (reqUrl === '/') reqUrl = '/index.html';

  let filePath = path.join(__dirname, reqUrl);
  
  // Security check: ensure path is within directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Liquidation IQ server running at http://localhost:${PORT}`);
});
