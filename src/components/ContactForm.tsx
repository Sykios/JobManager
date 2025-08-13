import React, { useState, useEffect } from 'react';
import { ContactModel } from '../models/Contact';
import { ContactCreateData, ContactUpdateData } from '../services/ContactService';

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

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Create temporary contact for validation
    const tempContact = new ContactModel(formData);
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
    
    // Mark all fields as touched
    const allFields = Object.keys(formData);
    const touchedFields = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouched(touchedFields);

    if (validateForm()) {
      try {
        await onSave(formData);
      } catch (error) {
        console.error('Error saving contact:', error);
        setErrors({ general: 'Fehler beim Speichern des Kontakts' });
      }
    }
  };

  const formatPhoneAsYouType = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format German phone numbers
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneAsYouType(value);
    handleInputChange('phone', formatted);
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="form-header">
        <h3>{contact ? 'Kontakt bearbeiten' : 'Neuen Kontakt erstellen'}</h3>
      </div>

      {errors.general && (
        <div className="error-banner">
          {errors.general}
        </div>
      )}

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
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Speichert...' : (contact ? 'Kontakt aktualisieren' : 'Kontakt erstellen')}
        </button>
      </div>


    </form>
  );
};
