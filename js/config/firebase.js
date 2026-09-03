window.App = window.App || {};
window.App.Config = window.App.Config || {};

/* ============================================================
   FIREBASE WEB CLIENT CONFIGURATION
   ============================================================
   IMPORTANT SECURITY NOTE:
   - Frontend web configuration parameters (apiKey, authDomain, etc.)
     identify your Firebase project in client browsers.
   - NEVER include Firebase Admin SDK credentials, service account
     private keys, or server secrets in frontend code.
   - Enable Firebase Authentication providers in Firebase Console:
     1. Email/Password
     2. Google Sign-In
   ============================================================ */

window.App.Config.Firebase = window.ENV?.FIREBASE_CONFIG || {
  apiKey: "AIzaSyB_DEMO_KEY_LIQUIDATION_IQ_AUTH",
  authDomain: "liquidation-iq.firebaseapp.com",
  projectId: "liquidation-iq",
  storageBucket: "liquidation-iq.firebasestorage.app",
  messagingSenderId: "102938475612",
  appId: "1:102938475612:web:9876543210abcdef"
};
