const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser, createArg } = require('../setup/fixtures');

const app = createApp();

// Logs a fixture user in and returns a supertest agent carrying their session
// cookie — required for the routes that sit behind requireAuth.
async function loginUser(user, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email: user.email, password });
  expect(res.status).toBe(200);
  return agent;
}

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
      const { user, password } = await createUser();
      const agent = await loginUser(user, password);

      const res = await agent
        .post('/api/args')
        .send({
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

    it('rejects anonymous creates with 401', async () => {
      const res = await request(app)
        .post('/api/args')
        .send({ title: 'Ghost ARG' });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/args/:id', () => {
    it('rejects updates from a user who is not the creator', async () => {
      const { user: owner } = await createUser();
      const { user: intruder, password } = await createUser();
      const arg = await createArg(owner, { title: 'Owned Arg' });
      const agent = await loginUser(intruder, password);

      const res = await agent
        .put(`/api/args/${arg.arg_id}`)
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('allows the creator to update the title', async () => {
      const { user, password } = await createUser();
      const arg = await createArg(user, { title: 'Old Title' });
      const agent = await loginUser(user, password);

      const res = await agent
        .put(`/api/args/${arg.arg_id}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });
  });

  describe('POST /api/args/:id/vote', () => {
    it('registers a like, then toggles it off on a repeat vote', async () => {
      const { user, password } = await createUser();
      const arg = await createArg(user);
      const agent = await loginUser(user, password);

      const liked = await agent
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ vote: 'like' });

      expect(liked.status).toBe(200);
      expect(liked.body).toMatchObject({ action: 'voted', like_count: 1, dislike_count: 0 });

      const unliked = await agent
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ vote: 'like' });

      expect(unliked.body).toMatchObject({ action: 'unvoted', like_count: 0, dislike_count: 0 });
    });

    it('rejects votes from unauthenticated guests with 401', async () => {
      const { user } = await createUser();
      const arg = await createArg(user);

      const res = await request(app)
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ vote: 'like' });

      expect(res.status).toBe(401);
    });

    it('votes as the session user, ignoring a spoofed body user_id', async () => {
      const { user, password } = await createUser();
      const arg = await createArg(user);
      const agent = await loginUser(user, password);

      const res = await agent
        .post(`/api/args/${arg.arg_id}/vote`)
        .send({ user_id: 999, vote: 'like' });

      expect(res.status).toBe(200);

      // The session user sees their own vote …
      const own = await agent.get(`/api/args/${arg.arg_id}`);
      expect(own.body.user_vote).toBe('like');

      // … and guests never see another user's vote state.
      const guest = await request(app).get(`/api/args/${arg.arg_id}`);
      expect(guest.body.user_vote).toBeNull();
    });

    it('rejects a missing or invalid vote value', async () => {
      const { user, password } = await createUser();
      const arg = await createArg(user);
      const agent = await loginUser(user, password);

      const missing = await agent.post(`/api/args/${arg.arg_id}/vote`).send({});
      expect(missing.status).toBe(400);

      const invalid = await agent.post(`/api/args/${arg.arg_id}/vote`).send({ vote: 'up' });
      expect(invalid.status).toBe(400);
    });
  });

  describe('POST /api/args/:id/flag', () => {
    it('creates a flag attributed to the authenticated reporter', async () => {
      const { user: creator } = await createUser();
      const { user: reporter, password } = await createUser();
      const arg = await createArg(creator);
      const agent = await loginUser(reporter, password);

      const res = await agent
        .post(`/api/args/${arg.arg_id}/flag`)
        .send({ reporter_id: 999, reason: 'inappropriate_content', description: 'Not campus-appropriate' });

      expect(res.status).toBe(201);
      expect(res.body.reason).toBe('inappropriate_content');
      // A spoofed reporter_id in the body must be ignored.
      expect(res.body.reporter_id).toBe(reporter.user_id);
    });

    it('rejects anonymous flags with 401', async () => {
      const { user } = await createUser();
      const arg = await createArg(user);

      const res = await request(app)
        .post(`/api/args/${arg.arg_id}/flag`)
        .send({ reason: 'spam' });

      expect(res.status).toBe(401);
    });

    it('rejects a flag without a reason', async () => {
      const { user, password } = await createUser();
      const arg = await createArg(user);
      const agent = await loginUser(user, password);

      const res = await agent.post(`/api/args/${arg.arg_id}/flag`).send({});
      expect(res.status).toBe(400);
    });
  });
});
