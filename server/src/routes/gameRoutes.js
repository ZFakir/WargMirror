const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const antiSpoofing = require('../middleware/antiSpoofing');
const { requireAuth } = require('../middleware/authMiddleware'); // assuming requireAuth is exported by authMiddleware
router.post('/:argId/start', gameController.startGameSession);
router.get('/:argId/state', gameController.getGameState);
router.post('/:argId/waypoint/:waypointId/arrive', requireAuth, antiSpoofing, gameController.arriveAtWaypoint);
router.post('/:argId/waypoint/:waypointId/submit', gameController.submitMinigame);
router.post('/:argId/abandon', gameController.abandonSession);

module.exports = router;
