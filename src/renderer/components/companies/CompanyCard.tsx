import React from 'react';
import { CompanyModel } from '../../../models/Company';
import { Company, Application } from '../../../types';

interface CompanyCardProps {
  company: Company;
  applicationCount?: number;
  latestApplicationDate?: string;
  applications?: Application[];
  onView?: (company: Company) => void;
  onEdit?: (company: Company) => void;
  onViewApplications?: (company: Company) => void;
  compact?: boolean;
  showApplications?: boolean;
  className?: string;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  applicationCount = 0,
  latestApplicationDate,
  applications = [],
  onView,
  onEdit,
  onViewApplications,
  compact = false,
  showApplications = false,
  className = ''
}) => {
  const companyModel = new CompanyModel(company);

  const handleCardClick = () => {
    if (onView) {
      onView(company);
    }
  };

  const handleViewApplications = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewApplications) {
      onViewApplications(company);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(company);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Nie';
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return 'Unbekannt';
    }
  };

  const getCompanyTypeColor = () => {
    const type = companyModel.getCompanyType();
    const colors = {
      startup: 'bg-green-100 text-green-800 border-green-200',
      small: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-purple-100 text-purple-800 border-purple-200',
      large: 'bg-orange-100 text-orange-800 border-orange-200',
      enterprise: 'bg-red-100 text-red-800 border-red-200',
      unknown: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type];
  };

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">
                {companyModel.getInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {company.name}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {company.location && <span>{company.location}</span>}
                {applicationCount > 0 && (
                  <>
                    {company.location && <span>•</span>}
                    <span>{applicationCount} Bewerbung{applicationCount !== 1 ? 'en' : ''}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {applicationCount > 0 && (
            <div className="flex-shrink-0 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {applicationCount}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">
              {companyModel.getInitials()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {company.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {company.industry && (
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getCompanyTypeColor()}`}>
                  {company.industry}
                </span>
              )}
              {company.size && (
                <span className="text-sm text-gray-500">
                  {companyModel.getFormattedSize()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Unternehmen bearbeiten"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Company Details */}
      <div className="space-y-3 mb-4">
        {company.location && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{company.location}</span>
          </div>
        )}
        
        {company.website && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a
              href={companyModel.getFormattedWebsite()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {companyModel.getDomain() || company.website}
            </a>
          </div>
        )}

        {company.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {company.description}
          </p>
        )}
      </div>

      {/* Application Statistics */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>
                {applicationCount} Bewerbung{applicationCount !== 1 ? 'en' : ''}
              </span>
            </div>
            
            {latestApplicationDate && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Zuletzt: {formatDate(latestApplicationDate)}</span>
              </div>
            )}
          </div>

          {onViewApplications && applicationCount > 0 && (
            <button
              onClick={handleViewApplications}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Bewerbungen anzeigen
              <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Show Applications List */}
        {showApplications && applications.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Aktuelle Bewerbungen:</h4>
            <div className="space-y-1">
              {applications.slice(0, 3).map((application) => (
                <div key={application.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {application.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {application.position} • {formatDate(application.application_date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                      application.status === 'in-review' ? 'bg-yellow-100 text-yellow-800' :
                      application.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                      application.status === 'offer' ? 'bg-green-100 text-green-800' :
                      application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {application.status}
                    </span>
                  </div>
                </div>
              ))}
              {applications.length > 3 && (
                <p className="text-xs text-gray-500 text-center pt-1">
                  ... und {applications.length - 3} weitere
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyCard;
