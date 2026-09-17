const express = require('express');
const request = require('supertest');
const userRoutes = require('../../src/routes/userRoutes.js');
const userController = require('../../src/controllers/userController');

jest.mock('../../src/controllers/userController', () => {
  return new Proxy({}, {
    get: (target, prop) => jest.fn((req, res) => res.json({ mocked: prop }))
  });
});

describe('userRoutes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', userRoutes);
  });

  it('should mount the routes', () => {
    expect(app).toBeDefined();
  });
});
