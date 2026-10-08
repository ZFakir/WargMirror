const { GameSession, Arg } = require('../models');

exports.startGameSession = async (req, res) => {
  try {
    // The acting user comes from the session, never from the request body.
    const user_id = req.user.user_id;
    const { arg_id } = req.body;
    const session = await GameSession.create({ user_id, arg_id, status: 'active' });
    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start game session' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    // Sessions are private to the authenticated user.
    if (parseInt(req.params.user_id, 10) !== req.user.user_id) {
      return res.status(403).json({ error: 'Cannot view another user\'s sessions' });
    }
    const sessions = await GameSession.findAll({
      where: { user_id: req.user.user_id },
      include: [{ model: Arg, attributes: ['title', 'caption', 'cover_image'] }],
      order: [['last_active_at', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
};

exports.removeRecentSession = async (req, res) => {
  try {
    // Sessions can only be removed by their owner.
    if (parseInt(req.params.user_id, 10) !== req.user.user_id) {
      return res.status(403).json({ error: 'Cannot remove another user\'s session' });
    }
    const { arg_id } = req.params;
    await GameSession.destroy({
      where: { user_id: req.user.user_id, arg_id, status: 'active' }
    });
    res.status(200).json({ message: 'Session removed from recent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove recent session' });
  }
};
