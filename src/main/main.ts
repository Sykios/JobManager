import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { setupDatabase, initializeDatabase, getDatabase } from '../database';
import { SyncService, SyncConfig } from '../services/SyncService';
import { createAuthService, getAuthService, AuthConfig } from '../services/AuthService';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Handle deep link URLs for authentication callbacks
 */
const handleDeepLink = async (url: string): Promise<void> => {
  console.log('Deep link received:', url);
  
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol === 'jobmanager:' && parsedUrl.hostname === 'auth') {
      // Extract auth tokens from the URL fragment
      const fragment = parsedUrl.hash.substring(1); // Remove the # character
      const params = new URLSearchParams(fragment);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresAt = params.get('expires_at');
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      
      // Check for errors first
      if (error) {
        console.error('Magic link error:', error, errorDescription);
        if (mainWindow) {
          mainWindow.webContents.send('auth:magic-link-error', errorDescription || error);
        }
        return;
      }
      
      if (accessToken && refreshToken) {
        console.log('Processing magic link authentication...');
        
        // Manually set the session in Supabase
        if (authService) {
          try {
            // Use the tokens to establish a session
            const { data, error } = await (authService as any).supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Error setting session from magic link:', error);
              if (mainWindow) {
                mainWindow.webContents.send('auth:magic-link-error', error.message);
              }
            } else {
              console.log('Magic link authentication successful!');
              // Notify the renderer that authentication was successful
              if (mainWindow) {
                mainWindow.webContents.send('auth:magic-link-success', data.user);
              }
            }
          } catch (error) {
            console.error('Exception during magic link processing:', error);
            if (mainWindow) {
              mainWindow.webContents.send('auth:magic-link-error', 'Authentication failed');
            }
          }
        } else {
          console.error('Auth service not available for magic link processing');
          if (mainWindow) {
            mainWindow.webContents.send('auth:magic-link-error', 'Auth service not ready');
          }
        }
      } else {
        console.error('Invalid magic link - missing tokens');
        if (mainWindow) {
          mainWindow.webContents.send('auth:magic-link-error', 'Invalid authentication link');
        }
      }
    }
  } catch (error) {
    console.error('Error processing deep link:', error);
    if (mainWindow) {
      mainWindow.webContents.send('auth:magic-link-error', 'Failed to process authentication link');
    }
  }
};

// Register custom protocol for deep linking
if (!app.isDefaultProtocolClient('jobmanager')) {
  // Set as default protocol client for jobmanager:// URLs
  app.setAsDefaultProtocolClient('jobmanager');
}

// Handle deep links when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Handle deep links when app is not running (Windows)
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  
  // Check for deep link in command line arguments
  const deepLink = commandLine.find(arg => arg.startsWith('jobmanager://'));
  if (deepLink) {
    handleDeepLink(deepLink);
  }
});

// Ensure single instance (required for deep link handling)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Continue with app initialization...
}

// Global auth and sync service instances
let authService: ReturnType<typeof createAuthService> | null = null;
let syncService: SyncService | null = null;
let mainWindow: BrowserWindow;
let ipcHandlersSetup = false; // Guard to prevent duplicate IPC handler registration
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

/**
 * Initialize Auth Service
 */
const initializeAuthService = async (): Promise<void> => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    console.log('Environment check:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials missing, running without authentication');
      console.warn('Expected SUPABASE_URL and SUPABASE_ANON_KEY in environment');
      return;
    }

    const authConfig: AuthConfig = {
      supabaseUrl,
      supabaseAnonKey,
    };

    authService = createAuthService(authConfig);
    await authService.initialize();
    
    console.log('Auth service initialized successfully');
  } catch (error) {
    console.warn('Auth service initialization failed:', error);
  }
};

/**
 * Initialize Sync Service
 */
const initializeSyncService = async (): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Sync configuration
    const syncConfig: SyncConfig = {
      apiBaseUrl: process.env.SYNC_API_URL || 'https://jobmanager-api.vercel.app',
      enableSync: process.env.ENABLE_SYNC !== 'false', // Default to true unless explicitly disabled
    };

    syncService = new SyncService(db, syncConfig);
    await syncService.initialize();
    
    console.log('Sync service initialized successfully');
  } catch (error) {
    console.warn('Sync service initialization failed, continuing in offline mode:', error);
    // Continue app initialization even if sync fails - just disable sync
    syncService = null;
  }
};

/**
 * Initialize Auto Updater
 */
const initializeAutoUpdater = (): void => {
  try {
    console.log('Initializing auto updater...');
    
    // Configure auto updater (only in production builds)
    if (!app.isPackaged) {
      console.log('Running in development mode, auto-updater disabled');
      return;
    }

    // By default, auto-updater only checks for production releases (vx.x.x)
    autoUpdater.allowPrerelease = false; // Change to true to include pre-releases

    // Set up update events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      if (mainWindow) {
        mainWindow.webContents.send('updater:checking-for-update');
      }
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      if (mainWindow) {
        mainWindow.webContents.send('updater:update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      if (mainWindow) {
        mainWindow.webContents.send('updater:update-not-available', info);
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      if (mainWindow) {
        mainWindow.webContents.send('updater:error', err.message);
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download speed: ${progressObj.bytesPerSecond} B/s - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`);
      if (mainWindow) {
        mainWindow.webContents.send('updater:download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      if (mainWindow) {
        mainWindow.webContents.send('updater:update-downloaded', info);
      }
    });

    console.log('Auto updater initialized successfully');
  } catch (error) {
    console.warn('Auto updater initialization failed:', error);
  }
};

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
  // Prevent duplicate handler registration
  if (ipcHandlersSetup) {
    console.log('IPC handlers already set up, skipping...');
    return;
  }
  
  console.log('Setting up IPC handlers...');
  ipcHandlersSetup = true;

  // Remove all existing handlers first to prevent duplicates
  const handlersToRemove = [
    'auth:sign-up', 'auth:sign-in', 'auth:sign-out', 'auth:magic-link', 'auth:reset-password', 
    'auth:update-password', 'auth:get-session', 'auth:get-user', 'auth:refresh',
    'auth:set-keep-logged-in', 'auth:get-keep-logged-in', 'auth:clear-session',
    'auth:enable-offline-mode', 'auth:exit-offline-mode', 'auth:get-offline-mode',
    'sync:status', 'sync:config:get', 'sync:config:update', 'sync:manual', 
    'sync:shutdown', 'sync:retry-connection', 'sync:trigger', 'sync:configure',
    'app:quit-after-sync', 'file:upload', 'file:save', 'file:read', 'file:delete', 
    'file:openPath', 'file:open', 'db:execute', 'db:query', 'app:version',
    'window:minimize', 'window:maximize', 'window:close',
    'updater:check-for-updates', 'updater:download-update', 'updater:install-update'
  ];
  
  handlersToRemove.forEach(handler => {
    ipcMain.removeAllListeners(handler);
  });

    // Test deep link handler (for development testing)
  ipcMain.handle('test:deep-link', async (event, testUrl: string) => {
    console.log('Testing deep link handler with URL:', testUrl);
    await handleDeepLink(testUrl);
    return { success: true };
  });

  // Auth operations
  ipcMain.handle('auth:sign-up', async (event, email: string, password: string) => {
    try {
      if (!authService) {
        return { user: null, session: null, error: { message: 'Auth service not available' } };
      }
      return await authService.signUp(email, password);
    } catch (error) {
      console.error('Auth sign-up error:', error);
      return { user: null, session: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:sign-in', async (event, email: string, password: string) => {
    try {
      if (!authService) {
        return { user: null, session: null, error: { message: 'Auth service not available' } };
      }
      const result = await authService.signIn(email, password);
      
      // If sign-in successful, reinitialize sync service
      if (result.session && !result.error) {
        console.log('User signed in, reinitializing sync service...');
        await initializeSyncService();
      }
      
      return result;
    } catch (error) {
      console.error('Auth sign-in error:', error);
      return { user: null, session: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:sign-out', async () => {
    try {
      if (!authService) {
        return { error: { message: 'Auth service not available' } };
      }
      
      const result = await authService.signOut();
      
      // Disable sync when user signs out
      if (syncService) {
        await syncService.updateConfig({ enableSync: false });
        syncService = null;
      }
      
      return result;
    } catch (error) {
      console.error('Auth sign-out error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:magic-link', async (event, email: string) => {
    try {
      if (!authService) {
        return { error: { message: 'Auth service not available' } };
      }
      return await authService.signInWithMagicLink(email);
    } catch (error) {
      console.error('Auth magic-link error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:reset-password', async (event, email: string) => {
    try {
      if (!authService) {
        return { error: { message: 'Auth service not available' } };
      }
      return await authService.resetPassword(email);
    } catch (error) {
      console.error('Auth reset-password error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:update-password', async (event, password: string) => {
    try {
      if (!authService) {
        return { user: null, error: { message: 'Auth service not available' } };
      }
      return await authService.updatePassword(password);
    } catch (error) {
      console.error('Auth update-password error:', error);
      return { user: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  ipcMain.handle('auth:get-session', async () => {
    try {
      if (!authService) {
        return null;
      }
      return authService.getCurrentSession();
    } catch (error) {
      console.error('Auth get-session error:', error);
      return null;
    }
  });

  ipcMain.handle('auth:get-user', async () => {
    try {
      if (!authService) {
        return null;
      }
      return authService.getCurrentUser();
    } catch (error) {
      console.error('Auth get-user error:', error);
      return null;
    }
  });

  ipcMain.handle('auth:refresh', async () => {
    try {
      if (!authService) {
        return { session: null, error: { message: 'Auth service not available' } };
      }
      return await authService.refreshSession();
    } catch (error) {
      console.error('Auth refresh error:', error);
      return { session: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  });

  // Persistent login handlers
  ipcMain.handle('auth:set-keep-logged-in', async (event, keepLoggedIn: boolean) => {
    try {
      if (!authService) {
        return { success: false, error: 'Auth service not available' };
      }
      authService.setKeepLoggedIn(keepLoggedIn);
      return { success: true };
    } catch (error) {
      console.error('Set keep logged in error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('auth:get-keep-logged-in', async () => {
    try {
      if (!authService) {
        return false;
      }
      return authService.getKeepLoggedIn();
    } catch (error) {
      console.error('Get keep logged in error:', error);
      return false;
    }
  });

  // Clear session handler for when keep logged in is disabled
  ipcMain.handle('auth:clear-session', async () => {
    try {
      if (!authService) {
        return { success: false, error: 'Auth service not available' };
      }
      await authService.clearSession();
      return { success: true };
    } catch (error) {
      console.error('Clear session error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Offline mode handlers
  ipcMain.handle('auth:enable-offline-mode', async () => {
    try {
      console.log('Enabling offline mode - disabling sync service');
      // Disable sync when entering offline mode
      if (syncService) {
        await syncService.updateConfig({ enableSync: false });
      }
      return { success: true };
    } catch (error) {
      console.error('Enable offline mode error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('auth:exit-offline-mode', async () => {
    try {
      console.log('Exiting offline mode');
      return { success: true };
    } catch (error) {
      console.error('Exit offline mode error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('auth:get-offline-mode', async () => {
    try {
      // Offline mode is managed by the renderer process via localStorage
      // This handler is here for consistency but not actively used
      return false;
    } catch (error) {
      console.error('Get offline mode error:', error);
      return false;
    }
  });

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

  // Sync operations
  ipcMain.handle('sync:status', async () => {
    try {
      if (!syncService) {
        return { 
          isConfigured: false, 
          lastSync: null, 
          pendingItems: 0,
          isOnline: false,
          syncEnabled: false,
          syncAvailable: false,
        };
      }
      return await syncService.getSyncStatus();
    } catch (error) {
      console.error('Sync status error:', error);
      return { 
        isConfigured: false, 
        lastSync: null, 
        pendingItems: 0,
        isOnline: false,
        syncEnabled: false,
        syncAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('sync:config:get', async () => {
    try {
      if (!syncService) {
        return null;
      }
      return syncService.getConfig();
    } catch (error) {
      console.error('Get sync config error:', error);
      return null;
    }
  });

  ipcMain.handle('sync:config:update', async (event, config: Partial<SyncConfig>) => {
    try {
      if (!syncService) {
        return { success: false, error: 'Sync service not available - running in offline mode' };
      }
      await syncService.updateConfig(config);
      return { success: true };
    } catch (error) {
      console.error('Update sync config error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('sync:manual', async () => {
    try {
      if (!syncService) {
        return {
          success: false,
          syncedTables: [],
          errors: [{
            table: 'system',
            recordId: 0,
            operation: 'manual_sync',
            error: 'Sync service not available - running in offline mode',
            retryable: false,
          }],
          lastSyncTime: new Date().toISOString(),
        };
      }
      const result = await syncService.triggerSync();
      return result;
    } catch (error) {
      console.error('Manual sync error:', error);
      return {
        success: false,
        syncedTables: [],
        errors: [{
          table: 'system',
          recordId: 0,
          operation: 'manual_sync',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          retryable: true,
        }],
        lastSyncTime: new Date().toISOString(),
      };
    }
  });

  // Retry connection handler
  ipcMain.handle('sync:retry-connection', async () => {
    try {
      if (!syncService) {
        return { 
          success: false, 
          message: 'Sync service not available - app running in offline mode' 
        };
      }
      
      const connected = await syncService.retryConnection();
      if (connected) {
        return { 
          success: true, 
          message: 'Connection restored successfully, sync re-enabled' 
        };
      } else {
        return { 
          success: false, 
          message: 'Connection retry failed - still running in offline mode' 
        };
      }
    } catch (error) {
      console.error('Connection retry error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection retry failed' 
      };
    }
  });

  ipcMain.handle('sync:shutdown', async (event, onProgress?: (message: string) => void) => {
    if (!syncService) {
      return { success: true, syncedTables: [], errors: [], lastSyncTime: new Date().toISOString() };
    }
    return await syncService.performShutdownSync(onProgress);
  });

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

  // Auto-updater IPC handlers
  ipcMain.handle('updater:check-for-updates', async () => {
    try {
      if (!app.isPackaged) {
        return { success: false, error: 'Updates not available in development mode' };
      }
      console.log('Checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo || null };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('updater:download-update', async () => {
    try {
      if (!app.isPackaged) {
        return { success: false, error: 'Updates not available in development mode' };
      }
      console.log('Starting update download...');
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('updater:install-update', () => {
    try {
      if (!app.isPackaged) {
        return { success: false, error: 'Updates not available in development mode' };
      }
      console.log('Installing update and restarting...');
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('Error installing update:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Initialize database
    await setupDatabase(false); // Set to true if you want demo data
    
    // Initialize auth service
    await initializeAuthService();
    
    // Initialize sync service (depends on auth)
    await initializeSyncService();
    
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
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit with sync check
app.on('before-quit', async (event) => {
  if (syncService) {
    try {
      const status = await syncService.getSyncStatus();
      // Only prevent quit if sync is enabled, available, and has pending items
      if (status.pendingItems > 0 && status.syncEnabled && status.syncAvailable) {
        // If we have pending items and sync is available, prevent quitting and let the renderer handle the sync dialog
        event.preventDefault();
        
        // Send a message to the renderer to show the shutdown sync dialog
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('show-shutdown-sync-dialog');
        }
        return;
      } else if (status.pendingItems > 0 && (!status.syncAvailable || !status.syncEnabled)) {
        // If we have pending items but sync is not available/enabled, just inform and quit
        console.log('Quitting with pending changes - sync not available or disabled');
      }
    } catch (error) {
      console.error('Error checking sync status before quit:', error);
      // Continue with quit if we can't check status
    }
  }
  
  // Cleanup sync service if no pending items, sync disabled, or sync unavailable
  if (syncService) {
    await syncService.shutdown();
  }
});

// Handle forced quit after sync completion
ipcMain.handle('app:quit-after-sync', () => {
  app.quit();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Prevent opening new windows
    return { action: 'deny' };
  });
});
