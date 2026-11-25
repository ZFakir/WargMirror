const { literal, Op } = require('sequelize');
const { User, Arg, FriendRequest, GameSession, Badge } = require('../models');
const badgeService = require('../services/badgeService');
const {
  isBadgeEvalFresh,
  markBadgeEval,
  invalidateBadgeCooldown
} = require('../utils/cache');

// Profile fields that must never be exposed to other clients (avatar is a MEDIUMBLOB not used by the UI).
const PRIVATE_USER_ATTRIBUTES = ['google_uid', 'session_token', 'password_hash', 'email', 'avatar', 'password_reset_token', 'password_reset_expires'];
const COVER_EXISTS_ATTR = [literal('`Arg`.`cover_image` IS NOT NULL'), 'cover_image'];

exports.getUserProfile = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!isBadgeEvalFresh(targetId)) {
      try {
        await badgeService.evaluateAndAwardBadges(targetId);
        markBadgeEval(targetId);
      } catch (badgeErr) {
        console.warn('Badge evaluation error on profile fetch:', badgeErr.message);
      }
    }

    const [user, gamesCompleted] = await Promise.all([
      User.findByPk(targetId, {
        attributes: { exclude: PRIVATE_USER_ATTRIBUTES },
        include: [{ model: Badge, attributes: ['badge_id', 'name', 'description', 'icon_svg'], through: { attributes: ['awarded_at'] } }]
      }),
      GameSession.count({
        where: { user_id: targetId, status: 'completed' },
        distinct: true,
        col: 'arg_id'
      })
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const userJSON = user.toJSON();
    userJSON.games_completed = gamesCompleted;

    if (typeof res.set === 'function') {
      res.set('Cache-Control', 'private, max-age=15');
    }

    res.json(userJSON);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

exports.getUserLibrary = async (req, res) => {
  try {
    const args = await Arg.findAll({
      where: { creator_id: req.params.id },
      attributes: { exclude: ['cover_image'], include: [COVER_EXISTS_ATTR] },
      include: [{ model: User, as: 'Creator', attributes: ['username'] }]
    });
    if (typeof res.set === 'function') {
      res.set('Cache-Control', 'private, max-age=15');
    }
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
      attributes: ['user_id', 'username'],
      include: [{
        model: GameSession,
        where: { status: 'active' },
        required: false,
        include: [{ model: Arg, attributes: ['title'] }]
      }]
    });

    if (typeof res.set === 'function') {
      res.set('Cache-Control', 'private, max-age=15');
    }

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
      attributes: ['user_id', 'username'],
      limit: 25
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to search users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

exports.sendFriendRequest = async (req, res) => {
  try {
    // The sender is always the authenticated user — never trust the path id.
    if (parseInt(req.params.id, 10) !== req.user.user_id) {
      return res.status(403).json({ error: 'Cannot send friend requests on behalf of another user' });
    }
    const senderId = req.user.user_id;
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
    // Friend requests are private to the authenticated user.
    if (parseInt(req.params.id, 10) !== req.user.user_id) {
      return res.status(403).json({ error: 'Cannot view another user\'s friend requests' });
    }
    const userId = req.user.user_id;
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
      attributes: ['user_id', 'username']
    });

    const senderById = new Map(senders.map(s => [s.user_id, s]));

    // Map sender info to requests
    const formattedRequests = requests.map(reqItem => ({
      request_id: reqItem.request_id,
      sender_id: reqItem.sender_id,
      receiver_id: reqItem.receiver_id,
      status: reqItem.status,
      sent_at: reqItem.sent_at,
      sender: senderById.get(reqItem.sender_id)
    }));

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

    // Only the recipient may accept or decline a request.
    if (request.receiver_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Only the recipient can respond to a friend request' });
    }

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      invalidateBadgeCooldown(request.sender_id);
      invalidateBadgeCooldown(request.receiver_id);
      badgeService.evaluateAndAwardBadges(request.sender_id).catch(() => {});
      badgeService.evaluateAndAwardBadges(request.receiver_id).catch(() => {});
    }

    res.json(request);
  } catch (error) {
    console.error('Failed to respond to friend request:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    // The acting user is always the authenticated user — never trust the path id.
    if (parseInt(req.params.id, 10) !== req.user.user_id) {
      return res.status(403).json({ error: 'Cannot remove friends on behalf of another user' });
    }
    const userId = req.user.user_id;
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
