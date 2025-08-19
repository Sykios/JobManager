import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { FileModel, FileType } from '../models/File';

export interface FileCreateData {
  application_id?: number;
  filename: string;
  type: FileType;
  size: number;
  path?: string;
  description?: string;
}

export interface FileUpdateData extends Partial<FileCreateData> {}

export interface FileFilters {
  application_id?: number;
  type?: FileType;
  filename_search?: string;
  size_min?: number;
  size_max?: number;
  date_from?: string;
  date_to?: string;
}

export interface FileStatistics {
  total: number;
  totalSize: number;
  byType: Record<FileType, number>;
  averageSize: number;
  largestFile: FileModel | null;
  recentFiles: number; // files uploaded in last 30 days
}

export class FileService {
  private uploadPath: string;

  constructor(
    private db: Database<sqlite3.Database, sqlite3.Statement>,
    uploadPath: string = './uploads'
  ) {
    this.uploadPath = uploadPath;
    this.ensureUploadDirectory();
  }

  /**
   * Initialize the files table and upload directory
   */
  async initializeTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        filename TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        upload_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        path TEXT,
        description TEXT,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `;

    await this.db.exec(query);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_application_id ON files(application_id);
      CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
      CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
      CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);
    `);
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Determine file type from extension
   */
  private getFileTypeFromExtension(filename: string): FileType {
    const ext = path.extname(filename).toLowerCase().slice(1);
    
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'doc':
      case 'docx': return 'docx';
      case 'txt': return 'txt';
      case 'jpg':
      case 'jpeg': return 'jpg';
      case 'png': return 'png';
      default: return 'other';
    }
  }

  /**
   * Determine MIME type from filename extension
   */
  private getMimeTypeFromExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    const sanitized = basename.replace(/[^a-zA-Z0-9\-_]/g, '_');
    return `${timestamp}_${sanitized}${ext}`;
  }

  /**
   * Save file to disk and create database record
   */
  async uploadFile(
    fileBuffer: Buffer, 
    originalFilename: string, 
    applicationId?: number,
    description?: string
  ): Promise<FileModel> {
    const filename = this.generateUniqueFilename(originalFilename);
    const filePath = path.join(this.uploadPath, filename);
    const fileType = this.getFileTypeFromExtension(originalFilename);
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > maxSize) {
      throw new Error('Datei ist zu groß. Maximum: 50MB');
    }

    // Validate file type
    const allowedTypes: FileType[] = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'other'];
    if (!allowedTypes.includes(fileType)) {
      throw new Error('Dateityp nicht unterstützt');
    }

    try {
      // Save file to disk
      await fs.promises.writeFile(filePath, fileBuffer);

      // Create database record
      const fileData: FileCreateData = {
        application_id: applicationId,
        filename: originalFilename,
        type: fileType,
        size: fileBuffer.length,
        path: filePath,
        description
      };

      return await this.create(fileData);
    } catch (error) {
      // Clean up file if database operation fails
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath).catch(console.error);
      }
      throw error;
    }
  }

  /**
   * Create a new file record
   */
  async create(data: FileCreateData): Promise<FileModel> {
    const fileModel = new FileModel({
      ...data,
      mime_type: this.getMimeTypeFromExtension(data.filename),
      upload_date: new Date().toISOString()
    });

    const validation = fileModel.validate();
    if (!validation.isValid) {
      throw new Error(`Validierung fehlgeschlagen: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO files (
        application_id, filename, type, size, upload_date, path, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      data.application_id || null,
      data.filename,
      data.type,
      data.size,
      fileModel.upload_date,
      data.path || null,
      data.description || null
    ]);

    if (!result.lastID) {
      throw new Error('Fehler beim Erstellen der Datei');
    }

    return this.getById(result.lastID);
  }

  /**
   * Get file by ID
   */
  async getById(id: number): Promise<FileModel> {
    const query = 'SELECT * FROM files WHERE id = ?';
    const row = await this.db.get<any>(query, [id]);
    
    if (!row) {
      throw new Error(`Datei mit ID ${id} nicht gefunden`);
    }

    return FileModel.fromJSON(row);
  }

  /**
   * Update file metadata (not the actual file)
   */
  async update(id: number, data: FileUpdateData): Promise<FileModel> {
    const existing = await this.getById(id);
    
    // Create updated file model for validation
    const updated = new FileModel({
      ...existing,
      ...data
    });

    const validation = updated.validate();
    if (!validation.isValid) {
      throw new Error(`Validierung fehlgeschlagen: ${validation.errors.join(', ')}`);
    }

    const fields = Object.keys(data).filter(key => data[key as keyof FileUpdateData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field as keyof FileUpdateData]);

    if (fields.length === 0) {
      return existing;
    }

    const query = `UPDATE files SET ${setClause} WHERE id = ?`;
    await this.db.run(query, [...values, id]);

    return this.getById(id);
  }

  /**
   * Delete file and its database record
   */
  async delete(id: number): Promise<void> {
    const file = await this.getById(id);
    
    const query = 'DELETE FROM files WHERE id = ?';
    const result = await this.db.run(query, [id]);
    
    if (result.changes === 0) {
      throw new Error(`Datei mit ID ${id} nicht gefunden`);
    }

    // Delete physical file
    if (file.path && fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        console.warn(`Warning: Could not delete file ${file.path}:`, error);
      }
    }
  }

  /**
   * Get all files with optional filtering
   */
  async getAll(filters?: FileFilters): Promise<FileModel[]> {
    let query = 'SELECT * FROM files';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.application_id !== undefined) {
        if (filters.application_id === null) {
          conditions.push('application_id IS NULL');
        } else {
          conditions.push('application_id = ?');
          params.push(filters.application_id);
        }
      }

      if (filters.type) {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      if (filters.filename_search) {
        conditions.push('filename LIKE ?');
        params.push(`%${filters.filename_search}%`);
      }

      if (filters.size_min !== undefined) {
        conditions.push('size >= ?');
        params.push(filters.size_min);
      }

      if (filters.size_max !== undefined) {
        conditions.push('size <= ?');
        params.push(filters.size_max);
      }

      if (filters.date_from) {
        conditions.push('upload_date >= ?');
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        conditions.push('upload_date <= ?');
        params.push(filters.date_to);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY upload_date DESC';

    const rows = await this.db.all<any[]>(query, params);
    return rows.map(row => FileModel.fromJSON(row));
  }

  /**
   * Get files by application ID
   */
  async getByApplication(applicationId: number): Promise<FileModel[]> {
    return this.getAll({ application_id: applicationId });
  }

  /**
   * Get unlinked files (not associated with any application)
   */
  async getUnlinkedFiles(): Promise<FileModel[]> {
    const query = 'SELECT * FROM files WHERE application_id IS NULL ORDER BY upload_date DESC';
    const rows = await this.db.all<any[]>(query);
    return rows.map(row => FileModel.fromJSON(row));
  }

  /**
   * Link file to application
   */
  async linkToApplication(fileId: number, applicationId: number): Promise<FileModel> {
    return this.update(fileId, { application_id: applicationId });
  }

  /**
   * Unlink file from application
   */
  async unlinkFromApplication(fileId: number): Promise<FileModel> {
    return this.update(fileId, { application_id: undefined });
  }

  /**
   * Get file buffer for download
   */
  async getFileBuffer(id: number): Promise<Buffer> {
    const file = await this.getById(id);
    
    if (!file.path || !fs.existsSync(file.path)) {
      throw new Error('Datei nicht auf dem Dateisystem gefunden');
    }

    return fs.promises.readFile(file.path);
  }

  /**
   * Get file statistics
   */
  async getStatistics(): Promise<FileStatistics> {
    const allFiles = await this.getAll();
    const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
    const averageSize = allFiles.length > 0 ? totalSize / allFiles.length : 0;

    // Find largest file
    const largestFile = allFiles.reduce((largest, file) => 
      !largest || file.size > largest.size ? file : largest, 
      null as FileModel | null
    );

    // Count by type
    const byType: Record<FileType, number> = {
      pdf: 0,
      doc: 0,
      docx: 0,
      txt: 0,
      jpg: 0,
      png: 0,
      other: 0
    };

    allFiles.forEach(file => {
      byType[file.type] = (byType[file.type] || 0) + 1;
    });

    // Count recent files (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentFiles = allFiles.filter(file => 
      new Date(file.upload_date) > thirtyDaysAgo
    ).length;

    return {
      total: allFiles.length,
      totalSize,
      byType,
      averageSize,
      largestFile,
      recentFiles
    };
  }

  /**
   * Clean up orphaned files (files on disk without database records)
   */
  async cleanupOrphanedFiles(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      if (!fs.existsSync(this.uploadPath)) {
        return { cleaned: 0, errors: [] };
      }

      const filesOnDisk = await fs.promises.readdir(this.uploadPath);
      const filesInDb = await this.getAll();
      const dbFilenames = filesInDb
        .map(f => f.path ? path.basename(f.path) : null)
        .filter(Boolean) as string[];

      for (const diskFile of filesOnDisk) {
        if (!dbFilenames.includes(diskFile)) {
          try {
            await fs.promises.unlink(path.join(this.uploadPath, diskFile));
            cleaned++;
          } catch (error) {
            errors.push(`Fehler beim Löschen von ${diskFile}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Fehler beim Cleanup: ${error}`);
    }

    return { cleaned, errors };
  }

  /**
   * Move files to a different directory
   */
  async changeUploadPath(newPath: string): Promise<void> {
    const oldPath = this.uploadPath;
    this.uploadPath = newPath;
    this.ensureUploadDirectory();

    try {
      const files = await this.getAll();
      
      for (const file of files) {
        if (file.path && fs.existsSync(file.path)) {
          const filename = path.basename(file.path);
          const newFilePath = path.join(newPath, filename);
          
          await fs.promises.copyFile(file.path, newFilePath);
          await this.update(file.id!, { path: newFilePath });
          await fs.promises.unlink(file.path);
        }
      }
    } catch (error) {
      // Revert path change on error
      this.uploadPath = oldPath;
      throw error;
    }
  }
}
