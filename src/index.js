require('dotenv').config();

const logger = require('./logger');
const { initializeDatabase, addExtension, getAllExtensions, closeDatabase } = require('./database');
const { initializeEmailService } = require('./email');
const { startScheduler, stopScheduler } = require('./scheduler');

/**
 * Initialize application
 */
async function initialize() {
  try {
    logger.info('========================================');
    logger.info('Chrome Stats Monitor - Starting');
    logger.info('========================================');

    // Initialize database
    logger.info('Initializing database...');
    initializeDatabase();

    // Initialize email service
    logger.info('Initializing email service...');
    const emailInitialized = initializeEmailService();
    
    if (!emailInitialized) {
      logger.warn('Email service not available. Please configure EMAIL_SENDER and EMAIL_PASSWORD');
    }

    // Setup extensions to monitor
    logger.info('Setting up extensions...');
    const chromeStatsUrl = process.env.CHROME_STATS_BASE_URL;
    
    if (!chromeStatsUrl) {
      logger.error('CHROME_STATS_BASE_URL not configured in .env');
      process.exit(1);
    }

    // Add the main Chrome Stats URL
    const ext = addExtension('Chrome Stats - Michael Guber', chromeStatsUrl);
    logger.info(`Monitoring URL: ${chromeStatsUrl}`);

    // Display configured extensions
    const extensions = getAllExtensions();
    logger.info(`Configured extensions (${extensions.length}):`);
    extensions.forEach(e => {
      logger.info(`  - ${e.name}: ${e.url}`);
    });

    // Start monitoring
    logger.info('Starting monitoring scheduler...');
    startScheduler();

    logger.info('Application initialized successfully');
    logger.info('Press Ctrl+C to stop the application');

    // Handle graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  try {
    logger.info('========================================');
    logger.info('Chrome Stats Monitor - Shutting Down');
    logger.info('========================================');

    stopScheduler();
    closeDatabase();

    logger.info('Application shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(`Shutdown error: ${error.message}`);
    process.exit(1);
  }
}

// Start application
initialize().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
