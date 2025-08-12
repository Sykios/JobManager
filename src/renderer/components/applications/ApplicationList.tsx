import React, { useState } from 'react';
import { ApplicationCard } from './ApplicationCard';
import { Button } from '../ui/Button';
import { Select, SelectOption } from '../ui/Select';
import { Input } from '../ui/Input';
import { CardSkeleton } from '../common/Loading';
import { Application, ApplicationStatus } from '../../../types';

export interface ApplicationListProps {
  applications: Application[];
  loading?: boolean;
  onEdit?: (application: Application) => void;
  onDelete?: (application: Application) => void;
  onStatusChange?: (application: Application, newStatus: ApplicationStatus) => void;
  onView?: (application: Application) => void;
  onCreateNew?: () => void;
}

type ViewMode = 'grid' | 'list';
type SortField = 'created_at' | 'title' | 'status' | 'priority' | 'deadline';
type SortOrder = 'asc' | 'desc';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Alle Status' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'applied', label: 'Beworben' },
  { value: 'in-review', label: 'In Prüfung' },
  { value: 'interview', label: 'Gespräch' },
  { value: 'offer', label: 'Angebot' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'withdrawn', label: 'Zurückgezogen' },
];

const sortOptions: SelectOption[] = [
  { value: 'created_at', label: 'Erstellungsdatum' },
  { value: 'title', label: 'Titel' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priorität' },
  { value: 'deadline', label: 'Frist' },
];

export const ApplicationList: React.FC<ApplicationListProps> = ({
  applications,
  loading = false,
  onEdit,
  onDelete,
  onStatusChange,
  onView,
  onCreateNew,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter applications based on search term and status
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';
    
    // Handle date fields
    if (sortField === 'created_at' || sortField === 'deadline') {
      aValue = new Date(aValue).getTime() || 0;
      bValue = new Date(bValue).getTime() || 0;
    }
    
    // Handle string comparisons
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const EmptyState = () => (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        Keine Bewerbungen vorhanden
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Erstellen Sie Ihre erste Bewerbung, um loszulegen.
      </p>
      {onCreateNew && (
        <div className="mt-6">
          <Button
            variant="primary"
            onClick={onCreateNew}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            Neue Bewerbung
          </Button>
        </div>
      )}
    </div>
  );

  const LoadingState = () => (
    <div className={
      viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
        : 'space-y-4'
    }>
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Input
            placeholder="Bewerbungen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            className="w-full sm:w-80"
          />
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            className="w-full sm:w-48"
          />
          
          <div className="flex gap-2">
            <Select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              options={sortOptions}
              className="w-full sm:w-40"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15l-4 4-4-4m0-6l4-4 4 4" />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-lg border border-gray-200">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none border-l-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          {filteredApplications.length} von {applications.length} Bewerbungen
        </p>
      </div>

      {/* Applications Display */}
      {sortedApplications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {sortedApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
};
