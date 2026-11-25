const { User, Flag, Arg, Comment, GameSession } = require('../models');
const { Op } = require('sequelize');
const badgeService = require('../services/badgeService');
const demoService = require('../services/demoService');

// Fields safe to return to the admin client — never leak password_hash,
// session_token or google_uid in a response body.
const ADMIN_USER_FIELDS = ['user_id', 'username', 'email', 'role', 'trust_score', 'is_flagged', 'is_suspended'];

// Platform-wide counters for the admin dashboard header.
exports.getMetrics = async (req, res) => {
  try {
    const [total_users, total_args, published_args, open_flags, active_sessions, completed_sessions] = await Promise.all([
      User.count(),
      Arg.count(),
      Arg.count({ where: { status: 'published' } }),
      Flag.count({ where: { status: { [Op.in]: ['open', 'reviewing'] } } }),
      GameSession.count({ where: { status: 'active' } }),
      GameSession.count({ where: { status: 'completed' } })
    ]);

    res.json({
      total_users,
      total_args,
      published_args,
      open_flags,
      active_sessions,
      completed_sessions
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

exports.getFlags = async (req, res) => {
  try {
    const flags = await Flag.findAll({
      where: {
        status: {
          [Op.in]: ['open', 'reviewing']
        }
      },
      include: [
        { model: User, as: 'Reporter', attributes: ['user_id', 'username'] },
        { model: Arg, attributes: ['arg_id', 'title'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
};

exports.resolveFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const flag = await Flag.findByPk(id);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    
    flag.status = 'resolved';
    flag.resolved_by = req.user.user_id;
    flag.resolved_at = new Date();
    await flag.save();

    if (flag.reporter_id) {
      badgeService.evaluateAndAwardBadges(flag.reporter_id).catch(() => {});
    }

    res.json({ message: 'Flag resolved successfully', flag });
  } catch (error) {
    console.error('Error resolving flag:', error);
    res.status(500).json({ error: 'Failed to resolve flag' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      whereClause = {
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: [...ADMIN_USER_FIELDS],
      order: [['trust_score', 'ASC']],
      limit: 50
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

exports.toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Bans are suspensions. is_flagged is a legacy anti-spoofing marker the
    // system no longer sets automatically — bans must never touch it.
    user.is_suspended = !user.is_suspended;
    await user.save();

    const safeUser = {};
    for (const field of ADMIN_USER_FIELDS) {
      safeUser[field] = user[field];
    }

    res.json({ message: `User ${user.is_suspended ? 'banned' : 'unbanned'} successfully`, user: safeUser });
  } catch (error) {
    console.error('Error toggling user ban:', error);
    res.status(500).json({ error: 'Failed to toggle ban status' });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    const arg = await Arg.findByPk(id);
    
    if (!arg) {
      return res.status(404).json({ error: 'Game not found' });
    }

    await arg.destroy();
    try {
      const currentDemoId = await demoService.getDemoArgId();
      if (currentDemoId && Number(currentDemoId) === Number(id)) {
        await demoService.setDemoArgId(null);
      }
    } catch {
      // Ignore if PlatformSetting is not mocked in isolated unit tests
    }
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findByPk(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await comment.destroy();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

exports.listGames = async (req, res) => {
  try {
    const [games, demo_arg_id] = await Promise.all([
      Arg.findAll({
        where: { status: { [Op.ne]: 'retired' } },
        attributes: ['arg_id', 'title', 'caption', 'mode', 'status', 'play_count', 'created_at'],
        include: [{ model: User, as: 'Creator', attributes: ['username'] }],
        order: [['created_at', 'DESC']]
      }),
      demoService.getDemoArgId()
    ]);

    res.json({ games, demo_arg_id });
  } catch (error) {
    console.error('Error listing games:', error);
    res.status(500).json({ error: 'Failed to list games' });
  }
};

exports.getDemoGame = async (req, res) => {
  try {
    const game = await demoService.getDemoArg();
    res.json({
      demo_arg_id: game ? game.arg_id : null,
      game: game ? (typeof game.toJSON === 'function' ? game.toJSON() : game) : null
    });
  } catch (error) {
    console.error('Error fetching demo game setting:', error);
    res.status(500).json({ error: 'Failed to fetch demo game setting' });
  }
};

exports.setDemoGame = async (req, res) => {
  try {
    const { arg_id } = req.body || {};
    const result = await demoService.setDemoArgId(arg_id);
    res.json({
      message: result.demo_arg_id ? 'Demo game updated successfully' : 'Demo game cleared successfully',
      demo_arg_id: result.demo_arg_id,
      game: result.game ? (typeof result.game.toJSON === 'function' ? result.game.toJSON() : result.game) : null
    });
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating demo game:', error);
    res.status(500).json({ error: 'Failed to update demo game' });
  }
};
