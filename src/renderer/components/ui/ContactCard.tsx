import React from 'react';
import { ContactModel } from '../../../models/Contact';

interface ContactCardProps {
  contact: ContactModel;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.email) {
      window.open(`mailto:${contact.email}`, '_blank');
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.phone) {
      window.open(`tel:${contact.phone}`, '_blank');
    }
  };

  const handleLinkedInClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.linkedin_url) {
      window.open(contact.linkedin_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={`contact-card ${isSelected ? 'selected' : ''} ${compact ? 'compact' : ''} ${className}`}
      onClick={handleCardClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyPress={onSelect ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
    >
      {/* Header with name and actions */}
      <div className="contact-header">
        <div className="contact-name">
          <h4>{contact.getFullName()}</h4>
          {contact.position && (
            <p className="position">{contact.position}</p>
          )}
        </div>
        
        {showActions && (
          <div className="contact-actions">
            {onEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                className="action-btn edit-btn"
                title="Kontakt bearbeiten"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="action-btn delete-btn"
                title="Kontakt löschen"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact information */}
      {!compact && (
        <div className="contact-info">
          {contact.email && (
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <button
                type="button"
                className="contact-link email-link"
                onClick={handleEmailClick}
                title={`E-Mail an ${contact.email} senden`}
              >
                {contact.email}
              </button>
            </div>
          )}

          {contact.phone && (
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <button
                type="button"
                className="contact-link phone-link"
                onClick={handlePhoneClick}
                title={`${contact.getFormattedPhone()} anrufen`}
              >
                {contact.getFormattedPhone()}
              </button>
            </div>
          )}

          {contact.linkedin_url && (
            <div className="contact-item">
              <span className="contact-icon">💼</span>
              <button
                type="button"
                className="contact-link linkedin-link"
                onClick={handleLinkedInClick}
                title="LinkedIn Profil öffnen"
              >
                LinkedIn Profil
              </button>
            </div>
          )}

          {contact.notes && (
            <div className="contact-notes">
              <p>{contact.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Compact mode contact info */}
      {compact && (
        <div className="contact-info-compact">
          <div className="contact-methods">
            {contact.email && (
              <button
                type="button"
                className="method-icon"
                onClick={handleEmailClick}
                title={`E-Mail: ${contact.email}`}
              >
                📧
              </button>
            )}
            {contact.phone && (
              <button
                type="button"
                className="method-icon"
                onClick={handlePhoneClick}
                title={`Telefon: ${contact.getFormattedPhone()}`}
              >
                📞
              </button>
            )}
            {contact.linkedin_url && (
              <button
                type="button"
                className="method-icon"
                onClick={handleLinkedInClick}
                title="LinkedIn Profil"
              >
                💼
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer with metadata */}
      <div className="contact-footer">
        <div className="contact-meta">
          <span className="created-date">
            Erstellt: {new Date(contact.created_at).toLocaleDateString('de-DE')}
          </span>
          {contact.updated_at !== contact.created_at && (
            <span className="updated-date">
              Aktualisiert: {new Date(contact.updated_at).toLocaleDateString('de-DE')}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .contact-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          cursor: ${onSelect ? 'pointer' : 'default'};
          transition: all 0.2s ease;
          position: relative;
        }

        .contact-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #d1d5db;
        }

        .contact-card.selected {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }

        .contact-card.compact {
          padding: 12px;
        }

        .contact-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .contact-name h4 {
          margin: 0 0 4px 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .contact-name .position {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
          font-style: italic;
        }

        .contact-actions {
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .contact-card:hover .contact-actions {
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

        .delete-btn:hover {
          background-color: #fef2f2;
          border-color: #fecaca;
        }

        .contact-info {
          margin-bottom: 12px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .contact-icon {
          font-size: 0.875rem;
          width: 20px;
          flex-shrink: 0;
        }

        .contact-link {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.875rem;
          text-align: left;
          padding: 0;
        }

        .contact-link:hover {
          color: #2563eb;
        }

        .contact-notes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }

        .contact-notes p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .contact-info-compact {
          margin-bottom: 8px;
        }

        .contact-methods {
          display: flex;
          gap: 8px;
        }

        .method-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .method-icon:hover {
          background-color: #f3f4f6;
        }

        .contact-footer {
          border-top: 1px solid #f3f4f6;
          padding-top: 8px;
          margin-top: 8px;
        }

        .contact-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .created-date,
        .updated-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        @media (max-width: 768px) {
          .contact-header {
            flex-direction: column;
            gap: 8px;
          }

          .contact-actions {
            opacity: 1;
            align-self: flex-end;
          }

          .contact-meta {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactCard;
