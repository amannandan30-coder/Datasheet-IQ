// Vercel Serverless Function & Local Route: POST /api/analytics/track
// Proxies anonymous analytics events to Supabase REST API (public.analytics_events)
// using server-side environment variables. No client-side Supabase keys.

const https = require('https');

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBodyStream(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) { // 1MB limit for analytics payload
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead(204);
    res.end();
    return;
  }

  // Method Guard: POST only
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  }

  // Parse Body
  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      const raw = typeof body === 'string' ? body : await readBodyStream(req);
      body = JSON.parse(raw);
    } catch (_) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON payload' });
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendJson(res, 400, { ok: false, error: 'Request body must be a JSON object' });
  }

  // Validate Fields
  const { anonymous_session_id, timestamp, event, page, event_sequence, metadata } = body;

  if (!event || typeof event !== 'string' || event.trim().length === 0 || event.length > 64) {
    return sendJson(res, 400, { ok: false, error: 'Invalid or missing "event" name' });
  }

  if (!anonymous_session_id || typeof anonymous_session_id !== 'string' || anonymous_session_id.trim().length === 0 || anonymous_session_id.length > 128) {
    return sendJson(res, 400, { ok: false, error: 'Invalid or missing "anonymous_session_id"' });
  }

  if (!timestamp || typeof timestamp !== 'string' || isNaN(Date.parse(timestamp))) {
    return sendJson(res, 400, { ok: false, error: 'Invalid or missing "timestamp" (must be valid ISO date string)' });
  }

  if (event_sequence === undefined || event_sequence === null || !Number.isInteger(event_sequence) || event_sequence < 1) {
    return sendJson(res, 400, { ok: false, error: 'Invalid or missing "event_sequence" (must be positive integer)' });
  }

  if (page !== undefined && page !== null && (typeof page !== 'string' || page.length > 256)) {
    return sendJson(res, 400, { ok: false, error: 'Invalid "page" property' });
  }

  if (metadata !== undefined && metadata !== null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
    return sendJson(res, 400, { ok: false, error: 'Invalid "metadata" property (must be object)' });
  }

  // Check Environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail safe: do not crash, do not leak keys
    console.warn('[ANALYTICS] Supabase URL or anon key not configured in environment');
    return sendJson(res, 503, { ok: false, code: 'ANALYTICS_NOT_CONFIGURED', error: 'Analytics service not configured' });
  }

  // Build Approved Forwarding Record (strictly whitelisted columns)
  const safeRecord = {
    anonymous_session_id: anonymous_session_id.trim(),
    timestamp: new Date(timestamp).toISOString(),
    event: event.trim(),
    page: page ? String(page).trim() : null,
    event_sequence: Math.floor(event_sequence),
    metadata: (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) ? metadata : {}
  };

  // Forward to Supabase via PostgREST
  try {
    const postData = JSON.stringify(safeRecord);
    const targetUrl = new URL('/rest/v1/analytics_events', supabaseUrl);

    const result = await new Promise((resolve) => {
      const upstreamReq = https.request(targetUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Prefer': 'return=minimal'
        },
        timeout: 5000 // 5s timeout
      }, upstreamRes => {
        let respData = '';
        upstreamRes.on('data', c => { respData += c; });
        upstreamRes.on('end', () => {
          resolve({
            statusCode: upstreamRes.statusCode,
            body: respData
          });
        });
      });

      upstreamReq.on('timeout', () => {
        upstreamReq.destroy();
        resolve({ statusCode: 504, error: 'Upstream timeout' });
      });

      upstreamReq.on('error', (err) => {
        resolve({ statusCode: 502, error: err.message });
      });

      upstreamReq.write(postData);
      upstreamReq.end();
    });

    if (result.statusCode === 201) {
      return sendJson(res, 200, { ok: true });
    } else {
      console.warn(`[ANALYTICS] Supabase responded with status ${result.statusCode}`);
      return sendJson(res, 502, { ok: false, error: 'Failed to record event upstream' });
    }
  } catch (err) {
    console.error('[ANALYTICS] Internal error processing analytics event:', err.message);
    return sendJson(res, 500, { ok: false, error: 'Internal analytics error' });
  }
};
