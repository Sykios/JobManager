import React from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

export type PageType = 'dashboard' | 'applications' | 'new-application' | 'application-detail' | 'companies' | 'contacts' | 'files' | 'calendar' | 'reminders' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header onNavigate={onPageChange} />
      
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <Navigation 
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
