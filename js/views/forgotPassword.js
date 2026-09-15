window.App = window.App || {};
App.Views = App.Views || {};

/* ============================================================
   LIQUIDATION IQ — FORGOT PASSWORD VIEW (Firebase Authentication)
   ============================================================ */
App.Views.ForgotPassword = (() => {

  function render(container) {
    container.innerHTML = `
      <div class="auth-wrapper animate-fade-in">
        <div class="auth-card">
          <div class="auth-card-glow"></div>
          
          <!-- Close / Back to Landing Button -->
          <button type="button" class="auth-close-btn" onclick="App.Router.go('landing')" title="Back to Home Page" aria-label="Close and go to Landing Page">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <!-- Brand Header -->
          <div class="auth-brand" onclick="App.Router.go('landing')" role="button" tabindex="0" title="Go to Landing Page">
            <div class="auth-brand-icon">
              <img src="assets/logo-icon.svg" alt="DataSheet IQ" width="30" height="30" style="display:block;width:30px;height:30px;object-fit:contain">
            </div>
            <div>
              <div class="auth-brand-name">DataSheet IQ</div>
              <div class="auth-brand-sub">Inventory Intelligent</div>
            </div>
          </div>

          <!-- Headline -->
          <div class="auth-header">
            <h1 class="auth-title">Reset Password</h1>
            <p class="auth-sub">Enter your email and we'll send you a password reset link</p>
          </div>

          <!-- Error Alert Container -->
          <div class="auth-alert alert-danger" id="auth-error-box" style="display:none" role="alert">
            <span class="alert-icon">⚠️</span>
            <span id="auth-error-msg"></span>
          </div>

          <!-- Success Alert Container -->
          <div class="auth-alert alert-success" id="auth-success-box" style="display:none" role="alert">
            <span class="alert-icon">✅</span>
            <span id="auth-success-msg"></span>
          </div>

          <!-- Reset Form -->
          <form id="reset-form" class="auth-form" onsubmit="App.Views.ForgotPassword.handleSubmit(event)">
            
            <div class="auth-field">
              <label for="reset-email" class="auth-label">Registered Email Address</label>
              <div class="input-icon-wrap">
                <span class="input-icon">✉️</span>
                <input type="email" id="reset-email" class="input auth-input" placeholder="name@company.com" required autocomplete="email">
              </div>
            </div>

            <button type="submit" id="reset-submit-btn" class="btn btn-primary btn-lg w-full auth-submit-btn">
              <span>Send Password Reset Link</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>

          </form>

          <!-- Footer Link -->
          <div class="auth-footer text-center mt-24">
            <a href="#/login" class="auth-link font-bold" onclick="event.preventDefault(); App.Router.go('login')">
              ← Back to Sign In
            </a>
          </div>

        </div>
      </div>
    `;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const emailEl = document.getElementById('reset-email');
    const submitBtn = document.getElementById('reset-submit-btn');

    const email = emailEl?.value.trim() || '';

    if (!email) {
      showError('Please enter your registered email address.');
      emailEl?.focus();
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address.');
      emailEl?.focus();
      return;
    }

    hideAlerts();
    setSubmitting(submitBtn, true, 'Sending Reset Link…');

    try {
      await App.Auth.sendPasswordReset(email);
      showSuccess(`Password reset link sent to ${email}! Please check your email inbox.`);
      if (emailEl) emailEl.value = '';
      setSubmitting(submitBtn, false, 'Send Password Reset Link');
    } catch (err) {
      showError(err.message);
      setSubmitting(submitBtn, false, 'Send Password Reset Link');
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(msg) {
    hideAlerts();
    const errorBox = document.getElementById('auth-error-box');
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorBox && errorMsg) {
      errorMsg.textContent = msg;
      errorBox.style.display = 'flex';
    }
  }

  function showSuccess(msg) {
    hideAlerts();
    const successBox = document.getElementById('auth-success-box');
    const successMsg = document.getElementById('auth-success-msg');
    if (successBox && successMsg) {
      successMsg.textContent = msg;
      successBox.style.display = 'flex';
    }
  }

  function hideAlerts() {
    const errorBox = document.getElementById('auth-error-box');
    const successBox = document.getElementById('auth-success-box');
    if (errorBox) errorBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';
  }

  function setSubmitting(btn, isSubmitting, text) {
    if (!btn) return;
    btn.disabled = isSubmitting;
    if (isSubmitting) {
      btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> <span>${text}</span>`;
    } else {
      btn.innerHTML = `<span>${text}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>`;
    }
  }

  return { render, handleSubmit };
})();
