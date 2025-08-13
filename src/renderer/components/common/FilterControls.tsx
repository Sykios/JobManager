import React, { useState } from 'react';
import { ApplicationStatus, WorkType, Priority } from '../../../types';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusIndicators';
import { getStatusConfig } from '../../../utils/statusUtils';
import { AdvancedApplicationFilters, DateRangeFilter } from '../../../utils/filterUtils';

interface FilterControlsProps {
  filters: AdvancedApplicationFilters;
  onChange: (filters: AdvancedApplicationFilters) => void;
  onReset: () => void;
  className?: string;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  onReset,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof AdvancedApplicationFilters>(
    key: K,
    value: AdvancedApplicationFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const statusOptions = [
    { value: 'draft', label: '📝 Entwurf' },
    { value: 'applied', label: '📤 Beworben' },
    { value: 'in-review', label: '👀 In Prüfung' },
    { value: 'interview', label: '💼 Vorstellungsgespräch' },
    { value: 'offer', label: '🎉 Angebot' },
    { value: 'rejected', label: '❌ Abgelehnt' },
    { value: 'withdrawn', label: '↩️ Zurückgezogen' }
  ];

  const workTypeOptions = [
    { value: 'full-time', label: 'Vollzeit' },
    { value: 'part-time', label: 'Teilzeit' },
    { value: 'contract', label: 'Vertrag' },
    { value: 'internship', label: 'Praktikum' },
    { value: 'freelance', label: 'Freelance' }
  ];

  const priorityOptions = [
    { value: '1', label: '1 - Niedrig' },
    { value: '2', label: '2 - Gering' },
    { value: '3', label: '3 - Mittel' },
    { value: '4', label: '4 - Hoch' },
    { value: '5', label: '5 - Sehr hoch' }
  ];

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) {
      updateFilter('status', undefined);
      return;
    }

    // Handle multiple selection (simplified - in a real app you'd want a proper multi-select)
    const currentStatus = filters.status;
    if (Array.isArray(currentStatus)) {
      if (currentStatus.includes(value as ApplicationStatus)) {
        const newStatus = currentStatus.filter(s => s !== value);
        updateFilter('status', newStatus.length > 0 ? newStatus : undefined);
      } else {
        updateFilter('status', [...currentStatus, value as ApplicationStatus]);
      }
    } else if (currentStatus === value) {
      updateFilter('status', undefined);
    } else {
      updateFilter('status', value as ApplicationStatus);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.work_type) count++;
    if (filters.remote_possible !== undefined) count++;
    if (filters.priority || filters.priorityRange) count++;
    if (filters.deadline) count++;
    if (filters.application_date) count++;
    if (filters.has_deadline !== undefined) count++;
    if (filters.is_overdue) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <Card className={`${className}`}>
      <div className="p-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">Filter</h3>
            {activeCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '📤 Weniger' : '📥 Mehr'}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                ✕ Zurücksetzen
              </Button>
            )}
          </div>
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={Array.isArray(filters.status) ? filters.status[0] : filters.status || ''}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="Status wählen..."
            />
            {Array.isArray(filters.status) && filters.status.length > 1 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {filters.status.map(status => (
                  <StatusBadge key={status} status={status} size="sm" />
                ))}
              </div>
            )}
          </div>

          {/* Work Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arbeitsart
            </label>
            <Select
              value={filters.work_type || ''}
              onChange={(e) => updateFilter('work_type', e.target.value as WorkType || undefined)}
              options={workTypeOptions}
              placeholder="Arbeitsart wählen..."
            />
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorität
            </label>
            <Select
              value={filters.priority?.toString() || ''}
              onChange={(e) => updateFilter('priority', e.target.value ? parseInt(e.target.value) as Priority : undefined)}
              options={priorityOptions}
              placeholder="Priorität wählen..."
            />
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="mt-6 space-y-4 pt-4 border-t border-gray-200">
            {/* Boolean Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remote-possible"
                  checked={filters.remote_possible || false}
                  onChange={(e) => updateFilter('remote_possible', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remote-possible" className="text-sm text-gray-700">
                  Remote möglich
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-deadline"
                  checked={filters.has_deadline || false}
                  onChange={(e) => updateFilter('has_deadline', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="has-deadline" className="text-sm text-gray-700">
                  Hat Bewerbungsfrist
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-overdue"
                  checked={filters.is_overdue || false}
                  onChange={(e) => updateFilter('is_overdue', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-overdue" className="text-sm text-red-600">
                  Überfällig
                </label>
              </div>
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateRangeInput
                label="Bewerbungsdatum"
                value={filters.application_date}
                onChange={(range) => updateFilter('application_date', range)}
              />
              <DateRangeInput
                label="Bewerbungsfrist"
                value={filters.deadline}
                onChange={(range) => updateFilter('deadline', range)}
              />
            </div>

            {/* Priority Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioritätsbereich
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Select
                    value={filters.priorityRange?.min?.toString() || ''}
                    onChange={(e) => {
                      const min = e.target.value ? parseInt(e.target.value) as Priority : undefined;
                      updateFilter('priorityRange', min ? { 
                        min, 
                        max: filters.priorityRange?.max || 5 
                      } : undefined);
                    }}
                    options={priorityOptions}
                    placeholder="Min..."
                  />
                </div>
                <span className="text-gray-500">bis</span>
                <div className="flex-1">
                  <Select
                    value={filters.priorityRange?.max?.toString() || ''}
                    onChange={(e) => {
                      const max = e.target.value ? parseInt(e.target.value) as Priority : undefined;
                      updateFilter('priorityRange', max ? { 
                        min: filters.priorityRange?.min || 1, 
                        max 
                      } : undefined);
                    }}
                    options={priorityOptions}
                    placeholder="Max..."
                  />
                </div>
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standort
              </label>
              <Input
                value={typeof filters.location === 'string' ? filters.location : ''}
                onChange={(e) => updateFilter('location', e.target.value || undefined)}
                placeholder="z.B. Wien, München, Berlin..."
                fullWidth
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface DateRangeInputProps {
  label: string;
  value?: DateRangeFilter;
  onChange: (range: DateRangeFilter | undefined) => void;
}

const DateRangeInput: React.FC<DateRangeInputProps> = ({
  label,
  value,
  onChange
}) => {
  const handleStartChange = (start: string) => {
    if (!start && !value?.end) {
      onChange(undefined);
    } else {
      onChange({ start: start || undefined, end: value?.end });
    }
  };

  const handleEndChange = (end: string) => {
    if (!end && !value?.start) {
      onChange(undefined);
    } else {
      onChange({ start: value?.start, end: end || undefined });
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        <Input
          type="date"
          value={value?.start || ''}
          onChange={(e) => handleStartChange(e.target.value)}
          placeholder="Von..."
          fullWidth
        />
        <Input
          type="date"
          value={value?.end || ''}
          onChange={(e) => handleEndChange(e.target.value)}
          placeholder="Bis..."
          fullWidth
        />
      </div>
    </div>
  );
};
