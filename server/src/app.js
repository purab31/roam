const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const {
  NotFoundError,
  ValidationError,
  AuthError,
  ForbiddenError,
  ConflictError,
} = require('./errors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const listingRoutes = require('./routes/listing.routes');
const enquiryRoutes = require('./routes/enquiry.routes');
const offerRoutes = require('./routes/offer.routes');
const transactionRoutes = require('./routes/transaction.routes');
const notificationRoutes = require('./routes/notification.routes');
const dealerRoutes = require('./routes/dealer.routes');
const adminRoutes = require('./routes/admin.routes');
const bookingRoutes = require('./routes/booking.routes');
const reportRoutes = require('./routes/report.routes');
const settingsRoutes = require('./routes/settings.routes');
const path = require('path');

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

// Rate limiter for general API routes
app.use('/api', apiLimiter);

// Serve public uploaded images
app.use('/uploads/images', express.static(path.join(config.uploadDir, 'images')));

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

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
