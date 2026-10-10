const { submitFeedback } = require('../../src/controllers/feedbackController');
const { UserFeedback } = require('../../src/models');

jest.mock('../../src/models', () => ({
  UserFeedback: { create: jest.fn() }
}));

describe('feedbackController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, user: { user_id: 1 } };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('submitFeedback', () => {
    it('should create feedback successfully with all fields', async () => {
      req.body = {
        uiExperience: '5',
        gameExperience: '4',
        creatorExperience: '3',
        gpsExperience: '5',
        socialExperience: '4',
        perfExperience: '5',
        nps: '9',
        featureRequest: 'More games',
        feedbackText: 'Great app'
      };

      const mockFeedback = { id: 1, ...req.body };
      UserFeedback.create.mockResolvedValue(mockFeedback);

      await submitFeedback(req, res);

      expect(UserFeedback.create).toHaveBeenCalledWith({
        ui_experience: 5,
        game_experience: 4,
        creator_experience: 3,
        gps_experience: 5,
        social_experience: 4,
        perf_experience: 5,
        nps: 9,
        feature_request: 'More games',
        feedback_text: 'Great app',
        user_id: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, feedback: mockFeedback });
    });

    it('should create feedback successfully with optional fields missing and no user', async () => {
      req.user = null; // No user authenticated
      req.body = {};

      const mockFeedback = { id: 2 };
      UserFeedback.create.mockResolvedValue(mockFeedback);

      await submitFeedback(req, res);

      expect(UserFeedback.create).toHaveBeenCalledWith({
        ui_experience: null,
        game_experience: null,
        creator_experience: null,
        gps_experience: null,
        social_experience: null,
        perf_experience: null,
        nps: null,
        feature_request: null,
        feedback_text: null
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, feedback: mockFeedback });
    });

    it('should handle errors', async () => {
      UserFeedback.create.mockRejectedValue(new Error('DB Error'));

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to submit feedback' });
    });
  });
});
