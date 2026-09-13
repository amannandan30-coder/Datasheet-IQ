// Vercel Serverless Function: GET /api/archive/download
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'liquidation-iq-archives';
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

const isR2Configured = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && (R2_ENDPOINT || R2_ACCOUNT_ID));

function parseFirebaseUserId(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload.user_id || payload.sub || payload.uid || 'authenticated_user';
  } catch (err) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const authHeader = req.headers['authorization'];
  const requestingUserId = parseFirebaseUserId(authHeader);

  if (!requestingUserId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Valid Firebase Authentication required' });
  }

  const storagePath = req.query.path;
  if (!storagePath) {
    return res.status(400).json({ ok: false, error: 'Missing path query parameter' });
  }

  // Path format: original-uploads/{ownerUserId}/{uploadId}/{filename}
  const pathParts = storagePath.split('/');
  if (pathParts.length < 4 || pathParts[0] !== 'original-uploads') {
    return res.status(400).json({ ok: false, error: 'Malformed storage path' });
  }

  const ownerUserId = pathParts[1];

  // ── STRICT USER ISOLATION ENFORCEMENT ───────────────────────
  if (requestingUserId !== ownerUserId) {
    console.warn(`[SECURITY] User isolation violation blocked: user "${requestingUserId}" tried to download archive owned by "${ownerUserId}"`);
    return res.status(403).json({
      ok: false,
      error: 'Forbidden: You do not have permission to access archives belonging to another user',
      code: 'USER_ISOLATION_VIOLATION'
    });
  }

  if (!isR2Configured) {
    return res.status(503).json({ ok: false, error: 'R2 storage credentials not configured on Vercel' });
  }

  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const getCmd = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
    });
    const s3Obj = await s3Client.send(getCmd);
    const filename = pathParts[3] || 'archive.xlsx';

    res.setHeader('Content-Type', s3Obj.ContentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (s3Obj.ContentLength) {
      res.setHeader('Content-Length', s3Obj.ContentLength);
    }
    s3Obj.Body.pipe(res);
  } catch (err) {
    console.error('[VERCEL-API] download error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
