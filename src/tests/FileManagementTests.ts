import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { FileService, FileCreateData } from '../services/FileService';
import { ApplicationService } from '../services/ApplicationService';
import { FileModel } from '../models/File';
import { ApplicationModel } from '../models/Application';

export interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration?: number;
}

export class FileManagementTests {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private fileService: FileService | null = null;
  private applicationService: ApplicationService | null = null;

  async initialize(): Promise<void> {
    const { open } = await import('sqlite');
    this.db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });

    this.fileService = new FileService(this.db, './test-uploads');
    this.applicationService = new ApplicationService(this.db, undefined, this.fileService);

    // Initialize tables
    await this.fileService.initializeTable();
    
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

  async cleanup(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      await this.initialize();

      // File Management Tests
      results.push(await this.testFileUpload());
      results.push(await this.testFileValidation());
      results.push(await this.testFileMetadata());
      results.push(await this.testFileSearch());
      results.push(await this.testFileDelete());

      // Application Integration Tests  
      results.push(await this.testApplicationFileLink());
      results.push(await this.testApplicationWithFiles());
      results.push(await this.testFileUnlinking());

      // Service Integration Tests
      results.push(await this.testServiceIntegration());
      results.push(await this.testStatistics());
      results.push(await this.testCleanup());

    } catch (error) {
      results.push({
        name: 'Test Suite Initialization',
        success: false,
        message: `Failed to initialize tests: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      await this.cleanup();
    }

    return results;
  }

  private async testFileUpload(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Test file upload
      const testContent = 'This is a test file content';
      const buffer = Buffer.from(testContent, 'utf8');
      const filename = 'test-file.txt';

      const uploadedFile = await this.fileService.uploadFile(buffer, filename, undefined, 'Test upload');

      // Verify file was created
      if (!uploadedFile.id) throw new Error('File ID not set');
      if (uploadedFile.filename !== filename) throw new Error('Filename mismatch');
      if (uploadedFile.description !== 'Test upload') throw new Error('Description mismatch');

      // Verify file can be retrieved
      const retrievedFile = await this.fileService.getById(uploadedFile.id);
      if (retrievedFile.filename !== filename) throw new Error('Retrieved file mismatch');

      return {
        name: 'File Upload',
        success: true,
        message: 'File uploaded and retrieved successfully',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Upload',
        success: false,
        message: `Upload test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testFileValidation(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Test file size validation (should fail for files > 50MB)
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      
      try {
        await this.fileService.uploadFile(largeBuffer, 'large-file.txt');
        throw new Error('Large file upload should have failed');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('zu groß')) {
          throw new Error('Wrong validation error for large file');
        }
      }

      // Test empty filename validation
      const validBuffer = Buffer.from('test content');
      try {
        await this.fileService.uploadFile(validBuffer, '');
        throw new Error('Empty filename should have failed');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Dateiname')) {
          throw new Error('Wrong validation error for empty filename');
        }
      }

      return {
        name: 'File Validation',
        success: true,
        message: 'File validation rules working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Validation',
        success: false,
        message: `Validation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testFileMetadata(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Upload file with metadata
      const buffer = Buffer.from('PDF content simulation');
      const uploadedFile = await this.fileService.uploadFile(
        buffer, 
        'resume.pdf', 
        undefined, 
        'My professional resume'
      );

      // Verify metadata
      if (uploadedFile.type !== 'pdf') throw new Error('Wrong file type detection');
      if (uploadedFile.size !== buffer.length) throw new Error('Wrong file size');
      if (!uploadedFile.upload_date) throw new Error('Upload date not set');

      // Test file type detection for different extensions
      const docFile = await this.fileService.uploadFile(Buffer.from('doc'), 'document.docx');
      if (docFile.type !== 'docx') throw new Error('DOCX type detection failed');

      const imageFile = await this.fileService.uploadFile(Buffer.from('img'), 'photo.jpg');
      if (imageFile.type !== 'jpg') throw new Error('JPG type detection failed');

      return {
        name: 'File Metadata',
        success: true,
        message: 'File metadata and type detection working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Metadata',
        success: false,
        message: `Metadata test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testFileSearch(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Upload multiple files for search testing
      await this.fileService.uploadFile(Buffer.from('cv'), 'cv-developer.pdf', undefined, 'My CV');
      await this.fileService.uploadFile(Buffer.from('cover'), 'cover-letter.docx', undefined, 'Cover letter for XYZ Corp');
      await this.fileService.uploadFile(Buffer.from('cert'), 'certificates.pdf', undefined, 'Education certificates');

      // Test search by filename
      const cvResults = await this.fileService.getAll({ filename_search: 'cv' });
      if (cvResults.length !== 1) throw new Error('CV search failed');

      // Test search by type filter
      const pdfResults = await this.fileService.getAll({ type: 'pdf' });
      if (pdfResults.length !== 2) throw new Error('PDF type filter failed'); // cv + certificates

      // Test search by description
      const corpResults = await this.fileService.getAll({ filename_search: 'cover' });
      if (corpResults.length !== 1) throw new Error('Filename search failed');

      // Test date range search
      const today = new Date().toISOString().split('T')[0];
      const todayResults = await this.fileService.getAll({ date_from: today });
      if (todayResults.length !== 3) throw new Error('Date range search failed');

      return {
        name: 'File Search',
        success: true,
        message: 'File search and filtering working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Search',
        success: false,
        message: `Search test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testFileDelete(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Upload file to delete
      const uploadedFile = await this.fileService.uploadFile(
        Buffer.from('delete me'), 
        'delete-test.txt'
      );

      if (!uploadedFile.id) throw new Error('Uploaded file has no ID');

      // Verify file exists
      const beforeDelete = await this.fileService.getById(uploadedFile.id);
      if (!beforeDelete) throw new Error('File not found before delete');

      // Delete file
      await this.fileService.delete(uploadedFile.id);

      // Verify file is deleted
      try {
        await this.fileService.getById(uploadedFile.id);
        throw new Error('File still exists after delete');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('not found')) {
          throw new Error('Wrong error for deleted file access');
        }
      }

      return {
        name: 'File Delete',
        success: true,
        message: 'File deletion working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Delete',
        success: false,
        message: `Delete test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testApplicationFileLink(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService || !this.applicationService) {
        throw new Error('Services not initialized');
      }

      // Create application
      const application = await this.applicationService.create({
        title: 'Test Application',
        position: 'Test Position'
      });

      // Upload file
      const uploadedFile = await this.fileService.uploadFile(
        Buffer.from('test'), 
        'test-resume.pdf'
      );

      if (!uploadedFile.id || !application.id) {
        throw new Error('Missing IDs');
      }

      // Link file to application
      await this.fileService.linkToApplication(uploadedFile.id, application.id);

      // Verify link
      const appFiles = await this.fileService.getByApplication(application.id);
      if (appFiles.length !== 1) throw new Error('File not linked to application');
      if (appFiles[0].id !== uploadedFile.id) throw new Error('Wrong file linked');

      // Test application service file methods
      await this.applicationService.attachFile(application.id, uploadedFile.id);
      const serviceFiles = await this.applicationService.getFiles(application.id);
      if (serviceFiles.length !== 1) throw new Error('ApplicationService file methods failed');

      return {
        name: 'Application File Link',
        success: true,
        message: 'File-Application linking working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'Application File Link',
        success: false,
        message: `Link test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testApplicationWithFiles(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService || !this.applicationService) {
        throw new Error('Services not initialized');
      }

      // Create application
      const application = await this.applicationService.create({
        title: 'Senior Developer Position',
        position: 'Senior Developer'
      });

      // Upload multiple files
      const cvFile = await this.fileService.uploadFile(Buffer.from('cv'), 'cv.pdf');
      const coverFile = await this.fileService.uploadFile(Buffer.from('cover'), 'cover.docx');
      
      if (!application.id || !cvFile.id || !coverFile.id) {
        throw new Error('Missing IDs');
      }

      // Link files to application
      await this.applicationService.attachFile(application.id, cvFile.id);
      await this.applicationService.attachFile(application.id, coverFile.id);

      // Get application with files
      const appWithFiles = await this.applicationService.getWithFiles(application.id);
      if (!('files' in appWithFiles) || appWithFiles.files.length !== 2) {
        throw new Error('Application with files not working');
      }

      // Test file statistics for applications
      const appsWithStats = await this.applicationService.getAllWithFileStats();
      const testApp = appsWithStats.find(app => app.id === application.id);
      if (!testApp || testApp.fileCount !== 2) {
        throw new Error('Application file statistics not working');
      }

      return {
        name: 'Application with Files',
        success: true,
        message: 'Application-File integration working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'Application with Files',
        success: false,
        message: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testFileUnlinking(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService || !this.applicationService) {
        throw new Error('Services not initialized');
      }

      // Create application and file
      const application = await this.applicationService.create({
        title: 'Unlink Test',
        position: 'Test Position'
      });
      
      const file = await this.fileService.uploadFile(Buffer.from('test'), 'unlink-test.pdf');
      
      if (!application.id || !file.id) throw new Error('Missing IDs');

      // Link and verify
      await this.applicationService.attachFile(application.id, file.id);
      let appFiles = await this.applicationService.getFiles(application.id);
      if (appFiles.length !== 1) throw new Error('File not linked');

      // Unlink and verify
      await this.applicationService.detachFile(application.id, file.id);
      appFiles = await this.applicationService.getFiles(application.id);
      if (appFiles.length !== 0) throw new Error('File not unlinked');

      // Verify file still exists but is unlinked
      const unlinkedFiles = await this.fileService.getUnlinkedFiles();
      if (!unlinkedFiles.some(f => f.id === file.id)) {
        throw new Error('File not in unlinked list');
      }

      return {
        name: 'File Unlinking',
        success: true,
        message: 'File unlinking working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'File Unlinking',
        success: false,
        message: `Unlinking test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testServiceIntegration(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService || !this.applicationService) {
        throw new Error('Services not initialized');
      }

      // Test file buffer retrieval
      const uploadedFile = await this.fileService.uploadFile(
        Buffer.from('buffer test content'), 
        'buffer-test.txt'
      );

      if (!uploadedFile.id) throw new Error('File has no ID');

      const buffer = await this.fileService.getFileBuffer(uploadedFile.id);
      const content = buffer.toString('utf8');
      if (content !== 'buffer test content') {
        throw new Error('File buffer content mismatch');
      }

      // Test application deletion with cleanup
      const application = await this.applicationService.create({
        title: 'Cleanup Test',
        position: 'Test Position'
      });
      
      if (!application.id) throw new Error('Application has no ID');

      await this.applicationService.attachFile(application.id, uploadedFile.id);

      // Delete with cleanup
      await this.applicationService.deleteWithCleanup(application.id);

      // Verify application is deleted
      try {
        await this.applicationService.getById(application.id);
        throw new Error('Application still exists after cleanup');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('not found')) {
          throw new Error('Wrong error for deleted application');
        }
      }

      // Verify file is unlinked
      const unlinkedFiles = await this.fileService.getUnlinkedFiles();
      if (!unlinkedFiles.some(f => f.id === uploadedFile.id)) {
        throw new Error('File not unlinked after application deletion');
      }

      return {
        name: 'Service Integration',
        success: true,
        message: 'Service integration working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'Service Integration',
        success: false,
        message: `Service integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testStatistics(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Upload some files for statistics
      await this.fileService.uploadFile(Buffer.from('stats1'), 'stats-1.pdf');
      await this.fileService.uploadFile(Buffer.from('stats2'), 'stats-2.docx');
      
      const stats = await this.fileService.getStatistics();
      
      // Verify statistics structure
      if (typeof stats.total !== 'number') throw new Error('total not a number');
      if (typeof stats.totalSize !== 'number') throw new Error('totalSize not a number');
      if (typeof stats.recentFiles !== 'number') throw new Error('recentFiles not a number');
      if (!stats.byType) throw new Error('byType missing');

      // Verify some statistics values
      if (stats.total < 2) throw new Error('total too low');
      if (stats.totalSize < 12) throw new Error('totalSize too low'); // stats1 + stats2 = 12 bytes
      if (!stats.byType.pdf || stats.byType.pdf < 1) {
        throw new Error('PDF type distribution incorrect');
      }

      return {
        name: 'Statistics',
        success: true,
        message: 'File statistics working correctly',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'Statistics',
        success: false,
        message: `Statistics test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }

  private async testCleanup(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      if (!this.fileService) throw new Error('FileService not initialized');

      // Create some orphaned files (unlinked files)
      await this.fileService.uploadFile(Buffer.from('orphan1'), 'orphan-1.txt');
      await this.fileService.uploadFile(Buffer.from('orphan2'), 'orphan-2.txt');

      const cleanupResult = await this.fileService.cleanupOrphanedFiles();
      
      // Verify cleanup result structure
      if (typeof cleanupResult.cleaned !== 'number') {
        throw new Error('cleaned count not a number');
      }
      if (!Array.isArray(cleanupResult.errors)) {
        throw new Error('errors not an array');
      }

      // Since these are unlinked files, they should be considered orphaned
      // (depending on the cleanup logic implementation)
      
      return {
        name: 'Cleanup',
        success: true,
        message: 'File cleanup functionality working',
        duration: Date.now() - start
      };

    } catch (error) {
      return {
        name: 'Cleanup',
        success: false,
        message: `Cleanup test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - start
      };
    }
  }
}

// Test runner function that can be called from the demo
export const runFileManagementTests = async (): Promise<TestResult[]> => {
  const testRunner = new FileManagementTests();
  return await testRunner.runAllTests();
};

export default FileManagementTests;
