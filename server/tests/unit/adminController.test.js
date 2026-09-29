const { getFlags, resolveFlag, searchUsers, toggleBanUser, deleteGame, deleteComment } = require('../../src/controllers/adminController');
const { User, Flag, Arg, Comment } = require('../../src/models');
const { Op } = require('sequelize');

jest.mock('../../src/models', () => ({
  User: { findAll: jest.fn(), findByPk: jest.fn() },
  Flag: { findAll: jest.fn(), findByPk: jest.fn() },
  Arg: { findByPk: jest.fn(), destroy: jest.fn() },
  Comment: { findByPk: jest.fn(), destroy: jest.fn() }
}));

describe('adminController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      user: { user_id: 1 }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getFlags', () => {
    it('should fetch and return all open/reviewing flags', async () => {
      Flag.findAll.mockResolvedValue([{ id: 1, status: 'open' }]);
      await getFlags(req, res);
      expect(Flag.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1, status: 'open' }]);
    });
  });

  describe('resolveFlag', () => {
    it('should return 404 if flag not found', async () => {
      req.params.id = 99;
      Flag.findByPk.mockResolvedValue(null);
      await resolveFlag(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should resolve a flag', async () => {
      req.params.id = 1;
      const mockFlag = { id: 1, status: 'open', save: jest.fn() };
      Flag.findByPk.mockResolvedValue(mockFlag);
      await resolveFlag(req, res);
      expect(mockFlag.status).toBe('resolved');
      expect(mockFlag.resolved_by).toBe(1);
      expect(mockFlag.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Flag resolved successfully' }));
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      req.query.search = 'test';
      User.findAll.mockResolvedValue([{ user_id: 1, username: 'test' }]);
      await searchUsers(req, res);
      expect(User.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ user_id: 1, username: 'test' }]);
    });
  });

  describe('toggleBanUser', () => {
    it('should toggle user ban status', async () => {
      req.params.id = 2;
      const mockUser = { user_id: 2, is_flagged: false, save: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);
      await toggleBanUser(req, res);
      expect(mockUser.is_flagged).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deleteGame', () => {
    it('should delete a game (Arg)', async () => {
      req.params.id = 5;
      const mockArg = { destroy: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockArg);
      await deleteGame(req, res);
      expect(mockArg.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Game deleted successfully' });
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      req.params.id = 10;
      const mockComment = { destroy: jest.fn() };
      Comment.findByPk.mockResolvedValue(mockComment);
      await deleteComment(req, res);
      expect(mockComment.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Comment deleted successfully' });
    });
  });
});
