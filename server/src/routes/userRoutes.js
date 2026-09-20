const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/search/query', userController.searchUsers);
router.get('/:id', userController.getUserProfile);
router.get('/:id/library', userController.getUserLibrary);
router.get('/:id/friends', userController.getFriends);
router.get('/:id/friends/requests', userController.getFriendRequests);
router.post('/:id/friends/request', userController.sendFriendRequest);
router.put('/friends/requests/:requestId', userController.respondToFriendRequest);

module.exports = router;
