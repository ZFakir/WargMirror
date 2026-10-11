const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { validate } = require('../middleware/validate');
const { sessionArgParams, sessionParams } = require('../validators/requestSchemas');

router.get('/:user_id', validate('params', sessionParams), sessionController.getActiveSessions);
router.delete('/:user_id/arg/:arg_id', validate('params', sessionArgParams), sessionController.removeRecentSession);

module.exports = router;
