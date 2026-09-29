const { startGameSession, getActiveSessions } = require('../../src/controllers/sessionController');
const { GameSession, Arg } = require('../../src/models');

jest.mock('../../src/models', () => ({
  GameSession: { create: jest.fn(), findAll: jest.fn() },
  Arg: {}
}));

describe('sessionController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('startGameSession', () => {
    it('should start a session successfully', async () => {
      req.body = { user_id: 1, arg_id: 10 };
      GameSession.create.mockResolvedValue({ session_id: 1, status: 'active' });

      await startGameSession(req, res);

      expect(GameSession.create).toHaveBeenCalledWith({ user_id: 1, arg_id: 10, status: 'active' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ session_id: 1 }));
    });

    it('should handle errors', async () => {
      req.body = { user_id: 1, arg_id: 10 };
      GameSession.create.mockRejectedValue(new Error('DB Error'));

      await startGameSession(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActiveSessions', () => {
    it('should get active sessions', async () => {
      req.params.user_id = 1;
      GameSession.findAll.mockResolvedValue([{ session_id: 1 }]);

      await getActiveSessions(req, res);

      expect(GameSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 1 } }));
      expect(res.json).toHaveBeenCalledWith([{ session_id: 1 }]);
    });

    it('should handle errors', async () => {
      req.params.user_id = 1;
      GameSession.findAll.mockRejectedValue(new Error('DB Error'));

      await getActiveSessions(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
