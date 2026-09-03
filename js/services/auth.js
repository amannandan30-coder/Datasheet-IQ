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

  /* Initialize Firebase App & Auth Listener (Single Shared Instance) */
  function init() {
    if (_initPromise) return _initPromise;

    console.log(`[AUTH-FLOW] ${_ts()} AUTH INIT START`);
    console.log(`[AUTH-FLOW] ${_ts()} CURRENT URL: ${window.location.href}`);
    console.log(`[AUTH-FLOW] ${_ts()} CURRENT HASH: ${window.location.hash}`);
    console.log(`[AUTH-FLOW] ${_ts()} CURRENT ORIGIN: ${window.location.origin}`);
    console.log(`[AUTH-FLOW] ${_ts()} CURRENT HOSTNAME: ${window.location.hostname}`);

    _initPromise = new Promise(async (resolve) => {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        console.warn(`[AUTH-FLOW] ${_ts()} Firebase Web SDK not loaded. Fallback state.`);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
        return;
      }

      try {
        // Initialize Firebase App if not already initialized (Single Shared App)
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(App.Config.Firebase);
          console.log(`[AUTH-FLOW] ${_ts()} FIREBASE INITIALIZED (projectId: ${App.Config?.Firebase?.projectId})`);
        } else {
          console.log(`[AUTH-FLOW] ${_ts()} FIREBASE ALREADY INITIALIZED (apps.length: ${firebase.apps.length})`);
        }
        
        _auth = firebase.auth();
        console.log(`[AUTH-FLOW] ${_ts()} AUTH INSTANCE CREATED`);

        // 1. Explicitly configure browserLocalPersistence
        console.log(`[AUTH-FLOW] ${_ts()} PERSISTENCE START`);
        try {
          await _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          console.log(`[AUTH-FLOW] ${_ts()} PERSISTENCE RESULT: SUCCESS (LOCAL)`);
        } catch (err) {
          console.warn(`[AUTH-FLOW] ${_ts()} PERSISTENCE RESULT: ERROR - ${err.code} ${err.message}`);
        }

        // 2. Process Redirect Result BEFORE registering onAuthStateChanged
        //    This prevents the race condition where onAuthStateChanged fires with null
        //    before the redirect result is processed, causing a false "signed out" state.
        console.log(`[AUTH-FLOW] ${_ts()} REDIRECT RESULT START (awaiting)`);
        _isProcessingRedirect = true;
        try {
          const redirectResult = await _auth.getRedirectResult();
          if (redirectResult && redirectResult.user) {
            console.log(`[AUTH-FLOW] ${_ts()} REDIRECT RESULT: SUCCESS, user: ${redirectResult.user.email}`);
          } else {
            console.log(`[AUTH-FLOW] ${_ts()} REDIRECT RESULT: NULL (no pending redirect)`);
          }
        } catch (err) {
          // auth/credential-already-in-use or other redirect errors
          console.error(`[AUTH-FLOW] ${_ts()} REDIRECT RESULT ERROR: ${err.code} ${err.message}`);
        }
        _isProcessingRedirect = false;
        console.log(`[AUTH-FLOW] ${_ts()} REDIRECT RESULT COMPLETE`);

        // 3. NOW register the onAuthStateChanged listener (after redirect is processed)
        //    This guarantees the first onAuthStateChanged call reflects the true auth state
        //    including any redirect-based sign-in.
        let _resolved = false;
        if (!_unsubscribeAuthState) {
          console.log(`[AUTH-FLOW] ${_ts()} REGISTERING onAuthStateChanged listener`);
          _unsubscribeAuthState = _auth.onAuthStateChanged((user) => {
            console.log(`[AUTH-FLOW] ${_ts()} onAuthStateChanged FIRED, user: ${user ? user.email : 'null'}, wasInitialized: ${state.isInitialized}, alreadyResolved: ${_resolved}`);
            _handleAuthStateChange(user);
            if (!_resolved) {
              _resolved = true;
              resolve(state);
            }
          });
        }
      } catch (err) {
        console.error(`[AUTH-FLOW] ${_ts()} Initialization EXCEPTION:`, err);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
      }
    });

    return _initPromise;
  }

  function _handleAuthStateChange(user) {
    if (user) {
      console.log(`[AUTH-FLOW] ${_ts()} AUTH STATE SIGNED_IN, email: ${user.email}, uid: ${user.uid}`);
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
    } else {
      console.log(`[AUTH-FLOW] ${_ts()} AUTH STATE SIGNED_OUT`);
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
    }

    const wasInitialized = state.isInitialized;
    state.isInitialized = true;
    console.log(`[AUTH-FLOW] ${_ts()} _handleAuthStateChange: wasInitialized=${wasInitialized}, isAuthenticated=${state.isAuthenticated}`);
    _notifyListeners();

    // Re-render UI on auth state change if app is already initialized
    // (Skip during redirect processing to prevent premature renders)
    if (wasInitialized && !_isProcessingRedirect && window.App && window.App.UI && typeof window.App.UI.render === 'function') {
      console.log(`[AUTH-FLOW] ${_ts()} _handleAuthStateChange TRIGGERING App.UI.render()`);
      window.App.UI.render();
    } else {
      console.log(`[AUTH-FLOW] ${_ts()} _handleAuthStateChange SKIPPING App.UI.render() (wasInitialized=${wasInitialized}, isProcessingRedirect=${_isProcessingRedirect})`);
    }
  }

  function _notifyListeners() {
    _authListeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error(`[AUTH-FLOW] ${_ts()} Listener Error`, e); }
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
      console.log(`[AUTH-FLOW] ${_ts()} Email signup start`);
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      if (displayName && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
      }
      console.log(`[AUTH-FLOW] ${_ts()} Email signup success`);
      return cred.user;
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_ts()} Email signup error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Email / Password Login
  async function signInWithEmail(email, password) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log(`[AUTH-FLOW] ${_ts()} Email sign-in start`);
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      console.log(`[AUTH-FLOW] ${_ts()} Email sign-in success`);
      return cred.user;
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_ts()} Email sign-in error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Google Sign-In (Executed ONLY on explicit user click)
  async function signInWithGoogle() {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    if (window.location.protocol === 'file:') {
      throw new Error('Google Sign-In requires running over an HTTP web server (e.g. https://liquidation-iq.vercel.app or http://127.0.0.1:8080). Opening index.html directly from a local file (file://) is not supported by Google OAuth.');
    }

    try {
      console.log(`[AUTH-FLOW] ${_ts()} GOOGLE SIGN-IN START (signInWithPopup)`);
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const cred = await _auth.signInWithPopup(provider);
      console.log(`[AUTH-FLOW] ${_ts()} GOOGLE SIGN-IN signInWithPopup RESOLVED, user: ${cred?.user?.email}`);
      return cred.user;
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_ts()} GOOGLE SIGN-IN ERROR: code=${err.code}, msg=${err.message}, url=${window.location.href}, route=${App.State?.route}, hasCurrentUser=${!!_auth?.currentUser}, isInitialized=${state.isInitialized}`);
      // Fallback for popup blocked environments (ONLY if on http/https)
      if (err.code === 'auth/popup-blocked' && window.location.protocol !== 'file:') {
        console.warn(`[AUTH-FLOW] ${_ts()} Google popup blocked, starting signInWithRedirect`);
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          await _auth.signInWithRedirect(provider);
          return null;
        } catch (redirErr) {
          console.error(`[AUTH-FLOW] ${_ts()} GOOGLE REDIRECT ERROR: ${redirErr.code} ${redirErr.message}`);
          throw new Error(mapErrorMessage(redirErr));
        }
      }
      throw new Error(mapErrorMessage(err));
    }
  }

  // Password Reset Email
  async function sendPasswordReset(email) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log(`[AUTH-FLOW] ${_ts()} Password reset start`);
      await _auth.sendPasswordResetEmail(email);
      console.log(`[AUTH-FLOW] ${_ts()} Password reset email sent`);
      return true;
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_ts()} Password reset error: ${err.code} ${err.message}`);
      throw new Error(mapErrorMessage(err));
    }
  }

  // Sign Out
  async function signOut() {
    if (!_auth) return;

    try {
      console.log(`[AUTH-FLOW] ${_ts()} LOGOUT START`);
      await _auth.signOut();
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
      console.log(`[AUTH-FLOW] ${_ts()} LOGOUT SUCCESS`);
    } catch (err) {
      console.error(`[AUTH-FLOW] ${_ts()} LOGOUT ERROR: ${err.code} ${err.message}`);
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
    get isInitialized() { return state.isInitialized; },
    get isAuthenticated() { return state.isAuthenticated; },
    get currentUser() { return state.currentUser; }
  };
})();
