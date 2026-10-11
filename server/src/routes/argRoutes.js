const express = require('express');
const router = express.Router();
const multer = require('multer');
const argController = require('../controllers/argController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { argFlagParams, argIdParams, args } = require('../validators/requestSchemas');

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
router.get('/:id', validate('params', argIdParams), argController.getArgById);
router.post('/', requireAuth, validate('body', args.content), argController.createArg);
router.put('/:id', requireAuth, validate('params', argIdParams), validate('body', args.content), argController.updateArg);
router.patch('/:id/status', requireAuth, validate('params', argIdParams), validate('body', args.status), argController.updateArgStatus);
router.post('/:id/vote', requireAuth, validate('params', argIdParams), validate('body', args.vote), argController.voteArg);
router.post('/:id/flag', requireAuth, validate('params', argIdParams), validate('body', args.flag), argController.flagArg);
router.post('/:id/flags/:flagId/resolve', requireAuth, validate('params', argFlagParams), argController.resolveOwnFlag);
router.delete('/:id', requireAuth, validate('params', argIdParams), argController.deleteArg);
router.post('/:id/cover-image', requireAuth, validate('params', argIdParams), uploadMemory.single('image'), argController.uploadCoverImage);
router.get('/:id/cover-image', validate('params', argIdParams), argController.getCoverImage);

module.exports = router;
