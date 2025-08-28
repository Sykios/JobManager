import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 001_initial');

  // Companies table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      website TEXT,
      industry TEXT,
      location TEXT,
      size TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Contacts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      position TEXT,
      linkedin_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )
  `);

  // Applications table - main table for job applications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      contact_id INTEGER,
      title TEXT NOT NULL,
      position TEXT NOT NULL,
      job_url TEXT,
      application_channel TEXT,
      salary_range TEXT,
      work_type TEXT CHECK(work_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
      location TEXT,
      remote_possible BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'applied', 'in-review', 'interview', 'offer', 'rejected', 'withdrawn')),
      priority INTEGER DEFAULT 1 CHECK(priority IN (1, 2, 3, 4, 5)),
      application_date DATE,
      deadline DATE,
      follow_up_date DATE,
      notes TEXT,
      cover_letter TEXT,
      requirements TEXT,
      benefits TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    )
  `);

  // Files table - stores file attachments with blob data
  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'other')),
      description TEXT,
      data BLOB,
      upload_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Reminders table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      reminder_date DATETIME NOT NULL,
      reminder_type TEXT CHECK(reminder_type IN ('deadline', 'follow_up', 'interview', 'custom')),
      is_completed BOOLEAN DEFAULT FALSE,
      notification_sent BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Enhanced fields for sync and notifications
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      email_notification_enabled BOOLEAN DEFAULT TRUE,
      notification_time INTEGER DEFAULT 60, -- minutes before reminder
      last_synced_at DATETIME,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      recurrence_pattern TEXT, -- JSON string for recurring reminders
      auto_generated BOOLEAN DEFAULT FALSE, -- true for system-generated reminders
      parent_reminder_id INTEGER, -- for recurring reminders
      snooze_until DATETIME, -- when snoozed reminder should reappear
      completion_note TEXT, -- note when completing reminder
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
    )
  `);

  // Status history table to track application status changes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Sync queue table for tracking changes that need to be synced
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
      data TEXT, -- JSON data for create/update operations
      retry_count INTEGER DEFAULT 0,
      last_retry_at DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `);

  // User settings table for notification and sync preferences
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL, -- JSON string
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notification history table to track sent notifications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notification_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id INTEGER NOT NULL,
      notification_type TEXT NOT NULL CHECK(notification_type IN ('system', 'email', 'push')),
      sent_at DATETIME NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'failed', 'pending')),
      error_message TEXT,
      recipient TEXT, -- email address or device identifier
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
    )
  `);

  // Reminder templates table for quick reminder creation
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminder_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title_template TEXT NOT NULL,
      description_template TEXT,
      reminder_type TEXT NOT NULL,
      default_notification_time INTEGER DEFAULT 60,
      default_priority TEXT DEFAULT 'medium',
      trigger_conditions TEXT, -- JSON string for auto-generation conditions
      is_system_template BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(application_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_application ON files(application_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date)');
  
  // Enhanced reminder indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_supabase_id ON reminders(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_sync_status ON reminders(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_parent ON reminders(parent_reminder_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_snooze ON reminders(snooze_until)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name, record_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_reminder ON notification_history(reminder_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type)');

  // Create triggers for updated_at timestamps
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_companies_updated_at 
    AFTER UPDATE ON companies
    BEGIN 
      UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_contacts_updated_at 
    AFTER UPDATE ON contacts
    BEGIN 
      UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_applications_updated_at 
    AFTER UPDATE ON applications
    BEGIN 
      UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_reminders_updated_at 
    AFTER UPDATE ON reminders
    BEGIN 
      UPDATE reminders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_files_updated_at 
    AFTER UPDATE ON files
    BEGIN 
      UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Trigger to log status changes
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS log_status_changes 
    AFTER UPDATE OF status ON applications
    WHEN OLD.status != NEW.status
    BEGIN 
      INSERT INTO status_history (application_id, from_status, to_status)
      VALUES (NEW.id, OLD.status, NEW.status);
    END
  `);

  // Enhanced triggers for new tables
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_user_settings_updated_at 
    AFTER UPDATE ON user_settings
    BEGIN 
      UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_reminder_templates_updated_at 
    AFTER UPDATE ON reminder_templates
    BEGIN 
      UPDATE reminder_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  // Foreign key constraint trigger for parent_reminder_id
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS check_parent_reminder_fk
    BEFORE INSERT ON reminders
    WHEN NEW.parent_reminder_id IS NOT NULL
    BEGIN
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM reminders WHERE id = NEW.parent_reminder_id) = 0
        THEN RAISE(ABORT, 'Invalid parent_reminder_id')
      END;
    END
  `);

  // Sync queue triggers for reminders
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_sync_on_insert
    AFTER INSERT ON reminders
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminders', NEW.id, 'create', json_object(
        'id', NEW.id,
        'application_id', NEW.application_id,
        'title', NEW.title,
        'description', NEW.description,
        'reminder_date', NEW.reminder_date,
        'reminder_type', NEW.reminder_type,
        'priority', NEW.priority,
        'email_notification_enabled', NEW.email_notification_enabled,
        'notification_time', NEW.notification_time,
        'recurrence_pattern', NEW.recurrence_pattern,
        'auto_generated', NEW.auto_generated,
        'parent_reminder_id', NEW.parent_reminder_id
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_sync_on_update
    AFTER UPDATE ON reminders
    WHEN NEW.sync_status != 'local_only' AND (
      OLD.title != NEW.title OR
      OLD.description != NEW.description OR
      OLD.reminder_date != NEW.reminder_date OR
      OLD.reminder_type != NEW.reminder_type OR
      OLD.priority != NEW.priority OR
      OLD.is_completed != NEW.is_completed OR
      OLD.email_notification_enabled != NEW.email_notification_enabled OR
      OLD.notification_time != NEW.notification_time
    )
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminders', NEW.id, 'update', json_object(
        'id', NEW.id,
        'application_id', NEW.application_id,
        'title', NEW.title,
        'description', NEW.description,
        'reminder_date', NEW.reminder_date,
        'reminder_type', NEW.reminder_type,
        'priority', NEW.priority,
        'is_completed', NEW.is_completed,
        'email_notification_enabled', NEW.email_notification_enabled,
        'notification_time', NEW.notification_time,
        'recurrence_pattern', NEW.recurrence_pattern,
        'auto_generated', NEW.auto_generated,
        'parent_reminder_id', NEW.parent_reminder_id
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_sync_on_delete
    AFTER DELETE ON reminders
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminders', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
    END
  `);

  // Insert default system reminder templates
  await db.exec(`
    INSERT OR IGNORE INTO reminder_templates (name, title_template, description_template, reminder_type, default_notification_time, default_priority, trigger_conditions, is_system_template)
    VALUES 
    ('Application Follow-up', 'Follow-up: {position}', 'Follow up on your application for {position} at {company}', 'follow_up', 10080, 'medium', '{"days_after_application": 7}', TRUE),
    ('Interview Preparation', 'Interview: {position}', 'Prepare for your interview for {position} at {company}', 'interview', 2880, 'high', '{"status": "interview"}', TRUE),
    ('Application Deadline', 'Deadline: {position}', 'Application deadline for {position} at {company}', 'deadline', 1440, 'high', '{"deadline_field": true}', TRUE),
    ('Post-Interview Follow-up', 'Post-Interview Follow-up: {position}', 'Send thank you note and follow up after interview for {position}', 'follow_up', 4320, 'medium', '{"days_after_interview": 3}', TRUE),
    ('Weekly Application Review', 'Weekly Job Search Review', 'Review and plan your job search activities for the week', 'custom', 60, 'medium', '{"recurrence": "weekly"}', TRUE)
  `);

  // Insert default user settings
  await db.exec(`
    INSERT OR IGNORE INTO user_settings (key, value, category)
    VALUES 
    ('notification_preferences', '{"email_notifications": true, "system_notifications": true, "reminder_defaults": {"advance_notice": 60, "work_hours_only": false, "weekend_notifications": true}, "email_preferences": {"daily_digest": false, "urgent_only": false, "summary_time": "09:00"}}', 'notifications'),
    ('sync_settings', '{"auto_sync": true, "sync_interval": 300, "conflict_resolution": "ask"}', 'sync'),
    ('calendar_settings', '{"default_view": "month", "show_completed": false, "color_scheme": "priority"}', 'calendar'),
    ('reminder_settings', '{"auto_generate": true, "smart_scheduling": true, "default_priority": "medium"}', 'reminders')
  `);

  console.log('Migration 001_initial completed successfully');
}

export async function down(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 001_initial');

  // Drop triggers first
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_sync_on_insert');
  await db.exec('DROP TRIGGER IF EXISTS check_parent_reminder_fk');
  await db.exec('DROP TRIGGER IF EXISTS update_reminder_templates_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_user_settings_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS log_status_changes');
  await db.exec('DROP TRIGGER IF EXISTS update_files_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_reminders_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_applications_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_contacts_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_companies_updated_at');

  // Drop indexes
  await db.exec('DROP INDEX IF EXISTS idx_notification_history_type');
  await db.exec('DROP INDEX IF EXISTS idx_notification_history_reminder');
  await db.exec('DROP INDEX IF EXISTS idx_sync_queue_table');
  await db.exec('DROP INDEX IF EXISTS idx_sync_queue_status');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_snooze');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_parent');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_priority');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_sync_status');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_supabase_id');
  await db.exec('DROP INDEX IF EXISTS idx_files_upload_date');
  await db.exec('DROP INDEX IF EXISTS idx_files_application');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_company');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_company');
  await db.exec('DROP INDEX IF EXISTS idx_applications_status');

  // Drop tables in reverse order (respecting foreign keys)
  await db.exec('DROP TABLE IF EXISTS reminder_templates');
  await db.exec('DROP TABLE IF EXISTS notification_history');
  await db.exec('DROP TABLE IF EXISTS user_settings');
  await db.exec('DROP TABLE IF EXISTS sync_queue');
  await db.exec('DROP TABLE IF EXISTS status_history');
  await db.exec('DROP TABLE IF EXISTS reminders');
  await db.exec('DROP TABLE IF EXISTS files');
  await db.exec('DROP TABLE IF EXISTS file_attachments');
  await db.exec('DROP TABLE IF EXISTS applications');
  await db.exec('DROP TABLE IF EXISTS contacts');
  await db.exec('DROP TABLE IF EXISTS companies');

  console.log('Migration 001_initial rolled back successfully');
}
