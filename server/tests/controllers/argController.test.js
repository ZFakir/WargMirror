const { getAllArgs, getArgById, createArg, updateArg, voteArg, flagArg } = require('../../src/controllers/argController');
const { sequelize, Arg, User, Waypoint, WaypointEdge, Minigame, ArgVote, Flag } = require('../../src/models');

jest.mock('../../src/models', () => {
  return {
    sequelize: {
      transaction: jest.fn(),
      fn: jest.fn()
    },
    Arg: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn() },
    User: {},
    Waypoint: { create: jest.fn(), findAll: jest.fn(), destroy: jest.fn(), update: jest.fn() },
    WaypointEdge: { create: jest.fn(), destroy: jest.fn() },
    Minigame: { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
    ArgVote: { findOne: jest.fn(), create: jest.fn(), count: jest.fn() },
    Flag: { create: jest.fn() }
  };
});

describe('argController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, body: {}, user: { user_id: 1 } };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getAllArgs', () => {
    it('should return published args', async () => {
      Arg.findAll.mockResolvedValue([{ title: 'Test Arg' }]);
      await getAllArgs(req, res);
      expect(Arg.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'published' } }));
      expect(res.json).toHaveBeenCalledWith([{ title: 'Test Arg' }]);
    });

    it('should handle errors', async () => {
      Arg.findAll.mockRejectedValue(new Error('DB Error'));
      await getAllArgs(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch ARGs' });
    });
  });

  describe('getArgById', () => {
    it('should return arg if found', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue({ title: 'Test Arg' });
      await getArgById(req, res);
      expect(Arg.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ title: 'Test Arg' });
    });

    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue(null);
      await getArgById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors', async () => {
      Arg.findByPk.mockRejectedValue(new Error('DB Error'));
      await getArgById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createArg', () => {
    it('should create an arg successfully', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      Arg.create.mockResolvedValue({ arg_id: 1, title: 'New Arg' });
      
      req.body = { title: 'New Arg', waypoints: [], edges: [] };
      await createArg(req, res);
      
      expect(sequelize.transaction).toHaveBeenCalled();
      expect(Arg.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ arg_id: 1, title: 'New Arg' });
    });

    it('should rollback on error', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      Arg.create.mockRejectedValue(new Error('DB Error'));
      
      await createArg(req, res);
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateArg', () => {
    it('should update an arg successfully', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      const mockArg = { arg_id: 1, creator_id: 1, update: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockArg);
      Waypoint.findAll.mockResolvedValue([]);
      
      req.params.id = 1;
      req.body = { title: 'Updated Arg' };
      await updateArg(req, res);
      
      expect(mockArg.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockArg);
    });

    it('should return 404 if arg not found', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      Arg.findByPk.mockResolvedValue(null);
      
      req.params.id = 1;
      await updateArg(req, res);
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      Arg.findByPk.mockResolvedValue({ creator_id: 999 }); // different from req.user.user_id
      
      req.params.id = 1;
      await updateArg(req, res);
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('voteArg', () => {
    it('should add a new vote', async () => {
      req.params.id = 1;
      req.body = { vote: 'like', user_id: 1 };
      ArgVote.findOne.mockResolvedValue(null);
      ArgVote.count.mockResolvedValue(1);
      
      await voteArg(req, res);
      
      expect(ArgVote.create).toHaveBeenCalledWith({ arg_id: 1, user_id: 1, vote: 'like' });
      expect(Arg.update).toHaveBeenCalledWith({ like_count: 1, dislike_count: 1 }, { where: { arg_id: 1 } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, action: 'voted' }));
    });

    it('should return 400 if missing body params', async () => {
      req.body = {};
      await voteArg(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('flagArg', () => {
    it('should create a flag', async () => {
      req.params.id = 1;
      req.body = { reporter_id: 1, reason: 'spam' };
      Flag.create.mockResolvedValue({ flag_id: 1 });
      
      await flagArg(req, res);
      expect(Flag.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if missing params', async () => {
      req.body = {};
      await flagArg(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
