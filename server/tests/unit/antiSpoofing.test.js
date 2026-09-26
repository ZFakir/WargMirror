const antiSpoofing = require('../../src/middleware/antiSpoofing');
const { User, LocationEvent, TrustEvent } = require('../../src/models');

jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn()
  },
  LocationEvent: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  TrustEvent: {
    create: jest.fn()
  }
}));

describe('Anti-Spoofing Middleware Unit Tests', () => {
  let req, res, next, mockUser;

  beforeEach(() => {
    req = {
      user: { user_id: 1 },
      body: { lat: -26.192, lng: 28.03, buffer: [], steps: 0 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    mockUser = { trust_score: 100, save: jest.fn() };
    User.findByPk.mockResolvedValue(mockUser);
    LocationEvent.findOne.mockResolvedValue(null);
    LocationEvent.create.mockResolvedValue({});
    TrustEvent.create.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass and add steps to distance_walked_m for valid interactions', async () => {
    req.body.steps = 50;
    
    // Simulate previous location 10 meters away, 10 seconds ago (speed 1 m/s)
    LocationEvent.findOne.mockResolvedValue({
      location: { coordinates: [28.03001, -26.19201] }, // slightly off
      recorded_at: new Date(Date.now() - 10000)
    });

    await antiSpoofing(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockUser.distance_walked_m).toBe(50); // 50 steps = 50 meters
    expect(mockUser.save).toHaveBeenCalled();
    expect(TrustEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'verified_interaction'
    }));
  });

  it('should flag pedometer mismatch if distance > 20m and steps are 0', async () => {
    req.body.steps = 0;
    
    // Simulate previous location 100 meters away, 100 seconds ago
    // Roughly 0.001 degrees lat is 111 meters
    LocationEvent.findOne.mockResolvedValue({
      location: { coordinates: [28.03, -26.191] },
      recorded_at: new Date(Date.now() - 100000)
    });

    await antiSpoofing(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String),
      flags: expect.arrayContaining([expect.objectContaining({ reason: 'pedometer_mismatch' })])
    }));
    expect(mockUser.trust_score).toBeLessThan(100);
    expect(TrustEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'pedometer_mismatch'
    }));
  });

  it('should flag drift anomaly if buffer variance is zero', async () => {
    // 5 exact same coordinates = variance 0
    req.body.buffer = [
      { lat: -26.192, lng: 28.03 },
      { lat: -26.192, lng: 28.03 },
      { lat: -26.192, lng: 28.03 },
      { lat: -26.192, lng: 28.03 },
      { lat: -26.192, lng: 28.03 }
    ];

    await antiSpoofing(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      flags: expect.arrayContaining([expect.objectContaining({ reason: 'drift_anomaly' })])
    }));
  });

  it('should flag speed violation if speed exceeds 4m/s', async () => {
    // Moved ~111 meters in 10 seconds (11 m/s)
    LocationEvent.findOne.mockResolvedValue({
      location: { coordinates: [28.03, -26.191] },
      recorded_at: new Date(Date.now() - 10000)
    });

    await antiSpoofing(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      flags: expect.arrayContaining([expect.objectContaining({ reason: 'speed_violation' })])
    }));
  });
});
