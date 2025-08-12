import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Application, ApplicationStatus, WorkType, Priority } from '../types';
import { ApplicationModel } from '../models/Application';

export interface ApplicationFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  company_id?: number;
  priority?: number;
  work_type?: WorkType;
  remote_possible?: boolean;
  deadline_before?: string;
  deadline_after?: string;
  search?: string;
}

export interface ApplicationCreateData {
  title: string;
  position: string;
  company_id?: number;
  contact_id?: number;
  job_url?: string;
  application_channel?: string;
  salary_range?: string;
  work_type?: WorkType;
  location?: string;
  remote_possible?: boolean;
  priority?: Priority;
  application_date?: string;
  deadline?: string;
  follow_up_date?: string;
  notes?: string;
  cover_letter?: string;
  requirements?: string;
  benefits?: string;
}

export interface ApplicationUpdateData extends Partial<ApplicationCreateData> {
  status?: ApplicationStatus;
}

export class ApplicationService {
  constructor(private db: Database<sqlite3.Database, sqlite3.Statement>) {}

  /**
   * Create a new application
   */
  async create(data: ApplicationCreateData): Promise<ApplicationModel> {
    const application = new ApplicationModel(data);
    const validation = application.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO applications (
        company_id, contact_id, title, position, job_url, application_channel,
        salary_range, work_type, location, remote_possible, status, priority,
        application_date, deadline, follow_up_date, notes, cover_letter,
        requirements, benefits
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      data.company_id || null,
      data.contact_id || null,
      data.title,
      data.position,
      data.job_url || null,
      data.application_channel || null,
      data.salary_range || null,
      data.work_type || null,
      data.location || null,
      data.remote_possible ? 1 : 0,
      'draft',
      data.priority || 1,
      data.application_date || null,
      data.deadline || null,
      data.follow_up_date || null,
      data.notes || null,
      data.cover_letter || null,
      data.requirements || null,
      data.benefits || null,
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create application');
    }

    return this.getById(result.lastID);
  }

  /**
   * Get application by ID
   */
  async getById(id: number): Promise<ApplicationModel> {
    const query = 'SELECT * FROM applications WHERE id = ?';
    const row = await this.db.get<Application>(query, [id]);
    
    if (!row) {
      throw new Error(`Application with ID ${id} not found`);
    }

    return ApplicationModel.fromJSON(row);
  }

  /**
   * Update an existing application
   */
  async update(id: number, data: ApplicationUpdateData): Promise<ApplicationModel> {
    const existing = await this.getById(id);
    
    // Create updated application for validation
    const updated = new ApplicationModel({
      ...existing.toJSON(),
      ...data,
      updated_at: new Date().toISOString(),
    });

    const validation = updated.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const fields = Object.keys(data).filter(key => data[key as keyof ApplicationUpdateData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field as keyof ApplicationUpdateData]);

    if (fields.length === 0) {
      return existing;
    }

    const query = `UPDATE applications SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.db.run(query, [...values, id]);

    return this.getById(id);
  }

  /**
   * Delete an application
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM applications WHERE id = ?';
    const result = await this.db.run(query, [id]);
    
    if (result.changes === 0) {
      throw new Error(`Application with ID ${id} not found`);
    }
  }

  /**
   * Get all applications with optional filtering
   */
  async getAll(filters?: ApplicationFilters): Promise<ApplicationModel[]> {
    let query = 'SELECT * FROM applications';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          const placeholders = filters.status.map(() => '?').join(',');
          conditions.push(`status IN (${placeholders})`);
          params.push(...filters.status);
        } else {
          conditions.push('status = ?');
          params.push(filters.status);
        }
      }

      if (filters.company_id) {
        conditions.push('company_id = ?');
        params.push(filters.company_id);
      }

      if (filters.priority) {
        conditions.push('priority = ?');
        params.push(filters.priority);
      }

      if (filters.work_type) {
        conditions.push('work_type = ?');
        params.push(filters.work_type);
      }

      if (filters.remote_possible !== undefined) {
        conditions.push('remote_possible = ?');
        params.push(filters.remote_possible ? 1 : 0);
      }

      if (filters.deadline_before) {
        conditions.push('deadline <= ?');
        params.push(filters.deadline_before);
      }

      if (filters.deadline_after) {
        conditions.push('deadline >= ?');
        params.push(filters.deadline_after);
      }

      if (filters.search) {
        conditions.push(`(
          title LIKE ? OR 
          position LIKE ? OR 
          location LIKE ? OR 
          notes LIKE ? OR 
          requirements LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const rows = await this.db.all<Application[]>(query, params);
    return rows.map(row => ApplicationModel.fromJSON(row));
  }

  /**
   * Update application status
   */
  async updateStatus(id: number, status: ApplicationStatus): Promise<ApplicationModel> {
    return this.update(id, { status });
  }

  /**
   * Get applications with upcoming deadlines
   */
  async getUpcomingDeadlines(daysAhead: number = 7): Promise<ApplicationModel[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const query = `
      SELECT * FROM applications 
      WHERE deadline IS NOT NULL 
        AND deadline <= ? 
        AND deadline >= date('now')
        AND status NOT IN ('rejected', 'withdrawn')
      ORDER BY deadline ASC
    `;

    const rows = await this.db.all<Application[]>(query, [futureDate.toISOString().split('T')[0]]);
    return rows.map(row => ApplicationModel.fromJSON(row));
  }

  /**
   * Get application statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    averagePriority: number;
    upcomingDeadlines: number;
  }> {
    const totalQuery = 'SELECT COUNT(*) as count FROM applications';
    const totalResult = await this.db.get<{ count: number }>(totalQuery);

    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM applications 
      GROUP BY status
    `;
    const statusResults = await this.db.all<{ status: ApplicationStatus; count: number }[]>(statusQuery);

    const avgPriorityQuery = 'SELECT AVG(priority) as avg FROM applications';
    const avgResult = await this.db.get<{ avg: number }>(avgPriorityQuery);

    const upcomingDeadlines = await this.getUpcomingDeadlines(7);

    const byStatus: Record<ApplicationStatus, number> = {
      draft: 0,
      applied: 0,
      'in-review': 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    statusResults.forEach(result => {
      byStatus[result.status] = result.count;
    });

    return {
      total: totalResult?.count || 0,
      byStatus,
      averagePriority: avgResult?.avg || 0,
      upcomingDeadlines: upcomingDeadlines.length,
    };
  }
}
