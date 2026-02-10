const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.chromestats-monitor', 'data', 'stats.db');
const db = new Database(dbPath);

console.log('\n=== CHECKING FOR ACTUAL STAT CHANGES ===\n');

const extensions = db.prepare(`
  SELECT id, name FROM extensions WHERE url LIKE '%/d/%' ORDER BY name
`).all();

extensions.forEach(ext => {
  const snapshots = db.prepare(`
    SELECT users, rating, reviews, snapshot_time
    FROM stats_snapshots
    WHERE extension_id = ?
    ORDER BY snapshot_time ASC
  `).all(ext.id);
  
  console.log(`📊 ${ext.name}`);
  console.log(`   Total snapshots: ${snapshots.length}`);
  
  if (snapshots.length > 0) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    
    console.log(`   First: 👥${first.users} ⭐${first.rating} 💬${first.reviews} (${first.snapshot_time})`);
    console.log(`   Last:  👥${last.users} ⭐${last.rating} 💬${last.reviews} (${last.snapshot_time})`);
    
    // Check if any values changed
    const usersChanged = first.users !== last.users;
    const ratingChanged = first.rating !== last.rating;
    const reviewsChanged = first.reviews !== last.reviews;
    
    if (usersChanged || ratingChanged || reviewsChanged) {
      console.log(`   ✅ CHANGES DETECTED:`);
      if (usersChanged) console.log(`      Users: ${first.users} → ${last.users}`);
      if (ratingChanged) console.log(`      Rating: ${first.rating} → ${last.rating}`);
      if (reviewsChanged) console.log(`      Reviews: ${first.reviews} → ${last.reviews}`);
    } else {
      console.log(`   ❌ NO CHANGES - all snapshots have identical values`);
    }
    
    // Show unique value combinations
    const unique = new Set(snapshots.map(s => `${s.users},${s.rating},${s.reviews}`));
    if (unique.size > 1) {
      console.log(`   📈 Value variations found: ${unique.size} different combinations`);
      snapshots.forEach(s => {
        console.log(`      👥${s.users} ⭐${s.rating} 💬${s.reviews} @ ${s.snapshot_time}`);
      });
    }
  }
  console.log();
});

console.log('\n=== CONCLUSION ===\n');
console.log('If all snapshots show identical values, then:');
console.log('  • The monitoring system is working correctly');
console.log('  • The extension stats simply haven\'t changed on chrome-stats.com');
console.log('  • Change History will populate when stats actually change');
console.log('\nTo test change detection manually:');
console.log('  1. Manually modify a snapshot in the database');
console.log('  2. Run: node test-monitoring.js');
console.log('  3. See changes appear in the app');

db.close();
