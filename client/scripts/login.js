document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  const apiBase = window.API_BASE_URL || 'https://wargmirror.onrender.com';

  // Non-blocking lookup for an admin-configured Innovation Day demo game
  (async function loadDemoOption() {
    const section = document.getElementById('demo-game-section');
    const demoBtn = document.getElementById('btn-play-demo');
    const demoSub = document.getElementById('demo-game-subtitle');
    if (!section || !demoBtn) return;

    try {
      const res = await fetch(`${apiBase}/api/demo`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.demo && data.demo.arg_id) {
        demoBtn.href = `game.html?id=${encodeURIComponent(data.demo.arg_id)}&demo=1`;
        if (demoSub) {
          demoSub.textContent = `Try "${data.demo.title}" — no account needed`;
        }
        section.hidden = false;
      }
    } catch {
      // Ignore demo fetch failures so login form remains unaffected
    }
  })();

  // Inline error message (replaces the old alert() popups)
  let errorEl = null;
  function showError(message) {
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'form-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.style.cssText = 'color:#ef4444;font-size:0.9rem;margin:0 0 12px;text-align:center;';
      form.insertBefore(errorEl, form.firstChild);
    }
    errorEl.textContent = message;
  }

  // Surface OAuth redirect errors (e.g. ?error=auth_failed)
  const oauthError = new URLSearchParams(window.location.search).get('error');
  if (oauthError) {
    const errorMessages = {
      auth_failed: 'Google sign-in failed or was cancelled. Please try again.',
      server_error: 'A server error occurred during Google sign-in. Please try again.',
      session_error: 'Could not start your session. Please try again.'
    };
    showError(errorMessages[oauthError] || 'Sign-in failed. Please try again.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorEl) errorEl.textContent = '';

    const email = form.email.value.trim();
    const password = form.password.value;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // The backend sleeps after ~15 min idle (Render free tier), and waking it
    // can take 30s+. Never hang silently on "Processing..." — explain the
    // wait and time out with a clear message.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const wakeTimer = setTimeout(() => {
      if (submitBtn.disabled) submitBtn.textContent = 'Waking the server — this can take up to a minute…';
    }, 5000);

    try {
      const response = await fetch(`${window.API_BASE_URL || 'https://wargmirror.onrender.com'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful, redirect to home
        window.location.href = 'home.html';
      } else {
        // Show error message and restore button
        showError(data.error || 'Login failed. Please check your credentials.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'AbortError') {
        showError('The server is taking too long to respond. Please try again in a moment.');
      } else {
        showError('An error occurred while logging in. Please try again later.');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } finally {
      clearTimeout(timeout);
      clearTimeout(wakeTimer);
    }
  });
});
