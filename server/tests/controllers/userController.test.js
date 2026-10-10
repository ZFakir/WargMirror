const { 
  getUserProfile, 
  getUserLibrary, 
  getFriends, 
  searchUsers, 
  sendFriendRequest, 
  getFriendRequests, 
  respondToFriendRequest, 
  removeFriend 
} = require('../../src/controllers/userController');
const { User, Arg, FriendRequest, GameSession, Badge } = require('../../src/models');
const { Op } = require('sequelize');

jest.mock('../../src/models', () => ({
  User: { findByPk: jest.fn(), findAll: jest.fn() },
  Arg: { findAll: jest.fn() },
  FriendRequest: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn(), destroy: jest.fn() },
  GameSession: { count: jest.fn() },
  Badge: {}
}));

describe('userController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, user: { user_id: 1 }, body: {}, query: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      req.params.id = 1;
      const mockUser = { user_id: 1, username: 'testuser', toJSON: () => ({ user_id: 1, username: 'testuser' }) };
      User.findByPk.mockResolvedValue(mockUser);
      GameSession.count.mockResolvedValue(5);
      
      await getUserProfile(req, res);
      
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ user_id: 1, username: 'testuser', games_completed: 5 });
    });

    it('should return 404 if user not found', async () => {
      req.params.id = 1;
      User.findByPk.mockResolvedValue(null);
      await getUserProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      User.findByPk.mockRejectedValue(new Error('DB Error'));
      await getUserProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserLibrary', () => {
    it('should return user args', async () => {
      req.params.id = 1;
      Arg.findAll.mockResolvedValue([{ title: 'Arg 1' }]);
      await getUserLibrary(req, res);
      expect(Arg.findAll).toHaveBeenCalledWith({ where: { creator_id: 1 } });
      expect(res.json).toHaveBeenCalledWith([{ title: 'Arg 1' }]);
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      Arg.findAll.mockRejectedValue(new Error('DB Error'));
      await getUserLibrary(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFriends', () => {
    it('should return friends list', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockResolvedValue([
        { sender_id: 1, receiver_id: 2 },
        { sender_id: 3, receiver_id: 1 }
      ]);
      User.findAll.mockResolvedValue([{ username: 'friend1' }, { username: 'friend2' }]);

      await getFriends(req, res);
      expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: [2, 3] } }));
      expect(res.json).toHaveBeenCalledWith([{ username: 'friend1' }, { username: 'friend2' }]);
    });

    it('should return empty array if no friends', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockResolvedValue([]);
      await getFriends(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
      expect(User.findAll).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockRejectedValue(new Error('DB Error'));
      await getFriends(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      req.query.q = 'test';
      User.findAll.mockResolvedValue([{ username: 'testuser' }]);
      await searchUsers(req, res);
      expect(User.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ username: 'testuser' }]);
    });

    it('should return empty array if no query', async () => {
      req.query.q = '';
      await searchUsers(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors', async () => {
      req.query.q = 'test';
      User.findAll.mockRejectedValue(new Error('DB'));
      await searchUsers(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('sendFriendRequest', () => {
    it('should return 403 if spoofing sender_id', async () => {
      req.params.id = 999;
      await sendFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if sending to self', async () => {
      req.params.id = 1;
      req.body.receiverId = 1;
      await sendFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if request already exists', async () => {
      req.params.id = 1;
      req.body.receiverId = 2;
      FriendRequest.findOne.mockResolvedValue({ id: 1 });
      await sendFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create request', async () => {
      req.params.id = 1;
      req.body.receiverId = 2;
      FriendRequest.findOne.mockResolvedValue(null);
      FriendRequest.create.mockResolvedValue({ id: 1 });
      await sendFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      req.body.receiverId = 2;
      FriendRequest.findOne.mockRejectedValue(new Error('DB'));
      await sendFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFriendRequests', () => {
    it('should return 403 if spoofing user', async () => {
      req.params.id = 999;
      await getFriendRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return empty array if no requests', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockResolvedValue([]);
      await getFriendRequests(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return formatted requests', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockResolvedValue([{ sender_id: 2, receiver_id: 1, status: 'pending' }]);
      User.findAll.mockResolvedValue([{ user_id: 2, username: 'test' }]);
      
      await getFriendRequests(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ sender_id: 2, sender: expect.objectContaining({ username: 'test' }) })
      ]));
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      FriendRequest.findAll.mockRejectedValue(new Error('DB'));
      await getFriendRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('respondToFriendRequest', () => {
    it('should return 400 if invalid status', async () => {
      req.body.status = 'invalid';
      await respondToFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if not found', async () => {
      req.params.requestId = 1;
      req.body.status = 'accepted';
      FriendRequest.findByPk.mockResolvedValue(null);
      await respondToFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if user is not receiver', async () => {
      req.params.requestId = 1;
      req.body.status = 'accepted';
      FriendRequest.findByPk.mockResolvedValue({ receiver_id: 999 });
      await respondToFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should update status and save', async () => {
      req.params.requestId = 1;
      req.body.status = 'accepted';
      const mockReq = { receiver_id: 1, save: jest.fn() };
      FriendRequest.findByPk.mockResolvedValue(mockReq);
      
      await respondToFriendRequest(req, res);
      expect(mockReq.status).toBe('accepted');
      expect(mockReq.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params.requestId = 1;
      req.body.status = 'accepted';
      FriendRequest.findByPk.mockRejectedValue(new Error('DB'));
      await respondToFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('removeFriend', () => {
    it('should return 403 if spoofing user', async () => {
      req.params.id = 999;
      await removeFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if connection not found', async () => {
      req.params.id = 1;
      req.params.friendId = 2;
      FriendRequest.destroy.mockResolvedValue(0);
      await removeFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete friend connection', async () => {
      req.params.id = 1;
      req.params.friendId = 2;
      FriendRequest.destroy.mockResolvedValue(1);
      await removeFriend(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      req.params.friendId = 2;
      FriendRequest.destroy.mockRejectedValue(new Error('DB'));
      await removeFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
