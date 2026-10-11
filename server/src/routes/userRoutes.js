const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validate } = require('../middleware/validate');
const { friendParams, requestIdParams, userIdParams, users } = require('../validators/requestSchemas');
const { writeLimiter } = require('../middleware/rateLimits');

router.get('/search/query', validate('query', users.search), userController.searchUsers);
router.get('/:id', validate('params', userIdParams), userController.getUserProfile);
router.get('/:id/library', validate('params', userIdParams), userController.getUserLibrary);
router.get('/:id/friends', validate('params', userIdParams), userController.getFriends);
router.delete('/:id/friends/:friendId', writeLimiter, validate('params', friendParams), userController.removeFriend);
router.get('/:id/friends/requests', validate('params', userIdParams), userController.getFriendRequests);
router.post('/:id/friends/request', writeLimiter, validate('params', userIdParams), validate('body', users.friendRequest), userController.sendFriendRequest);
router.put('/friends/requests/:requestId', writeLimiter, validate('params', requestIdParams), validate('body', users.friendResponse), userController.respondToFriendRequest);

module.exports = router;
