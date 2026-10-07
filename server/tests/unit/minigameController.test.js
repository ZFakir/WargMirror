const { uploadReference, getReferenceImage, submitAttempt } = require('../../src/controllers/minigameController');
const models = require('../../src/models');

jest.mock('../../src/models', () => {
  const transactionMock = { commit: jest.fn(), rollback: jest.fn() };
  return {
    Minigame: {
      findByPk: jest.fn(),
      sequelize: { transaction: jest.fn().mockResolvedValue(transactionMock) }
    },
    MinigameAttempt: { upsert: jest.fn() },
    WaypointProgress: { upsert: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
    WaypointEdge: { findAll: jest.fn().mockResolvedValue([]) },
    Waypoint: { findAll: jest.fn().mockResolvedValue([]) },
    Arg: {},
    GameSession: { update: jest.fn() }
  };
});

jest.mock('../../src/controllers/gameController', () => ({
  evaluateConditions: jest.fn().mockResolvedValue(true)
}));

global.fetch = jest.fn();

describe('minigameController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { gameId: 1 },
      user: { user_id: 1 },
      file: { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' }
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      set: jest.fn(),
      send: jest.fn()
    };
  });

  describe('uploadReference', () => {
    it('should upload a reference image and update config', async () => {
      const mockGame = { 
        config_json: {}, 
        changed: jest.fn(), 
        save: jest.fn(),
        Waypoint: { Arg: { author_id: 1 } }
      };
      models.Minigame.findByPk.mockResolvedValue(mockGame);

      await uploadReference(req, res);

      expect(mockGame.config_json.reference_image_base64).toBeDefined();
      expect(mockGame.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reference uploaded successfully' }));
    });
    
    it('should block unauthorized users', async () => {
      const mockGame = { 
        Waypoint: { Arg: { author_id: 99 } }
      };
      models.Minigame.findByPk.mockResolvedValue(mockGame);

      await uploadReference(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getReferenceImage', () => {
    it('should return the reference image buffer', async () => {
      models.Minigame.findByPk.mockResolvedValue({
        config_json: { reference_image_base64: 'dGVzdA==', reference_image_mimetype: 'image/jpeg' }
      });

      await getReferenceImage(req, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('submitAttempt', () => {
    it('should submit an attempt to the AI service and record progress', async () => {
      models.Minigame.findByPk.mockResolvedValue({
        game_type: 'shape_match',
        config_json: { reference_image_base64: 'dGVzdA==' },
        waypoint_id: 1,
        Waypoint: { arg_id: 1 }
      });
      
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: true, confidence_score: 95 })
      });

      await submitAttempt(req, res);

      expect(fetch).toHaveBeenCalled();
      expect(models.MinigameAttempt.upsert).toHaveBeenCalled();
      expect(models.WaypointProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }), 
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ passed: true, confidence_score: 95 }));
    });
  });
});
