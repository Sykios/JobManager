import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

/**
 * Migration: Add user_id column to all syncable tables
 * This is required for proper Supabase synchronization with Row Level Security
 */
export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 003_add_user_id');

  // Add user_id column to companies table
  await db.exec(`
    ALTER TABLE companies 
    ADD COLUMN user_id TEXT;
  `);

  // Add user_id column to contacts table
  await db.exec(`
    ALTER TABLE contacts 
    ADD COLUMN user_id TEXT;
  `);

  // Add user_id column to applications table
  await db.exec(`
    ALTER TABLE applications 
    ADD COLUMN user_id TEXT;
  `);

  // Add user_id column to reminders table
  await db.exec(`
    ALTER TABLE reminders 
    ADD COLUMN user_id TEXT;
  `);

  // Add user_id column to files table
  await db.exec(`
    ALTER TABLE files 
    ADD COLUMN user_id TEXT;
  `);

  // Add user_id column to status_history table
  await db.exec(`
    ALTER TABLE status_history 
    ADD COLUMN user_id TEXT;
  `);

  // Create indexes for user_id columns for better query performance
  await db.exec('CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_status_history_user_id ON status_history(user_id)');

  console.log('✅ Migration 003_add_user_id completed successfully');
}

export async function down(_db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 003_add_user_id');

  // Note: SQLite does not support DROP COLUMN directly
  // In a rollback scenario, we would need to recreate tables without user_id
  // For now, we'll just log a warning
  console.warn('⚠️  SQLite does not support DROP COLUMN. Manual rollback required if needed.');
  console.warn('To rollback: Drop and recreate tables using 001_initial migration');
}
