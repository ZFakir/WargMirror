const { GameSession, Arg } = require('../models');

exports.startGameSession = async (req, res) => {
  try {
    const { user_id, arg_id } = req.body;
    const session = await GameSession.create({ user_id, arg_id, status: 'active' });
    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start game session' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await GameSession.findAll({
      where: { user_id: req.params.user_id, status: 'active' },
      include: [{ model: Arg, attributes: ['title', 'caption', 'cover_image'] }]
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
};
