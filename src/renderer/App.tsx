import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Applications, NewApplication, ApplicationDetail, ApplicationEdit } from './pages/applications';
import { ContactsPage } from './pages/contacts';
import { ContactDetail } from './pages/contacts/ContactDetail';
import { CompaniesPage } from './pages/companies';
import { CompanyDetail } from './pages/companies/CompanyDetail';
import { Calendar } from './pages/Calendar';
import { RemindersPage } from './pages/Reminders';
import FilesPage from './pages/FilesPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ShutdownSyncDialog } from './components/common/ShutdownSyncDialog';
import { AuthGuard } from './components/AuthGuard';
import { Settings } from './pages/Settings';
import { DatabaseProvider } from './context/ApplicationContext';
import { FileServiceProvider } from './context/FileServiceContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation, PageType } from './context/NavigationContext';

const AppContent: React.FC = () => {
  const { currentPage, pageState, navigate } = useNavigation();
  const [showShutdownDialog, setShowShutdownDialog] = useState(false);
  const { isOfflineMode } = useAuth();

  // Listen for shutdown sync dialog trigger from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onShowShutdownSyncDialog(() => {
      setShowShutdownDialog(true);
    });

    return cleanup;
  }, []);

  const handlePageChange = (page: string | PageType, state?: any) => {
    navigate(page as PageType, state);
  };

  const handleError = (error: Error, errorInfo: any) => {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  };

  const handleShutdownSyncComplete = () => {
    setShowShutdownDialog(false);
    // Tell the main process to quit the app
    window.electronAPI.quitAfterSync();
  };

  const handleShutdownSyncCancel = () => {
    setShowShutdownDialog(false);
    // User cancelled, so we don't quit the app
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handlePageChange} />;
      case 'applications':
        return <Applications onNavigate={handlePageChange} />;
      case 'new-application':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Bewerbungsseite</h1>
                <p>Es gab ein Problem beim Laden der Bewerbungsseite.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <NewApplication onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'application-detail':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler beim Laden der Bewerbungsdetails</h1>
                <p>Es gab ein Problem beim Laden der Bewerbungsdetails.</p>
                <button onClick={() => navigate('applications')} className="back-button">
                  Zurück zur Bewerbungsübersicht
                </button>
              </div>
            }
          >
            <ApplicationDetail 
              application={pageState?.application}
              applicationId={pageState?.applicationId}
              onNavigate={handlePageChange} 
            />
          </ErrorBoundary>
        );
      case 'application-edit':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler beim Bearbeiten der Bewerbung</h1>
                <p>Es gab ein Problem beim Laden des Bearbeitungsformulars.</p>
                <button onClick={() => navigate('applications')} className="back-button">
                  Zurück zur Bewerbungsübersicht
                </button>
              </div>
            }
          >
            <ApplicationEdit 
              application={pageState?.application}
              applicationId={pageState?.applicationId}
              onNavigate={handlePageChange} 
            />
          </ErrorBoundary>
        );
      case 'companies':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Unternehmensseite</h1>
                <p>Es gab ein Problem beim Laden der Unternehmensseite.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <CompaniesPage onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'company-detail':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler beim Laden der Unternehmensdetails</h1>
                <p>Es gab ein Problem beim Laden der Unternehmensdetails.</p>
                <button onClick={() => navigate('companies')} className="back-button">
                  Zurück zur Unternehmensübersicht
                </button>
              </div>
            }
          >
            <CompanyDetail 
              company={pageState?.company}
              companyId={pageState?.companyId}
              onNavigate={handlePageChange} 
            />
          </ErrorBoundary>
        );
      case 'contacts':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Kontaktseite</h1>
                <p>Es gab ein Problem beim Laden der Kontaktseite.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <ContactsPage onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'contact-detail':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler beim Laden der Kontaktdetails</h1>
                <p>Es gab ein Problem beim Laden der Kontaktdetails.</p>
                <button onClick={() => navigate('contacts')} className="back-button">
                  Zurück zur Kontaktübersicht
                </button>
              </div>
            }
          >
            <ContactDetail 
              contact={pageState?.contact}
              contactId={pageState?.contactId}
              onNavigate={handlePageChange} 
            />
          </ErrorBoundary>
        );
        case 'files':
          return (
            <ErrorBoundary
              onError={handleError}
              fallback={
                <div className="error-page">
                  <h1>Fehler auf der Dateiseite</h1>
                  <p>Es gab ein Problem beim Laden der Dateiseite.</p>
                  <button onClick={() => navigate('dashboard')} className="back-button">
                    Zurück zum Dashboard
                  </button>
                </div>
              }
            >
              <FilesPage />
            </ErrorBoundary>
          );
      case 'calendar':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Kalenderseite</h1>
                <p>Es gab ein Problem beim Laden des Kalenders.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <Calendar onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'reminders':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler bei den Erinnerungen</h1>
                <p>Es gab ein Problem beim Laden der Erinnerungen.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <RemindersPage onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Einstellungsseite</h1>
                <p>Es gab ein Problem beim Laden der Einstellungen.</p>
                <button onClick={() => navigate('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <Settings />
          </ErrorBoundary>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div className="app-error">
          <h1>Anwendungsfehler</h1>
          <p>Es gab einen schwerwiegenden Fehler in der Anwendung.</p>
          <button onClick={() => window.location.reload()} className="reload-button">
            Anwendung neu laden
          </button>
          <style>{`
            .app-error {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .app-error h1 {
              color: #dc2626;
              margin-bottom: 16px;
              font-size: 2rem;
            }
            .app-error p {
              color: #6b7280;
              margin-bottom: 24px;
              font-size: 1.125rem;
            }
            .reload-button, .back-button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
            }
            .reload-button:hover, .back-button:hover {
              background: #2563eb;
            }
            .error-page {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 400px;
              padding: 20px;
              text-align: center;
            }
            .error-page h1 {
              color: #dc2626;
              margin-bottom: 16px;
              font-size: 1.5rem;
            }
            .error-page p {
              color: #6b7280;
              margin-bottom: 24px;
            }
          `}</style>
        </div>
      }
    >
      <Layout currentPage={currentPage} onPageChange={handlePageChange}>
        {renderCurrentPage()}
      </Layout>
      
      {/* Shutdown Sync Dialog */}
      <ShutdownSyncDialog
        isOpen={showShutdownDialog}
        onComplete={handleShutdownSyncComplete}
        onCancel={handleShutdownSyncCancel}
      />
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <DatabaseProvider>
          <FileServiceProvider>
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </FileServiceProvider>
        </DatabaseProvider>
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;
