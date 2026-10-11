const express = require('express');
const request = require('supertest');
const createApp = require('../../src/app');
const { createRateLimiter } = require('../../src/middleware/rateLimits');

describe('security middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('adds Helmet headers to normal application responses', async () => {
    process.env.NODE_ENV = 'test';
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('returns the standard 429 response after a limit is exceeded', async () => {
    process.env.NODE_ENV = 'development';
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 1 }));
    app.get('/limited', (req, res) => res.json({ ok: true }));

    await request(app).get('/limited').expect(200);
    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests, try again later.' });
  });

  it('skips limits while Jest is running', async () => {
    process.env.NODE_ENV = 'test';
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 1 }));
    app.get('/limited', (req, res) => res.json({ ok: true }));

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);
  });
});
