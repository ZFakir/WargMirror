import os

routes_dir = r"c:\Users\Father Fakir\WARG-Platform\server\src\routes"
controllers_dir = r"c:\Users\Father Fakir\WARG-Platform\server\src\controllers"

os.makedirs(routes_dir, exist_ok=True)
os.makedirs(controllers_dir, exist_ok=True)

controllers = {
    "argController": """const { Arg, User, Waypoint } = require('../models');

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
""",

    "userController": """const { User, Arg } = require('../models');

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
""",

    "sessionController": """const { GameSession, Arg } = require('../models');

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
"""
}

routes = {
    "argRoutes": """const express = require('express');
const router = express.Router();
const argController = require('../controllers/argController');

router.get('/', argController.getAllArgs);
router.get('/:id', argController.getArgById);
router.post('/', argController.createArg);

module.exports = router;
""",

    "userRoutes": """const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:id', userController.getUserProfile);
router.get('/:id/library', userController.getUserLibrary);

module.exports = router;
""",

    "sessionRoutes": """const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

router.post('/start', sessionController.startGameSession);
router.get('/:user_id', sessionController.getActiveSessions);

module.exports = router;
"""
}

for name, content in controllers.items():
    with open(os.path.join(controllers_dir, f"{name}.js"), "w", encoding="utf-8") as f:
        f.write(content)

for name, content in routes.items():
    with open(os.path.join(routes_dir, f"{name}.js"), "w", encoding="utf-8") as f:
        f.write(content)

print("Controllers and Routes generated successfully!")
