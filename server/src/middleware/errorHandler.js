/**
 * Global error handler middleware
 */

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value',
      details: err.keyValue,
    });
  }

  // MongoDB not connected (common on localhost when MongoDB isn't running)
  const isDbConnectionError =
    err.name === 'MongoServerSelectionError' ||
    (err.message && String(err.message).includes('ECONNREFUSED'));
  if (isDbConnectionError) {
    console.error('Database error (is MongoDB running?):', err.message);
    return res.status(503).json({
      success: false,
      message:
        'Database unavailable. Please start MongoDB (e.g. run "mongod" or start MongoDB service), then restart the server.',
    });
  }

  console.error('Unhandled error:', err);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal server error');
  res.status(500).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
