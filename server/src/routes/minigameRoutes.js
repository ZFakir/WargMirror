const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const minigameController = require('../controllers/minigameController');
const { requireAuth } = require('../middleware/authMiddleware');

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Apply requireAuth to all routes
router.use(requireAuth);

router.post('/:gameId/reference', uploadMemory.single('image'), minigameController.uploadReference);
router.get('/:gameId/reference/image', minigameController.getReferenceImage);
router.post('/:gameId/attempt', uploadMemory.single('image'), minigameController.submitAttempt);

module.exports = router;
