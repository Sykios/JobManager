import React, { useState, useEffect } from 'react';
import { ApplicationList } from '../../components/applications/ApplicationList';
import { Button } from '../../components/ui/Button';
import { Application, ApplicationStatus } from '../../../types';

// Confirm Modal component
const ConfirmModal = ({ open, application, onCancel, onConfirm }: {
  open: boolean;
  application?: Application;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open || !application) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Bewerbung löschen</h3>
        <p className="text-gray-600 mb-6">
          Sind Sie sicher, dass Sie die Bewerbung "{application.title}" löschen möchten?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
          >
            Ja, löschen
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};

interface ApplicationsProps {
  onNavigate?: (page: string, state?: any) => void;
}

export const Applications: React.FC<ApplicationsProps> = ({ onNavigate }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set()); // per-item deleting state
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; application?: Application }>({ open: false }); // non-blocking confirm modal state

  // Load applications on component mount
  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load applications with file counts
      const query = `
        SELECT 
          a.*,
          COUNT(f.id) as fileCount,
          COALESCE(SUM(f.size), 0) as totalFileSize
        FROM applications a
        LEFT JOIN files f ON a.id = f.application_id
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `;
      
      const result = await window.electronAPI.queryDatabase(query);
      setApplications(result || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Fehler beim Laden der Bewerbungen'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (onNavigate) {
      onNavigate('new-application');
    }
  };

  const handleEdit = (application: Application) => {
  if (onNavigate) {
    onNavigate('application-edit', { application });
  }
};

  const handleDelete = (application: Application) => {
    setConfirmDelete({ open: true, application });
  };

  // Optimistic delete: immediate UI removal, restore on failure
  const performDeleteOptimistic = async (application: Application) => {
    if (!application.id) {
      console.error('Invalid application ID');
      return;
    }

    const id = application.id;

    // Mark as deleting (allows per-item spinner)
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Optimistically remove from UI so app remains responsive
    setApplications(prev => prev.filter(app => app.id !== id));
    setConfirmDelete({ open: false });

    try {
      const deleteQuery = 'DELETE FROM applications WHERE id = ?';
      await window.electronAPI.executeQuery(deleteQuery, [id]);
      // Optionally re-sync with backend in background (non-blocking)
      // await loadApplications();
    } catch (error) {
      // Restore previous state (guard against duplicates)
      setApplications(prev => {
        if (prev.some(app => app.id === id)) {
          return prev; // Already restored
        }
        return [...prev, application];
      });

      console.error('Error deleting application:', error);
      alert('Fehler beim Löschen der Bewerbung');
    } finally {
      // Clear per-item deleting flag
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleStatusChange = async (application: Application, newStatus: ApplicationStatus) => {
    try {
      const updateQuery = `
        UPDATE applications 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      await window.electronAPI.executeQuery(updateQuery, [newStatus, application.id]);
      
      // Refresh the list
      await loadApplications();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Fehler beim Aktualisieren des Status');
    }
  };

  const handleView = (application: Application) => {
    if (onNavigate) {
      onNavigate('application-detail', { application });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bewerbungen</h1>
          <p className="mt-2 text-sm text-gray-600">
            Verwalten und verfolgen Sie alle Ihre Bewerbungen an einem Ort.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateNew}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          Neue Bewerbung
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Fehler beim Laden der Bewerbungen
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadApplications}
                >
                  Erneut versuchen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      <ApplicationList
        applications={applications}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onView={handleView}
        onCreateNew={handleCreateNew}
        deletingIds={deletingIds}
      />

      <ConfirmModal
        open={confirmDelete.open}
        application={confirmDelete.application}
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={() => performDeleteOptimistic(confirmDelete.application!)}
      />
    </div>
  );
};
