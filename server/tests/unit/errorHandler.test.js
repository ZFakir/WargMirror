const { UniqueConstraintError } = require('sequelize');
const multer = require('multer');
const { notFoundHandler, errorHandler } = require('../../src/middleware/errorHandler');
const AppError = require('../../src/utils/AppError');
const asyncHandler = require('../../src/utils/asyncHandler');

describe('error handling middleware', () => {
  let req;
  let res;
  let next;
  let consoleError;

  beforeEach(() => {
    req = { method: 'GET', originalUrl: '/api/test' };
    res = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns a JSON 404 for an unmatched route', () => {
    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Route not found' });
  });

  it('maps expected application errors and preserves their fields', () => {
    errorHandler(new AppError(400, 'Invalid page', ['page']), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid page', fields: ['page'] }));
  });

  it('maps unique constraints to conflict responses', () => {
    errorHandler(new UniqueConstraintError({ errors: [] }), req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Resource already exists' }));
  });

  it('maps upload size limits to 413', () => {
    errorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Uploaded file is too large' }));
  });

  it('does not expose unexpected error details in production', () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    errorHandler(new Error('database password'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    process.env.NODE_ENV = previousEnv;
  });

  it('passes errors through after response headers are sent', () => {
    res.headersSent = true;
    const error = new Error('late failure');
    errorHandler(error, req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards rejected async handlers to Express', async () => {
    const error = new Error('rejected');
    const handler = asyncHandler(async () => { throw error; });
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
