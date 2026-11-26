const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const antiSpoofing = require('../middleware/antiSpoofing');
const { requireAuthOrDemoArg } = require('../middleware/authMiddleware');

router.use(requireAuthOrDemoArg);

router.post('/:argId/start', gameController.startGameSession);
router.get('/:argId/state', gameController.getGameState);
router.post('/:argId/waypoint/:waypointId/arrive', antiSpoofing, gameController.arriveAtWaypoint);
router.post('/:argId/waypoint/:waypointId/submit', gameController.submitMinigame);
router.post('/:argId/waypoint/:waypointId/domination-ping', antiSpoofing, gameController.dominationPing);
router.get('/:argId/waypoint/:waypointId/domination-scores', gameController.getDominationScores);
router.post('/:argId/abandon', gameController.abandonSession);
router.post('/:argId/reset', gameController.resetSession);

module.exports = router;
