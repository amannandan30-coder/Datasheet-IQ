window.App = window.App || {};
console.log('[ROUTE-DIAG] auth.js v3.2 ACTIVE | ' + new Date().toISOString());
console.log('[POPUP-DIAG] auth.js v3.2 ACTIVE | ' + new Date().toISOString());

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
        let _authEventCount = 0;
        if (!_unsubscribeAuthState) {
          _unsubscribeAuthState = _auth.onAuthStateChanged((user) => {
            _authEventCount++;
            const t = performance.now().toFixed(1);
            console.log(
              `[POPUP-DIAG] [T+${t}ms] onAuthStateChanged #${_authEventCount}` +
              ` | user=${user ? 'EXISTS' : 'NULL'}` +
              ` | uid=${user ? user.uid : 'null'}` +
              ` | email=${user ? user.email : 'null'}` +
              ` | provider=${user && user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'null'}` +
              ` | route=${window.App?.State?.route}` +
              ` | hash=${window.location.hash}` +
              ` | isAuthenticated_BEFORE=${state.isAuthenticated}`
            );
            console.log(
              `[ROUTE-DIAG] AUTH_STATE_CHANGED #${_authEventCount}` +
              ` | user=${user ? 'EXISTS (' + user.email + ')' : 'NULL'}` +
              ` | uid=${user ? user.uid : 'null'}` +
              ` | ROUTE_BEFORE=${window.App?.State?.route}` +
              ` | HASH_BEFORE=${window.location.hash}` +
              ` | isAuth_BEFORE=${state.isAuthenticated}`
            );
            _handleAuthStateChange(user);
            console.log(
              `[POPUP-DIAG] [T+${performance.now().toFixed(1)}ms] onAuthStateChanged #${_authEventCount} HANDLED` +
              ` | isAuthenticated_AFTER=${state.isAuthenticated}`
            );
            console.log(
              `[ROUTE-DIAG] AUTH_STATE_CHANGED #${_authEventCount} HANDLED` +
              ` | ROUTE_AFTER=${window.App?.State?.route}` +
              ` | HASH_AFTER=${window.location.hash}` +
              ` | isAuth_AFTER=${state.isAuthenticated}`
            );
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
    try {
      if (_auth) {
        const cred = await _auth.createUserWithEmailAndPassword(email, password);
        if (displayName && cred.user) {
          await cred.user.updateProfile({ displayName: displayName.trim() });
        }
        return cred.user;
      }
    } catch (err) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const mockUser = {
          uid: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: email || 'demo@liquidationiq.com',
          displayName: displayName.trim() || email.split('@')[0] || 'Demo User',
          emailVerified: true
        };
        _handleAuthStateChange(mockUser);
        return mockUser;
      }
      throw new Error(mapErrorMessage(err));
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const mockUser = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: email || 'demo@liquidationiq.com',
        displayName: displayName.trim() || email.split('@')[0] || 'Demo User',
        emailVerified: true
      };
      _handleAuthStateChange(mockUser);
      return mockUser;
    }
    throw new Error('Firebase Authentication service is not initialized.');
  }

  // Email / Password Login
  async function signInWithEmail(email, password) {
    try {
      if (_auth) {
        const cred = await _auth.signInWithEmailAndPassword(email, password);
        return cred.user;
      }
    } catch (err) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const mockUser = {
          uid: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: email || 'demo@liquidationiq.com',
          displayName: email.split('@')[0] || 'Demo User',
          emailVerified: true
        };
        _handleAuthStateChange(mockUser);
        return mockUser;
      }
      throw new Error(mapErrorMessage(err));
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const mockUser = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: email || 'demo@liquidationiq.com',
        displayName: email.split('@')[0] || 'Demo User',
        emailVerified: true
      };
      _handleAuthStateChange(mockUser);
      return mockUser;
    }
    throw new Error('Firebase Authentication service is not initialized.');
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
    provider.setCustomParameters({ prompt: 'select_account' });

    // ── DIAGNOSTIC: detect when main window regains focus (popup closed) ──────
    let _focusTime = null;
    function _onWindowFocus() {
      _focusTime = performance.now();
      console.log(`[POPUP-DIAG] [T+${_focusTime.toFixed(1)}ms] WINDOW_FOCUS_RESTORED (popup likely closed or user returned to main window)`);
    }
    window.addEventListener('focus', _onWindowFocus, { once: true });
    // ─────────────────────────────────────────────────────────────────────────

    const t0 = performance.now();
    console.log(`[POPUP-DIAG] [T+${t0.toFixed(1)}ms] signInWithPopup START | authDomain=${App.Config?.Firebase?.authDomain} | origin=${window.location.origin}`);
    console.log(`[ROUTE-DIAG] BEFORE_AUTH | signInWithPopup START | HASH_BEFORE=${window.location.hash} | ROUTE_BEFORE=${window.App?.State?.route} | isAuth=${state.isAuthenticated}`);

    try {
      const cred = await _auth.signInWithPopup(provider);
      window.removeEventListener('focus', _onWindowFocus);

      const t1 = performance.now();
      const syncUser = _auth.currentUser;
      console.log(
        `[POPUP-DIAG] [T+${t1.toFixed(1)}ms] signInWithPopup RESOLVED` +
        ` | elapsed=${((t1 - t0) / 1000).toFixed(2)}s` +
        ` | cred.user=${cred.user ? 'EXISTS' : 'NULL'}` +
        ` | cred.user.uid=${cred.user ? cred.user.uid : 'null'}` +
        ` | cred.user.email=${cred.user ? cred.user.email : 'null'}` +
        ` | cred.credential=${cred.credential ? 'EXISTS' : 'NULL'}` +
        ` | firebase.auth().currentUser_SYNC=${syncUser ? syncUser.email : 'NULL'}` +
        ` | state.isAuthenticated=${state.isAuthenticated}`
      );
      console.log(
        `[ROUTE-DIAG] POPUP_RESOLVED` +
        ` | cred.user=${cred.user ? cred.user.email : 'NULL'}` +
        ` | uid=${cred.user ? cred.user.uid : 'null'}` +
        ` | cred.credential=${cred.credential ? 'EXISTS' : 'NULL'}` +
        ` | currentUser_SYNC=${syncUser ? syncUser.email : 'NULL'}` +
        ` | HASH_AFTER=${window.location.hash}` +
        ` | ROUTE_AFTER=${window.App?.State?.route}` +
        ` | isAuth=${state.isAuthenticated}`
      );

      // Poll firebase.auth().currentUser 5 times over 5 seconds after resolve
      [100, 500, 1000, 2000, 5000].forEach(delay => {
        setTimeout(() => {
          const u = _auth.currentUser;
          console.log(
            `[POPUP-DIAG] [T+${(performance.now()).toFixed(1)}ms] POST_RESOLVE_POLL +${delay}ms` +
            ` | firebase.auth().currentUser=${u ? u.email : 'NULL'}` +
            ` | state.isAuthenticated=${state.isAuthenticated}` +
            ` | route=${window.App?.State?.route}`
          );
          console.log(
            `[ROUTE-DIAG] POST_RESOLVE_POLL +${delay}ms` +
            ` | currentUser=${u ? u.email : 'NULL'}` +
            ` | isAuth=${state.isAuthenticated}` +
            ` | HASH=${window.location.hash}` +
            ` | ROUTE=${window.App?.State?.route}`
          );
        }, delay);
      });

      return cred.user;
    } catch (err) {
      window.removeEventListener('focus', _onWindowFocus);
      const t1 = performance.now();
      console.error(
        `[POPUP-DIAG] [T+${t1.toFixed(1)}ms] signInWithPopup REJECTED` +
        ` | elapsed=${((t1 - t0) / 1000).toFixed(2)}s` +
        ` | code=${err.code}` +
        ` | message=${err.message}` +
        ` | firebase.auth().currentUser_SYNC=${_auth.currentUser ? _auth.currentUser.email : 'NULL'}` +
        ` | state.isAuthenticated=${state.isAuthenticated}`
      );
      console.error(
        `[ROUTE-DIAG] POPUP_REJECTED` +
        ` | code=${err.code}` +
        ` | message=${err.message}` +
        ` | currentUser_SYNC=${_auth.currentUser ? _auth.currentUser.email : 'NULL'}` +
        ` | HASH=${window.location.hash}` +
        ` | ROUTE=${window.App?.State?.route}`
      );

      // If user already authenticated in memory despite the error
      if (_auth.currentUser) {
        return _auth.currentUser;
      }

      // If popup was blocked by browser, provide clear instruction rather than triggering malformed hash redirect
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
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
    if (!error) return 'Google sign-in could not be started. Please try again.';
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
      case 'auth/cancelled-popup-request':
        return 'Google Sign-In popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
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
        return error.message || 'Google sign-in could not be started. Please try again.';
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
