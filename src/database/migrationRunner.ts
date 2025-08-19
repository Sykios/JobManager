import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as migration001 from './migrations/001_initial';
import * as migration002 from './migrations/002_update_file_attachments';

interface Migration {
  version: string;
  up: (db: Database<sqlite3.Database, sqlite3.Statement>) => Promise<void>;
  down: (db: Database<sqlite3.Database, sqlite3.Statement>) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: '001_initial',
    up: migration001.up,
    down: migration001.down,
  },
  {
    version: '002_update_file_attachments',
    up: migration002.up,
    down: migration002.down,
  },
];

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get applied migrations
 */
async function getAppliedMigrations(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<string[]> {
  const result = await db.all('SELECT version FROM migrations ORDER BY applied_at ASC');
  return result.map((row: any) => row.version);
}

/**
 * Record migration as applied
 */
async function recordMigration(db: Database<sqlite3.Database, sqlite3.Statement>, version: string): Promise<void> {
  await db.run('INSERT INTO migrations (version) VALUES (?)', version);
}

/**
 * Remove migration record
 */
async function removeMigrationRecord(db: Database<sqlite3.Database, sqlite3.Statement>, version: string): Promise<void> {
  await db.run('DELETE FROM migrations WHERE version = ?', version);
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Starting database migrations...');

  await createMigrationsTable(db);
  const appliedMigrations = await getAppliedMigrations(db);

  for (const migration of migrations) {
    if (!appliedMigrations.includes(migration.version)) {
      console.log(`Applying migration: ${migration.version}`);
      
      try {
        await migration.up(db);
        await recordMigration(db, migration.version);
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Failed to apply migration ${migration.version}:`, error);
        throw error;
      }
    } else {
      console.log(`Migration ${migration.version} already applied, skipping`);
    }
  }

  console.log('All migrations completed');
}

/**
 * Rollback the last migration
 */
export async function rollbackLastMigration(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back last migration...');

  await createMigrationsTable(db);
  const appliedMigrations = await getAppliedMigrations(db);

  if (appliedMigrations.length === 0) {
    console.log('No migrations to rollback');
    return;
  }

  const lastMigration = appliedMigrations[appliedMigrations.length - 1];
  const migration = migrations.find(m => m.version === lastMigration);

  if (!migration) {
    throw new Error(`Migration ${lastMigration} not found`);
  }

  try {
    console.log(`Rolling back migration: ${migration.version}`);
    await migration.down(db);
    await removeMigrationRecord(db, migration.version);
    console.log(`Migration ${migration.version} rolled back successfully`);
  } catch (error) {
    console.error(`Failed to rollback migration ${migration.version}:`, error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<{
  totalMigrations: number;
  appliedMigrations: number;
  pendingMigrations: string[];
}> {
  await createMigrationsTable(db);
  const appliedMigrations = await getAppliedMigrations(db);
  
  const pendingMigrations = migrations
    .filter(m => !appliedMigrations.includes(m.version))
    .map(m => m.version);

  return {
    totalMigrations: migrations.length,
    appliedMigrations: appliedMigrations.length,
    pendingMigrations,
  };
}
