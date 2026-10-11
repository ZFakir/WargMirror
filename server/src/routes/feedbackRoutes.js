const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { validate } = require('../middleware/validate');
const { feedback } = require('../validators/requestSchemas');

// Allow both guests and logged-in users to submit feedback
router.post('/', validate('body', feedback), feedbackController.submitFeedback);

module.exports = router;
