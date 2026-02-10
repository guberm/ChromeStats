const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Load .env from multiple possible locations
const dotenv = require('dotenv');
const possibleEnvPaths = [
  path.join(__dirname, '..', '.env'),  // Development: ChromeStats/.env
  path.join(__dirname, '.env'),         // In electron folder
  path.join(os.homedir(), '.chromestats-monitor', '.env'),  // User home
  path.join(process.resourcesPath || '', '.env')  // Packaged app resources
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

let mainWindow = null;
let tray = null;
let schedulerRunning = false;
let monitoringEvents = null;
let logger = null;
let initializeDatabase = null;
let initializeEmailService = null;
let startScheduler = null;
let stopScheduler = null;
let runMonitoringCycle = null;
let dbApi = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };
  
  // Add icon only if file exists
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));

  // Show the window when ready
  mainWindow.show();

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

async function createTray() {
  const trayIconPath = path.join(__dirname, '../assets/icon.png');
  
  // Create a default icon if file doesn't exist
  let trayIcon;
  if (fs.existsSync(trayIconPath)) {
    trayIcon = nativeImage.createFromPath(trayIconPath);
    // Resize for better display on Windows
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } else {
    // Create a simple default icon (empty image)
    trayIcon = nativeImage.createEmpty();
  }
  
  if (!tray) {
    tray = new Tray(trayIcon);
  } else {
    tray.setImage(trayIcon);
  }

  // Get extension count for display
  let extensionCount = 0;
  try {
    if (dbApi) {
      const extensions = await dbApi.getExtensions();
      extensionCount = extensions.length;
    }
  } catch (err) {
    console.error('Failed to get extension count:', err);
  }

  const statusLabel = schedulerRunning ? '🟢 Monitoring Active' : '🔴 Monitoring Stopped';
  const extensionLabel = extensionCount > 0 ? `📊 Tracking ${extensionCount} extension${extensionCount !== 1 ? 's' : ''}` : '📊 No extensions tracked';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: statusLabel,
      enabled: false
    },
    {
      label: extensionLabel,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: '📈 Show Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '🔄 Run Check Now',
      click: async () => {
        if (runMonitoringCycle) {
          try {
            showNotification('Monitoring Cycle', 'Starting manual check...');
            await runMonitoringCycle();
            if (mainWindow) {
              mainWindow.webContents.send('refresh-data');
            }
            showNotification('Check Complete', 'Monitoring cycle finished successfully');
          } catch (err) {
            showNotification('Check Failed', `Error: ${err.message}`);
          }
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: schedulerRunning ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring',
      click: () => {
        if (schedulerRunning) {
          if (stopScheduler) stopScheduler();
          schedulerRunning = false;
          showNotification('Monitoring Stopped', 'Background monitoring has been paused');
        } else {
          if (startScheduler) startScheduler();
          schedulerRunning = true;
          showNotification('Monitoring Started', 'Background monitoring is now active');
        }
        createTray();
      }
    },
    {
      type: 'separator'
    },
    {
      label: '❌ Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  const tooltipText = `Chrome Stats Monitor\n${statusLabel.replace('🟢 ', '').replace('🔴 ', '')}\n${extensionLabel.replace('📊 ', '')}`;
  tray.setToolTip(tooltipText);

  tray.removeAllListeners('click');
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });

  tray.removeAllListeners('double-click');
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// Show system notification
function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '../assets/icon.png'),
      silent: false
    });
    
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
    
    notification.show();
  }
}

// Initialize application
app.whenReady().then(async () => {
  try {
    // Defer module loading until here
    logger = require('../src/logger');
    const dbModule = require('../src/database');
    initializeDatabase = dbModule.initializeDatabase;
    const emailModule = require('../src/email');
    initializeEmailService = emailModule.initializeEmailService;
    const schedulerModule = require('../src/scheduler');
    startScheduler = schedulerModule.startScheduler;
    stopScheduler = schedulerModule.stopScheduler;
    runMonitoringCycle = schedulerModule.runMonitoringCycle;
    monitoringEvents = schedulerModule.monitoringEvents;
    dbApi = require('./database-api');

    logger.info('Chrome Stats Monitor - Electron App Starting');

    // Initialize database
    initializeDatabase();

    // Initialize email service
    initializeEmailService();

    // Create window and tray
    createWindow();
    createTray();

    // Auto-start monitoring
    startScheduler();
    schedulerRunning = true;

    // Subscribe to monitoring events
    if (monitoringEvents) {
      monitoringEvents.on('changes-detected', (data) => {
        const { extensionName, changes } = data;
        const changeCount = Object.keys(changes).length;
        const changeTypes = Object.keys(changes).join(', ');
        
        showNotification(
          `📊 ${extensionName}`,
          `${changeCount} change${changeCount > 1 ? 's' : ''} detected: ${changeTypes}`
        );
        
        // Refresh UI if window is visible
        if (mainWindow && mainWindow.isVisible()) {
          mainWindow.webContents.send('refresh-data');
        }
        
        // Update tray menu to reflect new data
        createTray();
      });
    }

    // S
    // Show startup notification
    setTimeout(() => {
      showNotification('Chrome Stats Monitor', 'App started successfully. Monitoring is active.');
    }, 2000);

    logger.info('Electron app initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep app running in background
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (stopScheduler) stopScheduler();
});

// IPC Handlers
ipcMain.handle('get-extensions', async () => {
  if (dbApi) return dbApi.getExtensions();
  return [];
});

ipcMain.handle('get-extension-stats', async (event, extensionId) => {
  if (dbApi) return dbApi.getExtensionStats(extensionId);
  return {};
});

ipcMain.handle('get-extension-history', async (event, extensionId, hours) => {
  if (dbApi) return dbApi.getExtensionHistory(extensionId, hours);
  return [];
});

ipcMain.handle('get-recent-changes', async (event, limit) => {
  if (dbApi) return dbApi.getRecentChanges(limit);
  return [];
});

ipcMain.handle('add-extension', async (event, name, url) => {
  if (dbApi) return dbApi.addExtension(name, url);
  return {};
});

ipcMain.handle('delete-extension', async (event, extensionId) => {
  if (dbApi) return dbApi.deleteExtension(extensionId);
  return { success: false };
});

ipcMain.handle('run-check-now', async () => {
  if (runMonitoringCycle) {
    await runMonitoringCycle();
  }
  return { success: true };
});

ipcMain.handle('get-scheduler-status', async () => {
  return { running: schedulerRunning };
});

ipcMain.handle('toggle-scheduler', async () => {
  if (schedulerRunning) {
    if (stopScheduler) stopScheduler();
    schedulerRunning = false;
  } else {
    if (startScheduler) startScheduler();
    schedulerRunning = true;
  }
  createTray();
  return { running: schedulerRunning };
});

ipcMain.handle('get-config', async () => {
  const emailSender = process.env.EMAIL_SENDER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailRecipient = process.env.EMAIL_RECIPIENT;
  
  return {
    interval: process.env.MONITOR_INTERVAL || '60',
    emailEnabled: !!(emailSender && emailPassword),
    notifyOnChange: process.env.NOTIFY_ON_CHANGE !== 'false',
    emailSender: emailSender || 'Not configured',
    emailRecipient: emailRecipient || 'Not configured',
    emailService: process.env.EMAIL_SERVICE || 'gmail'
  };
});

ipcMain.handle('update-config', async (event, config) => {
  return { success: true, message: 'Configuration updated. Restart app to apply changes.' };
});

ipcMain.handle('update-email-config', async (event, emailConfig) => {
  try {
    // Update in-memory env vars
    process.env.EMAIL_SENDER = emailConfig.emailSender;
    process.env.EMAIL_PASSWORD = emailConfig.emailPassword;
    process.env.EMAIL_RECIPIENT = emailConfig.emailRecipient;
    if (emailConfig.emailService) {
      process.env.EMAIL_SERVICE = emailConfig.emailService;
    }
    
    // Write to .env file
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      
      // Update or add each variable
      const updateVar = (content, key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        } else {
          return content + `\n${key}=${value}`;
        }
      };
      
      envContent = updateVar(envContent, 'EMAIL_SENDER', emailConfig.emailSender);
      envContent = updateVar(envContent, 'EMAIL_PASSWORD', emailConfig.emailPassword);
      envContent = updateVar(envContent, 'EMAIL_RECIPIENT', emailConfig.emailRecipient);
      envContent = updateVar(envContent, 'EMAIL_SERVICE', emailConfig.emailService);
      
      fs.writeFileSync(envPath, envContent);
      
      // Re-initialize email service with new config
      if (initializeEmailService) {
        initializeEmailService();
      }
      
      return { success: true, message: 'Email config updated' };
    }
    
    return { success: false, message: '.env file not found' };
  } catch (error) {
    console.error('Failed to update email config:', error);
    return { success: false, message: error.message };
  }
});
