import { 
  SyncQueueItem, 
  UserSetting, 
  NotificationSettings, 
  SyncSettings, 
  CalendarSettings, 
  ReminderSettings 
} from '../types';

export class SettingsService {
  /**
   * Get user settings by key
   */
  static async getSetting<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      const result = await window.electronAPI.queryDatabase(
        'SELECT value FROM user_settings WHERE key = ?',
        [key]
      );

      if (result.length === 0) {
        return defaultValue as T;
      }

      return JSON.parse(result[0].value);
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return defaultValue as T;
    }
  }

  /**
   * Set user setting
   */
  static async setSetting(key: string, value: any, category: string = 'general'): Promise<void> {
    try {
      await window.electronAPI.executeQuery(`
        INSERT OR REPLACE INTO user_settings (key, value, category, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [key, JSON.stringify(value), category]);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const result = await window.electronAPI.queryDatabase(
        'SELECT key, value FROM user_settings WHERE category = ?',
        [category]
      );

      const settings: Record<string, any> = {};
      for (const row of result) {
        settings[row.key] = JSON.parse(row.value);
      }

      return settings;
    } catch (error) {
      console.error(`Error getting settings for category ${category}:`, error);
      return {};
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(): Promise<NotificationSettings> {
    return this.getSetting('notification_preferences', {
      email_notifications: true,
      system_notifications: true,
      reminder_defaults: {
        advance_notice: 60,
        work_hours_only: false,
        weekend_notifications: true
      },
      email_preferences: {
        daily_digest: false,
        urgent_only: false,
        summary_time: '09:00'
      }
    });
  }

  /**
   * Update notification settings
   */
  static async setNotificationSettings(settings: NotificationSettings): Promise<void> {
    await this.setSetting('notification_preferences', settings, 'notifications');
  }

  /**
   * Get sync settings
   */
  static async getSyncSettings(): Promise<SyncSettings> {
    return this.getSetting('sync_settings', {
      auto_sync: true,
      sync_interval: 300, // 5 minutes
      conflict_resolution: 'ask'
    });
  }

  /**
   * Update sync settings
   */
  static async setSyncSettings(settings: SyncSettings): Promise<void> {
    await this.setSetting('sync_settings', settings, 'sync');
  }

  /**
   * Get calendar settings
   */
  static async getCalendarSettings(): Promise<CalendarSettings> {
    return this.getSetting('calendar_settings', {
      default_view: 'month',
      show_completed: false,
      color_scheme: 'priority'
    });
  }

  /**
   * Update calendar settings
   */
  static async setCalendarSettings(settings: CalendarSettings): Promise<void> {
    await this.setSetting('calendar_settings', settings, 'calendar');
  }

  /**
   * Get reminder settings
   */
  static async getReminderSettings(): Promise<ReminderSettings> {
    return this.getSetting('reminder_settings', {
      auto_generate: true,
      smart_scheduling: true,
      default_priority: 'medium'
    });
  }

  /**
   * Update reminder settings
   */
  static async setReminderSettings(settings: ReminderSettings): Promise<void> {
    await this.setSetting('reminder_settings', settings, 'reminders');
  }

  /**
   * Reset all settings to defaults
   */
  static async resetAllSettings(): Promise<void> {
    await window.electronAPI.executeQuery('DELETE FROM user_settings');
    
    // Re-insert defaults
    const defaultSettings = [
      {
        key: 'notification_preferences',
        value: {
          email_notifications: true,
          system_notifications: true,
          reminder_defaults: {
            advance_notice: 60,
            work_hours_only: false,
            weekend_notifications: true
          },
          email_preferences: {
            daily_digest: false,
            urgent_only: false,
            summary_time: '09:00'
          }
        },
        category: 'notifications'
      },
      {
        key: 'sync_settings',
        value: {
          auto_sync: true,
          sync_interval: 300,
          conflict_resolution: 'ask'
        },
        category: 'sync'
      },
      {
        key: 'calendar_settings',
        value: {
          default_view: 'month',
          show_completed: false,
          color_scheme: 'priority'
        },
        category: 'calendar'
      },
      {
        key: 'reminder_settings',
        value: {
          auto_generate: true,
          smart_scheduling: true,
          default_priority: 'medium'
        },
        category: 'reminders'
      }
    ];

    for (const setting of defaultSettings) {
      await this.setSetting(setting.key, setting.value, setting.category);
    }
  }

  /**
   * Export all settings
   */
  static async exportSettings(): Promise<Record<string, any>> {
    try {
      const result = await window.electronAPI.queryDatabase(
        'SELECT key, value, category FROM user_settings'
      );

      const settings: Record<string, any> = {};
      for (const row of result) {
        if (!settings[row.category]) {
          settings[row.category] = {};
        }
        settings[row.category][row.key] = JSON.parse(row.value);
      }

      return settings;
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw error;
    }
  }

  /**
   * Import settings
   */
  static async importSettings(settings: Record<string, any>): Promise<void> {
    try {
      for (const [category, categorySettings] of Object.entries(settings)) {
        for (const [key, value] of Object.entries(categorySettings)) {
          await this.setSetting(key, value, category);
        }
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      throw error;
    }
  }
}

/**
 * Settings Service Utilities for Renderer Process
 * (The main SyncService is in the main process, this provides renderer utilities)
 */
export class SyncUtilities {
  /**
   * Add item to sync queue via IPC
   */
  static async addToSyncQueue(
    tableName: string,
    recordId: number,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    try {
      await window.electronAPI.executeQuery(`
        INSERT INTO sync_queue (table_name, record_id, operation, data)
        VALUES (?, ?, ?, ?)
      `, [
        tableName,
        recordId,
        operation,
        data ? JSON.stringify(data) : null
      ]);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get pending sync items
   */
  static async getPendingSyncItems(limit?: number): Promise<SyncQueueItem[]> {
    try {
      let query = `
        SELECT * FROM sync_queue 
        WHERE synced_at IS NULL 
        ORDER BY created_at ASC
      `;
      const params: any[] = [];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const result = await window.electronAPI.queryDatabase(query, params);
      return result.map((row: any) => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : null
      }));
    } catch (error) {
      console.error('Error getting pending sync items:', error);
      return [];
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(): Promise<{
    pending: number;
    failed: number;
    completed: number;
    lastSyncTime?: string;
  }> {
    try {
      const [pendingResult, failedResult, completedResult, lastSyncResult] = await Promise.all([
        window.electronAPI.queryDatabase(
          'SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL AND retry_count < 3'
        ),
        window.electronAPI.queryDatabase(
          'SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL AND retry_count >= 3'
        ),
        window.electronAPI.queryDatabase(
          'SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NOT NULL'
        ),
        window.electronAPI.queryDatabase(
          'SELECT MAX(synced_at) as last_sync FROM sync_queue WHERE synced_at IS NOT NULL'
        )
      ]);

      return {
        pending: pendingResult[0]?.count || 0,
        failed: failedResult[0]?.count || 0,
        completed: completedResult[0]?.count || 0,
        lastSyncTime: lastSyncResult[0]?.last_sync
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        pending: 0,
        failed: 0,
        completed: 0
      };
    }
  }

  /**
   * Request manual sync via IPC
   */
  static async triggerSync(): Promise<void> {
    try {
      // This would be exposed via IPC to trigger sync in main process
      await (window as any).electronAPI.triggerSync?.();
    } catch (error) {
      console.error('Error triggering sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status via IPC
   */
  static async getSyncStatus(): Promise<{
    lastSync: string | null;
    pendingItems: number;
    syncInProgress: boolean;
    autoSyncEnabled: boolean;
  }> {
    try {
      // This would be exposed via IPC to get sync status from main process
      return await (window as any).electronAPI.getSyncStatus?.() || {
        lastSync: null,
        pendingItems: 0,
        syncInProgress: false,
        autoSyncEnabled: false,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        lastSync: null,
        pendingItems: 0,
        syncInProgress: false,
        autoSyncEnabled: false,
      };
    }
  }
}
