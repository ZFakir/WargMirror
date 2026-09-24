const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user && req.user.is_flagged) {
      return res.status(403).json({ error: 'Forbidden: Your account has been banned.' });
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
