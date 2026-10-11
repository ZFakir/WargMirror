const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

router.get('/:user_id', sessionController.getActiveSessions);
router.delete('/:user_id/arg/:arg_id', sessionController.removeRecentSession);

module.exports = router;
