import app from './app';
import { config } from './config/config';
import { logger } from './utils/logger';
import { ensureStorageDirs } from './storage/LocalStorage';
import { startCleanupScheduler } from './storage/cleanup';

async function start() {
  // Ensure storage directories exist
  await ensureStorageDirs();

  // Start cleanup scheduler
  startCleanupScheduler();

  const server = app.listen(config.port, () => {
    logger.info(`Any-DoC API server running on port ${config.port} (${config.nodeEnv})`);
    logger.info(`Frontend URL: ${config.frontendUrl}`);
    logger.info(`Max file size: ${config.maxFileSizeMB}MB`);
    logger.info(`Job expiry: ${config.jobExpiryMinutes} minutes`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down server...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
    shutdown();
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
