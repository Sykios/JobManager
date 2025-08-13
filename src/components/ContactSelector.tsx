import React, { useState, useEffect } from 'react';
import { ContactModel } from '../models/Contact';
import { ContactService } from '../services/ContactService';
import { ContactCard } from './ContactCard';

interface ContactSelectorProps {
  contactService: ContactService;
  selectedContactId?: number;
  onSelect: (contact: ContactModel | null) => void;
  onCreateNew?: () => void;
  companyId?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  contactService,
  selectedContactId,
  onSelect,
  onCreateNew,
  companyId,
  className = '',
  placeholder = 'Kontakt auswählen...',
  disabled = false
}) => {
  const [contacts, setContacts] = useState<ContactModel[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactModel | null>(null);

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        const filters = companyId ? { company_id: companyId } : {};
        const contactsData = await contactService.getAll(filters);
        setContacts(contactsData);
        
        // Find selected contact
        if (selectedContactId) {
          const selected = contactsData.find(c => c.id === selectedContactId);
          setSelectedContact(selected || null);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [contactService, companyId, selectedContactId]);

  // Filter contacts based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => 
      contact.getFullName().toLowerCase().includes(query) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.position && contact.position.toLowerCase().includes(query))
    );
    
    setFilteredContacts(filtered);
  }, [contacts, searchQuery]);

  const handleContactSelect = (contact: ContactModel) => {
    setSelectedContact(contact);
    onSelect(contact);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedContact(null);
    onSelect(null);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateNew) {
      onCreateNew();
    }
  };

  return (
    <div className={`contact-selector ${className}`}>
      {/* Selected contact display */}
      {selectedContact ? (
        <div className="selected-contact">
          <ContactCard
            contact={selectedContact}
            compact={true}
            showActions={false}
            className="selected-card"
          />
          <div className="selection-actions">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="change-btn"
              disabled={disabled}
            >
              Ändern
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="clear-btn"
              disabled={disabled}
            >
              Entfernen
            </button>
          </div>
        </div>
      ) : (
        /* Contact selection trigger */
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="selector-trigger"
          disabled={disabled}
        >
          <span className="trigger-icon">👤</span>
          <span className="trigger-text">{placeholder}</span>
          <span className="trigger-arrow">▼</span>
        </button>
      )}

      {/* Contact selection dropdown */}
      {isOpen && (
        <div className="selector-dropdown">
          <div className="dropdown-header">
            <div className="search-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kontakt suchen..."
                className="search-input"
                autoFocus
              />
            </div>
            <div className="dropdown-actions">
              {onCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="create-new-btn"
                >
                  ➕ Neuen Kontakt erstellen
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="dropdown-content">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Kontakte laden...</span>
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="contacts-list">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="contact-option"
                    onClick={() => handleContactSelect(contact)}
                  >
                    <ContactCard
                      contact={contact}
                      compact={true}
                      showActions={false}
                      onSelect={() => handleContactSelect(contact)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <span className="empty-text">
                  {searchQuery ? 'Keine Kontakte gefunden' : 'Keine Kontakte verfügbar'}
                </span>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="create-first-btn"
                  >
                    Ersten Kontakt erstellen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .contact-selector {
          position: relative;
          width: 100%;
        }

        .selected-contact {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px;
          background: white;
        }

        .selected-card {
          margin-bottom: 12px;
        }

        .selection-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .change-btn,
        .clear-btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.2s;
        }

        .change-btn {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .change-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .clear-btn {
          background: white;
          color: #6b7280;
          border-color: #d1d5db;
        }

        .clear-btn:hover:not(:disabled) {
          background: #f9fafb;
          color: #dc2626;
        }

        .selector-trigger {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
          text-align: left;
        }

        .selector-trigger:hover:not(:disabled) {
          border-color: #9ca3af;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .selector-trigger:disabled {
          background: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .trigger-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .trigger-text {
          flex-grow: 1;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .trigger-arrow {
          font-size: 0.75rem;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .selector-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          margin-top: 4px;
          max-height: 400px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .dropdown-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .search-container {
          margin-bottom: 12px;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .dropdown-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .create-new-btn {
          padding: 6px 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .create-new-btn:hover {
          background: #059669;
        }

        .close-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 1.25rem;
          padding: 4px;
        }

        .close-btn:hover {
          color: #374151;
        }

        .dropdown-content {
          flex: 1;
          overflow-y: auto;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #f3f4f6;
          border-left: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .contacts-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .contact-option {
          padding: 8px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #f3f4f6;
        }

        .contact-option:hover {
          background: #f9fafb;
        }

        .contact-option:last-child {
          border-bottom: none;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #6b7280;
          text-align: center;
        }

        .empty-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .empty-text {
          margin-bottom: 16px;
          font-size: 0.875rem;
        }

        .create-first-btn {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .create-first-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .selector-dropdown {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            right: auto;
            width: 90vw;
            max-width: 400px;
            max-height: 80vh;
          }

          .dropdown-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .create-new-btn {
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactSelector;
