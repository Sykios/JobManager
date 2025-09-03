import React, { useState } from 'react';
import { SyncSettings } from '../components/settings/SyncSettings';

type SettingsTab = 'general' | 'sync' | 'notifications' | 'data';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'sync' as const, label: 'Synchronization', icon: '🔄' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'data' as const, label: 'Data Management', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your JobManager preferences and configuration
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'sync' && <SyncSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'data' && <DataManagementSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

const GeneralSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          General Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Theme
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred appearance
              </p>
            </div>
            <select className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Language
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select your preferred language
              </p>
            </div>
            <select className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Start minimized
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start the application minimized to system tray
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 dark:bg-gray-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Desktop Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Show notifications on your desktop
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Reminder Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified about upcoming reminders
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Default Reminder Time
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How far in advance to remind you
              </p>
            </div>
            <select className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="1440">1 day</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataManagementSettings: React.FC = () => {
  const handleExportData = async () => {
    // TODO: Implement data export
    console.log('Exporting data...');
  };

  const handleImportData = async () => {
    // TODO: Implement data import
    console.log('Importing data...');
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      // TODO: Implement data clearing
      console.log('Clearing data...');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Data Management
        </h3>
        
        <div className="space-y-6">
          {/* Export Data */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Export Data
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Download all your application data as a JSON file
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Export
              </button>
            </div>
          </div>

          {/* Import Data */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Import Data
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Import application data from a JSON file
                </p>
              </div>
              <button
                onClick={handleImportData}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Import
              </button>
            </div>
          </div>

          {/* Clear All Data */}
          <div className="border border-red-200 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  Clear All Data
                </h4>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  Permanently delete all application data. This cannot be undone.
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>

          {/* Storage Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Storage Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Applications:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">42</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Companies:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">15</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Contacts:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">23</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Reminders:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
