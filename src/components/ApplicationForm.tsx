import React, { useState, useEffect } from 'react';
import { ApplicationModel } from '../models/Application';
import { ApplicationService, ApplicationCreateData, ApplicationUpdateData } from '../services/ApplicationService';
import { FileModel } from '../models/File';
import { FileService } from '../services/FileService';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { WorkType, Priority, ApplicationStatus } from '../types';

interface ApplicationFormProps {
  application?: ApplicationModel;
  applicationService: ApplicationService;
  fileService: FileService;
  onSave?: (application: ApplicationModel) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  application,
  applicationService,
  fileService,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ApplicationCreateData>({
    title: application?.title || '',
    position: application?.position || '',
    company_id: application?.company_id,
    contact_id: application?.contact_id,
    job_url: application?.job_url || '',
    application_channel: application?.application_channel || '',
    salary_range: application?.salary_range || '',
    work_type: application?.work_type || 'full-time',
    location: application?.location || '',
    remote_possible: application?.remote_possible || false,
    priority: application?.priority || 3,
    application_date: application?.application_date || '',
    deadline: application?.deadline || '',
    follow_up_date: application?.follow_up_date || '',
    notes: application?.notes || '',
    cover_letter: application?.cover_letter || '',
    requirements: application?.requirements || '',
    benefits: application?.benefits || '',
  });

  const [files, setFiles] = useState<FileModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);

  useEffect(() => {
    if (isEditing && application?.id) {
      loadFiles();
    }
  }, [isEditing, application?.id]);

  const loadFiles = async () => {
    if (!application?.id) return;
    
    try {
      const applicationFiles = await applicationService.getFiles(application.id);
      setFiles(applicationFiles);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let savedApplication: ApplicationModel;

      if (isEditing && application?.id) {
        // Update existing application
        const updateData: ApplicationUpdateData = { ...formData };
        savedApplication = await applicationService.update(application.id, updateData);
      } else {
        // Create new application
        savedApplication = await applicationService.create(formData);
      }

      onSave?.(savedApplication);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[], description?: string) => {
    if (!application?.id && !isEditing) {
      // For new applications, we need to save the application first
      setError('Speichern Sie zuerst die Bewerbung, bevor Sie Dateien hochladen.');
      return;
    }

    try {
      for (const file of files) {
        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const uploadedFile = await fileService.uploadFile(
          buffer, 
          file.name, 
          application?.id, 
          description
        );
        
        if (application?.id && uploadedFile.id) {
          await applicationService.attachFile(application.id, uploadedFile.id);
        }
      }
      
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hochladen der Datei');
    }
  };

  const handleFileDownload = async (file: FileModel) => {
    try {
      if (file.id) {
        // Get file buffer and trigger download
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

  const handleFileDelete = async (file: FileModel) => {
    try {
      if (application?.id && file.id) {
        await applicationService.detachFile(application.id, file.id);
        await fileService.delete(file.id);
        await loadFiles();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Datei');
    }
  };

  return (
    <div className="application-form">
      <div className="form-header">
        <h2>{isEditing ? 'Bewerbung bearbeiten' : 'Neue Bewerbung erstellen'}</h2>
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Grundlegende Informationen</h3>
          
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="title">Bewerbungstitel *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="z.B. Frontend-Entwickler bei TechCorp"
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="position">Position *</label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                required
                placeholder="z.B. Senior Frontend Developer"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="job_url">Stellenausschreibung URL</label>
              <input
                type="url"
                id="job_url"
                name="job_url"
                value={formData.job_url}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="application_channel">Bewerbungskanal</label>
              <input
                type="text"
                id="application_channel"
                name="application_channel"
                value={formData.application_channel}
                onChange={handleInputChange}
                placeholder="z.B. LinkedIn, XING, Unternehmenswebsite"
              />
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="form-section">
          <h3>Stellendetails</h3>
          
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="work_type">Arbeitstyp</label>
              <select
                id="work_type"
                name="work_type"
                value={formData.work_type}
                onChange={handleInputChange}
              >
                <option value="full-time">Vollzeit</option>
                <option value="part-time">Teilzeit</option>
                <option value="freelance">Freelance</option>
                <option value="contract">Vertrag</option>
                <option value="internship">Praktikum</option>
              </select>
            </div>
            
            <div className="form-field">
              <label htmlFor="priority">Priorität</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value={1}>1 - Sehr niedrig</option>
                <option value={2}>2 - Niedrig</option>
                <option value={3}>3 - Normal</option>
                <option value={4}>4 - Hoch</option>
                <option value={5}>5 - Sehr hoch</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="location">Standort</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="z.B. Berlin, München, Remote"
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="salary_range">Gehaltsbereich</label>
              <input
                type="text"
                id="salary_range"
                name="salary_range"
                value={formData.salary_range}
                onChange={handleInputChange}
                placeholder="z.B. 50.000€ - 70.000€"
              />
            </div>
          </div>

          <div className="form-field checkbox-field">
            <label>
              <input
                type="checkbox"
                name="remote_possible"
                checked={formData.remote_possible}
                onChange={handleInputChange}
              />
              Remote-Arbeit möglich
            </label>
          </div>
        </div>

        {/* Dates */}
        <div className="form-section">
          <h3>Termine</h3>
          
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="application_date">Bewerbungsdatum</label>
              <input
                type="date"
                id="application_date"
                name="application_date"
                value={formData.application_date}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="deadline">Bewerbungsfrist</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="follow_up_date">Follow-up Datum</label>
              <input
                type="date"
                id="follow_up_date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Text Fields */}
        <div className="form-section">
          <h3>Zusätzliche Informationen</h3>
          
          <div className="form-field">
            <label htmlFor="notes">Notizen</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Persönliche Notizen zur Bewerbung..."
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="requirements">Anforderungen</label>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleInputChange}
              rows={4}
              placeholder="Wichtige Anforderungen der Stelle..."
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="benefits">Vorteile</label>
            <textarea
              id="benefits"
              name="benefits"
              value={formData.benefits}
              onChange={handleInputChange}
              rows={3}
              placeholder="Angebotene Benefits und Vorteile..."
            />
          </div>
          
          <div className="form-field">
            <label htmlFor="cover_letter">Anschreiben</label>
            <textarea
              id="cover_letter"
              name="cover_letter"
              value={formData.cover_letter}
              onChange={handleInputChange}
              rows={6}
              placeholder="Inhalt des Anschreibens..."
            />
          </div>
        </div>

        {/* File Management */}
        {isEditing && application?.id && (
          <div className="form-section">
            <div className="section-header">
              <h3>Dateien</h3>
              <button
                type="button"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="btn-secondary"
              >
                {showFileUpload ? 'Upload schließen' : 'Datei hochladen'}
              </button>
            </div>

            {showFileUpload && (
              <FileUpload
                onFileUpload={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                maxSizeBytes={50 * 1024 * 1024}
              />
            )}

            <FileList
              files={files}
              onDownload={handleFileDownload}
              onDelete={handleFileDelete}
              emptyMessage="Noch keine Dateien hochgeladen"
              showFilters={files.length > 3}
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Speichern...' : (isEditing ? 'Aktualisieren' : 'Erstellen')}
          </button>
        </div>
      </form>

      <style>{`
        .application-form {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .form-header {
          margin-bottom: 32px;
        }

        .form-header h2 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 1.875rem;
          font-weight: 700;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .error-icon {
          font-size: 1.25rem;
        }

        .form-container {
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .form-section {
          padding: 24px;
          border-bottom: 1px solid #f3f4f6;
        }

        .form-section:last-child {
          border-bottom: none;
        }

        .form-section h3 {
          margin: 0 0 20px 0;
          color: #374151;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          margin: 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-row:last-child {
          margin-bottom: 0;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field.checkbox-field {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        .form-field.checkbox-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: normal;
        }

        .form-field label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-field textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-field input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .form-actions {
          padding: 24px;
          background-color: #f9fafb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .btn-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .application-form {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .form-section {
            padding: 16px;
          }

          .form-actions {
            padding: 16px;
            flex-direction: column-reverse;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            padding: 12px;
          }

          .section-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ApplicationForm;
