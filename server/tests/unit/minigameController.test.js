jest.mock('../../src/models', () => {
  const transactionMock = { commit: jest.fn(), rollback: jest.fn() };
  return {
    Minigame: { 
      findByPk: jest.fn(),
      sequelize: { transaction: jest.fn().mockResolvedValue(transactionMock) }
    },
    MinigameAttempt: { upsert: jest.fn() },
    WaypointProgress: { upsert: jest.fn() },
    WaypointEdge: { findAll: jest.fn().mockResolvedValue([]) },
    evaluateConditions: jest.fn().mockResolvedValue(true)
  };
});

const { uploadReference, getReferenceImage, submitAttempt } = require('../../src/controllers/minigameController');
const { Minigame } = require('../../src/models');

global.fetch = jest.fn();

describe('minigameController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { gameId: 1 },
      file: { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' },
      user: { user_id: 2 },
      body: { game_id: 1, submission: 'test' }
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
        Waypoint: { Arg: { author_id: 2 } }
      };
      Minigame.findByPk.mockResolvedValue(mockGame);

      await uploadReference(req, res);

      expect(mockGame.config_json.reference_image_base64).toBeDefined();
      expect(mockGame.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reference uploaded successfully' }));
    });
  });

  describe('getReferenceImage', () => {
    it('should return the reference image buffer', async () => {
      Minigame.findByPk.mockResolvedValue({
        config_json: { reference_image_base64: 'dGVzdA==', reference_image_mimetype: 'image/jpeg' }
      });

      await getReferenceImage(req, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('submitAttempt', () => {
    it('should submit an attempt to the AI service', async () => {
      Minigame.findByPk.mockResolvedValue({
        game_type: 'shape_match',
        config_json: { reference_image_base64: 'dGVzdA==' }
      });
      
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: true, confidence_score: 0.99 })
      });

      await submitAttempt(req, res);

      expect(fetch).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ passed: true }));
    });
  });
});
