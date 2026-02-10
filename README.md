# Chrome Stats Monitor

🚀 Desktop application for monitoring Chrome Web Store extension statistics with real-time notifications and historical tracking.

## ✨ Features

### Desktop Application
- **🖥️ Electron UI**: Beautiful desktop interface with tabbed navigation
- **📊 Real-time Dashboard**: View all extensions, stats, and changes at a glance
- **📈 Historical Charts**: Visualize stat changes over time with Chart.js
- **🔔 System Notifications**: Get desktop alerts when stats change
- **🎯 System Tray**: Minimize to tray, monitoring continues in background
- **⚡ Quick Actions**: Manual refresh, start/stop monitoring from tray menu

### Monitoring & Tracking
- **🔍 Automated Monitoring**: Scrapes Chrome Web Store stats at configurable intervals
- **👥 Profile Tracking**: Monitor ALL extensions from a developer profile automatically
- **📉 Change Detection**: Tracks users, rating, and review count changes
- **💾 Local Database**: SQLite storage with complete historical data
- **📧 Email Alerts**: Per-extension notifications when stats change
- **🔄 Background Service**: Console mode for server/headless operation

### Data & Analytics
- **📊 Historical Data**: View stat changes over 24h, 7d, 30d periods
- **🔍 Change History**: Complete log of all detected changes
- **📁 Export Ready**: Data stored in portable SQLite format
- **🎨 Visual Charts**: Line charts with multiple metrics

## 🛠️ Tech Stack

- **Electron 28.3.3** - Cross-platform desktop framework
- **Node.js** - Backend service and scraping
- **better-sqlite3** - Fast local database
- **Chart.js 4.4.0** - Data visualization
- **Cheerio** - Web scraping
- **Nodemailer** - Email notifications

## 📦 Installation

### Option 1: Download Release (Easiest)
1. Download `Chrome Stats Monitor Setup 1.0.0.exe` from releases
2. Run the installer
3. Launch the app
4. Configure settings and add extensions

### Option 2: Build from Source

```bash
# Clone repository
git clone https://github.com/guberm/ChromeStats.git
cd ChromeStats

# Install dependencies
npm install

# Copy environment template
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux

# Edit .env with your settings

# Run in Electron mode
npm run app

# Or run in console mode
npm start

# Build Windows installer
npm run build:win
```

## ⚙️ Configuration

### 1. Email Setup (Optional but Recommended)

Create `.env` file with Gmail credentials:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=your-email@gmail.com

# Monitoring Settings
MONITOR_INTERVAL=60
NOTIFY_ON_CHANGE=true
LOG_LEVEL=info
```

**Get Gmail App Password:**
1. Go to [Google Account](https://myaccount.google.com)
2. Enable 2-Step Verification
3. Generate [App Password](https://myaccount.google.com/apppasswords)
4. Copy 16-character password to `.env`

### 2. Add Extensions to Monitor

**Via UI:**
1. Click "➕ Add Extension" button
2. Enter profile URL: `https://chrome-stats.com/a/YOUR_PROFILE_ID`
3. App automatically discovers and tracks all your extensions

**Via Console:**
Extensions are auto-discovered when you add a profile URL.

## 🎯 Usage

### Desktop Mode (Recommended)

```bash
npm run app
```

Features:
- Dashboard with extension overview
- Historical charts and analytics
- Change history viewer
- Settings management
- System tray integration

**Tray Menu:**
- 📈 Show Dashboard
- 🔄 Run Check Now
- ▶️ Start/Stop Monitoring
- ❌ Quit

### Console Mode (Headless)

```bash
npm start
```

Perfect for:
- Running on servers
- Background monitoring
- CI/CD integration
- Scheduled tasks

## 📊 Data Storage

All data stored locally in:
```
~/.chromestats-monitor/
└── data/
    └── stats.db    # SQLite database
```

Database includes:
- **extensions** - Tracked extensions
- **stats_snapshots** - Historical stat records
- **changes** - Detected changes log

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev          # Console with auto-restart
npm run app          # Electron UI

# Build production
npm run build:win    # Windows installer
npm run build:mac    # macOS (if on Mac)
npm run build:linux  # Linux (if on Linux)

# Test scraper
node test-scraper.js

# Test monitoring
node test-monitoring.js

# Check database
node check-db-state.js
```

## 📁 Project Structure

```
ChromeStats/
├── electron/          # Electron UI
│   ├── main.js       # Main process
│   ├── preload.js    # IPC bridge
│   ├── dashboard.html # UI markup
│   ├── dashboard.js   # UI logic
│   └── styles.css     # Styling
├── src/              # Core logic (shared)
│   ├── index.js      # CLI entry point
│   ├── database.js   # SQLite operations
│   ├── scraper.js    # Web scraping
│   ├── scheduler.js  # Monitoring scheduler
│   ├── email.js      # Email service
│   └── logger.js     # Logging
├── assets/           # Icons and resources
├── .env             # Configuration (gitignored)
├── .env.example     # Template
└── package.json     # Dependencies
```

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🐛 Known Issues

- Icon generation creates basic PNG (use custom icon for better quality)
- First monitoring cycle has no changes (baseline established)
- Chart requires container to be visible (fixed with setTimeout)

## 💡 Tips

- **First Run**: No changes will be detected initially (baseline)
- **Testing Changes**: Use `simulate-change.js` to test notifications
- **Multiple Profiles**: You can track extensions from multiple developer profiles
- **Email Testing**: Check Gmail app password if emails not sending
- **Database Reset**: Delete `~/.chromestats-monitor/data/stats.db` to start fresh

## 🎯 Roadmap

- [ ] Custom application icon
- [ ] macOS/Linux builds
- [ ] Export data to CSV/JSON
- [ ] Advanced filtering and search
- [ ] Multiple notification channels (Slack, Discord, etc.)
- [ ] Web dashboard (remote monitoring)

---

Built with ❤️ for Chrome extension developers by Michael Guber

**Support**: [Issues](https://github.com/guberm/ChromeStats/issues) | **Star**: ⭐ if you find it useful!
   - Sets up monitoring schedule

2. **Monitoring Cycle** (runs at your configured interval):
   - Scrapes the Chrome Stats URL
   - Compares current stats with previous snapshot
   - Detects changes in **users**, **rating**, and **reviews**
   - Records changes to database with timestamps
   - **Sends per-extension email notification** (if changes detected)

3. **Email Notifications**:
   - Professional HTML and plain-text format
   - Shows old → new values with change delta
   - Extension link to Chrome Stats page
   - Detection timestamp included
   - Separate email for each extension that changes

4. **Graceful Shutdown**: 
   - Press `Ctrl+C` to stop
   - Closes database properly
   - Stops scheduler

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHROME_STATS_BASE_URL` | The Chrome Stats URL to monitor | Required |
| `EMAIL_SERVICE` | Email provider (gmail, etc) | gmail |
| `EMAIL_SENDER` | Sender email address | Required |
| `EMAIL_PASSWORD` | Email password or app password | Required |
| `EMAIL_RECIPIENT` | Where to send notifications | Required |
| `MONITOR_INTERVAL` | Check interval in minutes | 60 |
| `NOTIFY_ON_CHANGE` | Send email on detected changes | true |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | info |

## Database Schema

### extensions
- `id`: Primary key
- `name`: Extension name
- `url`: Chrome Stats URL
- `created_at`: When added to monitoring

### stats_snapshots
- `id`: Primary key
- `extension_id`: FK to extensions
- `users`: User count snapshot
- `rating`: Rating snapshot
- `reviews`: Review count snapshot
- `last_updated`: Last update timestamp
- `snapshot_time`: When snapshot was taken

### changes
- `id`: Primary key
- `extension_id`: FK to extensions
- `change_type`: Type of change (users, rating, reviews)
- `old_value`: Previous value
- `new_value`: Current value
- `detected_at`: When change was detected
- `email_sent`: Whether notification was sent
- `email_sent_at`: When notification was sent

## Email Notifications

When changes are detected, you'll receive an email like:

```
╔═══════════════════════════════════════╗
║     Chrome Stats Update Report        ║
╚═══════════════════════════════════════╝

Extension: Your Extension Name
URL: https://chrome-stats.com/a/...

Changes Detected:
  • Users: 1000 → 1050 (+50)
  • Rating: 4.5 → 4.6 (+0.10)
  • Reviews: 250 → 260 (+10)

Detected at: 2/10/2026, 12:00:00 PM
```

Plus a beautifully formatted HTML version with:
- Gradient header with extension name
- Color-coded metrics (green for new values, blue for changes)
- Emoji icons for each metric type
- Direct link to extension page

## Logs

All activity is logged to both console and `data/monitor.log`:

```bash
# View live logs
tail -f data/monitor.log

# Windows PowerShell
Get-Content -Path data/monitor.log -Wait
```

## Troubleshooting

### Emails not sending
- ✓ Verify `EMAIL_SENDER` and `EMAIL_PASSWORD` are set in `.env`
- ✓ Confirm 2-Step Verification is **enabled** on your Google Account
- ✓ Use an [App Password](https://myaccount.google.com/apppasswords), **NOT** your regular Gmail password
- ✓ Check log: `data/monitor.log` for specific error messages
- ✓ Verify Gmail hasn't blocked the connection attempt

### Scraping issues
- ✓ Verify Chrome Stats URL is correct and accessible
- ✓ Check your internet connection
- ✓ The website structure may change - update CSS selectors in `src/scraper.js`
- ✓ Wait at least one cycle before changes are detected (need 2 snapshots to compare)

### Database locked errors
- ✓ Ensure only one instance of the monitor is running
- ✓ Delete `data/stats.db` and restart to reset the database
- ✓ Check file permissions on `data/` directory

### No changes detected
- ✓ First run always needs 2 snapshots - wait for next cycle
- ✓ Check if `MONITOR_INTERVAL` is too long (default: 60 minutes)
- ✓ Check logs: `data/monitor.log` for scraping success

## Project Structure

```
ChromeStats/
├── src/
│   ├── index.js          # Main entry point
│   ├── database.js       # Database operations
│   ├── scraper.js        # Web scraping logic
│   ├── email.js          # Email notifications
│   ├── scheduler.js      # Monitoring scheduler
│   └── logger.js         # Logging utility
├── data/                 # Data directory
│   ├── stats.db          # SQLite database
│   └── monitor.log       # Application logs
├── config/               # Configuration files
├── package.json          # Node dependencies
├── .env.example         # Environment template
└── README.md            # This file
```

## FAQ

**Q: How do I monitor multiple extensions?**
A: Currently tracks the dashboard URL you provide. The tool detects all extensions listed on that page.

**Q: Can I change the monitoring interval?**
A: Yes! Set `MONITOR_INTERVAL` in `.env`. Use minutes: `5`, `30`, `60`, `1440` (daily), etc.

**Q: Can I disable emails but keep logging?**
A: Yes, set `NOTIFY_ON_CHANGE=false` to disable emails while still recording data.

**Q: How long are email notifications delayed?**
A: Notifications are sent immediately when changes are detected during the monitoring cycle.

**Q: Can I run this on a VPS/Server?**
A: Yes! It's a Node.js app that runs anywhere. Use `npm start` in detached mode or set up systemd service.

## License

MIT - Feel free to use and modify

## Support

Check `data/monitor.log` for detailed information about what's happening. Most issues can be resolved by:
1. Verifying `.env` configuration
2. Checking the logs
3. Ensuring Gmail App Password is set correctly
