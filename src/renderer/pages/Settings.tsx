import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
  onClose?: () => void;
  onNavigate?: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose, onNavigate }) => {
  const { user, signOut, isOfflineMode, exitOfflineMode, enableOfflineMode } = useAuth();
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
        if (!isOfflineMode) {
          await window.electronAPI.authSetKeepLoggedIn(keepLoggedInPref);
        }

        // Load sync status
        if (!isOfflineMode) {
          const status = await window.electronAPI.getSyncStatus();
          setSyncStatus(status);
        } else {
          // Set a mock status for offline mode
          setSyncStatus({
            isConfigured: false,
            lastSync: null,
            pendingItems: 0,
            isOnline: false,
            syncEnabled: false,
            syncAvailable: false,
            syncInProgress: false,
          });
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadSettings();
  }, [isOfflineMode]);

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
      onClose?.() || onNavigate?.('dashboard');
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
          setUpdateMessage(downloadResult.error || 'Failed to download update');
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
            <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
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

        {/* User Profile Section */}
        {!isOfflineMode ? (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
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
                    {user?.email || 'Lädt...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Mitglied seit {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString() 
                      : 'Unbekannt'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Offline Mode Status Section */
          <div className="bg-orange-50 border border-orange-200 shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-orange-200">
              <h2 className="text-lg font-semibold text-orange-900 flex items-center">
                <span className="mr-2">🔌</span>
                Offline-Modus
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    Sie verwenden JobManager im Offline-Modus
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Ihre Daten werden lokal gespeichert. Synchronisation und E-Mail-Erinnerungen sind deaktiviert.
                  </p>
                  <div className="mt-4 bg-orange-100 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-orange-900">Deaktivierte Funktionen:</h4>
                    <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
                      <li>Cloud-Synchronisation zwischen Geräten</li>
                      <li>E-Mail-Benachrichtigungen für Erinnerungen</li>
                      <li>Datensicherung in der Cloud</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    exitOfflineMode();
                    // This will trigger the login form to show
                  }}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Anmelden
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Settings */}
        {!isOfflineMode && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Authentication</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Angemeldet bleiben</label>
                  <p className="text-sm text-gray-500">Bei App-Neustarts angemeldet bleiben</p>
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
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-900">Zu Offline-Modus wechseln</label>
                  <p className="text-sm text-gray-500">JobManager ohne Sync und E-Mail-Erinnerungen verwenden</p>
                </div>
                <button
                  onClick={() => {
                    enableOfflineMode();
                  }}
                  className="px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <span className="mr-1">🔌</span>
                  Offline gehen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Settings */}
        <div className={`shadow rounded-lg mb-6 ${isOfflineMode ? 'bg-gray-50 border border-gray-200' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b ${isOfflineMode ? 'border-gray-200 bg-gray-100' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${isOfflineMode ? 'text-gray-500' : 'text-gray-900'}`}>
              Synchronisation {isOfflineMode && '(Im Offline-Modus deaktiviert)'}
            </h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            {isOfflineMode ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔌</div>
                <p className="text-gray-500 font-medium">Synchronisation ist im Offline-Modus deaktiviert</p>
                <p className="text-sm text-gray-400 mt-2">
                  Melden Sie sich an, um Cloud-Synchronisation zwischen Geräten zu aktivieren
                </p>
              </div>
            ) : syncStatus ? (
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
                    <p className="text-sm font-medium text-gray-500">Letzter Sync</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {syncStatus.lastSync 
                        ? new Date(syncStatus.lastSync).toLocaleString('de-DE')
                        : 'Nie'
                      }
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-500">Ausstehende Änderungen</p>
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
                    {isLoading ? 'Synchronisiert...' : 'Jetzt synchronisieren'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500">Lade Sync-Status...</p>
            )}
          </div>
        </div>

        {/* App Updates Section */}
        <div className="bg-white shadow rounded-lg mb-6 border-2 border-blue-200">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-900 flex items-center">
              <span className="mr-2">🔄</span>
              App-Updates
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Software-Updates</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Halten Sie Ihre JobManager-App mit den neuesten Funktionen und Sicherheits-Updates auf dem aktuellen Stand.
                  Ihre Datenbank bleibt bei Updates erhalten.
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
                    Installieren & Neustarten
                  </button>
                ) : (
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md text-sm font-semibold transition-colors min-w-[160px] shadow-md"
                  >
                    {updateStatus === 'checking' ? 'Überprüfe...' : 
                     updateStatus === 'downloading' ? 'Lade herunter...' : 
                     'Nach Updates suchen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-red-600">
              {isOfflineMode ? 'Offline-Modus Aktionen' : 'Account-Aktionen'}
            </h2>
          </div>
          <div className="px-6 py-4">
            {isOfflineMode ? (
              /* Offline mode actions */
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Offline-Modus verlassen</p>
                  <p className="text-sm text-gray-500">Zum Anmeldebildschirm zurückkehren</p>
                </div>
                <button
                  onClick={() => {
                    exitOfflineMode();
                    onClose?.() || onNavigate?.('dashboard');
                  }}
                  disabled={isLoading}
                  className={`mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    isLoading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isLoading ? 'Beende...' : 'Anmelden'}
                </button>
              </div>
            ) : (
              /* Authenticated user actions */
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Abmelden</p>
                  <p className="text-sm text-gray-500">Von Ihrem Account abmelden</p>
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
                  {isLoading ? 'Melde ab...' : 'Abmelden'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
