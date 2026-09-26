const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// Redirect to Google's consent screen
router.get('/google', (req, res, next) => {
  // Store the requesting origin in the session so we know where to redirect back to
  if (req.headers.referer) {
    const refererUrl = new URL(req.headers.referer);
    req.session.oauthReturnTo = refererUrl.origin;
  }
  next();
}, passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google redirects back here after the user grants/denies permission
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    // Determine redirect URL:
    // 1. Where they initiated the login from (saved in session)
    // 2. The explicit CLIENT_PAGES_URL (if configured)
    // 3. The default CLIENT_URL
    let clientUrl = req.session.oauthReturnTo || process.env.CLIENT_PAGES_URL || process.env.CLIENT_URL || '';
    
    // If CLIENT_URL is a comma-separated list, take the first one
    if (clientUrl && clientUrl.includes(',')) {
      clientUrl = clientUrl.split(',')[0].trim();
    }
    
    // Clean up session
    delete req.session.oauthReturnTo;

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

// Logout
router.get('/logout', (req, res) => {
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

module.exports = router;
