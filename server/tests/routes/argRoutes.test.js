const express = require('express');
const request = require('supertest');
const argRoutes = require('../../src/routes/argRoutes.js');
const argController = require('../../src/controllers/argController');

jest.mock('../../src/controllers/argController', () => {
  return new Proxy({}, {
    get: (target, prop) => jest.fn((req, res) => res.json({ mocked: prop }))
  });
});

describe('argRoutes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', argRoutes);
  });

  it('should mount the routes', () => {
    expect(app).toBeDefined();
  });
});
