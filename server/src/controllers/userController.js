const { User, Arg, FriendRequest, GameSession } = require('../models');
const { Op } = require('sequelize');

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

exports.getFriends = async (req, res) => {
  try {
    const userId = req.params.id;
    // Find all accepted friend requests involving this user
    const friendRequests = await FriendRequest.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        status: 'accepted'
      }
    });

    const friendIds = friendRequests.map(fr =>
      fr.sender_id.toString() === userId.toString() ? fr.receiver_id : fr.sender_id
    );

    if (friendIds.length === 0) {
      return res.json([]);
    }

    const friends = await User.findAll({
      where: { user_id: friendIds },
      attributes: ['user_id', 'username', 'avatar'],
      include: [{
        model: GameSession,
        where: { status: 'active' },
        required: false,
        include: [{ model: Arg, attributes: ['title'] }]
      }]
    });

    res.json(friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};
