// Vercel Serverless Function: POST /api/archive/complete
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const authHeader = req.headers['authorization'];
  const userId = parseFirebaseUserId(authHeader);

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Valid Firebase Authentication required' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { uploadId, storagePath, sha256, fileSize, filename } = body;

    if (!uploadId || !storagePath) {
      return res.status(400).json({ ok: false, error: 'Missing required uploadId or storagePath' });
    }

    if (isR2Configured) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });

      const headCmd = new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storagePath,
      });
      await s3Client.send(headCmd);
    }

    return res.status(200).json({
      ok: true,
      archiveId: uploadId,
      storagePath,
      sha256,
      fileSize,
      originalFilename: filename,
      archiveStatus: 'uploaded',
      archivedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[VERCEL-API] complete error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
