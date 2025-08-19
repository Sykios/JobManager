import React, { useState, useEffect } from 'react';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { FileService } from '../services/FileService';
import { ApplicationService } from '../services/ApplicationService';
import { ApplicationModel } from '../models/Application';
import { FileModel } from '../models/File';
import { FileUpload } from '../renderer/components/files/FileUpload';
import { FileList } from '../renderer/components/files/FileList';
import { FileCard } from '../renderer/components/files/FileCard';
import { ApplicationDetail } from './ApplicationDetail';
import { runFileManagementTests, TestResult } from '../tests/FileManagementTests';

interface DemoState {
  db: Database<sqlite3.Database, sqlite3.Statement> | null;
  fileService: FileService | null;
  applicationService: ApplicationService | null;
  applications: ApplicationModel[];
  files: FileModel[];
  selectedApplication: ApplicationModel | null;
  loading: boolean;
  error: string | null;
}

export const FileManagementDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    db: null,
    fileService: null,
    applicationService: null,
    applications: [],
    files: [],
    selectedApplication: null,
    loading: true,
    error: null
  });

  const [activeView, setActiveView] = useState<'overview' | 'upload' | 'files' | 'application' | 'detail' | 'tests'>('overview');
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testsRunning, setTestsRunning] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    applicationCount: 0,
    recentFiles: 0
  });

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Initialize in-memory SQLite database for demo
      const { open } = await import('sqlite');
      const database = await open({
        filename: ':memory:',
        driver: sqlite3.Database
      });

      // Initialize services
      const fileService = new FileService(database, './demo-uploads');
      const applicationService = new ApplicationService(database, undefined, fileService);

      // Initialize tables
      await fileService.initializeTable();
      
      // Create applications table
      await database.exec(`
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

      // Create demo data
      await createDemoData(applicationService, fileService);

      // Load initial data
      const apps = await applicationService.getAll();
      const allFiles = await fileService.getAll();
      const statistics = await fileService.getStatistics();

      setState(prev => ({
        ...prev,
        db: database,
        fileService,
        applicationService,
        applications: apps,
        files: allFiles,
        loading: false
      }));

      setStats({
        totalFiles: statistics.total,
        totalSize: statistics.totalSize,
        applicationCount: apps.length,
        recentFiles: statistics.recentFiles
      });

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Initialisieren der Demo',
        loading: false
      }));
    }
  };

  const createDemoData = async (applicationService: ApplicationService, fileService: FileService) => {
    // Create sample applications
    const sampleApps = [
      {
        title: 'Frontend Developer - TechCorp',
        position: 'Senior Frontend Developer',
        location: 'Berlin',
        work_type: 'full-time' as const,
        priority: 4 as const,
        status: 'applied' as const,
        salary_range: '60.000€ - 80.000€',
        notes: 'Interessante Position mit modernen Technologien (React, TypeScript)',
        application_date: '2024-01-15'
      },
      {
        title: 'Full Stack Developer - StartupXYZ',
        position: 'Full Stack Developer',
        location: 'München',
        work_type: 'full-time' as const,
        priority: 3 as const,
        status: 'in-review' as const,
        remote_possible: true,
        salary_range: '55.000€ - 70.000€',
        notes: 'Startup-Umgebung, viel Verantwortung und Gestaltungsfreiraum',
        application_date: '2024-01-20'
      },
      {
        title: 'React Developer - Enterprise Corp',
        position: 'React Developer',
        location: 'Hamburg',
        work_type: 'part-time' as const,
        priority: 2 as const,
        status: 'draft' as const,
        salary_range: '45.000€ - 55.000€',
        notes: 'Flexible Arbeitszeiten, etabliertes Unternehmen'
      }
    ];

    for (const appData of sampleApps) {
      await applicationService.create(appData);
    }

    // Create sample files (using demo content)
    const sampleFiles = [
      {
        filename: 'Lebenslauf_Max_Mustermann.pdf',
        content: 'Demo PDF Lebenslauf Inhalt',
        type: 'pdf' as const,
        description: 'Aktueller Lebenslauf'
      },
      {
        filename: 'Anschreiben_TechCorp.docx',
        content: 'Demo Word Anschreiben Inhalt',
        type: 'docx' as const,
        description: 'Individuelles Anschreiben für TechCorp'
      },
      {
        filename: 'Zeugnisse.pdf',
        content: 'Demo PDF Zeugnis Inhalt',
        type: 'pdf' as const,
        description: 'Sammlung aller Arbeitszeugnisse'
      },
      {
        filename: 'Portfolio.pdf',
        content: 'Demo PDF Portfolio Inhalt',
        type: 'pdf' as const,
        description: 'Übersicht über bisherige Projekte'
      }
    ];

    for (let i = 0; i < sampleFiles.length; i++) {
      const fileData = sampleFiles[i];
      const buffer = Buffer.from(fileData.content, 'utf8');
      
      const uploadedFile = await fileService.uploadFile(
        buffer,
        fileData.filename,
        undefined,
        fileData.description
      );

      // Attach some files to applications
      if (i < 2) {
        await fileService.linkToApplication(uploadedFile.id!, 1); // First application
      }
    }
  };

  const handleFileUpload = async (files: File[], description?: string) => {
    try {
      const { fileService } = state;
      if (!fileService) return;

      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await fileService.uploadFile(buffer, file.name, undefined, description);
      }

      // Refresh data
      const allFiles = await fileService.getAll();
      const statistics = await fileService.getStatistics();
      
      setState(prev => ({ ...prev, files: allFiles }));
      setStats(prevStats => ({
        ...prevStats,
        totalFiles: statistics.total,
        totalSize: statistics.totalSize,
        recentFiles: statistics.recentFiles
      }));

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Hochladen'
      }));
    }
  };

  const handleFileDownload = async (file: FileModel) => {
    try {
      const { fileService } = state;
      if (!fileService || !file.id) return;

      const buffer = await fileService.getFileBuffer(file.id);
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(buffer);
      
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Herunterladen'
      }));
    }
  };

  const handleFileDelete = async (file: FileModel) => {
    try {
      const { fileService } = state;
      if (!fileService || !file.id) return;

      await fileService.delete(file.id);

      // Refresh data
      const allFiles = await fileService.getAll();
      const statistics = await fileService.getStatistics();
      
      setState(prev => ({ ...prev, files: allFiles }));
      setStats(prevStats => ({
        ...prevStats,
        totalFiles: statistics.total,
        totalSize: statistics.totalSize,
        recentFiles: statistics.recentFiles
      }));

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Löschen'
      }));
    }
  };

  const handleApplicationSave = async (application: ApplicationModel) => {
    try {
      const { applicationService } = state;
      if (!applicationService) return;

      // Refresh applications
      const apps = await applicationService.getAll();
      setState(prev => ({ 
        ...prev, 
        applications: apps,
        selectedApplication: application
      }));
      
      setStats(prevStats => ({
        ...prevStats,
        applicationCount: apps.length
      }));

      setIsCreatingApplication(false);
      setActiveView('detail');

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Speichern der Bewerbung'
      }));
    }
  };

  const runTests = async () => {
    try {
      setTestsRunning(true);
      setTestResults(null);
      
      const results = await runFileManagementTests();
      setTestResults(results);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Fehler beim Ausführen der Tests'
      }));
    } finally {
      setTestsRunning(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const { loading, error, fileService, applicationService, applications, files, selectedApplication } = state;

  if (loading) {
    return (
      <div className="demo-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Demo wird initialisiert...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="demo-error">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Demo-Fehler</h3>
          <p>{error}</p>
          <button onClick={initializeServices} className="retry-btn">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-management-demo">
      {/* Header */}
      <div className="demo-header">
        <h1>🗂️ File Management System - Demo</h1>
        <p>Vollständige Demonstration des Dateiverwaltungssystems für Job-Bewerbungen</p>
        
        {/* Statistics */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{stats.totalFiles}</div>
            <div className="stat-label">Dateien</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{formatFileSize(stats.totalSize)}</div>
            <div className="stat-label">Gesamtgröße</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.applicationCount}</div>
            <div className="stat-label">Bewerbungen</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.recentFiles}</div>
            <div className="stat-label">Neue Dateien</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="demo-nav">
        <button
          className={`nav-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Übersicht
        </button>
        <button
          className={`nav-btn ${activeView === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveView('upload')}
        >
          📤 Upload testen
        </button>
        <button
          className={`nav-btn ${activeView === 'files' ? 'active' : ''}`}
          onClick={() => setActiveView('files')}
        >
          📋 Alle Dateien
        </button>
        <button
          className={`nav-btn ${activeView === 'application' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('application');
            setIsCreatingApplication(true);
            setState(prev => ({ ...prev, selectedApplication: null }));
          }}
        >
          ➕ Neue Bewerbung
        </button>
        <button
          className={`nav-btn ${activeView === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveView('tests')}
        >
          🧪 Tests ausführen
        </button>
      </div>

      {/* Content */}
      <div className="demo-content">
        {activeView === 'overview' && (
          <div className="overview-section">
            <h2>System-Übersicht</h2>
            
            <div className="feature-grid">
              <div className="feature-card">
                <h3>🗂️ Dateiverwaltung</h3>
                <p>Vollständiges CRUD-System für Dateien mit Metadaten, Validierung und Typ-Erkennung.</p>
                <ul>
                  <li>Drag & Drop Upload</li>
                  <li>Automatische Typ-Erkennung</li>
                  <li>Größenlimits (50MB)</li>
                  <li>Beschreibungen und Tags</li>
                </ul>
              </div>
              
              <div className="feature-card">
                <h3>📊 Bewerbungsintegration</h3>
                <p>Nahtlose Integration von Dateien in den Bewerbungsprozess.</p>
                <ul>
                  <li>Dateien zu Bewerbungen verknüpfen</li>
                  <li>Übersicht aller angehängten Dateien</li>
                  <li>Status-Verfolgung</li>
                  <li>Automatische Bereinigung</li>
                </ul>
              </div>
              
              <div className="feature-card">
                <h3>🔍 Suche & Filter</h3>
                <p>Erweiterte Such- und Filterfunktionen für alle Dateien.</p>
                <ul>
                  <li>Textsuche in Dateinamen</li>
                  <li>Filter nach Dateityp</li>
                  <li>Sortierung nach verschiedenen Kriterien</li>
                  <li>Schnellfilter für häufige Anfragen</li>
                </ul>
              </div>
            </div>

            <h3>Demo-Bewerbungen</h3>
            <div className="applications-grid">
              {applications.map(app => (
                <div key={app.id} className="app-preview-card">
                  <h4>{app.title}</h4>
                  <p><strong>Position:</strong> {app.position}</p>
                  <p><strong>Status:</strong> {app.status}</p>
                  <p><strong>Standort:</strong> {app.location}</p>
                  <button
                    onClick={() => {
                      setState(prev => ({ ...prev, selectedApplication: app }));
                      setActiveView('detail');
                    }}
                    className="view-btn"
                  >
                    Details ansehen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'upload' && fileService && (
          <div className="upload-section">
            <h2>📤 Datei-Upload testen</h2>
            <p>Testen Sie das Drag & Drop Upload-System mit verschiedenen Dateitypen.</p>
            
            <FileUpload
              onFileUpload={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              maxFiles={10}
              maxSizeBytes={50 * 1024 * 1024}
            />

            <div className="upload-info">
              <h3>Unterstützte Formate</h3>
              <div className="format-list">
                <span className="format-tag">📄 PDF</span>
                <span className="format-tag">📝 DOC/DOCX</span>
                <span className="format-tag">📋 TXT</span>
                <span className="format-tag">🖼️ JPG/PNG</span>
              </div>
              
              <div className="upload-tips">
                <h4>💡 Test-Tipps</h4>
                <ul>
                  <li>Ziehen Sie Dateien direkt in den Upload-Bereich</li>
                  <li>Testen Sie verschiedene Dateiformate</li>
                  <li>Probieren Sie mehrere Dateien gleichzeitig</li>
                  <li>Fügen Sie Beschreibungen zu Ihren Dateien hinzu</li>
                  <li>Beobachten Sie die Fortschrittsanzeige</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeView === 'files' && (
          <div className="files-section">
            <h2>📋 Alle Dateien</h2>
            <p>Übersicht und Verwaltung aller hochgeladenen Dateien.</p>
            
            <FileList
              files={files}
              onDownload={handleFileDownload}
              onDelete={handleFileDelete}
              emptyMessage="Noch keine Dateien hochgeladen. Wechseln Sie zum Upload-Tab!"
              showFilters={true}
            />
          </div>
        )}

        {activeView === 'application' && fileService && applicationService && (
          <div className="application-section">
            <h2>{isCreatingApplication ? '➕ Neue Bewerbung erstellen' : '✏️ Bewerbung bearbeiten'}</h2>
            
            <div className="demo-placeholder">
              <p>ApplicationForm demo is disabled - use the main application instead</p>
              <button onClick={() => setActiveView('overview')} className="btn-secondary">
                Zurück zur Übersicht
              </button>
            </div>
          </div>
        )}

        {activeView === 'detail' && selectedApplication && fileService && applicationService && (
          <div className="detail-section">
            <ApplicationDetail
              applicationId={selectedApplication.id}
              applicationService={applicationService}
              fileService={fileService}
              onEdit={(app) => {
                setState(prev => ({ ...prev, selectedApplication: app }));
                setIsCreatingApplication(false);
                setActiveView('application');
              }}
            />
          </div>
        )}

        {activeView === 'tests' && (
          <div className="tests-section">
            <h2>🧪 Automatisierte Tests</h2>
            <p>Vollständige Tests aller File Management Funktionen.</p>
            
            <div className="test-controls">
              <button
                onClick={runTests}
                disabled={testsRunning}
                className="run-tests-btn"
              >
                {testsRunning ? '⏳ Tests laufen...' : '▶️ Tests starten'}
              </button>
            </div>

            {testResults && (
              <div className="test-results">
                <h3>Test-Ergebnisse</h3>
                <div className="results-summary">
                  <div className="summary-stat">
                    <span className="stat-number">{testResults.length}</span>
                    <span className="stat-label">Tests durchgeführt</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-number success">{testResults.filter(r => r.success).length}</span>
                    <span className="stat-label">Erfolgreich</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-number error">{testResults.filter(r => !r.success).length}</span>
                    <span className="stat-label">Fehlgeschlagen</span>
                  </div>
                </div>

                <div className="test-list">
                  {testResults.map((result, index) => (
                    <div key={index} className={`test-result ${result.success ? 'success' : 'error'}`}>
                      <div className="test-header">
                        <span className="test-icon">
                          {result.success ? '✅' : '❌'}
                        </span>
                        <span className="test-name">{result.name}</span>
                        {result.duration && (
                          <span className="test-duration">{result.duration}ms</span>
                        )}
                      </div>
                      <div className="test-message">{result.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Testing Panel */}
      <div className="testing-panel">
        <h3>🧪 Testing-Funktionen</h3>
        <div className="test-buttons">
          <button
            onClick={() => setActiveView('tests')}
            className="test-btn"
          >
            🧪 Vollständige Tests
          </button>
          
          <button
            onClick={async () => {
              if (!fileService) return;
              const stats = await fileService.getStatistics();
              alert(`Dateistatistiken:\n- Dateien: ${stats.total}\n- Größe: ${formatFileSize(stats.totalSize)}\n- Neueste: ${stats.recentFiles}`);
            }}
            className="test-btn"
          >
            📊 Statistiken anzeigen
          </button>
          
          <button
            onClick={async () => {
              if (!fileService) return;
              const unlinked = await fileService.getUnlinkedFiles();
              alert(`${unlinked.length} unverknüpfte Dateien gefunden`);
            }}
            className="test-btn"
          >
            🔗 Unverknüpfte Dateien
          </button>
          
          <button
            onClick={() => {
              const testFile = new File(['Test Inhalt'], 'test-datei.txt', { type: 'text/plain' });
              handleFileUpload([testFile], 'Automatisch generierte Test-Datei');
            }}
            className="test-btn"
          >
            🤖 Test-Datei erstellen
          </button>
          
          <button
            onClick={initializeServices}
            className="test-btn"
          >
            🔄 Demo zurücksetzen
          </button>
        </div>
      </div>

      <style>{`
        .file-management-demo {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .demo-header h1 {
          margin: 0 0 12px 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .demo-header p {
          margin: 0 0 24px 0;
          font-size: 1.125rem;
          opacity: 0.9;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.2);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .demo-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .nav-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 140px;
        }

        .nav-btn:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }

        .nav-btn.active {
          background: #3b82f6;
          color: white;
        }

        .demo-content {
          min-height: 600px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 32px;
          margin-bottom: 24px;
        }

        .overview-section h2 {
          margin: 0 0 24px 0;
          font-size: 1.875rem;
          color: #1f2937;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .feature-card {
          padding: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
        }

        .feature-card h3 {
          margin: 0 0 12px 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .feature-card p {
          margin: 0 0 16px 0;
          color: #6b7280;
          line-height: 1.6;
        }

        .feature-card ul {
          margin: 0;
          padding-left: 16px;
          color: #374151;
        }

        .feature-card li {
          margin-bottom: 4px;
        }

        .applications-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .app-preview-card {
          padding: 20px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
        }

        .app-preview-card h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 1.125rem;
        }

        .app-preview-card p {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .view-btn {
          margin-top: 12px;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .view-btn:hover {
          background: #2563eb;
        }

        .upload-section h2,
        .files-section h2,
        .application-section h2 {
          margin: 0 0 12px 0;
          font-size: 1.875rem;
          color: #1f2937;
        }

        .upload-section p,
        .files-section p {
          margin: 0 0 24px 0;
          color: #6b7280;
        }

        .upload-info {
          margin-top: 32px;
        }

        .upload-info h3,
        .upload-info h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }

        .format-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .format-tag {
          padding: 6px 12px;
          background: #f3f4f6;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #374151;
        }

        .upload-tips ul {
          color: #6b7280;
          line-height: 1.6;
        }

        .testing-panel {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }

        .testing-panel h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .test-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .test-btn {
          padding: 10px 16px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .test-btn:hover {
          background: #4b5563;
        }

        .tests-section h2 {
          margin: 0 0 12px 0;
          font-size: 1.875rem;
          color: #1f2937;
        }

        .tests-section p {
          margin: 0 0 24px 0;
          color: #6b7280;
        }

        .test-controls {
          margin-bottom: 32px;
        }

        .run-tests-btn {
          padding: 12px 24px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .run-tests-btn:hover:not(:disabled) {
          background: #047857;
        }

        .run-tests-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .test-results {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }

        .test-results h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .results-summary {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .summary-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .summary-stat .stat-number {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .summary-stat .stat-number.success {
          color: #059669;
        }

        .summary-stat .stat-number.error {
          color: #dc2626;
        }

        .summary-stat .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .test-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .test-result {
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: white;
        }

        .test-result.success {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .test-result.error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .test-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .test-icon {
          font-size: 1.125rem;
        }

        .test-name {
          font-weight: 600;
          color: #1f2937;
          flex: 1;
        }

        .test-duration {
          font-size: 0.75rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .test-message {
          font-size: 0.875rem;
          line-height: 1.5;
          margin-left: 30px;
        }

        .test-result.success .test-message {
          color: #065f46;
        }

        .test-result.error .test-message {
          color: #991b1b;
        }

        .demo-loading,
        .demo-error {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          padding: 24px;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-left: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-spinner p {
          color: #6b7280;
          margin: 0;
        }

        .error-message {
          text-align: center;
          color: #dc2626;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .error-message h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
        }

        .error-message p {
          margin: 0 0 16px 0;
          color: #6b7280;
        }

        .retry-btn {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .retry-btn:hover {
          background: #2563eb;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .file-management-demo {
            padding: 16px;
          }

          .demo-header {
            padding: 24px 16px;
          }

          .demo-header h1 {
            font-size: 1.875rem;
          }

          .demo-nav {
            flex-direction: column;
          }

          .nav-btn {
            min-width: auto;
          }

          .demo-content {
            padding: 20px;
          }

          .feature-grid,
          .applications-grid {
            grid-template-columns: 1fr;
          }

          .test-buttons {
            flex-direction: column;
          }

          .test-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default FileManagementDemo;
