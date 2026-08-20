const { Arg, User, Waypoint, ArgVote, Flag } = require('../models');

exports.getAllArgs = async (req, res) => {
  try {
    const args = await Arg.findAll({
      where: { status: 'published' },
      include: [{ model: User, as: 'Creator', attributes: ['username', 'avatar'] }]
    });
    res.json(args);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARGs' });
  }
};

exports.getArgById = async (req, res) => {
  try {
    const arg = await Arg.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['username', 'avatar'] },
        { model: Waypoint, attributes: ['waypoint_id', 'title', 'location'] }
      ]
    });
    if (!arg) return res.status(404).json({ error: 'ARG not found' });
    res.json(arg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARG' });
  }
};

exports.createArg = async (req, res) => {
  try {
    // In the future, creator_id will come from req.user
    const { creator_id, title, caption, description, mode, genre } = req.body;
    const newArg = await Arg.create({ creator_id, title, caption, description, mode, genre });
    res.status(201).json(newArg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ARG' });
  }
};

exports.voteArg = async (req, res) => {
  try {
    // Expecting req.body.vote ('like' or 'dislike') and req.body.user_id for now (mocked auth)
    const { vote, user_id } = req.body;
    const arg_id = req.params.id;

    if (!user_id || !vote) {
      return res.status(400).json({ error: 'Missing user_id or vote' });
    }

    const existingVote = await ArgVote.findOne({ where: { arg_id, user_id } });
    
    let action = 'voted';
    if (existingVote) {
      if (existingVote.vote === vote) {
        // User clicked the same vote button, meaning "un-vote"
        await existingVote.destroy();
        action = 'unvoted';
      } else {
        // Switched vote
        existingVote.vote = vote;
        await existingVote.save();
      }
    } else {
      // New vote
      await ArgVote.create({ arg_id, user_id, vote });
    }

    // Recalculate counts
    const like_count = await ArgVote.count({ where: { arg_id, vote: 'like' } });
    const dislike_count = await ArgVote.count({ where: { arg_id, vote: 'dislike' } });
    
    await Arg.update({ like_count, dislike_count }, { where: { arg_id } });

    res.json({ success: true, action, like_count, dislike_count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.flagArg = async (req, res) => {
  try {
    const { reporter_id, reason, description } = req.body;
    const arg_id = req.params.id;

    if (!reporter_id || !reason) {
      return res.status(400).json({ error: 'Missing reporter_id or reason' });
    }

    const flag = await Flag.create({
      arg_id,
      reporter_id,
      reason,
      description
    });

    res.status(201).json(flag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to flag ARG' });
  }
};
