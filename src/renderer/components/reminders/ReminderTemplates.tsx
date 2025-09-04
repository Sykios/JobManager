import React, { useState, useEffect } from 'react';
import { ReminderPriority, ReminderType } from '../../../types';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export interface ReminderTemplate {
  id: number;
  name: string;
  title_template: string;
  description_template: string;
  reminder_type: ReminderType;
  default_notification_time: number;
  default_priority: ReminderPriority;
  trigger_conditions: string; // JSON string
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

interface ReminderTemplatesProps {
  onUseTemplate?: (template: ReminderTemplate) => void;
  showManagement?: boolean;
}

export const ReminderTemplates: React.FC<ReminderTemplatesProps> = ({
  onUseTemplate,
  showManagement = false
}) => {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.queryDatabase(
        `SELECT * FROM reminder_templates 
         WHERE deleted_at IS NULL 
         ORDER BY is_system_template DESC, name ASC`,
        []
      );
      setTemplates(result || []);
    } catch (error) {
      console.error('Error loading reminder templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: ReminderTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;

    try {
      await window.electronAPI.queryDatabase(
        'UPDATE reminder_templates SET deleted_at = datetime("now") WHERE id = ? AND is_system_template = FALSE',
        [id]
      );
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getTypeLabel = (type: ReminderType): string => {
    const labels = {
      deadline: 'Deadline',
      follow_up: 'Follow-up',
      interview: 'Interview',
      custom: 'Individuell'
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: ReminderPriority): string => {
    const labels = {
      1: 'Niedrig',
      2: 'Mittel',
      3: 'Hoch',
      4: 'Dringend'
    };
    return labels[priority] || `Priorität ${priority}`;
  };

  const getPriorityColor = (priority: ReminderPriority): string => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors[2]; // default to medium
  };

  const getTypeColor = (type: ReminderType): string => {
    const colors = {
      deadline: 'bg-red-100 text-red-800',
      follow_up: 'bg-green-100 text-green-800',
      interview: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.custom;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Erinnerungsvorlagen" />
        <CardBody>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader 
          title="Erinnerungsvorlagen" 
          action={showManagement && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              + Neue Vorlage
            </Button>
          )}
        />
        <CardBody>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Keine Vorlagen verfügbar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {template.name}
                          {template.is_system_template && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              System
                            </span>
                          )}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(template.reminder_type)}`}>
                          {getTypeLabel(template.reminder_type)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(template.default_priority)}`}>
                          {getPriorityLabel(template.default_priority)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.default_notification_time >= 1440 
                            ? `${Math.round(template.default_notification_time / 1440)} Tag(e)`
                            : `${template.default_notification_time} Min.`
                          } vorher
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Titel:</span> {template.title_template}
                        </p>
                        {template.description_template && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Beschreibung:</span> {template.description_template}
                          </p>
                        )}
                      </div>

                      {template.trigger_conditions && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Automatisch erstellt:</span>
                          <span className="ml-1">
                            {JSON.parse(template.trigger_conditions).days_after_application && 
                              `${JSON.parse(template.trigger_conditions).days_after_application} Tage nach Bewerbung`}
                            {JSON.parse(template.trigger_conditions).status === 'interview' && 'Bei Interview-Status'}
                            {JSON.parse(template.trigger_conditions).deadline_field && 'Bei Deadline-Datum'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {onUseTemplate && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                        >
                          Verwenden
                        </Button>
                      )}
                      
                      {showManagement && !template.is_system_template && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingTemplate(template)}
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            Löschen
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {showCreateForm && (
        <TemplateForm
          onSubmit={async (data) => {
            try {
              await window.electronAPI.queryDatabase(
                `INSERT INTO reminder_templates (
                  name, title_template, description_template, reminder_type,
                  default_notification_time, default_priority, trigger_conditions,
                  is_system_template, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, datetime('now'), datetime('now'))`,
                [
                  data.name,
                  data.title_template,
                  data.description_template,
                  data.reminder_type,
                  data.default_notification_time,
                  data.default_priority,
                  data.trigger_conditions || null
                ]
              );
              setShowCreateForm(false);
              await loadTemplates();
            } catch (error) {
              console.error('Error creating template:', error);
            }
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingTemplate && (
        <TemplateForm
          initialData={editingTemplate}
          onSubmit={async (data) => {
            try {
              await window.electronAPI.queryDatabase(
                `UPDATE reminder_templates SET
                  name = ?, title_template = ?, description_template = ?,
                  reminder_type = ?, default_notification_time = ?, default_priority = ?,
                  trigger_conditions = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [
                  data.name,
                  data.title_template,
                  data.description_template,
                  data.reminder_type,
                  data.default_notification_time,
                  data.default_priority,
                  data.trigger_conditions || null,
                  editingTemplate.id
                ]
              );
              setEditingTemplate(null);
              await loadTemplates();
            } catch (error) {
              console.error('Error updating template:', error);
            }
          }}
          onCancel={() => setEditingTemplate(null)}
          isEditing
        />
      )}
    </div>
  );
};

interface TemplateFormData {
  name: string;
  title_template: string;
  description_template: string;
  reminder_type: ReminderType;
  default_notification_time: number;
  default_priority: ReminderPriority;
  trigger_conditions?: string;
}

interface TemplateFormProps {
  initialData?: Partial<ReminderTemplate>;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const TemplateForm: React.FC<TemplateFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData.name || '',
    title_template: initialData.title_template || '',
    description_template: initialData.description_template || '',
    reminder_type: initialData.reminder_type || 'custom',
    default_notification_time: initialData.default_notification_time || 60,
    default_priority: initialData.default_priority || 2,
    trigger_conditions: initialData.trigger_conditions || ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.title_template.trim()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting template form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TemplateFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <Card>
      <CardHeader title={isEditing ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'} />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="z.B. Interview Vorbereitung"
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

            <div className="md:col-span-2">
              <Input
                label="Titel-Vorlage"
                value={formData.title_template}
                onChange={handleInputChange('title_template')}
                placeholder="z.B. Interview: {position} bei {company}"
                fullWidth
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Verwenden Sie {"{position}"} und {"{company}"} für dynamische Inhalte
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibungs-Vorlage
              </label>
              <textarea
                value={formData.description_template}
                onChange={handleInputChange('description_template')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="z.B. Bereiten Sie sich auf Ihr Interview für {position} bei {company} vor..."
              />
            </div>

            <Select
              label="Standard-Priorität"
              value={formData.default_priority.toString()}
              onChange={(e) => {
                const value = parseInt(e.target.value) as ReminderPriority;
                setFormData(prev => ({ ...prev, default_priority: value }));
              }}
              options={[
                { value: '1', label: 'Niedrig' },
                { value: '2', label: 'Mittel' },
                { value: '3', label: 'Hoch' },
                { value: '4', label: 'Dringend' },
              ]}
              fullWidth
            />

            <Select
              label="Standard-Benachrichtigung"
              value={formData.default_notification_time.toString()}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData(prev => ({ ...prev, default_notification_time: value }));
              }}
              options={[
                { value: '15', label: '15 Minuten' },
                { value: '30', label: '30 Minuten' },
                { value: '60', label: '1 Stunde' },
                { value: '120', label: '2 Stunden' },
                { value: '1440', label: '1 Tag' },
                { value: '2880', label: '2 Tage' },
                { value: '4320', label: '3 Tage' },
                { value: '10080', label: '1 Woche' },
              ]}
              fullWidth
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={loading}
            >
              {isEditing ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
};