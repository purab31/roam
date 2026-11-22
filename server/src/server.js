const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

async function startServer() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`[Roam Server] Running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
