import React, { useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';

interface FileUploadData {
  file: File;
  preview?: string;
  description?: string;
}

interface ApplicationFileUploadProps {
  onFilesChange: (files: {
    cv?: FileUploadData;
    coverLetter?: FileUploadData;
    additionalFiles: FileUploadData[];
  }) => void;
  disabled?: boolean;
  className?: string;
}

export const ApplicationFileUpload: React.FC<ApplicationFileUploadProps> = ({
  onFilesChange,
  disabled = false,
  className = ''
}) => {
  const [cvFile, setCvFile] = useState<FileUploadData | undefined>();
  const [coverLetterFile, setCoverLetterFile] = useState<FileUploadData | undefined>();
  const [additionalFiles, setAdditionalFiles] = useState<FileUploadData[]>([]);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cvInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = useCallback((file: File, type: 'cv' | 'coverLetter' | 'additional'): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = {
      cv: ['.pdf', '.doc', '.docx'],
      coverLetter: ['.pdf', '.doc', '.docx', '.txt'],
      additional: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']
    };

    if (file.size > maxSize) {
      return `Datei ist zu groß (Max: ${(maxSize / 1024 / 1024)}MB)`;
    }

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes[type].includes(fileExt)) {
      return `Dateityp nicht unterstützt. Erlaubt: ${allowedTypes[type].join(', ')}`;
    }

    return null;
  }, []);

  // Effect to notify parent when files change
  React.useEffect(() => {
    console.log('ApplicationFileUpload: Files changed', {
      cv: cvFile ? `${cvFile.file.name} (${cvFile.file.size} bytes)` : null,
      coverLetter: coverLetterFile ? `${coverLetterFile.file.name} (${coverLetterFile.file.size} bytes)` : null,
      additionalFiles: additionalFiles.map(f => `${f.file.name} (${f.file.size} bytes)`)
    });
    
    onFilesChange({
      cv: cvFile,
      coverLetter: coverLetterFile,
      additionalFiles
    });
  }, [cvFile, coverLetterFile, additionalFiles, onFilesChange]); // Include onFilesChange now that it's stable

  // Handle file selection
  const handleFileSelect = useCallback(async (
    files: FileList | File[], 
    type: 'cv' | 'coverLetter' | 'additional'
  ) => {
    const fileArray = Array.from(files);
    const newErrors = { ...errors };

    if (type === 'cv' || type === 'coverLetter') {
      const file = fileArray[0];
      if (!file) return;

      const error = validateFile(file, type);
      if (error) {
        newErrors[type] = error;
        setErrors(newErrors);
        return;
      }

      // Clear error and create file data
      delete newErrors[type];
      setErrors(newErrors);

      const fileData: FileUploadData = {
        file,
        description: ''
      };

      if (type === 'cv') {
        setCvFile(fileData);
      } else {
        setCoverLetterFile(fileData);
      }
    } else {
      // Handle additional files
      const validFiles: FileUploadData[] = [];
      
      for (const file of fileArray) {
        const error = validateFile(file, 'additional');
        if (!error) {
          validFiles.push({
            file,
            description: ''
          });
        }
      }

      if (validFiles.length > 0) {
        setAdditionalFiles(prev => [...prev, ...validFiles]);
        delete newErrors.additional;
        setErrors(newErrors);
      }
    }
  }, [errors, validateFile]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'cv' | 'coverLetter' | 'additional') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files, type);
  }, [disabled, handleFileSelect]);

  // Handle input change
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'cv' | 'coverLetter' | 'additional'
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files, type);
    }
  }, [handleFileSelect]);

  // Remove file
  const removeFile = useCallback((type: 'cv' | 'coverLetter' | 'additional', index?: number) => {
    if (type === 'cv') {
      setCvFile(undefined);
      if (cvInputRef.current) cvInputRef.current.value = '';
    } else if (type === 'coverLetter') {
      setCoverLetterFile(undefined);
      if (coverLetterInputRef.current) coverLetterInputRef.current.value = '';
    } else if (type === 'additional' && index !== undefined) {
      setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  // Update description
  const updateDescription = useCallback((
    description: string, 
    type: 'cv' | 'coverLetter' | 'additional', 
    index?: number
  ) => {
    if (type === 'cv' && cvFile) {
      setCvFile({ ...cvFile, description });
    } else if (type === 'coverLetter' && coverLetterFile) {
      setCoverLetterFile({ ...coverLetterFile, description });
    } else if (type === 'additional' && index !== undefined) {
      setAdditionalFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, description } : file
      ));
    }
  }, [cvFile, coverLetterFile]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }, []);

  // Get file icon
  const getFileIcon = useCallback((filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'txt': return '📃';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      default: return '📎';
    }
  }, []);

  // Render file upload section
  const renderUploadSection = (
    title: string,
    type: 'cv' | 'coverLetter' | 'additional',
    file: FileUploadData | undefined,
    placeholder: string,
    allowedTypes: string,
    multiple: boolean = false
  ) => (
    <div className="upload-section">
      <h4 className="upload-title">{title}</h4>
      <p className="upload-description">
        Erlaubte Dateitypen: {allowedTypes} • Max. 10MB
      </p>

      {file ? (
        <div className="file-preview">
          <div className="file-info">
            <span className="file-icon">{getFileIcon(file.file.name)}</span>
            <div className="file-details">
              <span className="file-name">{file.file.name}</span>
              <span className="file-size">{formatFileSize(file.file.size)}</span>
            </div>
            <button
              type="button"
              onClick={() => removeFile(type)}
              className="remove-btn"
              disabled={disabled}
              title="Datei entfernen"
            >
              ✕
            </button>
          </div>
          <div className="file-description">
            <input
              type="text"
              value={file.description || ''}
              onChange={(e) => updateDescription(e.target.value, type)}
              placeholder="Beschreibung (optional)"
              className="description-input"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div
          className={`drop-zone ${draggedOver === type ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, type)}
          onClick={() => {
            if (type === 'cv') cvInputRef.current?.click();
            else if (type === 'coverLetter') coverLetterInputRef.current?.click();
            else additionalInputRef.current?.click();
          }}
        >
          <div className="drop-content">
            <span className="drop-icon">📁</span>
            <p className="drop-text">{placeholder}</p>
            <span className="drop-hint">Klicken zum Auswählen oder Datei hierher ziehen</span>
          </div>
        </div>
      )}

      {errors[type] && (
        <div className="error-message">
          <span>⚠️ {errors[type]}</span>
        </div>
      )}

      <input
        ref={type === 'cv' ? cvInputRef : type === 'coverLetter' ? coverLetterInputRef : additionalInputRef}
        type="file"
        accept={type === 'cv' ? '.pdf,.doc,.docx' : type === 'coverLetter' ? '.pdf,.doc,.docx,.txt' : '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png'}
        multiple={multiple}
        onChange={(e) => handleInputChange(e, type)}
        disabled={disabled}
        style={{ display: 'none' }}
      />
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader title="Dateien & Anhänge" />
      <CardBody>
        <div className="file-upload-container">
          {renderUploadSection(
            'Lebenslauf',
            'cv',
            cvFile,
            'Lebenslauf hochladen',
            'PDF, DOC, DOCX'
          )}

          {renderUploadSection(
            'Anschreiben',
            'coverLetter',
            coverLetterFile,
            'Anschreiben hochladen',
            'PDF, DOC, DOCX, TXT'
          )}

          <div className="upload-section">
            <h4 className="upload-title">Zusätzliche Dateien</h4>
            <p className="upload-description">
              Erlaubte Dateitypen: PDF, DOC, DOCX, TXT, JPG, PNG • Max. 10MB pro Datei
            </p>

            {additionalFiles.length > 0 && (
              <div className="additional-files-list">
                {additionalFiles.map((fileData, index) => (
                  <div key={index} className="file-preview">
                    <div className="file-info">
                      <span className="file-icon">{getFileIcon(fileData.file.name)}</span>
                      <div className="file-details">
                        <span className="file-name">{fileData.file.name}</span>
                        <span className="file-size">{formatFileSize(fileData.file.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile('additional', index)}
                        className="remove-btn"
                        disabled={disabled}
                        title="Datei entfernen"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="file-description">
                      <input
                        type="text"
                        value={fileData.description || ''}
                        onChange={(e) => updateDescription(e.target.value, 'additional', index)}
                        placeholder="Beschreibung (optional)"
                        className="description-input"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`drop-zone ${draggedOver === 'additional' ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'additional')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'additional')}
              onClick={() => additionalInputRef.current?.click()}
            >
              <div className="drop-content">
                <span className="drop-icon">📁</span>
                <p className="drop-text">Weitere Dateien hinzufügen</p>
                <span className="drop-hint">Klicken zum Auswählen oder Dateien hierher ziehen</span>
              </div>
            </div>

            {errors.additional && (
              <div className="error-message">
                <span>⚠️ {errors.additional}</span>
              </div>
            )}

            <input
              ref={additionalInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              multiple
              onChange={(e) => handleInputChange(e, 'additional')}
              disabled={disabled}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </CardBody>

      <style>{`
        .file-upload-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .upload-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          background: #fafafa;
        }

        .upload-title {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .upload-description {
          margin: 0 0 16px 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 6px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .drop-zone:hover:not(.disabled) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .drop-zone.drag-over {
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
          font-size: 2.5rem;
          display: block;
          margin-bottom: 12px;
        }

        .drop-text {
          margin: 0 0 4px 0;
          font-weight: 500;
          color: #374151;
        }

        .drop-hint {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .file-preview {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .file-preview:last-child {
          margin-bottom: 0;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .file-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .file-name {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
          word-break: break-all;
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
          flex-shrink: 0;
        }

        .remove-btn:hover:not(:disabled) {
          background: #b91c1c;
        }

        .remove-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .file-description {
          margin-top: 8px;
        }

        .description-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
          transition: border-color 0.2s;
        }

        .description-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .description-input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .additional-files-list {
          margin-bottom: 16px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 4px;
          margin-top: 8px;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .file-upload-container {
            gap: 16px;
          }

          .upload-section {
            padding: 16px;
          }

          .drop-zone {
            padding: 24px 16px;
          }

          .drop-icon {
            font-size: 2rem;
          }

          .file-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .file-details {
            align-self: stretch;
          }

          .remove-btn {
            align-self: flex-end;
          }
        }
      `}</style>
    </Card>
  );
};
