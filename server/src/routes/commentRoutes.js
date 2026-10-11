const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { validate } = require('../middleware/validate');
const { comments } = require('../validators/requestSchemas');

router.get('/arg/:argId', validate('params', comments.argParams), commentController.getCommentsForArg);
router.post('/arg/:argId', validate('params', comments.argParams), validate('body', comments.create), commentController.postComment);

module.exports = router;
