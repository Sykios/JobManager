import React, { useState, useEffect, useMemo } from 'react';
import { ReminderPriority, ReminderType, Application } from '../../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { ReminderTemplates, ReminderTemplate } from './ReminderTemplates';

interface ReminderFormData {
  title: string;
  description: string;
  reminder_date: string;
  reminder_time?: string; // Made optional
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
  // Memoize initial form data to prevent unnecessary re-renders
  const defaultFormData = useMemo(() => ({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '09:00', // Default time, will be cleaned if not wanted
    reminder_type: 'custom' as ReminderType,
    priority: 'medium' as ReminderPriority,
    email_notification_enabled: true,
    notification_time: 60,
    recurrence_pattern: undefined,
  }), []);

  const [formData, setFormData] = useState<ReminderFormData>(() => ({
    ...defaultFormData,
    ...initialData,
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [showTemplates, setShowTemplates] = useState(false);

  // Update form data when initialData changes (for editing)
  // Only run when initialData actually has content
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData({
        ...defaultFormData,
        ...initialData,
      });
    } else if (!initialData) {
      // Reset to default when initialData becomes undefined (for new reminders)
      setFormData(defaultFormData);
    }
  }, [initialData, defaultFormData]);

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
    if (formData.reminder_date) {
      const today = new Date();
      const reminderDate = new Date(formData.reminder_date);
      
      // If time is provided, check datetime combination
      if (formData.reminder_time && formData.reminder_time.trim() !== '') {
        const reminderDateTime = new Date(`${formData.reminder_date}T${formData.reminder_time}`);
        if (reminderDateTime < today) {
          newErrors.reminder_date = 'Erinnerungsdatum darf nicht in der Vergangenheit liegen';
        }
      } else {
        // For date-only reminders, just check if date is not in past
        const todayDate = today.toISOString().split('T')[0];
        if (formData.reminder_date < todayDate) {
          newErrors.reminder_date = 'Erinnerungsdatum darf nicht in der Vergangenheit liegen';
        }
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
      // Clean up form data before submitting
      const cleanedData = {
        ...formData,
        // Convert empty string to undefined for optional time field
        reminder_time: formData.reminder_time && formData.reminder_time.trim() !== '' 
          ? formData.reminder_time 
          : undefined,
        // Ensure recurrence_pattern is undefined if not set
        recurrence_pattern: formData.recurrence_pattern && formData.recurrence_pattern.trim() !== '' 
          ? formData.recurrence_pattern 
          : undefined
      };
      
      await onSubmit(cleanedData);
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

  const handleUseTemplate = (template: ReminderTemplate) => {
    // Get selected application for template variable replacement
    const selectedApplication = applications.find(app => app.id === formData.application_id);
    const companyName = selectedApplication?.company_name || 'Unknown Company';
    const position = selectedApplication?.position || 'Position';

    // Replace template variables
    const title = template.title_template
      .replace(/\{position\}/g, position)
      .replace(/\{company\}/g, companyName);

    const description = template.description_template
      .replace(/\{position\}/g, position)
      .replace(/\{company\}/g, companyName);

    // Calculate default reminder date based on template conditions
    let reminderDate = '';
    if (template.trigger_conditions) {
      try {
        const conditions = JSON.parse(template.trigger_conditions);
        const today = new Date();
        
        if (conditions.days_after_application && selectedApplication?.application_date) {
          const appDate = new Date(selectedApplication.application_date);
          appDate.setDate(appDate.getDate() + conditions.days_after_application);
          reminderDate = appDate.toISOString().split('T')[0];
        } else if (conditions.days_from_now) {
          today.setDate(today.getDate() + conditions.days_from_now);
          reminderDate = today.toISOString().split('T')[0];
        } else {
          // Default to tomorrow
          today.setDate(today.getDate() + 1);
          reminderDate = today.toISOString().split('T')[0];
        }
      } catch (e) {
        // Default to tomorrow if parsing fails
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        reminderDate = tomorrow.toISOString().split('T')[0];
      }
    }

    setFormData(prev => ({
      ...prev,
      title,
      description,
      reminder_type: template.reminder_type,
      priority: template.default_priority,
      notification_time: template.default_notification_time,
      reminder_date: reminderDate || prev.reminder_date,
    }));

    setShowTemplates(false);
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {!showTemplates && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {submitLabel.includes('bearbeiten') ? 'Erinnerung bearbeiten' : 'Neue Erinnerung'}
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            📝 Vorlage verwenden
          </Button>
        </div>
      )}

      {showTemplates && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vorlage auswählen</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowTemplates(false)}
            >
              ✕ Zurück zum Formular
            </Button>
          </div>
          <ReminderTemplates onUseTemplate={handleUseTemplate} />
        </div>
      )}

      {!showTemplates && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <Card>
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
                  label="Zeit (optional)"
                  type="time"
                  value={formData.reminder_time}
                  onChange={handleInputChange('reminder_time')}
                  error={errors.reminder_time}
                  fullWidth
                  placeholder="Leer lassen für ganztägig"
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
      )}
    </div>
  );
};