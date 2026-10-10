const { getAllBadges } = require('../../src/controllers/badgeController');
const { Badge } = require('../../src/models');

jest.mock('../../src/models', () => ({
  Badge: { findAll: jest.fn() }
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
});
