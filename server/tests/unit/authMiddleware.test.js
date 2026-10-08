const { requireAuth } = require('../../src/middleware/authMiddleware');

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
