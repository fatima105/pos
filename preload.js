const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  navigateTo: (filename) => ipcRenderer.send('navigate-to', filename)
});