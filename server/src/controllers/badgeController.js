const { Badge } = require('../models');

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
