const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/roam_dev',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  bodyLimit: process.env.BODY_LIMIT || '1mb',
  jwtSecret: process.env.JWT_SECRET || 'roam-super-secret-jwt-key-for-development-mode',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'roam_token',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  adminEmail: process.env.ADMIN_EMAIL || 'admin@roam.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@Roam2026',
  adminName: process.env.ADMIN_NAME || 'Platform Administrator',
  adminMobile: process.env.ADMIN_MOBILE || '+1234567890',
  // Settings model in DB is now the single source of truth for dealer verification; fallback to env
  requireDealerVerification: process.env.REQUIRE_DEALER_VERIFICATION !== 'false',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
};

module.exports = config;
