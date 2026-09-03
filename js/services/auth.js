window.App = window.App || {};

/* ============================================================
   LIQUIDATION IQ — FIREBASE AUTHENTICATION SERVICE
   ============================================================ */
App.Auth = (() => {
  let _auth = null;
  let _authListeners = [];
  let _initPromise = null;
  let _unsubscribeAuthState = null;

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

    _initPromise = new Promise(async (resolve) => {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        console.warn('[AUTH] Firebase Web SDK not loaded. Fallback state.');
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
        return;
      }

      try {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(App.Config.Firebase);
        }
        
        _auth = firebase.auth();

        // 1. Set Local Persistence
        try {
          await _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (err) {
          console.warn('[AUTH] Persistence setup warning:', err);
        }

        // 2. Check Redirect Result if returning from a redirect
        try {
          const redirectResult = await _auth.getRedirectResult();
          if (redirectResult && redirectResult.user) {
            _handleAuthStateChange(redirectResult.user);
          }
        } catch (err) {
          console.warn('[AUTH] getRedirectResult check:', err.code, err.message);
        }

        // 3. Register Single Shared onAuthStateChanged listener
        let _resolved = false;
        if (!_unsubscribeAuthState) {
          _unsubscribeAuthState = _auth.onAuthStateChanged((user) => {
            _handleAuthStateChange(user);
            if (!_resolved) {
              _resolved = true;
              resolve(state);
            }
          });
        }
      } catch (err) {
        console.error('[AUTH] Initialization Exception:', err);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
      }
    });

    return _initPromise;
  }

  function _handleAuthStateChange(user) {
    if (user) {
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
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
    }

    const wasInitialized = state.isInitialized;
    state.isInitialized = true;
    _notifyListeners();

    // Re-render UI on auth change only if already booted
    if (wasInitialized && window.App && window.App.UI && typeof window.App.UI.render === 'function') {
      window.App.UI.render();
    }
  }

  function _notifyListeners() {
    _authListeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error('[AUTH] Listener Error', e); }
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

  /* ── Authentication Actions ──────────────────────────────── */

  // Email / Password Signup
  async function signUpWithEmail(email, password, displayName = '') {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');
    
    try {
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      if (displayName && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
      }
      return cred.user;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Email / Password Login
  async function signInWithEmail(email, password) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      return cred.user;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Google Sign-In via Popup
  async function signInWithGoogle() {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    if (window.location.protocol === 'file:') {
      throw new Error('Google Sign-In requires running over an HTTP web server (e.g. https://liquidation-iq.vercel.app). Opening index.html directly from a local file (file://) is not supported by Google OAuth.');
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    try {
      const cred = await _auth.signInWithPopup(provider);
      return cred.user;
    } catch (err) {
      // If user already authenticated in memory
      if (_auth.currentUser) {
        return _auth.currentUser;
      }

      // If popup was blocked by browser
      if (err.code === 'auth/popup-blocked' && window.location.protocol.startsWith('http')) {
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
      await _auth.sendPasswordResetEmail(email);
      return true;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Sign Out
  async function signOut() {
    if (!_auth) return;

    try {
      await _auth.signOut();
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
    } catch (err) {
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
        return 'This domain (' + window.location.hostname + ') is not authorized in Firebase Console for Google Sign-In.';
      case 'auth/operation-not-supported-in-this-environment':
        return 'Google Sign-In requires running the app over HTTP/HTTPS.';
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
    get isInitialized() { return state.isInitialized; },
    get isAuthenticated() { return state.isAuthenticated; },
    get currentUser() { return state.currentUser; }
  };
})();
