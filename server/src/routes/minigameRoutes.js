const express = require('express');
const router = express.Router();
const multer = require('multer');
const minigameController = require('../controllers/minigameController');
const { requireAuth, requireAuthOrDemoMinigame } = require('../middleware/authMiddleware');

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/:gameId/reference', requireAuth, uploadMemory.single('image'), minigameController.uploadReference);
router.delete('/:gameId/reference', requireAuth, minigameController.deleteReference);
router.get('/:gameId/reference/image', requireAuthOrDemoMinigame, minigameController.getReferenceImage);
router.post('/:gameId/attempt', requireAuthOrDemoMinigame, uploadMemory.single('image'), minigameController.submitAttempt);

module.exports = router;
