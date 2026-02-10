const axios = require('axios');
const cheerio = require('cheerio');

async function debug() {
  try {
    const url = 'https://chrome-stats.com/a/TWljaGFlbCBHdWJlcg';
    console.log('Fetching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('\n=== EXTENSION LINKS ANALYSIS ===');
    const links = [];
    $('a[href*="/d/"]').each((i, el) => {
      const $link = $(el);
      const name = $link.text().trim();
      if (name && !links.find(l => l.name === name)) {
        links.push({
          name,
          href: $link.attr('href'),
          index: i
        });
      }
    });
    
    console.log(`Found ${links.length} unique extensions:`);
    links.forEach((link, i) => {
      console.log(`\n[${i}] ${link.name}`);
      console.log(`    href: ${link.href}`);
    });
    
    console.log('\n=== STATS PATTERN TEST ===');
    const pattern = /(\d+)\s+([0-9.]+)\s*\((\d+)\)/;
    $('a[href*="/d/"]').each((i, el) => {
      const $link = $(el);
      const name = $link.text().trim();
      const $container = $link.closest('div, section, article');
      const text = $container.text();
      const match = text.match(pattern);
      
      console.log(`\n${name}:`);
      console.log(`  Container: ${$container[0]?.name || 'none'}`);
      console.log(`  Text length: ${text.length}`);
      console.log(`  First 200 chars: "${text.substring(0, 200)}"`);
      console.log(`  Match: ${match ? `[${match[1]}, ${match[2]}, ${match[3]}]` : 'NO MATCH'}`);
      
      if (i >= 2) return false; // Only first 3
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
