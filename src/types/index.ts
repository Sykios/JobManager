// Application Types
export type ApplicationStatus = 
  | 'draft' 
  | 'applied' 
  | 'in-review' 
  | 'interview' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';

export type WorkType = 
  | 'full-time' 
  | 'part-time' 
  | 'contract' 
  | 'internship' 
  | 'freelance';

export type Priority = 1 | 2 | 3 | 4 | 5;

export interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  supabase_id?: string;
  sync_status?: SyncStatus;
  last_synced_at?: string;
}

export interface Contact {
  id: number;
  company_id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  supabase_id?: string;
  sync_status?: SyncStatus;
  last_synced_at?: string;
}

export interface Application {
  id: number;
  company_id?: number;
  contact_id?: number;
  title: string;
  position: string;
  job_url?: string;
  application_channel?: string;
  salary_range?: string;
  work_type?: WorkType;
  location?: string;
  remote_possible: boolean;
  status: ApplicationStatus;
  priority: Priority;
  application_date?: string;
  deadline?: string;
  follow_up_date?: string;
  notes?: string;
  cover_letter?: string;
  requirements?: string;
  benefits?: string;
  created_at: string;
  updated_at: string;
  supabase_id?: string;
  sync_status?: SyncStatus;
  last_synced_at?: string;
  // Optional file metadata
  fileCount?: number;
  totalFileSize?: number;
}

// Status History Types
export interface StatusHistory {
  id: number;
  application_id: number;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note?: string;
  created_at: string;
  created_by?: string;
}

// Reminder Types
export type ReminderType = 'deadline' | 'follow_up' | 'interview' | 'custom';
export type ReminderPriority = 1 | 2 | 3 | 4; // 1=low, 2=medium, 3=high, 4=urgent
export type SyncStatus = 'pending' | 'synced' | 'error' | 'local_only';
export type NotificationType = 'system' | 'email' | 'push';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

export interface Reminder {
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
  // Enhanced fields for sync and notifications
  supabase_id?: string;
  sync_status: SyncStatus;
  email_notification_enabled: boolean;
  notification_time: number; // minutes before reminder
  last_synced_at?: string;
  priority: ReminderPriority;
  recurrence_pattern?: string; // JSON string for recurring reminders
  auto_generated: boolean;
  parent_reminder_id?: number;
  snooze_until?: string;
  completion_note?: string;
  sync_version: number; // NEW: For conflict resolution
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'application' | 'reminder' | 'deadline' | 'interview' | 'follow_up' | 'custom';
  description?: string;
  application_id?: number;
  reminder_id?: number;
  status?: ApplicationStatus;
  company_name?: string;
  position?: string;
}

// Sync and Notification Types
export interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: number;
  operation: 'create' | 'update' | 'delete';
  data?: string; // JSON string
  retry_count: number;
  last_retry_at?: string;
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

export interface UserSetting {
  id: number;
  key: string;
  value: string; // JSON string
  category: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: number;
  reminder_id: number;
  notification_type: NotificationType;
  sent_at: string;
  status: NotificationStatus;
  error_message?: string;
  recipient?: string;
  created_at: string;
}

export interface ReminderTemplate {
  id: number;
  name: string;
  title_template: string;
  description_template?: string;
  reminder_type: ReminderType;
  default_notification_time: number;
  default_priority: ReminderPriority;
  trigger_conditions?: string; // JSON string
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

// Configuration Types
export interface NotificationSettings {
  email_notifications: boolean;
  system_notifications: boolean;
  reminder_defaults: {
    advance_notice: number;
    work_hours_only: boolean;
    weekend_notifications: boolean;
  };
  email_preferences: {
    daily_digest: boolean;
    urgent_only: boolean;
    summary_time: string;
  };
}

export interface SyncSettings {
  auto_sync: boolean;
  sync_interval: number; // seconds
  conflict_resolution: 'local' | 'remote' | 'ask';
}

export interface CalendarSettings {
  default_view: 'month' | 'week' | 'agenda';
  show_completed: boolean;
  color_scheme: 'type' | 'priority' | 'status';
}

export interface ReminderSettings {
  auto_generate: boolean;
  smart_scheduling: boolean;
  default_priority: ReminderPriority;
}

// Recurrence Pattern Types
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N days/weeks/months/years
  days_of_week?: number[]; // 0-6, Sunday is 0
  day_of_month?: number; // 1-31
  end_date?: string;
  max_occurrences?: number;
}

// UI Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  count?: number;
}
