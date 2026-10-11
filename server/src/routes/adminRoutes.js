const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { admin } = require('../validators/requestSchemas');

// All routes in this file will be protected by requireAuth and requireAdmin in app.js
// but we could also add requireAdmin here just to be safe. We'll add it in app.js.

router.get('/metrics', adminController.getMetrics);

router.get('/flags', adminController.getFlags);
router.put('/flags/:id/resolve', validate('params', admin.id), adminController.resolveFlag);

router.get('/users', validate('query', admin.search), adminController.searchUsers);
router.put('/users/:id/ban', validate('params', admin.id), adminController.toggleBanUser);

router.delete('/games/:id', validate('params', admin.id), adminController.deleteGame);
router.delete('/comments/:id', validate('params', admin.id), adminController.deleteComment);

module.exports = router;
