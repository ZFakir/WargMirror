const { ZodError } = require('zod');

const SOURCE_NAMES = new Set(['body', 'params', 'query']);

function formatIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message
  }));
}

function validate(source, schema) {
  if (!SOURCE_NAMES.has(source)) {
    throw new Error(`Unsupported validation source: ${source}`);
  }

  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = formatIssues(result.error.issues);
      return res.status(400).json({
        error: 'Invalid request data',
        fields
      });
    }

    req[source] = result.data;
    return next();
  };
}

function validationErrorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request data',
      fields: formatIssues(error.issues)
    });
  }
  return next(error);
}

module.exports = { validate, validationErrorHandler };
