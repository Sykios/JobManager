import React, { useState, useEffect, useCallback } from 'react';
import { CompanyModel } from '../../models/Company';
import { Company } from '../../types';
import { CompanyForm } from '../components/companies';

// Simple CompanyListItem component for the page
const CompanyListItem: React.FC<{
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onSelect?: (company: Company) => void;
  isSelected?: boolean;
}> = ({ company, onEdit, onDelete, onSelect, isSelected }) => {
  return (
    <div className={`company-item ${isSelected ? 'selected' : ''}`}>
      <div className="company-content" onClick={() => onSelect?.(company)}>
        <div className="company-header">
          <h3 className="company-name">{company.name}</h3>
          {company.website && (
            <a 
              href={company.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="company-website"
              onClick={(e) => e.stopPropagation()}
            >
              🌐
            </a>
          )}
        </div>
        
        <div className="company-details">
          {company.industry && (
            <span className="company-industry">🏢 {company.industry}</span>
          )}
          {company.location && (
            <span className="company-location">📍 {company.location}</span>
          )}
          {company.size && (
            <span className="company-size">👥 {company.size}</span>
          )}
        </div>
        
        {company.description && (
          <p className="company-description">{company.description}</p>
        )}
      </div>
      
      <div className="company-actions">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(company);
          }}
          className="action-btn edit"
          title="Bearbeiten"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(company);
          }}
          className="action-btn delete"
          title="Löschen"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// Types for IPC-based company operations
interface CompanyFilters {
  search?: string;
  industry?: string;
  location?: string;
  size?: string;
}

interface CompanyCreateData {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
}

interface CompanyUpdateData extends Partial<CompanyCreateData> {}

interface CompanyStatistics {
  total: number;
  withWebsite: number;
  byIndustry: Record<string, number>;
  byLocation: Record<string, number>;
  bySize: Record<string, number>;
  recentCompanies: number;
}

export const CompaniesPage: React.FC = () => {
  // State management
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [statistics, setStatistics] = useState<CompanyStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CompanyFilters>({});
  const [showStatistics, setShowStatistics] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<{ reason: string; companies: Company[] }[]>([]);

  // Company service using IPC
  const companyService = {
    async getAll(filters: CompanyFilters = {}): Promise<Company[]> {
      let query = 'SELECT * FROM companies';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters.search) {
        conditions.push('(name LIKE ? OR industry LIKE ? OR location LIKE ? OR description LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.industry) {
        conditions.push('industry = ?');
        params.push(filters.industry);
      }

      if (filters.location) {
        conditions.push('location LIKE ?');
        params.push(`%${filters.location}%`);
      }

      if (filters.size) {
        conditions.push('size = ?');
        params.push(filters.size);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY name';

      const result = await window.electronAPI.queryDatabase(query, params);
      return result.map((row: any) => row as Company);
    },

    async getById(id: number): Promise<Company | null> {
      const result = await window.electronAPI.queryDatabase('SELECT * FROM companies WHERE id = ?', [id]);
      return result.length > 0 ? result[0] as Company : null;
    },

    async create(companyData: CompanyCreateData): Promise<Company> {
      const result = await window.electronAPI.executeQuery(
        `INSERT INTO companies (name, website, industry, location, size, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          companyData.name,
          companyData.website || null,
          companyData.industry || null,
          companyData.location || null,
          companyData.size || null,
          companyData.description || null
        ]
      );

      const created = await this.getById(result.lastInsertRowid);
      if (!created) throw new Error('Failed to retrieve created company');
      return created;
    },

    async update(id: number, companyData: CompanyUpdateData): Promise<Company> {
      const updates: string[] = [];
      const params: any[] = [];

      Object.entries(companyData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (updates.length === 0) {
        const existing = await this.getById(id);
        if (!existing) throw new Error('Company not found');
        return existing;
      }

      updates.push('updated_at = datetime(\'now\')');
      params.push(id);

      await window.electronAPI.executeQuery(
        `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const updated = await this.getById(id);
      if (!updated) throw new Error('Failed to retrieve updated company');
      return updated;
    },

    async delete(id: number): Promise<void> {
      await window.electronAPI.executeQuery('DELETE FROM companies WHERE id = ?', [id]);
    },

    async getStatistics(): Promise<CompanyStatistics> {
      const [
        totalResult,
        withWebsiteResult,
        industryResult,
        locationResult,
        sizeResult,
        recentResult
      ] = await Promise.all([
        window.electronAPI.queryDatabase('SELECT COUNT(*) as count FROM companies', []),
        window.electronAPI.queryDatabase('SELECT COUNT(*) as count FROM companies WHERE website IS NOT NULL AND website != ""', []),
        window.electronAPI.queryDatabase('SELECT industry, COUNT(*) as count FROM companies WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC', []),
        window.electronAPI.queryDatabase('SELECT location, COUNT(*) as count FROM companies WHERE location IS NOT NULL GROUP BY location ORDER BY count DESC', []),
        window.electronAPI.queryDatabase('SELECT size, COUNT(*) as count FROM companies WHERE size IS NOT NULL GROUP BY size ORDER BY count DESC', []),
        window.electronAPI.queryDatabase('SELECT COUNT(*) as count FROM companies WHERE created_at >= date("now", "-30 days")', [])
      ]);

      const byIndustry: Record<string, number> = {};
      industryResult.forEach((row: any) => {
        byIndustry[row.industry] = row.count;
      });

      const byLocation: Record<string, number> = {};
      locationResult.forEach((row: any) => {
        byLocation[row.location] = row.count;
      });

      const bySize: Record<string, number> = {};
      sizeResult.forEach((row: any) => {
        bySize[row.size] = row.count;
      });

      return {
        total: totalResult[0].count,
        withWebsite: withWebsiteResult[0].count,
        byIndustry,
        byLocation,
        bySize,
        recentCompanies: recentResult[0].count
      };
    },

    async findDuplicates(): Promise<{ reason: string; companies: Company[] }[]> {
      const duplicates: { reason: string; companies: Company[] }[] = [];

      // Find companies with same name
      const nameResult = await window.electronAPI.queryDatabase(
        'SELECT name FROM companies GROUP BY LOWER(name) HAVING COUNT(*) > 1'
      );

      for (const row of nameResult) {
        const companies = await window.electronAPI.queryDatabase(
          'SELECT * FROM companies WHERE LOWER(name) = LOWER(?)',
          [row.name]
        );

        duplicates.push({
          companies: companies as Company[],
          reason: `Gleicher Name: ${row.name}`
        });
      }

      return duplicates;
    },

    async exportToCSV(): Promise<string> {
      const companies = await this.getAll();
      const headers = ['ID', 'Name', 'Website', 'Branche', 'Standort', 'Größe', 'Beschreibung', 'Erstellt', 'Aktualisiert'];
      
      const csvRows = [
        headers.join(','),
        ...companies.map(company => [
          company.id,
          `"${company.name || ''}"`,
          `"${company.website || ''}"`,
          `"${company.industry || ''}"`,
          `"${company.location || ''}"`,
          `"${company.size || ''}"`,
          `"${(company.description || '').replace(/"/g, '""')}"`,
          company.created_at,
          company.updated_at
        ].join(','))
      ];
      
      return csvRows.join('\n');
    }
  };

  // Load companies and statistics
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [companiesData, statisticsData] = await Promise.all([
        companyService.getAll(filters),
        companyService.getStatistics()
      ]);
      
      setCompanies(companiesData);
      setStatistics(statisticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Unternehmen');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Filter companies based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      (company.industry && company.industry.toLowerCase().includes(query)) ||
      (company.location && company.location.toLowerCase().includes(query)) ||
      (company.description && company.description.toLowerCase().includes(query))
    );
    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Event handlers
  const handleCreateCompany = () => {
    setEditingCompany(null);
    setShowForm(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!window.confirm(`Soll das Unternehmen "${company.name}" wirklich gelöscht werden?`)) {
      return;
    }

    try {
      setSaving(true);
      await companyService.delete(company.id);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Unternehmens');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (companyData: CompanyCreateData | CompanyUpdateData) => {
    try {
      setSaving(true);

      if (editingCompany) {
        await companyService.update(editingCompany.id, companyData);
      } else {
        await companyService.create(companyData as CompanyCreateData);
      }

      setShowForm(false);
      setEditingCompany(null);
      await loadCompanies();
    } catch (err) {
      throw err; // Let the form handle the error
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCompany(null);
  };

  const handleFilterChange = (newFilters: CompanyFilters) => {
    setFilters(newFilters);
  };

  const handleExportCSV = async () => {
    try {
      const csv = await companyService.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unternehmen_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Export');
    }
  };

  const handleFindDuplicates = async () => {
    try {
      const duplicatesData = await companyService.findDuplicates();
      setDuplicates(duplicatesData);
      setShowDuplicates(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Duplikatsuche');
    }
  };

  // Render statistics panel
  const renderStatisticsPanel = () => {
    if (!showStatistics || !statistics) return null;

    return (
      <div className="statistics-panel">
        <div className="statistics-header">
          <h3>Unternehmen Statistiken</h3>
          <button
            type="button"
            onClick={() => setShowStatistics(false)}
            className="close-btn"
          >
            ✕
          </button>
        </div>
        
        <div className="statistics-summary">
          <div className="stat-item">
            <span className="stat-value">{statistics.total}</span>
            <span className="stat-label">Gesamt</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.withWebsite}</span>
            <span className="stat-label">Mit Website</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statistics.recentCompanies}</span>
            <span className="stat-label">Neue (30 Tage)</span>
          </div>
        </div>

        <div className="statistics-grid">
          <div className="stat-section">
            <h4>Top Branchen</h4>
            <div className="stat-list">
              {Object.entries(statistics.byIndustry)
                .slice(0, 5)
                .map(([industry, count]) => (
                  <div key={industry} className="stat-row">
                    <span className="stat-name">{industry}</span>
                    <span className="stat-count">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="stat-section">
            <h4>Top Standorte</h4>
            <div className="stat-list">
              {Object.entries(statistics.byLocation)
                .slice(0, 5)
                .map(([location, count]) => (
                  <div key={location} className="stat-row">
                    <span className="stat-name">{location}</span>
                    <span className="stat-count">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="stat-section">
            <h4>Unternehmensgrößen</h4>
            <div className="stat-list">
              {Object.entries(statistics.bySize)
                .slice(0, 5)
                .map(([size, count]) => (
                  <div key={size} className="stat-row">
                    <span className="stat-name">{size}</span>
                    <span className="stat-count">{count}</span>
                  </div>
                ))}
            </div>
        </div>
      </div>

      <style>{`
        .company-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .company-item:hover {
          border-color: #007acc;
          box-shadow: 0 2px 8px rgba(0, 122, 204, 0.1);
        }

        .company-item.selected {
          border-color: #007acc;
          background-color: #f0f8ff;
        }

        .company-content {
          flex: 1;
        }

        .company-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .company-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .company-website {
          text-decoration: none;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .company-website:hover {
          opacity: 1;
        }

        .company-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
        }

        .company-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .company-description {
          font-size: 14px;
          color: #666;
          line-height: 1.4;
          margin: 0;
          max-width: 600px;
        }

        .company-actions {
          display: flex;
          gap: 8px;
          margin-left: 16px;
        }

        .action-btn {
          background: none;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
        }

        .action-btn:hover {
          background-color: #f5f5f5;
        }

        .action-btn.edit:hover {
          border-color: #007acc;
          background-color: #f0f8ff;
        }

        .action-btn.delete:hover {
          border-color: #dc3545;
          background-color: #fff5f5;
        }

        .companies-list {
          flex: 1;
        }
      `}</style>
    </div>
  );
};  // Render duplicates panel
  const renderDuplicatesPanel = () => {
    if (!showDuplicates) return null;

    return (
      <div className="duplicates-panel">
        <div className="duplicates-header">
          <h3>Mögliche Duplikate ({duplicates.length})</h3>
          <button
            type="button"
            onClick={() => setShowDuplicates(false)}
            className="close-btn"
          >
            ✕
          </button>
        </div>
        
        {duplicates.length === 0 ? (
          <p className="no-duplicates">Keine Duplikate gefunden!</p>
        ) : (
          <div className="duplicates-list">
            {duplicates.map((group, index) => (
              <div key={index} className="duplicate-group">
                <div className="duplicate-reason">{group.reason}</div>
                <div className="duplicate-companies">
                  {group.companies.map(company => (
                    <div key={company.id} className="duplicate-company">
                      <span className="company-name">{company.name}</span>
                      <span className="company-details">
                        {company.industry && `🏢 ${company.industry}`}
                        {company.location && ` 📍 ${company.location}`}
                        {company.website && ` 🌐 ${company.website}`}
                      </span>
                      <div className="company-actions">
                        <button
                          type="button"
                          onClick={() => handleEditCompany(company)}
                          className="action-btn edit"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(company)}
                          className="action-btn delete"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="companies-page">
      {/* Page Title */}
      <div className="page-title">
        <h1>Unternehmen</h1>
        <p>Unternehmen verwalten und organisieren</p>
      </div>
      
      {/* Header with actions */}
      <div className="page-header">
        <div className="header-actions">
          <button
            type="button"
            onClick={handleCreateCompany}
            className="btn-primary"
            disabled={saving}
          >
            🏢 Neues Unternehmen
          </button>
          <button
            type="button"
            onClick={() => setShowStatistics(!showStatistics)}
            className="btn-secondary"
          >
            📊 Statistiken
          </button>
          <button
            type="button"
            onClick={handleFindDuplicates}
            className="btn-secondary"
          >
            👥 Duplikate suchen
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary"
            disabled={saving}
          >
            📥 CSV Export
          </button>
        </div>

        {/* Search */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Unternehmen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Statistics Panel */}
      {renderStatisticsPanel()}

      {/* Duplicates Panel */}
      {renderDuplicatesPanel()}

      {/* Main content */}
      <div className="page-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Unternehmen werden geladen...</p>
          </div>
        ) : (
          <div className="companies-list">
            {filteredCompanies.map(company => (
              <CompanyListItem
                key={company.id}
                company={company}
                onEdit={handleEditCompany}
                onDelete={handleDeleteCompany}
                onSelect={setSelectedCompany}
                isSelected={selectedCompany?.id === company.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <CompanyForm
              company={editingCompany || undefined}
              onSave={handleSaveCompany}
              onCancel={handleCancelForm}
              isLoading={saving}
            />
          </div>
        </div>
      )}

      <style>{`
        .companies-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-title {
          margin-bottom: 24px;
        }

        .page-title h1 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 600;
          color: #1f2937;
        }

        .page-title p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .search-section {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #fecaca;
        }

        .error-message button {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 1.2rem;
        }

        .error-message button:hover {
          background: rgba(220, 38, 38, 0.1);
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .statistics-panel,
        .duplicates-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .statistics-header,
        .duplicates-header {
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .statistics-header h3,
        .duplicates-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 1.25rem;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .statistics-summary {
          padding: 20px;
          display: flex;
          gap: 40px;
          border-bottom: 1px solid #e5e7eb;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .statistics-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .stat-section h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .stat-list {
          space-y: 8px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-name {
          font-size: 0.875rem;
          color: #374151;
          flex: 1;
        }

        .stat-count {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .no-duplicates {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .duplicates-list {
          padding: 20px;
        }

        .duplicate-group {
          margin-bottom: 24px;
          padding: 16px;
          background: #fef2f2;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }

        .duplicate-reason {
          font-weight: 500;
          color: #dc2626;
          margin-bottom: 12px;
        }

        .duplicate-companies {
          display: grid;
          gap: 12px;
        }

        .duplicate-company {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .company-name {
          font-weight: 500;
          color: #1f2937;
        }

        .company-details {
          color: #6b7280;
          font-size: 0.875rem;
          margin-top: 4px;
        }

        .company-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
        }

        .action-btn.edit {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .action-btn.edit:hover {
          background: #2563eb;
        }

        .action-btn.delete {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }

        .action-btn.delete:hover {
          background: #b91c1c;
        }

        .form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .form-container {
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        @media (max-width: 768px) {
          .companies-page {
            padding: 12px;
          }

          .header-actions {
            flex-direction: column;
          }

          .statistics-summary {
            flex-direction: column;
            gap: 12px;
          }

          .stat-item {
            flex-direction: row;
            justify-content: space-between;
          }

          .statistics-grid {
            grid-template-columns: 1fr;
          }

          .duplicate-company {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default CompaniesPage;
