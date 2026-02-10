const schedule = require('node-schedule');
const logger = require('./logger');
const {
  getAllExtensions,
  recordSnapshot,
  getLatestSnapshot,
  recordChange,
  getUnsentChanges,
  markAsEmailed
} = require('./database');
const { sendExtensionNotification } = require('./email');

let monitoringJob = null;

/**
 * Run monitoring cycle
 */
async function runMonitoringCycle() {
  logger.info('Starting monitoring cycle...');
  
  try {
    // Defer scraper require until actually needed
    const { scrapeExtensionStats, detectChanges } = require('./scraper');
    
    const extensions = getAllExtensions();
    
    if (extensions.length === 0) {
      logger.warn('No extensions configured for monitoring');
      return;
    }

    for (const ext of extensions) {
      try {
        // Fetch latest stats
        const stats = await scrapeExtensionStats(ext.url);
        
        if (stats.length === 0) {
          logger.warn(`No stats found for extension: ${ext.name}`);
          continue;
        }

        // Process ALL extensions found on the page (not just the first one)
        logger.info(`[PROCESSING] Found ${stats.length} extensions on page for ${ext.name}`);
        
        for (const latestStats of stats) {
          // Auto-add/get extension entry in database
          const { addExtension } = require('./database');
          const extensionRecord = addExtension(latestStats.name, latestStats.url);
          const extensionId = extensionRecord.id;
          
          logger.debug(`Recording snapshot for ${latestStats.name}: id=${extensionId}, users=${latestStats.users} (${typeof latestStats.users}), rating=${latestStats.rating} (${typeof latestStats.rating}), reviews=${latestStats.reviews} (${typeof latestStats.reviews}), scrapedAt=${latestStats.scrapedAt}`);
          
          // Check for previous snapshot BEFORE recording the new one
          const previousSnapshot = getLatestSnapshot(extensionId);
          
          // Record the new snapshot
          recordSnapshot(
            extensionId,
            latestStats.users,
            latestStats.rating,
            latestStats.reviews,
            latestStats.scrapedAt
          );
          
          if (previousSnapshot) {
            const changes = detectChanges(
              {
                users: previousSnapshot.users,
                rating: previousSnapshot.rating,
                reviews: previousSnapshot.reviews
              },
              latestStats
            );

            if (Object.keys(changes).length > 0) {
              logger.info(`Changes detected for ${latestStats.name}`);

              // Record each change
              for (const [changeType, changeData] of Object.entries(changes)) {
                recordChange(
                  extensionId,
                  changeType,
                  changeData.old.toString(),
                  changeData.new.toString()
                );
              }

              // Send notification if enabled
              const notifyOnChange = process.env.NOTIFY_ON_CHANGE;
              logger.info(`[EMAIL] NOTIFY_ON_CHANGE setting: "${notifyOnChange}"`);
              
              if (process.env.NOTIFY_ON_CHANGE !== 'false') {
                logger.info(`[EMAIL] Email notifications enabled, sending change notification for ${latestStats.name}`);
                logger.info(`[EMAIL] Calling sendExtensionNotification for ${latestStats.name}...`);
                await sendExtensionNotification(latestStats.name, latestStats.url, changes);
                logger.info(`[EMAIL] sendExtensionNotification completed for ${latestStats.name}`);
              } else {
                logger.info(`[EMAIL] Email notifications disabled (NOTIFY_ON_CHANGE=${notifyOnChange})`);
              }
            }
          } else {
            logger.info(`First snapshot recorded for ${latestStats.name} - initial baseline`);
            
            // Send initial notification with baseline values
            const notifyOnChange = process.env.NOTIFY_ON_CHANGE;
            logger.info(`[EMAIL] NOTIFY_ON_CHANGE setting: "${notifyOnChange}"`);
            
            if (process.env.NOTIFY_ON_CHANGE !== 'false') {
              logger.info(`[EMAIL] Email notifications enabled, preparing initial notification for ${latestStats.name}`);
              const initialChanges = {
                users: {
                  old: 0,
                  new: latestStats.users,
                  diff: latestStats.users,
                  label: `Users: ${latestStats.users}`
                },
                rating: {
                  old: 0,
                  new: latestStats.rating,
                  diff: latestStats.rating,
                  label: `Rating: ${latestStats.rating}`
                },
                reviews: {
                  old: 0,
                  new: latestStats.reviews,
                  diff: latestStats.reviews,
                  label: `Reviews: ${latestStats.reviews}`
                }
              };
              logger.info(`[EMAIL] Calling sendExtensionNotification for ${latestStats.name}...`);
              await sendExtensionNotification(latestStats.name, latestStats.url, initialChanges, true);
              logger.info(`[EMAIL] sendExtensionNotification completed for ${latestStats.name}`);
            } else {
              logger.info(`[EMAIL] Email notifications disabled (NOTIFY_ON_CHANGE=${notifyOnChange})`);
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing extension ${ext.name}: ${error.message}`);
      }
    }

    // Process any unsent changes
    const unsentChanges = getUnsentChanges();
    if (unsentChanges.length > 0) {
      logger.info(`Found ${unsentChanges.length} unsent changes`);
      // Mark as emailed to prevent spam
      const changeIds = unsentChanges.map(c => c.id);
      markAsEmailed(changeIds);
    }

    logger.info('Monitoring cycle completed');
  } catch (error) {
    logger.error(`Monitoring cycle failed: ${error.message}`);
  }
}

/**
 * Start scheduler
 */
function startScheduler() {
  const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL || '60');
  
  logger.info(`Starting scheduler with ${intervalMinutes} minute interval`);

  // Run immediately on start
  runMonitoringCycle().catch(error => {
    logger.error(`Initial monitoring cycle failed: ${error.message}`);
  });

  // Schedule recurring job
  monitoringJob = schedule.scheduleJob(`*/${intervalMinutes} * * * *`, () => {
    runMonitoringCycle().catch(error => {
      logger.error(`Scheduled monitoring cycle failed: ${error.message}`);
    });
  });

  logger.info('Scheduler started successfully');
}

/**
 * Stop scheduler
 */
function stopScheduler() {
  if (monitoringJob) {
    monitoringJob.cancel();
    logger.info('Scheduler stopped');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runMonitoringCycle
};
