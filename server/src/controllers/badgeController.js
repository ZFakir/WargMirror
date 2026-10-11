const { Badge } = require('../models');
const badgeService = require('../services/badgeService');

exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.findAll({
      attributes: ['badge_id', 'name', 'description', 'icon_svg']
    });
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
