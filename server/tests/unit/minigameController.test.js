const { uploadReference, getReferenceImage, submitAttempt } = require('../../src/controllers/minigameController');
const Minigame = require('../../src/models/Minigame');

jest.mock('../../src/models/Minigame', () => ({
  findByPk: jest.fn()
}));

global.fetch = jest.fn();

describe('minigameController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { gameId: 1 },
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
      const mockGame = { config_json: {}, changed: jest.fn(), save: jest.fn() };
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
        json: jest.fn().mockResolvedValue({ passed: true })
      });

      await submitAttempt(req, res);

      expect(fetch).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ passed: true });
    });
  });
});
