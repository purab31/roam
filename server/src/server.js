const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

const { startExpiryCron, checkListingExpiry } = require('./services/expiry.service');

async function startServer() {
  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'roam-super-secret-jwt-key-for-development-mode') {
      console.error('[FATAL] JWT_SECRET must be explicitly defined and secure in production.');
      process.exit(1);
    }
    if (!process.env.MONGODB_URI) {
      console.error('[FATAL] MONGODB_URI must be explicitly defined in production.');
      process.exit(1);
    }
  }

  await connectDB();

  // Initialize first admin from environment variables if requested
  if (process.env.INIT_ADMIN === 'true') {
    try {
      const seedAdmin = require('../scripts/seedAdmin');
      await seedAdmin({ autoDisconnect: false });
    } catch (err) {
      console.error('[Admin Init] Failed to initialize admin from env:', err.message);
    }
  }

  // Catch-up run on startup in case the container was sleeping at midnight (idempotent)
  if (config.nodeEnv !== 'test') {
    checkListingExpiry().catch(err => {
      console.error('[Roam Expiry] Catch-up run error on startup:', err.message);
    });
  }

  startExpiryCron();

  const server = app.listen(config.port, () => {
    console.log(`[Roam Server] Running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
