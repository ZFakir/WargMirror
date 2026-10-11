/**
 * WARG Platform — Password Reset Page Logic
 * ==========================================
 * The page runs in one of two modes:
 *  - No token in the URL  → ask for the account email and request a reset link.
 *  - ?token=... in the URL → ask for a new password and complete the reset.
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  const subtitle = document.getElementById('reset-subtitle');

  if (token) {
    subtitle.textContent = 'Choose a new password for your account.';
    resetForm.hidden = false;
    initResetForm(token);
  } else {
    subtitle.textContent = 'Enter your account email and we will create a reset link.';
    forgotForm.hidden = false;
    initForgotForm();
  }

  function setFieldError(groupId, errorId, message) {
    const group = document.getElementById(groupId);
    const errorEl = document.getElementById(errorId);
    if (message) {
      group.classList.add('has-error');
      errorEl.textContent = message;
    } else {
      group.classList.remove('has-error');
      errorEl.textContent = '';
    }
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = 'reset-message reset-message--' + type;
  }

  /* ── Mode A: request a reset link ───────────────────────── */
  function initForgotForm() {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value.trim();
      const messageEl = document.getElementById('forgot-message');
      const submitBtn = document.getElementById('btn-forgot-submit');
      const origText = submitBtn.textContent;

      setFieldError('forgot-email-group', 'reset-email-error', '');
      if (!email) {
        setFieldError('forgot-email-group', 'reset-email-error', 'Please enter your email address.');
        return;
      }

      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      try {
        const data = await api.forgotPassword(email);
        showMessage(
          messageEl,
          data.message + ' Note: email delivery is not configured yet — the link is printed in the API server log.',
          'success'
        );
        forgotForm.reset();
      } catch (err) {
        showMessage(messageEl, err.message || 'Failed to request a reset link.', 'error');
      } finally {
        submitBtn.textContent = origText;
        submitBtn.disabled = false;
      }
    });
  }

  /* ── Mode B: set a new password ─────────────────────────── */
  function initResetForm(resetToken) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const messageEl = document.getElementById('reset-message');
      const submitBtn = document.getElementById('btn-reset-submit');
      const origText = submitBtn.textContent;

      setFieldError('reset-password-group', 'reset-password-error', '');
      setFieldError('reset-confirm-group', 'reset-confirm-error', '');

      if (newPassword.length < 6) {
        setFieldError('reset-password-group', 'reset-password-error', 'Password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setFieldError('reset-confirm-group', 'reset-confirm-error', 'Passwords do not match.');
        return;
      }

      submitBtn.textContent = 'Resetting...';
      submitBtn.disabled = true;
      try {
        const data = await api.resetPassword(resetToken, newPassword);
        showMessage(messageEl, data.message + ' Redirecting to login...', 'success');
        resetForm.reset();
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
      } catch (err) {
        showMessage(messageEl, err.message || 'Failed to reset the password.', 'error');
      } finally {
        submitBtn.textContent = origText;
        submitBtn.disabled = false;
      }
    });
  }
});
