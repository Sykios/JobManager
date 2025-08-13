import React, { useState, useRef, useCallback } from 'react';
import { FileModel } from '../models/File';

interface FileUploadProps {
  onFileUpload: (files: File[], description?: string) => Promise<void>;
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png',
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  className = '',
  disabled = false,
  multiple = true
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    if (files.length > maxFiles) {
      errors.push(`Maximal ${maxFiles} Dateien erlaubt`);
      return { valid: [], errors };
    }

    const allowedTypes = accept.split(',').map(type => type.trim().toLowerCase());
    
    files.forEach((file, index) => {
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name}: Datei zu groß (Max: ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }

      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExt) && !allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Dateityp nicht unterstützt`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }, [accept, maxFiles, maxSizeBytes]);

  const handleFiles = useCallback((files: File[]) => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setSelectedFiles(valid);
    setError('');
  }, [validateFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled, uploading, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError('');
      await onFileUpload(selectedFiles, description.trim() || undefined);
      
      // Reset form
      setSelectedFiles([]);
      setDescription('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Upload');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getFileIcon = (file: File): string => {
    const type = file.type.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return '📝';
    if (type.includes('text')) return '📃';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className={`file-upload ${className}`}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="drop-content">
          <div className="drop-icon">📁</div>
          <h3>Dateien hochladen</h3>
          <p>
            Dateien hier hineinziehen oder <span className="click-text">klicken zum Auswählen</span>
          </p>
          <div className="file-info">
            <small>
              Erlaubt: {accept.replace(/\./g, '').toUpperCase()} • 
              Max: {(maxSizeBytes / 1024 / 1024).toFixed(1)}MB pro Datei • 
              Bis zu {maxFiles} Dateien
            </small>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Ausgewählte Dateien ({selectedFiles.length})</h4>
          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-icon">{getFileIcon(file)}</span>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="remove-btn"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Description input */}
          <div className="description-section">
            <label htmlFor="file-description">Beschreibung (optional)</label>
            <textarea
              id="file-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung für die hochgeladenen Dateien..."
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Upload button */}
          <div className="upload-actions">
            <button
              type="button"
              onClick={handleUpload}
              className="upload-btn"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Hochladen...' : `${selectedFiles.length} Datei${selectedFiles.length !== 1 ? 'en' : ''} hochladen`}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .file-upload {
          width: 100%;
        }

        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .drop-zone:hover:not(.disabled) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .drop-zone.active {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .drop-zone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        .drop-content {
          pointer-events: none;
        }

        .drop-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .drop-content h3 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .drop-content p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .click-text {
          color: #3b82f6;
          font-weight: 500;
        }

        .file-info {
          color: #9ca3af;
          font-size: 0.75rem;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-top: 16px;
        }

        .selected-files {
          margin-top: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .selected-files h4 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 1.125rem;
        }

        .files-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .file-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .file-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .file-size {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .remove-btn {
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          transition: background 0.2s;
        }

        .remove-btn:hover:not(:disabled) {
          background: #b91c1c;
        }

        .remove-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .description-section {
          margin-bottom: 20px;
        }

        .description-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .description-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          resize: vertical;
          font-family: inherit;
        }

        .description-section textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .description-section textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .upload-actions {
          display: flex;
          justify-content: flex-end;
        }

        .upload-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .upload-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .upload-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .drop-zone {
            padding: 24px 16px;
          }

          .drop-icon {
            font-size: 2rem;
          }

          .file-item {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .file-info {
            justify-content: flex-start;
          }

          .remove-btn {
            align-self: flex-end;
          }

          .upload-actions {
            justify-content: stretch;
          }

          .upload-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
