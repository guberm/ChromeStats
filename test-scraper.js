require('dotenv').config();
const { scrapeExtensionStats } = require('./src/scraper');

async function test() {
  try {
    const url = process.env.CHROME_STATS_BASE_URL;
    console.log('Testing scraper with URL:', url);
    console.log('');
    
    const stats = await scrapeExtensionStats(url);
    
    console.log('');
    console.log('Scraped extensions:');
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
