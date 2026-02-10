const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.chromestats-monitor', 'data', 'stats.db');
const db = new Database(dbPath);

const extensions = db.prepare('SELECT * FROM extensions').all();
console.log('Extensions in database:');
extensions.forEach(e => {
  console.log(`  ID: ${e.id}, Name: ${e.name}`);
  console.log(`      URL: ${e.url}`);
});
console.log('Total:', extensions.length);

db.close();
