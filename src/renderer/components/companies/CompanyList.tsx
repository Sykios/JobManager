import React, { useState } from 'react';
import { CompanyCard } from './CompanyCard';
import { Company, Application } from '../../../types';

export interface CompanyWithApplications extends Company {
  applicationCount: number;
  latestApplicationDate?: string;
  applications?: Application[];
}

interface CompanyListProps {
  companies: CompanyWithApplications[];
  onCompanyView?: (company: Company) => void;
  onCompanyEdit?: (company: Company) => void;
  onViewApplications?: (company: Company) => void;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  showFilters?: boolean;
  className?: string;
  compact?: boolean;
}

export const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  onCompanyView,
  onCompanyEdit,
  onViewApplications,
  loading = false,
  error,
  emptyMessage = 'Keine Unternehmen gefunden',
  showFilters = true,
  className = '',
  compact = false
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'applications' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique industries and sizes for filters
  const industries = Array.from(new Set(companies.map(c => c.industry).filter(Boolean))).sort();
  const sizes = Array.from(new Set(companies.map(c => c.size).filter(Boolean))).sort();

  // Filter and sort companies
  const filteredAndSortedCompanies = companies
    .filter(company => {
      // Industry filter
      if (filterIndustry !== 'all' && company.industry !== filterIndustry) return false;
      
      // Size filter
      if (filterSize !== 'all' && company.size !== filterSize) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return company.name.toLowerCase().includes(query) ||
               (company.industry && company.industry.toLowerCase().includes(query)) ||
               (company.location && company.location.toLowerCase().includes(query)) ||
               (company.description && company.description.toLowerCase().includes(query));
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'applications':
          comparison = a.applicationCount - b.applicationCount;
          break;
        case 'date':
          const dateA = a.latestApplicationDate ? new Date(a.latestApplicationDate).getTime() : 0;
          const dateB = b.latestApplicationDate ? new Date(b.latestApplicationDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'name' | 'applications' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'applications' | 'date') => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getCompanyStats = () => {
    const totalCompanies = companies.length;
    const companiesWithApplications = companies.filter(c => c.applicationCount > 0).length;
    const totalApplications = companies.reduce((sum, c) => sum + c.applicationCount, 0);
    const averageApplicationsPerCompany = totalCompanies > 0 ? Math.round(totalApplications / totalCompanies * 10) / 10 : 0;

    return { totalCompanies, companiesWithApplications, totalApplications, averageApplicationsPerCompany };
  };

  const stats = getCompanyStats();

  if (loading) {
    return (
      <div className={`company-list loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Unternehmen werden geladen...</p>
        </div>
        
        <style>{`
          .company-list.loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
          }

          .loading-spinner {
            text-align: center;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-left: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-spinner p {
            color: #6b7280;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`company-list error ${className}`}>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Fehler beim Laden der Unternehmen</h3>
          <p>{error}</p>
        </div>

        <style>{`
          .company-list.error {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
          }

          .error-message {
            text-align: center;
            color: #dc2626;
          }

          .error-icon {
            font-size: 3rem;
            margin-bottom: 16px;
          }

          .error-message h3 {
            margin: 0 0 8px 0;
            font-size: 1.25rem;
          }

          .error-message p {
            margin: 0;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`company-list ${className}`}>
      {/* Controls section */}
      {showFilters && companies.length > 0 && (
        <div className="company-controls">
          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Unternehmen durchsuchen..."
              className="search-input"
            />
          </div>

          {/* Filters and sorting */}
          <div className="filter-section">
            <div className="filters">
              <div className="filter-group">
                <label htmlFor="industry-filter">Branche:</label>
                <select
                  id="industry-filter"
                  value={filterIndustry}
                  onChange={(e) => setFilterIndustry(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Alle ({companies.length})</option>
                  {industries.map(industry => {
                    const count = companies.filter(c => c.industry === industry).length;
                    return (
                      <option key={industry} value={industry}>
                        {industry} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="size-filter">Größe:</label>
                <select
                  id="size-filter"
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Alle</option>
                  {sizes.map(size => {
                    const count = companies.filter(c => c.size === size).length;
                    return (
                      <option key={size} value={size}>
                        {size} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="sort-controls">
              <span className="sort-label">Sortieren:</span>
              <div className="sort-buttons">
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSort('name')}
                >
                  Name {getSortIcon('name')}
                </button>
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'applications' ? 'active' : ''}`}
                  onClick={() => handleSort('applications')}
                >
                  Bewerbungen {getSortIcon('applications')}
                </button>
                <button
                  type="button"
                  className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => handleSort('date')}
                >
                  Letzte Bewerbung {getSortIcon('date')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {companies.length > 0 && (
        <div className="company-stats">
          <div className="stats-info">
            {filteredAndSortedCompanies.length !== companies.length ? (
              <span>{filteredAndSortedCompanies.length} von {companies.length} Unternehmen</span>
            ) : (
              <span>{companies.length} Unternehmen</span>
            )}
            <span className="total-apps">
              {stats.companiesWithApplications} mit Bewerbungen
            </span>
            <span className="avg-apps">
              ⌀ {stats.averageApplicationsPerCompany} Bewerbungen/Unternehmen
            </span>
          </div>
        </div>
      )}

      {/* Company list */}
      {filteredAndSortedCompanies.length === 0 ? (
        <div className="empty-message">
          <div className="empty-icon">🏢</div>
          <h3>Keine Unternehmen gefunden</h3>
          <p>{searchQuery ? 'Suchkriterien anpassen' : emptyMessage}</p>
        </div>
      ) : (
        <div className={`companies-grid ${compact ? 'compact' : ''}`}>
          {filteredAndSortedCompanies.map(company => (
            <CompanyCard
              key={company.id}
              company={company}
              applicationCount={company.applicationCount}
              latestApplicationDate={company.latestApplicationDate}
              applications={company.applications}
              onView={onCompanyView}
              onEdit={onCompanyEdit}
              onViewApplications={onViewApplications}
              compact={compact}
              showApplications={false}
            />
          ))}
        </div>
      )}

      <style>{`
        .company-list {
          width: 100%;
        }

        .company-controls {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
        }

        .search-section {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .filters {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .filter-select {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sort-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .sort-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .sort-btn {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sort-btn:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .sort-btn.active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .company-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .stats-info {
          display: flex;
          gap: 16px;
          font-size: 0.875rem;
          color: #6b7280;
          flex-wrap: wrap;
        }

        .total-apps, .avg-apps {
          font-weight: 500;
        }

        .companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }

        .companies-grid.compact {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .empty-message {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-message h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #374151;
        }

        .empty-message p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .company-controls {
            padding: 16px;
          }

          .filter-section {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .filters {
            justify-content: space-between;
          }

          .sort-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .sort-buttons {
            justify-content: space-between;
          }

          .sort-btn {
            flex: 1;
            justify-content: center;
          }

          .companies-grid {
            grid-template-columns: 1fr;
          }

          .stats-info {
            flex-direction: column;
            gap: 4px;
          }
        }

        @media (max-width: 480px) {
          .filters {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
            justify-content: space-between;
          }

          .sort-buttons {
            flex-direction: column;
          }

          .sort-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyList;
