const { Arg, User, Waypoint } = require('../models');

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
