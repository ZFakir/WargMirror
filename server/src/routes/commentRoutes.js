const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

router.get('/arg/:argId', commentController.getCommentsForArg);
router.post('/arg/:argId', commentController.postComment);

module.exports = router;
