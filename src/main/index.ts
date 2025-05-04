import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the index.html file
  win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));

  // Developer tools will no longer automatically open
  // Uncomment the following lines to re-enable dev tools in development mode
  // if (process.env.NODE_ENV === 'development') {
  //   win.webContents.openDevTools();
  // }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});