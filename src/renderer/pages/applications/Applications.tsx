import React, { useState, useEffect } from 'react';
import { ApplicationList } from '../../components/applications/ApplicationList';
import { Button } from '../../components/ui/Button';
import { Application, ApplicationStatus } from '../../../types';

interface ApplicationsProps {
  onNavigate?: (page: string, state?: any) => void;
}

export const Applications: React.FC<ApplicationsProps> = ({ onNavigate }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (application: Application) => {
    if (!confirm(`Möchten Sie die Bewerbung "${application.title}" wirklich löschen?`)) {
      return;
    }

    try {
      const deleteQuery = 'DELETE FROM applications WHERE id = ?';
      await window.electronAPI.executeQuery(deleteQuery, [application.id]);
      
      // Refresh the list
      await loadApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Fehler beim Löschen der Bewerbung');
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
      />
    </div>
  );
};
