import React, { useState, useEffect } from 'react';
import { SettingsService, SyncUtilities } from '../../../services/SettingsService';
import { SyncSettings as ISyncSettings } from '../../../types';

interface SyncStatus {
  lastSync: string | null;
  pendingItems: number;
  syncInProgress: boolean;
  syncEnabled: boolean;
}

export const SyncSettings: React.FC = () => {
  const [settings, setSettings] = useState<ISyncSettings>({
    auto_sync: true,
    sync_interval: 300,
    conflict_resolution: 'ask'
  });

  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingItems: 0,
    syncInProgress: false,
    syncEnabled: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings and status on component mount
  useEffect(() => {
    loadSettings();
    loadStatus();
    
    // Refresh status every 10 seconds
    const statusInterval = setInterval(loadStatus, 10000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const loadSettings = async () => {
    try {
      const syncSettings = await SettingsService.getSyncSettings();
      setSettings(syncSettings);
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const syncStatus = await window.electronAPI.getSyncStatus();
      setStatus({
        lastSync: syncStatus.lastSync,
        pendingItems: syncStatus.pendingItems,
        syncInProgress: syncStatus.syncInProgress,
        syncEnabled: syncStatus.syncEnabled
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const saveSettings = async (newSettings: ISyncSettings) => {
    setIsSaving(true);
    try {
      await SettingsService.setSyncSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save sync settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    if (status.syncInProgress) return;
    
    setIsLoading(true);
    try {
      const result = await window.electronAPI.triggerManualSync();
      console.log('Sync result:', result);
      await loadStatus();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSyncEnabled = async () => {
    const newSyncEnabled = !status.syncEnabled;
    
    try {
      await window.electronAPI.updateSyncConfig({
        enableSync: newSyncEnabled,
      });
      
      setStatus(prev => ({ ...prev, syncEnabled: newSyncEnabled }));
    } catch (error) {
      console.error('Failed to toggle sync:', error);
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Cloud Synchronization
          </h3>
          <div className="flex items-center space-x-2">
            {status.syncInProgress && (
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            <button
              onClick={handleTriggerSync}
              disabled={status.syncInProgress || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {status.syncInProgress || isLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Sync Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {status.pendingItems}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Pending Items
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatLastSync(status.lastSync)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last Sync
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                status.syncEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {status.syncEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Cloud Sync
            </div>
          </div>
        </div>

        {/* Cloud Sync Toggle */}
        <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Cloud Synchronization
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enable syncing your data with the cloud (happens at startup and shutdown)
            </p>
          </div>
          <button
            onClick={handleToggleSyncEnabled}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              status.syncEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                status.syncEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Conflict Resolution */}
        <div className="py-4 border-t border-gray-200 dark:border-gray-600">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Conflict Resolution
          </label>
          <select
            value={settings.conflict_resolution}
            onChange={(e) => saveSettings({ ...settings, conflict_resolution: e.target.value as 'local' | 'remote' | 'ask' })}
            disabled={isSaving}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ask">Ask me what to do</option>
            <option value="local">Keep local changes</option>
            <option value="remote">Keep remote changes</option>
          </select>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose how to handle conflicts when the same data is modified both locally and remotely
          </p>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          API Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Sync API URL
            </label>
            <input
              type="url"
              placeholder="https://jobmanager-api.vercel.app"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              readOnly
            />
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              This is configured via environment variables
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              API Key Status
            </label>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                Configured
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              API key is set via environment variables
            </p>
          </div>
        </div>
      </div>

      {/* Help Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          About Cloud Synchronization
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Cloud synchronization keeps your JobManager data backed up and synchronized across multiple devices.
          </p>
          <p>
            Your data is securely stored in Supabase and synchronized via a Vercel API endpoint.
          </p>
          <p>
            <strong>When sync happens:</strong> When you start the app and when you close it
          </p>
          <p>
            <strong>What gets synced:</strong> Applications, Companies, Contacts, and Reminders
          </p>
          <p>
            <strong>What doesn't get synced:</strong> File attachments are stored locally only
          </p>
          <p className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 p-2 rounded">
            <strong>Note:</strong> A small dialog will appear when closing the app if there are changes to sync.
          </p>
        </div>
      </div>
    </div>
  );
};
