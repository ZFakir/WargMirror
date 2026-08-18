const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:id', userController.getUserProfile);
router.get('/:id/library', userController.getUserLibrary);
router.get('/:id/friends', userController.getFriends);

module.exports = router;
