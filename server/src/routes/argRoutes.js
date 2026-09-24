const express = require('express');
const router = express.Router();
const multer = require('multer');
const argController = require('../controllers/argController');

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', argController.getAllArgs);
router.get('/:id', argController.getArgById);
router.post('/', argController.createArg);
router.put('/:id', argController.updateArg);
router.patch('/:id/status', argController.updateArgStatus);
router.post('/:id/vote', argController.voteArg);
router.post('/:id/flag', argController.flagArg);
router.post('/:id/cover-image', uploadMemory.single('image'), argController.uploadCoverImage);
router.get('/:id/cover-image', argController.getCoverImage);

module.exports = router;
