import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface UserSettingsProps {
  onClose?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');

  // Load user preferences and sync status
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load keep logged in preference from localStorage (renderer process)
        const savedPref = localStorage.getItem('jobmanager_keep_logged_in');
        const keepLoggedInPref = savedPref === 'true';
        setKeepLoggedIn(keepLoggedInPref);

        // Also set it in the main process for tracking
        await window.electronAPI.authSetKeepLoggedIn(keepLoggedInPref);

        // Load sync status
        const status = await window.electronAPI.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleKeepLoggedInChange = async (checked: boolean) => {
    try {
      setIsLoading(true);
      
      // Save preference to localStorage (renderer process)
      localStorage.setItem('jobmanager_keep_logged_in', checked.toString());
      
      // Update main process tracking
      await window.electronAPI.authSetKeepLoggedIn(checked);
      
      // If disabling keep logged in, clear the session storage
      if (!checked) {
        // Clear any stored session data
        localStorage.removeItem('jobmanager_auth_session');
        
        // Note: We don't sign out the user, just clear persistent storage
        // The user stays logged in for this session
      }
      
      setKeepLoggedIn(checked);
    } catch (error) {
      console.error('Error updating keep logged in preference:', error);
      // Reset checkbox on error
      setKeepLoggedIn(!checked);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      onClose?.();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.triggerManualSync();
      if (result.success) {
        // Reload sync status
        const status = await window.electronAPI.getSyncStatus();
        setSyncStatus(status);
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateMessage('Checking for updates...');

    try {
      const result = await (window as any).electronAPI?.updater?.checkForUpdates();
      
      if (!result.success) {
        setUpdateStatus('error');
        setUpdateMessage(result.error || 'Failed to check for updates');
        return;
      }

      if (result.updateInfo) {
        setUpdateStatus('downloading');
        setUpdateMessage(`Found update v${result.updateInfo.version}. Downloading...`);
        
        const downloadResult = await (window as any).electronAPI?.updater?.downloadUpdate();
        
        if (downloadResult.success) {
          setUpdateStatus('ready');
          setUpdateMessage('Update downloaded! Click "Install & Restart" to apply.');
        } else {
          setUpdateStatus('error');
          // Handle specific error messages
          if (downloadResult.error?.includes('Please check update first')) {
            setUpdateMessage('Please check for updates again before downloading.');
          } else {
            setUpdateMessage(downloadResult.error || 'Failed to download update');
          }
        }
      } else {
        setUpdateStatus('idle');
        setUpdateMessage('You are running the latest version.');
      }
    } catch (error) {
      setUpdateStatus('error');
      setUpdateMessage('An unexpected error occurred while checking for updates.');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await (window as any).electronAPI?.updater?.installUpdate();
    } catch (error) {
      setUpdateStatus('error');
      setUpdateMessage('Failed to install update. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">User Settings</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* App Updates Section */}
        <div className="bg-white shadow rounded-lg mb-6 border-2 border-blue-200">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-900 flex items-center">
              <span className="mr-2">🔄</span>
              App Updates
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Software Updates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Keep your JobManager app up to date with the latest features and security fixes.
                  Your database will be preserved during updates.
                </p>
                {updateMessage && (
                  <div className={`mt-3 p-3 rounded text-sm font-medium ${
                    updateStatus === 'error' 
                      ? 'bg-red-100 text-red-700'
                      : updateStatus === 'ready'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {updateMessage}
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                {updateStatus === 'ready' ? (
                  <button
                    onClick={handleInstallUpdate}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md text-sm font-semibold transition-colors min-w-[160px] shadow-md"
                  >
                    Install & Restart
                  </button>
                ) : (
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md text-sm font-semibold transition-colors min-w-[160px] shadow-md"
                  >
                    {updateStatus === 'checking' ? 'Checking...' : 
                     updateStatus === 'downloading' ? 'Downloading...' : 
                     'Check for Updates'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {user?.email || 'Loading...'}
                </p>
                <p className="text-sm text-gray-500">
                  Member since {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString() 
                    : 'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Authentication</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Keep me logged in</label>
                <p className="text-sm text-gray-500">Stay signed in across app restarts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => handleKeepLoggedInChange(e.target.checked)}
                  disabled={isLoading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* General Preferences */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Theme</label>
                <p className="text-sm text-gray-500">Choose your preferred appearance</p>
              </div>
              <select className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Language</label>
                <p className="text-sm text-gray-500">Select your preferred language</p>
              </div>
              <select className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Start minimized</label>
                <p className="text-sm text-gray-500">Start the application minimized to system tray</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sync</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {syncStatus ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={`text-lg font-semibold ${
                      syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {syncStatus.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-500">Last Sync</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {syncStatus.lastSync 
                        ? new Date(syncStatus.lastSync).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-500">Pending Changes</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {syncStatus.pendingItems || 0}
                    </p>
                  </div>
                </div>
                
                {syncStatus.syncEnabled && syncStatus.syncAvailable && (
                  <button
                    onClick={triggerSync}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                  >
                    {isLoading ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500">Loading sync status...</p>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {/* Export Data */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Download all your application data as a JSON file
                  </p>
                </div>
                <button
                  onClick={() => console.log('Exporting data...')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Export
                </button>
              </div>
            </div>

            {/* Import Data */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Import application data from a JSON file
                  </p>
                </div>
                <button
                  onClick={() => console.log('Importing data...')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Import
                </button>
              </div>
            </div>

            {/* Storage Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Storage Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Applications:</span>
                  <span className="ml-2 font-medium text-gray-900">42</span>
                </div>
                <div>
                  <span className="text-gray-500">Companies:</span>
                  <span className="ml-2 font-medium text-gray-900">15</span>
                </div>
                <div>
                  <span className="text-gray-500">Contacts:</span>
                  <span className="ml-2 font-medium text-gray-900">23</span>
                </div>
                <div>
                  <span className="text-gray-500">Reminders:</span>
                  <span className="ml-2 font-medium text-gray-900">8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-red-600">Account Actions</h2>
          </div>
          <div className="px-6 py-4 space-y-6">
            {/* Clear All Data */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-red-900">Clear All Data</p>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete all application data. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                      console.log('Clearing data...');
                    }
                  }}
                  className="mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Clear Data
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Sign out</p>
                <p className="text-sm text-gray-500">Sign out of your account</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className={`mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  isLoading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                }`}
              >
                {isLoading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
