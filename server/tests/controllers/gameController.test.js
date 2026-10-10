const { 
  evaluateConditions,
  startGameSession,
  getGameState,
  arriveAtWaypoint,
  submitMinigame,
  abandonSession,
  dominationPing,
  getDominationScores
} = require('../../src/controllers/gameController');

const { 
  sequelize, 
  Waypoint, 
  WaypointEdge, 
  Minigame, 
  GameSession, 
  WaypointProgress, 
  MinigameAttempt, 
  LocationEvent, 
  User 
} = require('../../src/models');

jest.mock('../../src/models', () => {
  const mSequelize = {
    transaction: jest.fn(),
    query: jest.fn(),
    fn: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' }
  };
  return {
    sequelize: mSequelize,
    Waypoint: { findAll: jest.fn(), findByPk: jest.fn() },
    WaypointEdge: { findAll: jest.fn() },
    Minigame: { findByPk: jest.fn() },
    GameSession: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
    WaypointProgress: { findAll: jest.fn(), create: jest.fn(), upsert: jest.fn(), findOne: jest.fn() },
    MinigameAttempt: { findOne: jest.fn(), findAll: jest.fn(), upsert: jest.fn(), create: jest.fn() },
    LocationEvent: { create: jest.fn(), findOne: jest.fn() },
    User: {}
  };
});

describe('gameController', () => {
  let req, res, transaction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { 
      user: { user_id: 1 }, 
      body: {}, 
      params: {},
      query: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    sequelize.transaction.mockResolvedValue(transaction);
  });

  describe('evaluateConditions', () => {
    it('should return true if no conditions are provided', async () => {
      const result = await evaluateConditions(1, null);
      expect(result).toBe(true);
    });

    it('should return true if conditions array is empty', async () => {
      const result = await evaluateConditions(1, []);
      expect(result).toBe(true);
    });

    it('should parse stringified conditions', async () => {
      MinigameAttempt.findOne.mockResolvedValue({ outcome: 'pass' });
      const result = await evaluateConditions(1, '[{"game_id": 1, "outcome": "pass"}]');
      expect(result).toBe(true);
    });

    it('should return false if attempt is not found', async () => {
      MinigameAttempt.findOne.mockResolvedValue(null);
      const result = await evaluateConditions(1, [{ game_id: 1, outcome: 'pass' }]);
      expect(result).toBe(false);
    });

    it('should return false if attempt outcome does not match', async () => {
      MinigameAttempt.findOne.mockResolvedValue({ outcome: 'fail' });
      const result = await evaluateConditions(1, [{ game_id: 1, outcome: 'pass' }]);
      expect(result).toBe(false);
    });

    it('should handle multiple grouped conditions (OR logic within same game_id)', async () => {
      MinigameAttempt.findOne.mockResolvedValue({ outcome: 'silver' });
      const result = await evaluateConditions(1, [
        { game_id: 1, outcome: 'gold' },
        { game_id: 1, outcome: 'silver' }
      ]);
      expect(result).toBe(true);
    });
  });

  describe('startGameSession', () => {
    it('should create new session and initialize roots when none exists', async () => {
      req.params.argId = 10;
      GameSession.findOne.mockResolvedValue(null);
      GameSession.create.mockResolvedValue({ session_id: 1, status: 'active' });
      
      WaypointEdge.findAll.mockResolvedValue([
        { to_waypoint_id: 2 } // node 2 is a child
      ]);
      
      Waypoint.findAll.mockResolvedValue([
        { waypoint_id: 1 }, // root
        { waypoint_id: 2 }  // not root
      ]);
      
      WaypointProgress.create.mockResolvedValue({});

      await startGameSession(req, res);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(GameSession.create).toHaveBeenCalledWith(
        { user_id: 1, arg_id: 10, status: 'active' },
        { transaction }
      );
      expect(WaypointProgress.create).toHaveBeenCalledTimes(2);
      expect(WaypointProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({ waypoint_id: 1, status: 'unlocked' }),
        expect.any(Object)
      );
      expect(WaypointProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({ waypoint_id: 2, status: 'locked' }),
        expect.any(Object)
      );
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should reactivate abandoned session', async () => {
      req.params.argId = 10;
      const mockSession = { status: 'abandoned', update: jest.fn() };
      GameSession.findOne.mockResolvedValue(mockSession);

      await startGameSession(req, res);

      expect(mockSession.update).toHaveBeenCalledWith({ status: 'active' }, { transaction });
      expect(transaction.commit).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      req.params.argId = 10;
      GameSession.findOne.mockRejectedValue(new Error('DB error'));

      await startGameSession(req, res);

      expect(transaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('abandonSession', () => {
    it('should set status to abandoned', async () => {
      req.params.argId = 10;
      GameSession.update.mockResolvedValue([1]);

      await abandonSession(req, res);

      expect(GameSession.update).toHaveBeenCalledWith(
        { status: 'abandoned' },
        { where: { user_id: 1, arg_id: 10 } }
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle errors', async () => {
      GameSession.update.mockRejectedValue(new Error('DB Error'));
      await abandonSession(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getGameState', () => {
    it('should return 404 if session not found', async () => {
      req.params.argId = 10;
      GameSession.findOne.mockResolvedValue(null);
      await getGameState(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return game state for an active session without dynamic unlocking if already unlocked', async () => {
      req.params.argId = 10;
      const mockSession = { status: 'active', save: jest.fn() };
      GameSession.findOne.mockResolvedValue(mockSession);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 1, Minigame: {} }]);
      WaypointProgress.findAll.mockResolvedValue([{ waypoint_id: 1, status: 'unlocked' }]);
      MinigameAttempt.findAll.mockResolvedValue([]);
      WaypointEdge.findAll.mockResolvedValue([]);

      await getGameState(req, res);

      expect(res.json).toHaveBeenCalledWith({
        session: mockSession,
        waypoints: expect.any(Array),
        progress: expect.any(Array),
        attempts: expect.any(Array),
        edges: expect.any(Array)
      });
    });

    it('should dynamically unlock root nodes if no nodes are unlocked and game is active', async () => {
      req.params.argId = 10;
      const mockSession = { status: 'active', save: jest.fn() };
      GameSession.findOne.mockResolvedValue(mockSession);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 1 }]);
      WaypointProgress.findAll.mockResolvedValue([]);
      WaypointProgress.create.mockResolvedValue({ waypoint_id: 1, status: 'unlocked' });
      MinigameAttempt.findAll.mockResolvedValue([]);
      WaypointEdge.findAll.mockResolvedValue([]);

      await getGameState(req, res);

      expect(WaypointProgress.create).toHaveBeenCalled();
    });

    it('should handle errors in getGameState', async () => {
      GameSession.findOne.mockRejectedValue(new Error('DB'));
      await getGameState(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('arriveAtWaypoint', () => {
    it('should return 400 if coordinates are missing', async () => {
      await arriveAtWaypoint(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    it('should return 400 if coordinates are invalid', async () => {
      req.body = { lat: 100, lng: 200 };
      await arriveAtWaypoint(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if waypoint not found', async () => {
      req.body = { lat: 10, lng: 10 };
      req.params.waypointId = 1;
      Waypoint.findByPk.mockResolvedValue(null);
      await arriveAtWaypoint(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should log location event and check distance', async () => {
      req.body = { lat: 10, lng: 10, accuracy_m: 5 };
      req.params.waypointId = 1;
      Waypoint.findByPk.mockResolvedValue({ validation_radius_m: 50 });
      LocationEvent.create.mockResolvedValue({});
      sequelize.query.mockResolvedValue([{ distance: 10 }]);

      await arriveAtWaypoint(req, res);
      
      expect(LocationEvent.create).toHaveBeenCalled();
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ within_radius: true, distance: 10, radius: 50 });
    });
    
    it('should handle errors in arriveAtWaypoint', async () => {
      req.body = { lat: 10, lng: 10 };
      Waypoint.findByPk.mockRejectedValue(new Error('DB'));
      await arriveAtWaypoint(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('submitMinigame', () => {
    beforeEach(() => {
      req.body = { game_id: 1, submission: 'test' };
    });

    it('should return 404 if minigame not found', async () => {
      Minigame.findByPk.mockResolvedValue(null);
      await submitMinigame(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if no active session', async () => {
      Minigame.findByPk.mockResolvedValue({ Waypoint: { arg_id: 10 } });
      GameSession.findOne.mockResolvedValue(null);
      await submitMinigame(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 if waypoint is locked', async () => {
      Minigame.findByPk.mockResolvedValue({ Waypoint: { arg_id: 10 }, waypoint_id: 2 });
      GameSession.findOne.mockResolvedValue({ status: 'active' });
      WaypointProgress.findOne.mockResolvedValue({ status: 'locked' });
      await submitMinigame(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should process text_answer correct answer and unlock successors', async () => {
      const mockMinigame = { 
        game_type: 'text_answer', 
        config_json: { answer: 'test' },
        Waypoint: { arg_id: 10 },
        waypoint_id: 2
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      GameSession.findOne.mockResolvedValue({ status: 'active' });
      WaypointProgress.findOne.mockResolvedValue({ status: 'unlocked' });
      MinigameAttempt.upsert.mockResolvedValue();
      WaypointProgress.upsert.mockResolvedValue();
      WaypointEdge.findAll.mockResolvedValue([
        { to_waypoint_id: 3, conditions_json: null }
      ]);
      WaypointProgress.findAll.mockResolvedValue([
        { waypoint_id: 3, status: 'unlocked' }
      ]);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 2 }, { waypoint_id: 3 }]);

      await submitMinigame(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass', unlockedNodes: [3] }));
    });
    
    it('should process gps_proximity correctly with geofence override', async () => {
      req.body.geofence_override = true;
      const mockMinigame = { 
        game_type: 'gps_proximity', 
        Waypoint: { arg_id: 10 },
        waypoint_id: 2
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      GameSession.findOne.mockResolvedValue({ status: 'active' });
      WaypointProgress.findOne.mockResolvedValue({ status: 'unlocked' });
      WaypointEdge.findAll.mockResolvedValue([]);
      WaypointProgress.findAll.mockResolvedValue([]);
      Waypoint.findAll.mockResolvedValue([]);
      
      await submitMinigame(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
    });

    it('should handle errors in submitMinigame', async () => {
      Minigame.findByPk.mockRejectedValue(new Error('DB'));
      await submitMinigame(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('dominationPing', () => {
    beforeEach(() => {
      req.params.waypointId = 1;
      req.body = { lat: 10, lng: 10, game_id: 1 };
    });

    it('should return 400 if params are missing', async () => {
      req.body = {};
      await dominationPing(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if minigame not point domination', async () => {
      Waypoint.findByPk.mockResolvedValue({});
      Minigame.findByPk.mockResolvedValue({ game_type: 'text_answer' });
      await dominationPing(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should process domination ping correctly', async () => {
      Waypoint.findByPk.mockResolvedValue({ validation_radius_m: 50 });
      Minigame.findByPk.mockResolvedValue({ game_type: 'point_domination', config_json: {} });
      sequelize.query.mockResolvedValue([{ distance: 10 }]);
      MinigameAttempt.findOne.mockResolvedValue({ submission_json: { cumulative_time_hours: 1 }, save: jest.fn() });
      MinigameAttempt.findAll.mockResolvedValue([]);

      await dominationPing(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, within_radius: true }));
    });

    it('should handle errors in dominationPing', async () => {
      Waypoint.findByPk.mockRejectedValue(new Error('DB'));
      await dominationPing(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDominationScores', () => {
    it('should return 400 if game_id is missing', async () => {
      await getDominationScores(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if game not found', async () => {
      req.query.game_id = 1;
      Minigame.findByPk.mockResolvedValue(null);
      await getDominationScores(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return scores', async () => {
      req.query.game_id = 1;
      Minigame.findByPk.mockResolvedValue({ config_json: {} });
      MinigameAttempt.findAll.mockResolvedValue([
        { user_id: 1, User: { username: 'test' }, submission_json: { cumulative_time_hours: 10 }, attempted_at: new Date() }
      ]);
      await getDominationScores(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        top3: expect.any(Array),
        currentUserScore: expect.any(Object)
      }));
    });

    it('should handle errors in getDominationScores', async () => {
      req.query.game_id = 1;
      Minigame.findByPk.mockRejectedValue(new Error('DB'));
      await getDominationScores(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
