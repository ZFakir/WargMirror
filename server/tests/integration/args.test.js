const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser, createArg } = require('../setup/fixtures');

const app = createApp();

describe('ARG API (/api/args)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /api/args', () => {
    it('only returns published ARGs', async () => {
      const { user } = await createUser();
      await createArg(user, { title: 'Published One', status: 'published' });
      await createArg(user, { title: 'Draft One', status: 'unpublished' });

      const res = await request(app).get('/api/args');

      expect(res.status).toBe(200);
      const titles = res.body.map((a) => a.title);
      expect(titles).toContain('Published One');
      expect(titles).not.toContain('Draft One');
    });
  });

  describe('GET /api/args/:id', () => {
    it('returns a single ARG with its creator', async () => {
      const { user } = await createUser({ username: 'creator1' });
      const arg = await createArg(user, { title: 'Fetch Me' });

      const res = await request(app).get(`/api/args/${arg.arg_id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Fetch Me');
      expect(res.body.Creator.username).toBe('creator1');
    });

    it('returns 404 for a non-existent ARG', async () => {
      const res = await request(app).get('/api/args/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/args', () => {
    it('creates an ARG with waypoints and edges in one transaction', async () => {
      const { user } = await createUser();

      const res = await request(app)
        .post('/api/args')
        .send({
          creator_id: user.user_id,
          title: 'Campus Hunt',
          description: 'A quick loop around campus',
          status: 'unpublished',
          waypoints: [
            { id: 'a', title: 'Start', lat: -26.19, lng: 28.03, type: 'gps' },
            { id: 'b', title: 'End', lat: -26.20, lng: 28.04, type: 'gps' }
          ],
          edges: [{ from: 'a', to: 'b' }]
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Campus Hunt');

      const fetched = await request(app).get(`/api/args/${res.body.arg_id}`);
      expect(fetched.body.Waypoints).toHaveLength(2);
      expect(fetched.body.WaypointEdges).toHaveLength(1);
    });
  });

  describe('PUT /api/args/:id', () => {
    it('rejects updates from a user who is not the creator', async () => {
      const { user: owner } = await createUser();
      const { user: intruder } = await createUser();
      const arg = await createArg(owner, { title: 'Owned Arg' });

      const res = await request(app)
        .put(`/api/args/${arg.arg_id}`)
        .send({ creator_id: intruder.user_id, title: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('allows the creator to update the title', async () => {
      const { user } = await createUser();
      const arg = await createArg(user, { title: 'Old Title' });

      const res = await request(app)
        .put(`/api/args/${arg.arg_id}`)
        .send({ creator_id: user.user_id, title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });
  });

  describe('POST /api/args/:id/vote', () => {
    it('registers a like, then toggles it off on a repeat vote', async () => {
      const { user } = await createUser();
      const arg = await createArg(user);

      const liked = await request(app)
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ user_id: user.user_id, vote: 'like' });

      expect(liked.status).toBe(200);
      expect(liked.body).toMatchObject({ action: 'voted', like_count: 1, dislike_count: 0 });

      const unliked = await request(app)
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ user_id: user.user_id, vote: 'like' });

      expect(unliked.body).toMatchObject({ action: 'unvoted', like_count: 0, dislike_count: 0 });
    });

    it('requires user_id and vote', async () => {
      const { user } = await createUser();
      const arg = await createArg(user);

      const res = await request(app).post(`/api/args/${arg.arg_id}/vote`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/args/:id/flag', () => {
    it('creates a flag against an ARG', async () => {
      const { user: creator } = await createUser();
      const { user: reporter } = await createUser();
      const arg = await createArg(creator);

      const res = await request(app)
        .post(`/api/args/${arg.arg_id}/flag`)
        .send({ reporter_id: reporter.user_id, reason: 'inappropriate_content', description: 'Not campus-appropriate' });

      expect(res.status).toBe(201);
      expect(res.body.reason).toBe('inappropriate_content');
    });

    it('requires reporter_id and reason', async () => {
      const { user } = await createUser();
      const arg = await createArg(user);

      const res = await request(app).post(`/api/args/${arg.arg_id}/flag`).send({});
      expect(res.status).toBe(400);
    });
  });
});
