import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { NewApplication } from './pages/NewApplication';
import { ContactsPage } from './pages/Contacts';
import FilesPage from './pages/FilesPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DatabaseProvider } from './context/ApplicationContext';
import { FileServiceProvider } from './context/FileServiceContext';

export type PageType = 'dashboard' | 'applications' | 'new-application' | 'companies' | 'contacts' | 'files' | 'calendar' | 'reminders' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const handlePageChange = (page: string | PageType, state?: any) => {
    setCurrentPage(page as PageType);
  };

  const handleError = (error: Error, errorInfo: any) => {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
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
                <button onClick={() => setCurrentPage('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <NewApplication onNavigate={handlePageChange} />
          </ErrorBoundary>
        );
      case 'companies':
        return <div className="p-6 bg-white rounded-lg shadow-sm"><h1 className="text-2xl font-bold">Unternehmen</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'contacts':
        return (
          <ErrorBoundary
            onError={handleError}
            fallback={
              <div className="error-page">
                <h1>Fehler auf der Kontaktseite</h1>
                <p>Es gab ein Problem beim Laden der Kontaktseite.</p>
                <button onClick={() => setCurrentPage('dashboard')} className="back-button">
                  Zurück zum Dashboard
                </button>
              </div>
            }
          >
            <ContactsPage />
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
                  <button onClick={() => setCurrentPage('dashboard')} className="back-button">
                    Zurück zum Dashboard
                  </button>
                </div>
              }
            >
              <FilesPage />
            </ErrorBoundary>
          );
      case 'calendar':
        return <div className="p-6 bg-white rounded-lg shadow-sm"><h1 className="text-2xl font-bold">Kalender</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'reminders':
        return <div className="p-6 bg-white rounded-lg shadow-sm"><h1 className="text-2xl font-bold">Erinnerungen</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'settings':
        return <div className="p-6 bg-white rounded-lg shadow-sm"><h1 className="text-2xl font-bold">Einstellungen</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>;
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
      <DatabaseProvider>
        <FileServiceProvider>
          <Layout currentPage={currentPage} onPageChange={handlePageChange}>
            {renderCurrentPage()}
          </Layout>
        </FileServiceProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
};

export default App;
