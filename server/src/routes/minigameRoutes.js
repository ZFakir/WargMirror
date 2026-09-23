const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const minigameController = require('../controllers/minigameController');
const { requireAuth } = require('../middleware/authMiddleware');

const uploadsDir = path.join(__dirname, '../../uploads/minigames');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Save as gameId_reference.jpg
    cb(null, `${req.params.gameId}_reference${path.extname(file.originalname)}`);
  }
});

const uploadDisk = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Apply requireAuth to all routes
router.use(requireAuth);

router.post('/:gameId/reference', uploadDisk.single('image'), minigameController.uploadReference);
router.get('/:gameId/reference/image', minigameController.getReferenceImage);
router.post('/:gameId/attempt', uploadMemory.single('image'), minigameController.submitAttempt);

module.exports = router;
