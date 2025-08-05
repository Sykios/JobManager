import { initializeDatabase, closeDatabase } from './database';
import { runMigrations, getMigrationStatus } from './migrationRunner';
import { seedDemoData } from './seeds/demo-data';

/**
 * Initialize the complete database system
 */
export async function setupDatabase(seedDemo: boolean = false): Promise<void> {
  console.log('Setting up database system...');

  try {
    // Initialize database connection
    const db = await initializeDatabase();
    
    // Check migration status
    const status = await getMigrationStatus(db);
    console.log(`Migration status: ${status.appliedMigrations}/${status.totalMigrations} applied`);
    
    if (status.pendingMigrations.length > 0) {
      console.log(`Pending migrations: ${status.pendingMigrations.join(', ')}`);
    }
    
    // Run pending migrations
    await runMigrations(db);
    
    // Seed demo data if requested
    if (seedDemo) {
      console.log('Seeding demo data...');
      await seedDemoData(db);
    }
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

/**
 * Teardown database (mainly for testing)
 */
export async function teardownDatabase(): Promise<void> {
  await closeDatabase();
}

// Export all database functions
export * from './database';
export * from './migrationRunner';
export * from './seeds/demo-data';
