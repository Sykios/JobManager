import React, { useState, useEffect } from 'react';
import { ApplicationModel } from '../models/Application';
import { ApplicationService } from '../services/ApplicationService';
import { FileModel } from '../models/File';
import { FileService } from '../services/FileService';
import { FileList } from './FileList';
import { ApplicationStatus, WorkType, Priority } from '../types';

interface ApplicationDetailProps {
  applicationId: number;
  applicationService: ApplicationService;
  fileService: FileService;
  onEdit?: (application: ApplicationModel) => void;
  onDelete?: (application: ApplicationModel) => void;
  onStatusChange?: (application: ApplicationModel, newStatus: ApplicationStatus) => void;
  className?: string;
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({
  applicationId,
  applicationService,
  fileService,
  onEdit,
  onDelete,
  onStatusChange,
  className = ''
}) => {
  const [application, setApplication] = useState<ApplicationModel | null>(null);
  const [files, setFiles] = useState<FileModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const app = await applicationService.getById(applicationId);
      const appFiles = await applicationService.getFiles(applicationId);
      
      setApplication(app);
      setFiles(appFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Bewerbung');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (!application) return;
    
    try {
      setUpdating(true);
      const updatedApp = await applicationService.updateStatus(applicationId, newStatus);
      setApplication(updatedApp);
      onStatusChange?.(updatedApp, newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Status');
    } finally {
      setUpdating(false);
    }
  };

  const handleFileDownload = async (file: FileModel) => {
    try {
      if (file.id) {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Herunterladen der Datei');
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getStatusLabel = (status: ApplicationStatus): string => {
    const labels: Record<ApplicationStatus, string> = {
      draft: 'Entwurf',
      applied: 'Beworben',
      'in-review': 'In Prüfung',
      interview: 'Vorstellungsgespräch',
      offer: 'Angebot erhalten',
      rejected: 'Abgelehnt',
      withdrawn: 'Zurückgezogen'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: ApplicationStatus): string => {
    const colors: Record<ApplicationStatus, string> = {
      draft: '#6b7280',
      applied: '#3b82f6',
      'in-review': '#f59e0b',
      interview: '#8b5cf6',
      offer: '#10b981',
      rejected: '#ef4444',
      withdrawn: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityLabel = (priority: Priority): string => {
    const labels: Record<Priority, string> = {
      1: 'Sehr niedrig',
      2: 'Niedrig', 
      3: 'Normal',
      4: 'Hoch',
      5: 'Sehr hoch'
    };
    return labels[priority];
  };

  const getWorkTypeLabel = (workType?: WorkType): string => {
    if (!workType) return '-';
    const labels: Record<WorkType, string> = {
      'full-time': 'Vollzeit',
      'part-time': 'Teilzeit',
      'freelance': 'Freelance',
      'contract': 'Vertrag',
      'internship': 'Praktikum'
    };
    return labels[workType] || workType;
  };

  if (loading) {
    return (
      <div className={`application-detail loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Bewerbung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className={`application-detail error ${className}`}>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Fehler</h3>
          <p>{error || 'Bewerbung nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`application-detail ${className}`}>
      {/* Header */}
      <div className="detail-header">
        <div className="header-info">
          <h1>{application.title}</h1>
          <div className="position">{application.position}</div>
          <div className="status-badge" style={{ backgroundColor: getStatusColor(application.status) }}>
            {getStatusLabel(application.status)}
          </div>
        </div>
        
        <div className="header-actions">
          {onEdit && (
            <button onClick={() => onEdit(application)} className="btn-secondary">
              Bearbeiten
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(application)} className="btn-danger">
              Löschen
            </button>
          )}
        </div>
      </div>

      {/* Status Update */}
      <div className="status-section">
        <h3>Status aktualisieren</h3>
        <div className="status-buttons">
          <button
            onClick={() => handleStatusUpdate('draft')}
            disabled={updating || application.status === 'draft'}
            className={`status-btn ${application.status === 'draft' ? 'active' : ''}`}
          >
            Entwurf
          </button>
          <button
            onClick={() => handleStatusUpdate('applied')}
            disabled={updating || application.status === 'applied'}
            className={`status-btn ${application.status === 'applied' ? 'active' : ''}`}
          >
            Beworben
          </button>
          <button
            onClick={() => handleStatusUpdate('in-review')}
            disabled={updating || application.status === 'in-review'}
            className={`status-btn ${application.status === 'in-review' ? 'active' : ''}`}
          >
            In Prüfung
          </button>
          <button
            onClick={() => handleStatusUpdate('interview')}
            disabled={updating || application.status === 'interview'}
            className={`status-btn ${application.status === 'interview' ? 'active' : ''}`}
          >
            Interview
          </button>
          <button
            onClick={() => handleStatusUpdate('offer')}
            disabled={updating || application.status === 'offer'}
            className={`status-btn ${application.status === 'offer' ? 'active' : ''}`}
          >
            Angebot
          </button>
          <button
            onClick={() => handleStatusUpdate('rejected')}
            disabled={updating || application.status === 'rejected'}
            className={`status-btn ${application.status === 'rejected' ? 'active' : ''}`}
          >
            Abgelehnt
          </button>
          <button
            onClick={() => handleStatusUpdate('withdrawn')}
            disabled={updating || application.status === 'withdrawn'}
            className={`status-btn ${application.status === 'withdrawn' ? 'active' : ''}`}
          >
            Zurückgezogen
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="info-section">
        <h3>Grundlegende Informationen</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Position</label>
            <span>{application.position}</span>
          </div>
          <div className="info-item">
            <label>Arbeitstyp</label>
            <span>{getWorkTypeLabel(application.work_type)}</span>
          </div>
          <div className="info-item">
            <label>Standort</label>
            <span>{application.location || '-'}</span>
          </div>
          <div className="info-item">
            <label>Remote möglich</label>
            <span>{application.remote_possible ? 'Ja' : 'Nein'}</span>
          </div>
          <div className="info-item">
            <label>Priorität</label>
            <span>{getPriorityLabel(application.priority)}</span>
          </div>
          <div className="info-item">
            <label>Gehaltsbereich</label>
            <span>{application.salary_range || '-'}</span>
          </div>
          <div className="info-item">
            <label>Bewerbungskanal</label>
            <span>{application.application_channel || '-'}</span>
          </div>
          {application.job_url && (
            <div className="info-item">
              <label>Stellenausschreibung</label>
              <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                Link zur Stelle
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="info-section">
        <h3>Termine</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Bewerbungsdatum</label>
            <span>{formatDate(application.application_date)}</span>
          </div>
          <div className="info-item">
            <label>Bewerbungsfrist</label>
            <span>{formatDate(application.deadline)}</span>
          </div>
          <div className="info-item">
            <label>Follow-up Datum</label>
            <span>{formatDate(application.follow_up_date)}</span>
          </div>
          <div className="info-item">
            <label>Erstellt am</label>
            <span>{formatDate(application.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Text Content */}
      {(application.notes || application.requirements || application.benefits || application.cover_letter) && (
        <div className="content-section">
          <h3>Zusätzliche Informationen</h3>
          
          {application.notes && (
            <div className="text-content">
              <h4>Notizen</h4>
              <div className="content-text">{application.notes}</div>
            </div>
          )}
          
          {application.requirements && (
            <div className="text-content">
              <h4>Anforderungen</h4>
              <div className="content-text">{application.requirements}</div>
            </div>
          )}
          
          {application.benefits && (
            <div className="text-content">
              <h4>Vorteile</h4>
              <div className="content-text">{application.benefits}</div>
            </div>
          )}
          
          {application.cover_letter && (
            <div className="text-content">
              <h4>Anschreiben</h4>
              <div className="content-text cover-letter">{application.cover_letter}</div>
            </div>
          )}
        </div>
      )}

      {/* Files Section */}
      <div className="files-section">
        <h3>Angehängte Dateien ({files.length})</h3>
        <FileList
          files={files}
          onDownload={handleFileDownload}
          emptyMessage="Keine Dateien angehängt"
          showFilters={files.length > 3}
          showActions={false}
          compact={true}
        />
      </div>

      <style>{`
        .application-detail {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .application-detail.loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
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

        .application-detail.error {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
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
          margin: 0;
          color: #6b7280;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #f3f4f6;
        }

        .header-info h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .position {
          font-size: 1.25rem;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-secondary,
        .btn-danger {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
          border-color: #9ca3af;
        }

        .btn-danger {
          background-color: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background-color: #dc2626;
        }

        .status-section,
        .info-section,
        .content-section,
        .files-section {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f3f4f6;
        }

        .status-section:last-child,
        .info-section:last-child,
        .content-section:last-child,
        .files-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .status-section h3,
        .info-section h3,
        .content-section h3,
        .files-section h3 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
        }

        .status-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .status-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-btn:hover:not(:disabled) {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .status-btn.active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .status-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
        }

        .info-item span,
        .info-item a {
          font-size: 0.875rem;
          color: #1f2937;
        }

        .info-item a {
          color: #3b82f6;
          text-decoration: none;
        }

        .info-item a:hover {
          text-decoration: underline;
        }

        .text-content {
          margin-bottom: 24px;
        }

        .text-content:last-child {
          margin-bottom: 0;
        }

        .text-content h4 {
          margin: 0 0 8px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .content-text {
          padding: 16px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
        }

        .content-text.cover-letter {
          font-family: 'Georgia', serif;
          line-height: 1.8;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .application-detail {
            padding: 16px;
            margin: 16px;
          }

          .detail-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .header-actions {
            justify-content: stretch;
            flex-direction: column;
          }

          .btn-secondary,
          .btn-danger {
            width: 100%;
            text-align: center;
          }

          .status-buttons {
            flex-direction: column;
          }

          .status-btn {
            width: 100%;
            text-align: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .header-info h1 {
            font-size: 1.5rem;
          }

          .position {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ApplicationDetail;
