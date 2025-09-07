import React from 'react';
import { Button } from '../ui/Button';
import { PageType } from './Layout';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onNavigate?: (page: PageType) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, isOfflineMode } = useAuth();
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">JM</span>
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900">JobManager</h1>
            {isOfflineMode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <span className="mr-1">🔌</span>
                Offline Modus
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Bewerbungen durchsuchen..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Actions & User Menu */}
        <div className="flex items-center space-x-4">
          {/* New Application Button */}
          {onNavigate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('new-application')}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Neue Bewerbung
            </Button>
          )}
          
          {/* User Profile Area - Clickable to go to settings */}
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            onClick={() => onNavigate?.('settings')}
            title="Profil & Einstellungen"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isOfflineMode 
                ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              <span className="text-white font-medium text-sm">
                {isOfflineMode ? '🔌' : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">
                {isOfflineMode ? 'Offline Modus' : (user?.email ? user.email.split('@')[0] : 'User')}
              </span>
              <span className="text-xs text-gray-500">
                {isOfflineMode 
                  ? 'nur lokale Daten' 
                  : (user?.email?.includes('dev@') ? 'Development' : 'Benutzer')
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
