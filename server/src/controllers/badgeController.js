const { Badge } = require('../models');
const badgeService = require('../services/badgeService');
const { badgesCache, invalidateBadgeCooldown } = require('../utils/cache');

exports.getAllBadges = async (req, res) => {
  try {
    const badges = await badgesCache.getOrSet('all', 10 * 60 * 1000, () =>
      Badge.findAll({
        attributes: ['badge_id', 'name', 'description', 'icon_svg']
      })
    );
    if (typeof res.set === 'function') {
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
    res.json(badges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.syncBadges = async (req, res) => {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    invalidateBadgeCooldown(userId);
    const newlyAwarded = await badgeService.evaluateAndAwardBadges(userId);
    res.json({
      message: 'Badges synchronized successfully',
      awarded_count: newlyAwarded.length,
      newly_awarded: newlyAwarded
    });
  } catch (error) {
    console.error('Error syncing badges:', error);
    res.status(500).json({ error: 'Failed to synchronize badges' });
  }
};
