import { SupabaseClient, RealtimeChannel, REALTIME_LISTEN_TYPES, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';
import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
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

/**
 * TABLE_FIELD_MAPPING defines which fields to sync for each table
 * Carefully verified against database schema in 001_initial.ts migration
 * 
 * COMPANIES: name, website, industry, location, size, description
 * CONTACTS: company_id (FK), first_name, last_name, email, phone, position, linkedin_url, notes
 * APPLICATIONS: company_id (FK), contact_id (FK), title, position, job_url, application_channel,
 *               salary_range, work_type, location, remote_possible, status, priority,
 *               application_date, deadline, follow_up_date, notes, cover_letter, requirements, benefits
 * REMINDERS: application_id (FK), title, description, reminder_date, reminder_time,
 *            reminder_type, is_completed, completed_at, is_active, email_notification_enabled,
 *            notification_time, priority, recurrence_pattern, auto_generated,
 *            parent_reminder_id (FK to reminders), snooze_until, completion_note
 * FILES: application_id (FK), filename, original_name, file_path, size, mime_type, type,
 *        description, storage_path, upload_date
 *        Note: 'data' BLOB excluded - files sync via Supabase Storage
 * STATUS_HISTORY: application_id (FK), from_status, to_status, note, created_by
 */
const TABLE_FIELD_MAPPING = {
  companies: {
    syncFields: ['name', 'website', 'industry', 'location', 'size', 'description'],
    foreignKeys: [],
    excludeFields: ['id', 'created_at', 'updated_at', 'deleted_at', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'user_id'],
  },
  contacts: {
    syncFields: ['company_id', 'first_name', 'last_name', 'email', 'phone', 'position', 'linkedin_url', 'notes'],
    foreignKeys: ['company_id'],
    excludeFields: ['id', 'created_at', 'updated_at', 'deleted_at', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'user_id'],
  },
  applications: {
    syncFields: [
      'company_id', 'contact_id', 'title', 'position', 'job_url', 'application_channel',
      'salary_range', 'work_type', 'location', 'remote_possible', 'status', 'priority',
      'application_date', 'deadline', 'follow_up_date', 'notes', 'cover_letter',
      'requirements', 'benefits'
    ],
    foreignKeys: ['company_id', 'contact_id'],
    excludeFields: ['id', 'created_at', 'updated_at', 'deleted_at', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'user_id'],
  },
  reminders: {
    syncFields: [
      'application_id', 'title', 'description', 'reminder_date', 'reminder_time',
      'reminder_type', 'is_completed', 'completed_at', 'is_active',
      'email_notification_enabled', 'notification_time', 'priority',
      'recurrence_pattern', 'auto_generated', 'parent_reminder_id',
      'snooze_until', 'completion_note'
    ],
    foreignKeys: ['application_id', 'parent_reminder_id'],
    excludeFields: ['id', 'created_at', 'updated_at', 'deleted_at', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'user_id'],
  },
  files: {
    syncFields: [
      'application_id', 'filename', 'original_name', 'file_path', 'size',
      'mime_type', 'type', 'description', 'storage_path', 'upload_date'
    ],
    foreignKeys: ['application_id'],
    excludeFields: ['id', 'data', 'created_at', 'updated_at', 'deleted_at', 'last_synced_at', 'sync_version', 'user_id'],
  },
  status_history: {
    syncFields: ['application_id', 'from_status', 'to_status', 'note', 'created_by'],
    foreignKeys: ['application_id'],
    excludeFields: ['id', 'created_at', 'deleted_at', 'supabase_id', 'sync_status', 'last_synced_at', 'sync_version', 'user_id'],
  },
};

/**
 * Service for direct communication with Supabase database
 * Uses relational schema matching local SQLite structure
 * Handles UUID (Supabase) ↔ INTEGER (SQLite) foreign key conversion
 */
export class SupabaseDataService {
  private supabase: SupabaseClient;
  private db: Database<sqlite3.Database, sqlite3.Statement>;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private syncInProgress = false;
  private onChangeCallback?: (table: string, event: string, record: any) => void;
  
  // Cache for UUID ↔ INTEGER mapping to improve performance
  private uuidToLocalIdCache: Map<string, Map<string, number>> = new Map();
  private localIdToUuidCache: Map<string, Map<number, string>> = new Map();

  constructor(
    db: Database<sqlite3.Database, sqlite3.Statement>,
    config: SupabaseDataConfig
  ) {
    this.db = db;
    this.supabase = config.supabaseClient;
    this.initializeCache();
  }

  /**
   * Initialize ID mapping cache for all tables
   */
  private async initializeCache(): Promise<void> {
    const tables = Object.keys(TABLE_FIELD_MAPPING);
    
    for (const table of tables) {
      this.uuidToLocalIdCache.set(table, new Map());
      this.localIdToUuidCache.set(table, new Map());
      
      try {
        const rows = await this.db.all<Array<{ id: number; supabase_id: string }>>(
          `SELECT id, supabase_id FROM ${table} WHERE supabase_id IS NOT NULL`
        );
        
        for (const row of rows) {
          this.uuidToLocalIdCache.get(table)!.set(row.supabase_id, row.id);
          this.localIdToUuidCache.get(table)!.set(row.id, row.supabase_id);
        }
        
        console.log(`Cached ${rows.length} ID mappings for ${table}`);
      } catch (error) {
        console.error(`Error initializing cache for ${table}:`, error);
      }
    }
  }

  /**
   * Get local INTEGER id from Supabase UUID
   */
  private async getLocalId(table: string, supabaseId: string | null): Promise<number | null> {
    if (!supabaseId) return null;
    
    const cached = this.uuidToLocalIdCache.get(table)?.get(supabaseId);
    if (cached !== undefined) return cached;
    
    const row = await this.db.get<{ id: number }>(
      `SELECT id FROM ${table} WHERE supabase_id = ?`,
      [supabaseId]
    );
    
    if (row) {
      this.uuidToLocalIdCache.get(table)?.set(supabaseId, row.id);
      this.localIdToUuidCache.get(table)?.set(row.id, supabaseId);
      return row.id;
    }
    
    return null;
  }

  /**
   * Get Supabase UUID from local INTEGER id
   */
  private async getSupabaseId(table: string, localId: number | null): Promise<string | null> {
    if (!localId) return null;
    
    const cached = this.localIdToUuidCache.get(table)?.get(localId);
    if (cached !== undefined) return cached;
    
    const row = await this.db.get<{ supabase_id: string }>(
      `SELECT supabase_id FROM ${table} WHERE id = ?`,
      [localId]
    );
    
    if (row?.supabase_id) {
      this.uuidToLocalIdCache.get(table)?.set(row.supabase_id, localId);
      this.localIdToUuidCache.get(table)?.set(localId, row.supabase_id);
      return row.supabase_id;
    }
    
    return null;
  }

  /**
   * Update cache when new records are created or IDs are assigned
   */
  private updateCache(table: string, localId: number, supabaseId: string): void {
    this.uuidToLocalIdCache.get(table)?.set(supabaseId, localId);
    this.localIdToUuidCache.get(table)?.set(localId, supabaseId);
  }

  /**
   * Clear cache entry when record is deleted
   */
  private clearCache(table: string, localId?: number, supabaseId?: string): void {
    if (localId) {
      const uuid = this.localIdToUuidCache.get(table)?.get(localId);
      if (uuid) {
        this.uuidToLocalIdCache.get(table)?.delete(uuid);
      }
      this.localIdToUuidCache.get(table)?.delete(localId);
    }
    if (supabaseId) {
      const id = this.uuidToLocalIdCache.get(table)?.get(supabaseId);
      if (id) {
        this.localIdToUuidCache.get(table)?.delete(id);
      }
      this.uuidToLocalIdCache.get(table)?.delete(supabaseId);
    }
  }

  /**
   * Get the referenced table name from a foreign key field
   * Examples: 'company_id' -> 'companies', 'parent_reminder_id' -> 'reminders'
   */
  private getForeignKeyTable(fkField: string): string {
    if (fkField === 'parent_reminder_id') return 'reminders';
    
    const singular = fkField.replace(/_id$/, '');
    
    const plurals: Record<string, string> = {
      'company': 'companies',
      'contact': 'contacts',
      'application': 'applications',
      'reminder': 'reminders',
      'file': 'files',
    };
    
    return plurals[singular] || `${singular}s`;
  }

  /**
   * Convert foreign keys from local INTEGER ids to Supabase UUIDs
   * Used when pushing local changes to Supabase
   */
  private async convertForeignKeysToUuid(table: string, localRecord: any): Promise<any> {
    const mapping = TABLE_FIELD_MAPPING[table as keyof typeof TABLE_FIELD_MAPPING];
    if (!mapping) return localRecord;
    
    const converted = { ...localRecord };
    
    for (const fkField of mapping.foreignKeys) {
      const localId = localRecord[fkField];
      if (localId !== null && localId !== undefined) {
        const refTable = this.getForeignKeyTable(fkField);
        const supabaseId = await this.getSupabaseId(refTable, localId);
        converted[fkField] = supabaseId;
      }
    }
    
    return converted;
  }

  /**
   * Convert foreign keys from Supabase UUIDs to local INTEGER ids
   * Used when pulling remote changes to local database
   */
  private async convertForeignKeysToLocal(table: string, remoteRecord: any): Promise<any> {
    const mapping = TABLE_FIELD_MAPPING[table as keyof typeof TABLE_FIELD_MAPPING];
    if (!mapping) return remoteRecord;
    
    const converted = { ...remoteRecord };
    
    for (const fkField of mapping.foreignKeys) {
      const supabaseId = remoteRecord[fkField];
      if (supabaseId !== null && supabaseId !== undefined) {
        const refTable = this.getForeignKeyTable(fkField);
        const localId = await this.getLocalId(refTable, supabaseId);
        converted[fkField] = localId;
      }
    }
    
    return converted;
  }

  /**
   * Initialize realtime subscriptions for all tables
   */
  async initializeRealtime(onChange?: (table: string, event: string, record: any) => void): Promise<void> {
    this.onChangeCallback = onChange;

    const tables = Object.keys(TABLE_FIELD_MAPPING);
    
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
   * Verified fields: Matches syncFields from TABLE_FIELD_MAPPING
   */
  private async applyRemoteInsert(table: string, remoteRecord: any): Promise<void> {
    try {
      const existing = await this.db.get(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [remoteRecord.id]
      );

      if (existing) {
        console.log(`Record ${remoteRecord.id} already exists in ${table}, skipping insert`);
        return;
      }

      const mapping = TABLE_FIELD_MAPPING[table as keyof typeof TABLE_FIELD_MAPPING];
      if (!mapping) {
        console.error(`No field mapping found for table: ${table}`);
        return;
      }

      const convertedRecord = await this.convertForeignKeysToLocal(table, remoteRecord);

      const fields = mapping.syncFields.filter(field => convertedRecord[field] !== undefined);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => convertedRecord[field]);

      const result = await this.db.run(
        `INSERT INTO ${table} (${fields.join(', ')}, supabase_id, sync_status, last_synced_at, created_at, updated_at)
         VALUES (${placeholders}, ?, 'synced', CURRENT_TIMESTAMP, ?, ?)`,
        [...values, remoteRecord.id, remoteRecord.created_at || new Date().toISOString(), remoteRecord.updated_at || new Date().toISOString()]
      );

      if (result.lastID) {
        this.updateCache(table, result.lastID, remoteRecord.id);
      }

      console.log(`✅ Applied remote insert for ${table}: ${remoteRecord.id} -> local id ${result.lastID}`);
    } catch (error) {
      console.error(`Error applying remote insert for ${table}:`, error);
    }
  }

  /**
   * Apply remote update to local database
   * Verified fields: Matches syncFields from TABLE_FIELD_MAPPING
   */
  private async applyRemoteUpdate(table: string, remoteRecord: any): Promise<void> {
    try {
      const existing = await this.db.get<{ id: number }>(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [remoteRecord.id]
      );

      if (!existing) {
        console.log(`Remote record ${remoteRecord.id} not found locally, inserting`);
        await this.applyRemoteInsert(table, remoteRecord);
        return;
      }

      const mapping = TABLE_FIELD_MAPPING[table as keyof typeof TABLE_FIELD_MAPPING];
      if (!mapping) {
        console.error(`No field mapping found for table: ${table}`);
        return;
      }

      const convertedRecord = await this.convertForeignKeysToLocal(table, remoteRecord);

      const fields = mapping.syncFields.filter(field => convertedRecord[field] !== undefined);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => convertedRecord[field]);

      await this.db.run(
        `UPDATE ${table} 
         SET ${setClause}, sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP, updated_at = ?
         WHERE id = ?`,
        [...values, remoteRecord.updated_at || new Date().toISOString(), existing.id]
      );

      console.log(`✅ Applied remote update for ${table}: ${remoteRecord.id} -> local id ${existing.id}`);
    } catch (error) {
      console.error(`Error applying remote update for ${table}:`, error);
    }
  }

  /**
   * Apply remote delete to local database
   */
  private async applyRemoteDelete(table: string, remoteRecord: any): Promise<void> {
    try {
      const existing = await this.db.get<{ id: number }>(
        `SELECT id FROM ${table} WHERE supabase_id = ?`,
        [remoteRecord.id]
      );

      if (existing) {
        await this.db.run(
          `DELETE FROM ${table} WHERE id = ?`,
          [existing.id]
        );
        
        this.clearCache(table, existing.id, remoteRecord.id);
        
        console.log(`✅ Applied remote delete for ${table}: ${remoteRecord.id} -> local id ${existing.id}`);
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
    const { table_name, record_id, operation } = item;
    
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
   * Verified fields: Only syncFields are included, foreign keys converted to UUIDs
   */
  private async upsertRecord(table: string, localRecord: any, userId: string): Promise<void> {
    const mapping = TABLE_FIELD_MAPPING[table as keyof typeof TABLE_FIELD_MAPPING];
    if (!mapping) {
      throw new Error(`No field mapping found for table: ${table}`);
    }

    const convertedRecord = await this.convertForeignKeysToUuid(table, localRecord);

    const data: any = {};
    for (const field of mapping.syncFields) {
      if (convertedRecord[field] !== undefined && !mapping.excludeFields.includes(field)) {
        data[field] = convertedRecord[field];
      }
    }

    const supabaseRecord: any = {
      ...data,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (localRecord.supabase_id) {
      supabaseRecord.id = localRecord.supabase_id;
      
      const { error } = await this.supabase
        .from(table)
        .update(supabaseRecord)
        .eq('id', localRecord.supabase_id);

      if (error) throw error;
      
      console.log(`✅ Updated ${table} record in Supabase: ${localRecord.supabase_id}`);
    } else {
      supabaseRecord.created_at = localRecord.created_at || new Date().toISOString();
      
      const { data: inserted, error } = await this.supabase
        .from(table)
        .insert(supabaseRecord)
        .select()
        .single();

      if (error) throw error;

      if (inserted) {
        await this.db.run(
          `UPDATE ${table} SET supabase_id = ?, sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [inserted.id, localRecord.id]
        );
        
        this.updateCache(table, localRecord.id, inserted.id);
      }
      
      console.log(`✅ Inserted ${table} record into Supabase: ${inserted?.id} (local id ${localRecord.id})`);
    }

    await this.db.run(
      `UPDATE ${table} SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [localRecord.id]
    );
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
   * Pull remote changes from Supabase since last sync
   */
  async pullRemoteChanges(lastSyncTime: string): Promise<{ syncedTables: string[], errors: SyncError[] }> {
    const syncedTables: string[] = [];
    const errors: SyncError[] = [];
    const tables = Object.keys(TABLE_FIELD_MAPPING);

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
              const existing = await this.db.get(
                `SELECT id, updated_at FROM ${table} WHERE supabase_id = ?`,
                [record.id]
              );

              if (existing) {
                await this.applyRemoteUpdate(table, record);
              } else {
                await this.applyRemoteInsert(table, record);
              }
            } catch (err) {
              console.error(`Error applying change for ${table} record ${record.id}:`, err);
              errors.push({
                table,
                recordId: 0,
                operation: 'apply_remote_change',
                error: err instanceof Error ? err.message : 'Unknown error',
                retryable: true,
              });
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
   * Perform a full sync: push local changes, then pull remote changes
   */
  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const syncedTables: string[] = [];
    const errors: SyncError[] = [];

    try {
      console.log('📤 Pushing local changes...');
      const queueItems = await this.db.all(
        'SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC'
      );
      
      if (queueItems.length > 0) {
        const pushErrors = await this.pushLocalChanges(queueItems);
        errors.push(...pushErrors);
        
        const successfulItems = queueItems.filter(
          item => !pushErrors.some(err => err.table === item.table_name && err.recordId === item.record_id)
        );
        
        for (const item of successfulItems) {
          await this.db.run(
            'UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.id]
          );
        }
      }

      console.log('📥 Pulling remote changes...');
      const lastSyncTime = await this.getLastSyncTime();
      const pullResult = await this.pullRemoteChanges(lastSyncTime);
      
      syncedTables.push(...pullResult.syncedTables);
      errors.push(...pullResult.errors);

      const now = new Date().toISOString();
      await this.updateLastSyncTime(now);

      console.log(`✅ Sync completed: ${syncedTables.length} tables synced, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        syncedTables,
        errors,
        lastSyncTime: now,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get the last sync timestamp from user_settings
   */
  private async getLastSyncTime(): Promise<string> {
    try {
      const row = await this.db.get<{ value: string }>(
        "SELECT value FROM user_settings WHERE key = 'last_sync_time'"
      );
      
      if (row) {
        const settings = JSON.parse(row.value);
        return settings.timestamp || new Date(0).toISOString();
      }
    } catch (error) {
      console.error('Error getting last sync time:', error);
    }
    
    return new Date(0).toISOString();
  }

  /**
   * Update the last sync timestamp in user_settings
   */
  private async updateLastSyncTime(timestamp: string): Promise<void> {
    try {
      await this.db.run(
        `INSERT OR REPLACE INTO user_settings (key, value, category, updated_at)
         VALUES ('last_sync_time', ?, 'sync', CURRENT_TIMESTAMP)`,
        [JSON.stringify({ timestamp })]
      );
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
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

      const { error } = await this.supabase
        .from('companies')
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
   * Clean up realtime subscriptions and cache
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Supabase realtime subscriptions...');
    
    for (const [table, channel] of this.realtimeChannels.entries()) {
      await channel.unsubscribe();
      console.log(`Unsubscribed from ${table}`);
    }
    
    this.realtimeChannels.clear();
    this.uuidToLocalIdCache.clear();
    this.localIdToUuidCache.clear();
    
    console.log('✅ All realtime subscriptions and caches cleaned up');
  }
}
