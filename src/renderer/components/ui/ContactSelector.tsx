import React, { useState, useEffect, useRef } from 'react';
import { ContactModel } from '../../../models/Contact';
import { ContactForm } from '../../../components/ContactForm';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface ContactSelectorProps {
  selectedContactId?: number;
  onContactSelect: (contact: ContactModel | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  selectedContactId,
  onContactSelect,
  label = "Ansprechpartner",
  placeholder = "Kontakt auswählen oder suchen...",
  error,
  disabled = false,
  className = ""
}) => {
  const [contacts, setContacts] = useState<ContactModel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<ContactModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactModel | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add lifecycle logging
  useEffect(() => {
    console.log('ContactSelector: Component mounted');
    console.log('ContactSelector: Props:', { selectedContactId, placeholder, disabled });
    
    return () => {
      console.log('ContactSelector: Component unmounting');
      console.log('ContactSelector: Final state:', { 
        selectedContact: selectedContact?.id, 
        showCreateForm, 
        saving, 
        isOpen 
      });
    };
  }, []);

  // Track selectedContactId changes
  useEffect(() => {
    console.log('ContactSelector: selectedContactId prop changed:', selectedContactId);
  }, [selectedContactId]);

  // Track showCreateForm state
  useEffect(() => {
    console.log('ContactSelector: showCreateForm state changed:', showCreateForm);
  }, [showCreateForm]);

  // Track saving state
  useEffect(() => {
    console.log('ContactSelector: saving state changed:', saving);
  }, [saving]);

  // Load contacts from database
  const loadContacts = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.queryDatabase(
        'SELECT * FROM contacts ORDER BY last_name, first_name',
        []
      );
      const contactModels = result.map((row: any) => ContactModel.fromJSON(row));
      setContacts(contactModels);
      setFilteredContacts(contactModels);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load selected contact details
  const loadSelectedContact = async () => {
    if (selectedContactId) {
      try {
        const result = await window.electronAPI.queryDatabase(
          'SELECT * FROM contacts WHERE id = ?',
          [selectedContactId]
        );
        if (result.length > 0) {
          const contact = ContactModel.fromJSON(result[0]);
          setSelectedContact(contact);
        }
      } catch (err) {
        console.error('Error loading selected contact:', err);
      }
    } else {
      setSelectedContact(null);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    loadSelectedContact();
  }, [selectedContactId]);

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
      (contact.phone && contact.phone.includes(query)) ||
      (contact.position && contact.position.toLowerCase().includes(query))
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContactSelect = (contact: ContactModel) => {
    setSelectedContact(contact);
    onContactSelect(contact);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedContact(null);
    onContactSelect(null);
    setSearchQuery('');
  };

  const handleCreateNewContact = () => {
    setIsOpen(false);
    setShowCreateForm(true);
    setSearchQuery('');
  };

  const handleSaveNewContact = async (contactData: any) => {
    // IMMEDIATE DEBUGGING - does this function even start?
    console.log('ContactSelector: handleSaveNewContact called!');
    alert('ContactSelector: handleSaveNewContact was called!'); // This should always show
    
    // Add window-level error tracking for this operation
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;
    
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('ContactSelector: Window error during contact creation:', {
        message, source, lineno, colno, error
      });
      if (originalOnError) originalOnError(message, source, lineno, colno, error);
      return false;
    };
    
    window.onunhandledrejection = (event) => {
      console.error('ContactSelector: Unhandled rejection during contact creation:', event.reason);
      if (originalOnUnhandledRejection) originalOnUnhandledRejection.call(window, event);
    };
    
    try {
      setSaving(true);
      console.log('ContactSelector: ===== STARTING CONTACT CREATION =====');
      console.log('ContactSelector: Starting contact creation:', contactData); // Debug log
      
      // Check if ContactModel is imported correctly
      console.log('ContactSelector: ContactModel class exists:', !!ContactModel);
      console.log('ContactSelector: ContactModel type:', typeof ContactModel);
      
      if (!ContactModel) {
        throw new Error('ContactModel is not imported or undefined');
      }
      
      // Immediate check - does ContactModel constructor work?
      console.log('ContactSelector: Testing ContactModel constructor with raw data...');
      console.log('ContactSelector: Data to pass to constructor:', JSON.stringify(contactData, null, 2));
      
      try {
        // Test with minimal data first
        console.log('ContactSelector: Testing with minimal data...');
        const minimalTest = new ContactModel({ first_name: 'Test' });
        console.log('ContactSelector: Minimal test SUCCESS');
        
        // Test with actual data
        console.log('ContactSelector: Testing with actual form data...');
        const testModel = new ContactModel(contactData);
        console.log('ContactSelector: ContactModel constructor SUCCESS');
        console.log('ContactSelector: Test model created:', testModel.getFullName());
        
        // Test validation immediately
        console.log('ContactSelector: Testing validation...');
        const validationResult = testModel.validate();
        console.log('ContactSelector: Validation result:', validationResult);
        
      } catch (constructorError) {
        console.error('ContactSelector: ContactModel constructor FAILED:', constructorError);
        console.error('ContactSelector: Constructor error details:', {
          message: constructorError instanceof Error ? constructorError.message : String(constructorError),
          stack: constructorError instanceof Error ? constructorError.stack : 'No stack'
        });
        throw new Error(`ContactModel constructor failed: ${constructorError}`);
      }
      
      // Normalize empty strings to null for validation
      const normalizedData = {
        ...contactData,
        last_name: contactData.last_name?.trim() || null,
        email: contactData.email?.trim() || null,
        phone: contactData.phone?.trim() || null,
        position: contactData.position?.trim() || null,
        linkedin_url: contactData.linkedin_url?.trim() || null,
        notes: contactData.notes?.trim() || null,
        company_id: contactData.company_id || null  // Ensure undefined becomes null
      };
      
      console.log('ContactSelector: Normalized contact data:', normalizedData);
      console.log('ContactSelector: company_id will be:', normalizedData.company_id, '(should be null since no companies exist)');
      
      // List all companies for debugging
      try {
        const allCompanies = await window.electronAPI.queryDatabase('SELECT * FROM companies', []);
        console.log('ContactSelector: All companies in database:', allCompanies);
        
        if (allCompanies.length === 0) {
          console.log('ContactSelector: No companies exist - this is expected for now');
          console.log('ContactSelector: company_id will be set to null, which should be fine');
        }
      } catch (companyError) {
        console.error('ContactSelector: Error querying companies:', companyError);
      }
      
      // Validate the contact data before sending to database
      try {
        console.log('ContactSelector: Creating ContactModel for validation...');
        const testContact = new ContactModel(normalizedData);
        console.log('ContactSelector: ContactModel created, running validation...');
        const validation = testContact.validate();
        console.log('ContactSelector: Validation result:', validation); // Debug log
        
        if (!validation.isValid) {
          console.log('ContactSelector: Validation failed:', validation.errors); // Debug log
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        console.log('ContactSelector: Validation passed successfully');
      } catch (validationError) {
        console.error('ContactSelector: Validation error:', validationError);
        const error = validationError instanceof Error ? validationError : new Error(String(validationError));
        console.error('ContactSelector: Validation error details:', {
          message: error.message,
          stack: error.stack
        });
        throw validationError;
      }
      
      // Create contact via IPC
      const now = new Date().toISOString();
      console.log('ContactSelector: Executing database query'); // Debug log
      
      // Log the exact values being inserted
      const insertValues = [
        normalizedData.first_name,
        normalizedData.last_name,
        normalizedData.email,
        normalizedData.phone,
        normalizedData.position,
        normalizedData.linkedin_url,
        normalizedData.notes,
        normalizedData.company_id || null,
        now,
        now
      ];
      console.log('ContactSelector: Insert values:', insertValues);
      
      // Check if company_id is valid if provided
      if (normalizedData.company_id) {
        console.log('ContactSelector: Checking if company_id exists:', normalizedData.company_id);
        try {
          const companyCheck = await window.electronAPI.queryDatabase(
            'SELECT id FROM companies WHERE id = ?',
            [normalizedData.company_id]
          );
          console.log('ContactSelector: Company check result:', companyCheck);
          
          if (companyCheck.length === 0) {
            console.error('ContactSelector: Invalid company_id - company does not exist');
            throw new Error(`Company with ID ${normalizedData.company_id} does not exist`);
          }
        } catch (companyCheckError) {
          console.error('ContactSelector: Error during company check:', companyCheckError);
          const errorMessage = companyCheckError instanceof Error ? companyCheckError.message : String(companyCheckError);
          throw new Error(`Failed to validate company: ${errorMessage}`);
        }
      }
      
      console.log('ContactSelector: About to execute INSERT query...');
      console.log('ContactSelector: window.electronAPI exists:', !!window.electronAPI);
      console.log('ContactSelector: executeQuery function exists:', !!window.electronAPI?.executeQuery);
      
      let result;
      try {
        console.log('ContactSelector: Calling window.electronAPI.executeQuery...');
        result = await window.electronAPI.executeQuery(
          `INSERT INTO contacts (first_name, last_name, email, phone, position, linkedin_url, notes, company_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          insertValues
        );
        console.log('ContactSelector: INSERT query completed successfully:', result);
      } catch (insertError) {
        console.error('ContactSelector: INSERT query failed:', insertError);
        const error = insertError instanceof Error ? insertError : new Error(String(insertError));
        console.error('ContactSelector: INSERT error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      console.log('ContactSelector: Database insert result:', result); // Debug log
      
      // Get the newly created contact
      const newContactResult = await window.electronAPI.queryDatabase(
        'SELECT * FROM contacts WHERE id = ?',
        [result.lastID]
      );
      
      console.log('ContactSelector: New contact query result:', newContactResult); // Debug log
      
      if (newContactResult.length > 0) {
        const newContact = ContactModel.fromJSON(newContactResult[0]);
        console.log('ContactSelector: Created contact model:', newContact); // Debug log
        
        // Reload contacts list
        console.log('ContactSelector: Reloading contacts list'); // Debug log
        await loadContacts();
        
        // Auto-select the newly created contact
        console.log('ContactSelector: Selecting new contact'); // Debug log
        setSelectedContact(newContact);
        onContactSelect(newContact);
        
        console.log('ContactSelector: Contact successfully created and selected'); // Debug log
        
        // Close the form
        setShowCreateForm(false);
        console.log('ContactSelector: Contact creation completed successfully'); // Debug log
      } else {
        throw new Error('Failed to retrieve newly created contact');
      }
    } catch (error) {
      console.error('ContactSelector: Error creating contact:', error);
      console.error('ContactSelector: Error stack:', (error as Error).stack);
      // Don't close the form on error, let the ContactForm handle it
      throw error; // Re-throw to prevent form from closing
    } finally {
      setSaving(false);
      console.log('ContactSelector: ===== CONTACT CREATION FINISHED =====');
      
      // Restore original error handlers
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    }
  };

  const handleCancelCreateForm = () => {
    console.log('ContactSelector: Cancel create form called');
    console.log('ContactSelector: Current showCreateForm state:', showCreateForm);
    setShowCreateForm(false);
    console.log('ContactSelector: showCreateForm set to false');
  };

  return (
    <div className={`contact-selector ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div className="selector-input-container">
          {selectedContact ? (
            <div className="selected-contact">
              <div className="contact-info">
                <div className="contact-name">{selectedContact.getFullName()}</div>
                {selectedContact.position && (
                  <div className="contact-position">{selectedContact.position}</div>
                )}
                {selectedContact.email && (
                  <div className="contact-email">{selectedContact.email}</div>
                )}
              </div>
              <div className="contact-actions">
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  disabled={disabled}
                  className="change-contact-btn"
                  title="Anderen Kontakt auswählen"
                >
                  <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={disabled}
                  className="clear-btn"
                  title="Auswahl aufheben"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className={`selector-input ${error ? 'error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="dropdown-btn"
              >
                <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="error-message">{error}</p>
        )}

        {isOpen && (
          <div className="dropdown-menu">
            {loading ? (
              <div className="dropdown-item loading">
                Kontakte werden geladen...
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCreateNewContact}
                  className="dropdown-item create-new"
                >
                  <svg className="create-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Neuen Kontakt erstellen
                </button>
                
                {filteredContacts.length === 0 ? (
                  <div className="dropdown-item no-results">
                    {searchQuery ? 'Keine Kontakte gefunden' : 'Keine Kontakte vorhanden'}
                  </div>
                ) : (
                  <>
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleContactSelect(contact)}
                        className="dropdown-item contact-item"
                      >
                        <div className="contact-details">
                          <div className="contact-name">{contact.getFullName()}</div>
                          {contact.position && (
                            <div className="contact-position">{contact.position}</div>
                          )}
                          <div className="contact-contact-info">
                            {contact.email && (
                              <span className="contact-email">📧 {contact.email}</span>
                            )}
                            {contact.phone && (
                              <span className="contact-phone">📞 {contact.getFormattedPhone()}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Contact Creation Modal */}
      {showCreateForm && (
        <div className="contact-creation-modal">
          <div className="modal-overlay" onClick={handleCancelCreateForm}></div>
          <div className="modal-content">
            <ErrorBoundary
              onError={(error, errorInfo) => {
                console.error('ErrorBoundary caught error in ContactForm:', error, errorInfo);
              }}
              fallback={
                <div className="contact-form-error">
                  <h3>Fehler beim Laden des Kontaktformulars</h3>
                  <p>Es gab ein Problem beim Laden des Formulars. Bitte schließen Sie das Fenster und versuchen Sie es erneut.</p>
                  <button onClick={handleCancelCreateForm} className="btn-secondary">
                    Schließen
                  </button>
                </div>
              }
            >
              <ContactForm
                onSave={handleSaveNewContact}
                onCancel={handleCancelCreateForm}
                isLoading={saving}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      <style>{`
        .contact-selector {
          position: relative;
        }

        .selector-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .selected-contact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 42px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
        }

        .selected-contact:hover {
          background: #f1f5f9;
        }

        .contact-info {
          flex: 1;
          margin-right: 8px;
        }

        .contact-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .change-contact-btn {
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          min-width: 24px;
          height: 24px;
        }

        .change-contact-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .change-contact-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .contact-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .contact-position {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .contact-email {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .clear-btn {
          padding: 4px 6px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          transition: all 0.2s;
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-btn:hover {
          background: #dc2626;
        }

        .clear-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .selector-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          outline: none;
          transition: all 0.2s;
        }

        .selector-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .selector-input.error {
          border-color: #dc2626;
        }

        .dropdown-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
        }

        .dropdown-btn:hover {
          color: #374151;
        }

        .dropdown-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .dropdown-icon {
          width: 16px;
          height: 16px;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          max-height: 300px;
          overflow-y: auto;
          margin-top: 4px;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-item:hover {
          background: #f9fafb;
        }

        .dropdown-item.loading,
        .dropdown-item.no-results {
          color: #6b7280;
          font-style: italic;
          cursor: default;
        }

        .dropdown-item.create-new {
          color: #3b82f6;
          font-weight: 500;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .create-icon {
          width: 16px;
          height: 16px;
        }

        .dropdown-item.contact-item {
          border-bottom: 1px solid #f3f4f6;
        }

        .dropdown-item.contact-item:last-child {
          border-bottom: none;
        }

        .contact-details .contact-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .contact-details .contact-position {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .contact-contact-info {
          display: flex;
          gap: 12px;
          margin-top: 4px;
          font-size: 0.75rem;
        }

        .contact-contact-info .contact-email,
        .contact-contact-info .contact-phone {
          color: #6b7280;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 4px;
        }

        /* Contact Creation Modal */
        .contact-creation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }

        .modal-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 1;
        }

        .contact-form-error {
          padding: 24px;
          text-align: center;
        }

        .contact-form-error h3 {
          color: #dc2626;
          margin-bottom: 12px;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .contact-form-error p {
          color: #6b7280;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .contact-form-error .btn-secondary {
          padding: 10px 20px;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-form-error .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        @media (max-width: 768px) {
          .modal-content {
            margin: 10px;
            max-width: none;
            width: calc(100vw - 20px);
          }
        }
      `}</style>
    </div>
  );
};
