import React, { useState } from 'react';
import { Company } from '../../../types';
import { CompanyModel } from '../../../models/Company';

export interface CompanyFormProps {
  company?: Company;
  onSave: (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Company>;
  isLoading?: boolean;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onSave,
  onCancel,
  initialData = {},
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: company?.name || initialData.name || '',
    industry: company?.industry || initialData.industry || '',
    location: company?.location || initialData.location || '',
    website: company?.website || initialData.website || '',
    description: company?.description || initialData.description || '',
    size: company?.size || initialData.size || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      // Create temporary company for validation
      const tempCompany = new CompanyModel(formData);
      
      // Validate the company
      const validation = tempCompany.validate();
      
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Firmenname') || error.includes('name')) {
            newErrors.name = error;
          } else if (error.includes('Website') || error.includes('URL')) {
            newErrors.website = error;
          } else if (error.includes('Branche') || error.includes('industry')) {
            newErrors.industry = error;
          } else if (error.includes('Standort') || error.includes('location')) {
            newErrors.location = error;
          } else if (error.includes('Größe') || error.includes('size')) {
            newErrors.size = error;
          } else if (error.includes('Beschreibung') || error.includes('description')) {
            newErrors.description = error;
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
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
    e.stopPropagation(); // Prevent event bubbling to parent forms
    
    // Mark all fields as touched to show validation errors
    const allFields = Object.keys(formData);
    const touchedFields = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouched(touchedFields);

    if (validateForm()) {
      try {
        await onSave({
          name: formData.name.trim(),
          industry: formData.industry.trim() || undefined,
          location: formData.location.trim() || undefined,
          website: formData.website.trim() || undefined,
          description: formData.description.trim() || undefined,
          size: formData.size.trim() || undefined
        });
      } catch (error) {
        setErrors({ general: 'Fehler beim Speichern des Unternehmens' });
      }
    }
  };

  return (
    <div className="company-form">
      <div className="form-header">
        <h3>{company ? 'Unternehmen bearbeiten' : 'Neues Unternehmen erstellen'}</h3>
      </div>

      {errors.general && (
        <div className="error-banner">
          {errors.general}
        </div>
      )}

      <div className="form-grid">
        {/* Company Name */}
        <div className="form-group required">
          <label htmlFor="company_name">Firmenname *</label>
          <input
            type="text"
            id="company_name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={errors.name ? 'error' : ''}
            required
            disabled={isLoading}
            placeholder="Firmenname eingeben"
            autoFocus
          />
          {errors.name && touched.name && (
            <span className="error-text">{errors.name}</span>
          )}
        </div>

        {/* Industry */}
        <div className="form-group">
          <label htmlFor="industry">Branche</label>
          <input
            type="text"
            id="industry"
            value={formData.industry}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            onBlur={() => handleBlur('industry')}
            className={errors.industry ? 'error' : ''}
            disabled={isLoading}
            placeholder="z.B. Technologie, Gesundheitswesen"
          />
          {errors.industry && touched.industry && (
            <span className="error-text">{errors.industry}</span>
          )}
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Standort</label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            onBlur={() => handleBlur('location')}
            className={errors.location ? 'error' : ''}
            disabled={isLoading}
            placeholder="z.B. Berlin, München"
          />
          {errors.location && touched.location && (
            <span className="error-text">{errors.location}</span>
          )}
        </div>

        {/* Company Size */}
        <div className="form-group">
          <label htmlFor="size">Unternehmensgröße</label>
          <input
            type="text"
            id="size"
            value={formData.size}
            onChange={(e) => handleInputChange('size', e.target.value)}
            onBlur={() => handleBlur('size')}
            className={errors.size ? 'error' : ''}
            disabled={isLoading}
            placeholder="z.B. 50-100 Mitarbeiter"
          />
          {errors.size && touched.size && (
            <span className="error-text">{errors.size}</span>
          )}
        </div>

        {/* Website */}
        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            onBlur={() => handleBlur('website')}
            className={errors.website ? 'error' : ''}
            disabled={isLoading}
            placeholder="https://www.unternehmen.de"
          />
          {errors.website && touched.website && (
            <span className="error-text">{errors.website}</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="form-group full-width">
        <label htmlFor="description">Beschreibung</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          className={errors.description ? 'error' : ''}
          disabled={isLoading}
          placeholder="Kurze Beschreibung des Unternehmens..."
          rows={4}
        />
        {errors.description && touched.description && (
          <span className="error-text">{errors.description}</span>
        )}
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
          {isLoading ? 'Speichert...' : (company ? 'Unternehmen aktualisieren' : 'Unternehmen erstellen')}
        </button>
      </div>

      <style>{`
        .company-form {
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
        .form-group textarea {
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
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error,
        .form-group textarea.error {
          border-color: #dc2626;
        }

        .form-group input:disabled,
        .form-group textarea:disabled {
          background-color: #f9fafb;
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
          .company-form {
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

export default CompanyForm;
