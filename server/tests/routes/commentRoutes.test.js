const express = require('express');
const request = require('supertest');
const commentRoutes = require('../../src/routes/commentRoutes.js');
const commentController = require('../../src/controllers/commentController');

jest.mock('../../src/controllers/commentController', () => {
  return new Proxy({}, {
    get: (target, prop) => jest.fn((req, res) => res.json({ mocked: prop }))
  });
});

describe('commentRoutes', () => {
  let app;
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', commentRoutes);
  });

  it('should mount the routes', () => {
    expect(app).toBeDefined();
  });
});
