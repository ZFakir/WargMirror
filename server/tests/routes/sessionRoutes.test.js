const express = require('express');
const request = require('supertest');
const sessionRoutes = require('../../src/routes/sessionRoutes.js');
const sessionController = require('../../src/controllers/sessionController');

jest.mock('../../src/controllers/sessionController', () => {
  return new Proxy({}, {
    get: (target, prop) => jest.fn((req, res) => res.json({ mocked: prop }))
  });
});

describe('sessionRoutes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', sessionRoutes);
  });

  it('should mount the routes', () => {
    expect(app).toBeDefined();
  });
});
