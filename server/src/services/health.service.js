const { getDatabaseStatus } = require('../config/db');

function getHealthStatus() {
  const dbStatus = getDatabaseStatus();
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
  };
}

module.exports = {
  getHealthStatus,
};
