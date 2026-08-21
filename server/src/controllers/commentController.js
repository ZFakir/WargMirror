const { Comment, User } = require('../models');

exports.getCommentsForArg = async (req, res) => {
  try {
    const { argId } = req.params;
    const comments = await Comment.findAll({
      where: { arg_id: argId },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      order: [['created_at', 'ASC']]
    });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Server error fetching comments' });
  }
};

exports.postComment = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'You must be logged in to comment.' });
    }

    const { argId } = req.params;
    const { body, parent_id, is_spoiler } = req.body;
    
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body cannot be empty.' });
    }

    const newComment = await Comment.create({
      arg_id: argId,
      user_id: req.user.user_id,
      parent_id: parent_id || null,
      body: body.trim(),
      is_spoiler: is_spoiler ? 1 : 0
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ error: 'Server error posting comment' });
  }
};
