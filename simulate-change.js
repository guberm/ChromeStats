const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.chromestats-monitor', 'data', 'stats.db');
const db = new Database(dbPath);

console.log('\n=== SIMULATING STAT CHANGE ===\n');

// Get first extension
const ext = db.prepare(`
  SELECT id, name FROM extensions WHERE url LIKE '%/d/%' ORDER BY name LIMIT 1
`).get();

console.log(`Testing with: ${ext.name} (ID: ${ext.id})\n`);

// Get latest snapshot
const latest = db.prepare(`
  SELECT * FROM stats_snapshots 
  WHERE extension_id = ?
  ORDER BY snapshot_time DESC 
  LIMIT 1
`).get(ext.id);

console.log('Current stats:');
console.log(`  👥 Users: ${latest.users}`);
console.log(`  ⭐ Rating: ${latest.rating}`);
console.log(`  💬 Reviews: ${latest.reviews}`);

// Simulate user increase
const newUsers = latest.users + 5;
console.log(`\n📈 Simulating change: ${latest.users} → ${newUsers} users\n`);

// Update the latest snapshot
db.prepare(`
  UPDATE stats_snapshots 
  SET users = ?
  WHERE id = ?
`).run(newUsers, latest.id);

console.log('✅ Updated snapshot in database');
console.log('\nNow run: node test-monitoring.js');
console.log('This will fetch current stats and compare with the modified snapshot');
console.log('You should see a change detected and recorded!');

db.close();
