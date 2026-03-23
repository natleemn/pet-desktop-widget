const { app, BrowserWindow, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  const winW = 400;
  const winH = 300;

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 200,
    minHeight: 150,
    x: screenW - winW - 20,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFallbackIcon(size) {
  // Generates a simple circular icon when no custom icon file exists
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2, cy = y - size / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const i = (y * size + x) * 4;
      if (dist < size / 2 - 1) {
        buf[i] = 140; buf[i + 1] = 130; buf[i + 2] = 118; buf[i + 3] = 255;
      } else {
        buf[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function loadTrayIcon() {
  const iconPath = path.join(__dirname, 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  }
  return createFallbackIcon(32).resize({ width: 18, height: 18 });
}

function createTray() {
  const trayIcon = loadTrayIcon();
  tray = new Tray(trayIcon);
  tray.setToolTip('Pet Widget');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide',
      click: () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Reset Position',
      click: () => {
        if (mainWindow) {
          const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
          mainWindow.setBounds({ x: sw - 420, y: 20, width: 400, height: 300 });
          mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  // Set dock icon if one exists
  const dockIconPath = path.join(__dirname, 'dock-icon.png');
  if (fs.existsSync(dockIconPath) && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(dockIconPath));
  }

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
