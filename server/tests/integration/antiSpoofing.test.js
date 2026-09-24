const request = require('supertest');
const express = require('express');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { User, LocationEvent, TrustEvent } = require('../../src/models');
const antiSpoofing = require('../../src/middleware/antiSpoofing');

describe('Anti-Spoofing Integration Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    // Setup a dummy express app to test the middleware
    app = express();
    app.use(express.json());
    
    // Mock requireAuth behavior by injecting req.user
    app.use((req, res, next) => {
      if (req.headers.authorization === 'test-token') {
        req.user = { user_id: testUser.user_id };
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    });

    app.post('/test/waypoint/arrive', antiSpoofing, (req, res) => {
      res.status(200).json({ success: true, message: 'Arrived at waypoint' });
    });
  });

  beforeEach(async () => {
    await resetDatabase();
    
    // Create a dummy user
    testUser = await User.create({
      username: 'testspoofuser',
      email: 'spoof@warg.com',
      google_uid: 'dummy123',
      trust_score: 100,
      distance_walked_m: 0
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should pass legitimate interaction, update distance, and log trust event', async () => {
    // Inject an old location event (10 meters away, 10s ago)
    await LocationEvent.create({
      user_id: testUser.user_id,
      location: { type: 'Point', coordinates: [28.03001, -26.19201], crs: { type: 'name', properties: { name: 'EPSG:4326' } } },
      recorded_at: new Date(Date.now() - 10000)
    });

    const res = await request(app)
      .post('/test/waypoint/arrive')
      .set('Authorization', 'test-token')
      .send({
        lat: -26.192,
        lng: 28.03,
        steps: 15,
        buffer: [
          { lat: -26.192, lng: 28.030 },
          { lat: -26.1921, lng: 28.0301 },
          { lat: -26.1922, lng: 28.0302 },
          { lat: -26.1921, lng: 28.0303 },
          { lat: -26.192, lng: 28.0301 }
        ]
      });

    expect(res.statusCode).toBe(200);
    
    // Check DB changes
    const updatedUser = await User.findByPk(testUser.user_id);
    expect(updatedUser.trust_score).toBe('100.00'); // Cannot exceed 100
    expect(updatedUser.distance_walked_m).toBe(15);
    
    const trustEvents = await TrustEvent.findAll({ where: { user_id: testUser.user_id } });
    expect(trustEvents.length).toBe(1);
    expect(trustEvents[0].event_type).toBe('verified_interaction');
  });

  it('should block teleportation/speed spoofing', async () => {
    // Old location: 100km away, 10 seconds ago
    await LocationEvent.create({
      user_id: testUser.user_id,
      location: { type: 'Point', coordinates: [28.5, -26.5], crs: { type: 'name', properties: { name: 'EPSG:4326' } } },
      recorded_at: new Date(Date.now() - 10000)
    });

    const res = await request(app)
      .post('/test/waypoint/arrive')
      .set('Authorization', 'test-token')
      .send({
        lat: -26.192,
        lng: 28.03,
        steps: 0,
        buffer: [] // no buffer skip drift check
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.flags[0].reason).toBe('speed_violation');

    const updatedUser = await User.findByPk(testUser.user_id);
    expect(parseFloat(updatedUser.trust_score)).toBe(66.00); // 100 + 1 - 15 - 20
    
    const locationEvents = await LocationEvent.findAll({ where: { user_id: testUser.user_id } });
    expect(locationEvents.length).toBe(2);
    expect(locationEvents[1].is_suspicious).toBe(true);
  });
});
