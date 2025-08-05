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

  // File attachments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS file_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      category TEXT CHECK(category IN ('resume', 'cover_letter', 'portfolio', 'certificate', 'other')),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Status history table to track application status changes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(application_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)');

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

  // Trigger to log status changes
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS log_status_changes 
    AFTER UPDATE OF status ON applications
    WHEN OLD.status != NEW.status
    BEGIN 
      INSERT INTO status_history (application_id, old_status, new_status)
      VALUES (NEW.id, OLD.status, NEW.status);
    END
  `);

  console.log('Migration 001_initial completed successfully');
}

export async function down(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 001_initial');

  // Drop triggers first
  await db.exec('DROP TRIGGER IF EXISTS log_status_changes');
  await db.exec('DROP TRIGGER IF EXISTS update_reminders_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_applications_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_contacts_updated_at');
  await db.exec('DROP TRIGGER IF EXISTS update_companies_updated_at');

  // Drop indexes
  await db.exec('DROP INDEX IF EXISTS idx_contacts_company');
  await db.exec('DROP INDEX IF EXISTS idx_reminders_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_date');
  await db.exec('DROP INDEX IF EXISTS idx_applications_company');
  await db.exec('DROP INDEX IF EXISTS idx_applications_status');

  // Drop tables in reverse order (respecting foreign keys)
  await db.exec('DROP TABLE IF EXISTS status_history');
  await db.exec('DROP TABLE IF EXISTS reminders');
  await db.exec('DROP TABLE IF EXISTS file_attachments');
  await db.exec('DROP TABLE IF EXISTS applications');
  await db.exec('DROP TABLE IF EXISTS contacts');
  await db.exec('DROP TABLE IF EXISTS companies');

  console.log('Migration 001_initial rolled back successfully');
}
