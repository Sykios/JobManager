import React from 'react';
import { Application } from '../../../types';

interface SearchHighlightProps {
  text: string;
  searchQuery: string;
  className?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchQuery,
  className = ''
}) => {
  if (!searchQuery.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  // Create regex for case-insensitive search
  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <mark
              key={index}
              className="bg-yellow-200 text-yellow-900 px-1 rounded"
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </span>
  );
};

interface SearchResultsHeaderProps {
  totalResults: number;
  filteredResults: number;
  searchQuery?: string;
  filterCount: number;
  isLoading?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalResults,
  filteredResults,
  searchQuery,
  filterCount,
  isLoading = false,
  sortBy,
  sortDirection = 'desc',
  onSortChange,
  className = ''
}) => {
  const sortOptions = [
    { value: 'created_at', label: 'Erstellungsdatum' },
    { value: 'updated_at', label: 'Zuletzt geändert' },
    { value: 'application_date', label: 'Bewerbungsdatum' },
    { value: 'deadline', label: 'Bewerbungsfrist' },
    { value: 'title', label: 'Stellentitel' },
    { value: 'priority', label: 'Priorität' }
  ];

  const handleSortChange = (field: string) => {
    if (!onSortChange) return;
    
    const newDirection = sortBy === field && sortDirection === 'desc' ? 'asc' : 'desc';
    onSortChange(field, newDirection);
  };

  return (
    <div className={`bg-white border-b border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Results Info */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {isLoading ? (
              <span className="animate-pulse">Suche läuft...</span>
            ) : (
              <>
                <span className="font-medium text-gray-900">{filteredResults}</span>
                {filteredResults !== totalResults && (
                  <span className="text-gray-500"> von {totalResults}</span>
                )}
                <span className="text-gray-500"> Bewerbungen</span>
                {searchQuery && (
                  <span className="text-gray-500">
                    {' '}für <SearchHighlight text={`"${searchQuery}"`} searchQuery={searchQuery} />
                  </span>
                )}
              </>
            )}
          </div>

          {/* Active Filters Indicator */}
          {filterCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-blue-600 font-medium">{filterCount} Filter aktiv</span>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        {onSortChange && filteredResults > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sortieren:</span>
            <div className="flex gap-1">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`
                    px-3 py-1 text-xs rounded-full border transition-colors
                    ${sortBy === option.value
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  {option.label}
                  {sortBy === option.value && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Results Message */}
      {!isLoading && filteredResults === 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-gray-600">
            {searchQuery || filterCount > 0 ? (
              <>
                <div className="text-lg mb-2">🔍</div>
                <div className="font-medium mb-1">Keine Ergebnisse gefunden</div>
                <div className="text-sm">
                  Versuchen Sie andere Suchbegriffe oder entfernen Sie einige Filter.
                </div>
              </>
            ) : (
              <>
                <div className="text-lg mb-2">📋</div>
                <div className="font-medium">Keine Bewerbungen vorhanden</div>
                <div className="text-sm">Erstellen Sie Ihre erste Bewerbung.</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SearchResultsListProps {
  applications: Application[];
  searchQuery?: string;
  onApplicationSelect?: (application: Application) => void;
  renderApplication?: (application: Application, searchQuery?: string) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  applications,
  searchQuery,
  onApplicationSelect,
  renderApplication,
  isLoading = false,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <SearchResultSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {applications.map((application) => (
        <div
          key={application.id}
          onClick={() => onApplicationSelect?.(application)}
          className={`
            bg-white border border-gray-200 rounded-lg p-4 
            ${onApplicationSelect ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300' : ''}
            transition-colors
          `}
        >
          {renderApplication ? (
            renderApplication(application, searchQuery)
          ) : (
            <DefaultApplicationResult application={application} searchQuery={searchQuery} />
          )}
        </div>
      ))}
    </div>
  );
};

const SearchResultSkeleton: React.FC = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="animate-pulse space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-gray-200 rounded w-24"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
);

interface DefaultApplicationResultProps {
  application: Application;
  searchQuery?: string;
}

const DefaultApplicationResult: React.FC<DefaultApplicationResultProps> = ({
  application,
  searchQuery
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const isOverdue = () => {
    if (!application.deadline) return false;
    return new Date(application.deadline) < new Date();
  };

  const isDeadlineApproaching = () => {
    if (!application.deadline) return false;
    const deadline = new Date(application.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            <SearchHighlight text={application.title} searchQuery={searchQuery || ''} />
          </h3>
          <p className="text-sm text-gray-600 truncate">
            <SearchHighlight text={application.position} searchQuery={searchQuery || ''} />
          </p>
          {application.location && (
            <p className="text-sm text-gray-500 truncate">
              📍 <SearchHighlight text={application.location} searchQuery={searchQuery || ''} />
              {application.remote_possible && ' • Remote möglich'}
            </p>
          )}
        </div>
        
        <div className="ml-4 flex items-center gap-2">
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${application.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
              application.status === 'in-review' ? 'bg-yellow-100 text-yellow-800' :
              application.status === 'interview' ? 'bg-purple-100 text-purple-800' :
              application.status === 'offer' ? 'bg-green-100 text-green-800' :
              application.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }
          `}>
            {application.status === 'draft' && '📝 Entwurf'}
            {application.status === 'applied' && '📤 Beworben'}
            {application.status === 'in-review' && '👀 In Prüfung'}
            {application.status === 'interview' && '💼 Gespräch'}
            {application.status === 'offer' && '🎉 Angebot'}
            {application.status === 'rejected' && '❌ Abgelehnt'}
            {application.status === 'withdrawn' && '↩️ Zurückgezogen'}
          </span>
          
          {application.priority > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              P{application.priority}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {application.work_type && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">💼</span>
            {application.work_type === 'full-time' && 'Vollzeit'}
            {application.work_type === 'part-time' && 'Teilzeit'}
            {application.work_type === 'contract' && 'Vertrag'}
            {application.work_type === 'internship' && 'Praktikum'}
            {application.work_type === 'freelance' && 'Freelance'}
            {application.salary_range && ` • ${application.salary_range}`}
          </div>
        )}

        {application.notes && (
          <p className="text-sm text-gray-700 line-clamp-2">
            <SearchHighlight text={application.notes} searchQuery={searchQuery || ''} />
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          {application.application_date && (
            <span>Beworben: {formatDate(application.application_date)}</span>
          )}
          
          {application.deadline && (
            <span className={`
              ${isOverdue() ? 'text-red-600 font-medium' : 
                isDeadlineApproaching() ? 'text-yellow-600 font-medium' : ''}
            `}>
              Frist: {formatDate(application.deadline)}
              {isOverdue() && ' (Überfällig)'}
              {isDeadlineApproaching() && !isOverdue() && ' (Bald fällig)'}
            </span>
          )}
        </div>
        
        <span>Erstellt: {formatDate(application.created_at)}</span>
      </div>
    </div>
  );
};
