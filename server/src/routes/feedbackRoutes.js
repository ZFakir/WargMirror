const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Allow both guests and logged-in users to submit feedback
router.post('/', feedbackController.submitFeedback);

module.exports = router;
