import { Reminder, ReminderType, ReminderPriority, SyncStatus, RecurrencePattern } from '../types';

export class ReminderModel implements Reminder {
  id: number;
  application_id?: number;
  title: string;
  description?: string;
  reminder_date: string; // Now DATE only
  reminder_time?: string; // NEW: TIME field
  reminder_type: ReminderType;
  is_completed: boolean;
  completed_at?: string; // NEW: When completed
  is_active: boolean; // NEW: For filtering
  created_at: string;
  updated_at: string;
  deleted_at?: string; // NEW: For soft deletes
  
  // Enhanced fields
  supabase_id?: string;
  sync_status: SyncStatus;
  email_notification_enabled: boolean;
  notification_time: number;
  last_synced_at?: string;
  priority: ReminderPriority;
  recurrence_pattern?: string;
  auto_generated: boolean;
  parent_reminder_id?: number;
  snooze_until?: string;
  completion_note?: string;
  sync_version: number; // NEW: For conflict resolution

  constructor(data: Partial<Reminder> = {}) {
    this.id = data.id || 0;
    this.application_id = data.application_id;
    this.title = data.title || '';
    this.description = data.description;
    this.reminder_date = data.reminder_date || new Date().toISOString().split('T')[0]; // Just date
    this.reminder_time = data.reminder_time; // Optional time
    this.reminder_type = data.reminder_type || 'custom';
    this.is_completed = data.is_completed || false;
    this.completed_at = data.completed_at;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.deleted_at = data.deleted_at;
    
    // Enhanced fields with defaults
    this.supabase_id = data.supabase_id;
    this.sync_status = data.sync_status || 'pending';
    this.email_notification_enabled = data.email_notification_enabled !== undefined ? data.email_notification_enabled : true;
    this.notification_time = data.notification_time || 60; // 1 hour default
    this.last_synced_at = data.last_synced_at;
    this.priority = data.priority || 'medium';
    this.recurrence_pattern = data.recurrence_pattern;
    this.auto_generated = data.auto_generated || false;
    this.parent_reminder_id = data.parent_reminder_id;
    this.snooze_until = data.snooze_until;
    this.completion_note = data.completion_note;
    this.sync_version = data.sync_version || 1;
  }

  static fromJSON(json: any): ReminderModel {
    return new ReminderModel({
      id: json.id,
      application_id: json.application_id,
      title: json.title,
      description: json.description,
      reminder_date: json.reminder_date,
      reminder_time: json.reminder_time,
      reminder_type: json.reminder_type,
      is_completed: Boolean(json.is_completed),
      completed_at: json.completed_at,
      is_active: json.is_active !== undefined ? Boolean(json.is_active) : true,
      created_at: json.created_at,
      updated_at: json.updated_at,
      deleted_at: json.deleted_at,
      supabase_id: json.supabase_id,
      sync_status: json.sync_status,
      email_notification_enabled: Boolean(json.email_notification_enabled),
      notification_time: json.notification_time,
      last_synced_at: json.last_synced_at,
      priority: json.priority,
      recurrence_pattern: json.recurrence_pattern,
      auto_generated: Boolean(json.auto_generated),
      parent_reminder_id: json.parent_reminder_id,
      snooze_until: json.snooze_until,
      completion_note: json.completion_note,
      sync_version: json.sync_version || 1
    });
  }

  toJSON(): Reminder {
    return {
      id: this.id,
      application_id: this.application_id,
      title: this.title,
      description: this.description,
      reminder_date: this.reminder_date,
      reminder_time: this.reminder_time,
      reminder_type: this.reminder_type,
      is_completed: this.is_completed,
      completed_at: this.completed_at,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      deleted_at: this.deleted_at,
      supabase_id: this.supabase_id,
      sync_status: this.sync_status,
      email_notification_enabled: this.email_notification_enabled,
      notification_time: this.notification_time,
      last_synced_at: this.last_synced_at,
      priority: this.priority,
      recurrence_pattern: this.recurrence_pattern,
      auto_generated: this.auto_generated,
      parent_reminder_id: this.parent_reminder_id,
      snooze_until: this.snooze_until,
      completion_note: this.completion_note,
      sync_version: this.sync_version
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) {
      errors.push('Titel ist erforderlich');
    }

    if (!this.reminder_date) {
      errors.push('Erinnerungsdatum ist erforderlich');
    } else {
      const reminderDate = new Date(this.reminder_date);
      if (isNaN(reminderDate.getTime())) {
        errors.push('Ungültiges Erinnerungsdatum');
      }
    }

    const validTypes: ReminderType[] = ['deadline', 'follow_up', 'interview', 'custom'];
    if (!validTypes.includes(this.reminder_type)) {
      errors.push('Ungültiger Erinnerungstyp');
    }

    const validPriorities: ReminderPriority[] = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(this.priority)) {
      errors.push('Ungültige Priorität');
    }

    if (this.notification_time < 0) {
      errors.push('Benachrichtigungszeit muss positiv sein');
    }

    // Validate recurrence pattern if present
    if (this.recurrence_pattern) {
      try {
        const pattern: RecurrencePattern = JSON.parse(this.recurrence_pattern);
        if (!pattern.type || !pattern.interval || pattern.interval < 1) {
          errors.push('Ungültiges Wiederholungsmuster');
        }
      } catch {
        errors.push('Ungültiges Wiederholungsmuster (JSON-Fehler)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isOverdue(): boolean {
    if (this.is_completed) return false;
    if (this.isSnoozed()) return false;
    return new Date(this.reminder_date) < new Date();
  }

  isDueToday(): boolean {
    if (this.is_completed) return false;
    if (this.isSnoozed()) return false;
    const today = new Date();
    const reminderDate = new Date(this.reminder_date);
    return (
      reminderDate.getDate() === today.getDate() &&
      reminderDate.getMonth() === today.getMonth() &&
      reminderDate.getFullYear() === today.getFullYear()
    );
  }

  getDaysUntilDue(): number {
    if (this.isSnoozed()) {
      const today = new Date();
      const snoozeDate = new Date(this.snooze_until!);
      const diffTime = snoozeDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const today = new Date();
    const reminderDate = new Date(this.reminder_date);
    const diffTime = reminderDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isSnoozed(): boolean {
    if (!this.snooze_until) return false;
    return new Date(this.snooze_until) > new Date();
  }

  isHighPriority(): boolean {
    return this.priority === 'high' || this.priority === 'urgent';
  }

  isRecurring(): boolean {
    return !!this.recurrence_pattern;
  }

  getRecurrencePattern(): RecurrencePattern | null {
    if (!this.recurrence_pattern) return null;
    try {
      return JSON.parse(this.recurrence_pattern);
    } catch {
      return null;
    }
  }

  setRecurrencePattern(pattern: RecurrencePattern): void {
    this.recurrence_pattern = JSON.stringify(pattern);
  }

  clearRecurrence(): void {
    this.recurrence_pattern = undefined;
  }

  snooze(hours: number): void {
    const snoozeDate = new Date();
    snoozeDate.setHours(snoozeDate.getHours() + hours);
    this.snooze_until = snoozeDate.toISOString();
  }

  unsnooze(): void {
    this.snooze_until = undefined;
  }

  complete(note?: string): void {
    this.is_completed = true;
    this.completed_at = new Date().toISOString(); // NEW: Set completion time
    this.completion_note = note;
    this.updated_at = new Date().toISOString();
  }

  reopen(): void {
    this.is_completed = false;
    this.completed_at = undefined; // Clear completion time
    this.completion_note = undefined;
    this.updated_at = new Date().toISOString();
  }

  getEffectiveDate(): Date {
    if (this.isSnoozed()) {
      return new Date(this.snooze_until!);
    }
    
    // Combine date and time if both are available
    if (this.reminder_time) {
      return new Date(`${this.reminder_date}T${this.reminder_time}`);
    }
    
    return new Date(this.reminder_date);
  }

  getNotificationDate(): Date {
    const effectiveDate = this.getEffectiveDate();
    const notificationDate = new Date(effectiveDate);
    notificationDate.setMinutes(notificationDate.getMinutes() - this.notification_time);
    return notificationDate;
  }

  shouldNotifyNow(): boolean {
    if (this.is_completed) return false;
    if (!this.is_active) return false;
    if (this.isSnoozed()) return false;
    
    const now = new Date();
    const notificationTime = this.getNotificationDate();
    
    return now >= notificationTime;
  }

  getPriorityColor(): string {
    const colors = {
      low: '#10B981',      // green
      medium: '#F59E0B',   // yellow
      high: '#F97316',     // orange
      urgent: '#EF4444'    // red
    };
    return colors[this.priority];
  }

  getPriorityIcon(): string {
    const icons = {
      low: '📌',
      medium: '⚡',
      high: '🔥',
      urgent: '🚨'
    };
    return icons[this.priority];
  }

  clone(): ReminderModel {
    return new ReminderModel(this.toJSON());
  }
}
