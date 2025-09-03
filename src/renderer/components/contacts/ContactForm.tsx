import React, { useState, useEffect } from 'react';
import { ContactModel } from '../../../models/Contact';
import { ContactCreateData, ContactUpdateData } from '../../../services/ContactService';
import { Company } from '../../../types';

interface ContactFormProps {
  contact?: ContactModel;
  companyId?: number;
  onSave: (data: ContactCreateData | ContactUpdateData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  companyId,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    company_id: companyId || contact?.company_id || undefined,
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    position: contact?.position || '',
    linkedin_url: contact?.linkedin_url || '',
    notes: contact?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Load companies on component mount
  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        // Get all companies via IPC using SQL query
        const result = await window.electronAPI.queryDatabase(
          'SELECT * FROM companies ORDER BY name ASC',
          []
        );
        if (result) {
          setCompanies(result);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
        setErrors(prev => ({ ...prev, companies: 'Fehler beim Laden der Unternehmen' }));
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      // Create temporary contact for validation
      const tempContact = new ContactModel(formData);
      
      // Validate the contact
      const validation = tempContact.validate();
      
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Vorname')) {
            newErrors.first_name = error;
          } else if (error.includes('E-Mail')) {
            newErrors.email = error;
          } else if (error.includes('Telefon')) {
            newErrors.phone = error;
          } else if (error.includes('LinkedIn')) {
            newErrors.linkedin_url = error;
          }
        });
      }
    } catch (validationError) {
      // Add a general error if validation itself fails
      newErrors.general = 'Validation failed: ' + (validationError instanceof Error ? validationError.message : String(validationError));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue: any = value;
    
    // Handle company_id as number
    if (field === 'company_id') {
      processedValue = value === '' ? undefined : parseInt(value, 10);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Mark field as touched
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur if field has been touched
    if (formData[field as keyof typeof formData]) {
      validateForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched to show validation errors
    const allFields = Object.keys(formData);
    const touchedFields = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouched(touchedFields);

    if (validateForm()) {
      try {
        await onSave(formData);
      } catch (error) {
        setErrors({ general: 'Fehler beim Speichern des Kontakts' });
      }
    }
  };

  const formatPhoneAsYouType = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // If starts with +, keep the + and format accordingly
    const hasPlus = value.startsWith('+');
    
    // Handle different country codes and formats
    if (hasPlus && digits.length > 0) {
      // International format starting with +
      if (digits.startsWith('49')) { // Germany
        if (digits.length <= 2) return `+${digits}`;
        if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
        return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
      } else if (digits.startsWith('43')) { // Austria  
        if (digits.length <= 2) return `+${digits}`;
        if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
        return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
      } else {
        // Generic international format
        if (digits.length <= 3) return `+${digits}`;
        if (digits.length <= 6) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
        if (digits.length <= 10) return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
      }
    } else {
      // Domestic format (German/Austrian)
      if (digits.length === 0) return '';
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      if (digits.length <= 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    // Allow + at the beginning
    if (value === '+') {
      handleInputChange('phone', '+');
      return;
    }
    
    const formatted = formatPhoneAsYouType(value);
    handleInputChange('phone', formatted);
  };

  return (
    <div className="contact-form">
      <div className="form-header">
        <h3>{contact ? 'Kontakt bearbeiten' : 'Neuen Kontakt erstellen'}</h3>
      </div>

      {errors.general && (
        <div className="error-banner">
          {errors.general}
        </div>
      )}

      {errors.companies && (
        <div className="error-banner">
          {errors.companies}
        </div>
      )}

      {/* Company Selection */}
      <div className="form-group company-selection">
        <label htmlFor="company_id">Unternehmen</label>
        <select
          id="company_id"
          value={formData.company_id || ''}
          onChange={(e) => handleInputChange('company_id', e.target.value)}
          disabled={isLoading || loadingCompanies}
          className="company-select"
        >
          <option value="">Kein Unternehmen ausgewählt</option>
          {loadingCompanies ? (
            <option disabled>Lade Unternehmen...</option>
          ) : (
            companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.location && ` (${company.location})`}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="form-grid">
        {/* First Name */}
        <div className="form-group required">
          <label htmlFor="first_name">Vorname *</label>
          <input
            type="text"
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            onBlur={() => handleBlur('first_name')}
            className={errors.first_name ? 'error' : ''}
            required
            disabled={isLoading}
            placeholder="Vorname eingeben"
          />
          {errors.first_name && touched.first_name && (
            <span className="error-text">{errors.first_name}</span>
          )}
        </div>

        {/* Last Name */}
        <div className="form-group">
          <label htmlFor="last_name">Nachname</label>
          <input
            type="text"
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            onBlur={() => handleBlur('last_name')}
            disabled={isLoading}
            placeholder="Nachname eingeben"
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">E-Mail</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className={errors.email ? 'error' : ''}
            disabled={isLoading}
            placeholder="email@beispiel.de"
          />
          {errors.email && touched.email && (
            <span className="error-text">{errors.email}</span>
          )}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label htmlFor="phone">Telefonnummer</label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={errors.phone ? 'error' : ''}
            disabled={isLoading}
            placeholder="0123 456 7890"
          />
          {errors.phone && touched.phone && (
            <span className="error-text">{errors.phone}</span>
          )}
        </div>

        {/* Position */}
        <div className="form-group">
          <label htmlFor="position">Position</label>
          <input
            type="text"
            id="position"
            value={formData.position}
            onChange={(e) => handleInputChange('position', e.target.value)}
            onBlur={() => handleBlur('position')}
            disabled={isLoading}
            placeholder="z.B. Personalreferent, Teamleiter"
          />
        </div>

        {/* LinkedIn URL */}
        <div className="form-group">
          <label htmlFor="linkedin_url">LinkedIn Profil</label>
          <input
            type="url"
            id="linkedin_url"
            value={formData.linkedin_url}
            onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
            onBlur={() => handleBlur('linkedin_url')}
            className={errors.linkedin_url ? 'error' : ''}
            disabled={isLoading}
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedin_url && touched.linkedin_url && (
            <span className="error-text">{errors.linkedin_url}</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="form-group full-width">
        <label htmlFor="notes">Notizen</label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          disabled={isLoading}
          placeholder="Zusätzliche Informationen zum Kontakt..."
          rows={4}
        />
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isLoading}
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Speichert...' : (contact ? 'Kontakt aktualisieren' : 'Kontakt erstellen')}
        </button>
      </div>

      <style>{`
        .contact-form {
          padding: 24px;
          background: white;
        }

        .form-header {
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.company-selection {
          margin-bottom: 20px;
        }

        .form-group.required label::after {
          content: ' *';
          color: #dc2626;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
          box-sizing: border-box;
          pointer-events: auto;
          position: relative;
          z-index: 1;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error,
        .form-group textarea.error,
        .form-group select.error {
          border-color: #dc2626;
        }

        .form-group input:disabled,
        .form-group textarea:disabled,
        .form-group select:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .company-select {
          background-color: white;
          cursor: pointer;
        }

        .company-select:disabled {
          cursor: not-allowed;
        }

        .error-text {
          font-size: 0.75rem;
          color: #dc2626;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
          min-width: 120px;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .btn-primary:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: white;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .contact-form {
            padding: 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
