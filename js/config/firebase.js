window.App = window.App || {};
window.App.Config = window.App.Config || {};

/* ============================================================
   GOOGLE OAUTH & FIREBASE WEB CLIENT CONFIGURATION
   ============================================================
   Project: liquidation-iq
   Client Type: Web Application (SPA)
   ============================================================ */

window.App.Config.Google = window.ENV?.GOOGLE_CONFIG || {
  clientId: "620262657589-tonivq9lcbq99i5ic7stsorpehbqrvv5.apps.googleusercontent.com"
};

window.App.Config.Firebase = window.ENV?.FIREBASE_CONFIG || {
  apiKey: "AIzaSyDwpmWVrpTkCup4p12BPVXoJo3VMhvSv-8",
  authDomain: "liquidation-iq.firebaseapp.com",
  projectId: "liquidation-iq",
  storageBucket: "liquidation-iq.firebasestorage.app",
  messagingSenderId: "620262657589",
  appId: "1:620262657589:web:73cf9a7489ecaf6ce86b7c",
  measurementId: "G-H55DPQSLWC"
};
