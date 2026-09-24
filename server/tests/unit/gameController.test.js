const { submitMinigame } = require('../../src/controllers/gameController');
const { sequelize, Minigame, MinigameAttempt, WaypointProgress, WaypointEdge, Waypoint, GameSession } = require('../../src/models');

jest.mock('../../src/models', () => {
  return {
    sequelize: {
      transaction: jest.fn()
    },
    Minigame: { findByPk: jest.fn() },
    MinigameAttempt: { upsert: jest.fn() },
    WaypointProgress: { upsert: jest.fn(), findAll: jest.fn() },
    WaypointEdge: { findAll: jest.fn() },
    Waypoint: { findAll: jest.fn() },
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
