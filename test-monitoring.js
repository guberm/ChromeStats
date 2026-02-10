require('dotenv').config();

const logger = require('./src/logger');
const { initializeDatabase, getAllExtensions } = require('./src/database');
const { initializeEmailService } = require('./src/email');
const { runMonitoringCycle } = require('./src/scheduler');

async function test() {
  try {
    logger.info('========================================');
    logger.info('Testing Monitoring Cycle');
    logger.info('========================================');

    // Initialize database
    logger.info('Initializing database...');
    initializeDatabase();

    // Initialize email service
    logger.info('Initializing email service...');
    initializeEmailService();

    // Get configured extensions
    const extensions = getAllExtensions();
    logger.info(`Configured extensions: ${extensions.length}`);
    extensions.forEach(e => {
      logger.info(`  - ${e.name}: ${e.url}`);
    });

    // Run one monitoring cycle
    logger.info('Running monitoring cycle...');
    await runMonitoringCycle();
    
    logger.info('========================================');
    logger.info('Monitoring cycle completed');
    logger.info('========================================');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

test();
