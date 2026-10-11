const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const antiSpoofing = require('../middleware/antiSpoofing');
const { requireAuth } = require('../middleware/authMiddleware'); // assuming requireAuth is exported by authMiddleware
const { validate } = require('../middleware/validate');
const { game } = require('../validators/requestSchemas');
router.post('/:argId/start', validate('params', game.params), gameController.startGameSession);
router.get('/:argId/state', validate('params', game.params), gameController.getGameState);
router.post('/:argId/waypoint/:waypointId/arrive', requireAuth, validate('params', game.waypointParams), validate('body', game.location), antiSpoofing, gameController.arriveAtWaypoint);
router.post('/:argId/waypoint/:waypointId/submit', validate('params', game.waypointParams), validate('body', game.submission), gameController.submitMinigame);
router.post('/:argId/waypoint/:waypointId/domination-ping', requireAuth, validate('params', game.waypointParams), validate('body', game.dominationPing), antiSpoofing, gameController.dominationPing);
router.get('/:argId/waypoint/:waypointId/domination-scores', validate('params', game.waypointParams), validate('query', game.dominationScores), gameController.getDominationScores);
router.post('/:argId/abandon', validate('params', game.params), gameController.abandonSession);
router.post('/:argId/reset', requireAuth, validate('params', game.params), gameController.resetSession);

module.exports = router;
