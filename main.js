const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  win.loadFile(path.join(__dirname, 'login.html'));
}

// Allow renderer to request navigation
ipcMain.on('navigate-to', (event, filename) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.loadFile(path.join(__dirname, filename));
  }
});

app.commandLine.appendSwitch('disable-renderer-backgrounding');

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, 'api', 'server.js')
    : path.join(process.resourcesPath, 'api', 'server.js');

  backendProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    shell: true,
  });

  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});