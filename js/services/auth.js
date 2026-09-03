window.App = window.App || {};

/* ============================================================
   LIQUIDATION IQ — CENTRALIZED FIREBASE AUTHENTICATION SERVICE
   ============================================================ */
App.Auth = (() => {
  let _auth = null;
  let _authListeners = [];
  let _initPromise = null;
  let _unsubscribeAuthState = null;
  let _isProcessingRedirect = false;
  const _t0 = performance.now();

  function _ts() { return (performance.now() - _t0).toFixed(1) + 'ms'; }

  const state = {
    isInitialized: false,
    isAuthenticated: false,
    currentUser: null,
    context: {
      userId: null,
      tenantId: null,
      shopId: null,
    }
  };

  /* Helper to monitor currentUser stability across intervals */
  function _startUserStabilityMonitor(triggerName) {
    const intervals = [100, 500, 1000, 3000, 5000];
    intervals.forEach(delay => {
      setTimeout(() => {
        const u = _auth ? _auth.currentUser : null;
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} USER_PRESENT (${delay}ms after ${triggerName}): exists=${!!u} uid=${u?.uid || 'null'} email=${u?.email || 'null'} isAuthenticated=${state.isAuthenticated}`);
      }, delay);
    });
  }

  /* Initialize Firebase App & Auth Listener (Single Shared Instance) */
  function init() {
    if (_initPromise) return _initPromise;

    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_INIT_START`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} CURRENT_URL: ${window.location.href}`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} CURRENT_HASH: ${window.location.hash}`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} CURRENT_ORIGIN: ${window.location.origin}`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} CURRENT_HOSTNAME: ${window.location.hostname}`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_DOMAIN: ${App.Config?.Firebase?.authDomain}`);
    console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} USER_AGENT: ${navigator.userAgent}`);

    _initPromise = new Promise(async (resolve) => {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        console.warn(`[EDGE-AUTH-FORENSIC] ${_ts()} Firebase Web SDK not loaded. Fallback state.`);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
        return;
      }

      try {
        // Initialize Firebase App if not already initialized (Single Shared App)
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(App.Config.Firebase);
          console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} FIREBASE_INITIALIZED (projectId: ${App.Config?.Firebase?.projectId}, authDomain: ${App.Config?.Firebase?.authDomain})`);
        } else {
          console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} FIREBASE_ALREADY_INITIALIZED (apps.length: ${firebase.apps.length})`);
        }
        
        _auth = firebase.auth();
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_INSTANCE_CREATED`);

        // 1. Explicitly configure browserLocalPersistence
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} PERSISTENCE_START`);
        try {
          await _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} PERSISTENCE_SUCCESS (LOCAL)`);
        } catch (err) {
          console.warn(`[EDGE-AUTH-FORENSIC] ${_ts()} PERSISTENCE_ERROR: code=${err.code} msg=${err.message}`);
        }

        // 2. Process Redirect Result BEFORE registering onAuthStateChanged
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} REDIRECT_RESULT_START (awaiting)`);
        _isProcessingRedirect = true;
        try {
          const redirectResult = await _auth.getRedirectResult();
          if (redirectResult && redirectResult.user) {
            console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} REDIRECT_RESULT_SUCCESS: user=${redirectResult.user.email} uid=${redirectResult.user.uid}`);
            _handleAuthStateChange(redirectResult.user);
            _startUserStabilityMonitor('REDIRECT_RESULT_SUCCESS');
          } else {
            console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} REDIRECT_RESULT_NULL (no pending redirect)`);
          }
        } catch (err) {
          console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} REDIRECT_RESULT_ERROR: code=${err.code} msg=${err.message}`);
        }
        _isProcessingRedirect = false;
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} REDIRECT_RESULT_COMPLETE`);

        // 3. Register single onAuthStateChanged listener
        let _resolved = false;
        if (!_unsubscribeAuthState) {
          console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} REGISTERING onAuthStateChanged listener`);
          _unsubscribeAuthState = _auth.onAuthStateChanged((user) => {
            console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_EVENT\n  EVENT: AUTH_STATE_CHANGED\n  AUTH_USER: ${user ? user.email : 'null'}\n  CURRENT_USER: ${user ? user.uid : 'null'}\n  URL: ${window.location.href}\n  ROUTE: ${App.State?.route}`);
            _handleAuthStateChange(user);
            if (!_resolved) {
              _resolved = true;
              console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_INIT_COMPLETE (resolved init promise)`);
              resolve(state);
            }
          });
        }
      } catch (err) {
        console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_INIT_EXCEPTION:`, err);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
      }
    });

    return _initPromise;
  }

  function _handleAuthStateChange(user) {
    if (user) {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_EVENT\n  EVENT: AUTH_SIGNED_IN\n  AUTH_USER: ${user.email}\n  CURRENT_USER: ${user.uid}\n  URL: ${window.location.href}\n  ROUTE: ${App.State?.route}`);
      state.currentUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified || false,
        providerId: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'password'
      };
      state.isAuthenticated = true;
      state.context.userId = user.uid;
      state.context.tenantId = user.tenantId || null;
      state.context.shopId = null;
      try {
        sessionStorage.setItem('liq_auth_active', 'true');
        localStorage.setItem('liq_auth_cached_user', JSON.stringify(state.currentUser));
      } catch(e){}
    } else {
      // Guard: Ignore transient null events in Edge if session was already active and not explicitly signed out
      const hadActiveSession = sessionStorage.getItem('liq_auth_active') === 'true';
      if (hadActiveSession && state.isAuthenticated) {
        console.warn(`[EDGE-AUTH-FORENSIC] ${_ts()} Transient null auth event ignored to prevent Edge popup close loop`);
        return;
      }

      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} AUTH_EVENT\n  EVENT: AUTH_SIGNED_OUT\n  AUTH_USER: null\n  CURRENT_USER: null\n  URL: ${window.location.href}\n  ROUTE: ${App.State?.route}`);
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
      try {
        sessionStorage.removeItem('liq_auth_active');
        localStorage.removeItem('liq_auth_cached_user');
      } catch(e){}
    }

    const wasInitialized = state.isInitialized;
    state.isInitialized = true;
    _notifyListeners();

    // Re-render UI on auth state change if app is already initialized
    // (Skip during redirect processing to prevent premature renders)
    if (wasInitialized && !_isProcessingRedirect && window.App && window.App.UI && typeof window.App.UI.render === 'function') {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} _handleAuthStateChange TRIGGERING App.UI.render() (wasInitialized=true)`);
      window.App.UI.render();
    } else {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} _handleAuthStateChange SKIPPING App.UI.render() (wasInitialized=${wasInitialized}, isProcessingRedirect=${_isProcessingRedirect})`);
    }
  }

  function _notifyListeners() {
    _authListeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} Listener Error`, e); }
    });
  }

  function onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      _authListeners.push(callback);
      if (state.isInitialized) {
        callback(state);
      }
    }
    return () => {
      _authListeners = _authListeners.filter(cb => cb !== callback);
    };
  }

  /* ── Auth Actions ────────────────────────────────────────── */

  // Email / Password Signup
  async function signUpWithEmail(email, password, displayName = '') {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');
    
    try {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Email signup start`);
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      if (displayName && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
      }
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Email signup success`);
      return cred.user;
    } catch (err) {
      console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} Email signup error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Email / Password Login
  async function signInWithEmail(email, password) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Email sign-in start`);
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Email sign-in success`);
      return cred.user;
    } catch (err) {
      console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} Email sign-in error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Google Sign-In (Edge redirect + Chrome popup support)
  async function signInWithGoogle() {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    if (window.location.protocol === 'file:') {
      throw new Error('Google Sign-In requires running over an HTTP web server (e.g. https://liquidation-iq.vercel.app or http://127.0.0.1:8080). Opening index.html directly from a local file (file://) is not supported by Google OAuth.');
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    const isEdge = /Edg\//i.test(navigator.userAgent);

    // In Microsoft Edge (where cross-origin popup postMessage is blocked by Tracking Prevention), use top-level signInWithRedirect
    if (isEdge && window.location.protocol.startsWith('http')) {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Microsoft Edge detected, using top-level signInWithRedirect`);
      sessionStorage.setItem('liq_auth_active', 'true');
      await _auth.signInWithRedirect(provider);
      return null;
    }

    // Chrome and other standard browsers use signInWithPopup
    try {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} GOOGLE_START: signInWithPopup`);
      const cred = await _auth.signInWithPopup(provider);
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} GOOGLE_SUCCESS: user=${cred?.user?.email} uid=${cred?.user?.uid}`);
      try {
        sessionStorage.setItem('liq_auth_active', 'true');
      } catch(e){}
      _startUserStabilityMonitor('GOOGLE_SUCCESS_POPUP');
      return cred.user;
    } catch (err) {
      console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} GOOGLE_ERROR: code=${err.code} msg=${err.message} url=${window.location.href} route=${App.State?.route}`);
      
      // If auth.currentUser or state.currentUser is already populated
      if ((_auth && _auth.currentUser) || state.currentUser) {
        console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} GOOGLE_RECOVERED: currentUser exists (${_auth?.currentUser?.email || state.currentUser?.email})`);
        try {
          sessionStorage.setItem('liq_auth_active', 'true');
        } catch(e){}
        _startUserStabilityMonitor('GOOGLE_RECOVERED');
        return _auth?.currentUser || state.currentUser;
      }

      // Fallback to redirect if popup fails or is blocked
      if ((err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') && window.location.protocol.startsWith('http')) {
        console.warn(`[EDGE-AUTH-FORENSIC] ${_ts()} Popup failed (${err.code}), falling back to top-level signInWithRedirect`);
        sessionStorage.setItem('liq_auth_active', 'true');
        await _auth.signInWithRedirect(provider);
        return null;
      }

      throw new Error(mapErrorMessage(err));
    }
  }

  // Password Reset Email
  async function sendPasswordReset(email) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Password reset start`);
      await _auth.sendPasswordResetEmail(email);
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} Password reset email sent`);
      return true;
    } catch (err) {
      console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} Password reset error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Sign Out
  async function signOut() {
    if (!_auth) return;

    try {
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} LOGOUT START`);
      try {
        sessionStorage.removeItem('liq_auth_active');
        localStorage.removeItem('liq_auth_cached_user');
      } catch(e){}
      await _auth.signOut();
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
      console.log(`[EDGE-AUTH-FORENSIC] ${_ts()} LOGOUT SUCCESS`);
    } catch (err) {
      console.error(`[EDGE-AUTH-FORENSIC] ${_ts()} LOGOUT ERROR: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  function getCurrentUser() {
    return state.currentUser ? { ...state.currentUser, context: { ...state.context } } : null;
  }

  /* User-Friendly Error Mapper */
  function mapErrorMessage(error) {
    if (!error) return 'An unknown error occurred.';
    const code = error.code || error.message || '';

    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email address or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-In popup was blocked by your browser. Please allow popups for this site.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Console. Please contact the system administrator.';
      case 'auth/requires-recent-login':
        return 'Please sign in again to perform this security sensitive action.';
      case 'auth/unauthorized-domain':
        return 'This domain (' + window.location.hostname + ') is not authorized in Firebase Console for Google Sign-In. Please add "' + window.location.hostname + '" under Firebase Console > Authentication > Settings > Authorized domains.';
      case 'auth/operation-not-supported-in-this-environment':
        return 'Google Sign-In requires running the app over HTTP/HTTPS (e.g. https://liquidation-iq.vercel.app). Opening index.html directly as a local file (file://) is not supported by Google OAuth.';
      default:
        if (typeof code === 'string' && code.startsWith('auth/')) {
          return code.replace('auth/', '').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
        }
        return error.message || 'Authentication failed. Please check your details and try again.';
    }
  }

  return {
    state,
    init,
    onAuthStateChanged,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    signOut,
    getCurrentUser,
    mapErrorMessage,
    _ts,
    _startUserStabilityMonitor,
    get isInitialized() { return state.isInitialized; },
    get isAuthenticated() { return state.isAuthenticated; },
    get currentUser() { return state.currentUser; }
  };
})();
