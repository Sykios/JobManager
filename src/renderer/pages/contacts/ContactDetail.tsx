import React, { useState, useEffect, useCallback } from 'react';
import { Contact, Company, Application } from '../../../types';
import { ContactModel } from '../../../models/Contact';
import { ApplicationModel } from '../../../models/Application';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { StatusBadge } from '../../components/applications/StatusIndicators';
import { useNavigation } from '../../context/NavigationContext';

interface ContactDetailProps {
  contact?: Contact;
  contactId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contact: propContact,
  contactId,
  onNavigate
}) => {
  const { goBack, canGoBack } = useNavigation();
  const [contact, setContact] = useState<ContactModel | null>(
    propContact ? ContactModel.fromJSON(propContact) : null
  );
  const [company, setCompany] = useState<Company | null>(null);
  const [applications, setApplications] = useState<ApplicationModel[]>([]);
  const [loading, setLoading] = useState(!propContact);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contact data if not provided via props
  useEffect(() => {
    if (!propContact && contactId) {
      loadContact(contactId);
    }
  }, [contactId, propContact]);

  // Load related data when contact is available
  useEffect(() => {
    if (contact) {
      loadCompany();
      loadApplications();
    }
  }, [contact]);

  const loadContact = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const query = 'SELECT * FROM contacts WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [id]);
      
      if (result && result.length > 0) {
        setContact(ContactModel.fromJSON(result[0]));
      } else {
        setError('Kontakt nicht gefunden');
      }
    } catch (err) {
      console.error('Error loading contact:', err);
      setError('Fehler beim Laden des Kontakts');
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    if (!contact?.company_id) {
      setCompanyLoading(false);
      return;
    }

    try {
      setCompanyLoading(true);
      const query = 'SELECT * FROM companies WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [contact.company_id]);
      
      if (result && result.length > 0) {
        setCompany(result[0]);
      }
    } catch (err) {
      console.error('Error loading company:', err);
    } finally {
      setCompanyLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!contact) return;

    try {
      setApplicationsLoading(true);
      
      // Load applications where this contact is directly associated
      const directQuery = `
        SELECT * FROM applications 
        WHERE contact_id = ? 
        ORDER BY created_at DESC
      `;
      const directResult = await window.electronAPI.queryDatabase(directQuery, [contact.id]);
      
      // Load applications for the same company
      let companyResult: any[] = [];
      if (contact.company_id) {
        const companyQuery = `
          SELECT * FROM applications 
          WHERE company_id = ? AND contact_id != ? 
          ORDER BY created_at DESC
        `;
        companyResult = await window.electronAPI.queryDatabase(companyQuery, [contact.company_id, contact.id]);
      }
      
      const allApplications = [...directResult, ...companyResult];
      const applicationModels = allApplications.map((row: any) => 
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
    if (canGoBack) {
      goBack();
    } else if (onNavigate) {
      // Fallback to contacts page if no history
      onNavigate('contacts');
    }
  };

  const handleEdit = () => {
    if (contact && onNavigate) {
      onNavigate('contacts', { editingContact: contact });
    }
  };

  const handleCompanyDetail = () => {
    if (company && onNavigate) {
      onNavigate('company-detail', { company, companyId: company.id });
    }
  };

  const handleApplicationDetail = (application: ApplicationModel) => {
    if (onNavigate) {
      onNavigate('application-detail', { application, applicationId: application.id });
    }
  };

  const handleCreateApplication = () => {
    if (onNavigate && contact) {
      const data: any = { preselectedContact: contact };
      if (company) {
        data.preselectedCompany = company;
      }
      onNavigate('new-application', data);
    }
  };

  const handleEmailContact = () => {
    if (contact?.email) {
      window.open(`mailto:${contact.email}`, '_blank');
    }
  };

  const handleCallContact = () => {
    if (contact?.phone) {
      window.open(`tel:${contact.phone}`, '_blank');
    }
  };

  const handleLinkedInProfile = () => {
    if (contact?.linkedin_url) {
      window.open(contact.linkedin_url, '_blank');
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

  if (error || !contact) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Kontakt nicht gefunden'}
          </h2>
          <p className="text-gray-600 mb-6">
            Der angeforderte Kontakt konnte nicht geladen werden.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  const directApplications = applications.filter(app => app.contact_id === contact.id);
  const companyApplications = applications.filter(app => app.contact_id !== contact.id);

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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-green-600">
              {contact.getInitials()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contact.getFullName()}</h1>
            <div className="flex items-center gap-4 text-gray-600 mt-1">
              {contact.position && (
                <span className="flex items-center gap-1">
                  💼 {contact.position}
                </span>
              )}
              {company && (
                <span 
                  className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                  onClick={handleCompanyDetail}
                >
                  🏢 {company.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-3 mb-6">
          {contact.email && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEmailContact}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            >
              {contact.email}
            </Button>
          )}
          {contact.phone && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCallContact}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            >
              {contact.getFormattedPhone()}
            </Button>
          )}
          {contact.linkedin_url && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLinkedInProfile}
              leftIcon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              }
            >
              LinkedIn
            </Button>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Notizen</h3>
            <p className="text-gray-700 whitespace-pre-line">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Direct Applications */}
        <div>
          <Card className="p-6">
            <CardHeader
              title={`Direkte Bewerbungen (${directApplications.length})`}
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
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : directApplications.length > 0 ? (
                <div className="space-y-4">
                  {directApplications.map(application => (
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine direkten Bewerbungen</h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie eine Bewerbung mit diesem Kontakt.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleCreateApplication}>
                    Erste Bewerbung erstellen
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Company Information & Related Applications */}
        <div className="space-y-6">
          {/* Company Card */}
          {company && (
            <Card className="p-6">
              <CardHeader title="Unternehmen" />
              <CardBody>
                <div 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={handleCompanyDetail}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600">
                          {company.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{company.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {company.industry && <span>🏢 {company.industry}</span>}
                          {company.location && <span>📍 {company.location}</span>}
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
              </CardBody>
            </Card>
          )}

          {/* Other Company Applications */}
          {companyApplications.length > 0 && (
            <Card className="p-6">
              <CardHeader title={`Weitere Bewerbungen bei ${company?.name || 'diesem Unternehmen'} (${companyApplications.length})`} />
              <CardBody>
                <div className="space-y-3">
                  {companyApplications.map(application => (
                    <div 
                      key={application.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleApplicationDetail(application)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-sm font-medium text-gray-900">{application.title}</h5>
                            <StatusBadge status={application.status} size="sm" />
                          </div>
                          <p className="text-xs text-gray-600">{application.position}</p>
                        </div>
                        <div className="text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8">
        <Card className="p-6">
          <CardHeader title="Statistiken" />
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{directApplications.length}</div>
                <div className="text-sm text-gray-600">Direkte Bewerbungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {directApplications.filter(app => app.status === 'applied' || app.status === 'in-review').length}
                </div>
                <div className="text-sm text-gray-600">Aktive Bewerbungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{companyApplications.length}</div>
                <div className="text-sm text-gray-600">Weitere bei Unternehmen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {new Date(contact.created_at).toLocaleDateString('de-DE')}
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
