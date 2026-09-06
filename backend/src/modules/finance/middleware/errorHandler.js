/**
 * Centralized Error Handling Middleware for Finance Module.
 * Sanitizes errors and returns consistent JSON responses.
 */

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists for your company.`
    });
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Validation error'
    });
  }

  // Handle Mongoose CastError (invalid ObjectId or format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field '${err.path}'`
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode === 500 && !isProd && process.env.NODE_ENV !== 'test') {
    console.error('[Internal Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = {
  errorHandler
};
