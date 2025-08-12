import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { setupDatabase, initializeDatabase, getDatabase } from '../database';

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'), // Optional: add app icon later
    show: false, // Don't show until ready
    titleBarStyle: 'default',
  });

  // Load the app from built files
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });
};

// Set up IPC handlers
const setupIpcHandlers = (): void => {
  // Database operations
  ipcMain.handle('db:execute', async (event, query: string, params?: any[]) => {
    try {
      const db = getDatabase();
      const result = await db.run(query, params);
      return result;
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:query', async (event, query: string, params?: any[]) => {
    try {
      const db = getDatabase();
      const result = await db.all(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });

  // App operations
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  // Window operations
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Initialize database
    await setupDatabase(false); // Set to true if you want demo data
    
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Create window
    createWindow();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Prevent opening new windows
    return { action: 'deny' };
  });
});
