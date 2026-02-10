const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Determine database path - use user's home directory for both Electron and CLI modes
const homeDir = os.homedir();
const appDataDir = path.join(homeDir, '.chromestats-monitor', 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

const dbPath = path.join(appDataDir, 'stats.db');
const db = new Database(dbPath);

/**
 * Get all extensions with their latest stats
 */
function getExtensions() {
  const stmt = db.prepare(`
    SELECT 
      e.id,
      e.name,
      e.url,
      e.created_at,
      COALESCE(s.users, 0) as users,
      COALESCE(s.rating, 0) as rating,
      COALESCE(s.reviews, 0) as reviews,
      s.snapshot_time as last_checked
    FROM extensions e
    LEFT JOIN (
      SELECT extension_id, users, rating, reviews, snapshot_time
      FROM stats_snapshots
      WHERE (extension_id, snapshot_time) IN (
        SELECT extension_id, MAX(snapshot_time)
        FROM stats_snapshots
        GROUP BY extension_id
      )
    ) s ON e.id = s.extension_id
    WHERE e.url LIKE '%/d/%'
    ORDER BY e.name
  `);
  return stmt.all();
}

/**
 * Get extension stats summary
 */
function getExtensionStats(extensionId) {
  const stmt = db.prepare(`
    SELECT * FROM extensions WHERE id = ?
  `);
  const extension = stmt.get(extensionId);

  const latestStmt = db.prepare(`
    SELECT * FROM stats_snapshots 
    WHERE extension_id = ? 
    ORDER BY snapshot_time DESC 
    LIMIT 1
  `);
  const latest = latestStmt.get(extensionId);

  const changesStmt = db.prepare(`
    SELECT COUNT(*) as count FROM changes WHERE extension_id = ?
  `);
  const changes = changesStmt.get(extensionId);

  return {
    extension,
    latest,
    totalChanges: changes.count
  };
}

/**
 * Get extension history for charts
 */
function getExtensionHistory(extensionId, hours = 168) {
  const stmt = db.prepare(`
    SELECT 
      users,
      rating,
      reviews,
      snapshot_time
    FROM stats_snapshots
    WHERE extension_id = ?
    AND datetime(snapshot_time) >= datetime('now', '-${hours} hours')
    ORDER BY snapshot_time ASC
  `);
  return stmt.all(extensionId);
}

/**
 * Get recent changes
 */
function getRecentChanges(limit = 50) {
  const stmt = db.prepare(`
    SELECT 
      c.*,
      e.name as extension_name,
      e.url as extension_url
    FROM changes c
    JOIN extensions e ON c.extension_id = e.id
    ORDER BY c.detected_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Add extension
 */
function addExtension(name, url) {
  const stmt = db.prepare('INSERT INTO extensions (name, url) VALUES (?, ?)');
  const result = stmt.run(name, url);
  return { id: result.lastInsertRowid, name, url };
}

/**
 * Delete extension
 */
function deleteExtension(extensionId) {
  const stmt = db.prepare('DELETE FROM extensions WHERE id = ?');
  stmt.run(extensionId);
  return { success: true };
}

/**
 * Get dashboard summary stats
 */
function getDashboardStats() {
  const totalExtensions = db.prepare("SELECT COUNT(*) as count FROM extensions WHERE url LIKE '%/d/%'").get();
  const totalChanges = db.prepare('SELECT COUNT(*) as count FROM changes WHERE datetime(detected_at) >= datetime("now", "-24 hours")').get();
  const activeMonitoring = db.prepare('SELECT COUNT(DISTINCT extension_id) as count FROM stats_snapshots WHERE datetime(snapshot_time) >= datetime("now", "-2 hours")').get();
  
  return {
    totalExtensions: totalExtensions.count,
    changesLast24h: totalChanges.count,
    activeMonitoring: activeMonitoring.count
  };
}

module.exports = {
  getExtensions,
  getExtensionStats,
  getExtensionHistory,
  getRecentChanges,
  addExtension,
  deleteExtension,
  getDashboardStats
};
