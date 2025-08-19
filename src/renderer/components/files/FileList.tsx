import React, { useState } from 'react';
import { FileModel, FileType } from '../../../models/File';
import { FileCard } from './FileCard';

interface FileListProps {
  files: FileModel[];
  onDownload?: (file: FileModel) => void;
  onDelete?: (file: FileModel) => void;
  onEdit?: (file: FileModel) => void;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  showFilters?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onDownload,
  onDelete,
  onEdit,
  loading = false,
  error,
  emptyMessage = 'Keine Dateien gefunden',
  showActions = true,
  compact = false,
  className = '',
  showFilters = true
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter(file => {
      // Type filter
      if (filterType !== 'all' && file.type !== filterType) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return file.filename.toLowerCase().includes(query) ||
               (file.description && file.description.toLowerCase().includes(query));
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename, 'de');
          break;
        case 'type':
          comparison = a.getTypeLabel().localeCompare(b.getTypeLabel(), 'de');
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'name' | 'type' | 'size' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'type' | 'size' | 'date') => {
    if (sortBy !== field) return '⏸️';
    return sortOrder === 'asc' ? '⬆️' : '⬇️';
  };

  const getFileSizeStats = () => {
    if (files.length === 0) return { total: 0, average: 0 };
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalSize / files.length;
    return { total: totalSize, average: averageSize };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getTypeCount = (type: FileType) => {
    return files.filter(file => file.type === type).length;
  };

  if (loading) {
    return (
      <div className={`file-list loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Dateien werden geladen...</p>
        </div>
        
        <style>{`
          .file-list.loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
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
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`file-list error ${className}`}>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Fehler beim Laden der Dateien</h3>
          <p>{error}</p>
        </div>

        <style>{`
          .file-list.error {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className={`file-list ${className}`}>
      {/* Controls section */}
      {showFilters && files.length > 0 && (
        <div className="file-controls">
          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Dateien durchsuchen..."
              className="search-input"
            />
          </div>

          {/* Filters and sorting */}
          <div className="filter-section">
            <div className="type-filter">
              <label htmlFor="type-filter">Typ:</label>
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FileType | 'all')}
                className="filter-select"
              >
                <option value="all">Alle ({files.length})</option>
                <option value="pdf">PDF ({getTypeCount('pdf')})</option>
                <option value="docx">Word ({getTypeCount('docx')})</option>
                <option value="txt">Text ({getTypeCount('txt')})</option>
                <option value="jpg">Bilder ({getTypeCount('jpg') + getTypeCount('png')})</option>
                <option value="other">Andere ({getTypeCount('other')})</option>
              </select>
            </div>

            <div className="sort-controls">
              <span className="sort-label">Sortieren:</span>
              <div className="sort-buttons">
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSort('name')}
                >
                  Name {getSortIcon('name')}
                </button>
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'type' ? 'active' : ''}`}
                  onClick={() => handleSort('type')}
                >
                  Typ {getSortIcon('type')}
                </button>
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'size' ? 'active' : ''}`}
                  onClick={() => handleSort('size')}
                >
                  Größe {getSortIcon('size')}
                </button>
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => handleSort('date')}
                >
                  Datum {getSortIcon('date')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {files.length > 0 && (
        <div className="file-stats">
          <div className="stats-info">
            {filteredAndSortedFiles.length !== files.length ? (
              <span>{filteredAndSortedFiles.length} von {files.length} Dateien</span>
            ) : (
              <span>{files.length} {files.length === 1 ? 'Datei' : 'Dateien'}</span>
            )}
            <span className="total-size">
              Gesamt: {formatFileSize(getFileSizeStats().total)}
            </span>
          </div>
        </div>
      )}

      {/* File list */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="empty-message">
          <div className="empty-icon">📁</div>
          <h3>Keine Dateien gefunden</h3>
          <p>{searchQuery ? 'Suchkriterien anpassen' : emptyMessage}</p>
        </div>
      ) : (
        <div className={`files-grid ${compact ? 'compact' : ''}`}>
          {filteredAndSortedFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDownload={onDownload ? () => onDownload(file) : undefined}
              onDelete={onDelete ? () => onDelete(file) : undefined}
              onEdit={onEdit ? () => onEdit(file) : undefined}
              showActions={showActions}
              compact={compact}
            />
          ))}
        </div>
      )}

      <style>{`
        .file-list {
          width: 100%;
        }

        .file-controls {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
        }

        .search-section {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .type-filter {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .type-filter label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sort-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .sort-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .sort-btn {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sort-btn:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .sort-btn.active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .file-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .stats-info {
          display: flex;
          gap: 16px;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .total-size {
          font-weight: 500;
        }

        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .files-grid.compact {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .empty-message {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-message h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #374151;
        }

        .empty-message p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .file-controls {
            padding: 16px;
          }

          .filter-section {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .sort-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .sort-buttons {
            justify-content: space-between;
          }

          .sort-btn {
            flex: 1;
            justify-content: center;
          }

          .files-grid {
            grid-template-columns: 1fr;
          }

          .stats-info {
            flex-direction: column;
            gap: 4px;
          }
        }

        @media (max-width: 480px) {
          .sort-buttons {
            flex-direction: column;
          }

          .sort-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default FileList;
