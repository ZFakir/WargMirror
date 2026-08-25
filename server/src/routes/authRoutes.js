const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// Redirect to Google's consent screen
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google redirects back here after the user grants/denies permission
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    // Use CLIENT_PAGES_URL for redirects (includes /client path for local dev).
    // Falls back to CLIENT_URL if not set.
    const clientUrl = process.env.CLIENT_PAGES_URL || process.env.CLIENT_URL || '';

    // Database or other server error
    if (err) {
      console.error('❌ Google Auth Error:', err.message);
      return res.redirect(clientUrl + '/login.html?error=server_error');
    }

    // Authentication failed (user denied, or strategy returned false)
    if (!user) {
      return res.redirect(clientUrl + '/login.html?error=auth_failed');
    }

    // Log the user in and create a session
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Session Error:', loginErr.message);
        return res.redirect(clientUrl + '/login.html?error=session_error');
      }
      return res.redirect(clientUrl + '/home.html');
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

// Get the currently authenticated user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      user_id: req.user.user_id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar
    });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// Logout — destroy session and redirect to login
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    req.session.destroy(() => {
      res.redirect((process.env.CLIENT_PAGES_URL || process.env.CLIENT_URL || '') + '/login.html');
    });
  });
});

module.exports = router;
