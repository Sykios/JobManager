import axios, { AxiosInstance } from 'axios';
import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { SyncQueueItem, UserSetting, Reminder, Application, Company, Contact } from '../types';
import { getAuthService } from './AuthService';

export interface SyncConfig {
  apiBaseUrl: string;
  enableSync: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedTables: string[];
  errors: SyncError[];
  lastSyncTime: string;
}

export interface SyncError {
  table: string;
  recordId: number;
  operation: string;
  error: string;
  retryable: boolean;
}

export interface CloudRecord {
  id: string;
  local_id?: number;
  data: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export class SyncService {
  private db: Database<sqlite3.Database, sqlite3.Statement>;
  private config: SyncConfig;
  private httpClient: AxiosInstance;
  private syncInProgress = false;

  constructor(
    db: Database<sqlite3.Database, sqlite3.Statement>,
    config: SyncConfig
  ) {
    this.db = db;
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JobManager-Electron/1.0.0',
      },
    });

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use(async (config) => {
      const authService = getAuthService();
      if (authService) {
        try {
          const accessToken = await authService.getAccessToken();
          console.log('HTTP interceptor: Access token obtained:', accessToken ? 'Yes' : 'No');
          
          if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            console.log('HTTP interceptor: Authorization header set');
          } else {
            console.warn('HTTP interceptor: No access token available');
          }
        } catch (error) {
          console.error('HTTP interceptor: Error getting access token:', error);
        }
      } else {
        console.warn('HTTP interceptor: Auth service not available');
      }
      
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle token expiration
        if (error.response?.status === 401) {
          const authService = getAuthService();
          if (authService) {
            console.log('Access token expired, attempting refresh...');
            const { session, error: refreshError } = await authService.refreshSession();
            if (session && !refreshError) {
              // Retry the original request with new token
              const originalRequest = error.config;
              originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
              return this.httpClient.request(originalRequest);
            } else {
              console.error('Token refresh failed:', refreshError);
              // Could emit event to show login dialog
            }
          }
        }
        
        console.error('Sync API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize sync service and perform startup sync if enabled
   */
  async initialize(): Promise<void> {
    console.log('Initializing SyncService...');
    
    // Check if user is authenticated (using fresh Supabase check)
    const authService = getAuthService();
    if (!authService) {
      console.log('Auth service not available, sync disabled');
      this.config.enableSync = false;
      await this.saveSyncSetting('enable_sync', false);
      await this.saveSyncSetting('sync_available', false);
      return;
    }

    const isAuthenticated = await authService.isAuthenticated();
    console.log('Authentication check result:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('User not authenticated, sync disabled');
      this.config.enableSync = false;
      await this.saveSyncSetting('enable_sync', false);
      await this.saveSyncSetting('sync_available', false);
      return;
    }

    // If user is authenticated, enable sync by default
    console.log('User authenticated, enabling sync...');
    this.config.enableSync = true;
    await this.saveSyncSetting('enable_sync', true);

    // Load other sync settings from database (but keep enableSync as true)
    const lastSyncTime = await this.getSyncSetting('last_sync_time', null);
    console.log('Last sync time:', lastSyncTime);

    // Test connection to Vercel API
    if (this.config.enableSync) {
      console.log('Sync enabled, testing connection to API:', this.config.apiBaseUrl);
      try {
        await this.testConnection();
        console.log('Successfully connected to sync API');
        
        // Perform startup sync only if connection is successful
        console.log('Performing startup sync...');
        try {
          await this.performFullSync();
          console.log('Startup sync completed successfully');
        } catch (error) {
          console.warn('Startup sync failed, continuing without sync:', error);
          // Mark sync as unavailable but don't fail initialization
          await this.saveSyncSetting('sync_available', false);
        }
      } catch (error) {
        console.error('Could not connect to sync API, running in offline mode:', {
          apiUrl: this.config.apiBaseUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          enableSync: this.config.enableSync
        });
        // Mark sync as unavailable and continue
        await this.saveSyncSetting('sync_available', false);
        this.config.enableSync = false; // Disable sync for this session
      }
    } else {
      console.log('Sync disabled, running in offline mode');
      await this.saveSyncSetting('sync_available', false);
    }
  }

  /**
   * Test connection to the Vercel API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to sync API...');
      const response = await this.httpClient.get('/api/synchronizeJobManager/health');
      console.log('Connection test successful:', response.status, response.data);
      await this.saveSyncSetting('sync_available', true);
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: axios.isAxiosError(error) ? error.response?.status : 'No status',
        data: axios.isAxiosError(error) ? error.response?.data : 'No data',
        config: axios.isAxiosError(error) ? {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout,
          headers: error.config?.headers ? Object.keys(error.config.headers) : 'No headers'
        } : 'No config'
      });
      await this.saveSyncSetting('sync_available', false);
      throw new Error(`Connection test failed: ${error}`);
    }
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<SyncResult> {
    // Check if sync is available before attempting
    const syncAvailable = await this.getSyncSetting('sync_available', false);
    if (!syncAvailable || !this.config.enableSync) {
      return {
        success: false,
        syncedTables: [],
        errors: [{
          table: 'system',
          recordId: 0,
          operation: 'sync',
          error: 'Sync service not available - running in offline mode',
          retryable: true,
        }],
        lastSyncTime: new Date().toISOString(),
      };
    }

    return this.performFullSync();
  }

  /**
   * Perform shutdown sync with progress callback
   */
  async performShutdownSync(onProgress?: (message: string) => void): Promise<SyncResult> {
    // Check if sync is available and enabled
    const syncAvailable = await this.getSyncSetting('sync_available', false);
    if (!this.config.enableSync || !syncAvailable) {
      onProgress?.('Sync not available - skipping shutdown sync');
      return {
        success: true,
        syncedTables: [],
        errors: [],
        lastSyncTime: new Date().toISOString(),
      };
    }

    onProgress?.('Checking for pending changes...');
    
    const queueItems = await this.getPendingSyncItems();
    if (queueItems.length === 0) {
      onProgress?.('No changes to sync');
      return {
        success: true,
        syncedTables: [],
        errors: [],
        lastSyncTime: new Date().toISOString(),
      };
    }

    onProgress?.(`Synchronizing ${queueItems.length} changes...`);
    
    // Try to test connection before performing full sync
    try {
      await this.testConnection();
      return this.performFullSync();
    } catch (error) {
      onProgress?.('Connection failed - skipping sync');
      return {
        success: false,
        syncedTables: [],
        errors: [{
          table: 'system',
          recordId: 0,
          operation: 'shutdown_sync',
          error: 'Could not connect to sync API - changes will be synced on next startup',
          retryable: true,
        }],
        lastSyncTime: new Date().toISOString(),
      };
    }
  }
  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    // Check if sync is available before starting
    const syncAvailable = await this.getSyncSetting('sync_available', false);
    if (!syncAvailable) {
      return {
        success: false,
        syncedTables: [],
        errors: [{
          table: 'system',
          recordId: 0,
          operation: 'sync',
          error: 'Sync service not available - API connection failed',
          retryable: true,
        }],
        lastSyncTime: new Date().toISOString(),
      };
    }

    this.syncInProgress = true;
    const startTime = new Date().toISOString();
    const result: SyncResult = {
      success: true,
      syncedTables: [],
      errors: [],
      lastSyncTime: startTime,
    };

    try {
      console.log('Starting full synchronization...');

      // Test connection before attempting sync
      try {
        await this.testConnection();
      } catch (error) {
        // Connection failed, mark as unavailable and return
        await this.saveSyncSetting('sync_available', false);
        throw new Error('Connection to sync API lost during sync attempt');
      }

      // 1. Push local changes to cloud
      await this.pushLocalChanges(result);

      // 2. Pull remote changes from cloud
      await this.pullRemoteChanges(result);

      // 3. Clean up processed sync queue items
      await this.cleanupSyncQueue();

      // 4. Update last sync time
      await this.saveSyncSetting('last_sync_time', startTime);

      console.log('Full synchronization completed successfully');
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        table: 'system',
        recordId: 0,
        operation: 'sync',
        error: errorMessage,
        retryable: true,
      });
      console.error('Full synchronization failed:', error);
      
      // If it's a connection error, mark sync as unavailable
      if (errorMessage.includes('Connection') || errorMessage.includes('connect') || errorMessage.includes('network')) {
        await this.saveSyncSetting('sync_available', false);
        console.log('Marked sync as unavailable due to connection error');
      }
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Push local changes to cloud
   */
  private async pushLocalChanges(result: SyncResult): Promise<void> {
    const queueItems = await this.getPendingSyncItems();
    
    for (const item of queueItems) {
      try {
        await this.pushSyncItem(item);
        result.syncedTables = Array.from(new Set([...result.syncedTables, item.table_name]));
        
        // Mark as synced
        await this.markSyncItemProcessed(item.id);
      } catch (error) {
        const syncError: SyncError = {
          table: item.table_name,
          recordId: item.record_id,
          operation: item.operation,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        };
        
        result.errors.push(syncError);
        await this.updateSyncItemError(item.id, syncError.error);
      }
    }
  }

  /**
   * Pull remote changes from cloud
   */
  private async pullRemoteChanges(result: SyncResult): Promise<void> {
    const lastSyncTime = await this.getSyncSetting('last_sync_time', '1970-01-01T00:00:00Z');
    
    try {
      // Get changes since last sync for each table
      const tables = ['applications', 'companies', 'contacts', 'reminders'];
      
      for (const table of tables) {
        const response = await this.httpClient.get(`/api/synchronizeJobManager/${table}`, {
          params: { since: lastSyncTime }
        });

        if (response.data && response.data.length > 0) {
          await this.applyRemoteChanges(table, response.data);
          result.syncedTables = Array.from(new Set([...result.syncedTables, table]));
        }
      }
    } catch (error) {
      result.errors.push({
        table: 'remote',
        recordId: 0,
        operation: 'pull',
        error: error instanceof Error ? error.message : 'Failed to pull remote changes',
        retryable: true,
      });
    }
  }

  /**
   * Push a single sync item to cloud
   */
  private async pushSyncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = `/api/synchronizeJobManager/${item.table_name}`;
    
    switch (item.operation) {
      case 'create':
      case 'update':
        const data = item.data ? JSON.parse(item.data) : {};
        const payload = {
          local_id: item.record_id,
          data,
          operation: item.operation,
          timestamp: new Date().toISOString(),
        };
        
        if (item.operation === 'create') {
          await this.httpClient.post(endpoint, payload);
        } else {
          await this.httpClient.put(`${endpoint}/${item.record_id}`, payload);
        }
        break;

      case 'delete':
        await this.httpClient.delete(`${endpoint}/${item.record_id}`);
        break;
    }
  }

  /**
   * Apply remote changes to local database
   */
  private async applyRemoteChanges(table: string, changes: CloudRecord[]): Promise<void> {
    for (const change of changes) {
      try {
        if (change.deleted_at) {
          // Handle deletion
          await this.handleRemoteDeletion(table, change);
        } else {
          // Handle creation or update
          await this.handleRemoteUpsert(table, change);
        }
      } catch (error) {
        console.error(`Failed to apply remote change for ${table}:`, error);
      }
    }
  }

  /**
   * Handle remote record deletion
   */
  private async handleRemoteDeletion(table: string, record: CloudRecord): Promise<void> {
    // Find local record by cloud ID
    const localRecord = await this.db.get(
      `SELECT * FROM ${table} WHERE supabase_id = ?`,
      [record.id]
    );

    if (localRecord) {
      await this.db.run(`DELETE FROM ${table} WHERE id = ?`, [localRecord.id]);
      console.log(`Deleted local ${table} record ${localRecord.id}`);
    }
  }

  /**
   * Handle remote record creation or update
   */
  private async handleRemoteUpsert(table: string, record: CloudRecord): Promise<void> {
    // Check if record already exists locally
    const existing = await this.db.get(
      `SELECT * FROM ${table} WHERE supabase_id = ?`,
      [record.id]
    );

    const data = record.data;
    
    if (existing) {
      // Update existing record
      await this.updateLocalRecord(table, existing.id, data, record);
    } else {
      // Create new record
      await this.createLocalRecord(table, data, record);
    }
  }

  /**
   * Update local record with remote data
   */
  private async updateLocalRecord(table: string, localId: number, data: any, cloudRecord: CloudRecord): Promise<void> {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field]);

    await this.db.run(
      `UPDATE ${table} SET ${setClause}, supabase_id = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, cloudRecord.id, localId]
    );
  }

  /**
   * Create local record from remote data
   */
  private async createLocalRecord(table: string, data: any, cloudRecord: CloudRecord): Promise<void> {
    const fields = Object.keys(data).filter(key => key !== 'id');
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => data[field]);

    await this.db.run(
      `INSERT INTO ${table} (${fields.join(', ')}, supabase_id, sync_status, last_synced_at) 
       VALUES (${placeholders}, ?, 'synced', CURRENT_TIMESTAMP)`,
      [...values, cloudRecord.id]
    );
  }

  /**
   * Get pending sync queue items
   */
  private async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const query = `
      SELECT * FROM sync_queue 
      WHERE synced_at IS NULL 
        AND (retry_count < 3 OR last_retry_at < datetime('now', '-1 hour'))
      ORDER BY created_at ASC
    `;
    
    return await this.db.all<SyncQueueItem[]>(query);
  }

  /**
   * Mark sync item as processed
   */
  private async markSyncItemProcessed(itemId: number): Promise<void> {
    await this.db.run(
      'UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE id = ?',
      [itemId]
    );
  }

  /**
   * Update sync item with error
   */
  private async updateSyncItemError(itemId: number, error: string): Promise<void> {
    await this.db.run(
      `UPDATE sync_queue SET 
         retry_count = retry_count + 1, 
         last_retry_at = CURRENT_TIMESTAMP,
         error_message = ?
       WHERE id = ?`,
      [error, itemId]
    );
  }

  /**
   * Clean up processed sync queue items
   */
  private async cleanupSyncQueue(): Promise<void> {
    // Remove synced items older than 7 days
    await this.db.run(
      `DELETE FROM sync_queue 
       WHERE synced_at IS NOT NULL 
         AND synced_at < datetime('now', '-7 days')`
    );
  }

  /**
   * Add item to sync queue
   */
  async queueForSync(table: string, recordId: number, operation: 'create' | 'update' | 'delete', data?: any): Promise<void> {
    const dataJson = data ? JSON.stringify(data) : null;
    
    await this.db.run(
      `INSERT INTO sync_queue (table_name, record_id, operation, data) 
       VALUES (?, ?, ?, ?)`,
      [table, recordId, operation, dataJson]
    );
  }

  /**
   * Get sync setting from database
   */
  private async getSyncSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      const result = await this.db.get<UserSetting>(
        'SELECT value FROM user_settings WHERE key = ? AND category = ?',
        [`sync_${key}`, 'sync']
      );
      
      return result ? JSON.parse(result.value) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Save sync setting to database
   */
  private async saveSyncSetting(key: string, value: any): Promise<void> {
    const valueJson = JSON.stringify(value);
    
    await this.db.run(
      `INSERT OR REPLACE INTO user_settings (key, value, category) 
       VALUES (?, ?, ?)`,
      [`sync_${key}`, valueJson, 'sync']
    );
  }

  /**
   * Load sync settings from database
   */
  private async loadSyncSettings(): Promise<void> {
    // Only load enableSync setting if user is not authenticated
    // If user is authenticated, we want to keep sync enabled by default
    const authService = getAuthService();
    if (authService) {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        const enableSync = await this.getSyncSetting('enable_sync', true);
        this.config.enableSync = enableSync;
        console.log('Loaded sync settings - user not authenticated, enableSync:', enableSync);
      } else {
        console.log('Loaded sync settings - user authenticated, keeping sync enabled');
      }
    } else {
      // No auth service, load from settings
      const enableSync = await this.getSyncSetting('enable_sync', true);
      this.config.enableSync = enableSync;
      console.log('Loaded sync settings - no auth service, enableSync:', enableSync);
    }
    // Load other settings as needed here in the future
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on server errors but not client errors
      return error.response ? error.response.status >= 500 : true;
    }
    return true; // Retry unknown errors
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: string | null;
    pendingItems: number;
    syncInProgress: boolean;
    syncEnabled: boolean;
    syncAvailable: boolean;
    isOnline: boolean;
  }> {
    const lastSync = await this.getSyncSetting('last_sync_time', null);
    const syncAvailable = await this.getSyncSetting('sync_available', false);
    const pendingResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL'
    );

    return {
      lastSync,
      pendingItems: pendingResult?.count || 0,
      syncInProgress: this.syncInProgress,
      syncEnabled: this.config.enableSync,
      syncAvailable: syncAvailable,
      isOnline: syncAvailable && this.config.enableSync, // Consider online if sync is both available and enabled
    };
  }

  /**
   * Get current sync configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Update sync configuration
   */
  async updateConfig(config: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Save settings to database
    if (config.enableSync !== undefined) {
      await this.saveSyncSetting('enable_sync', config.enableSync);
    }

    // If sync is being enabled, test connection
    if (config.enableSync === true) {
      try {
        await this.testConnection();
        console.log('Sync re-enabled and connection successful');
      } catch (error) {
        console.warn('Sync enabled but connection failed:', error);
        await this.saveSyncSetting('sync_available', false);
      }
    }
  }

  /**
   * Retry connection to sync API
   */
  async retryConnection(): Promise<boolean> {
    console.log('Attempting to retry sync connection...');
    try {
      await this.testConnection();
      this.config.enableSync = true; // Re-enable sync if connection succeeds
      await this.saveSyncSetting('enable_sync', true);
      console.log('Connection retry successful, sync re-enabled');
      
      // Also try to perform a sync to test full functionality
      try {
        console.log('Testing full sync functionality after reconnection...');
        await this.performFullSync();
        console.log('Full sync test successful after reconnection');
      } catch (syncError) {
        console.warn('Connection restored but sync test failed:', syncError);
        // Connection works but sync failed, still consider it a success
      }
      
      return true;
    } catch (error) {
      console.error('Connection retry failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      await this.saveSyncSetting('sync_available', false);
      return false;
    }
  }

  /**
   * Cleanup and shutdown - perform final sync if enabled and available
   */
  async shutdown(): Promise<void> {
    console.log('SyncService shutting down...');
    
    const syncAvailable = await this.getSyncSetting('sync_available', false);
    if (this.config.enableSync && !this.syncInProgress && syncAvailable) {
      console.log('Performing shutdown sync...');
      try {
        await this.performFullSync();
        console.log('Shutdown sync completed');
      } catch (error) {
        console.warn('Shutdown sync failed, changes will be synced on next startup:', error);
      }
    } else {
      if (!syncAvailable) {
        console.log('Skipping shutdown sync - API not available');
      } else if (!this.config.enableSync) {
        console.log('Skipping shutdown sync - sync disabled');
      } else {
        console.log('Skipping shutdown sync - sync already in progress');
      }
    }
    
    console.log('SyncService shut down');
  }
}
