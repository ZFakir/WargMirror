const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', badgeController.getAllBadges);
router.post('/sync', requireAuth, badgeController.syncBadges);

module.exports = router;
