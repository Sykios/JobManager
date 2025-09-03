import React, { useState, useEffect } from 'react';

interface ShutdownSyncDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const ShutdownSyncDialog: React.FC<ShutdownSyncDialogProps> = ({
  isOpen,
  onComplete,
  onCancel,
}) => {
  const [syncStatus, setSyncStatus] = useState<string>('Preparing to sync...');
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen && !isCompleted) {
      performShutdownSync();
    }
  }, [isOpen]);

  const performShutdownSync = async () => {
    try {
      setHasError(false);
      
      // First check if there are pending changes
      const status = await window.electronAPI.getSyncStatus();
      
      if (status.pendingItems === 0) {
        setSyncStatus('No changes to sync');
        setTimeout(() => {
          setIsCompleted(true);
          onComplete();
        }, 1000);
        return;
      }

      // Perform the shutdown sync with progress updates
      setSyncStatus(`Synchronizing ${status.pendingItems} changes...`);
      
      const result = await window.electronAPI.performShutdownSync?.((message: string) => {
        setSyncStatus(message);
      });

      if (result?.success) {
        setSyncStatus('Synchronization completed successfully');
        setTimeout(() => {
          setIsCompleted(true);
          onComplete();
        }, 1500);
      } else {
        throw new Error('Synchronization failed');
      }
    } catch (error) {
      console.error('Shutdown sync error:', error);
      setHasError(true);
      setSyncStatus('Synchronization failed. You can close the app anyway.');
    }
  };

  const handleForceClose = () => {
    setIsCompleted(true);
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          <div className="mr-3">
            {isCompleted ? (
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : hasError ? (
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="animate-spin w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
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
              </div>
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isCompleted ? 'Sync Complete' : hasError ? 'Sync Error' : 'Synchronizing...'}
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {syncStatus}
        </p>

        <div className="flex justify-end space-x-3">
          {!isCompleted && !hasError && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel & Close
            </button>
          )}
          
          {hasError && (
            <button
              onClick={handleForceClose}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Close Anyway
            </button>
          )}

          {isCompleted && (
            <button
              onClick={onComplete}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Close App
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
