import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, Contact } from '../../../types';
import { StatusTimeline } from '../../components/applications/StatusTimeline';
import { StatusChanger } from '../../components/applications/StatusChanger';
import { StatusBadge } from '../../components/applications/StatusIndicators';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FileList } from '../../components/files/FileList';
import { ContactCard } from '../../components/contacts/ContactCard';
import { StatusHistoryModel } from '../../../models/StatusHistory';
import { FileModel } from '../../../models/File';
import { ContactModel } from '../../../models/Contact';

interface ApplicationDetailProps {
  application?: Application;
  applicationId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ 
  application: propApplication,
  applicationId, 
  onNavigate 
}) => {
  const [application, setApplication] = useState<Application | null>(propApplication || null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryModel[]>([]);
  const [files, setFiles] = useState<FileModel[]>([]);
  const [contacts, setContacts] = useState<ContactModel[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(!propApplication);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Load application data if not provided via props
  useEffect(() => {
    if (!propApplication && applicationId) {
      loadApplication(applicationId);
    }
  }, [applicationId, propApplication]);

  // Load related data when application is available
  useEffect(() => {
    if (application) {
      loadStatusHistory();
      loadFiles();
      loadContacts();
      loadCompanyName();
      setNotes(application.notes || '');
    }
  }, [application]);

  const loadApplication = async (id: number) => {
    try {
      setLoading(true);
      const query = 'SELECT * FROM applications WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [id]);
      
      if (result && result.length > 0) {
        setApplication(result[0]);
      } else {
        setError('Bewerbung nicht gefunden');
      }
    } catch (err) {
      console.error('Error loading application:', err);
      setError('Fehler beim Laden der Bewerbung');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyName = async () => {
    if (!application?.company_id) return;

    try {
      const query = 'SELECT name FROM companies WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [application.company_id]);
      
      if (result && result.length > 0) {
        setCompanyName(result[0].name);
      }
    } catch (err) {
      console.error('Error loading company name:', err);
    }
  };

  const loadStatusHistory = async () => {
    if (!application) return;

    try {
      const query = `
        SELECT * FROM status_history 
        WHERE application_id = ? 
        ORDER BY created_at DESC
      `;
      const result = await window.electronAPI.queryDatabase(query, [application.id]);
      
      const historyModels = (result || []).map((row: any) => 
        StatusHistoryModel.fromJSON(row)
      );
      setStatusHistory(historyModels);
    } catch (err) {
      console.error('Error loading status history:', err);
    }
  };

  const loadFiles = async () => {
    if (!application) return;

    try {
      const query = `
        SELECT * FROM files 
        WHERE application_id = ? 
        ORDER BY upload_date DESC
      `;
      const result = await window.electronAPI.queryDatabase(query, [application.id]);
      
      const fileModels = (result || []).map((row: any) => 
        FileModel.fromJSON(row)
      );
      setFiles(fileModels);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const loadContacts = async () => {
    if (!application?.company_id) return;

    try {
      const query = `
        SELECT * FROM contacts 
        WHERE company_id = ? 
        ORDER BY first_name ASC, last_name ASC
      `;
      const result = await window.electronAPI.queryDatabase(query, [application.company_id]);
      
      const contactModels = (result || []).map((row: any) => 
        new ContactModel(row)
      );
      setContacts(contactModels);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus, note?: string) => {
    if (!application) return;

    try {
      // Update application status
      const updateQuery = `
        UPDATE applications 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await window.electronAPI.executeQuery(updateQuery, [newStatus, application.id]);

      // Add status history entry with note if provided
      if (note) {
        const historyQuery = `
          INSERT INTO status_history (application_id, from_status, to_status, note, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await window.electronAPI.executeQuery(historyQuery, [
          application.id,
          application.status,
          newStatus,
          note
        ]);
      }

      // Update local state
      setApplication({ ...application, status: newStatus });
      await loadStatusHistory();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Fehler beim Aktualisieren des Status');
    }
  };

  const handleNotesUpdate = async () => {
    if (!application) return;

    try {
      const query = `
        UPDATE applications 
        SET notes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await window.electronAPI.executeQuery(query, [notes, application.id]);
      
      setApplication({ ...application, notes });
      alert('Notizen gespeichert');
    } catch (err) {
      console.error('Error updating notes:', err);
      alert('Fehler beim Speichern der Notizen');
    }
  };

  const handleEdit = () => {
    if (application && onNavigate) {
      onNavigate('application-edit', { application });
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('applications');
    }
  };

  const handleCompanyClick = () => {
    if (application?.company_id && onNavigate) {
      onNavigate('company-detail', { companyId: application.company_id });
    }
  };

  const handleContactClick = (contact: ContactModel) => {
    if (onNavigate) {
      onNavigate('contact-detail', { contactId: contact.id });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Bewerbung nicht gefunden'}
          </h2>
          <p className="text-gray-600 mb-6">
            Die angeforderte Bewerbung konnte nicht geladen werden.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Button
              variant="ghost"
              onClick={handleBack}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Zurück
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleEdit}>
              Bearbeiten
            </Button>
            <StatusChanger
              currentStatus={application.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{application.title}</h1>
          <StatusBadge status={application.status} size="md" />
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          <button
            onClick={handleCompanyClick}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors duration-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:no-underline"
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              fontSize: 'inherit', 
              fontFamily: 'inherit', 
              textAlign: 'left' 
            }}
            disabled={!application.company_id}
          >
            {companyName || 'Unbekanntes Unternehmen'}
          </button>
          <span>•</span>
          <span>{application.location}</span>
          {application.salary_range && (
            <>
              <span>•</span>
              <span>{application.salary_range}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Application Details */}
          <Card title="Bewerbungsdetails" className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bewerbungsdatum
                </label>
                <p className="text-gray-900">
                  {application.application_date 
                    ? new Date(application.application_date).toLocaleDateString('de-DE')
                    : 'Nicht angegeben'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bewerbungskanal
                </label>
                <p className="text-gray-900">{application.application_channel || 'Online'}</p>
              </div>

              {application.job_url && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stellenausschreibung
                  </label>
                  <a 
                    href={application.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {application.job_url}
                  </a>
                </div>
              )}

              {application.requirements && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Anforderungen
                  </label>
                  <p className="text-gray-900 whitespace-pre-line">
                    {application.requirements}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Notes Section */}
          <Card title="Notizen" className="p-6">
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ihre Notizen zu dieser Bewerbung..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleNotesUpdate}
                  disabled={notes === (application.notes || '')}
                >
                  Notizen speichern
                </Button>
              </div>
            </div>
          </Card>

          {/* Files Section */}
          <Card title={`Dateien (${files.length})`} className="p-6">
            {files.length > 0 ? (
              <FileList
                files={files}
                showFilters={files.length > 5}
                compact={true}
                className="mt-4"
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📁</div>
                <p>Noch keine Dateien hochgeladen</p>
                <p className="text-sm">Laden Sie Lebenslauf, Anschreiben und andere Dokumente hoch</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Status & Contacts */}
        <div className="space-y-8">
          {/* Status Timeline */}
          <Card title="Status-Verlauf" className="p-6">
            <StatusTimeline
              history={statusHistory}
              showNotes={true}
              className="mt-4"
            />
          </Card>

          {/* Contacts */}
          {contacts.length > 0 && (
            <Card title={`Ansprechpartner (${contacts.length})`} className="p-6">
              <div className="space-y-4 mt-4">
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="cursor-pointer transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg rounded-lg"
                    style={{ borderRadius: '8px' }}
                  >
                    <ContactCard
                      contact={contact}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Stats */}
          <Card title="Statistiken" className="p-6">
            <div className="space-y-4 mt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Bewerbung erstellt</span>
                <span className="font-medium">
                  {new Date(application.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Letztes Update</span>
                <span className="font-medium">
                  {new Date(application.updated_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status-Änderungen</span>
                <span className="font-medium">{statusHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Angehängte Dateien</span>
                <span className="font-medium">{files.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
