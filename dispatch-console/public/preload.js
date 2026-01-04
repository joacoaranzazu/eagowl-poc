const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Menu events
  onMenuAction: (callback) => {
    const events = [
      'menu-new-session',
      'menu-open-recording',
      'menu-connect-server',
      'menu-disconnect',
      'menu-export-logs',
      'menu-system-info',
      'menu-check-updates',
      'menu-about',
    ];
    
    events.forEach(event => {
      ipcRenderer.on(event, callback);
    });
  },
  
  // Update events
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  installUpdate: () => ipcRenderer.send('install-update'),
  
  // Remove all listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Development safety check
if (process.contextIsolated) {
  console.log('✅ Context isolation enabled - secure');
} else {
  console.warn('⚠️ Context isolation disabled - security risk');
}