const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#05070a',
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Load the standalone victim view from our local dev server
  // In production, this would point to a local index.html file
  win.loadURL('http://localhost:5173/?view=victim');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
