/**
 * Global Error Handler Middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.stack || err.message || err);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;
