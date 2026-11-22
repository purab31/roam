const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const apiLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const {
  NotFoundError,
  ValidationError,
  AuthError,
  ForbiddenError,
  ConflictError,
} = require('./errors');

const healthRoutes = require('./routes/health.routes');

const app = express();

// Security headers with Helmet
app.use(helmet());

// CORS with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.nodeEnv !== 'production' ||
        origin === config.clientOrigin ||
        origin.startsWith('http://localhost')
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for this origin'));
    },
    credentials: true,
  })
);

// Cookie parser
app.use(cookieParser());

// JSON body limit
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// Rate limiter for API routes
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', healthRoutes);

// Test routes for verifying error handling in non-production
if (config.nodeEnv === 'test') {
  app.get('/api/test/validation-error', () => {
    throw new ValidationError('Invalid listing data', {
      price: 'Price must be a positive integer',
      title: 'Title is required',
    });
  });

  app.get('/api/test/auth-error', () => {
    throw new AuthError('Authentication token missing or invalid');
  });

  app.get('/api/test/forbidden-error', () => {
    throw new ForbiddenError('You do not have the seller capability');
  });

  app.get('/api/test/conflict-error', () => {
    throw new ConflictError('A booking already exists for the requested dates');
  });
}

// 404 handler for unknown routes
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// Central error handler
app.use(errorHandler);

module.exports = app;
