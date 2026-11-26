jest.mock('../../src/models', () => ({
  Minigame: { findByPk: jest.fn() },
  Waypoint: {}
}));

jest.mock('../../src/services/demoService', () => ({
  isDemoArg: jest.fn()
}));

const {
  requireAuth,
  requireAuthOrDemoArg,
  requireAuthOrDemoMinigame
} = require('../../src/middleware/authMiddleware');
const { Minigame } = require('../../src/models');
const demoService = require('../../src/services/demoService');

describe('authMiddleware - requireAuth', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      user: { user_id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('calls next for a normal authenticated user', () => {
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('never blocks trust-flagged players — bans are admin decisions only', () => {
    req.user.is_flagged = true;
    req.user.trust_score = 0;

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks suspended players with 403 (admin ban enforced on live sessions)', () => {
    req.user.is_suspended = true;

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Your account has been suspended.' });
  });

  it('returns 401 for unauthenticated requests', () => {
    req.isAuthenticated.mockReturnValue(false);

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Authentication required.' });
  });
});

describe('authMiddleware - requireAuthOrDemoArg & requireAuthOrDemoMinigame', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      params: { argId: '1', gameId: '10' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('allows unauthenticated guest for active demo arg and marks req.isDemoGuest', async () => {
    demoService.isDemoArg.mockResolvedValue(true);

    await requireAuthOrDemoArg(req, res, next);

    expect(demoService.isDemoArg).toHaveBeenCalledWith('1');
    expect(req.isDemoGuest).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('rejects unauthenticated guest for non-demo arg with 401', async () => {
    demoService.isDemoArg.mockResolvedValue(false);

    await requireAuthOrDemoArg(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('allows unauthenticated guest for minigame belonging to active demo arg', async () => {
    Minigame.findByPk.mockResolvedValue({ Waypoint: { arg_id: 1 } });
    demoService.isDemoArg.mockResolvedValue(true);

    await requireAuthOrDemoMinigame(req, res, next);

    expect(req.isDemoGuest).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('rejects unauthenticated guest for minigame outside demo arg with 401', async () => {
    Minigame.findByPk.mockResolvedValue({ Waypoint: { arg_id: 99 } });
    demoService.isDemoArg.mockResolvedValue(false);

    await requireAuthOrDemoMinigame(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
