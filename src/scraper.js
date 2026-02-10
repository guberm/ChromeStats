const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * Scrape extension data from Chrome Stats URL
 */
async function scrapeExtensionStats(url) {
  try {
    logger.info(`Scraping stats from: ${url}`);
    
    // Use native https module to avoid Electron packaging issues with axios/undici
    const https = require('https');
    const urlParse = require('url').parse;
    
    const html = await new Promise((resolve, reject) => {
      const parsedUrl = urlParse(url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data); });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });

    const $ = cheerio.load(html);
    const extensions = [];
    const seen = new Set();

    // Get all text content and split into sections
    const fullText = $.text();
    
    // Extract unique extension names and their stats
    // Pattern: Extension name followed by stats like "NUMBER RATING(REVIEWS)"
    const extensionSections = new Map();
    
    // First, collect all unique extension links with their names and URLs
    const extensionLinks = new Map();
    $('a[href*="/d/"]').each((i, el) => {
      const $link = $(el);
      const name = $link.text().trim();
      const href = $link.attr('href');
      if (name && href && !extensionLinks.has(name)) {
        const extensionUrl = href.startsWith('http') ? href : `https://chrome-stats.com${href}`;
        extensionLinks.set(name, extensionUrl);
      }
    });

    logger.debug(`Found unique extension names: ${extensionLinks.size}`);

    // For each extension name, search the full text for its stats
    extensionLinks.forEach((extensionUrl, name) => {
      if (seen.has(name)) return;
      
      // Create a regex to find this extension name followed by stats pattern
      // Looking for: "ExtensionName ... NUMBER RATING(REVIEWS)"
      const nameRegex = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^0-9]*?(\\d+)\\s+([0-9.]+)\\s*\\((\\d+)\\)`);
      const match = fullText.match(nameRegex);
      
      if (match && match[1] && match[2] && match[3]) {
        const users = parseInt(match[1]);
        const rating = parseFloat(match[2]);
        const reviews = parseInt(match[3]);
        
        if (!isNaN(users) && !isNaN(rating) && !isNaN(reviews)) {
          seen.add(name);
          extensions.push({
            name,
            url: extensionUrl,
            users,
            rating,
            reviews,
            scrapedAt: new Date().toISOString()
          });
          logger.debug(`Found: ${name} - ${users} users, ${rating} rating, ${reviews} reviews`);
        }
      } else {
        logger.debug(`No stats found for: ${name}`);
      }
    });

    // Filter out garbage entries - keep only valid extensions
    const validExtensions = extensions.filter(ext => {
      // Skip entries where name contains common noise patterns
      if (ext.name.match(/^(download|trending|reviews?|trends?|api|debug|test|submit|upload|install|extension|google|chrome|web|store|stats|profile)$/i)) {
        logger.debug(`Filtered out garbage entry: ${ext.name}`);
        return false;
      }
      
      // Skip entries that are just numbers or too short
      if (ext.name.length < 5 || ext.name.match(/^\d+$/) || ext.name.match(/^[\d\s.()]+$/)) {
        return false;
      }
      
      // Skip entries with obviously invalid stats
      if (ext.users > 10000000 || ext.rating > 5 || ext.reviews > 100000) {
        logger.debug(`Filtered out entry with invalid stats: ${ext.name}`);
        return false;
      }
      
      // Skip entries where name looks like page fragments or urls
      if (ext.name.includes('http') || ext.name.includes('@') || ext.name.includes('/') || ext.name.length > 200) {
        return false;
      }
      
      // Skip entries that look like stats/numbers (e.g., "5.00  (1)", "94 5.00  (1)")
      if (ext.name.match(/^\s*\d+\s+\d+\.?\d*\s*\(\d+\)\s*$/)) {
        return false;
      }
      
      // Skip entries with rating=0 and reviews=0 ONLY if they also have 0 users
      // Real extensions can have users but no ratings/reviews yet
      if (ext.rating === 0 && ext.reviews === 0 && ext.users === 0) {
        return false;
      }
      
      // Skip entries that contain extensive metadata or formatting
      if (ext.name.match(/^\d+\s+\d+\.?\d*\s+\(/) || ext.name.match(/\s+https?:\/\//)) {
        return false;
      }
      
      // CRITICAL: Skip entries with creator names/IDs embedded (e.g., "Gmail Label Manager oeujin0  94 5.00  (1)")
      // Pattern: name contains rating display "X.XX (Y)" anywhere in it - indicates parsed metadata
      if (ext.name.match(/\s+\d+\.?\d*\s*\(\d+\)\s*$/)) {
        logger.debug(`Filtered out entry with embedded metadata: ${ext.name}`);
        return false;
      }
      
      // Skip entries with unusual spacing patterns indicating parsed fragments
      if (ext.name.match(/[a-z]\d{2,}\s*[a-z]/i) || ext.name.match(/\s{2,}/) || ext.name.match(/[a-z0-9]\s+\d+\s+\d+\.\d+/)) {
        logger.debug(`Filtered out entry with unusual spacing/fragments: ${ext.name}`);
        return false;
      }
      
      return true;
    });

    logger.info(`Scraped ${validExtensions.length} valid extensions (${extensions.length - validExtensions.length} filtered)`);
    return validExtensions;
  } catch (error) {
    logger.error(`Scraping error: ${error.message}`);
    throw error;
  }
}

/**
 * Detect changes between two stat sets
 */
function detectChanges(oldStats, newStats) {
  const changes = {};

  // Compare users
  if (oldStats.users !== newStats.users) {
    const diff = newStats.users - oldStats.users;
    changes.users = {
      old: oldStats.users,
      new: newStats.users,
      diff: diff,
      label: `Users: ${oldStats.users} → ${newStats.users} (${diff > 0 ? '+' : ''}${diff})`
    };
  }

  // Compare rating
  if (Math.abs(parseFloat(oldStats.rating) - parseFloat(newStats.rating)) > 0.01) {
    changes.rating = {
      old: oldStats.rating,
      new: newStats.rating,
      diff: (newStats.rating - oldStats.rating).toFixed(2),
      label: `Rating: ${oldStats.rating} → ${newStats.rating}`
    };
  }

  // Compare reviews
  if (oldStats.reviews !== newStats.reviews) {
    const diff = newStats.reviews - oldStats.reviews;
    changes.reviews = {
      old: oldStats.reviews,
      new: newStats.reviews,
      diff: diff,
      label: `Reviews: ${oldStats.reviews} → ${newStats.reviews} (${diff > 0 ? '+' : ''}${diff})`
    };
  }

  return changes;
}

module.exports = {
  scrapeExtensionStats,
  detectChanges
};
