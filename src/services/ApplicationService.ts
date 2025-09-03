import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Application, ApplicationStatus, WorkType, Priority } from '../types';
import { ApplicationModel } from '../models/Application';
import { StatusHistoryService } from './StatusHistoryService';
import { FileService } from './FileService';
import { FileModel } from '../models/File';

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
  constructor(
    private db: Database<sqlite3.Database, sqlite3.Statement>,
    private statusHistoryService?: StatusHistoryService,
    private fileService?: FileService
  ) {}

  async initializeTable(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        contact_id INTEGER,
        title TEXT NOT NULL,
        position TEXT NOT NULL,
        job_url TEXT,
        application_channel TEXT,
        salary_range TEXT,
        work_type TEXT,
        location TEXT,
        remote_possible INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        priority INTEGER DEFAULT 3,
        application_date TEXT,
        deadline TEXT,
        follow_up_date TEXT,
        notes TEXT,
        cover_letter TEXT,
        requirements TEXT,
        benefits TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

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

    const createdApplication = await this.getById(result.lastID);
    
    // Queue for sync
    await this.queueForSync(result.lastID, 'create', createdApplication.toJSON());
    
    return createdApplication;
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

    const updatedApplication = await this.getById(id);
    
    // Queue for sync
    await this.queueForSync(id, 'update', updatedApplication.toJSON());

    return updatedApplication;
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
   * Update application status with history tracking
   */
  async updateStatus(id: number, status: ApplicationStatus, note?: string): Promise<ApplicationModel> {
    // Get current application to track the status change
    const currentApplication = await this.getById(id);
    const oldStatus = currentApplication.status;

    // Update the application status
    const updatedApplication = await this.update(id, { status });

    // Record status history if service is available and status actually changed
    if (this.statusHistoryService && oldStatus !== status) {
      await this.statusHistoryService.recordStatusChange({
        application_id: id,
        from_status: oldStatus,
        to_status: status,
        note,
      });
    }

    return updatedApplication;
  }

  /**
   * Get application with its status history
   */
  async getWithStatusHistory(id: number): Promise<ApplicationModel & { statusHistory?: any[] }> {
    const application = await this.getById(id);
    
    if (this.statusHistoryService) {
      const statusHistory = await this.statusHistoryService.getByApplicationId(id);
      return Object.assign(application, { statusHistory });
    }

    return application;
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

  /**
   * Get application with its attached files
   */
  async getWithFiles(id: number): Promise<ApplicationModel & { files: FileModel[] }> {
    const application = await this.getById(id);
    
    if (this.fileService) {
      const files = await this.fileService.getByApplication(id);
      return Object.assign(application, { files });
    }

    return Object.assign(application, { files: [] });
  }

  /**
   * Attach a file to an application
   */
  async attachFile(applicationId: number, fileId: number): Promise<void> {
    if (!this.fileService) {
      throw new Error('File service not available');
    }

    // Verify application exists
    await this.getById(applicationId);

    // Link the file to the application
    await this.fileService.linkToApplication(fileId, applicationId);
  }

  /**
   * Detach a file from an application
   */
  async detachFile(applicationId: number, fileId: number): Promise<void> {
    if (!this.fileService) {
      throw new Error('File service not available');
    }

    // Verify application exists
    await this.getById(applicationId);

    // Unlink the file from the application
    await this.fileService.unlinkFromApplication(fileId);
  }

  /**
   * Get all files attached to an application
   */
  async getFiles(applicationId: number): Promise<FileModel[]> {
    if (!this.fileService) {
      return [];
    }

    // Verify application exists
    await this.getById(applicationId);

    return this.fileService.getByApplication(applicationId);
  }

  /**
   * Delete application and clean up associated files
   */
  async deleteWithCleanup(id: number): Promise<void> {
    if (this.fileService) {
      // Get all files attached to this application
      const files = await this.fileService.getByApplication(id);
      
      // Unlink all files from the application
      for (const file of files) {
        if (file.id) {
          await this.fileService.unlinkFromApplication(file.id);
        }
      }
    }

    // Queue for sync before deleting
    await this.queueForSync(id, 'delete');

    // Delete the application
    await this.delete(id);
  }

  /**
   * Queue application for synchronization
   */
  private async queueForSync(recordId: number, operation: 'create' | 'update' | 'delete', data?: any): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO sync_queue (table_name, record_id, operation, data) 
         VALUES (?, ?, ?, ?)`,
        ['applications', recordId, operation, data ? JSON.stringify(data) : null]
      );
    } catch (error) {
      console.error('Failed to queue application for sync:', error);
      // Don't fail the main operation if sync queueing fails
    }
  }

  /**
   * Get applications with file statistics
   */
  async getAllWithFileStats(filters?: ApplicationFilters): Promise<(ApplicationModel & { fileCount: number; totalFileSize: number })[]> {
    const applications = await this.getAll(filters);
    
    if (!this.fileService) {
      return applications.map(app => Object.assign(app, { fileCount: 0, totalFileSize: 0 }));
    }

    const applicationsWithStats = await Promise.all(
      applications.map(async (application) => {
        const files = await this.fileService!.getByApplication(application.id);
        const fileCount = files.length;
        const totalFileSize = files.reduce((sum: number, file: FileModel) => sum + file.size, 0);
        
        return Object.assign(application, { fileCount, totalFileSize });
      })
    );

    return applicationsWithStats;
  }
}
