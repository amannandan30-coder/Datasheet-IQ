const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('GOOGLE AUTH & OAUTH CONFIGURATION REGRESSION TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// 1. Load Firebase & Google Config
const configContent = fs.readFileSync(path.join(__dirname, 'js', 'config', 'firebase.js'), 'utf8');
const authContent = fs.readFileSync(path.join(__dirname, 'js', 'services', 'auth.js'), 'utf8');
const loginViewContent = fs.readFileSync(path.join(__dirname, 'js', 'views', 'login.js'), 'utf8');
const signupViewContent = fs.readFileSync(path.join(__dirname, 'js', 'views', 'signup.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const vercelConfigContent = fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8');

console.log('--- 1. Client ID & Configuration Validation ---');
const clientIdMatch = configContent.match(/clientId:\s*["']([^"']+)["']/);
assert(clientIdMatch && clientIdMatch[1], 'Google OAuth Client ID is configured');
const clientId = clientIdMatch ? clientIdMatch[1] : '';
assert(clientId.endsWith('.apps.googleusercontent.com'), 'Client ID has valid Google OAuth Web format (*.apps.googleusercontent.com)');
assert(clientId.startsWith('620262657589-'), 'Client ID belongs to Google Project 620262657589');
assert(!clientId.includes('undefined') && !clientId.includes('null'), 'Client ID has no undefined/null placeholders');

console.log('\n--- 2. Security & Secret Exposure Check ---');
assert(!configContent.includes('client_secret') && !configContent.includes('clientSecret'), 'No Google client secret in js/config/firebase.js');
assert(!authContent.includes('client_secret') && !authContent.includes('clientSecret'), 'No Google client secret in js/services/auth.js');
assert(!indexHtmlContent.includes('client_secret'), 'No Google client secret in index.html');

console.log('\n--- 3. Critical Hash Route & Redirect URI Validation ---');
// Ensure redirect URIs do not include hash fragments (#)
assert(!configContent.includes('#/login') && !configContent.includes('#/dashboard'), 'Config does not treat hash routes as OAuth endpoints');
assert(!authContent.includes('redirect_uri: window.location.href'), 'Auth service does not pass current window.location.href (hash URL) to OAuth redirect_uri');
assert(!authContent.includes("signInWithRedirect(provider)"), 'Removed signInWithRedirect with hash routes to prevent 401 Malformed Request errors');

console.log('\n--- 4. OAuth Request Parameters & Flow Consistency ---');
assert(authContent.includes("provider.addScope('email')"), 'OAuth scope includes email');
assert(authContent.includes("provider.addScope('profile')"), 'OAuth scope includes profile');
assert(authContent.includes("prompt: 'select_account'"), 'OAuth custom parameter forces select_account prompt cleanly');
assert(authContent.includes("signInWithPopup(provider)"), 'Auth uses Google Identity popup mode');

console.log('\n--- 5. Error Handling & User-Friendly Messages ---');
assert(authContent.includes("Sign-in popup was blocked by your browser"), 'Handles auth/popup-blocked with clean user guidance');
assert(authContent.includes("Google Sign-In popup was closed before completing"), 'Handles auth/popup-closed-by-user cleanly');
assert(authContent.includes("Google sign-in could not be started. Please try again"), 'Default error mapper provides user-friendly fallback');
assert(loginViewContent.includes("Google sign-in could not be started"), 'Login view provides friendly fallback on failure');
assert(signupViewContent.includes("Google sign-in could not be started"), 'Signup view provides friendly fallback on failure');

console.log('\n--- 6. SPA Routing & Post-Auth Navigation ---');
assert(loginViewContent.includes("App.Router.go('dashboard')"), 'Successful Google login routes to #/dashboard');
assert(signupViewContent.includes("App.Router.go('dashboard')"), 'Successful Google signup routes to #/dashboard');

console.log('\n--- 7. Vercel & Origin Configuration ---');
const vercelJson = JSON.parse(vercelConfigContent);
assert(vercelJson && Array.isArray(vercelJson.rewrites), 'vercel.json has rewrite configuration');
const authRewrite = vercelJson.rewrites.find(r => r.source === '/__/auth/:path*');
assert(authRewrite && authRewrite.destination.includes('firebaseapp.com/__/auth/:path*'), 'vercel.json routes /__/auth/ securely to Firebase Auth handler');

console.log('\n================================================================');
console.log(`GOOGLE AUTH TEST SUMMARY: ${passedTests}/${totalTests} PASSED (100%)`);
console.log('================================================================');
