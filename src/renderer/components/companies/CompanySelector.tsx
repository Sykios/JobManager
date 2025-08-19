import React, { useState, useEffect, useRef } from 'react';
import { CompanyModel } from '../../../models/Company';
import { Company } from '../../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import CompanyForm from './CompanyForm';
import { CompanyService } from '../../../services/CompanyService';

interface CompanySelectorProps {
  selectedCompanyId?: number;
  onCompanySelect: (company: Company | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  selectedCompanyId,
  onCompanySelect,
  label = "Unternehmen",
  placeholder = "Unternehmen auswählen oder suchen...",
  error,
  disabled = false,
  className = ""
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  // Load companies from database
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.queryDatabase(
        'SELECT * FROM companies ORDER BY name',
        []
      );
      setCompanies(result || []);
      setFilteredCompanies(result || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load selected company details
  const loadSelectedCompany = async () => {
    if (selectedCompanyId) {
      try {
        const result = await window.electronAPI.queryDatabase(
          'SELECT * FROM companies WHERE id = ?',
          [selectedCompanyId]
        );
        if (result.length > 0) {
          setSelectedCompany(result[0]);
        }
      } catch (err) {
        console.error('Error loading selected company:', err);
      }
    } else {
      setSelectedCompany(null);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadSelectedCompany();
  }, [selectedCompanyId]);

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
      (company.website && company.website.toLowerCase().includes(query))
    );
    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    onCompanySelect(company);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedCompany(null);
    onCompanySelect(null);
    setSearchQuery('');
  };

  const handleCreateNewCompany = () => {
    setIsOpen(false);
    setShowCreateForm(true);
    setSearchQuery('');
  };

  const handleSaveNewCompany = async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setSaving(true);
      
      // Normalize empty strings to undefined for consistency with the Company type
      const normalizedData = {
        ...companyData,
        website: companyData.website?.trim() || undefined,
        industry: companyData.industry?.trim() || undefined,
        location: companyData.location?.trim() || undefined,
        size: companyData.size?.trim() || undefined,
        description: companyData.description?.trim() || undefined,
      };

      // Validate the company data
      const testCompany = new CompanyModel(normalizedData);
      const validation = testCompany.validate();
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create company via IPC
      const now = new Date().toISOString();
      
      const insertValues = [
        normalizedData.name,
        normalizedData.website,
        normalizedData.industry,
        normalizedData.location,
        normalizedData.size,
        normalizedData.description,
        now,
        now
      ];
      
      const result = await window.electronAPI.executeQuery(
        `INSERT INTO companies (name, website, industry, location, size, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        insertValues
      );
      
      // Get the newly created company
      const newCompanyResult = await window.electronAPI.queryDatabase(
        'SELECT * FROM companies WHERE id = ?',
        [result.lastID]
      );
      
      if (newCompanyResult.length > 0) {
        const newCompany = newCompanyResult[0];
        
        // Reload companies list
        await loadCompanies();
        
        // Auto-select the newly created company
        setSelectedCompany(newCompany);
        onCompanySelect(newCompany);
        
        // Close the form
        setShowCreateForm(false);
      } else {
        throw new Error('Failed to retrieve newly created company');
      }
    } catch (error) {
      console.error('Error creating company:', error);
      throw error; // Re-throw to prevent form from closing
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCreateForm = () => {
    setShowCreateForm(false);
  };

  return (
    <div className={`company-selector ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div className="selector-input-container">
          {selectedCompany ? (
            <div className="selected-company">
              <div className="company-info">
                <div className="company-name">{selectedCompany.name}</div>
                {selectedCompany.industry && (
                  <div className="company-industry">{selectedCompany.industry}</div>
                )}
                {selectedCompany.location && (
                  <div className="company-location">{selectedCompany.location}</div>
                )}
              </div>
              <div className="company-actions">
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  disabled={disabled}
                  className="change-company-btn"
                  title="Anderes Unternehmen auswählen"
                >
                  <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={disabled}
                  className="clear-btn"
                  title="Auswahl aufheben"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className={`selector-input ${error ? 'error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className="dropdown-btn"
              >
                <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="error-message">{error}</p>
        )}

        {isOpen && (
          <div className="dropdown-menu">
            {loading ? (
              <div className="dropdown-item loading">
                Unternehmen werden geladen...
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCreateNewCompany}
                  className="dropdown-item create-new"
                >
                  <svg className="create-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Neues Unternehmen erstellen
                </button>
                
                {filteredCompanies.length === 0 ? (
                  <div className="dropdown-item no-results">
                    {searchQuery ? 'Keine Unternehmen gefunden' : 'Keine Unternehmen vorhanden'}
                  </div>
                ) : (
                  <>
                    {filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => handleCompanySelect(company)}
                        className="dropdown-item company-item"
                      >
                        <div className="company-details">
                          <div className="company-name">{company.name}</div>
                          {company.industry && (
                            <div className="company-industry">{company.industry}</div>
                          )}
                          <div className="company-contact-info">
                            {company.location && (
                              <span className="company-location">� {company.location}</span>
                            )}
                            {company.website && (
                              <span className="company-website">🌐 {company.website}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Company Creation Modal */}
      {showCreateForm && (
        <div className="company-creation-modal">
          <div className="modal-overlay" onClick={handleCancelCreateForm}></div>
          <div className="modal-content">
            <ErrorBoundary
              onError={(error, errorInfo) => {
                console.error('ErrorBoundary caught error in CompanyForm:', error, errorInfo);
              }}
              fallback={
                <div className="company-form-error">
                  <h3>Fehler beim Laden des Unternehmensformulars</h3>
                  <p>Es gab ein Problem beim Laden des Formulars. Bitte schließen Sie das Fenster und versuchen Sie es erneut.</p>
                  <button onClick={handleCancelCreateForm} className="btn-secondary">
                    Schließen
                  </button>
                </div>
              }
            >
              <CompanyForm
                onSave={handleSaveNewCompany}
                onCancel={handleCancelCreateForm}
                isLoading={saving}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      <style>{`
        .company-selector {
          position: relative;
        }

        .selector-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .selected-company {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 42px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
        }

        .selected-company:hover {
          background: #f1f5f9;
        }

        .company-info {
          flex: 1;
          margin-right: 8px;
        }

        .company-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .change-company-btn {
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          min-width: 24px;
          height: 24px;
        }

        .change-company-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .change-company-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .company-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .company-industry {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .company-location {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .clear-btn {
          padding: 4px 6px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          transition: all 0.2s;
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-btn:hover {
          background: #dc2626;
        }

        .clear-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .selector-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          outline: none;
          transition: all 0.2s;
        }

        .selector-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .selector-input.error {
          border-color: #dc2626;
        }

        .dropdown-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
        }

        .dropdown-btn:hover {
          color: #374151;
        }

        .dropdown-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .dropdown-icon {
          width: 16px;
          height: 16px;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          max-height: 300px;
          overflow-y: auto;
          margin-top: 4px;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-item:hover {
          background: #f9fafb;
        }

        .dropdown-item.loading,
        .dropdown-item.no-results {
          color: #6b7280;
          font-style: italic;
          cursor: default;
        }

        .dropdown-item.create-new {
          color: #3b82f6;
          font-weight: 500;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .create-icon {
          width: 16px;
          height: 16px;
        }

        .dropdown-item.company-item {
          border-bottom: 1px solid #f3f4f6;
        }

        .dropdown-item.company-item:last-child {
          border-bottom: none;
        }

        .company-details .company-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .company-details .company-industry {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        .company-contact-info {
          display: flex;
          gap: 12px;
          margin-top: 4px;
          font-size: 0.75rem;
        }

        .company-contact-info .company-location,
        .company-contact-info .company-website {
          color: #6b7280;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 4px;
        }

        /* Company Creation Modal */
        .company-creation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }

        .modal-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 1;
        }

        .company-form-error {
          padding: 24px;
          text-align: center;
        }

        .company-form-error h3 {
          color: #dc2626;
          margin-bottom: 12px;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .company-form-error p {
          color: #6b7280;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .company-form-error .btn-secondary {
          padding: 10px 20px;
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .company-form-error .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        @media (max-width: 768px) {
          .modal-content {
            margin: 10px;
            max-width: none;
            width: calc(100vw - 20px);
          }
        }
      `}</style>
    </div>
  );
};
