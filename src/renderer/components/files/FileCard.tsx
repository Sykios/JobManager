import React from 'react';
import { FileModel } from '../../../models/File';

interface FileCardProps {
  file: FileModel;
  onDownload?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onDownload,
  onDelete,
  onEdit,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const getFileIcon = (): string => {
    switch (file.type) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'txt': return '📃';
      case 'jpg':
      case 'png': return '🖼️';
      default: return '📎';
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`file-card ${compact ? 'compact' : ''} ${className}`}>
      {/* File icon and basic info */}
      <div className="file-header">
        <div className="file-icon-section">
          <span className="file-icon">{getFileIcon()}</span>
          <div className="file-basic-info">
            <h4 className="file-name" title={file.original_name || file.filename}>
              {file.original_name || file.filename}
            </h4>
            <div className="file-meta">
              <span className="file-type">{file.getTypeLabel()}</span>
              <span className="file-size">{file.getFormattedSize()}</span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="file-actions">
            {onDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className="action-btn download-btn"
                title="Datei herunterladen"
              >
                ⬇️
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={handleEdit}
                className="action-btn edit-btn"
                title="Dateibeschreibung bearbeiten"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="action-btn delete-btn"
                title="Datei löschen"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Extended info (not in compact mode) */}
      {!compact && (
        <>
          {/* Description */}
          {file.description && (
            <div className="file-description">
              <p>{file.description}</p>
            </div>
          )}

          {/* Upload date */}
          <div className="file-footer">
            <div className="upload-info">
              <span className="upload-date">
                Hochgeladen: {formatDate(file.upload_date)}
              </span>
              {file.application_id && (
                <span className="application-link">
                  📋 Verknüpft mit Bewerbung #{file.application_id}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .file-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;
          position: relative;
        }

        .file-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #d1d5db;
        }

        .file-card.compact {
          padding: 12px;
        }

        .file-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .file-icon-section {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .file-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .file-basic-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .file-type,
        .file-size {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .file-type {
          font-weight: 500;
        }

        .file-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
          flex-shrink: 0;
        }

        .file-card:hover .file-actions {
          opacity: 1;
        }

        .action-btn {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .download-btn:hover {
          background-color: #eff6ff;
          border-color: #3b82f6;
        }

        .edit-btn:hover {
          background-color: #fef3c7;
          border-color: #f59e0b;
        }

        .delete-btn:hover {
          background-color: #fef2f2;
          border-color: #fecaca;
        }

        .file-description {
          margin-bottom: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }

        .file-description p {
          margin: 0;
          color: #374151;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .file-footer {
          border-top: 1px solid #f3f4f6;
          padding-top: 12px;
        }

        .upload-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .upload-date,
        .application-link {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .application-link {
          color: #3b82f6;
          font-weight: 500;
        }

        /* Compact mode overrides */
        .file-card.compact .file-header {
          margin-bottom: 0;
        }

        .file-card.compact .file-icon {
          font-size: 1.5rem;
        }

        .file-card.compact .file-name {
          font-size: 0.875rem;
        }

        .file-card.compact .file-meta {
          gap: 8px;
        }

        .file-card.compact .action-btn {
          width: 28px;
          height: 28px;
          font-size: 0.75rem;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .file-header {
            flex-direction: column;
            gap: 12px;
          }

          .file-icon-section {
            align-items: center;
          }

          .file-actions {
            opacity: 1;
            align-self: flex-end;
          }

          .file-meta {
            flex-direction: column;
            gap: 4px;
          }

          .upload-info {
            gap: 8px;
          }

          .upload-date,
          .application-link {
            font-size: 0.75rem;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .file-card {
            border-color: #000;
          }

          .file-card:hover {
            border-color: #000;
            box-shadow: 0 0 0 2px #000;
          }
        }
      `}</style>
    </div>
  );
};
