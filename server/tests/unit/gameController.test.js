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
    MinigameAttempt: { upsert: jest.fn() },
    WaypointProgress: { upsert: jest.fn(), findAll: jest.fn() },
    WaypointEdge: { findAll: jest.fn() },
    Waypoint: { findAll: jest.fn(), findByPk: jest.fn() },
    LocationEvent: { create: jest.fn() },
    GameSession: { update: jest.fn() }
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

    WaypointEdge.findAll.mockResolvedValue([]);
    WaypointProgress.findAll.mockResolvedValue([]);
    Waypoint.findAll.mockResolvedValue([]);
  });

  it('should evaluate qr_barcode minigame correctly (pass)', async () => {
    Minigame.findByPk.mockResolvedValue({
      game_type: 'qr_barcode',
      config_json: { barcode_value: 'TEST_CODE_123' }
    });

    await submitMinigame(req, res);

    expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'pass', score: 1 }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'pass' }));
  });

  it('should evaluate qr_barcode minigame correctly (fail)', async () => {
    req.body.submission = 'WRONG_CODE';
    Minigame.findByPk.mockResolvedValue({
      game_type: 'qr_barcode',
      config_json: { barcode_value: 'TEST_CODE_123', allow_multiple_attempts: false }
    });

    await submitMinigame(req, res);

    expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'fail', score: 0 }),
      expect.anything()
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'fail' }));
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
