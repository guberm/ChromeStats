# Chrome Stats Monitor - Desktop App

## Running the Desktop Application

### Development Mode
```bash
npm run app
```
This will launch the Electron desktop application with the full GUI interface.

### Building Executable
```bash
# Build for Windows
npm run build:win
```

The executable will be created in the `dist` folder.

## Features

✨ **Dashboard Interface**
- Real-time extension statistics display
- Visual charts for historical trend analysis  
- Extension management (add/remove)
- Manual refresh trigger

📊 **Charts & Analytics**
- Historical data visualization using Chart.js
- Customizable time ranges (24h, 7d, 30d)
- Multiple metrics tracked (Users, Rating, Reviews)

⚙️ **Settings**
- Configure monitoring interval
- Email notification toggle
- Change detection settings

🔔 **System Tray**
- Minimize to system tray
- Quick access menu
- Background monitoring

## Architecture

- **Main Process**: `electron/main.js` - Electron app entry point
- **Renderer Process**: `electron/dashboard.html` + `electron/dashboard.js` - UI
- **IPC Bridge**: `electron/preload.js` - Secure communication layer
- **Database API**: `electron/database-api.js` - Query functions for UI
- **Backend**: `src/` - Core monitoring logic (shared with CLI mode)

## Running Modes

1. **CLI Mode** (background service):
   ```bash
   npm start
   ```

2. **Desktop App Mode** (GUI interface):
   ```bash
   npm run app
   ```

Both modes can run simultaneously if needed!
