import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 002_migrate_file_blobs');

  // Ensure upload directory exists
  const uploadsDir = path.join(app.getPath('userData'), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Get all files with BLOB data
  const filesWithData = await db.all('SELECT id, data, filename FROM files WHERE data IS NOT NULL');

  console.log(`Found ${filesWithData.length} files with BLOB data to migrate`);

  for (const file of filesWithData) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.filename);
      const basename = path.basename(file.filename, ext);
      const sanitized = basename.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const uniqueFilename = `${timestamp}_${sanitized}${ext}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Write BLOB data to disk
      const buffer = Buffer.from(file.data);
      await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });

      // Update database record
      await db.run(
        'UPDATE files SET file_path = ?, data = NULL WHERE id = ?',
        [filePath, file.id]
      );

      console.log(`Migrated file ${file.filename} to ${filePath}`);
    } catch (error) {
      console.error(`Failed to migrate file ${file.filename}:`, error);
      // Continue with other files
    }
  }

  console.log('Migration 002_migrate_file_blobs completed successfully');
}

export async function down(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 002_migrate_file_blobs');

  // Get all files with file_path but no data (migrated files)
  const migratedFiles = await db.all('SELECT id, file_path FROM files WHERE file_path IS NOT NULL AND data IS NULL');

  for (const file of migratedFiles) {
    try {
      // Read file from disk
      const buffer = await fs.promises.readFile(file.file_path);
      const data = Array.from(buffer);

      // Update database record to restore BLOB
      await db.run(
        'UPDATE files SET data = ?, file_path = NULL WHERE id = ?',
        [data, file.id]
      );

      // Delete file from disk
      await fs.promises.unlink(file.file_path);

      console.log(`Rolled back file ${file.file_path}`);
    } catch (error) {
      console.error(`Failed to rollback file ${file.file_path}:`, error);
      // Continue with other files
    }
  }

  console.log('Migration 002_migrate_file_blobs rolled back successfully');
}