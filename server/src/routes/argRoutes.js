const express = require('express');
const router = express.Router();
const multer = require('multer');
const argController = require('../controllers/argController');
const { requireAuth } = require('../middleware/authMiddleware');

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const uploadMemory = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

router.get('/', argController.getAllArgs);
// Must be declared before GET /:id so "analytics" is not treated as an id.
router.get('/analytics/mine', requireAuth, argController.getCreatorAnalytics);
router.get('/:id', argController.getArgById);
router.post('/', requireAuth, argController.createArg);
router.put('/:id', requireAuth, argController.updateArg);
router.patch('/:id/status', requireAuth, argController.updateArgStatus);
router.post('/:id/vote', requireAuth, argController.voteArg);
router.post('/:id/flag', requireAuth, argController.flagArg);
router.post('/:id/flags/:flagId/resolve', requireAuth, argController.resolveOwnFlag);
router.delete('/:id', requireAuth, argController.deleteArg);
router.post('/:id/cover-image', requireAuth, uploadMemory.single('image'), argController.uploadCoverImage);
router.get('/:id/cover-image', argController.getCoverImage);

module.exports = router;
