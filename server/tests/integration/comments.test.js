const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser, createArg } = require('../setup/fixtures');

const app = createApp();

async function loginAgent(email, password) {
  const agent = request.agent(app);
  await agent.post('/auth/login').send({ email, password });
  return agent;
}

describe('Comments API (/api/comments)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('rejects posting a comment while logged out', async () => {
    const { user } = await createUser();
    const arg = await createArg(user);

    const res = await request(app)
      .post(`/api/comments/arg/${arg.arg_id}`)
      .send({ body: 'Great hunt!' });

    expect(res.status).toBe(401);
  });

  it('rejects an empty comment body', async () => {
    const { user, password } = await createUser({ email: 'commenter@example.com' });
    const arg = await createArg(user);
    const agent = await loginAgent(user.email, password);

    const res = await agent.post(`/api/comments/arg/${arg.arg_id}`).send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  it('allows a logged-in user to post and then read a comment', async () => {
    const { user, password } = await createUser({ email: 'poster@example.com' });
    const arg = await createArg(user);
    const agent = await loginAgent(user.email, password);

    const postRes = await agent
      .post(`/api/comments/arg/${arg.arg_id}`)
      .send({ body: 'Loved the second waypoint!' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.body).toBe('Loved the second waypoint!');

    const listRes = await request(app).get(`/api/comments/arg/${arg.arg_id}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].User.username).toBe(user.username);
  });
});
