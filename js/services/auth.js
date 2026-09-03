window.App = window.App || {};

/* ============================================================
   LIQUIDATION IQ — CENTRALIZED FIREBASE AUTHENTICATION SERVICE
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

    /* Future-Ready Architecture Context:
       Ready for future tenant, shopId, and Firestore multi-shop isolation. */
    context: {
      userId: null,
      tenantId: null,
      shopId: null,
    }
  };

  /* Initialize Firebase App & Auth Listener (Single Shared Instance) */
  function init() {
    if (_initPromise) return _initPromise;

    console.log('[AUTH] initialization started');

    _initPromise = new Promise((resolve) => {
      if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        console.warn('[AUTH] Firebase Web SDK not loaded. Operating in fallback state.');
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
        return;
      }

      try {
        // Initialize Firebase App if not already initialized (Single Shared App)
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(App.Config.Firebase);
        }
        _auth = firebase.auth();

        // 1. Explicitly configure browserLocalPersistence to avoid session loss across redirects
        _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
          console.warn('[AUTH] Error setting persistence:', err.message);
        });

        // 2. Process Redirect Result if returning from Google signInWithRedirect
        _auth.getRedirectResult().then((result) => {
          if (result && result.user) {
            console.log('[AUTH] redirect result processed: signed-in via Google redirect');
          } else {
            console.log('[AUTH] redirect result processed');
          }
        }).catch((err) => {
          console.error('[AUTH] redirect result processing error:', err.message);
        });

        // 3. Register Single Source of Truth Auth State Listener (Only Once)
        if (!_unsubscribeAuthState) {
          _unsubscribeAuthState = _auth.onAuthStateChanged((user) => {
            _handleAuthStateChange(user);
            resolve(state);
          });
        }
      } catch (err) {
        console.error('[AUTH] Initialization error:', err);
        state.isInitialized = true;
        _notifyListeners();
        resolve(state);
      }
    });

    return _initPromise;
  }

  function _handleAuthStateChange(user) {
    if (user) {
      console.log('[AUTH] state changed: signed-in');
      state.currentUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        emailVerified: user.emailVerified || false,
        providerId: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'password'
      };
      state.isAuthenticated = true;

      // Populate future-ready tenant context
      state.context.userId = user.uid;
      state.context.tenantId = user.tenantId || null;
      state.context.shopId = null; // Reserved for multi-shop data isolation
    } else {
      console.log('[AUTH] state changed: signed-out');
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
    }

    const wasInitialized = state.isInitialized;
    state.isInitialized = true;
    _notifyListeners();

    // Re-render UI on auth state change if app is already initialized
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

  /* ── Auth Actions ────────────────────────────────────────── */

  // Email / Password Signup
  async function signUpWithEmail(email, password, displayName = '') {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');
    
    try {
      console.log('[AUTH] Email signup started');
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      if (displayName && cred.user) {
        await cred.user.updateProfile({ displayName: displayName.trim() });
      }
      console.log('[AUTH] Email signup success');
      return cred.user;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Email / Password Login
  async function signInWithEmail(email, password) {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log('[AUTH] Email sign-in started');
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      console.log('[AUTH] Email sign-in success');
      return cred.user;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Google Sign-In (Executed ONLY on explicit user click)
  async function signInWithGoogle() {
    if (!_auth) throw new Error('Firebase Authentication service is not initialized.');

    try {
      console.log('[AUTH] Google sign-in started');
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const cred = await _auth.signInWithPopup(provider);
      console.log('[AUTH] Google sign-in success');
      return cred.user;
    } catch (err) {
      // Fallback for popup blocked environments
      if (err.code === 'auth/popup-blocked') {
        console.warn('[AUTH] Google popup blocked, falling back to redirect flow');
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          await _auth.signInWithRedirect(provider);
          return null;
        } catch (redirErr) {
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
      console.log('[AUTH] Password reset requested');
      await _auth.sendPasswordResetEmail(email);
      console.log('[AUTH] Password reset email sent');
      return true;
    } catch (err) {
      throw new Error(mapErrorMessage(err));
    }
  }

  // Sign Out
  async function signOut() {
    if (!_auth) return;

    try {
      console.log('[AUTH] Sign out requested');
      await _auth.signOut();
      state.currentUser = null;
      state.isAuthenticated = false;
      state.context.userId = null;
      state.context.tenantId = null;
      state.context.shopId = null;
      console.log('[AUTH] Sign out success');
    } catch (err) {
      console.error('[AUTH] Sign out error:', err);
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
