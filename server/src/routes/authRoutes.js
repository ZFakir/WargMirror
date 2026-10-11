const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// Redirect to Google's consent screen
router.get('/google', (req, res, next) => {
  // Store the requesting origin in the session so we know where to redirect back to
  if (req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      if (refererUrl.protocol === 'http:' || refererUrl.protocol === 'https:') {
        let basePath = refererUrl.origin + refererUrl.pathname;
        // Strip trailing filename (e.g. /login.html) to get the directory path
        req.session.oauthReturnTo = basePath.substring(0, basePath.lastIndexOf('/'));
      }
    } catch {
      // Malformed referer — fall back to CLIENT_PAGES_URL / CLIENT_URL below.
    }
  }
  // Persist the session BEFORE redirecting to Google. On a first-ever visit
  // the session is new, and if the save races the redirect (slow MySQL store
  // waking from a spool-down), the callback sees an empty session and the
  // redirect falls back to a bare relative path.
  req.session.save((err) => {
    if (err) console.error('❌ Session save before Google redirect failed:', err.message);
    next();
  });
}, passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Origins the OAuth callback is allowed to redirect to: the configured client
// URL(s), CLIENT_PAGES_URL, and the backend itself (which also serves the
// client under /client).
function allowedRedirectOrigins(req) {
  const origins = new Set();
  const add = value => {
    if (!value) return;
    try { origins.add(new URL(value.trim()).origin); } catch { /* skip malformed entries */ }
  };
  (process.env.CLIENT_URL || '').split(',').forEach(add);
  add(process.env.CLIENT_PAGES_URL);
  const host = req.get('host');
  if (host) {
    add(`http://${host}`);
    add(`https://${host}`);
  }
  return origins;
}

// Pick a validated redirect base (e.g. "https://app.vercel.app", optionally
// with a trailing "/client"). The session's oauthReturnTo originates from a
// browser referer, which can be missing, stripped, or shaped like
// <origin>/auth — composing a target from it unchecked produced 404s such as
// <origin>/auth/home.html. Only http(s) URLs whose origin is allowlisted and
// whose path is empty or /client are accepted; anything else falls through
// to the next candidate. Returns '' when nothing validates, in which case
// callers use the backend-served /client/* pages.
function pickRedirectBase(req) {
  const allowed = allowedRedirectOrigins(req);
  const firstEntry = value => (value ? value.split(',')[0].trim() : '');
  const candidates = [
    req.session.oauthReturnTo,
    firstEntry(process.env.CLIENT_PAGES_URL),
    firstEntry(process.env.CLIENT_URL)
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      const basePath = url.pathname.replace(/\/+$/, '');
      const validProtocol = url.protocol === 'http:' || url.protocol === 'https:';
      if (validProtocol && allowed.has(url.origin) && (basePath === '' || basePath === '/client')) {
        return url.origin + (basePath === '/client' ? '/client' : '');
      }
      console.warn(`⚠️ Ignoring unsafe OAuth redirect base: ${candidate}`);
    } catch {
      console.warn(`⚠️ Ignoring malformed OAuth redirect base: ${candidate}`);
    }
  }
  return '';
}

// Google redirects back here after the user grants/denies permission
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    // Where to send the user. The base is validated against an origin
    // allowlist — never composed blindly from the session/referer.
    const redirectBase = pickRedirectBase(req);
    
    // Clean up session
    delete req.session.oauthReturnTo;

    const homeTarget = redirectBase ? redirectBase + '/home.html' : '/client/home.html';
    const loginTarget = redirectBase ? redirectBase + '/login.html' : '/client/login.html';

    console.log(`🔀 OAuth callback redirect → ${homeTarget} (referer: ${req.headers.referer || 'none'})`);

    // Database or other server error
    if (err) {
      console.error('❌ Google Auth Error:', err.message);
      return res.redirect(loginTarget + (redirectBase ? '?error=server_error' : ''));
    }

    // Authentication failed (user denied, or strategy returned false)
    if (!user) {
      return res.redirect(loginTarget + (redirectBase ? '?error=auth_failed' : ''));
    }

    // Log the user in and create a session
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Session Error:', loginErr.message);
        return res.redirect(loginTarget + (redirectBase ? '?error=session_error' : ''));
      }
      // Save before redirecting: res.redirect can otherwise outrun the
      // session write on a cold/slow session store, and the browser reaches
      // home.html without its logged-in session.
      req.session.save((saveErr) => {
        if (saveErr) console.error('❌ Session save after login failed:', saveErr.message);
        res.redirect(homeTarget);
      });
    });
  })(req, res, next);
});

// Local Signup
router.post('/signup', authController.signup);

// Check if user exists (for frontend validation)
router.get('/check-user', authController.checkUserExists);

// Local Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('❌ Local Auth Error:', err.message);
      return res.status(500).json({ error: 'Server error during authentication' });
    }
    if (!user) {
      return res.status(401).json({ error: info.message || 'Authentication failed' });
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Session Error:', loginErr.message);
        return res.status(500).json({ error: 'Session error' });
      }
      return res.json({ message: 'Login successful', user_id: user.user_id });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout Error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

// Get the currently authenticated user
router.get('/me', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const { GameSession } = require('../models');
      const gamesCompleted = await GameSession.count({
        where: { user_id: req.user.user_id, status: 'completed' },
        distinct: true,
        col: 'arg_id'
      });
      return res.json({
        user_id: req.user.user_id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        auth_provider: req.user.auth_provider,
        games_completed: gamesCompleted,
        profile_picture: req.user.profile_picture_url || null
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error fetching user profile' });
    }
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

// Update account (email/password)
router.put('/account', authController.updateAccount);

// Delete account
router.delete('/account', authController.deleteAccount);

// Password reset flow
router.post('/forgot', authController.forgotPassword);
router.post('/reset', authController.resetPassword);

module.exports = router;
