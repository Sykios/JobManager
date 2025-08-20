import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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
  
  // App operations
  getVersion: () => ipcRenderer.invoke('app:version'),
  
  // Window operations
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
});

// Types for the exposed API
declare global {
  interface Window {
    electronAPI: {
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
      getVersion: () => Promise<string>;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
  }
}
