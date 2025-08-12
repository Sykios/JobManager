import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ApplicationCreateData } from '../../services/ApplicationService';

export const NewApplication: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ApplicationCreateData) => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, we'll implement a direct database call
      // Later we'll need to implement this through the main process
      const query = `
        INSERT INTO applications (
          company_id, contact_id, title, position, job_url, application_channel,
          salary_range, work_type, location, remote_possible, status, priority,
          application_date, deadline, follow_up_date, notes, cover_letter,
          requirements, benefits
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.company_id || null,
        data.contact_id || null,
        data.title,
        data.position,
        data.job_url || null,
        data.application_channel || null,
        data.salary_range || null,
        data.work_type || null,
        data.location || null,
        data.remote_possible ? 1 : 0,
        'draft',
        data.priority || 1,
        data.application_date || null,
        data.deadline || null,
        data.follow_up_date || null,
        data.notes || null,
        data.cover_letter || null,
        data.requirements || null,
        data.benefits || null,
      ];

      const result = await window.electronAPI.executeQuery(query, params);
      
      // Navigate to the applications list with success message
      navigate('/applications', { 
        replace: true,
        state: { message: 'Bewerbung erfolgreich erstellt!' }
      });
    } catch (error) {
      console.error('Error creating application:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Ein unbekannter Fehler ist aufgetreten'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/applications');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Neue Bewerbung</h1>
        <p className="mt-2 text-sm text-gray-600">
          Erfassen Sie alle wichtigen Informationen zu Ihrer neuen Bewerbung.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
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
                Fehler beim Erstellen der Bewerbung
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApplicationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel="Bewerbung erstellen"
      />
    </div>
  );
};
