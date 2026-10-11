class AppError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.fields = fields;
    Error.captureStackTrace(this, AppError);
  }
}

module.exports = AppError;
