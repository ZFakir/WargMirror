const { getMetrics, getFlags, resolveFlag, searchUsers, toggleBanUser, deleteGame, deleteComment } = require('../../src/controllers/adminController');
const { User, Flag, Arg, Comment, GameSession } = require('../../src/models');
const { Op } = require('sequelize');

jest.mock('../../src/models', () => ({
  User: { count: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  Flag: { count: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  Arg: { count: jest.fn(), findByPk: jest.fn() },
  Comment: { findByPk: jest.fn() },
  GameSession: { count: jest.fn() }
}));

describe('adminController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, user: { user_id: 1 } };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getMetrics', () => {
    it('should return dashboard metrics', async () => {
      User.count.mockResolvedValue(10);
      Arg.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3); // total, published
      Flag.count.mockResolvedValue(2);
      GameSession.count.mockResolvedValueOnce(8).mockResolvedValueOnce(4); // active, completed

      await getMetrics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total_users: 10,
        total_args: 5,
        published_args: 3,
        open_flags: 2,
        active_sessions: 8,
        completed_sessions: 4
      });
    });

    it('should handle errors', async () => {
      User.count.mockRejectedValue(new Error('DB Error'));
      await getMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFlags', () => {
    it('should return flags', async () => {
      Flag.findAll.mockResolvedValue([{ id: 1 }]);
      await getFlags(req, res);
      expect(Flag.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('should handle errors', async () => {
      Flag.findAll.mockRejectedValue(new Error('DB Error'));
      await getFlags(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resolveFlag', () => {
    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Flag.findByPk.mockResolvedValue(null);
      await resolveFlag(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should resolve flag', async () => {
      req.params.id = 1;
      const mockFlag = { id: 1, save: jest.fn() };
      Flag.findByPk.mockResolvedValue(mockFlag);
      await resolveFlag(req, res);
      expect(mockFlag.status).toBe('resolved');
      expect(mockFlag.resolved_by).toBe(1);
      expect(mockFlag.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      Flag.findByPk.mockRejectedValue(new Error('DB Error'));
      await resolveFlag(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchUsers', () => {
    it('should search with query', async () => {
      req.query.search = 'test';
      User.findAll.mockResolvedValue([{ username: 'testuser' }]);
      await searchUsers(req, res);
      expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          [Op.or]: [
            { username: { [Op.like]: '%test%' } },
            { email: { [Op.like]: '%test%' } }
          ]
        }
      }));
      expect(res.json).toHaveBeenCalledWith([{ username: 'testuser' }]);
    });

    it('should return all if no query', async () => {
      req.query.search = '';
      User.findAll.mockResolvedValue([{ username: 'testuser' }]);
      await searchUsers(req, res);
      expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(res.json).toHaveBeenCalledWith([{ username: 'testuser' }]);
    });

    it('should handle errors', async () => {
      User.findAll.mockRejectedValue(new Error('DB Error'));
      await searchUsers(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('toggleBanUser', () => {
    it('should return 404 if not found', async () => {
      req.params.id = 1;
      User.findByPk.mockResolvedValue(null);
      await toggleBanUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should toggle ban status', async () => {
      req.params.id = 1;
      const mockUser = { user_id: 1, is_suspended: false, save: jest.fn() };
      User.findByPk.mockResolvedValue(mockUser);
      await toggleBanUser(req, res);
      expect(mockUser.is_suspended).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('banned') }));
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      User.findByPk.mockRejectedValue(new Error('DB Error'));
      await toggleBanUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteGame', () => {
    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue(null);
      await deleteGame(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete game', async () => {
      req.params.id = 1;
      const mockGame = { id: 1, destroy: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockGame);
      await deleteGame(req, res);
      expect(mockGame.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      Arg.findByPk.mockRejectedValue(new Error('DB Error'));
      await deleteGame(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteComment', () => {
    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Comment.findByPk.mockResolvedValue(null);
      await deleteComment(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete comment', async () => {
      req.params.id = 1;
      const mockComment = { id: 1, destroy: jest.fn() };
      Comment.findByPk.mockResolvedValue(mockComment);
      await deleteComment(req, res);
      expect(mockComment.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params.id = 1;
      Comment.findByPk.mockRejectedValue(new Error('DB Error'));
      await deleteComment(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
