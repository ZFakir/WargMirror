const { 
  getAllArgs, 
  getArgById, 
  createArg, 
  updateArg, 
  voteArg, 
  flagArg,
  updateArgStatus,
  uploadCoverImage,
  getCoverImage,
  getCreatorAnalytics,
  resolveOwnFlag,
  deleteArg
} = require('../../src/controllers/argController');

const { sequelize, Arg, User, Waypoint, WaypointEdge, Minigame, ArgVote, Flag, GameSession, MinigameAttempt } = require('../../src/models');

jest.mock('../../src/models', () => {
  return {
    sequelize: {
      transaction: jest.fn(),
      fn: jest.fn()
    },
    Arg: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), update: jest.fn(), destroy: jest.fn() },
    User: {},
    Waypoint: { create: jest.fn(), findAll: jest.fn(), destroy: jest.fn(), update: jest.fn() },
    WaypointEdge: { create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
    Minigame: { create: jest.fn(), findOne: jest.fn(), update: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), destroy: jest.fn() },
    ArgVote: { findOne: jest.fn(), create: jest.fn(), count: jest.fn(), findAll: jest.fn() },
    Flag: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
    GameSession: { findAll: jest.fn() },
    MinigameAttempt: { findAll: jest.fn() }
  };
});

describe('argController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, body: {}, user: { user_id: 1 }, query: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      set: jest.fn(),
      send: jest.fn()
    };
  });

  describe('getAllArgs', () => {
    it('should return published args', async () => {
      Arg.findAll.mockResolvedValue([{ toJSON: () => ({ title: 'Test Arg' }) }]);
      await getAllArgs(req, res);
      expect(Arg.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'published' } }));
      expect(res.json).toHaveBeenCalledWith([{ title: 'Test Arg', user_vote: null }]);
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
      Arg.findByPk.mockResolvedValue({ toJSON: () => ({ title: 'Test Arg' }) });
      await getArgById(req, res);
      expect(Arg.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ title: 'Test Arg', user_vote: null });
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
      Arg.create.mockResolvedValue({ arg_id: 1, title: 'New Arg', toJSON: () => ({ arg_id: 1, title: 'New Arg' }) });
      
      req.body = { title: 'New Arg', waypoints: [], edges: [] };
      await createArg(req, res);
      
      expect(sequelize.transaction).toHaveBeenCalled();
      expect(Arg.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ arg_id: 1, title: 'New Arg' }));
    });

    it('should create arg with waypoints (array of games) and edges', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      Arg.create.mockResolvedValue({ arg_id: 1, toJSON: () => ({ arg_id: 1 }) });
      Waypoint.create.mockResolvedValue({ waypoint_id: 10 });
      Minigame.create.mockResolvedValue({ game_id: 100 });
      
      req.body = { 
        title: 'New Arg', 
        waypoints: [
          { id: 'w1', lat: 0, lng: 0, games: [{ type: 'gps', minigame_config: {} }] },
          { id: 'w2', lat: 0, lng: 0, type: 'gps' } // legacy fallback test
        ], 
        edges: [
          { from: 'w1', to: 'w2', triggers: [{ game_index: 0, outcome: 'pass' }] }
        ] 
      };
      
      await createArg(req, res);
      
      expect(Waypoint.create).toHaveBeenCalledTimes(2);
      expect(Minigame.create).toHaveBeenCalledTimes(2);
      expect(WaypointEdge.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
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
    it('should update an arg successfully and handle missing/new waypoints', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      const mockArg = { arg_id: 1, creator_id: 1, update: jest.fn(), toJSON: () => ({ arg_id: 1, creator_id: 1 }) };
      Arg.findByPk.mockResolvedValue(mockArg);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 99 }]); // will be deleted
      Minigame.findAll.mockResolvedValue([{ game_id: 999 }]); // will be deleted
      Waypoint.create.mockResolvedValue({ waypoint_id: 10 });
      Minigame.create.mockResolvedValue({ game_id: 100 });
      
      req.params.id = 1;
      req.body = { 
        title: 'Updated Arg',
        waypoints: [
          { id: 'w1', waypoint_id: 10, lat: 0, lng: 0, games: [{ minigame_id: 100, type: 'gps' }] }, // update existing wp, new game
          { id: 'w2', lat: 0, lng: 0, games: [{ type: 'text_answer' }] } // create new wp
        ],
        edges: [
          { from: 'w1', to: 'w2' }
        ]
      };
      await updateArg(req, res);
      
      expect(mockArg.update).toHaveBeenCalled();
      expect(Waypoint.destroy).toHaveBeenCalled();
      expect(Waypoint.update).toHaveBeenCalled();
      expect(Waypoint.create).toHaveBeenCalled();
      expect(WaypointEdge.destroy).toHaveBeenCalled();
      expect(WaypointEdge.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should update existing minigames on waypoint', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      sequelize.transaction.mockResolvedValue(mockTransaction);
      const mockArg = { arg_id: 1, creator_id: 1, update: jest.fn(), toJSON: () => ({ arg_id: 1, creator_id: 1 }) };
      Arg.findByPk.mockResolvedValue(mockArg);
      Waypoint.findAll.mockResolvedValue([]);
      Minigame.findAll.mockResolvedValue([]);
      
      const mockExistingGame = { game_id: 100, update: jest.fn() };
      Minigame.findByPk.mockResolvedValue(mockExistingGame);
      
      req.params.id = 1;
      req.body = { 
        title: 'Updated Arg',
        waypoints: [
          { id: 'w1', waypoint_id: 10, lat: 0, lng: 0, games: [{ minigame_id: 100, type: 'text_answer', minigame_config: { a: 1 } }] }
        ],
        edges: []
      };
      await updateArg(req, res);
      
      expect(mockExistingGame.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
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
      Arg.findByPk.mockResolvedValue({ creator_id: 999 }); 
      
      req.params.id = 1;
      await updateArg(req, res);
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('voteArg', () => {
    it('should add a new vote as the session user', async () => {
      req.params.id = 1;
      req.body = { vote: 'like' };
      ArgVote.findOne.mockResolvedValue(null);
      ArgVote.count.mockResolvedValue(1);

      await voteArg(req, res);

      expect(ArgVote.create).toHaveBeenCalledWith({ arg_id: 1, user_id: 1, vote: 'like' });
      expect(Arg.update).toHaveBeenCalledWith({ like_count: 1, dislike_count: 1 }, { where: { arg_id: 1 } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, action: 'voted' }));
    });

    it('should ignore a spoofed body user_id and vote as the session user', async () => {
      req.user = { user_id: 7 };
      req.params.id = 1;
      req.body = { vote: 'dislike', user_id: 999 };
      ArgVote.findOne.mockResolvedValue(null);
      ArgVote.count.mockResolvedValue(1);

      await voteArg(req, res);

      expect(ArgVote.create).toHaveBeenCalledWith({ arg_id: 1, user_id: 7, vote: 'dislike' });
    });
    
    it('should toggle an existing vote', async () => {
      req.params.id = 1;
      req.body = { vote: 'like' };
      const mockVote = { vote: 'like', destroy: jest.fn(), save: jest.fn() };
      ArgVote.findOne.mockResolvedValue(mockVote);
      ArgVote.count.mockResolvedValue(0);

      await voteArg(req, res);

      expect(mockVote.destroy).toHaveBeenCalled(); // Should unvote
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, action: 'unvoted' }));
    });

    it('should change an existing vote', async () => {
      req.params.id = 1;
      req.body = { vote: 'like' };
      const mockVote = { vote: 'dislike', destroy: jest.fn(), save: jest.fn() };
      ArgVote.findOne.mockResolvedValue(mockVote);
      ArgVote.count.mockResolvedValue(0);

      await voteArg(req, res);

      expect(mockVote.vote).toBe('like');
      expect(mockVote.save).toHaveBeenCalled();
    });

    it('should return 400 if the vote is missing or invalid', async () => {
      req.params.id = 1;
      req.body = {};
      await voteArg(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req.body = { vote: 'up' };
      await voteArg(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('flagArg', () => {
    it('should create a flag attributed to the authenticated user', async () => {
      req.params.id = 1;
      req.body = { reason: 'spam' };
      Flag.create.mockResolvedValue({ flag_id: 1 });
      
      await flagArg(req, res);
      expect(Flag.create).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: 1, reason: 'spam' }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should ignore a reporter_id supplied in the request body', async () => {
      req.params.id = 1;
      req.body = { reporter_id: 999, reason: 'spam' };
      Flag.create.mockResolvedValue({ flag_id: 1 });

      await flagArg(req, res);

      expect(Flag.create).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: 1 }));
    });

    it('should return 400 if the reason is missing', async () => {
      req.body = {};
      await flagArg(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateArgStatus', () => {
    it('should update arg status', async () => {
      req.params.id = 1;
      req.body = { status: 'published' };
      const mockArg = { creator_id: 1, update: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockArg);
      
      await updateArgStatus(req, res);
      
      expect(mockArg.update).toHaveBeenCalledWith({ status: 'published' });
      expect(res.json).toHaveBeenCalledWith(mockArg);
    });

    it('should return 404 if not found', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue(null);
      await updateArgStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue({ creator_id: 999 });
      await updateArgStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('uploadCoverImage', () => {
    it('should upload cover image', async () => {
      req.params.id = 1;
      req.file = { buffer: Buffer.from('test') };
      const mockArg = { creator_id: 1, save: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockArg);
      
      await uploadCoverImage(req, res);
      
      expect(mockArg.cover_image).toBeDefined();
      expect(mockArg.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Cover image uploaded successfully' });
    });

    it('should return 400 if no file', async () => {
      req.params.id = 1;
      req.file = null;
      await uploadCoverImage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if unauthorized', async () => {
      req.params.id = 1;
      req.file = { buffer: Buffer.from('test') };
      Arg.findByPk.mockResolvedValue({ creator_id: 999 });
      await uploadCoverImage(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getCoverImage', () => {
    it('should return cover image', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue({ cover_image: Buffer.from('test') });
      
      await getCoverImage(req, res);
      
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if no image', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue({ cover_image: null });
      await getCoverImage(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCreatorAnalytics', () => {
    it('should return analytics for creator', async () => {
      GameSession.findAll.mockResolvedValue([{ arg_id: 1, status: 'active' }]);
      MinigameAttempt.findAll.mockResolvedValue([{ game_id: 1, outcome: 'pass' }]);
      Arg.findAll.mockResolvedValue([{ arg_id: 1, title: 'Test' }]);
      ArgVote.findAll.mockResolvedValue([{ arg_id: 1, vote: 'like' }]);
      Flag.findAll.mockResolvedValue([{ arg_id: 1, reason: 'spam' }]);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 1, arg_id: 1, Minigames: [{ game_id: 1 }] }]);
      
      await getCreatorAnalytics(req, res);
      
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle no args', async () => {
      Arg.findAll.mockResolvedValue([]);
      await getCreatorAnalytics(req, res);
      expect(res.json).toHaveBeenCalledWith({ args: [] });
    });
  });

  describe('resolveOwnFlag', () => {
    it('should resolve flag', async () => {
      req.params = { id: 1, flagId: 1 };
      Arg.findByPk.mockResolvedValue({ arg_id: 1, creator_id: 1 });
      const mockFlag = { arg_id: 1, save: jest.fn() };
      Flag.findByPk.mockResolvedValue(mockFlag);
      
      await resolveOwnFlag(req, res);
      
      expect(mockFlag.status).toBe('resolved');
      expect(mockFlag.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Flag resolved successfully' }));
    });

    it('should return 403 if unauthorized', async () => {
      req.params = { id: 1, flagId: 1 };
      Arg.findByPk.mockResolvedValue({ arg_id: 1, creator_id: 999 });
      await resolveOwnFlag(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteArg', () => {
    it('should delete arg', async () => {
      req.params.id = 1;
      const mockArg = { creator_id: 1, destroy: jest.fn() };
      Arg.findByPk.mockResolvedValue(mockArg);
      
      await deleteArg(req, res);
      
      expect(mockArg.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'ARG deleted successfully' });
    });

    it('should return 403 if unauthorized', async () => {
      req.params.id = 1;
      Arg.findByPk.mockResolvedValue({ creator_id: 999 });
      await deleteArg(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
