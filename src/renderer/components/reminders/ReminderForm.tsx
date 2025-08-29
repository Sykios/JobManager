import React, { useState, useEffect } from 'react';
import { ReminderPriority, ReminderType, Application } from '../../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardBody } from '../ui/Card';

interface ReminderFormData {
  title: string;
  description: string;
  reminder_date: string;
  reminder_time: string;
  reminder_type: ReminderType;
  priority: ReminderPriority;
  application_id?: number;
  email_notification_enabled: boolean;
  notification_time: number;
  recurrence_pattern?: string;
}

export interface ReminderFormProps {
  initialData?: Partial<ReminderFormData>;
  onSubmit: (data: ReminderFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  applications?: (Application & { company_name?: string })[];
}

interface FormErrors {
  [key: string]: string;
}

export const ReminderForm: React.FC<ReminderFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Erinnerung speichern',
  applications = []
}) => {
  const [formData, setFormData] = useState<ReminderFormData>({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '09:00',
    reminder_type: 'custom',
    priority: 'medium',
    email_notification_enabled: true,
    notification_time: 60,
    recurrence_pattern: undefined,
    ...initialData,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!formData.reminder_date) {
      newErrors.reminder_date = 'Datum ist erforderlich';
    }

    if (!formData.reminder_time) {
      newErrors.reminder_time = 'Zeit ist erforderlich';
    }

    // Validate that reminder date is not in the past
    if (formData.reminder_date && formData.reminder_time) {
      const reminderDateTime = new Date(`${formData.reminder_date}T${formData.reminder_time}`);
      const now = new Date();
      
      if (reminderDateTime < now) {
        newErrors.reminder_date = 'Erinnerungsdatum darf nicht in der Vergangenheit liegen';
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
      setErrors({ general: 'Fehler beim Speichern der Erinnerung' });
    }
  };

  const handleInputChange = (field: keyof ReminderFormData) => (
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      <Card>
        <CardHeader title={submitLabel.includes('bearbeiten') ? 'Erinnerung bearbeiten' : 'Neue Erinnerung'} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Titel"
                value={formData.title}
                onChange={handleInputChange('title')}
                error={errors.title}
                placeholder="z.B. Interview bei Firma XY"
                fullWidth
                required
                autoFocus
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={formData.description}
                onChange={handleInputChange('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Weitere Details..."
              />
            </div>

            <Input
              label="Datum"
              type="date"
              value={formData.reminder_date}
              onChange={handleInputChange('reminder_date')}
              error={errors.reminder_date}
              fullWidth
              required
            />

            <Input
              label="Zeit"
              type="time"
              value={formData.reminder_time}
              onChange={handleInputChange('reminder_time')}
              error={errors.reminder_time}
              fullWidth
              required
            />

            <Select
              label="Typ"
              value={formData.reminder_type}
              onChange={handleInputChange('reminder_type')}
              options={[
                { value: 'custom', label: 'Individuell' },
                { value: 'deadline', label: 'Deadline' },
                { value: 'follow_up', label: 'Follow-up' },
                { value: 'interview', label: 'Interview' },
              ]}
              fullWidth
            />

            <Select
              label="Priorität"
              value={formData.priority}
              onChange={handleInputChange('priority')}
              options={[
                { value: 'low', label: 'Niedrig' },
                { value: 'medium', label: 'Mittel' },
                { value: 'high', label: 'Hoch' },
                { value: 'urgent', label: 'Dringend' },
              ]}
              fullWidth
            />

            <Select
              label="Bewerbung (optional)"
              value={formData.application_id?.toString() || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                setFormData(prev => ({ ...prev, application_id: value }));
              }}
              options={[
                { value: '', label: 'Keine Bewerbung' },
                ...applications.map(app => ({
                  value: app.id.toString(),
                  label: `${app.position} - ${app.company_name || 'Unbekannt'}`
                }))
              ]}
              fullWidth
            />

            <Select
              label="Benachrichtigung (Min. vorher)"
              value={formData.notification_time.toString()}
              onChange={handleInputChange('notification_time')}
              options={[
                { value: '15', label: '15 Minuten' },
                { value: '30', label: '30 Minuten' },
                { value: '60', label: '1 Stunde' },
                { value: '120', label: '2 Stunden' },
                { value: '1440', label: '1 Tag' },
                { value: '10080', label: '1 Woche' },
              ]}
              fullWidth
            />

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_notification_enabled}
                  onChange={handleInputChange('email_notification_enabled')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">E-Mail-Benachrichtigung aktivieren</span>
              </label>
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