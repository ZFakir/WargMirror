const { User, Arg } = require('../models');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['google_uid', 'session_token'] }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

exports.getUserLibrary = async (req, res) => {
  try {
    const args = await Arg.findAll({
      where: { creator_id: req.params.id }
    });
    res.json(args);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user library' });
  }
};
