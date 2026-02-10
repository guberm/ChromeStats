const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  getExtensionStats: (extensionId) => ipcRenderer.invoke('get-extension-stats', extensionId),
  getExtensionHistory: (extensionId, hours) => ipcRenderer.invoke('get-extension-history', extensionId, hours),
  getRecentChanges: (limit) => ipcRenderer.invoke('get-recent-changes', limit),
  addExtension: (name, url) => ipcRenderer.invoke('add-extension', name, url),
  deleteExtension: (extensionId) => ipcRenderer.invoke('delete-extension', extensionId),
  runCheckNow: () => ipcRenderer.invoke('run-check-now'),
  getSchedulerStatus: () => ipcRenderer.invoke('get-scheduler-status'),
  toggleScheduler: () => ipcRenderer.invoke('toggle-scheduler'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
  updateEmailConfig: (emailConfig) => ipcRenderer.invoke('update-email-config', emailConfig),
  
  // Listen for refresh events from main process
  onRefreshData: (callback) => ipcRenderer.on('refresh-data', callback)
});
