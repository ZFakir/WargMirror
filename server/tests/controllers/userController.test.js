const { getUserProfile, getUserLibrary, getFriends } = require('../../src/controllers/userController');
const { User, Arg, FriendRequest, GameSession, Badge } = require('../../src/models');
const { Op } = require('sequelize');

jest.mock('../../src/models', () => ({
  User: { findByPk: jest.fn(), findAll: jest.fn() },
  Arg: { findAll: jest.fn() },
  FriendRequest: { findAll: jest.fn() },
  GameSession: {},
  Badge: {}
}));

describe('userController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getUserProfile', () => {
    it('should return user profile if found', async () => {
      req.params.id = 1;
      User.findByPk.mockResolvedValue({ user_id: 1, username: 'testuser' });
      await getUserProfile(req, res);
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ user_id: 1, username: 'testuser' });
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
});
