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
      getVersion: () => Promise<string>;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
  }
}
