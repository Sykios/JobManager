import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Company, Application } from '../types';
import { CompanyModel } from '../models/Company';

export interface CompanyCreateData {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
}

export interface CompanyWithApplications extends Company {
  applicationCount: number;
  latestApplicationDate?: string;
  applications?: Application[];
}

export class CompanyService {
  constructor(private db: Database<sqlite3.Database, sqlite3.Statement>) {}

  /**
   * Create a new company
   */
  async create(data: CompanyCreateData): Promise<CompanyModel> {
    const company = new CompanyModel(data);
    const validation = company.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO companies (name, website, industry, location, size, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      company.name,
      company.website || null,
      company.industry || null,
      company.location || null,
      company.size || null,
      company.description || null,
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create company');
    }

    // Queue for sync
    await this.queueForSync(result.lastID, 'create', company.toJSON());

    return this.getById(result.lastID);
  }

  /**
   * Get company by ID
   */
  async getById(id: number): Promise<CompanyModel> {
    const query = 'SELECT * FROM companies WHERE id = ?';
    const row = await this.db.get<Company>(query, [id]);
    
    if (!row) {
      throw new Error(`Company with ID ${id} not found`);
    }

    return CompanyModel.fromJSON(row);
  }

  /**
   * Get company by name (useful for finding existing companies during application creation)
   */
  async getByName(name: string): Promise<CompanyModel | null> {
    const query = 'SELECT * FROM companies WHERE LOWER(name) = LOWER(?)';
    const row = await this.db.get<Company>(query, [name]);
    
    return row ? CompanyModel.fromJSON(row) : null;
  }

  /**
   * Search companies by name (for autocomplete/selection)
   */
  async searchByName(query: string, limit: number = 10): Promise<CompanyModel[]> {
    const searchQuery = `
      SELECT * FROM companies 
      WHERE LOWER(name) LIKE LOWER(?) 
      ORDER BY 
        CASE WHEN LOWER(name) = LOWER(?) THEN 1 ELSE 2 END,
        name ASC
      LIMIT ?
    `;

    const searchPattern = `%${query}%`;
    const rows = await this.db.all<Company[]>(searchQuery, [searchPattern, query, limit]);
    
    return rows.map(row => CompanyModel.fromJSON(row));
  }

  /**
   * Get all companies with pagination
   */
  async getAll(
    page: number = 1, 
    limit: number = 50,
    sortBy: 'name' | 'created_at' | 'application_count' = 'name',
    sortOrder: 'ASC' | 'DESC' = 'ASC'
  ): Promise<{ companies: CompanyModel[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Count total companies
    const countResult = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM companies');
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Base query for companies with application count
    let query = `
      SELECT c.*, COUNT(a.id) as applicationCount
      FROM companies c
      LEFT JOIN applications a ON c.id = a.company_id
      GROUP BY c.id
    `;

    // Add sorting
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY c.name ${sortOrder}`;
        break;
      case 'created_at':
        query += ` ORDER BY c.created_at ${sortOrder}`;
        break;
      case 'application_count':
        query += ` ORDER BY applicationCount ${sortOrder}, c.name ASC`;
        break;
    }

    query += ` LIMIT ? OFFSET ?`;

    const rows = await this.db.all<(Company & { applicationCount: number })[]>(query, [limit, offset]);
    const companies = rows.map(row => CompanyModel.fromJSON(row));

    return {
      companies,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get company with all linked applications
   */
  async getWithApplications(id: number): Promise<CompanyWithApplications> {
    const company = await this.getById(id);
    
    const applicationsQuery = `
      SELECT * FROM applications 
      WHERE company_id = ? 
      ORDER BY application_date DESC, created_at DESC
    `;
    
    const applications = await this.db.all<Application[]>(applicationsQuery, [id]);
    
    return {
      ...company.toJSON(),
      applicationCount: applications.length,
      latestApplicationDate: applications.length > 0 ? applications[0].application_date : undefined,
      applications
    };
  }

  /**
   * Get companies with application statistics
   */
  async getWithStats(): Promise<CompanyWithApplications[]> {
    const query = `
      SELECT 
        c.*,
        COUNT(a.id) as applicationCount,
        MAX(a.application_date) as latestApplicationDate
      FROM companies c
      LEFT JOIN applications a ON c.id = a.company_id
      GROUP BY c.id
      ORDER BY applicationCount DESC, c.name ASC
    `;

    const rows = await this.db.all<(Company & { applicationCount: number; latestApplicationDate?: string })[]>(query);
    
    return rows.map(row => ({
      ...row,
      applicationCount: row.applicationCount || 0,
      latestApplicationDate: row.latestApplicationDate || undefined
    }));
  }

  /**
   * Update company
   */
  async update(id: number, data: Partial<CompanyCreateData>): Promise<CompanyModel> {
    const company = await this.getById(id);
    const updatedCompany = company.updateWith(data);
    const validation = updatedCompany.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      UPDATE companies 
      SET name = ?, website = ?, industry = ?, location = ?, size = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db.run(query, [
      updatedCompany.name,
      updatedCompany.website || null,
      updatedCompany.industry || null,
      updatedCompany.location || null,
      updatedCompany.size || null,
      updatedCompany.description || null,
      id
    ]);

    // Queue for sync
    await this.queueForSync(id, 'update', updatedCompany.toJSON());

    return this.getById(id);
  }

  /**
   * Delete company (only if no applications are linked)
   */
  async delete(id: number, force: boolean = false): Promise<void> {
    // Check for linked applications
    const applicationCount = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM applications WHERE company_id = ?',
      [id]
    );

    if (!force && applicationCount && applicationCount.count > 0) {
      throw new Error(`Cannot delete company: ${applicationCount.count} applications are linked to this company`);
    }

    if (force) {
      // First, unlink all applications (set company_id to null)
      await this.db.run('UPDATE applications SET company_id = NULL WHERE company_id = ?', [id]);
    }

    // Delete the company
    const result = await this.db.run('DELETE FROM companies WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw new Error('Company not found');
    }

    // Queue for sync
    await this.queueForSync(id, 'delete');
  }

  /**
   * Find or create company by name (useful during application creation)
   */
  async findOrCreate(name: string, additionalData?: Omit<CompanyCreateData, 'name'>): Promise<CompanyModel> {
    // First try to find existing company
    const existing = await this.getByName(name);
    if (existing) {
      return existing;
    }

    // Create new company
    return this.create({
      name,
      ...additionalData
    });
  }

  /**
   * Get companies that have applications in specific status
   */
  async getByApplicationStatus(status: string): Promise<CompanyWithApplications[]> {
    const query = `
      SELECT 
        c.*,
        COUNT(a.id) as applicationCount,
        MAX(a.application_date) as latestApplicationDate
      FROM companies c
      INNER JOIN applications a ON c.id = a.company_id
      WHERE a.status = ?
      GROUP BY c.id
      ORDER BY applicationCount DESC, c.name ASC
    `;

    const rows = await this.db.all<(Company & { applicationCount: number; latestApplicationDate?: string })[]>(query, [status]);
    
    return rows.map(row => ({
      ...row,
      applicationCount: row.applicationCount || 0,
      latestApplicationDate: row.latestApplicationDate || undefined
    }));
  }

  /**
   * Get application statistics for a company
   */
  async getApplicationStats(id: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    latestApplication?: Application;
    oldestApplication?: Application;
  }> {
    const statsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM applications 
      WHERE company_id = ?
      GROUP BY status
    `;

    const statusRows = await this.db.all<{ status: string; count: number }[]>(statsQuery, [id]);
    const byStatus: Record<string, number> = {};
    let total = 0;

    statusRows.forEach(row => {
      byStatus[row.status] = row.count;
      total += row.count;
    });

    // Get latest and oldest applications
    const latestQuery = `
      SELECT * FROM applications 
      WHERE company_id = ? 
      ORDER BY application_date DESC, created_at DESC 
      LIMIT 1
    `;

    const oldestQuery = `
      SELECT * FROM applications 
      WHERE company_id = ? 
      ORDER BY application_date ASC, created_at ASC 
      LIMIT 1
    `;

    const latestApplication = await this.db.get<Application>(latestQuery, [id]);
    const oldestApplication = await this.db.get<Application>(oldestQuery, [id]);

    return {
      total,
      byStatus,
      latestApplication: latestApplication || undefined,
      oldestApplication: oldestApplication || undefined
    };
  }

  /**
   * Merge two companies (useful for deduplication)
   */
  async merge(keepId: number, mergeId: number): Promise<CompanyModel> {
    // Update all applications to point to the company we're keeping
    await this.db.run('UPDATE applications SET company_id = ? WHERE company_id = ?', [keepId, mergeId]);
    
    // Update all contacts to point to the company we're keeping
    await this.db.run('UPDATE contacts SET company_id = ? WHERE company_id = ?', [keepId, mergeId]);

    // Delete the merged company
    await this.db.run('DELETE FROM companies WHERE id = ?', [mergeId]);

    return this.getById(keepId);
  }

  /**
   * Queue company for synchronization
   */
  private async queueForSync(recordId: number, operation: 'create' | 'update' | 'delete', data?: any): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO sync_queue (table_name, record_id, operation, data) 
         VALUES (?, ?, ?, ?)`,
        ['companies', recordId, operation, data ? JSON.stringify(data) : null]
      );
    } catch (error) {
      console.error('Failed to queue company for sync:', error);
      // Don't fail the main operation if sync queueing fails
    }
  }
}
