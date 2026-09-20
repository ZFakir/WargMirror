const { User, Arg, FriendRequest, GameSession, Badge } = require('../models');
const { Op } = require('sequelize');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['google_uid', 'session_token'] },
      include: [{ model: Badge, attributes: ['badge_id', 'name', 'description'], through: { attributes: ['awarded_at'] } }]
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

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    const users = await User.findAll({
      where: {
        username: {
          [Op.like]: `%${q}%`
        }
      },
      attributes: ['user_id', 'username', 'avatar']
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to search users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.params.id;
    const { receiverId } = req.body;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    // Check if request already exists
    const existing = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { sender_id: senderId, receiver_id: receiverId },
          { sender_id: receiverId, receiver_id: senderId }
        ],
        status: {
          [Op.in]: ['pending', 'accepted']
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Friend request already exists or already friends' });
    }

    const request = await FriendRequest.create({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Failed to send friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.params.id;
    const requests = await FriendRequest.findAll({
      where: {
        receiver_id: userId,
        status: 'pending'
      }
    });

    // Also get sender details
    if (requests.length === 0) {
      return res.json([]);
    }

    const senderIds = requests.map(r => r.sender_id);
    const senders = await User.findAll({
      where: { user_id: senderIds },
      attributes: ['user_id', 'username', 'avatar']
    });

    // Map sender info to requests
    const formattedRequests = requests.map(req => {
      const sender = senders.find(s => s.user_id === req.sender_id);
      return {
        request_id: req.request_id,
        sender_id: req.sender_id,
        receiver_id: req.receiver_id,
        status: req.status,
        sent_at: req.sent_at,
        sender: sender
      };
    });

    res.json(formattedRequests);
  } catch (error) {
    console.error('Failed to fetch friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
};

exports.respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await FriendRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Failed to respond to friend request:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const userId = req.params.id;
    const friendId = req.params.friendId;

    const result = await FriendRequest.destroy({
      where: {
        [Op.or]: [
          { sender_id: userId, receiver_id: friendId },
          { sender_id: friendId, receiver_id: userId }
        ],
        status: 'accepted'
      }
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Friend connection not found' });
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Failed to remove friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};
