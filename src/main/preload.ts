import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication operations
  authSignUp: (email: string, password: string) => 
    ipcRenderer.invoke('auth:sign-up', email, password),
  
  authSignIn: (email: string, password: string) => 
    ipcRenderer.invoke('auth:sign-in', email, password),
  
  authSignOut: () => 
    ipcRenderer.invoke('auth:sign-out'),
  
  authMagicLink: (email: string) => 
    ipcRenderer.invoke('auth:magic-link', email),
  
  authResetPassword: (email: string) => 
    ipcRenderer.invoke('auth:reset-password', email),
  
  authUpdatePassword: (password: string) => 
    ipcRenderer.invoke('auth:update-password', password),
  
  authGetSession: () => 
    ipcRenderer.invoke('auth:get-session'),
  
  authGetUser: () => 
    ipcRenderer.invoke('auth:get-user'),
  
  authRefresh: () => 
    ipcRenderer.invoke('auth:refresh'),

  // Persistent login methods
  authSetKeepLoggedIn: (keepLoggedIn: boolean) => 
    ipcRenderer.invoke('auth:set-keep-logged-in', keepLoggedIn),
  
  authGetKeepLoggedIn: () => 
    ipcRenderer.invoke('auth:get-keep-logged-in'),

  // Clear session method for when keep logged in is disabled
  authClearSession: () => 
    ipcRenderer.invoke('auth:clear-session'),

  // Offline mode operations
  authEnableOfflineMode: () => 
    ipcRenderer.invoke('auth:enable-offline-mode'),
  
  authExitOfflineMode: () => 
    ipcRenderer.invoke('auth:exit-offline-mode'),
  
  authGetOfflineMode: () => 
    ipcRenderer.invoke('auth:get-offline-mode'),

  // Test deep link handler (for development)
  testDeepLink: (url: string) => 
    ipcRenderer.invoke('test:deep-link', url),

  // Database operations
  executeQuery: (query: string, params?: any[]) => 
    ipcRenderer.invoke('db:execute', query, params),
  
  queryDatabase: (query: string, params?: any[]) => 
    ipcRenderer.invoke('db:query', query, params),
  
  // File operations
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data: any) => ipcRenderer.invoke('file:save', data),
  uploadFile: (args: {
    data: ArrayBuffer | Uint8Array | Buffer | string;
    filename: string;
    applicationId: number;
    fileType: string;
    description?: string;
  }) => ipcRenderer.invoke('file:upload', args),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('file:openPath', filePath),
  
  // Sync operations
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  getSyncConfig: () => ipcRenderer.invoke('sync:config:get'),
  updateSyncConfig: (config: any) => ipcRenderer.invoke('sync:config:update', config),
  triggerManualSync: () => ipcRenderer.invoke('sync:manual'),
  retryConnection: () => ipcRenderer.invoke('sync:retry-connection'),
  performShutdownSync: (onProgress?: (message: string) => void) => ipcRenderer.invoke('sync:shutdown', onProgress),
  
  // App operations
  getVersion: () => ipcRenderer.invoke('app:version'),
  quitAfterSync: () => ipcRenderer.invoke('app:quit-after-sync'),
  
  // Event listeners
  onShowShutdownSyncDialog: (callback: () => void) => {
    ipcRenderer.on('show-shutdown-sync-dialog', callback);
    return () => ipcRenderer.removeListener('show-shutdown-sync-dialog', callback);
  },
  
  // Window operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Updater operations
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  },

  // Event listeners for auth callbacks
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
      // Authentication operations
      authSignUp: (email: string, password: string) => Promise<{
        user: any | null;
        session: any | null;
        error: any;
      }>;
      authSignIn: (email: string, password: string) => Promise<{
        user: any | null;
        session: any | null;
        error: any;
      }>;
      authSignOut: () => Promise<{ error: any }>;
      authMagicLink: (email: string) => Promise<{ error: any }>;
      authResetPassword: (email: string) => Promise<{ error: any }>;
      authUpdatePassword: (password: string) => Promise<{
        user: any | null;
        error: any;
      }>;
      authGetSession: () => Promise<any | null>;
      authGetUser: () => Promise<any | null>;
      authRefresh: () => Promise<{
        session: any | null;
        error: any;
      }>;
      authSetKeepLoggedIn: (keepLoggedIn: boolean) => Promise<{ success: boolean; error?: string }>;
      authGetKeepLoggedIn: () => Promise<boolean>;
      authClearSession: () => Promise<{ success: boolean; error?: string }>;
      
      // Offline mode operations
      authEnableOfflineMode: () => Promise<{ success: boolean; error?: string }>;
      authExitOfflineMode: () => Promise<{ success: boolean; error?: string }>;
      authGetOfflineMode: () => Promise<boolean>;
      
      // Test deep link handler
      testDeepLink: (url: string) => Promise<{ success: boolean }>;
      
      executeQuery: (query: string, params?: any[]) => Promise<any>;
      queryDatabase: (query: string, params?: any[]) => Promise<any>;
      openFile: () => Promise<string>;
      saveFile: (data: any) => Promise<boolean>;
      uploadFile: (args: {
        data: ArrayBuffer | Uint8Array | Buffer | string;
        filename: string;
        applicationId: number;
        fileType: string;
        description?: string;
      }) => Promise<{
        success: boolean;
        filePath: string;
        filename: string;
        originalName: string;
        size: number;
      }>;
      readFile: (filePath: string) => Promise<Buffer>;
      deleteFile: (filePath: string) => Promise<{ success: boolean }>;
      openPath: (filePath: string) => Promise<string>;
      getSyncStatus: () => Promise<{
        isConfigured: boolean;
        lastSync: string | null;
        pendingItems: number;
        isOnline: boolean;
        syncEnabled: boolean;
        syncAvailable: boolean;
        syncInProgress: boolean;
        error?: string;
      }>;
      getSyncConfig: () => Promise<{
        apiBaseUrl: string;
        enableSync: boolean;
      } | null>;
      updateSyncConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      triggerManualSync: () => Promise<{
        success: boolean;
        syncedTables: string[];
        errors: any[];
        lastSyncTime: string;
      }>;
      retryConnection: () => Promise<{ success: boolean; message: string }>;
      performShutdownSync: (onProgress?: (message: string) => void) => Promise<any>;
      // App operations
      getVersion: () => Promise<string>;
      quitAfterSync: () => Promise<void>;
      onShowShutdownSyncDialog: (callback: () => void) => () => void;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      
      // Updater operations
      updater: {
        checkForUpdates: () => Promise<{
          success: boolean;
          updateInfo?: {
            version: string;
            releaseDate: string;
            releaseName?: string;
            releaseNotes?: string;
          };
          error?: string;
        }>;
        downloadUpdate: () => Promise<{
          success: boolean;
          error?: string;
        }>;
        installUpdate: () => Promise<{
          success: boolean;
          error?: string;
        }>;
      };
      
      // Event listeners
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
