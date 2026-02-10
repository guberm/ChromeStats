# Chrome Stats Monitor

Monitor Chrome Web Store extension statistics and receive email notifications when stats change for each extension separately.

## Features

- **Automated Monitoring**: Scrapes Chrome Web Store stats at configurable intervals
- **Change Detection**: Tracks changes in user count, rating, and review count
- **Per-Extension Alerts**: Sends individual email notifications for each extension that changes
- **State Tracking**: Maintains a local SQLite database of all snapshots and detected changes
- **Batch Processing**: Optional batch email notifications for multiple changes
- **Configurable Intervals**: Set monitoring frequency as needed (default: 60 minutes)
- **Detailed Logging**: Comprehensive logging to console and file

## Installation

### Prerequisites

- Node.js 14+
- npm or yarn
- Gmail account (for email notifications)

### Quick Start

**On Windows:**
```cmd
git clone https://github.com/guberm/ChromeStats.git
cd ChromeStats
npm install
copy .env.example .env
npm start
```

**On macOS/Linux:**
```bash
git clone https://github.com/guberm/ChromeStats.git
cd ChromeStats
npm install
cp .env.example .env
npm start
```

### Configuration

1. **Copy environment template**
   - Windows: `copy .env.example .env`
   - macOS/Linux: `cp .env.example .env`

2. **Edit `.env` and set your values:**
   ```env
   # Your Chrome Stats dashboard URL
   CHROME_STATS_BASE_URL=https://chrome-stats.com/a/YOUR_ID
   
   # Gmail configuration
   EMAIL_SERVICE=gmail
   EMAIL_SENDER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_RECIPIENT=your-email@gmail.com
   
   # Monitoring settings
   MONITOR_INTERVAL=60
   NOTIFY_ON_CHANGE=true
   LOG_LEVEL=info
   ```

3. **Gmail Setup** (Required for email notifications)
   - Go to [Google Account](https://myaccount.google.com)
   - Enable **2-Step Verification** if not already enabled
   - Generate an [App Password](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer" (or your OS)
   - Copy the 16-character password to `.env` as `EMAIL_PASSWORD`

## Usage

### Start the monitor

```bash
npm start
```

You should see:
```
[2026-02-10T12:00:00.000Z] [INFO] Chrome Stats Monitor - Starting
[2026-02-10T12:00:00.000Z] [INFO] Initializing database...
[2026-02-10T12:00:00.000Z] [INFO] Initializing email service...
[2026-02-10T12:00:00.000Z] [INFO] Starting monitoring scheduler...
[2026-02-10T12:00:00.000Z] [INFO] Application initialized successfully
```

### Development mode (with auto-restart)

```bash
npm run dev
```

### How it Works

1. **Initialization**: 
   - Creates/initializes SQLite database
   - Validates Gmail credentials
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
