const fs = require('fs');
const path = require('path');

// Create a simple PNG icon using Node.js Buffer (16x16 transparent icon with "CS" text-like pattern)
// This is a basic 16x16 PNG with a simple pattern

function createBasicIcon() {
  // Simple 16x16 PNG with a chart-like icon
  // PNG signature + IHDR + IDAT chunks
  const pngData = Buffer.from([
    // PNG signature
    137, 80, 78, 71, 13, 10, 26, 10,
    
    // IHDR chunk (16x16, 8-bit RGBA)
    0, 0, 0, 13, // Length: 13 bytes
    73, 72, 68, 82, // "IHDR"
    0, 0, 0, 16, // Width: 16
    0, 0, 0, 16, // Height: 16
    8, // Bit depth: 8
    6, // Color type: RGBA
    0, 0, 0, // Compression, filter, interlace
    31, 21, 96, 137, // CRC
    
    // IDAT chunk (compressed image data - simple blue/white chart pattern)
    0, 0, 1, 7, // Length
    73, 68, 65, 84, // "IDAT"
    120, 156, 237, 211, 49, 10, 128, 48, 12, 4, 208, 188, 167, 232, 222, 165,
    187, 119, 47, 94, 161, 67, 15, 165, 208, 161, 148, 138, 62, 192, 75, 72,
    8, 73, 50, 16, 33, 187, 239, 238, 174, 156, 115, 206, 153, 115, 102, 189,
    90, 149, 231, 121, 158, 215, 235, 253, 62, 159, 223, 239, 247, 251, 253,
    254, 127, 192, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193,
    96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 254, 1, 140, 6, 131, 193,
    96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24,
    12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131,
    193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48,
    24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6,
    131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96,
    48, 24, 12, 6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 24, 12,
    6, 131, 193, 96, 48, 24, 12, 6, 131, 193, 96, 48, 252, 7, 28, 12, 6,
    131, 193, 96, 48, 248, 31, 240, 255, 3, 39, 151, 29, 142, 146, 37, 89,
    48, // CRC placeholder
    
    // IEND chunk
    0, 0, 0, 0, // Length: 0
    73, 69, 78, 68, // "IEND"
    174, 66, 96, 130 // CRC
  ]);
  
  return pngData;
}

// Alternative: Create SVG icon and save (better quality, scalable)
function createSvgIcon() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285f4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a73e8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="128" cy="128" r="120" fill="url(#grad)" />
  
  <!-- Chart bars -->
  <rect x="50" y="140" width="30" height="50" fill="white" opacity="0.9" rx="3" />
  <rect x="95" y="110" width="30" height="80" fill="white" opacity="0.9" rx="3" />
  <rect x="140" y="90" width="30" height="100" fill="white" opacity="0.9" rx="3" />
  <rect x="185" y="120" width="30" height="70" fill="white" opacity="0.9" rx="3" />
  
  <!-- Trend line -->
  <path d="M 50 150 L 110 120 L 155 100 L 200 130" 
        stroke="white" stroke-width="4" fill="none" 
        stroke-linecap="round" stroke-linejoin="round" opacity="0.7" />
  
  <!-- Dots on trend line -->
  <circle cx="50" cy="150" r="5" fill="white" />
  <circle cx="110" cy="120" r="5" fill="white" />
  <circle cx="155" cy="100" r="5" fill="white" />
  <circle cx="200" cy="130" r="5" fill="white" />
</svg>`;
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create icons
console.log('Creating application icons...');

// Save PNG icon
const pngPath = path.join(assetsDir, 'icon.png');
fs.writeFileSync(pngPath, createBasicIcon());
console.log(`✓ Created: ${pngPath}`);

// Save SVG icon (for future use)
const svgPath = path.join(assetsDir, 'icon.svg');
fs.writeFileSync(svgPath, createSvgIcon(), 'utf-8');
console.log(`✓ Created: ${svgPath}`);

console.log('\nIcons created successfully!');
console.log('Note: For better quality, consider creating a proper icon using a graphics editor.');
