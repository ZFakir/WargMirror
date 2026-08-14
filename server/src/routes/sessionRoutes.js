const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

router.post('/start', sessionController.startGameSession);
router.get('/:user_id', sessionController.getActiveSessions);

module.exports = router;
