import React, { createContext, ReactNode } from 'react';
import { useDatabase } from './ApplicationContext';
import { FileModel } from '../../models/File';

interface FileServiceType {
  // Basic IPC methods
  executeQuery: (query: string, params?: any[]) => Promise<any>;
  queryDatabase: (query: string, params?: any[]) => Promise<any>;
  
  // High-level file operations
  getAll: () => Promise<FileModel[]>;
  getById: (id: number) => Promise<FileModel | null>;
  getByApplicationId: (applicationId: number) => Promise<FileModel[]>;
  uploadFile: (file: File, applicationId?: number, description?: string) => Promise<FileModel>;
  deleteFile: (id: number) => Promise<void>;
  downloadFile: (id: number) => Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }>;
  updateFileDescription: (id: number, description: string) => Promise<void>;
}

interface FileServiceProviderProps {
  children: ReactNode;
}

export const FileServiceContext = createContext<FileServiceType | null>(null);

export const FileServiceProvider: React.FC<FileServiceProviderProps> = ({ children }) => {
  const { executeQuery, queryDatabase } = useDatabase();

  // Helper methods
  const getFileTypeFromExtension = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'jpg':
      case 'jpeg':
        return 'jpg';
      case 'png':
        return 'png';
      default:
        return 'other';
    }
  };

  const getMimeTypeFromExtension = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  };

  const fileService: FileServiceType = {
    executeQuery,
    queryDatabase,

    // Get all files
    async getAll(): Promise<FileModel[]> {
      try {
        const result = await queryDatabase('SELECT * FROM files ORDER BY upload_date DESC');
        const files = result.map((row: any) => FileModel.fromJSON(row));
        return files;
      } catch (error) {
        console.error('FileService: Error getting all files:', error);
        throw error;
      }
    },

    // Get file by ID
    async getById(id: number): Promise<FileModel | null> {
      const result = await queryDatabase('SELECT * FROM files WHERE id = ?', [id]);
      return result.length > 0 ? FileModel.fromJSON(result[0]) : null;
    },

    // Get files by application ID
    async getByApplicationId(applicationId: number): Promise<FileModel[]> {
      const result = await queryDatabase('SELECT * FROM files WHERE application_id = ? ORDER BY upload_date DESC', [applicationId]);
      return result.map((row: any) => FileModel.fromJSON(row));
    },

    // Upload a new file
    async uploadFile(file: File, applicationId?: number, description?: string): Promise<FileModel> {
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Get file extension and determine type
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const type = getFileTypeFromExtension(extension);
      
      // Determine MIME type
      const mimeType = file.type || getMimeTypeFromExtension(extension);
      
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO files (
          filename, original_name, file_path, size, mime_type, type,
          description, application_id, data, upload_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        file.name,
        file.name,
        null, // file_path not used when storing in database
        file.size,
        mimeType,
        type,
        description || null,
        applicationId || null,
        Array.from(uint8Array), // Convert to regular array for SQLite
        now,
        now,
        now
      ];
      
      const result = await executeQuery(query, params);
      const createdFile = await fileService.getById(result.lastInsertRowid);
      
      if (!createdFile) {
        throw new Error('Failed to create file');
      }
      
      return createdFile;
    },

    // Delete file
    async deleteFile(id: number): Promise<void> {
      await executeQuery('DELETE FROM files WHERE id = ?', [id]);
    },

    // Download file (get file buffer)
    async downloadFile(id: number): Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }> {
      const result = await queryDatabase('SELECT data, filename, mime_type FROM files WHERE id = ?', [id]);
      
      if (result.length === 0) {
        throw new Error('File not found');
      }
      
      const { data, filename, mime_type } = result[0];
      const uint8Array = new Uint8Array(data);
      
      return {
        buffer: uint8Array.buffer,
        filename,
        mimeType: mime_type
      };
    },

    // Update file description
    async updateFileDescription(id: number, description: string): Promise<void> {
      const now = new Date().toISOString();
      await executeQuery(
        'UPDATE files SET description = ?, updated_at = ? WHERE id = ?',
        [description, now, id]
      );
    }
  };

  return (
    <FileServiceContext.Provider value={fileService}>
      {children}
    </FileServiceContext.Provider>
  );
};
