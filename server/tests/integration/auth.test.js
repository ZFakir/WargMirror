const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser } = require('../setup/fixtures');

const app = createApp();

describe('Auth API (/auth)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('POST /auth/signup', () => {
    it('creates a new local user and logs them in', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ username: 'newplayer', email: 'newplayer@example.com', password: 'Password123!' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Signup successful');
      expect(res.body.user).toMatchObject({ username: 'newplayer', email: 'newplayer@example.com' });
      // A session cookie should have been issued since signup logs the user in.
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects signup with a missing field', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ username: 'incomplete', email: 'incomplete@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('rejects a duplicate email with 400', async () => {
      await createUser({ email: 'dupe@example.com' });

      const res = await request(app)
        .post('/auth/signup')
        .send({ username: 'someoneelse', email: 'dupe@example.com', password: 'Password123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email already in use/i);
    });

    it('rejects a duplicate username with 400', async () => {
      await createUser({ username: 'takenname' });

      const res = await request(app)
        .post('/auth/signup')
        .send({ username: 'takenname', email: 'fresh@example.com', password: 'Password123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username already taken/i);
    });
  });

  describe('GET /auth/check-user', () => {
    it('reports whether an email is already registered', async () => {
      await createUser({ email: 'exists@example.com' });

      const taken = await request(app).get('/auth/check-user').query({ email: 'exists@example.com' });
      expect(taken.body).toEqual({ exists: true, field: 'email' });

      const free = await request(app).get('/auth/check-user').query({ email: 'nobody@example.com' });
      expect(free.body).toEqual({ exists: false });
    });
  });

  describe('POST /auth/login + GET /auth/me', () => {
    it('logs an existing user in and returns their session on /me', async () => {
      const { user, password } = await createUser({ email: 'login@example.com' });

      const agent = request.agent(app);

      const loginRes = await agent
        .post('/auth/login')
        .send({ email: user.email, password });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user_id).toBe(user.user_id);

      const meRes = await agent.get('/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.username).toBe(user.username);
    });

    it('rejects an incorrect password with 401', async () => {
      const { user } = await createUser({ email: 'wrongpw@example.com' });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'not-the-password' });

      expect(res.status).toBe(401);
    });

    it('returns 401 from /me when not authenticated', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/logout', () => {
    it('ends the session so /me becomes unauthenticated again', async () => {
      const { user, password } = await createUser({ email: 'logout@example.com' });
      const agent = request.agent(app);

      await agent.post('/auth/login').send({ email: user.email, password });
      expect((await agent.get('/auth/me')).status).toBe(200);

      await agent.get('/auth/logout');
      expect((await agent.get('/auth/me')).status).toBe(401);
    });
  });
});
