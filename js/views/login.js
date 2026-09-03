window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   LIQUIDATION IQ — LOGIN VIEW (Firebase Authentication)
   ============================================================ */
App.Views.Login = (() => {

  function render(container) {
    container.innerHTML = `
      <div class="auth-wrapper animate-fade-in">
        <div class="auth-card">
          <div class="auth-card-glow"></div>
          
          <!-- Brand Header -->
          <div class="auth-brand" onclick="App.Router.go('landing')" role="button" tabindex="0">
            <div class="auth-brand-icon">📦</div>
            <div>
              <div class="auth-brand-name">Liquidation IQ</div>
              <div class="auth-brand-sub">Inventory Intelligence Engine</div>
            </div>
          </div>

          <!-- Headline -->
          <div class="auth-header">
            <h1 class="auth-title">Welcome Back</h1>
            <p class="auth-sub">Enter your credentials to access inventory intelligence</p>
          </div>

          <!-- Error Alert Container -->
          <div class="auth-alert alert-danger" id="auth-error-box" style="display:none" role="alert">
            <span class="alert-icon">⚠️</span>
            <span id="auth-error-msg"></span>
          </div>

          <!-- Login Form -->
          <form id="login-form" class="auth-form" onsubmit="App.Views.Login.handleSubmit(event)">
            
            <div class="auth-field">
              <label for="login-email" class="auth-label">Email Address</label>
              <div class="input-icon-wrap">
                <span class="input-icon">✉️</span>
                <input type="email" id="login-email" class="input auth-input" placeholder="name@company.com" required autocomplete="email">
              </div>
            </div>

            <div class="auth-field">
              <div class="flex justify-between items-center mb-6">
                <label for="login-password" class="auth-label mb-0">Password</label>
                <a href="#/forgot-password" class="auth-link text-xs" onclick="event.preventDefault(); App.Router.go('forgot-password')">Forgot password?</a>
              </div>
              <div class="input-icon-wrap">
                <span class="input-icon">🔒</span>
                <input type="password" id="login-password" class="input auth-input" placeholder="••••••••" required autocomplete="current-password">
              </div>
            </div>

            <button type="submit" id="login-submit-btn" class="btn btn-primary btn-lg w-full auth-submit-btn">
              <span>Sign In</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

          </form>

          <!-- Divider -->
          <div class="auth-divider">
            <span>OR</span>
          </div>

          <!-- Google Sign-In -->
          <button type="button" id="google-signin-btn" class="btn btn-secondary btn-lg w-full google-btn" onclick="App.Views.Login.handleGoogleSignIn()">
            <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <!-- Footer Link -->
          <div class="auth-footer text-center mt-24">
            <span class="text-muted text-sm">Don't have an account?</span>
            <a href="#/signup" class="auth-link font-semibold ml-4" onclick="event.preventDefault(); App.Router.go('signup')">Create Account</a>
          </div>

        </div>
      </div>
    `;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');

    const email = emailEl?.value.trim() || '';
    const password = passwordEl?.value || '';

    // Client-side Validation
    if (!email) {
      showError('Please enter your email address.');
      emailEl?.focus();
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address.');
      emailEl?.focus();
      return;
    }

    if (!password) {
      showError('Please enter your password.');
      passwordEl?.focus();
      return;
    }

    hideError();
    setSubmitting(submitBtn, true, 'Signing In…');

    try {
      await App.Auth.signInWithEmail(email, password);
      App.UI.toast('Welcome back! 👋');
      App.Router.go('dashboard');
    } catch (err) {
      showError(err.message);
      setSubmitting(submitBtn, false, 'Sign In');
    }
  }

  async function handleGoogleSignIn() {
    const googleBtn = document.getElementById('google-signin-btn');
    hideError();

    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.style.opacity = '0.7';
    }

    try {
      await App.Auth.signInWithGoogle();
      App.UI.toast('Signed in with Google! 🌐');
      App.Router.go('dashboard');
    } catch (err) {
      showError(err.message);
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.style.opacity = '1';
      }
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(msg) {
    const errorBox = document.getElementById('auth-error-box');
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorBox && errorMsg) {
      errorMsg.textContent = msg;
      errorBox.style.display = 'flex';
    }
  }

  function hideError() {
    const errorBox = document.getElementById('auth-error-box');
    if (errorBox) errorBox.style.display = 'none';
  }

  function setSubmitting(btn, isSubmitting, text) {
    if (!btn) return;
    btn.disabled = isSubmitting;
    if (isSubmitting) {
      btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> <span>${text}</span>`;
    } else {
      btn.innerHTML = `<span>${text}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>`;
    }
  }

  return { render, handleSubmit, handleGoogleSignIn };
})();
