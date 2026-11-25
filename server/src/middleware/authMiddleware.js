const { Minigame, Waypoint } = require('../models');
const demoService = require('../services/demoService');

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

/**
 * Allows authenticated non-suspended users OR unauthenticated guests playing
 * the currently configured demo ARG.
 */
const requireAuthOrDemoArg = async (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.is_suspended) {
      return res.status(403).json({ error: 'Forbidden: Your account has been suspended.' });
    }
    return next();
  }

  try {
    const argId = req.params && req.params.argId;
    if (argId && await demoService.isDemoArg(argId)) {
      req.isDemoGuest = true;
      return next();
    }
  } catch (err) {
    return next(err);
  }

  return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
};

/**
 * Allows authenticated non-suspended users OR unauthenticated guests interacting
 * with a minigame that belongs to the currently configured demo ARG.
 */
const requireAuthOrDemoMinigame = async (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.is_suspended) {
      return res.status(403).json({ error: 'Forbidden: Your account has been suspended.' });
    }
    return next();
  }

  try {
    const gameId = req.params && req.params.gameId;
    if (gameId && Minigame && typeof Minigame.findByPk === 'function') {
      const minigame = await Minigame.findByPk(gameId, {
        include: [{ model: Waypoint, attributes: ['arg_id'] }]
      });
      const argId = minigame && minigame.Waypoint ? minigame.Waypoint.arg_id : null;
      if (argId && await demoService.isDemoArg(argId)) {
        req.isDemoGuest = true;
        return next();
      }
    }
  } catch (err) {
    return next(err);
  }

  return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireAuthOrDemoArg,
  requireAuthOrDemoMinigame
};
