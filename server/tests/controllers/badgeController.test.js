const { getAllBadges, syncBadges } = require('../../src/controllers/badgeController');
const { Badge } = require('../../src/models');
const badgeService = require('../../src/services/badgeService');

jest.mock('../../src/models', () => ({
  Badge: { findAll: jest.fn() }
}));

jest.mock('../../src/services/badgeService', () => ({
  evaluateAndAwardBadges: jest.fn()
}));

describe('badgeController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getAllBadges', () => {
    it('should return all badges', async () => {
      const mockBadges = [{ badge_id: 1, name: 'Tester' }];
      Badge.findAll.mockResolvedValue(mockBadges);

      await getAllBadges(req, res);

      expect(Badge.findAll).toHaveBeenCalledWith({
        attributes: ['badge_id', 'name', 'description', 'icon_svg']
      });
      expect(res.json).toHaveBeenCalledWith(mockBadges);
    });

    it('should handle errors', async () => {
      Badge.findAll.mockRejectedValue(new Error('DB Error'));

      await getAllBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('syncBadges', () => {
    it('should return 401 if user is not authenticated', async () => {
      req = { user: null, body: {} };

      await syncBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should evaluate and return newly awarded badges for user', async () => {
      req = { user: { user_id: 10 } };
      const awarded = [{ badge_id: 1, name: 'Friendly Face' }];
      badgeService.evaluateAndAwardBadges.mockResolvedValue(awarded);

      await syncBadges(req, res);

      expect(badgeService.evaluateAndAwardBadges).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Badges synchronized successfully',
        awarded_count: 1,
        newly_awarded: awarded
      });
    });

    it('should handle errors during sync', async () => {
      req = { user: { user_id: 10 } };
      badgeService.evaluateAndAwardBadges.mockRejectedValue(new Error('Eval Error'));

      await syncBadges(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to synchronize badges' });
    });
  });
});
