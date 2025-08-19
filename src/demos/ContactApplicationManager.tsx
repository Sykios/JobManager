import React, { useState, useEffect } from 'react';
import { ContactModel } from '../models/Contact';
import { Application } from '../types';
import { ContactService } from '../services/ContactService';
import { ContactCard } from './ContactCard';
import { ContactSelector } from './ContactSelector';

interface ContactApplicationManagerProps {
  contactService: ContactService;
  application: Application;
  onContactChange: (contactId: number | null) => void;
  onCreateContact?: (companyId?: number) => void;
  showContactDetails?: boolean;
  className?: string;
}

export const ContactApplicationManager: React.FC<ContactApplicationManagerProps> = ({
  contactService,
  application,
  onContactChange,
  onCreateContact,
  showContactDetails = true,
  className = ''
}) => {
  const [contact, setContact] = useState<ContactModel | null>(null);
  const [relatedContacts, setRelatedContacts] = useState<ContactModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load current contact and related contacts
  useEffect(() => {
    const loadContactData = async () => {
      if (!application.contact_id) {
        setContact(null);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Load the main contact
        const currentContact = await contactService.getById(application.contact_id);
        setContact(currentContact);

        // Load related contacts from the same company
        if (application.company_id) {
          const companyContacts = await contactService.getByCompany(application.company_id);
          // Filter out the current contact
          const related = companyContacts.filter(c => c.id !== application.contact_id);
          setRelatedContacts(related);
        } else {
          setRelatedContacts([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kontaktdaten');
        console.error('Error loading contact data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContactData();
  }, [contactService, application.contact_id, application.company_id]);

  const handleContactSelect = (selectedContact: ContactModel | null) => {
    setContact(selectedContact);
    onContactChange(selectedContact?.id || null);
  };

  const handleCreateNewContact = () => {
    if (onCreateContact) {
      onCreateContact(application.company_id || undefined);
    }
  };

  const handleRelatedContactSelect = (relatedContact: ContactModel) => {
    setContact(relatedContact);
    onContactChange(relatedContact.id!);
  };

  const getContactInteractionSummary = (contact: ContactModel) => {
    // This would ideally come from a service that tracks interactions
    // For now, we'll show basic contact information
    return {
      lastContact: 'Noch kein Kontakt',
      totalInteractions: 0,
      preferredMethod: contact.email ? 'E-Mail' : contact.phone ? 'Telefon' : 'LinkedIn'
    };
  };

  if (loading) {
    return (
      <div className={`contact-application-manager loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Kontaktdaten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`contact-application-manager ${className}`}>
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Main contact section */}
      <div className="main-contact-section">
        <div className="section-header">
          <h3>Ansprechpartner</h3>
          {contact && showContactDetails && (
            <div className="contact-quick-actions">
              {contact.email && (
                <button
                  type="button"
                  onClick={() => window.open(`mailto:${contact.email}`)}
                  className="quick-action-btn email"
                  title="E-Mail senden"
                >
                  📧
                </button>
              )}
              {contact.phone && (
                <button
                  type="button"
                  onClick={() => window.open(`tel:${contact.phone}`)}
                  className="quick-action-btn phone"
                  title="Anrufen"
                >
                  📞
                </button>
              )}
              {contact.linkedin_url && (
                <button
                  type="button"
                  onClick={() => window.open(contact.linkedin_url, '_blank')}
                  className="quick-action-btn linkedin"
                  title="LinkedIn öffnen"
                >
                  💼
                </button>
              )}
            </div>
          )}
        </div>

        <ContactSelector
          contactService={contactService}
          selectedContactId={contact?.id}
          onSelect={handleContactSelect}
          onCreateNew={handleCreateNewContact}
          companyId={application.company_id || undefined}
          placeholder="Ansprechpartner auswählen..."
        />
      </div>

      {/* Contact details and interaction summary */}
      {contact && showContactDetails && (
        <div className="contact-details-section">
          <div className="contact-info-card">
            <ContactCard
              contact={contact}
              showActions={false}
              onSelect={() => {}} // No selection needed here
            />
            
            {/* Interaction summary */}
            <div className="interaction-summary">
              <h4>Kontakt-Verlauf</h4>
              <div className="interaction-stats">
                <div className="stat-item">
                  <span className="stat-label">Letzter Kontakt:</span>
                  <span className="stat-value">{getContactInteractionSummary(contact).lastContact}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Bevorzugter Weg:</span>
                  <span className="stat-value">{getContactInteractionSummary(contact).preferredMethod}</span>
                </div>
              </div>
              
              {/* Quick contact note */}
              <div className="quick-contact-note">
                <h5>Notiz für nächsten Kontakt:</h5>
                <textarea
                  placeholder="Notiz für den nächsten Kontakt mit dieser Person..."
                  className="contact-note-input"
                  rows={3}
                />
                <button
                  type="button"
                  className="save-note-btn"
                >
                  Notiz speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related contacts from same company */}
      {relatedContacts.length > 0 && (
        <div className="related-contacts-section">
          <div className="section-header">
            <h4>Weitere Kontakte bei diesem Unternehmen</h4>
          </div>
          
          <div className="related-contacts-list">
            {relatedContacts.map(relatedContact => (
              <div key={relatedContact.id} className="related-contact-item">
                <ContactCard
                  contact={relatedContact}
                  compact={true}
                  showActions={false}
                  onSelect={() => handleRelatedContactSelect(relatedContact)}
                />
                <button
                  type="button"
                  onClick={() => handleRelatedContactSelect(relatedContact)}
                  className="use-contact-btn"
                >
                  Als Ansprechpartner verwenden
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .contact-application-manager {
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .contact-application-manager.loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .loading-spinner {
          text-align: center;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-left: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .section-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .contact-quick-actions {
          display: flex;
          gap: 8px;
        }

        .quick-action-btn {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .quick-action-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .quick-action-btn.email:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .quick-action-btn.phone:hover {
          background: #f0fdf4;
          border-color: #10b981;
        }

        .quick-action-btn.linkedin:hover {
          background: #fef3c7;
          border-color: #f59e0b;
        }

        .main-contact-section {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .contact-details-section {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .contact-info-card {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
        }

        .interaction-summary {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .interaction-summary h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .interaction-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .stat-label {
          color: #6b7280;
        }

        .stat-value {
          font-weight: 500;
          color: #1f2937;
        }

        .quick-contact-note {
          background: white;
          border-radius: 6px;
          padding: 12px;
        }

        .quick-contact-note h5 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .contact-note-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          resize: vertical;
          margin-bottom: 8px;
        }

        .contact-note-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .save-note-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-note-btn:hover {
          background: #2563eb;
        }

        .related-contacts-section {
          padding: 20px;
        }

        .related-contacts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .related-contact-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .related-contact-item > :first-child {
          flex: 1;
        }

        .use-contact-btn {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .use-contact-btn:hover {
          background: #059669;
        }

        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .contact-quick-actions {
            align-self: flex-end;
          }

          .related-contact-item {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .use-contact-btn {
            align-self: flex-end;
          }

          .interaction-stats {
            gap: 12px;
          }

          .stat-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactApplicationManager;
