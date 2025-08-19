// TODO: Bewerbungsdetails anzeigen/bearbeiten
// TODO: Vollständige Bewerbungsansicht
// TODO: Status updates, notes, timeline

import React from 'react';
import { Application } from '../../../types';

interface ApplicationDetailProps {
  applicationId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ 
  applicationId, 
  onNavigate 
}) => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bewerbungsdetails</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vollständige Ansicht und Verwaltung Ihrer Bewerbung.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Geplante Funktion
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Die Detailansicht für Bewerbungen wird implementiert und umfasst:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>Vollständige Bewerbungsdetails</li>
                <li>Status-Timeline und Verlauf</li>
                <li>Notizen und Updates</li>
                <li>Angehängte Dateien</li>
                <li>Kontakt- und Unternehmensinformationen</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
