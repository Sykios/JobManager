import React, { useState, useEffect } from 'react';
import { ContactService } from '../services/ContactService';
import { ContactModel } from '../models/Contact';
import { ContactsPage } from '../pages/ContactsPage';
import { ContactForm } from '../components/ContactForm';
import { ContactApplicationManager } from '../components/ContactApplicationManager';
import { Application, Company } from '../types';
import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

interface ContactManagementDemoProps {
  db: Database<sqlite3.Database, sqlite3.Statement>;
}

export const ContactManagementDemo: React.FC<ContactManagementDemoProps> = ({ db }) => {
  const [contactService] = useState(() => new ContactService(db));
  const [currentView, setCurrentView] = useState<'overview' | 'contacts' | 'form' | 'integration'>('overview');
  const [sampleContacts, setSampleContacts] = useState<ContactModel[]>([]);
  const [sampleApplication, setSampleApplication] = useState<Application | null>(null);
  const [demoInitialized, setDemoInitialized] = useState(false);

  // Initialize demo data
  useEffect(() => {
    const initializeDemo = async () => {
      if (demoInitialized) return;

      try {
        await contactService.initializeTable();

        // Create sample contacts
        const sampleContactData = [
          {
            first_name: 'Max',
            last_name: 'Mustermann',
            email: 'max.mustermann@techcorp.de',
            phone: '030 123 456789',
            position: 'Personalleiter',
            linkedin_url: 'https://linkedin.com/in/maxmustermann',
            notes: 'Sehr freundlich und hilfsbereit. Bevorzugt E-Mail-Kommunikation.',
            company_id: 1
          },
          {
            first_name: 'Julia',
            last_name: 'Schmidt',
            email: 'j.schmidt@innovate-gmbh.de',
            phone: '040 987 654321',
            position: 'Senior Developer',
            linkedin_url: 'https://linkedin.com/in/juliaschmi',
            notes: 'Technische Ansprechpartnerin für Development-Fragen.',
            company_id: 2
          },
          {
            first_name: 'Thomas',
            last_name: 'Weber',
            email: 'thomas.weber@startup-hub.com',
            phone: '089 555 123456',
            position: 'CTO',
            notes: 'Sehr interessiert an neuen Technologien. Schnelle Entscheidungen.',
            company_id: 3
          },
          {
            first_name: 'Anna',
            last_name: 'Müller',
            email: 'anna.mueller@consulting-plus.de',
            position: 'HR Business Partner',
            linkedin_url: 'https://linkedin.com/in/annamueller',
            notes: 'Organisiert alle Bewerbungsgespräche. Sehr strukturiert.',
            company_id: 1
          },
          {
            first_name: 'Michael',
            last_name: 'Schneider',
            phone: '0175 987654321',
            position: 'Team Lead Frontend',
            notes: 'Bevorzugt Telefonate. Sehr entspannte Arbeitsweise.',
            company_id: 2
          }
        ];

        const createdContacts = [];
        for (const contactData of sampleContactData) {
          try {
            const contact = await contactService.create(contactData);
            createdContacts.push(contact);
          } catch (error) {
            console.log('Contact might already exist, trying to find existing one');
          }
        }

        // Get all contacts (including potentially existing ones)
        const allContacts = await contactService.getAll();
        setSampleContacts(allContacts);

        // Create sample application for integration demo
        const sampleApp: Application = {
          id: 1,
          title: 'Senior Frontend Developer',
          company_id: 1,
          contact_id: allContacts.length > 0 ? allContacts[0].id : undefined,
          position: 'Senior Frontend Developer',
          location: 'Berlin',
          remote_possible: true,
          priority: 3,
          status: 'applied',
          application_date: new Date().toISOString().split('T')[0],
          notes: 'Bewerbung über LinkedIn gesendet. Sehr interessante Position.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setSampleApplication(sampleApp);

        setDemoInitialized(true);
      } catch (error) {
        console.error('Error initializing demo:', error);
      }
    };

    initializeDemo();
  }, [contactService, demoInitialized]);

  const handleContactSave = async (data: any) => {
    try {
      const contact = await contactService.create(data);
      setSampleContacts(prev => [...prev, contact]);
      setCurrentView('overview');
    } catch (error) {
      console.error('Error saving contact:', error);
      throw error;
    }
  };

  const handleContactCancel = () => {
    setCurrentView('overview');
  };

  const handlePageChange = (page: any) => {
    console.log('Page changed to:', page);
  };

  const renderOverview = () => (
    <div className="demo-overview">
      <div className="demo-header">
        <h1>🏢 Kontaktverwaltung - Demo</h1>
        <p className="demo-description">
          Erleben Sie die vollständige Kontaktverwaltung mit allen Features des JobManager Systems.
        </p>
      </div>

      <div className="demo-features">
        <div className="feature-section">
          <h2>📋 Implementierte Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>🧑‍💼 Kontaktmodell</h3>
              <p>Vollständiges Kontaktmodell mit Validierung, Formatierung und Suchfunktionen</p>
              <ul>
                <li>Umfassende Validierung aller Felder</li>
                <li>Deutsche Telefonnummer-Formatierung</li>
                <li>E-Mail und LinkedIn URL Validierung</li>
                <li>Suchfunktionen und Relevanz-Scoring</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🔧 ContactService</h3>
              <p>Vollständige CRUD-Operationen mit erweiterten Funktionen</p>
              <ul>
                <li>Erweiterte Suchfilter und Sortierung</li>
                <li>Duplikatserkennung</li>
                <li>Statistiken und Analytics</li>
                <li>CSV Export und Bulk-Operationen</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🎨 UI Komponenten</h3>
              <p>Benutzerfreundliche und responsive Kontakt-Komponenten</p>
              <ul>
                <li>ContactForm mit Echtzeit-Validierung</li>
                <li>ContactCard mit interaktiven Features</li>
                <li>ContactList mit Sortierung und Filterung</li>
                <li>Mobile-optimiertes Design</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>📄 Kontakte Seite</h3>
              <p>Vollständige Kontaktverwaltung mit allen Management-Features</p>
              <ul>
                <li>Erweiterte Suche und Filterung</li>
                <li>Statistiken und Duplikatserkennung</li>
                <li>CSV Export Funktionalität</li>
                <li>Modal-basierte Kontakt-Bearbeitung</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🔗 Application Integration</h3>
              <p>Nahtlose Integration mit dem Bewerbungsmanagement</p>
              <ul>
                <li>ContactSelector für einfache Auswahl</li>
                <li>ContactApplicationManager</li>
                <li>Verwandte Kontakte anzeigen</li>
                <li>Interaktions-Tracking</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🌍 Deutsche Lokalisierung</h3>
              <p>Vollständig auf Deutsch lokalisiert</p>
              <ul>
                <li>Deutsche UI-Texte und Fehlermeldungen</li>
                <li>Lokalisierte Datumsformate</li>
                <li>Deutsche Telefonnummer-Formatierung</li>
                <li>Kulturspezifische Validierung</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="demo-navigation">
          <h2>🎯 Demo Bereiche erkunden</h2>
          <div className="nav-buttons">
            <button
              onClick={() => setCurrentView('contacts')}
              className="demo-nav-btn primary"
            >
              📱 Kontakte Seite öffnen
            </button>
            <button
              onClick={() => setCurrentView('form')}
              className="demo-nav-btn secondary"
            >
              📝 Kontakt-Formular testen
            </button>
            <button
              onClick={() => setCurrentView('integration')}
              className="demo-nav-btn secondary"
            >
              🔗 Bewerbungs-Integration
            </button>
          </div>
        </div>

        <div className="demo-statistics">
          <h2>📊 Demo Statistiken</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{sampleContacts.length}</span>
              <span className="stat-label">Beispiel-Kontakte</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {sampleContacts.filter(c => c.email).length}
              </span>
              <span className="stat-label">Mit E-Mail</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {sampleContacts.filter(c => c.phone).length}
              </span>
              <span className="stat-label">Mit Telefon</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {sampleContacts.filter(c => c.linkedin_url).length}
              </span>
              <span className="stat-label">Mit LinkedIn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!demoInitialized) {
    return (
      <div className="demo-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Demo wird initialisiert...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-management-demo">
      {currentView === 'overview' && renderOverview()}
      
      {currentView === 'contacts' && (
        <div className="demo-section">
          <div className="demo-header">
            <button
              onClick={() => setCurrentView('overview')}
              className="back-btn"
            >
              ← Zurück zur Übersicht
            </button>
            <h2>Kontakte Seite</h2>
          </div>
          <ContactsPage 
            contactService={contactService}
            currentPage="contacts"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {currentView === 'form' && (
        <div className="demo-section">
          <div className="demo-header">
            <button
              onClick={() => setCurrentView('overview')}
              className="back-btn"
            >
              ← Zurück zur Übersicht
            </button>
            <h2>Kontakt-Formular Demo</h2>
          </div>
          <div className="form-demo-container">
            <ContactForm
              onSave={handleContactSave}
              onCancel={handleContactCancel}
            />
          </div>
        </div>
      )}

      {currentView === 'integration' && sampleApplication && (
        <div className="demo-section">
          <div className="demo-header">
            <button
              onClick={() => setCurrentView('overview')}
              className="back-btn"
            >
              ← Zurück zur Übersicht
            </button>
            <h2>Bewerbungs-Integration Demo</h2>
          </div>
          <div className="integration-demo-container">
            <div className="demo-application-info">
              <h3>📋 Beispiel Bewerbung</h3>
              <div className="app-info">
                <p><strong>Position:</strong> {sampleApplication.title}</p>
                <p><strong>Unternehmen ID:</strong> {sampleApplication.company_id}</p>
                <p><strong>Status:</strong> {sampleApplication.status}</p>
              </div>
            </div>
            
            <ContactApplicationManager
              contactService={contactService}
              application={sampleApplication}
              onContactChange={(contactId) => console.log('Contact changed to:', contactId)}
              onCreateContact={(companyId) => console.log('Create new contact for company:', companyId)}
              showContactDetails={true}
            />
          </div>
        </div>
      )}

      <style>{`
        .contact-management-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .demo-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .loading-spinner {
          text-align: center;
          color: #6b7280;
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

        .demo-overview {
          margin-bottom: 32px;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .demo-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .demo-description {
          font-size: 1.125rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .feature-section {
          margin-bottom: 40px;
        }

        .feature-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 24px;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 12px 0;
        }

        .feature-card p {
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .feature-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-card li {
          color: #374151;
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
          font-size: 0.875rem;
        }

        .feature-card li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }

        .demo-navigation {
          background: #f8fafc;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          margin-bottom: 32px;
        }

        .demo-navigation h2 {
          margin: 0 0 24px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
        }

        .nav-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .demo-nav-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
        }

        .demo-nav-btn.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .demo-nav-btn.primary:hover {
          background: #2563eb;
        }

        .demo-nav-btn.secondary {
          background: white;
          color: #374151;
          border-color: #d1d5db;
        }

        .demo-nav-btn.secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .demo-statistics {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
        }

        .demo-statistics h2 {
          margin: 0 0 24px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
        }

        .demo-section {
          margin-bottom: 32px;
        }

        .back-btn {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
        }

        .back-btn:hover {
          background: #e5e7eb;
        }

        .form-demo-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .integration-demo-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .demo-application-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .demo-application-info h3 {
          margin: 0 0 16px 0;
          color: #1e40af;
        }

        .app-info p {
          margin: 0 0 8px 0;
          color: #374151;
        }

        @media (max-width: 768px) {
          .contact-management-demo {
            padding: 12px;
          }

          .demo-header h1 {
            font-size: 2rem;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .nav-buttons {
            flex-direction: column;
            align-items: center;
          }

          .demo-nav-btn {
            width: 100%;
            max-width: 300px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default ContactManagementDemo;
