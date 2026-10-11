const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const minigameController = require('../controllers/minigameController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { gameIdParams } = require('../validators/requestSchemas');

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Apply requireAuth to all routes
router.use(requireAuth);

router.post('/:gameId/reference', validate('params', gameIdParams), uploadMemory.single('image'), minigameController.uploadReference);
router.delete('/:gameId/reference', validate('params', gameIdParams), minigameController.deleteReference);
router.get('/:gameId/reference/image', validate('params', gameIdParams), minigameController.getReferenceImage);
router.post('/:gameId/attempt', validate('params', gameIdParams), uploadMemory.single('image'), minigameController.submitAttempt);

module.exports = router;
