const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Only an admin ban (is_suspended) blocks access — and it is enforced on
    // live sessions too, not just at login. The anti-spoofing trust signal
    // (is_flagged) is informational: no player is ever banned automatically.
    if (req.user && req.user.is_suspended) {
      return res.status(403).json({ error: 'Forbidden: Your account has been suspended.' });
    }
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
};

const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Admin access required.' });
};

module.exports = {
  requireAuth,
  requireAdmin
};
