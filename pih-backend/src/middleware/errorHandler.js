const logger = require('../utils/logger');
const { NODE_ENV } = require('../config/env');

/**
 * Global error-handling middleware.
 *
 * Catches all errors thrown or passed via next(err) and returns
 * a consistent JSON error response.  Handles:
 *   - Prisma known/validation errors
 *   - Zod validation errors
 *   - JWT errors
 *   - Application errors with statusCode
 *   - Generic / unexpected errors
 */
function errorHandler(err, req, res, _next) {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // ------------------------------------------------------------------
  // Prisma errors
  // ------------------------------------------------------------------
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Resource already exists',
        field: err.meta?.target,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Foreign key constraint failed',
        field: err.meta?.field_name,
      });
    }
    return res.status(400).json({ error: 'Database request error' });
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: 'Invalid data provided' });
  }

  // ------------------------------------------------------------------
  // Zod validation errors
  // ------------------------------------------------------------------
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  // ------------------------------------------------------------------
  // JWT errors
  // ------------------------------------------------------------------
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'NotBeforeError') {
    return res.status(401).json({ error: 'Token not yet active' });
  }

  // ------------------------------------------------------------------
  // Application errors with explicit statusCode
  // ------------------------------------------------------------------
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // ------------------------------------------------------------------
  // Fallback: unexpected / internal errors
  // ------------------------------------------------------------------
  const status = err.status || 500;
  const message =
    NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
