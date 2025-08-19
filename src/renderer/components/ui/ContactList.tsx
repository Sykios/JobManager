import React, { useState } from 'react';
import { ContactModel } from '../../../models/Contact';
import { ContactCard } from '../ContactCard';

interface ContactListProps {
  contacts: ContactModel[];
  onEdit?: (contact: ContactModel) => void;
  onDelete?: (contact: ContactModel) => void;
  onSelect?: (contact: ContactModel) => void;
  selectedContactId?: number;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onEdit,
  onDelete,
  onSelect,
  selectedContactId,
  loading = false,
  error,
  emptyMessage = 'Keine Kontakte gefunden',
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'position'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sort contacts
  const sortedContacts = [...contacts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.getFullName().localeCompare(b.getFullName(), 'de');
        break;
      case 'created':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'updated':
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
      case 'position':
        const posA = a.position || '';
        const posB = b.position || '';
        comparison = posA.localeCompare(posB, 'de');
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'name' | 'created' | 'updated' | 'position') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'created' | 'updated' | 'position') => {
    if (sortBy !== field) return '⏸️';
    return sortOrder === 'asc' ? '⬆️' : '⬇️';
  };

  if (loading) {
    return (
      <div className={`contact-list loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Kontakte werden geladen...</p>
        </div>
        
        <style>{`
          .contact-list.loading {
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
      <div className={`contact-list error ${className}`}>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Fehler beim Laden der Kontakte</h3>
          <p>{error}</p>
        </div>

        <style>{`
          .contact-list.error {
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

  if (contacts.length === 0) {
    return (
      <div className={`contact-list empty ${className}`}>
        <div className="empty-message">
          <div className="empty-icon">👥</div>
          <h3>Keine Kontakte vorhanden</h3>
          <p>{emptyMessage}</p>
        </div>

        <style>{`
          .contact-list.empty {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
          }

          .empty-message {
            text-align: center;
            color: #6b7280;
          }

          .empty-icon {
            font-size: 3rem;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .empty-message h3 {
            margin: 0 0 8px 0;
            font-size: 1.25rem;
          }

          .empty-message p {
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`contact-list ${className}`}>
      {/* Sort controls */}
      <div className="sort-controls">
        <span className="sort-label">Sortieren nach:</span>
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
            className={`sort-btn ${sortBy === 'position' ? 'active' : ''}`}
            onClick={() => handleSort('position')}
          >
            Position {getSortIcon('position')}
          </button>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'created' ? 'active' : ''}`}
            onClick={() => handleSort('created')}
          >
            Erstellt {getSortIcon('created')}
          </button>
          <button
            type="button"
            className={`sort-btn ${sortBy === 'updated' ? 'active' : ''}`}
            onClick={() => handleSort('updated')}
          >
            Aktualisiert {getSortIcon('updated')}
          </button>
        </div>
      </div>

      {/* Contact count */}
      <div className="contact-count">
        {contacts.length === 1 ? '1 Kontakt' : `${contacts.length} Kontakte`}
      </div>

      {/* Contacts grid/list */}
      <div className={`contacts-grid ${compact ? 'compact' : ''}`}>
        {sortedContacts.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onEdit={onEdit ? () => onEdit(contact) : undefined}
            onDelete={onDelete ? () => onDelete(contact) : undefined}
            onSelect={onSelect ? () => onSelect(contact) : undefined}
            isSelected={selectedContactId === contact.id}
            showActions={showActions}
            compact={compact}
          />
        ))}
      </div>

      <style>{`
        .contact-list {
          width: 100%;
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .sort-label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .sort-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sort-btn {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.875rem;
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

        .contact-count {
          margin-bottom: 16px;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .contacts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .contacts-grid.compact {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        @media (max-width: 768px) {
          .contacts-grid {
            grid-template-columns: 1fr;
          }

          .sort-controls {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .sort-buttons {
            width: 100%;
            justify-content: flex-start;
          }

          .sort-btn {
            flex: 1;
            justify-content: center;
            min-width: auto;
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

export default ContactList;
