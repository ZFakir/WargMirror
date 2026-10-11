const { uploadReference, getReferenceImage, submitAttempt } = require('../../src/controllers/minigameController');
const { Minigame, Waypoint, Arg, MinigameAttempt, WaypointProgress, WaypointEdge, GameSession } = require('../../src/models');
const { evaluateConditions } = require('../../src/controllers/gameController');
const fs = require('fs');

jest.mock('../../src/models', () => {
  const mSequelize = {
    transaction: jest.fn()
  };
  return {
    Minigame: { findByPk: jest.fn(), sequelize: mSequelize },
    Waypoint: { findAll: jest.fn() },
    Arg: {},
    MinigameAttempt: { upsert: jest.fn() },
    WaypointProgress: { upsert: jest.fn(), findAll: jest.fn() },
    WaypointEdge: { findAll: jest.fn() },
    GameSession: { update: jest.fn() }
  };
});

jest.mock('../../src/controllers/gameController', () => ({
  evaluateConditions: jest.fn()
}));

jest.mock('fs', () => ({
  appendFileSync: jest.fn()
}));

describe('minigameController', () => {
  let req, res, transaction;
  
  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, user: { user_id: 1 }, body: {}, file: null };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      set: jest.fn(),
      send: jest.fn()
    };
    transaction = { commit: jest.fn(), rollback: jest.fn() };
    Minigame.sequelize.transaction.mockResolvedValue(transaction);

    global.fetch = jest.fn();
    global.FormData = class { append = jest.fn(); };
    global.Blob = class {};
  });

  describe('uploadReference', () => {
    it('should return 400 if no file uploaded', async () => {
      await uploadReference(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if minigame not found', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg' };
      req.params.gameId = 1;
      Minigame.findByPk.mockResolvedValue(null);
      await uploadReference(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if unauthorized', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg' };
      req.params.gameId = 1;
      Minigame.findByPk.mockResolvedValue({
        Waypoint: { Arg: { creator_id: 999 } }
      });
      await uploadReference(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should upload reference successfully', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg' };
      req.params.gameId = 1;
      const mockMinigame = {
        Waypoint: { Arg: { creator_id: 1 } },
        config_json: {},
        changed: jest.fn(),
        save: jest.fn()
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      
      await uploadReference(req, res);
      
      expect(mockMinigame.config_json.reference_image_base64).toBe(Buffer.from('test').toString('base64'));
      expect(mockMinigame.config_json.reference_image_mimetype).toBe('image/jpeg');
      expect(mockMinigame.save).toHaveBeenCalled();

      // The URL carries a cache-busting timestamp that must change on every upload.
      expect(res.json).toHaveBeenCalledTimes(1);
      const payload = res.json.mock.calls[0][0];
      expect(payload.message).toBe('Reference uploaded successfully');
      expect(payload.url).toMatch(/^\/api\/minigames\/1\/reference\/image\?ts=\d+$/);
      expect(payload.url).toBe(mockMinigame.config_json.reference_image_url);
    });

    it('should handle errors', async () => {
      req.file = { buffer: Buffer.from('test') };
      Minigame.findByPk.mockRejectedValue(new Error('DB'));
      await uploadReference(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getReferenceImage', () => {
    it('should return 404 if image not found', async () => {
      req.params.gameId = 1;
      Minigame.findByPk.mockResolvedValue(null);
      await getReferenceImage(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return image successfully', async () => {
      req.params.gameId = 1;
      Minigame.findByPk.mockResolvedValue({
        config_json: { reference_image_base64: 'YmFzZTY0', reference_image_mimetype: 'image/png' }
      });
      await getReferenceImage(req, res);
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      Minigame.findByPk.mockRejectedValue(new Error('DB'));
      await getReferenceImage(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('submitAttempt', () => {
    it('should return 400 if no file', async () => {
      await submitAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if minigame not found', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      Minigame.findByPk.mockResolvedValue(null);
      await submitAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if unsupported game type', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      Minigame.findByPk.mockResolvedValue({ game_type: 'unsupported' });
      await submitAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should process shape_match pass', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      req.params.gameId = 1;
      const mockMinigame = {
        game_type: 'shape_match',
        config_json: { reference_image_base64: 'YmFzZTY0' },
        waypoint_id: 2,
        Waypoint: { arg_id: 10 }
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: true, confidence_score: 95 })
      });
      WaypointEdge.findAll.mockResolvedValue([{ to_waypoint_id: 3 }]);
      evaluateConditions.mockResolvedValue(true);
      WaypointProgress.findAll.mockResolvedValue([{ waypoint_id: 3, status: 'unlocked' }]);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 2 }, { waypoint_id: 3 }]);

      await submitAttempt(req, res);

      expect(global.fetch).toHaveBeenCalled();
      expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'pass', score: 1.0 }),
        { transaction }
      );
      expect(WaypointProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
        { transaction }
      );
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ passed: true, confidence_score: 95 });
    });

    it('should process colour_match fail with retry', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      req.params.gameId = 1;
      const mockMinigame = {
        game_type: 'colour_match',
        config_json: { reference_image_base64: 'YmFzZTY0', allow_multiple_attempts: true }
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: false, confidence_score: 10 })
      });

      await submitAttempt(req, res);

      expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'fail', score: 0.0 }),
        { transaction }
      );
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ passed: false, confidence_score: 10, can_retry: true });
    });

    it('should process plaque_scan fail without retry', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      req.params.gameId = 1;
      const mockMinigame = {
        game_type: 'plaque_scan',
        config_json: { reference_image_base64: 'YmFzZTY0' },
        waypoint_id: 2,
        Waypoint: { arg_id: 10 }
      };
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: false, confidence_score: 10 })
      });
      WaypointProgress.findAll.mockResolvedValue([{ waypoint_id: 2, status: 'failed' }]);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 2 }]);

      await submitAttempt(req, res);

      expect(MinigameAttempt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'fail' }),
        { transaction }
      );
      expect(WaypointProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' }),
        { transaction }
      );
      expect(GameSession.update).toHaveBeenCalled(); // Since session failed
      expect(transaction.commit).toHaveBeenCalled();
    });

    it('should handle symmetry_finder without reference image', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      const mockMinigame = { game_type: 'symmetry_finder' }; // no config needed
      Minigame.findByPk.mockResolvedValue(mockMinigame);
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ passed: false })
      });

      await submitAttempt(req, res);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(MinigameAttempt.upsert).toHaveBeenCalled();
    });

    it('should return 400 if reference image is missing for type that needs it', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      Minigame.findByPk.mockResolvedValue({ game_type: 'texture_match', config_json: {} });
      await submitAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle AI service failure (not ok)', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'test.jpg' };
      Minigame.findByPk.mockResolvedValue({ game_type: 'sift_match', config_json: { reference_image_base64: 'YmFzZTY0' } });
      global.fetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: jest.fn().mockResolvedValue('Bad Gateway')
      });
      await submitAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('should handle general errors', async () => {
      req.file = { buffer: Buffer.from('test') };
      Minigame.findByPk.mockRejectedValue(new Error('DB'));
      await submitAttempt(req, res);
      expect(fs.appendFileSync).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
