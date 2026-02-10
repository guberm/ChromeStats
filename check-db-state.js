const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.chromestats-monitor', 'data', 'stats.db');
const db = new Database(dbPath);

console.log('\n=== EXTENSION SNAPSHOTS ===\n');
const snapshots = db.prepare(`
  SELECT e.id, e.name, e.url, COUNT(s.id) as snapshot_count,
         MIN(s.snapshot_time) as first_snapshot,
         MAX(s.snapshot_time) as latest_snapshot
  FROM extensions e
  LEFT JOIN stats_snapshots s ON e.id = s.extension_id
  WHERE e.url LIKE '%/d/%'
  GROUP BY e.id
  ORDER BY e.name
`).all();

snapshots.forEach(ext => {
  console.log(`📊 ${ext.name}`);
  console.log(`   ID: ${ext.id}`);
  console.log(`   Snapshots: ${ext.snapshot_count}`);
  if (ext.snapshot_count > 0) {
    console.log(`   First: ${ext.first_snapshot}`);
    console.log(`   Latest: ${ext.latest_snapshot}`);
  }
  console.log();
});

console.log('\n=== CHANGES ===\n');
const changes = db.prepare(`
  SELECT c.*, e.name
  FROM changes c
  JOIN extensions e ON e.id = c.extension_id
  ORDER BY c.detected_at DESC
  LIMIT 20
`).all();

if (changes.length === 0) {
  console.log('❌ No changes recorded yet!\n');
  console.log('Why?');
  console.log('  • Changes are detected by comparing TWO snapshots');
  console.log('  • First monitoring cycle = first snapshot (nothing to compare)');
  console.log('  • Second cycle = compare new vs old → record changes');
  console.log('\nNext steps:');
  console.log('  1. Wait for next monitoring cycle (every 60 minutes)');
  console.log('  2. Or manually change stats and run: node test-monitoring.js');
  console.log('  3. Changes will appear in Change History tab');
} else {
  console.log(`✅ Found ${changes.length} changes:\n`);
  changes.forEach(change => {
    console.log(`${change.name} - ${change.change_type}`);
    console.log(`  ${change.old_value} → ${change.new_value}`);
    console.log(`  ${change.detected_at}`);
    console.log();
  });
}

db.close();
