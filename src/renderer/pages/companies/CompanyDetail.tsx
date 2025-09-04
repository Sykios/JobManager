import React, { useState, useEffect, useCallback } from 'react';
import { Company, Contact, Application } from '../../../types';
import { ContactModel } from '../../../models/Contact';
import { ApplicationModel } from '../../../models/Application';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StatusBadge } from '../../components/applications/StatusIndicators';

interface CompanyDetailProps {
  company?: Company;
  companyId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  company: propCompany,
  companyId,
  onNavigate
}) => {
  const [company, setCompany] = useState<Company | null>(propCompany || null);
  const [contacts, setContacts] = useState<ContactModel[]>([]);
  const [applications, setApplications] = useState<ApplicationModel[]>([]);
  const [loading, setLoading] = useState(!propCompany);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load company data if not provided via props
  useEffect(() => {
    if (!propCompany && companyId) {
      loadCompany(companyId);
    }
  }, [companyId, propCompany]);

  // Load related data when company is available
  useEffect(() => {
    if (company) {
      loadContacts();
      loadApplications();
    }
  }, [company]);

  const loadCompany = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const query = 'SELECT * FROM companies WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [id]);
      
      if (result && result.length > 0) {
        setCompany(result[0]);
      } else {
        setError('Unternehmen nicht gefunden');
      }
    } catch (err) {
      console.error('Error loading company:', err);
      setError('Fehler beim Laden des Unternehmens');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!company) return;

    try {
      setContactsLoading(true);
      const query = `
        SELECT * FROM contacts 
        WHERE company_id = ? 
        ORDER BY first_name ASC, last_name ASC
      `;
      const result = await window.electronAPI.queryDatabase(query, [company.id]);
      
      const contactModels = (result || []).map((row: any) => 
        ContactModel.fromJSON(row)
      );
      setContacts(contactModels);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!company) return;

    try {
      setApplicationsLoading(true);
      const query = `
        SELECT * FROM applications 
        WHERE company_id = ? 
        ORDER BY created_at DESC
      `;
      const result = await window.electronAPI.queryDatabase(query, [company.id]);
      
      const applicationModels = (result || []).map((row: any) => 
        ApplicationModel.fromJSON(row)
      );
      setApplications(applicationModels);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('companies');
    }
  };

  const handleEdit = () => {
    if (company && onNavigate) {
      onNavigate('companies', { editingCompany: company });
    }
  };

  const handleContactDetail = (contact: ContactModel) => {
    if (onNavigate) {
      onNavigate('contact-detail', { contact, contactId: contact.id });
    }
  };

  const handleApplicationDetail = (application: ApplicationModel) => {
    if (onNavigate) {
      onNavigate('application-detail', { application, applicationId: application.id });
    }
  };

  const handleCreateContact = () => {
    if (onNavigate && company) {
      onNavigate('contacts', { createContactForCompany: company.id });
    }
  };

  const handleCreateApplication = () => {
    if (onNavigate && company) {
      onNavigate('new-application', { preselectedCompany: company });
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

  if (error || !company) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Unternehmen nicht gefunden'}
          </h2>
          <p className="text-gray-600 mb-6">
            Das angeforderte Unternehmen konnte nicht geladen werden.
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
            <Button variant="primary" onClick={handleCreateApplication}>
              + Bewerbung erstellen
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {company.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            <div className="flex items-center gap-4 text-gray-600 mt-1">
              {company.industry && (
                <span className="flex items-center gap-1">
                  🏢 {company.industry}
                </span>
              )}
              {company.location && (
                <span className="flex items-center gap-1">
                  📍 {company.location}
                </span>
              )}
              {company.size && (
                <span className="flex items-center gap-1">
                  👥 {company.size}
                </span>
              )}
            </div>
          </div>
        </div>

        {company.website && (
          <div className="mb-4">
            <a 
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
            >
              🌐 {company.website}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {company.description && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Beschreibung</h3>
            <p className="text-gray-700 whitespace-pre-line">{company.description}</p>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contacts Section */}
        <div>
          <Card className="p-6">
            <CardHeader
              title={`Kontakte (${contacts.length})`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateContact}
                >
                  + Kontakt hinzufügen
                </Button>
              }
            />
            <CardBody>
              {contactsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : contacts.length > 0 ? (
                <div className="space-y-4">
                  {contacts.map(contact => (
                    <div 
                      key={contact.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleContactDetail(contact)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {contact.getInitials()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{contact.getFullName()}</h4>
                            {contact.position && (
                              <p className="text-sm text-gray-600">{contact.position}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  📧 {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  📞 {contact.getFormattedPhone()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Kontakte</h3>
                  <p className="text-gray-600 mb-4">
                    Fügen Sie Kontakte für dieses Unternehmen hinzu, um sie hier zu sehen.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleCreateContact}>
                    Ersten Kontakt hinzufügen
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Applications Section */}
        <div>
          <Card className="p-6">
            <CardHeader
              title={`Bewerbungen (${applications.length})`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateApplication}
                >
                  + Bewerbung erstellen
                </Button>
              }
            />
            <CardBody>
              {applicationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map(application => (
                    <div 
                      key={application.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleApplicationDetail(application)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{application.title}</h4>
                            <StatusBadge status={application.status} size="sm" />
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{application.position}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {application.application_date && (
                              <span>
                                📅 {new Date(application.application_date).toLocaleDateString('de-DE')}
                              </span>
                            )}
                            {application.salary_range && (
                              <span>💰 {application.salary_range}</span>
                            )}
                            {application.location && (
                              <span>📍 {application.location}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bewerbungen</h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie eine Bewerbung für dieses Unternehmen.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleCreateApplication}>
                    Erste Bewerbung erstellen
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-8">
        <Card className="p-6">
          <CardHeader title="Zusätzliche Informationen" />
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
                <div className="text-sm text-gray-600">Kontakte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{applications.length}</div>
                <div className="text-sm text-gray-600">Bewerbungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {applications.filter(app => app.status === 'applied' || app.status === 'in-review').length}
                </div>
                <div className="text-sm text-gray-600">Aktive Bewerbungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {new Date(company.created_at).toLocaleDateString('de-DE')}
                </div>
                <div className="text-sm text-gray-600">Hinzugefügt am</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
