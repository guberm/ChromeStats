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

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 */
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS extensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, url)
    );

    CREATE TABLE IF NOT EXISTS stats_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extension_id INTEGER NOT NULL,
      users INTEGER,
      rating REAL,
      reviews INTEGER,
      last_updated DATETIME,
      snapshot_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extension_id INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent BOOLEAN DEFAULT 0,
      email_sent_at DATETIME,
      FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_changes_extension ON changes(extension_id);
    CREATE INDEX IF NOT EXISTS idx_changes_email_sent ON changes(email_sent);
    CREATE INDEX IF NOT EXISTS idx_stats_extension ON stats_snapshots(extension_id);
  `);
}

/**
 * Add or get extension
 */
function addExtension(name, url) {
  const stmt = db.prepare('INSERT OR IGNORE INTO extensions (name, url) VALUES (?, ?)');
  stmt.run(name, url);
  
  const getStmt = db.prepare('SELECT id FROM extensions WHERE name = ? AND url = ?');
  return getStmt.get(name, url);
}

/**
 * Get all extensions
 */
function getAllExtensions() {
  const stmt = db.prepare('SELECT * FROM extensions ORDER BY name');
  return stmt.all();
}

/**
 * Record stats snapshot
 */
function recordSnapshot(extensionId, users, rating, reviews, lastUpdated) {
  const stmt = db.prepare(`
    INSERT INTO stats_snapshots (extension_id, users, rating, reviews, last_updated)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(extensionId, users, rating, reviews, lastUpdated);
}

/**
 * Get latest snapshot for extension
 */
function getLatestSnapshot(extensionId) {
  const stmt = db.prepare(`
    SELECT * FROM stats_snapshots 
    WHERE extension_id = ? 
    ORDER BY snapshot_time DESC 
    LIMIT 1
  `);
  return stmt.get(extensionId);
}

/**
 * Record a change
 */
function recordChange(extensionId, changeType, oldValue, newValue) {
  const stmt = db.prepare(`
    INSERT INTO changes (extension_id, change_type, old_value, new_value)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(extensionId, changeType, oldValue, newValue);
}

/**
 * Get unsent changes
 */
function getUnsentChanges() {
  const stmt = db.prepare(`
    SELECT 
      c.*,
      e.name,
      e.url
    FROM changes c
    JOIN extensions e ON c.extension_id = e.id
    WHERE c.email_sent = 0
    ORDER BY c.extension_id, c.detected_at
  `);
  return stmt.all();
}

/**
 * Mark changes as emailed
 */
function markAsEmailed(changeIds) {
  if (changeIds.length === 0) return;
  
  const placeholders = changeIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    UPDATE changes 
    SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP 
    WHERE id IN (${placeholders})
  `);
  return stmt.run(...changeIds);
}

/**
 * Close database connection
 */
function closeDatabase() {
  db.close();
}

module.exports = {
  db,
  initializeDatabase,
  addExtension,
  getAllExtensions,
  recordSnapshot,
  getLatestSnapshot,
  recordChange,
  getUnsentChanges,
  markAsEmailed,
  closeDatabase
};
