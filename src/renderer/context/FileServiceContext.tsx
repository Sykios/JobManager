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
        const result = await queryDatabase('SELECT * FROM files ORDER BY upload_date DESC', []);
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
      // Get file extension and determine type
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const type = getFileTypeFromExtension(extension);
      
      // Determine MIME type
      const mimeType = file.type || getMimeTypeFromExtension(extension);
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload file using the main process API
      const uploadResult = await window.electronAPI.uploadFile({
        data: arrayBuffer,
        filename: file.name,
        applicationId: applicationId || 0, // Use 0 for no application (will be treated as null)
        fileType: type,
        description: description
      });
      
      if (!uploadResult.success) {
        throw new Error('File upload failed');
      }
      
      // Insert metadata into database
      const now = new Date().toISOString();
      const query = `
        INSERT INTO files (
          filename, original_name, file_path, size, mime_type, type,
          description, application_id, upload_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        uploadResult.filename, // unique filename
        uploadResult.originalName, // original filename
        uploadResult.filePath, // path on disk
        uploadResult.size,
        mimeType,
        type,
        description || null,
        applicationId || null,
        now,
        now,
        now
      ];
      
      const result = await executeQuery(query, params);
      const createdFile = await fileService.getById(result.lastInsertRowid);
      
      if (!createdFile) {
        throw new Error('Failed to create file record');
      }
      
      return createdFile;
    },

    // Delete file
    async deleteFile(id: number): Promise<void> {
      // First get the file to get the file_path
      const file = await fileService.getById(id);
      if (!file) return;
      
      // Delete from database
      await executeQuery('DELETE FROM files WHERE id = ?', [id]);
      
      // Delete file from disk
      if (file.file_path) {
        try {
          await window.electronAPI.deleteFile(file.file_path);
        } catch (error) {
          console.warn('Failed to delete file from disk:', error);
        }
      }
    },

    // Download file (get file buffer)
    async downloadFile(id: number): Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }> {
      const result = await queryDatabase('SELECT data, file_path, original_name, filename, mime_type FROM files WHERE id = ?', [id]);
      
      if (result.length === 0) {
        throw new Error('File not found');
      }
      
      const { data, file_path, original_name, filename, mime_type } = result[0];
      let buffer: ArrayBuffer;
      
      if (data) {
        // File stored in database (legacy)
        const uint8Array = new Uint8Array(data);
        buffer = uint8Array.buffer;
      } else if (file_path) {
        // File stored on disk
        const fileBuffer = await window.electronAPI.readFile(file_path);
        buffer = new Uint8Array(fileBuffer).buffer;
      } else {
        throw new Error('File data not found');
      }
      
      return {
        buffer,
        filename: original_name || filename,
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
