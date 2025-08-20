import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupDatabase, initializeDatabase, getDatabase } from '../database';

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '../../node_modules/.bin/electron'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('Electron reload not available in development mode');
  }
}

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
  // A helper to normalize whatever the renderer sends into a Buffer
  function toBuffer(data: any): Buffer {
    if (data instanceof Buffer) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
    if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    if (typeof data === 'string') {
      // support base64 or data URLs if you must (but prefer raw bytes)
      const base64 = data.startsWith('data:') ? data.split(',')[1] : data;
      return Buffer.from(base64, 'base64');
    }
    throw new Error('Unsupported data type for save');
  }

  // File upload handler for application attachments
  ipcMain.handle('file:upload', async (event, args: {
    data: ArrayBuffer | Uint8Array | Buffer | string;
    filename: string;
    applicationId: number;
    fileType: string;
    description?: string;
  }) => {
    try {
      const buffer = toBuffer(args.data);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(app.getPath('userData'), 'uploads');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(args.filename);
      const basename = path.basename(args.filename, ext);
      const sanitized = basename.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const uniqueFilename = `${timestamp}_${sanitized}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      // Write file to disk
      await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });
      
      console.log(`File uploaded: ${args.filename} -> ${filePath} (${buffer.length} bytes)`);
      
      return {
        success: true,
        filePath,
        filename: uniqueFilename,
        originalName: args.filename,
        size: buffer.length
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  });

  // Generic "Save As" endpoint for user exports
  ipcMain.handle('file:save', async (event, args: {
    data: ArrayBuffer | Uint8Array | Buffer | string;
    defaultPath?: string;
    filters?: Electron.FileFilter[];
    safeWrite?: boolean;
  }) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(senderWin!, {
      defaultPath: args.defaultPath,
      filters: args.filters,
    });
    if (canceled || !filePath) return { canceled: true };

    const buffer = toBuffer(args.data);

    if (args.safeWrite) {
      // safer writes: write temp then atomic rename
      const dir = path.dirname(filePath);
      const tmp = path.join(dir, `.${path.basename(filePath)}.tmp`);
      await fs.promises.writeFile(tmp, buffer, { mode: 0o600 });
      await fs.promises.rename(tmp, filePath);
    } else {
      await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });
    }

    return { canceled: false, filePath };
  });

  // Read file for download
  ipcMain.handle('file:read', async (event, filePath: string) => {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('File read error:', error);
      throw error;
    }
  });

  // Delete file from disk
  ipcMain.handle('file:delete', async (event, filePath: string) => {
    try {
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('File delete error:', error);
      throw error;
    }
  });

  // Optional: open the saved file with the OS default app
  ipcMain.handle('file:openPath', async (_e, filePath: string) => {
    const { shell } = require('electron');
    return shell.openPath(filePath);
  });
  // Database operations
  ipcMain.handle('db:execute', async (event, query: string, params?: any[]) => {
    try {
      console.log('IPC db:execute - Query:', query);
      
      // Process params to convert Uint8Array-like objects to Buffers for sqlite
      const processedParams = params?.map(p => {
        // When a Uint8Array is sent over IPC, it becomes an object with numeric string keys.
        // We check if an object looks like a serialized Uint8Array and convert it back.
        if (p && typeof p === 'object' && !Array.isArray(p) && !(p instanceof Buffer)) {
            const keys = Object.keys(p);
            const isUint8ArrayLike = keys.length > 0 && keys.every(k => !isNaN(parseInt(k)));
            
            if (isUint8ArrayLike) {
                const uint8Array = new Uint8Array(Object.values(p));
                console.log(`IPC db:execute - Converted Uint8Array-like object to Buffer of length ${uint8Array.length}`);
                return Buffer.from(uint8Array);
            }
        }
        return p;
      });

      console.log('IPC db:execute - Params:', processedParams);
      const db = getDatabase();
      const result = await db.run(query, processedParams);
      console.log('IPC db:execute - Result:', result);
      return result;
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  });

  ipcMain.handle('db:query', async (event, query: string, params?: any[]) => {
    try {
      console.log('IPC db:query - Query:', query);
      console.log('IPC db:query - Params:', params);
      const db = getDatabase();
      const result = await db.all(query, params);
      console.log('IPC db:query - Result:', result);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  });

  // File operations
  ipcMain.handle('file:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (error) {
      console.error('File open error:', error);
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
