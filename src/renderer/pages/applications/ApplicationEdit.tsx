// TODO: Application Edit Page
// TODO: Edit existing applications
// TODO: Load application data and allow updates

import React from 'react';
import { Application } from '../../../types';

interface ApplicationEditProps {
  applicationId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const ApplicationEdit: React.FC<ApplicationEditProps> = ({ 
  applicationId, 
  onNavigate 
}) => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bewerbung bearbeiten</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bearbeiten Sie die Details Ihrer bestehenden Bewerbung.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              In Entwicklung
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Die Bearbeitungsfunktion für Bewerbungen ist noch in Entwicklung.
                Bitte verwenden Sie vorerst die Detailansicht.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
