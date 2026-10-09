const { submitMinigame, arriveAtWaypoint } = require('../../src/controllers/gameController');
const { sequelize, Minigame, MinigameAttempt, WaypointProgress, WaypointEdge, Waypoint, LocationEvent, GameSession } = require('../../src/models');

jest.mock('../../src/models', () => {
  return {
    sequelize: {
      transaction: jest.fn(),
      query: jest.fn(),
      fn: jest.fn(),
      QueryTypes: { SELECT: 'SELECT' }
    },
    Minigame: { findByPk: jest.fn() },
    MinigameAttempt: { upsert: jest.fn(), findOne: jest.fn() },
    WaypointProgress: { upsert: jest.fn(), findAll: jest.fn(), findOne: jest.fn() },
    WaypointEdge: { findAll: jest.fn() },
    Waypoint: { findAll: jest.fn(), findByPk: jest.fn() },
    LocationEvent: { create: jest.fn(), findOne: jest.fn() },
    GameSession: { findOne: jest.fn(), update: jest.fn() }
  };
});

// Mock evaluateConditions which is internal to gameController
jest.mock('../../src/controllers/gameController', () => {
  const original = jest.requireActual('../../src/controllers/gameController');
  return {
    ...original,
    evaluateConditions: jest.fn().mockResolvedValue(true)
  };
});

describe('gameController - submitMinigame', () => {
  let req, res, mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockResolvedValue(mockTransaction);

    req = {
      user: { user_id: 1 },
      params: { argId: 10, waypointId: 20 },
      body: { game_id: 100, submission: 'TEST_CODE_123' }
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Default happy-path mocks for the security gates: an active session
    // and an unlocked waypoint.
    GameSession.findOne.mockResolvedValue({ session_id: 1, status: 'active' });
    WaypointProgress.findOne.mockResolvedValue({ waypoint_id: 20, status: 'unlocked' });
    LocationEvent.findOne.mockResolvedValue({ event_id: 55 });
    sequelize.query.mockResolvedValue([{ distance: 12.5 }]);

    WaypointEdge.findAll.mockResolvedValue([]);
    WaypointProgress.findAll.mockResolvedValue([]);
    Waypoint.findAll.mockResolvedValue([]);
  });

  const mockGame = (overrides = {}) => ({
    game_type: 'qr_barcode',
    waypoint_id: 20,
    config_json: { barcode_value: 'TEST_CODE_123' },
    Waypoint: { arg_id: 10, validation_radius_m: 50 },
    ...overrides
  });

  it('should evaluate qr_barcode minigame correctly (pass)', async () => {
    Minigame.findByPk.mockResolvedValue(mockGame());

    await submitMinigame(req, res);

    expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'pass', score: 1 }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
  });

  it('should evaluate qr_barcode minigame correctly (fail)', async () => {
    req.body.submission = 'WRONG_CODE';
    Minigame.findByPk.mockResolvedValue(mockGame({
      config_json: { barcode_value: 'TEST_CODE_123', allow_multiple_attempts: false }
    }));

    await submitMinigame(req, res);

    expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'fail', score: 0 }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'fail' }));
  });

  it('rejects submissions without an active session for this WARG (403)', async () => {
    GameSession.findOne.mockResolvedValue(null);
    Minigame.findByPk.mockResolvedValue(mockGame());

    await submitMinigame(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No active session for this WARG. Start the game before submitting.' });
    expect(MinigameAttempt.upsert).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it('rejects submissions for a waypoint that has not been unlocked (403)', async () => {
    WaypointProgress.findOne.mockResolvedValue({ status: 'locked' });
    Minigame.findByPk.mockResolvedValue(mockGame());

    await submitMinigame(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Waypoint is locked. Complete the previous waypoints first.' });
    expect(MinigameAttempt.upsert).not.toHaveBeenCalled();
  });

  describe('gps_proximity re-verification', () => {
    it('passes when the last trusted location is inside the geofence', async () => {
      Minigame.findByPk.mockResolvedValue(mockGame({ game_type: 'gps_proximity', config_json: {} }));

      await submitMinigame(req, res);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance_Sphere(w.location, le.location)'),
        expect.objectContaining({
          replacements: { waypoint_id: 20, event_id: 55 },
          type: 'SELECT'
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
    });

    it('fails when the last trusted location is outside the geofence', async () => {
      sequelize.query.mockResolvedValue([{ distance: 500 }]);
      Minigame.findByPk.mockResolvedValue(mockGame({ game_type: 'gps_proximity', config_json: {} }));

      await submitMinigame(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'fail' }));
    });

    it('only trusts non-suspicious location events for the baseline', async () => {
      Minigame.findByPk.mockResolvedValue(mockGame({ game_type: 'gps_proximity', config_json: {} }));

      await submitMinigame(req, res);

      expect(LocationEvent.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ user_id: 1, is_suspicious: false }) })
      );
    });

    it('lets the TEMP dev override bypass the distance check', async () => {
      req.body.geofence_override = true;
      LocationEvent.findOne.mockResolvedValue(null);
      Minigame.findByPk.mockResolvedValue(mockGame({ game_type: 'gps_proximity', config_json: {} }));

      await submitMinigame(req, res);

      expect(sequelize.query).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
    });
  });

  describe('MCQ text answers', () => {
    const mcqGame = () => mockGame({
      game_type: 'text_answer',
      config_json: { is_mcq: true, options: ['Paris', 'London', 'Tokyo'], correct_index: 0 }
    });

    it('accepts the correct option text regardless of case and padding', async () => {
      req.body.submission = '  PARIS ';
      Minigame.findByPk.mockResolvedValue(mcqGame());

      await submitMinigame(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
    });

    it('accepts the correct option index', async () => {
      req.body.submission = '0';
      Minigame.findByPk.mockResolvedValue(mcqGame());

      await submitMinigame(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
    });

    it('rejects a wrong option text', async () => {
      req.body.submission = 'London';
      Minigame.findByPk.mockResolvedValue(mcqGame());

      await submitMinigame(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'fail' }));
    });
  });

  it('completes the session when no waypoints remain', async () => {
    WaypointProgress.findAll.mockResolvedValue([{ waypoint_id: 20, status: 'completed' }]);
    Waypoint.findAll.mockResolvedValue([{ waypoint_id: 20 }]);
    Minigame.findByPk.mockResolvedValue(mockGame());

    await submitMinigame(req, res);

    expect(GameSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
      expect.objectContaining({ where: { user_id: 1, arg_id: 10 } })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ session_completed: true }));
  });

  // Adapted during the main merge: gps_proximity now re-verifies the last
  // trusted location server-side, so the mock carries the Waypoint radius
  // via mockGame instead of the bare pre-merge shape.
  it('should evaluate gps_proximity minigame correctly (pass for Geofence/GPS)', async () => {
    req.body.submission = {};
    Minigame.findByPk.mockResolvedValue(mockGame({
      game_type: 'gps_proximity',
      config_json: { subtype: 'geofence' }
    }));

    await submitMinigame(req, res);

    expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'pass', score: 1 }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
  });
});

describe('gameController - arriveAtWaypoint', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { user_id: 1 },
      params: { waypointId: 20 },
      body: { lat: -26.192, lng: 28.03, accuracy_m: 12 }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    sequelize.fn.mockReturnValue({ fn: 'ST_GeomFromText' });
  });

  it('rejects non-numeric coordinates (SQL injection attempt)', async () => {
    req.body = { lat: '1) OR 1=1 --', lng: 28.03 };

    await arriveAtWaypoint(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(sequelize.query).not.toHaveBeenCalled();
    expect(LocationEvent.create).not.toHaveBeenCalled();
  });

  it('rejects coordinates outside valid geographic ranges', async () => {
    req.body = { lat: 95, lng: 28.03 };

    await arriveAtWaypoint(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('rejects missing coordinates', async () => {
    req.body = { lat: -26.192 };

    await arriveAtWaypoint(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing coordinates' });
  });

  it('returns 404 when the waypoint does not exist', async () => {
    Waypoint.findByPk.mockResolvedValue(null);

    await arriveAtWaypoint(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(LocationEvent.create).not.toHaveBeenCalled();
  });

  it('checks the distance with a bound WKT point', async () => {
    Waypoint.findByPk.mockResolvedValue({ waypoint_id: 20, validation_radius_m: 30 });
    LocationEvent.create.mockResolvedValue({});
    sequelize.query.mockResolvedValue([{ distance: 12.5 }]);

    await arriveAtWaypoint(req, res);

    expect(LocationEvent.create).toHaveBeenCalledWith({
      user_id: 1,
      location: { fn: 'ST_GeomFromText' },
      accuracy_m: 12
    });
    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('ST_Distance_Sphere'),
      expect.objectContaining({
        replacements: { waypoint_id: 20, point_wkt: 'POINT(-26.192 28.03)' },
        type: 'SELECT'
      })
    );
    expect(res.json).toHaveBeenCalledWith({ within_radius: true, distance: 12.5, radius: 30 });
  });

  it('reports outside the geofence when the distance exceeds the radius', async () => {
    Waypoint.findByPk.mockResolvedValue({ waypoint_id: 20, validation_radius_m: 30 });
    LocationEvent.create.mockResolvedValue({});
    sequelize.query.mockResolvedValue([{ distance: 500 }]);

    await arriveAtWaypoint(req, res);

    expect(res.json).toHaveBeenCalledWith({ within_radius: false, distance: 500, radius: 30 });
  });
});
