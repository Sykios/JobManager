import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 001_initial');

  // Companies table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website TEXT,
      industry TEXT,
      location TEXT,
      size TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1
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
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1,
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
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1,
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
      storage_path TEXT, -- Path for Supabase Storage sync
      upload_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Reminders table - Enhanced structure matching Supabase
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      reminder_date DATE NOT NULL,
      reminder_time TIME,
      reminder_type TEXT CHECK(reminder_type IN ('deadline', 'follow_up', 'interview', 'custom')),
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at DATETIME,
      is_active BOOLEAN DEFAULT TRUE, -- For filtering active reminders
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      -- Enhanced fields for sync and notifications
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      email_notification_enabled BOOLEAN DEFAULT TRUE,
      notification_time INTEGER DEFAULT 60, -- minutes before reminder
      priority INTEGER DEFAULT 2 CHECK(priority IN (1, 2, 3, 4, 5)), -- 1=low, 2=medium, 3=high, 4=urgent, 5=critical
      recurrence_pattern TEXT, -- JSON string for recurring reminders
      auto_generated BOOLEAN DEFAULT FALSE, -- true for system-generated reminders
      parent_reminder_id INTEGER, -- for recurring reminders
      snooze_until DATETIME, -- when snoozed reminder should reappear
      completion_note TEXT, -- note when completing reminder
      sync_version INTEGER DEFAULT 1,
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
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1,
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      supabase_id TEXT UNIQUE,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error', 'local_only')),
      last_synced_at DATETIME,
      sync_version INTEGER DEFAULT 1
    )
  `);

  // Create indexes for better performance
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(application_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_supabase_id ON applications(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_sync_status ON applications(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_supabase_id ON contacts(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_sync_status ON contacts(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_application ON files(application_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_supabase_id ON companies(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_sync_status ON companies(sync_status)');
  
  // Enhanced reminder indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_supabase_id ON reminders(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_sync_status ON reminders(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_parent ON reminders(parent_reminder_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_snooze ON reminders(snooze_until)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(reminder_date, reminder_time)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name, record_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_reminder ON notification_history(reminder_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_supabase_id ON notification_history(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_sync_status ON notification_history(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_type ON reminder_templates(reminder_type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_system ON reminder_templates(is_system_template)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_supabase_id ON reminder_templates(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_sync_status ON reminder_templates(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_settings_supabase_id ON user_settings(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_settings_sync_status ON user_settings(sync_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_supabase_id ON status_history(supabase_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_sync_status ON status_history(sync_status)');
  
  // Soft delete indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_deleted_at ON applications(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_deleted_at ON reminders(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_deleted_at ON notification_history(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_deleted_at ON reminder_templates(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_settings_deleted_at ON user_settings(deleted_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_deleted_at ON status_history(deleted_at)');
  
  // Sync version indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_sync_version ON companies(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_sync_version ON contacts(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_sync_version ON applications(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_sync_version ON reminders(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_sync_version ON files(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_sync_version ON status_history(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_settings_sync_version ON user_settings(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_sync_version ON notification_history(sync_version)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_sync_version ON reminder_templates(sync_version)');
  
  // Last synced indexes
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_last_synced ON companies(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_last_synced ON contacts(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_last_synced ON applications(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_last_synced ON reminders(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_last_synced ON files(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_last_synced ON status_history(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_user_settings_last_synced ON user_settings(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_notification_history_last_synced ON notification_history(last_synced_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminder_templates_last_synced ON reminder_templates(last_synced_at)');

  // Composite indexes for common query patterns
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_status_date ON applications(status, application_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_company_status ON applications(company_id, status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_date_completed ON reminders(reminder_date, is_completed)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_active_date ON reminders(is_active, reminder_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_company_email ON contacts(company_id, email)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_table_operation ON sync_queue(table_name, operation)');

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
        'reminder_time', NEW.reminder_time,
        'reminder_type', NEW.reminder_type,
        'priority', NEW.priority,
        'is_completed', NEW.is_completed,
        'completed_at', NEW.completed_at,
        'is_active', NEW.is_active,
        'email_notification_enabled', NEW.email_notification_enabled,
        'notification_time', NEW.notification_time,
        'recurrence_pattern', NEW.recurrence_pattern,
        'auto_generated', NEW.auto_generated,
        'parent_reminder_id', NEW.parent_reminder_id,
        'snooze_until', NEW.snooze_until,
        'completion_note', NEW.completion_note
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
      OLD.reminder_time != NEW.reminder_time OR
      OLD.reminder_type != NEW.reminder_type OR
      OLD.priority != NEW.priority OR
      OLD.is_completed != NEW.is_completed OR
      OLD.is_active != NEW.is_active OR
      OLD.email_notification_enabled != NEW.email_notification_enabled OR
      OLD.notification_time != NEW.notification_time OR
      OLD.snooze_until != NEW.snooze_until OR
      OLD.completion_note != NEW.completion_note
    )
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminders', NEW.id, 'update', json_object(
        'id', NEW.id,
        'application_id', NEW.application_id,
        'title', NEW.title,
        'description', NEW.description,
        'reminder_date', NEW.reminder_date,
        'reminder_time', NEW.reminder_time,
        'reminder_type', NEW.reminder_type,
        'priority', NEW.priority,
        'is_completed', NEW.is_completed,
        'completed_at', NEW.completed_at,
        'is_active', NEW.is_active,
        'email_notification_enabled', NEW.email_notification_enabled,
        'notification_time', NEW.notification_time,
        'recurrence_pattern', NEW.recurrence_pattern,
        'auto_generated', NEW.auto_generated,
        'parent_reminder_id', NEW.parent_reminder_id,
        'snooze_until', NEW.snooze_until,
        'completion_note', NEW.completion_note
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

  // Sync queue triggers for applications
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_application_sync_on_insert
    AFTER INSERT ON applications
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('applications', NEW.id, 'create', json_object(
        'id', NEW.id,
        'company_id', NEW.company_id,
        'contact_id', NEW.contact_id,
        'title', NEW.title,
        'position', NEW.position,
        'job_url', NEW.job_url,
        'application_channel', NEW.application_channel,
        'salary_range', NEW.salary_range,
        'work_type', NEW.work_type,
        'location', NEW.location,
        'remote_possible', NEW.remote_possible,
        'status', NEW.status,
        'priority', NEW.priority,
        'application_date', NEW.application_date,
        'deadline', NEW.deadline,
        'follow_up_date', NEW.follow_up_date,
        'notes', NEW.notes,
        'cover_letter', NEW.cover_letter,
        'requirements', NEW.requirements,
        'benefits', NEW.benefits
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_application_sync_on_update
    AFTER UPDATE ON applications
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('applications', NEW.id, 'update', json_object(
        'id', NEW.id,
        'company_id', NEW.company_id,
        'contact_id', NEW.contact_id,
        'title', NEW.title,
        'position', NEW.position,
        'job_url', NEW.job_url,
        'application_channel', NEW.application_channel,
        'salary_range', NEW.salary_range,
        'work_type', NEW.work_type,
        'location', NEW.location,
        'remote_possible', NEW.remote_possible,
        'status', NEW.status,
        'priority', NEW.priority,
        'application_date', NEW.application_date,
        'deadline', NEW.deadline,
        'follow_up_date', NEW.follow_up_date,
        'notes', NEW.notes,
        'cover_letter', NEW.cover_letter,
        'requirements', NEW.requirements,
        'benefits', NEW.benefits
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_application_sync_on_delete
    AFTER DELETE ON applications
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('applications', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
    END
  `);

  // Sync queue triggers for companies
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_company_sync_on_insert
    AFTER INSERT ON companies
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('companies', NEW.id, 'create', json_object(
        'id', NEW.id,
        'name', NEW.name,
        'website', NEW.website,
        'industry', NEW.industry,
        'location', NEW.location,
        'size', NEW.size,
        'description', NEW.description
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_company_sync_on_update
    AFTER UPDATE ON companies
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('companies', NEW.id, 'update', json_object(
        'id', NEW.id,
        'name', NEW.name,
        'website', NEW.website,
        'industry', NEW.industry,
        'location', NEW.location,
        'size', NEW.size,
        'description', NEW.description
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_company_sync_on_delete
    AFTER DELETE ON companies
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('companies', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
    END
  `);

  // Sync queue triggers for contacts
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_contact_sync_on_insert
    AFTER INSERT ON contacts
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('contacts', NEW.id, 'create', json_object(
        'id', NEW.id,
        'company_id', NEW.company_id,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'position', NEW.position,
        'linkedin_url', NEW.linkedin_url,
        'notes', NEW.notes
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_contact_sync_on_update
    AFTER UPDATE ON contacts
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('contacts', NEW.id, 'update', json_object(
        'id', NEW.id,
        'company_id', NEW.company_id,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'position', NEW.position,
        'linkedin_url', NEW.linkedin_url,
        'notes', NEW.notes
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_contact_sync_on_delete
    AFTER DELETE ON contacts
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('contacts', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
    END
  `);

  // Sync queue triggers for notification_history
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_notification_history_sync_on_insert
    AFTER INSERT ON notification_history
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('notification_history', NEW.id, 'create', json_object(
        'id', NEW.id,
        'reminder_id', NEW.reminder_id,
        'notification_type', NEW.notification_type,
        'sent_at', NEW.sent_at,
        'status', NEW.status,
        'error_message', NEW.error_message,
        'recipient', NEW.recipient
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_notification_history_sync_on_update
    AFTER UPDATE ON notification_history
    WHEN NEW.sync_status != 'local_only'
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('notification_history', NEW.id, 'update', json_object(
        'id', NEW.id,
        'reminder_id', NEW.reminder_id,
        'notification_type', NEW.notification_type,
        'sent_at', NEW.sent_at,
        'status', NEW.status,
        'error_message', NEW.error_message,
        'recipient', NEW.recipient
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_notification_history_sync_on_delete
    AFTER DELETE ON notification_history
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('notification_history', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
    END
  `);

  // Sync queue triggers for reminder_templates
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_templates_sync_on_insert
    AFTER INSERT ON reminder_templates
    WHEN NEW.sync_status != 'local_only' AND NEW.is_system_template = FALSE
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminder_templates', NEW.id, 'create', json_object(
        'id', NEW.id,
        'name', NEW.name,
        'title_template', NEW.title_template,
        'description_template', NEW.description_template,
        'reminder_type', NEW.reminder_type,
        'default_notification_time', NEW.default_notification_time,
        'default_priority', NEW.default_priority,
        'trigger_conditions', NEW.trigger_conditions,
        'is_system_template', NEW.is_system_template
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_templates_sync_on_update
    AFTER UPDATE ON reminder_templates
    WHEN NEW.sync_status != 'local_only' AND NEW.is_system_template = FALSE
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminder_templates', NEW.id, 'update', json_object(
        'id', NEW.id,
        'name', NEW.name,
        'title_template', NEW.title_template,
        'description_template', NEW.description_template,
        'reminder_type', NEW.reminder_type,
        'default_notification_time', NEW.default_notification_time,
        'default_priority', NEW.default_priority,
        'trigger_conditions', NEW.trigger_conditions,
        'is_system_template', NEW.is_system_template
      ));
    END
  `);

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS queue_reminder_templates_sync_on_delete
    AFTER DELETE ON reminder_templates
    WHEN OLD.sync_status != 'local_only' AND OLD.supabase_id IS NOT NULL AND OLD.is_system_template = FALSE
    BEGIN
      INSERT INTO sync_queue (table_name, record_id, operation, data)
      VALUES ('reminder_templates', OLD.id, 'delete', json_object('supabase_id', OLD.supabase_id));
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
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_templates_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_templates_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_reminder_templates_sync_on_insert');
  await db.exec('DROP TRIGGER IF EXISTS queue_notification_history_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_notification_history_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_notification_history_sync_on_insert');
  await db.exec('DROP TRIGGER IF EXISTS queue_contact_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_contact_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_contact_sync_on_insert');
  await db.exec('DROP TRIGGER IF EXISTS queue_company_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_company_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_company_sync_on_insert');
  await db.exec('DROP TRIGGER IF EXISTS queue_application_sync_on_delete');
  await db.exec('DROP TRIGGER IF EXISTS queue_application_sync_on_update');
  await db.exec('DROP TRIGGER IF EXISTS queue_application_sync_on_insert');
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
  await db.exec('DROP INDEX IF EXISTS idx_sync_queue_table_operation');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_company_email');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_active_date');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_date_completed');
  await db.exec('DROP INDEX IF EXISTS idx_applications_company_status');
  await db.exec('DROP INDEX IF EXISTS idx_applications_status_date');
  await db.exec('DROP INDEX IF EXISTS idx_reminder_templates_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_notification_history_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_user_settings_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_status_history_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_files_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_applications_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_companies_sync_version');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_deleted_at');
  await db.exec('DROP INDEX IF EXISTS idx_files_deleted_at');
  await db.exec('DROP INDEX IF EXISTS idx_applications_deleted_at');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_deleted_at');
  await db.exec('DROP INDEX IF EXISTS idx_companies_deleted_at');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_date_time');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_completed');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_active');
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
  await db.exec('DROP INDEX IF EXISTS idx_contacts_supabase_id');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_sync_status');
  await db.exec('DROP INDEX IF EXISTS idx_contacts_last_synced');
  await db.exec('DROP INDEX IF EXISTS idx_companies_supabase_id');
  await db.exec('DROP INDEX IF EXISTS idx_companies_sync_status');
  await db.exec('DROP INDEX IF EXISTS idx_companies_last_synced');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_company');
  await db.exec('DROP INDEX IF EXISTS idx_applications_status');
  await db.exec('DROP INDEX IF EXISTS idx_applications_supabase_id');
  await db.exec('DROP INDEX IF EXISTS idx_applications_sync_status');
  await db.exec('DROP INDEX IF EXISTS idx_applications_last_synced');

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
