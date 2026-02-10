const db = require('./src/database');

console.log('\n=== EXTENSIONS ===');
const extensions = db.getAllExtensions();
console.log(`Total: ${extensions.length}`);
extensions.forEach(ext => {
  console.log(`\n[${ext.id}] ${ext.name}`);
  console.log(`    URL: ${ext.url}`);
  console.log(`    Added: ${ext.created_at}`);
});

console.log('\n\n=== STATS SNAPSHOTS ===');
const snapshots = db.db.prepare(`
  SELECT s.*, e.name 
  FROM stats_snapshots s
  JOIN extensions e ON e.id = s.extension_id
  ORDER BY s.snapshot_time DESC
  LIMIT 20
`).all();
console.log(`Total snapshots: ${snapshots.length}`);
snapshots.forEach(snap => {
  console.log(`\n${snap.name} (ID: ${snap.extension_id})`);
  console.log(`  Time: ${snap.snapshot_time}`);
  console.log(`  Users: ${snap.users}, Rating: ${snap.rating}, Reviews: ${snap.reviews}`);
});

console.log('\n\n=== CHANGES ===');
const changes = db.db.prepare(`
  SELECT c.*, e.name 
  FROM changes c
  JOIN extensions e ON e.id = c.extension_id
  ORDER BY c.detected_at DESC
  LIMIT 20
`).all();
console.log(`Total changes: ${changes.length}`);
if (changes.length === 0) {
  console.log('No changes recorded yet!');
} else {
  changes.forEach(change => {
    console.log(`\n${change.name} (ID: ${change.extension_id})`);
    console.log(`  Time: ${change.detected_at}`);
    console.log(`  ${change.field_changed}: ${change.old_value} → ${change.new_value}`);
  });
}

console.log('\n\n=== CHANGE DETECTION LOGIC CHECK ===');
// Check if we have at least 2 snapshots per extension to compare
const snapshotCounts = db.db.prepare(`
  SELECT extension_id, COUNT(*) as count
  FROM stats_snapshots
  GROUP BY extension_id
`).all();
console.log('Snapshots per extension:');
snapshotCounts.forEach(row => {
  const ext = extensions.find(e => e.id === row.extension_id);
  console.log(`  ${ext?.name || 'Unknown'}: ${row.count} snapshot(s)`);
});

if (snapshotCounts.every(row => row.count < 2)) {
  console.log('\n⚠️  All extensions have less than 2 snapshots.');
  console.log('Changes can only be detected after at least 2 monitoring cycles.');
  console.log('Wait for the next monitoring cycle (every 60 minutes) to see changes.');
}
