import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

/**
 * Migration 005: Refresh DELETE triggers safely across all tables
 * Why: Ensure no trigger references OLD.supabase_id or OLD.sync_status on tables
 * that may not have those columns in some environments. Use PRAGMA-based
 * detection and minimal payloads.
 */
export async function up(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Running migration: 005_refresh_delete_triggers');

  // Drop all known delete triggers (if they exist) to avoid duplicates/old versions
  const triggers = [
    'queue_application_sync_on_delete',
    'queue_company_sync_on_delete',
    'queue_contact_sync_on_delete',
    'queue_reminder_sync_on_delete',
    'queue_status_history_sync_on_delete',
    'queue_files_sync_on_delete',
    'queue_notification_history_sync_on_delete',
    'queue_reminder_templates_sync_on_delete',
  ];
  for (const trg of triggers) {
    await db.exec(`DROP TRIGGER IF EXISTS ${trg}`);
  }

  // Helper to check if a column exists on a table
  const hasColumn = async (table: string, column: string): Promise<boolean> => {
    const cols = await db.all<{ name: string }[]>(`PRAGMA table_info(${table})`);
    return cols.some(c => c.name === column);
  };

  // Create a safe delete trigger for a table
  const createSafeDeleteTrigger = async (table: string): Promise<void> => {
    const hasSupabaseId = await hasColumn(table, 'supabase_id');
    const hasDeletedAt = await hasColumn(table, 'deleted_at');

    const jsonPairs: string[] = [];
    if (hasSupabaseId) jsonPairs.push("'supabase_id', OLD.supabase_id");
    if (hasDeletedAt) jsonPairs.push("'deleted_at', OLD.deleted_at");

    const jsonObject = jsonPairs.length > 0
      ? `json_object(${jsonPairs.join(', ')})`
      : `json_object('record_id', OLD.id)`;

    const sql = `
      CREATE TRIGGER IF NOT EXISTS queue_${table}_sync_on_delete
      AFTER DELETE ON ${table}
      BEGIN
        INSERT INTO sync_queue (table_name, record_id, operation, data)
        VALUES ('${table}', OLD.id, 'delete', ${jsonObject});
      END
    `;
    await db.exec(sql);
  };

  // Apply to all tables that we sync via DB
  const tables = [
    'applications',
    'companies',
    'contacts',
    'reminders',
    'status_history',
    'files',
    'notification_history',
    'reminder_templates',
  ];

  for (const table of tables) {
    await createSafeDeleteTrigger(table);
  }

  console.log('✅ Migration 005_refresh_delete_triggers completed successfully');
}

export async function down(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Rolling back migration: 005_refresh_delete_triggers');

  const triggers = [
    'queue_application_sync_on_delete',
    'queue_company_sync_on_delete',
    'queue_contact_sync_on_delete',
    'queue_reminder_sync_on_delete',
    'queue_status_history_sync_on_delete',
    'queue_files_sync_on_delete',
    'queue_notification_history_sync_on_delete',
    'queue_reminder_templates_sync_on_delete',
  ];
  for (const trg of triggers) {
    await db.exec(`DROP TRIGGER IF EXISTS ${trg}`);
  }
}