const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// All routes in this file will be protected by requireAuth and requireAdmin in app.js
// but we could also add requireAdmin here just to be safe. We'll add it in app.js.

router.get('/flags', adminController.getFlags);
router.put('/flags/:id/resolve', adminController.resolveFlag);

router.get('/users', adminController.searchUsers);
router.put('/users/:id/ban', adminController.toggleBanUser);

router.delete('/games/:id', adminController.deleteGame);
router.delete('/comments/:id', adminController.deleteComment);

module.exports = router;
