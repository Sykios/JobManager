import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { NewApplication } from './pages/NewApplication';
import { ContactsPage } from './pages/Contacts';

export type PageType = 'dashboard' | 'applications' | 'new-application' | 'companies' | 'contacts' | 'calendar' | 'reminders' | 'settings';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'applications':
        return <Applications onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'new-application':
        return <NewApplication onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'companies':
        return <div className="p-6 bg-white rounded-lg shadow-sm"><h1 className="text-2xl font-bold">Unternehmen</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'contacts':
        return (
          <ContactsPage />
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
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </Layout>
  );
};

export default App;
