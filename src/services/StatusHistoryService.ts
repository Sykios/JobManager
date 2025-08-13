import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { ApplicationStatus } from '../types';
import { StatusHistory, StatusHistoryModel } from '../models/StatusHistory';

export interface StatusHistoryCreateData {
  application_id: number;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note?: string;
  created_by?: string;
}

export class StatusHistoryService {
  constructor(private db: Database<sqlite3.Database, sqlite3.Statement>) {}

  /**
   * Initialize status history table
   */
  async initializeTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE
      )
    `;

    await this.db.exec(query);

    // Create index for better query performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_status_history_application_id 
      ON status_history(application_id)
    `);
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_status_history_created_at 
      ON status_history(created_at)
    `);
  }

  /**
   * Record a status change
   */
  async recordStatusChange(data: StatusHistoryCreateData): Promise<StatusHistoryModel> {
    const query = `
      INSERT INTO status_history (
        application_id, from_status, to_status, note, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      data.application_id,
      data.from_status,
      data.to_status,
      data.note || null,
      data.created_by || null,
    ]);

    if (!result.lastID) {
      throw new Error('Failed to record status change');
    }

    return this.getById(result.lastID);
  }

  /**
   * Get status history entry by ID
   */
  async getById(id: number): Promise<StatusHistoryModel> {
    const query = 'SELECT * FROM status_history WHERE id = ?';
    const row = await this.db.get<StatusHistory>(query, [id]);
    
    if (!row) {
      throw new Error(`Status history entry with ID ${id} not found`);
    }

    return StatusHistoryModel.fromJSON(row);
  }

  /**
   * Get all status history for an application
   */
  async getByApplicationId(applicationId: number): Promise<StatusHistoryModel[]> {
    const query = `
      SELECT * FROM status_history 
      WHERE application_id = ? 
      ORDER BY created_at ASC
    `;

    const rows = await this.db.all<StatusHistory[]>(query, [applicationId]);
    return rows.map(row => StatusHistoryModel.fromJSON(row));
  }

  /**
   * Get the current status of an application based on history
   */
  async getCurrentStatus(applicationId: number): Promise<ApplicationStatus | null> {
    const query = `
      SELECT to_status FROM status_history 
      WHERE application_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const row = await this.db.get<{ to_status: ApplicationStatus }>(query, [applicationId]);
    return row?.to_status || null;
  }

  /**
   * Get recent status changes across all applications
   */
  async getRecentChanges(limit: number = 10): Promise<(StatusHistoryModel & { application_title?: string })[]> {
    const query = `
      SELECT sh.*, a.title as application_title
      FROM status_history sh
      LEFT JOIN applications a ON sh.application_id = a.id
      ORDER BY sh.created_at DESC
      LIMIT ?
    `;

    const rows = await this.db.all<(StatusHistory & { application_title?: string })[]>(query, [limit]);
    return rows.map(row => {
      const model = StatusHistoryModel.fromJSON(row);
      return Object.assign(model, { application_title: row.application_title });
    });
  }

  /**
   * Get status statistics for a specific application
   */
  async getApplicationStatusStats(applicationId: number): Promise<{
    totalChanges: number;
    currentStatus: ApplicationStatus | null;
    daysSinceLastChange: number | null;
    averageDaysBetweenChanges: number | null;
  }> {
    const history = await this.getByApplicationId(applicationId);
    
    if (history.length === 0) {
      return {
        totalChanges: 0,
        currentStatus: null,
        daysSinceLastChange: null,
        averageDaysBetweenChanges: null,
      };
    }

    const currentStatus = history[history.length - 1].to_status;
    const lastChangeDate = new Date(history[history.length - 1].created_at);
    const now = new Date();
    const daysSinceLastChange = Math.floor((now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24));

    let averageDaysBetweenChanges: number | null = null;
    if (history.length > 1) {
      const firstChange = new Date(history[0].created_at);
      const lastChange = new Date(history[history.length - 1].created_at);
      const totalDays = Math.floor((lastChange.getTime() - firstChange.getTime()) / (1000 * 60 * 60 * 24));
      averageDaysBetweenChanges = totalDays / (history.length - 1);
    }

    return {
      totalChanges: history.length,
      currentStatus,
      daysSinceLastChange,
      averageDaysBetweenChanges,
    };
  }

  /**
   * Clean up old status history (for maintenance)
   */
  async cleanupOldHistory(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const query = `
      DELETE FROM status_history 
      WHERE created_at < ? 
      AND id NOT IN (
        SELECT id FROM status_history sh1
        WHERE NOT EXISTS (
          SELECT 1 FROM status_history sh2 
          WHERE sh2.application_id = sh1.application_id 
          AND sh2.created_at > sh1.created_at
        )
      )
    `;

    const result = await this.db.run(query, [cutoffDate.toISOString()]);
    return result.changes || 0;
  }

  /**
   * Delete all status history for an application (used when deleting an application)
   */
  async deleteByApplicationId(applicationId: number): Promise<void> {
    const query = 'DELETE FROM status_history WHERE application_id = ?';
    await this.db.run(query, [applicationId]);
  }
}
