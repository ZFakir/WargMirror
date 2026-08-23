const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Apply requireAuth to all routes in this router
router.use(requireAuth);

router.post('/sam-extract', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'target_mask', maxCount: 1 }
]), aiController.evaluateShape);

router.post('/hsv-match', upload.fields([
  { name: 'image', maxCount: 1 }
]), aiController.evaluateColour);

router.post('/texture-match', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'reference_image', maxCount: 1 }
]), aiController.evaluateTexture);

router.post('/sift-match', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'archival_image', maxCount: 1 }
]), aiController.evaluateSift);

router.post('/symmetry', upload.fields([
  { name: 'image', maxCount: 1 }
]), aiController.evaluateSymmetry);

module.exports = router;
