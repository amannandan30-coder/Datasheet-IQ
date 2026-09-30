window.App = window.App || {};

/* ============================================================
   DATASHEET IQ — ANALYTICS FUNNEL TRACKING SERVICE
   
   Privacy-first, fail-safe analytics abstraction.
   
   Design principles:
   1. NEVER block product flow — every call is try/catch wrapped
   2. NEVER capture PII — no emails, names, passwords, file contents
   3. Console-first — structured events logged for dev/debug
   4. Provider-ready — swap in PostHog, Umami, GA4, etc. via
      App.Analytics.registerProvider()
   5. Session-scoped — anonymous session ID, no cross-session tracking
   
   Funnel stages tracked:
     page_view → hero_cta_clicked → login_started / signup_started →
     login_success / signup_success → file_selected → upload_started →
     upload_success / upload_failed → processing_success / processing_failed →
     dashboard_reached → meaningful_action (export, drill-down, filter, etc.)
   ============================================================ */

App.Analytics = (() => {
  'use strict';

  /* ── Configuration ─────────────────────────────────────────── */
  const _config = {
    enabled: true,
    debug: false, // Set true for verbose console output in dev
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  };

  /* ── Session Management (anonymous, no PII) ────────────────── */
  const _sessionId = 'ses_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  let _sessionStart = Date.now();
  let _eventSequence = 0;
  let _lastEventTime = Date.now();

  /* ── External Provider Registry ────────────────────────────── */
  const _providers = [];

  /* ── Event Log (in-memory ring buffer for debugging) ──────── */
  const _eventLog = [];
  const MAX_LOG_SIZE = 200;

  /* ── Funnel Stage Definitions (ordered) ────────────────────── */
  const FUNNEL_STAGES = [
    'page_view',
    'hero_cta_clicked',
    'auth_started',
    'auth_success',
    'file_selected',
    'upload_started',
    'upload_success',
    'processing_success',
    'dashboard_reached',
    'meaningful_action',
  ];

  /* ── Funnel State (tracks furthest stage reached) ──────────── */
  let _furthestStage = -1;

  function _getFunnelIndex(eventName) {
    if (eventName === 'login_started' || eventName === 'signup_started' || eventName === 'auth_started') {
      return FUNNEL_STAGES.indexOf('auth_started');
    }
    if (eventName === 'login_success' || eventName === 'signup_success' || eventName === 'auth_success') {
      return FUNNEL_STAGES.indexOf('auth_success');
    }
    return FUNNEL_STAGES.indexOf(eventName);
  }

  /* ── Core: track() ─────────────────────────────────────────── */
  /**
   * Track an analytics event.
   * @param {string} eventName - The event name (e.g., 'page_view', 'hero_cta_clicked')
   * @param {Object} [properties={}] - Event properties (no PII allowed)
   */
  function track(eventName, properties = {}) {
    if (!_config.enabled) return;

    try {
      const now = Date.now();
      _eventSequence++;

      // Build structured event
      const event = {
        event: eventName,
        properties: {
          ...properties,
          session_id: _sessionId,
          event_sequence: _eventSequence,
          timestamp: new Date(now).toISOString(),
          time_since_session_start_ms: now - _sessionStart,
          time_since_last_event_ms: now - _lastEventTime,
          page_url: _sanitizeUrl(window.location.href),
          page_hash: _sanitizeHash(window.location.hash),
          referrer: document.referrer ? _sanitizeDomain(document.referrer) : null,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
          user_agent_category: _getUserAgentCategory(),
        },
      };

      _lastEventTime = now;

      // Track funnel progression (failures never advance furthest stage)
      const funnelIdx = _getFunnelIndex(eventName);
      if (funnelIdx !== -1 && funnelIdx > _furthestStage) {
        _furthestStage = funnelIdx;
        event.properties._funnel_stage = funnelIdx;
        event.properties._is_funnel_progression = true;
      }

      // Store in ring buffer
      _eventLog.push(event);
      if (_eventLog.length > MAX_LOG_SIZE) {
        _eventLog.shift();
      }

      // Console output (structured)
      _logToConsole(event);

      // Dispatch to external providers (fire-and-forget)
      _dispatchToProviders(event);

    } catch (err) {
      // Analytics must NEVER crash the app
      if (_config.debug) {
        console.warn('[Analytics] Error tracking event:', err);
      }
    }
  }

  /* ── Core: identify() ──────────────────────────────────────── */
  /**
   * Identify the current user (anonymous traits only, no PII).
   * @param {Object} [traits={}] - Anonymous traits (e.g., { auth_method: 'google' })
   */
  function identify(traits = {}) {
    if (!_config.enabled) return;

    try {
      const safeTraits = {
        auth_method: traits.auth_method || 'unknown',
        has_previous_uploads: traits.has_previous_uploads || false,
        account_age_category: traits.account_age_category || 'unknown',
      };

      track('user_identified', safeTraits);

      // Forward to external providers
      _providers.forEach(provider => {
        try {
          if (typeof provider.identify === 'function') {
            provider.identify(safeTraits);
          }
        } catch (e) { /* silent */ }
      });
    } catch (err) {
      if (_config.debug) {
        console.warn('[Analytics] Error in identify:', err);
      }
    }
  }

  /* ── Provider Registration ─────────────────────────────────── */
  /**
   * Register an external analytics provider.
   * Provider must implement: { name: string, track: function, identify?: function }
   * @param {Object} provider
   */
  function registerProvider(provider) {
    if (!provider || typeof provider.track !== 'function') {
      console.warn('[Analytics] Invalid provider (must have track function):', provider);
      return;
    }
    // Prevent duplicate registrations
    if (provider.name && _providers.some(p => p.name === provider.name)) {
      return;
    }
    _providers.push(provider);
    console.log(`[Analytics] Provider "${provider.name || 'unnamed'}" registered`);
  }

  /* ── First-Party Remote Ingestion Provider ─────────────────── */
  const _remoteProvider = {
    name: 'supabase_proxy',
    track(eventName, properties = {}) {
      try {
        const anonymous_session_id = properties.session_id || _sessionId;
        const timestamp = properties.timestamp || new Date().toISOString();
        const event_sequence = properties.event_sequence || 1;
        const page = properties.page_hash || (typeof window !== 'undefined' ? _sanitizeHash(window.location.hash) : null);

        // Sanitize and isolate metadata properties (strictly 0 PII)
        const metadata = {};
        for (const [key, val] of Object.entries(properties)) {
          if (
            key === 'session_id' ||
            key === 'timestamp' ||
            key === 'event_sequence' ||
            key === 'page_hash' ||
            key === 'event' ||
            key === '_funnel_stage' ||
            key === '_is_funnel_progression'
          ) {
            continue;
          }
          // Strict privacy safeguard: omit any fields resembling PII or credentials
          if (/email|password|token|secret|auth_token|user_id|uid|cookie|credential/i.test(key)) {
            continue;
          }
          // Omit string values containing email or JWT patterns
          if (typeof val === 'string' && (val.includes('@') || /^ey[A-Za-z0-9_-]{10,}\./.test(val))) {
            continue;
          }
          metadata[key] = val;
        }

        const payload = {
          anonymous_session_id,
          timestamp,
          event: eventName,
          page,
          event_sequence,
          metadata,
        };

        if (typeof fetch === 'function') {
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {
            // Fail silently from application and user perspective
          });
        }
      } catch (_) {
        // Analytics must never throw or disrupt application
      }
    }
  };

  // Automatically register the remote proxy provider
  registerProvider(_remoteProvider);

  /* ── Funnel Summary ────────────────────────────────────────── */
  /**
   * Get a snapshot of the current funnel state.
   * Useful for debugging and admin dashboards.
   */
  function getFunnelSummary() {
    const allStages = [
      ...FUNNEL_STAGES,
      'login_started', 'login_success',
      'signup_started', 'signup_success',
      'upload_failed', 'processing_failed',
    ];
    const stageCounts = {};
    allStages.forEach(stage => { stageCounts[stage] = 0; });

    _eventLog.forEach(event => {
      if (stageCounts.hasOwnProperty(event.event)) {
        stageCounts[event.event]++;
      }
      if (event.event === 'login_started' || event.event === 'signup_started') {
        stageCounts['auth_started'] = (stageCounts['auth_started'] || 0) + 1;
      }
      if (event.event === 'login_success' || event.event === 'signup_success') {
        stageCounts['auth_success'] = (stageCounts['auth_success'] || 0) + 1;
      }
    });

    return {
      session_id: _sessionId,
      session_start: new Date(_sessionStart).toISOString(),
      total_events: _eventSequence,
      furthest_funnel_stage: _furthestStage >= 0 ? FUNNEL_STAGES[_furthestStage] : 'none',
      stage_counts: stageCounts,
      event_log_size: _eventLog.length,
    };
  }

  /**
   * Get the full event log (in-memory ring buffer).
   * @returns {Array}
   */
  function getEventLog() {
    return [..._eventLog];
  }

  /* ── Private Helpers ───────────────────────────────────────── */

  function _logToConsole(event) {
    const emoji = _getEventEmoji(event.event);
    const funnelTag = event.properties._is_funnel_progression ? ' [FUNNEL ▸]' : '';
    const propsStr = Object.entries(event.properties)
      .filter(([k]) => !k.startsWith('_') && k !== 'session_id' && k !== 'timestamp' && k !== 'user_agent_category')
      .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : v}`)
      .join(', ');

    console.log(
      `%c[Analytics]%c ${emoji} ${event.event}${funnelTag}` +
      (propsStr ? ` — ${propsStr}` : ''),
      'color: #6366f1; font-weight: bold',
      'color: inherit'
    );
  }

  function _dispatchToProviders(event) {
    _providers.forEach(provider => {
      try {
        provider.track(event.event, event.properties);
      } catch (e) {
        if (_config.debug) {
          console.warn(`[Analytics] Provider "${provider.name}" error:`, e);
        }
      }
    });
  }

  function _getEventEmoji(eventName) {
    const emojiMap = {
      page_view: '👁️',
      hero_cta_clicked: '🎯',
      login_started: '🔑',
      signup_started: '📝',
      login_success: '✅',
      signup_success: '🎉',
      file_selected: '📁',
      upload_started: '⬆️',
      upload_success: '✅',
      upload_failed: '❌',
      processing_success: '⚙️✅',
      processing_failed: '⚙️❌',
      dashboard_reached: '📊',
      meaningful_action: '⭐',
      user_identified: '👤',
    };
    return emojiMap[eventName] || '📌';
  }

  /** Strip query params and hash to avoid leaking PII from URLs */
  function _sanitizeUrl(url) {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return 'unknown';
    }
  }

  /** Strip query parameter values from location hash to avoid leaking PII */
  function _sanitizeHash(hash) {
    if (!hash || typeof hash !== 'string') return '#/';
    const [routePart, qs] = hash.split('?');
    if (!qs) return routePart || '#/';
    try {
      const keys = Array.from(new URLSearchParams(qs).keys());
      return keys.length ? `${routePart}?${keys.join('&')}` : (routePart || '#/');
    } catch {
      return routePart || '#/';
    }
  }

  /** Extract only the domain from a referrer URL */
  function _sanitizeDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /** Categorize user agent without exposing the full string */
  function _getUserAgentCategory() {
    const ua = navigator.userAgent || '';
    if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'mobile';
    if (/Tablet|iPad/.test(ua)) return 'tablet';
    return 'desktop';
  }

  /** Map raw error strings to standardized safe error categories (no column names or data) */
  function categorizeError(err) {
    if (!err) return 'UNKNOWN_ERROR';
    const msg = typeof err === 'string' ? err : (err.message || '');
    const lower = msg.toLowerCase();
    if (lower.includes('column missing') || lower.includes('required column')) {
      return 'MISSING_REQUIRED_COLUMNS';
    }
    if (lower.includes('not a valid') || lower.includes('supported format') || lower.includes('file type') || lower.includes('extension')) {
      return 'INVALID_FORMAT';
    }
    if (lower.includes('empty') || lower.includes('no file') || lower.includes('corrupt') || lower.includes('invalid file')) {
      return 'INVALID_FILE';
    }
    if (lower.includes('parse') || lower.includes('reading excel') || lower.includes('sheet')) {
      return 'PARSE_ERROR';
    }
    return 'PROCESSING_ERROR';
  }

  /* ── Configuration ─────────────────────────────────────────── */
  function configure(opts = {}) {
    if (typeof opts.enabled === 'boolean') _config.enabled = opts.enabled;
    if (typeof opts.debug === 'boolean') _config.debug = opts.debug;
  }

  /* ── Public API ────────────────────────────────────────────── */
  return {
    track,
    identify,
    registerProvider,
    getFunnelSummary,
    getEventLog,
    configure,
    categorizeError,
    FUNNEL_STAGES,
  };
})();

console.log('[Analytics] DataSheet IQ Analytics v1.0 loaded | session=' + App.Analytics.FUNNEL_STAGES.length + ' funnel stages tracked');
