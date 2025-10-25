import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { SyncQueueItem, UserSetting } from '../types';
import { getAuthService } from './AuthService';
import { SupabaseDataService } from './SupabaseDataService';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SyncConfig {
  enableSync: boolean;
  supabaseClient?: SupabaseClient;
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
  private supabaseDataService: SupabaseDataService | null = null;
  private syncInProgress = false;

  constructor(
    db: Database<sqlite3.Database, sqlite3.Statement>,
    config: SyncConfig
  ) {
    this.db = db;
    this.config = config;
    
    // Initialize Supabase data service if client is provided
    if (config.supabaseClient) {
      this.supabaseDataService = new SupabaseDataService(db, {
        supabaseClient: config.supabaseClient,
      });
    }
  }

  /**
   * Initialize sync service and perform startup sync if enabled
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing SyncService with Supabase...');
    
    // Check if user is authenticated
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
      
      // Set up auth listener to enable sync when user logs in
      authService.onAuthStateChange(async (session) => {
        if (session) {
          console.log('✅ User authenticated, enabling sync...');
          this.config.enableSync = true;
          await this.saveSyncSetting('enable_sync', true);
          
          // Initialize Supabase data service
          if (this.config.supabaseClient && !this.supabaseDataService) {
            this.supabaseDataService = new SupabaseDataService(this.db, {
              supabaseClient: this.config.supabaseClient,
            });
          }
          
          // Test connection and perform initial sync
          try {
            await this.testConnection();
            
            // Initialize realtime subscriptions
            if (this.supabaseDataService) {
              await this.supabaseDataService.initializeRealtime((table, event, record) => {
                console.log(`📡 Realtime update: ${table}.${event}`, record);
              });
            }
            
            await this.performFullSync();
            console.log('✅ Post-authentication sync completed');
          } catch (error) {
            console.warn('Post-authentication sync failed:', error);
          }
        } else {
          console.log('User signed out, disabling sync...');
          this.config.enableSync = false;
          await this.saveSyncSetting('enable_sync', false);
          await this.saveSyncSetting('sync_available', false);
          
          // Cleanup realtime subscriptions
          if (this.supabaseDataService) {
            await this.supabaseDataService.cleanup();
          }
        }
      });
      
      return;
    }

    // If user is authenticated, enable sync by default
    console.log('✅ User authenticated, enabling sync...');
    this.config.enableSync = true;
    await this.saveSyncSetting('enable_sync', true);

    // Load other sync settings from database
    const lastSyncTime = await this.getSyncSetting('last_sync_time', null);
    console.log('Last sync time:', lastSyncTime);

    // Test connection to Supabase
    if (this.config.enableSync) {
      console.log('Sync enabled, testing connection to Supabase...');
      try {
        await this.testConnection();
        console.log('✅ Successfully connected to Supabase');
        
        // Initialize realtime subscriptions
        if (this.supabaseDataService) {
          await this.supabaseDataService.initializeRealtime((table, event, record) => {
            console.log(`📡 Realtime update: ${table}.${event}`, record);
          });
        }
        
        // Perform startup sync
        console.log('Performing startup sync...');
        try {
          await this.performFullSync();
          console.log('✅ Startup sync completed successfully');
        } catch (error) {
          console.warn('Startup sync failed, continuing without sync:', error);
          await this.saveSyncSetting('sync_available', false);
        }
      } catch (error) {
        console.error('Could not connect to Supabase, running in offline mode:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          enableSync: this.config.enableSync
        });
        await this.saveSyncSetting('sync_available', false);
        this.config.enableSync = false;
      }
    } else {
      console.log('Sync disabled, running in offline mode');
      await this.saveSyncSetting('sync_available', false);
    }
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to Supabase...');
      
      if (!this.supabaseDataService) {
        throw new Error('Supabase data service not initialized');
      }

      const result = await this.supabaseDataService.testConnection();
      
      if (result) {
        console.log('✅ Connection test successful');
        await this.saveSyncSetting('sync_available', true);
        return true;
      } else {
        throw new Error('Connection test returned false');
      }
    } catch (error) {
      console.error('❌ Connection test failed:', {
        message: error instanceof Error ? error.message : 'Unknown error',
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
   * Push local changes to Supabase
   */
  private async pushLocalChanges(result: SyncResult): Promise<void> {
    if (!this.supabaseDataService) {
      throw new Error('Supabase data service not initialized');
    }

    const queueItems = await this.getPendingSyncItems();
    
    if (queueItems.length === 0) {
      console.log('No pending changes to push');
      return;
    }

    console.log(`Pushing ${queueItems.length} local changes to Supabase...`);
    
    const errors = await this.supabaseDataService.pushLocalChanges(queueItems);
    
    // Mark successfully synced items
    for (const item of queueItems) {
      const hasError = errors.find(e => e.recordId === item.record_id && e.table === item.table_name);
      
      if (!hasError) {
        await this.markSyncItemProcessed(item.id);
        result.syncedTables = Array.from(new Set([...result.syncedTables, item.table_name]));
      } else {
        await this.updateSyncItemError(item.id, hasError.error);
      }
    }
    
    result.errors.push(...errors);
  }

  /**
   * Pull remote changes from Supabase
   */
  private async pullRemoteChanges(result: SyncResult): Promise<void> {
    if (!this.supabaseDataService) {
      throw new Error('Supabase data service not initialized');
    }

    const lastSyncTime = await this.getSyncSetting('last_sync_time', '1970-01-01T00:00:00Z');
    
    console.log(`Pulling remote changes from Supabase since ${lastSyncTime}...`);
    
    const { syncedTables, errors } = await this.supabaseDataService.pullRemoteChanges(lastSyncTime);
    
    result.syncedTables = Array.from(new Set([...result.syncedTables, ...syncedTables]));
    result.errors.push(...errors);
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
        console.log('Skipping shutdown sync - Supabase not available');
      } else if (!this.config.enableSync) {
        console.log('Skipping shutdown sync - sync disabled');
      } else {
        console.log('Skipping shutdown sync - sync already in progress');
      }
    }
    
    // Cleanup realtime subscriptions
    if (this.supabaseDataService) {
      await this.supabaseDataService.cleanup();
    }
    
    console.log('SyncService shut down');
  }
}
