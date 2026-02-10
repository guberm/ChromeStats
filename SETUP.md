# Chrome Stats Monitor - Setup Guide

## Quick Start

### 1. Configure Environment Variables

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# The Chrome Stats URL you want to monitor
CHROME_STATS_BASE_URL=https://chrome-stats.com/a/TWljaGFlbCBHdWJlcg

# Gmail Configuration
EMAIL_SERVICE=gmail
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=your-email@gmail.com

# Monitoring frequency (minutes)
MONITOR_INTERVAL=60

# Enable/disable email notifications
NOTIFY_ON_CHANGE=true

# Logging level
LOG_LEVEL=info
```

### 2. Gmail Setup (Required for Email Notifications)

1. Go to [Google Account](https://myaccount.google.com)
2. Enable **2-Step Verification** if not already enabled
3. Generate an [App Password](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer"
5. Copy the generated 16-character password
6. Replace `EMAIL_PASSWORD` in `.env` with this password

### 3. Start Monitoring

```bash
npm start
```

You should see output like:
```
[2024-01-10T12:00:00.000Z] [INFO] Chrome Stats Monitor - Starting
[2024-01-10T12:00:00.000Z] [INFO] Initializing database...
[2024-01-10T12:00:00.000Z] [INFO] Initializing email service...
[2024-01-10T12:00:00.000Z] [INFO] Starting monitoring scheduler...
[2024-01-10T12:00:00.000Z] [INFO] Application initialized successfully
```

### 4. Monitor Logs

Logs are saved to `data/monitor.log`. Check them for:
- Successful monitoring cycles
- Detected changes
- Email notification status
- Any errors

## Features Explained

### Per-Extension Notifications
Each extension that shows changes will receive its own email notification with:
- Extension name and link
- Specific changes (user count, rating, reviews)
- Change timestamps

### Change Detection
Monitored metrics:
- **Users**: Total number of users
- **Rating**: Average user rating (0-5 stars)
- **Reviews**: Total number of reviews

### Database
All data is stored in `data/stats.db`:
- Historical snapshots of all metrics
- Change records with before/after values
- Email notification status

## Advanced Configuration

### Change Monitoring Interval
Set in `.env`:
- `MONITOR_INTERVAL=5` - Check every 5 minutes
- `MONITOR_INTERVAL=60` - Check every hour (default)
- `MONITOR_INTERVAL=1440` - Check once per day

### Disable Email Notifications
```env
NOTIFY_ON_CHANGE=false
```

### Debug Mode
```env
LOG_LEVEL=debug
```

## Troubleshooting

### "Email service not available"
- Verify `EMAIL_SENDER` and `EMAIL_PASSWORD` are set in `.env`
- Ensure you're using an App Password, not your regular Gmail password
- Check Gmail hasn't blocked the sign-in attempt

### "No extensions configured for monitoring"
- The database might need initialization
- Delete `data/stats.db` and restart the application

### Scraping returns no data
- The website structure may have changed
- Verify the URL is accessible in your browser
- Check `data/monitor.log` for specific errors

### High CPU/Memory Usage
- Check if the scraper is stuck on the website
- Adjust `MONITOR_INTERVAL` to a longer interval
- Restart the application

## Development Mode

For development with auto-restart:

```bash
npm run dev
```

This uses `nodemon` to automatically restart when files change.

## Project Files Overview

| File | Purpose |
|------|---------|
| `src/index.js` | Main entry point, initializes app |
| `src/database.js` | SQLite database operations |
| `src/scraper.js` | Web scraping logic |
| `src/email.js` | Email notification service |
| `src/scheduler.js` | Monitoring job scheduler |
| `src/logger.js` | Application logging |
| `data/stats.db` | SQLite database file |
| `data/monitor.log` | Main log file |

## Support

Check `data/monitor.log` for detailed error messages and troubleshooting information.
