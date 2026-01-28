const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow;
let tray = null;
let isExpanded = true;

// Paths
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');
const dataPath = path.join(userDataPath, 'shortcuts.json');
const iconCachePath = path.join(userDataPath, 'icon-cache');

// Ensure icon cache directory exists
if (!fs.existsSync(iconCachePath)) {
  fs.mkdirSync(iconCachePath, { recursive: true });
}

// Load/Save config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return {
    autoStart: true,
    alwaysOnTop: true,
    opacity: 0.95,
    position: null,
    size: { width: 360, height: 480 },
    collapsed: false
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

function setAutoStart(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
    args: ['--hidden']
  });
}

// Extract icon using Electron's native app.getFileIcon
async function getFileIcon(filePath, forceRefresh = false) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist:', filePath);
      return null;
    }

    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    const cachedIconPath = path.join(iconCachePath, `${hash}.png`);
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && fs.existsSync(cachedIconPath)) {
      return cachedIconPath;
    }

    // Delete old cached icon if forcing refresh
    if (forceRefresh && fs.existsSync(cachedIconPath)) {
      try { fs.unlinkSync(cachedIconPath); } catch (e) {}
    }
    
    // Use Electron's native getFileIcon - this works great on Windows!
    const icon = await app.getFileIcon(filePath, { size: 'large' });
    
    if (icon && !icon.isEmpty()) {
      const pngBuffer = icon.toPNG();
      fs.writeFileSync(cachedIconPath, pngBuffer);
      console.log('Icon saved to:', cachedIconPath);
      return cachedIconPath;
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting icon for', filePath, e);
    return null;
  }
}

// Clear icon cache for a specific file
function clearIconCache(filePath) {
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  const cachedIconPath = path.join(iconCachePath, `${hash}.png`);
  if (fs.existsSync(cachedIconPath)) {
    try { fs.unlinkSync(cachedIconPath); } catch (e) {}
  }
}

function createWindow() {
  const config = loadConfig();
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const defaultX = screenWidth - config.size.width - 20;
  const defaultY = screenHeight - config.size.height - 20;
  
  mainWindow = new BrowserWindow({
    width: config.size.width,
    height: config.collapsed ? 48 : config.size.height,
    x: config.position?.x || defaultX,
    y: config.position?.y || defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false  // Allow loading local file:// images
    }
  });

  mainWindow.setOpacity(config.opacity);
  mainWindow.loadFile('index.html');
  
  // Open DevTools with F12 for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
  
  isExpanded = !config.collapsed;

  mainWindow.on('moved', () => {
    const [x, y] = mainWindow.getPosition();
    const conf = loadConfig();
    conf.position = { x, y };
    saveConfig(conf);
  });

  mainWindow.on('resize', () => {
    if (isExpanded) {
      const [width, height] = mainWindow.getSize();
      const conf = loadConfig();
      conf.size = { width, height };
      saveConfig(conf);
    }
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  setAutoStart(config.autoStart);
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const icon = fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'icon.png');
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Albert Desktop',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: loadConfig().alwaysOnTop,
      click: (menuItem) => {
        const config = loadConfig();
        config.alwaysOnTop = menuItem.checked;
        saveConfig(config);
        mainWindow.setAlwaysOnTop(menuItem.checked);
      }
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: loadConfig().autoStart,
      click: (menuItem) => {
        const config = loadConfig();
        config.autoStart = menuItem.checked;
        saveConfig(config);
        setAutoStart(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Open Data Folder',
      click: () => shell.openPath(userDataPath)
    },
    {
      label: 'Open DevTools (Debug)',
      click: () => mainWindow.webContents.openDevTools()
    },
    {
      label: 'Reload All Icons',
      click: () => {
        fs.rmSync(iconCachePath, { recursive: true, force: true });
        fs.mkdirSync(iconCachePath, { recursive: true });
        mainWindow.webContents.send('reload-icons');
      }
    },
    {
      label: 'Clear Icon Cache',
      click: () => {
        fs.rmSync(iconCachePath, { recursive: true, force: true });
        fs.mkdirSync(iconCachePath, { recursive: true });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.exit(0)
    }
  ]);

  tray.setToolTip('Albert Desktop');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC Handlers
ipcMain.handle('toggle-expand', () => {
  const config = loadConfig();
  isExpanded = !isExpanded;
  
  if (isExpanded) {
    mainWindow.setSize(config.size.width, config.size.height);
  } else {
    mainWindow.setSize(config.size.width, 48);
  }
  
  config.collapsed = !isExpanded;
  saveConfig(config);
  
  return isExpanded;
});

ipcMain.handle('get-expanded-state', () => isExpanded);

ipcMain.handle('load-data', () => {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    tabs: [
      { id: 'apps', name: 'Applications', shortcuts: [] },
      { id: 'games', name: 'Games', shortcuts: [] },
      { id: 'folders', name: 'Folders', shortcuts: [] }
    ],
    activeTab: 'apps'
  };
});

ipcMain.handle('save-data', (event, data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving data:', e);
    return false;
  }
});

ipcMain.handle('open-path', (event, filePath) => shell.openPath(filePath));
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));
ipcMain.handle('show-in-folder', (event, filePath) => shell.showItemInFolder(filePath));

ipcMain.handle('set-opacity', (event, opacity) => {
  mainWindow.setOpacity(opacity);
  const config = loadConfig();
  config.opacity = opacity;
  saveConfig(config);
});

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('extract-icon', async (event, filePath, forceRefresh = false) => {
  return await getFileIcon(filePath, forceRefresh);
});

ipcMain.handle('clear-single-icon-cache', (event, filePath) => {
  clearIconCache(filePath);
  return true;
});

ipcMain.handle('clear-all-icon-cache', () => {
  fs.rmSync(iconCachePath, { recursive: true, force: true });
  fs.mkdirSync(iconCachePath, { recursive: true });
  return true;
});

ipcMain.handle('get-icon-cache-path', () => iconCachePath);

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  if (process.argv.includes('--hidden')) {
    mainWindow.hide();
  }
});

app.on('window-all-closed', (e) => e.preventDefault());

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
