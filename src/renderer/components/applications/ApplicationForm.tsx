import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectOption } from '../ui/Select';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { ContactSelector } from '../ui/ContactSelector';
import { ApplicationCreateData } from '../../../services/ApplicationService';
import { ContactModel } from '../../../models/Contact';
import { WorkType, Priority } from '../../../types';

export interface ApplicationFormProps {
  initialData?: Partial<ApplicationCreateData>;
  onSubmit: (data: ApplicationCreateData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormData extends ApplicationCreateData {
  // Additional UI state can be added here
}

interface FormErrors {
  [key: string]: string;
}

const WORK_TYPE_OPTIONS: SelectOption[] = [
  { value: 'full-time', label: 'Vollzeit' },
  { value: 'part-time', label: 'Teilzeit' },
  { value: 'contract', label: 'Vertrag' },
  { value: 'internship', label: 'Praktikum' },
  { value: 'freelance', label: 'Freelance' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 1, label: '1 - Niedrig' },
  { value: 2, label: '2 - Gering' },
  { value: 3, label: '3 - Mittel' },
  { value: 4, label: '4 - Hoch' },
  { value: 5, label: '5 - Sehr hoch' },
];

const APPLICATION_CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'website', label: 'Firmen-Website' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'xing', label: 'XING' },
  { value: 'stepstone', label: 'StepStone' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'monster', label: 'Monster' },
  { value: 'email', label: 'E-Mail' },
  { value: 'referral', label: 'Empfehlung' },
  { value: 'other', label: 'Sonstiges' },
];

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Bewerbung speichern',
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    position: '',
    company_id: undefined,
    contact_id: undefined,
    job_url: '',
    application_channel: '',
    salary_range: '',
    work_type: undefined,
    location: '',
    remote_possible: false,
    priority: 3,
    application_date: '',
    deadline: '',
    follow_up_date: '',
    notes: '',
    cover_letter: '',
    requirements: '',
    benefits: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedContact, setSelectedContact] = useState<ContactModel | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position ist erforderlich';
    }

    if (formData.priority && (formData.priority < 1 || formData.priority > 5)) {
      newErrors.priority = 'Priorität muss zwischen 1 und 5 liegen';
    }

    if (formData.deadline && formData.application_date) {
      const deadlineDate = new Date(formData.deadline);
      const applicationDate = new Date(formData.application_date);
      
      if (deadlineDate < applicationDate) {
        newErrors.deadline = 'Bewerbungsfrist kann nicht vor dem Bewerbungsdatum liegen';
      }
    }

    if (formData.job_url && formData.job_url.trim()) {
      try {
        new URL(formData.job_url);
      } catch {
        newErrors.job_url = 'Bitte geben Sie eine gültige URL ein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle submission errors here
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;

    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleContactSelect = (contact: ContactModel | null) => {
    setSelectedContact(contact);
    setFormData(prev => ({
      ...prev,
      contact_id: contact?.id,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Grundinformationen" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Titel der Bewerbung"
              value={formData.title}
              onChange={handleInputChange('title')}
              error={errors.title}
              placeholder="z.B. Frontend Developer bei Acme Corp"
              fullWidth
              required
            />
            <Input
              label="Position"
              value={formData.position}
              onChange={handleInputChange('position')}
              error={errors.position}
              placeholder="z.B. Frontend Developer"
              fullWidth
              required
            />
            <Input
              label="Standort"
              value={formData.location}
              onChange={handleInputChange('location')}
              placeholder="z.B. Berlin, Remote"
              fullWidth
            />
            <Select
              label="Arbeitstyp"
              value={formData.work_type || ''}
              onChange={handleInputChange('work_type')}
              options={WORK_TYPE_OPTIONS}
              placeholder="Wählen Sie einen Arbeitstyp"
              fullWidth
            />
          </div>
          
          <div className="mt-4">
            <ContactSelector
              selectedContactId={formData.contact_id}
              onContactSelect={handleContactSelect}
              placeholder="Ansprechpartner auswählen (optional)..."
            />
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.remote_possible}
                onChange={handleInputChange('remote_possible')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-900">Remote möglich</span>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bewerbungsdetails" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Job-URL"
              type="url"
              value={formData.job_url}
              onChange={handleInputChange('job_url')}
              error={errors.job_url}
              placeholder="https://..."
              fullWidth
            />
            <Select
              label="Bewerbungskanal"
              value={formData.application_channel || ''}
              onChange={handleInputChange('application_channel')}
              options={APPLICATION_CHANNEL_OPTIONS}
              placeholder="Wo haben Sie sich beworben?"
              fullWidth
            />
            <Input
              label="Gehaltsvorstellung"
              value={formData.salary_range}
              onChange={handleInputChange('salary_range')}
              placeholder="z.B. 50.000 - 60.000 EUR"
              fullWidth
            />
            <Select
              label="Priorität"
              value={formData.priority?.toString() || '3'}
              onChange={handleInputChange('priority')}
              options={PRIORITY_OPTIONS}
              fullWidth
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Termine" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Bewerbungsdatum"
              type="date"
              value={formData.application_date}
              onChange={handleInputChange('application_date')}
              fullWidth
            />
            <Input
              label="Bewerbungsfrist"
              type="date"
              value={formData.deadline}
              onChange={handleInputChange('deadline')}
              error={errors.deadline}
              fullWidth
            />
            <Input
              label="Nachfassen am"
              type="date"
              value={formData.follow_up_date}
              onChange={handleInputChange('follow_up_date')}
              fullWidth
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Zusätzliche Informationen" />
        <CardBody>
          <div className="space-y-4">
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                Anforderungen
              </label>
              <textarea
                id="requirements"
                rows={3}
                value={formData.requirements}
                onChange={handleInputChange('requirements')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Beschreiben Sie die wichtigsten Anforderungen..."
              />
            </div>
            
            <div>
              <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                Benefits
              </label>
              <textarea
                id="benefits"
                rows={3}
                value={formData.benefits}
                onChange={handleInputChange('benefits')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Welche Benefits bietet die Position..."
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={handleInputChange('notes')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ihre persönlichen Notizen zur Bewerbung..."
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
