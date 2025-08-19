import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 002_update_file_attachments');

  // Create a new file_attachments table with the updated schema
  await db.exec(`
    CREATE TABLE file_attachments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      file_data BLOB,
      file_path TEXT,
      category TEXT CHECK(category IN ('cv', 'cover_letter', 'additional', 'resume', 'portfolio', 'certificate', 'other')),
      description TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // Copy existing data if any exists
  await db.exec(`
    INSERT INTO file_attachments_new (
      id, application_id, filename, file_size, file_type, file_path, 
      category, description, created_at
    )
    SELECT 
      id, application_id, file_name, file_size, file_type, file_path,
      category, description, created_at
    FROM file_attachments
  `);

  // Drop the old table
  await db.exec('DROP TABLE file_attachments');

  // Rename the new table
  await db.exec('ALTER TABLE file_attachments_new RENAME TO file_attachments');

  // Create index for better performance
  await db.exec('CREATE INDEX IF NOT EXISTS idx_file_attachments_application ON file_attachments(application_id)');

  console.log('Migration 002_update_file_attachments completed successfully');
}

export async function down(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 002_update_file_attachments');

  // Create the old table structure
  await db.exec(`
    CREATE TABLE file_attachments_old (
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

  // Copy back compatible data
  await db.exec(`
    INSERT INTO file_attachments_old (
      id, application_id, file_name, file_path, file_type, file_size,
      category, description, created_at
    )
    SELECT 
      id, application_id, filename, 
      COALESCE(file_path, 'unknown'), file_type, file_size,
      CASE 
        WHEN category = 'cv' THEN 'resume'
        WHEN category = 'additional' THEN 'other'
        ELSE category
      END,
      description, created_at
    FROM file_attachments
    WHERE file_path IS NOT NULL
  `);

  // Drop current table and rename old one back
  await db.exec('DROP TABLE file_attachments');
  await db.exec('ALTER TABLE file_attachments_old RENAME TO file_attachments');

  console.log('Migration 002_update_file_attachments rolled back successfully');
}
