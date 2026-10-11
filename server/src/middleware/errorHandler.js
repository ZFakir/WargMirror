const { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } = require('sequelize');
const multer = require('multer');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const response = { error: 'Internal server error' };
  let status = err.status || err.statusCode || 500;

  if (err.name === 'ZodError') {
    status = 400;
    response.error = 'Validation failed';
    response.fields = (err.issues || []).map((issue) => issue.path.join('.'));
  } else if (err instanceof UniqueConstraintError) {
    status = 409;
    response.error = 'Resource already exists';
  } else if (err instanceof ForeignKeyConstraintError) {
    status = 409;
    response.error = 'Referenced resource cannot be changed';
  } else if (err instanceof ValidationError) {
    status = 400;
    response.error = 'Validation failed';
    response.fields = err.errors.map((item) => item.path);
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    response.error = err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large' : 'Invalid file upload';
  } else if (status < 400 || status > 599) {
    status = 500;
  } else if (status < 500) {
    response.error = err.message || 'Request failed';
    if (Array.isArray(err.fields)) {
      response.fields = err.fields;
    }
  }

  console.error(`${req.method} ${req.originalUrl}:`, err);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = { notFoundHandler, errorHandler };
