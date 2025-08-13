import React, { useState, useEffect, useCallback } from 'react';
import { ContactModel } from '../models/Contact';
import { ContactService, ContactFilters, ContactCreateData, ContactUpdateData, ContactStatistics } from '../services/ContactService';
import { ContactForm } from '../components/ContactForm';
import { ContactList } from '../components/ContactList';
import { SearchInput } from '../renderer/components/common/SearchFilter';
import { Layout } from '../renderer/components/layout/Layout';

interface ContactsPageProps {
  contactService: ContactService;
  currentPage: 'contacts';
  onPageChange: (page: any) => void;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ contactService, currentPage, onPageChange }) => {
  // State management
  const [contacts, setContacts] = useState<ContactModel[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactModel[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactModel | null>(null);
  const [statistics, setStatistics] = useState<ContactStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({});
  const [showStatistics, setShowStatistics] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ contacts: ContactModel[]; reason: string }>>([]);

  // Load contacts and statistics
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [contactsData, statisticsData] = await Promise.all([
        contactService.getAll(filters),
        contactService.getStatistics()
      ]);
      
      setContacts(contactsData);
      setStatistics(statisticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kontakte');
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [contactService, filters]);

  // Load duplicates
  const loadDuplicates = useCallback(async () => {
    try {
      const duplicatesData = await contactService.findPotentialDuplicates();
      setDuplicates(duplicatesData);
    } catch (err) {
      console.error('Error loading duplicates:', err);
    }
  }, [contactService]);

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => {
      return (
        contact.getFullName().toLowerCase().includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        (contact.phone && contact.phone.includes(query)) ||
        (contact.position && contact.position.toLowerCase().includes(query)) ||
        (contact.notes && contact.notes.toLowerCase().includes(query))
      );
    });
    
    setFilteredContacts(filtered);
  }, [contacts, searchQuery]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Load duplicates when requested
  useEffect(() => {
    if (showDuplicates && duplicates.length === 0) {
      loadDuplicates();
    }
  }, [showDuplicates, duplicates.length, loadDuplicates]);

  // Handlers
  const handleCreateContact = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  const handleEditContact = (contact: ContactModel) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDeleteContact = async (contact: ContactModel) => {
    if (!confirm(`Sind Sie sicher, dass Sie ${contact.getFullName()} löschen möchten?`)) {
      return;
    }

    try {
      setSaving(true);
      await contactService.delete(contact.id!);
      await loadContacts();
      
      if (selectedContact?.id === contact.id) {
        setSelectedContact(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Kontakts');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async (data: ContactCreateData | ContactUpdateData) => {
    try {
      setSaving(true);
      setError('');

      if (editingContact) {
        await contactService.update(editingContact.id!, data as ContactUpdateData);
      } else {
        await contactService.create(data as ContactCreateData);
      }

      await loadContacts();
      setShowForm(false);
      setEditingContact(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Kontakts');
      throw err; // Re-throw to prevent form from closing
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setError('');
  };

  const handleSelectContact = (contact: ContactModel) => {
    setSelectedContact(selectedContact?.id === contact.id ? null : contact);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleExportCSV = async () => {
    try {
      const csv = await contactService.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kontakte_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Fehler beim Exportieren der Kontakte');
    }
  };

  // Statistics summary
  const renderStatisticsSummary = () => {
    if (!statistics) return null;

    return (
      <div className="statistics-summary">
        <div className="stat-item">
          <span className="stat-value">{statistics.total}</span>
          <span className="stat-label">Gesamt</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{statistics.withEmail}</span>
          <span className="stat-label">Mit E-Mail</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{statistics.withPhone}</span>
          <span className="stat-label">Mit Telefon</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{statistics.withLinkedIn}</span>
          <span className="stat-label">Mit LinkedIn</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{statistics.recentContacts}</span>
          <span className="stat-label">Neue (30 Tage)</span>
        </div>
      </div>
    );
  };

  // Render duplicates panel
  const renderDuplicatesPanel = () => {
    if (!showDuplicates) return null;

    return (
      <div className="duplicates-panel">
        <div className="duplicates-header">
          <h3>Mögliche Duplikate ({duplicates.length})</h3>
          <button
            type="button"
            onClick={() => setShowDuplicates(false)}
            className="close-btn"
          >
            ✕
          </button>
        </div>
        
        {duplicates.length === 0 ? (
          <p className="no-duplicates">Keine Duplikate gefunden!</p>
        ) : (
          <div className="duplicates-list">
            {duplicates.map((group, index) => (
              <div key={index} className="duplicate-group">
                <div className="duplicate-reason">{group.reason}</div>
                <div className="duplicate-contacts">
                  {group.contacts.map(contact => (
                    <div key={contact.id} className="duplicate-contact">
                      <span className="contact-name">{contact.getFullName()}</span>
                      <span className="contact-details">
                        {contact.email && `📧 ${contact.email}`}
                        {contact.phone && ` 📞 ${contact.getFormattedPhone()}`}
                      </span>
                      <div className="contact-actions">
                        <button
                          type="button"
                          onClick={() => handleEditContact(contact)}
                          className="action-btn edit"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact)}
                          className="action-btn delete"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout currentPage={currentPage} onPageChange={onPageChange}>
      <div className="contacts-page">
        {/* Page Title */}
        <div className="page-title">
          <h1>Kontakte</h1>
          <p>Kontakte verwalten und organisieren</p>
        </div>
        {/* Header with actions */}
        <div className="page-header">
          <div className="header-actions">
            <button
              type="button"
              onClick={handleCreateContact}
              className="btn-primary"
              disabled={saving}
            >
              📋 Neuer Kontakt
            </button>
            <button
              type="button"
              onClick={() => setShowStatistics(!showStatistics)}
              className="btn-secondary"
            >
              📊 Statistiken
            </button>
            <button
              type="button"
              onClick={() => setShowDuplicates(!showDuplicates)}
              className="btn-secondary"
            >
              👥 Duplikate ({duplicates.length})
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary"
            >
              📤 CSV Export
            </button>
          </div>
          
          {renderStatisticsSummary()}
        </div>

        {/* Error message */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="close-error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="search-section">
          <SearchInput
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Kontakte durchsuchen..."
          />
        </div>

        {/* Statistics panel */}
        {showStatistics && statistics && (
          <div className="statistics-panel">
            <h3>Kontakt-Statistiken</h3>
            <div className="statistics-grid">
              <div className="stat-card">
                <h4>Kontaktmethoden</h4>
                <div className="stat-list">
                  <div className="stat-row">
                    <span>Mit E-Mail-Adresse:</span>
                    <span>{statistics.withEmail} ({Math.round((statistics.withEmail / statistics.total) * 100)}%)</span>
                  </div>
                  <div className="stat-row">
                    <span>Mit Telefonnummer:</span>
                    <span>{statistics.withPhone} ({Math.round((statistics.withPhone / statistics.total) * 100)}%)</span>
                  </div>
                  <div className="stat-row">
                    <span>Mit LinkedIn Profil:</span>
                    <span>{statistics.withLinkedIn} ({Math.round((statistics.withLinkedIn / statistics.total) * 100)}%)</span>
                  </div>
                  <div className="stat-row">
                    <span>Mit Unternehmen:</span>
                    <span>{statistics.withCompany} ({Math.round((statistics.withCompany / statistics.total) * 100)}%)</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <h4>Häufigste Positionen</h4>
                <div className="stat-list">
                  {Object.entries(statistics.byPosition).slice(0, 5).map(([position, count]) => (
                    <div key={position} className="stat-row">
                      <span>{position}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicates panel */}
        {renderDuplicatesPanel()}

        {/* Main content area */}
        <div className="main-content">
          {/* Contact form */}
          {showForm && (
            <div className="form-overlay">
              <div className="form-container">
                <ContactForm
                  contact={editingContact || undefined}
                  onSave={handleSaveContact}
                  onCancel={handleCancelForm}
                  isLoading={saving}
                />
              </div>
            </div>
          )}

          {/* Contact list */}
          <ContactList
            contacts={filteredContacts}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onSelect={handleSelectContact}
            selectedContactId={selectedContact?.id}
            loading={loading}
            error={error}
            emptyMessage={searchQuery ? 'Keine Kontakte entsprechen der Suche' : 'Noch keine Kontakte vorhanden. Erstellen Sie Ihren ersten Kontakt!'}
            showActions={true}
          />
        </div>

        <style>{`
          .contacts-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .page-title {
            margin-bottom: 24px;
          }

          .page-title h1 {
            margin: 0 0 8px 0;
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
          }

          .page-title p {
            margin: 0;
            color: #6b7280;
            font-size: 1.125rem;
          }

          .page-header {
            margin-bottom: 24px;
          }

          .header-actions {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }

          .btn-primary,
          .btn-secondary {
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .btn-primary {
            background-color: #3b82f6;
            color: white;
            border-color: #3b82f6;
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
            border-color: #d1d5db;
          }

          .btn-secondary:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }

          .statistics-summary {
            display: flex;
            gap: 24px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            flex-wrap: wrap;
          }

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
          }

          .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .error-banner {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .close-error {
            background: none;
            border: none;
            color: #dc2626;
            cursor: pointer;
            font-size: 1.25rem;
            padding: 0;
          }

          .search-section {
            margin-bottom: 24px;
          }

          .statistics-panel {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .statistics-panel h3 {
            margin: 0 0 16px 0;
            color: #1f2937;
            font-size: 1.25rem;
          }

          .statistics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }

          .stat-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
          }

          .stat-card h4 {
            margin: 0 0 12px 0;
            color: #374151;
            font-size: 1rem;
          }

          .stat-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .stat-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
          }

          .duplicates-panel {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
          }

          .duplicates-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .duplicates-header h3 {
            margin: 0;
            color: #a16207;
          }

          .close-btn {
            background: none;
            border: none;
            color: #a16207;
            cursor: pointer;
            font-size: 1.25rem;
            padding: 0;
          }

          .no-duplicates {
            color: #16a34a;
            font-weight: 500;
            margin: 0;
          }

          .duplicates-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .duplicate-group {
            background: white;
            border-radius: 6px;
            padding: 16px;
          }

          .duplicate-reason {
            font-weight: 500;
            color: #a16207;
            margin-bottom: 12px;
            font-size: 0.875rem;
          }

          .duplicate-contacts {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .duplicate-contact {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f9fafb;
            border-radius: 4px;
          }

          .contact-name {
            font-weight: 500;
            color: #1f2937;
          }

          .contact-details {
            font-size: 0.75rem;
            color: #6b7280;
            flex-grow: 1;
            margin-left: 12px;
          }

          .contact-actions {
            display: flex;
            gap: 8px;
          }

          .action-btn {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            cursor: pointer;
            border: 1px solid;
          }

          .action-btn.edit {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }

          .action-btn.delete {
            background: #dc2626;
            color: white;
            border-color: #dc2626;
          }

          .form-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
          }

          .form-container {
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
          }

          @media (max-width: 768px) {
            .contacts-page {
              padding: 12px;
            }

            .header-actions {
              flex-direction: column;
            }

            .statistics-summary {
              flex-direction: column;
              gap: 12px;
            }

            .stat-item {
              flex-direction: row;
              justify-content: space-between;
            }

            .statistics-grid {
              grid-template-columns: 1fr;
            }

            .duplicate-contact {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
            }

            .contact-actions {
              justify-content: flex-end;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default ContactsPage;
