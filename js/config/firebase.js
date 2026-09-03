window.App = window.App || {};
window.App.Config = window.App.Config || {};

/* ============================================================
   FIREBASE WEB CLIENT CONFIGURATION
   ============================================================
   Project: liquidation-iq
   Connected: Firebase Web App Configuration with Same-Origin Auth Proxy
   ============================================================ */

const defaultAuthDomain = "liquidation-iq.firebaseapp.com";
const isVercelHost = typeof window !== 'undefined' && 
                     window.location.protocol.startsWith('http') && 
                     window.location.hostname && 
                     (window.location.hostname.includes('vercel.app') || window.location.hostname === 'liquidation-iq.vercel.app');

window.App.Config.Firebase = window.ENV?.FIREBASE_CONFIG || {
  apiKey: "AIzaSyDwpmWVrpTkCup4p12BPVXoJo3VMhvSv-8",
  authDomain: isVercelHost ? window.location.hostname : defaultAuthDomain,
  projectId: "liquidation-iq",
  storageBucket: "liquidation-iq.firebasestorage.app",
  messagingSenderId: "620262657589",
  appId: "1:620262657589:web:73cf9a7489ecaf6ce86b7c",
  measurementId: "G-H55DPQSLWC"
};
