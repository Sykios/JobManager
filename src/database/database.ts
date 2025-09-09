import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';
import { app } from 'electron';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export interface DatabaseConfig {
  filename: string;
  driver: typeof sqlite3.Database;
}

/**
 * Get database file path based on environment
 */
function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test') {
    return ':memory:';
  }
  
  // In production, store database in user data directory
  const userDataPath = app?.getPath('userData') || './data';
  return path.join(userDataPath, 'jobmanager.db');
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  try {
    const dbPath = getDatabasePath();

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Enable performance optimizations
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better performance and concurrency
    await db.exec('PRAGMA journal_mode = WAL');
    
    // Increase cache size for better performance (negative value = KB)
    await db.exec('PRAGMA cache_size = -64000'); // 64MB cache
    
    // Enable synchronous mode for better performance (with WAL, this is safe)
    await db.exec('PRAGMA synchronous = NORMAL');
    
    // Increase temp store to memory for better performance
    await db.exec('PRAGMA temp_store = MEMORY');
    
    // Enable memory-mapped I/O for better performance
    await db.exec('PRAGMA mmap_size = 268435456'); // 256MB
    
    // Optimize for typical usage patterns
    await db.exec('PRAGMA optimize');
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get existing database connection
 */
export function getDatabase(): Database<sqlite3.Database, sqlite3.Statement> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * Execute raw SQL query
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  const database = getDatabase();
  return await database.all(sql, params);
}

/**
 * Execute SQL statement (INSERT, UPDATE, DELETE)
 */
export async function executeStatement(sql: string, params: any[] = []): Promise<any> {
  const database = getDatabase();
  return await database.run(sql, params);
}
