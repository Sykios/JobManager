import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Application } from '../../types';
import { ApplicationService } from '../../services/ApplicationService';
import { SearchInput, QuickFilters, SearchStats } from '../components/common/SearchFilter';
import { FilterControls } from '../components/common/FilterControls';
import { SearchResultsHeader, SearchResultsList } from '../components/common/SearchResults';
import { ApplicationCard } from '../components/applications/ApplicationCard';
import { Layout } from '../components/layout/Layout';
import { 
  AdvancedApplicationFilters, 
  DEFAULT_FILTER_PRESETS, 
  FilterPreset, 
  convertToServiceFilters,
  getActiveFilterCount,
  getFilterDescription,
  isFilterEmpty 
} from '../../utils/filterUtils';

export const SearchAndFilterPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedApplicationFilters>({});
  const [activePreset, setActivePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load applications on mount
  useEffect(() => {
    loadApplications();
  }, []);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('jobmanager-search-filters');
    const savedQuery = localStorage.getItem('jobmanager-search-query');
    const savedSort = localStorage.getItem('jobmanager-search-sort');
    
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }
    
    if (savedQuery) {
      setSearchQuery(savedQuery);
    }
    
    if (savedSort) {
      try {
        const { sortBy: savedSortBy, sortDirection: savedSortDirection } = JSON.parse(savedSort);
        setSortBy(savedSortBy || 'updated_at');
        setSortDirection(savedSortDirection || 'desc');
      } catch (e) {
        console.error('Failed to parse saved sort:', e);
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    if (!isFilterEmpty(filters)) {
      localStorage.setItem('jobmanager-search-filters', JSON.stringify(filters));
    } else {
      localStorage.removeItem('jobmanager-search-filters');
    }
  }, [filters]);

  // Save search query to localStorage
  useEffect(() => {
    if (searchQuery.trim()) {
      localStorage.setItem('jobmanager-search-query', searchQuery);
    } else {
      localStorage.removeItem('jobmanager-search-query');
    }
  }, [searchQuery]);

  // Save sort settings to localStorage
  useEffect(() => {
    localStorage.setItem('jobmanager-search-sort', JSON.stringify({
      sortBy,
      sortDirection
    }));
  }, [sortBy, sortDirection]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would be injected or retrieved from context
      // For demo purposes, we'll simulate the service
      const mockApplications: Application[] = [
        {
          id: 1,
          title: 'Senior Frontend Developer',
          position: 'React/TypeScript Developer',
          location: 'Wien, Österreich',
          remote_possible: true,
          status: 'applied',
          priority: 4,
          work_type: 'full-time',
          salary_range: '€60.000 - €80.000',
          application_date: '2025-08-01',
          deadline: '2025-08-20',
          notes: 'Sehr interessante Position mit modernem Tech-Stack. Team wirkt sehr kompetent.',
          created_at: '2025-07-28T10:00:00Z',
          updated_at: '2025-08-01T14:30:00Z',
        },
        {
          id: 2,
          title: 'Full Stack Developer',
          position: 'JavaScript/Node.js Entwickler',
          location: 'München, Deutschland',
          remote_possible: false,
          status: 'interview',
          priority: 5,
          work_type: 'full-time',
          salary_range: '€70.000 - €90.000',
          application_date: '2025-07-15',
          deadline: '2025-08-15',
          notes: 'Gespräch am 20.08. um 14:00 Uhr geplant.',
          created_at: '2025-07-10T09:15:00Z',
          updated_at: '2025-08-10T11:20:00Z',
        },
        {
          id: 3,
          title: 'Backend Developer',
          position: 'Python/Django Entwickler',
          location: 'Berlin, Deutschland',
          remote_possible: true,
          status: 'in-review',
          priority: 3,
          work_type: 'full-time',
          salary_range: '€55.000 - €75.000',
          application_date: '2025-08-05',
          notes: 'Interessantes Startup im FinTech Bereich.',
          created_at: '2025-08-01T16:45:00Z',
          updated_at: '2025-08-05T12:10:00Z',
        },
        {
          id: 4,
          title: 'DevOps Engineer',
          position: 'Cloud Infrastructure Specialist',
          location: 'Zürich, Schweiz',
          remote_possible: true,
          status: 'rejected',
          priority: 2,
          work_type: 'full-time',
          salary_range: 'CHF 90.000 - CHF 120.000',
          application_date: '2025-07-20',
          notes: 'Leider abgelehnt - zu wenig Kubernetes Erfahrung.',
          created_at: '2025-07-15T13:30:00Z',
          updated_at: '2025-07-25T09:45:00Z',
        }
      ];
      
      setApplications(mockApplications);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and search
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...applications];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => {
        const searchFields = filters.search?.fields || ['title', 'position', 'location', 'notes'];
        return searchFields.some(field => {
          const value = app[field as keyof Application];
          return value && value.toString().toLowerCase().includes(query);
        });
      });
    }

    // Apply status filter
    if (filters.status) {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter(app => statusArray.includes(app.status));
    }

    if (filters.excludeStatus) {
      const excludeArray = Array.isArray(filters.excludeStatus) ? filters.excludeStatus : [filters.excludeStatus];
      filtered = filtered.filter(app => !excludeArray.includes(app.status));
    }

    // Apply work type filter
    if (filters.work_type) {
      const workTypeArray = Array.isArray(filters.work_type) ? filters.work_type : [filters.work_type];
      filtered = filtered.filter(app => app.work_type && workTypeArray.includes(app.work_type));
    }

    // Apply remote filter
    if (filters.remote_possible !== undefined) {
      filtered = filtered.filter(app => app.remote_possible === filters.remote_possible);
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(app => app.priority === filters.priority);
    }

    if (filters.priorityRange) {
      filtered = filtered.filter(app => 
        app.priority >= filters.priorityRange!.min && 
        app.priority <= filters.priorityRange!.max
      );
    }

    // Apply location filter
    if (filters.location && typeof filters.location === 'string') {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(app => 
        app.location && app.location.toLowerCase().includes(location)
      );
    }

    // Apply deadline filters
    if (filters.has_deadline !== undefined) {
      filtered = filtered.filter(app => filters.has_deadline ? !!app.deadline : !app.deadline);
    }

    if (filters.is_overdue) {
      filtered = filtered.filter(app => {
        if (!app.deadline) return false;
        return new Date(app.deadline) < new Date();
      });
    }

    if (filters.deadline_approaching) {
      filtered = filtered.filter(app => {
        if (!app.deadline) return false;
        const deadline = new Date(app.deadline);
        const now = new Date();
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= filters.deadline_approaching!.days && diffDays >= 0;
      });
    }

    // Apply date range filters
    if (filters.application_date) {
      if (filters.application_date.start) {
        filtered = filtered.filter(app => 
          app.application_date && app.application_date >= filters.application_date!.start!
        );
      }
      if (filters.application_date.end) {
        filtered = filtered.filter(app => 
          app.application_date && app.application_date <= filters.application_date!.end!
        );
      }
    }

    if (filters.deadline) {
      if (filters.deadline.start) {
        filtered = filtered.filter(app => 
          app.deadline && app.deadline >= filters.deadline!.start!
        );
      }
      if (filters.deadline.end) {
        filtered = filtered.filter(app => 
          app.deadline && app.deadline <= filters.deadline!.end!
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Application];
      let bValue: any = b[sortBy as keyof Application];

      // Handle dates
      if (sortBy.includes('date') || sortBy.includes('_at')) {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue ? bValue.toLowerCase() : '';
      }

      // Handle null/undefined
      if (aValue === null || aValue === undefined) aValue = sortDirection === 'asc' ? -Infinity : Infinity;
      if (bValue === null || bValue === undefined) bValue = sortDirection === 'asc' ? -Infinity : Infinity;

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredApplications(filtered);
  }, [applications, searchQuery, filters, sortBy, sortDirection]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleSearchChange = (query: string, fields?: string[]) => {
    setSearchQuery(query);
    if (fields) {
      setFilters(prev => ({
        ...prev,
        search: { query, fields: fields as any[], caseSensitive: false }
      }));
    }
  };

  const handlePresetSelect = (preset: FilterPreset) => {
    setActivePreset(preset.id);
    setFilters(preset.filters);
    setSearchQuery('');
    
    // Reset to default sort for certain presets
    if (preset.id === 'recent') {
      setSortBy('created_at');
      setSortDirection('desc');
    } else if (preset.id === 'deadlines-soon' || preset.id === 'overdue') {
      setSortBy('deadline');
      setSortDirection('asc');
    }
  };

  const handleFiltersChange = (newFilters: AdvancedApplicationFilters) => {
    setFilters(newFilters);
    setActivePreset(''); // Clear preset when manual filters are applied
  };

  const handleFiltersReset = () => {
    setFilters({});
    setSearchQuery('');
    setActivePreset('all');
    setSortBy('updated_at');
    setSortDirection('desc');
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortBy(field);
    setSortDirection(direction);
  };

  const activeFilterCount = getActiveFilterCount(filters) + (searchQuery.trim() ? 1 : 0);
  const filterDescription = getFilterDescription(filters);

  return (
    <Layout currentPage="applications" onPageChange={() => {}}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bewerbungen durchsuchen
          </h1>
          <p className="text-gray-600">
            Finden Sie schnell die gesuchten Bewerbungen mit erweiterten Such- und Filteroptionen
          </p>
        </div>

        {/* Search and Quick Filters */}
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            showAdvancedOptions={true}
            placeholder="Bewerbungen durchsuchen..."
          />
          
          <QuickFilters
            activePreset={activePreset}
            onPresetSelect={handlePresetSelect}
            presets={DEFAULT_FILTER_PRESETS}
          />
        </div>

        {/* Filter Controls */}
        <FilterControls
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleFiltersReset}
        />

        {/* Active Filter Summary */}
        {activeFilterCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-medium">{activeFilterCount} Filter aktiv:</span>{' '}
                {filterDescription}
              </div>
              <button
                onClick={handleFiltersReset}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Alle zurücksetzen
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="bg-white rounded-lg shadow">
          <SearchResultsHeader
            totalResults={applications.length}
            filteredResults={filteredApplications.length}
            searchQuery={searchQuery}
            filterCount={activeFilterCount}
            isLoading={isLoading}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
          
          {!isLoading && filteredApplications.length > 0 && (
            <div className="p-6">
              <SearchResultsList
                applications={filteredApplications}
                searchQuery={searchQuery}
                renderApplication={(app, query) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    showStatusChanger={false}
                    showStatusProgress={false}
                  />
                )}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* Search Statistics */}
        <SearchStats
          totalResults={applications.length}
          filteredResults={filteredApplications.length}
          searchQuery={searchQuery}
          isLoading={isLoading}
          className="text-center"
        />
      </div>
    </Layout>
  );
};
