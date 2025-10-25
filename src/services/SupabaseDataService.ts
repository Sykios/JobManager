import { SupabaseClient, RealtimeChannel, REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';
import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Application, Company, Contact, Reminder, SyncStatus } from '../types';
import { getAuthService } from './AuthService';

export interface SupabaseDataConfig {
  supabaseClient: SupabaseClient;
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

export interface SupabaseRecord {
  id: string;
  user_id: string;
  data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Service for direct communication with Supabase database
 * Replaces the HTTP API with direct Supabase SDK calls
 */
export class SupabaseDataService {
  private supabase: SupabaseClient;
  private db: Database<sqlite3.Database, sqlite3.Statement>;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private syncInProgress = false;
  private onChangeCallback?: (table: string, event: string, record: any) => void;

  constructor(
    db: Database<sqlite3.Database, sqlite3.Statement>,
    config: SupabaseDataConfig
  ) {
    this.db = db;
    this.supabase = config.supabaseClient;
  }

  /**
   * Initialize realtime subscriptions for all tables
   */
  async initializeRealtime(onChange?: (table: string, event: string, record: any) => void): Promise<void> {
    this.onChangeCallback = onChange;

    const tables = ['applications', 'companies', 'contacts', 'reminders'];
    
    for (const table of tables) {
      await this.subscribeToTable(table);
    }

    console.log('✅ Realtime subscriptions initialized');
  }

  /**
   * Subscribe to realtime changes for a specific table
   */
  private async subscribeToTable(table: string): Promise<void> {
    try {
      // Remove existing subscription if any
      if (this.realtimeChannels.has(table)) {
        await this.realtimeChannels.get(table)?.unsubscribe();
        this.realtimeChannels.delete(table);
      }

      const authService = getAuthService();
      if (!authService) {
        console.warn(`Cannot subscribe to ${table}: Auth service not available`);
        return;
      }

      const user = authService.getCurrentUser();
      if (!user) {
        console.warn(`Cannot subscribe to ${table}: User not authenticated`);
        return;
      }

      // Create a new channel for this table
      const channel = this.supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes' as REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
          {
            event: '*' as REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
            schema: 'public',
            table: table,
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log(`📡 Realtime event for ${table}:`, payload.eventType);
            await this.handleRealtimeChange(table, payload);
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription for ${table}:`, status);
        });

      this.realtimeChannels.set(table, channel);
    } catch (error) {
      console.error(`Error subscribing to ${table}:`, error);
    }
  }

  /**
   * Handle realtime change from Supabase
   */
  private async handleRealtimeChange(table: string, payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Notify callback if registered
      if (this.onChangeCallback) {
        this.onChangeCallback(table, eventType, newRecord || oldRecord);
      }

      switch (eventType) {
        case 'INSERT':
          await this.applyRemoteInsert(table, newRecord);
          break;
        case 'UPDATE':
          await this.applyRemoteUpdate(table, newRecord);
          break;
        case 'DELETE':
          await this.applyRemoteDelete(table, oldRecord);
          break;
      }
    } catch (error) {
      console.error(`Error handling realtime change for ${table}:`, error);
    }
  }

  /**
   * Apply remote insert to local database
   */
  private async applyRemoteInsert(table: string, record: any): Promise<void> {
    try {
      // Check if record already exists
      const existing = await this.db.get(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [record.id]
      );

      if (existing) {
        console.log(`Record ${record.id} already exists in ${table}, skipping insert`);
        return;
      }

      // Extract data fields (exclude metadata)
      const data = record.data || record;
      const fields = Object.keys(data).filter(
        key => !['id', 'user_id', 'created_at', 'updated_at'].includes(key)
      );

      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => data[field]);

      await this.db.run(
        `INSERT INTO ${table} (${fields.join(', ')}, supabase_id, sync_status, last_synced_at, created_at, updated_at)
         VALUES (${placeholders}, ?, 'synced', CURRENT_TIMESTAMP, ?, ?)`,
        [...values, record.id, record.created_at, record.updated_at]
      );

      console.log(`✅ Applied remote insert for ${table}: ${record.id}`);
    } catch (error) {
      console.error(`Error applying remote insert for ${table}:`, error);
    }
  }

  /**
   * Apply remote update to local database
   */
  private async applyRemoteUpdate(table: string, record: any): Promise<void> {
    try {
      // Find local record
      const existing = await this.db.get(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [record.id]
      );

      if (!existing) {
        // Record doesn't exist locally, treat as insert
        await this.applyRemoteInsert(table, record);
        return;
      }

      // Extract data fields
      const data = record.data || record;
      const fields = Object.keys(data).filter(
        key => !['id', 'user_id', 'created_at', 'updated_at'].includes(key)
      );

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);

      await this.db.run(
        `UPDATE ${table} SET ${setClause}, sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP, updated_at = ?
         WHERE id = ?`,
        [...values, record.updated_at, existing.id]
      );

      console.log(`✅ Applied remote update for ${table}: ${record.id}`);
    } catch (error) {
      console.error(`Error applying remote update for ${table}:`, error);
    }
  }

  /**
   * Apply remote delete to local database
   */
  private async applyRemoteDelete(table: string, record: any): Promise<void> {
    try {
      const existing = await this.db.get(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [record.id]
      );

      if (existing) {
        await this.db.run(
          `DELETE FROM ${table} WHERE id = ?`,
          [existing.id]
        );
        console.log(`✅ Applied remote delete for ${table}: ${record.id}`);
      }
    } catch (error) {
      console.error(`Error applying remote delete for ${table}:`, error);
    }
  }

  /**
   * Push local changes to Supabase
   */
  async pushLocalChanges(queueItems: any[]): Promise<SyncError[]> {
    const errors: SyncError[] = [];

    for (const item of queueItems) {
      try {
        await this.pushSyncItem(item);
      } catch (error) {
        errors.push({
          table: item.table_name,
          recordId: item.record_id,
          operation: item.operation,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        });
      }
    }

    return errors;
  }

  /**
   * Push a single sync item to Supabase
   */
  private async pushSyncItem(item: any): Promise<void> {
    const { table_name, record_id, operation, data } = item;
    
    // Get local record
    const localRecord = await this.db.get(
      `SELECT * FROM ${table_name} WHERE id = ?`,
      [record_id]
    );

    if (!localRecord && operation !== 'delete') {
      throw new Error(`Local record not found: ${table_name}#${record_id}`);
    }

    const authService = getAuthService();
    const user = authService?.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    switch (operation) {
      case 'create':
      case 'update':
        await this.upsertRecord(table_name, localRecord, user.id);
        break;
      case 'delete':
        if (localRecord?.supabase_id) {
          await this.deleteRecord(table_name, localRecord.supabase_id);
        }
        break;
    }
  }

  /**
   * Upsert (insert or update) a record in Supabase
   */
  private async upsertRecord(table: string, localRecord: any, userId: string): Promise<void> {
    // Prepare data for Supabase (exclude internal fields)
    const excludeFields = ['id', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'deleted_at'];
    const data: any = {};
    
    for (const [key, value] of Object.entries(localRecord)) {
      if (!excludeFields.includes(key)) {
        data[key] = value;
      }
    }

    // Prepare Supabase record
    const supabaseRecord: any = {
      data,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // If record has supabase_id, update it; otherwise insert
    if (localRecord.supabase_id) {
      supabaseRecord.id = localRecord.supabase_id;
      
      const { error } = await this.supabase
        .from(table)
        .update(supabaseRecord)
        .eq('id', localRecord.supabase_id);

      if (error) throw error;
    } else {
      supabaseRecord.created_at = localRecord.created_at || new Date().toISOString();
      
      const { data: inserted, error } = await this.supabase
        .from(table)
        .insert(supabaseRecord)
        .select()
        .single();

      if (error) throw error;

      // Update local record with supabase_id
      if (inserted) {
        await this.db.run(
          `UPDATE ${table} SET supabase_id = ?, sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [inserted.id, localRecord.id]
        );
      }
    }

    // Mark as synced
    await this.db.run(
      `UPDATE ${table} SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [localRecord.id]
    );

    console.log(`✅ Pushed ${table} record ${localRecord.id} to Supabase`);
  }

  /**
   * Delete a record from Supabase
   */
  private async deleteRecord(table: string, supabaseId: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', supabaseId);

    if (error) throw error;

    console.log(`✅ Deleted ${table} record ${supabaseId} from Supabase`);
  }

  /**
   * Pull remote changes from Supabase
   */
  async pullRemoteChanges(lastSyncTime: string): Promise<{ syncedTables: string[], errors: SyncError[] }> {
    const syncedTables: string[] = [];
    const errors: SyncError[] = [];
    const tables = ['applications', 'companies', 'contacts', 'reminders'];

    const authService = getAuthService();
    const user = authService?.getCurrentUser();
    if (!user) {
      errors.push({
        table: 'system',
        recordId: 0,
        operation: 'pull',
        error: 'User not authenticated',
        retryable: false,
      });
      return { syncedTables, errors };
    }

    for (const table of tables) {
      try {
        console.log(`Pulling changes for ${table} since ${lastSyncTime}`);
        
        // Fetch records updated since last sync
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .gte('updated_at', lastSyncTime)
          .order('updated_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          console.log(`Found ${data.length} updated records in ${table}`);
          
          for (const record of data) {
            try {
              // Check if record exists locally
              const existing = await this.db.get(
                `SELECT id, updated_at FROM ${table} WHERE supabase_id = ?`,
                [record.id]
              );

              if (existing) {
                // Update existing record
                await this.applyRemoteUpdate(table, record);
              } else {
                // Insert new record
                await this.applyRemoteInsert(table, record);
              }
            } catch (err) {
              console.error(`Error applying change for ${table} record ${record.id}:`, err);
            }
          }

          syncedTables.push(table);
        }
      } catch (error) {
        errors.push({
          table,
          recordId: 0,
          operation: 'pull',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        });
        console.error(`Error pulling changes for ${table}:`, error);
      }
    }

    return { syncedTables, errors };
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const authService = getAuthService();
      const user = authService?.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Simple query to test connection
      const { error } = await this.supabase
        .from('applications')
        .select('id')
        .limit(1);

      if (error) throw error;

      console.log('✅ Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Clean up realtime subscriptions
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Supabase realtime subscriptions...');
    
    for (const [table, channel] of this.realtimeChannels.entries()) {
      await channel.unsubscribe();
      console.log(`Unsubscribed from ${table}`);
    }
    
    this.realtimeChannels.clear();
    console.log('✅ All realtime subscriptions cleaned up');
  }
}
