const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser, createArg } = require('../setup/fixtures');
const { Badge, UserBadge, GameSession, FriendRequest } = require('../../src/models');

const app = createApp();

async function loginUser(user, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email: user.email, password });
  expect(res.status).toBe(200);
  return agent;
}

describe('Badges API & Awarding System (/api/badges)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/badges', () => {
    it('returns empty array when no badges exist', async () => {
      const res = await request(app).get('/api/badges');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all system badges', async () => {
      await Badge.create({
        name: 'Friendly Face',
        description: 'Have 10 friends.',
        icon_svg: '<svg>badge</svg>',
        award_criteria: { type: 'friends_count', threshold: 10 }
      });

      const res = await request(app).get('/api/badges');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Friendly Face');
    });
  });

  describe('POST /api/badges/sync', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/badges/sync');
      expect(res.status).toBe(401);
    });

    it('evaluates and awards qualifying badges for the authenticated user', async () => {
      const { user, password } = await createUser();
      const agent = await loginUser(user, password);

      // Create a badge requiring 1 completed game
      const badge = await Badge.create({
        name: 'First Victory',
        description: 'Complete 1 game.',
        icon_svg: '<svg>win</svg>',
        award_criteria: { type: 'games_completed', threshold: 1 }
      });

      // User has 0 completed games -> sync should award 0
      let res = await agent.post('/api/badges/sync');
      expect(res.status).toBe(200);
      expect(res.body.awarded_count).toBe(0);

      // User completes a game
      const arg = await createArg(user);
      await GameSession.create({
        user_id: user.user_id,
        arg_id: arg.arg_id,
        status: 'completed',
        completed_at: new Date()
      });

      // Now sync -> should award the badge!
      res = await agent.post('/api/badges/sync');
      expect(res.status).toBe(200);
      expect(res.body.awarded_count).toBe(1);
      expect(res.body.newly_awarded[0].name).toBe('First Victory');

      // Subsequent sync does not re-award
      const repeatRes = await agent.post('/api/badges/sync');
      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.awarded_count).toBe(0);
    });
  });

  describe('GET /api/users/:id (Retroactive badge award on profile load)', () => {
    it('retroactively awards badges when a user views their profile', async () => {
      const { user, password } = await createUser();
      const agent = await loginUser(user, password);

      // Create a badge requiring distance >= 5km
      await Badge.create({
        name: 'Stroller',
        description: 'Walk 5km.',
        icon_svg: '<svg>walk</svg>',
        award_criteria: { type: 'distance_travelled', threshold: 5, unit: 'km' }
      });

      // User already walked 6000 meters in the past
      await user.update({ distance_walked_m: 6000 });

      // Profile was never checked before, user_badges is empty
      const beforeCount = await UserBadge.count({ where: { user_id: user.user_id } });
      expect(beforeCount).toBe(0);

      // User loads profile
      const res = await agent.get(`/api/users/${user.user_id}`);
      expect(res.status).toBe(200);

      // Profile JSON should include the retroactively awarded badge!
      expect(res.body.Badges).toBeDefined();
      expect(res.body.Badges.length).toBe(1);
      expect(res.body.Badges[0].name).toBe('Stroller');

      // UserBadges table now has 1 row
      const afterCount = await UserBadge.count({ where: { user_id: user.user_id } });
      expect(afterCount).toBe(1);
    });
  });
});
