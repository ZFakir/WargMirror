const { startGameSession, getActiveSessions, removeRecentSession } = require('../../src/controllers/sessionController');
const { GameSession, Arg } = require('../../src/models');

jest.mock('../../src/models', () => ({
  GameSession: { create: jest.fn(), findAll: jest.fn(), destroy: jest.fn() },
  Arg: {}
}));

describe('sessionController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    // Identity always comes from the authenticated session, never the request.
    req = { user: { user_id: 1 }, body: {}, params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('startGameSession', () => {
    it('should start a session successfully', async () => {
      req.body = { arg_id: 10 };
      GameSession.create.mockResolvedValue({ session_id: 1, status: 'active' });

      await startGameSession(req, res);

      expect(GameSession.create).toHaveBeenCalledWith({ user_id: 1, arg_id: 10, status: 'active' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ session_id: 1 }));
    });

    it('should ignore a user_id supplied in the request body', async () => {
      req.body = { user_id: 999, arg_id: 10 };
      GameSession.create.mockResolvedValue({ session_id: 1 });

      await startGameSession(req, res);

      expect(GameSession.create).toHaveBeenCalledWith({ user_id: 1, arg_id: 10, status: 'active' });
    });

    it('should handle errors', async () => {
      req.body = { arg_id: 10 };
      GameSession.create.mockRejectedValue(new Error('DB Error'));

      await startGameSession(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActiveSessions', () => {
    it('should get active sessions', async () => {
      req.params.user_id = '1';
      GameSession.findAll.mockResolvedValue([{ session_id: 1 }]);

      await getActiveSessions(req, res);

      expect(GameSession.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 1 } }));
      expect(res.json).toHaveBeenCalledWith([{ session_id: 1 }]);
    });

    it('should handle errors', async () => {
      req.params.user_id = '1';
      GameSession.findAll.mockRejectedValue(new Error('DB Error'));

      await getActiveSessions(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should reject requests for another user\'s sessions', async () => {
      req.params.user_id = '2';

      await getActiveSessions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(GameSession.findAll).not.toHaveBeenCalled();
    });
  });

  describe('removeRecentSession', () => {
    it('should remove a session owned by the authenticated user', async () => {
      req.params = { user_id: '1', arg_id: '10' };
      GameSession.destroy.mockResolvedValue(1);

      await removeRecentSession(req, res);

      expect(GameSession.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, arg_id: '10', status: 'active' }
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Session removed from recent' });
    });

    it('should reject removing another user\'s session', async () => {
      req.params = { user_id: '2', arg_id: '10' };

      await removeRecentSession(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(GameSession.destroy).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.params = { user_id: '1', arg_id: '10' };
      GameSession.destroy.mockRejectedValue(new Error('DB Error'));

      await removeRecentSession(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
