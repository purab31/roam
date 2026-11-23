// Central error handler implementing standard response envelope:
// { success: false, error: { code, message, fields? } }
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let fields = err.fields || undefined;

  // Handle SyntaxError in body parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON payload in request body';
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    fields = {};
    for (const [key, value] of Object.entries(err.errors)) {
      fields[key] = value.message;
    }
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error(`[Server Error] ${err.stack || err.message}`);
  }

  // Spec 22.3: In production, mask unhandled 500 internal errors to prevent exposing database or driver details
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'An internal server error occurred';
  }

  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (fields && Object.keys(fields).length > 0) {
    response.error.fields = fields;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
