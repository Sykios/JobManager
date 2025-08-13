import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SearchFieldFilter, SearchableField, DEFAULT_FILTER_PRESETS, FilterPreset } from '../../../utils/filterUtils';

interface SearchInputProps {
  value?: string;
  onChange: (query: string, fields?: SearchableField[]) => void;
  placeholder?: string;
  searchFields?: SearchableField[];
  showAdvancedOptions?: boolean;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value = '',
  onChange,
  placeholder = 'Bewerbungen durchsuchen...',
  searchFields = ['title', 'position', 'location', 'notes'],
  showAdvancedOptions = false,
  debounceMs = 300,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<SearchableField[]>(searchFields);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedOnChange = useCallback((query: string, fields: SearchableField[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onChange(query, fields);
    }, debounceMs);
  }, [onChange, debounceMs]);

  useEffect(() => {
    debouncedOnChange(inputValue, selectedFields);
  }, [inputValue, selectedFields, debouncedOnChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleFieldToggle = (field: SearchableField) => {
    const newFields = selectedFields.includes(field)
      ? selectedFields.filter(f => f !== field)
      : [...selectedFields, field];
    
    setSelectedFields(newFields);
  };

  const clearSearch = () => {
    setInputValue('');
    onChange('', selectedFields);
  };

  const fieldLabels: Record<SearchableField, string> = {
    title: 'Stellentitel',
    position: 'Position',
    location: 'Ort',
    notes: 'Notizen',
    requirements: 'Anforderungen',
    benefits: 'Benefits',
    cover_letter: 'Anschreiben',
    application_channel: 'Bewerbungsweg'
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-20"
          fullWidth
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="mr-1 text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          )}
          {showAdvancedOptions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`mr-2 ${isAdvancedOpen ? 'text-blue-600' : 'text-gray-400'}`}
            >
              ⚙️
            </Button>
          )}
        </div>
      </div>

      {/* Advanced search fields */}
      {showAdvancedOptions && isAdvancedOpen && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Suchbereiche</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFields(Object.keys(fieldLabels) as SearchableField[])}
                className="text-xs"
              >
                Alle
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFields([])}
                className="text-xs"
              >
                Keine
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(fieldLabels) as SearchableField[]).map(field => (
              <label
                key={field}
                className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 rounded p-2"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleFieldToggle(field)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{fieldLabels[field]}</span>
              </label>
            ))}
          </div>

          {selectedFields.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Mindestens ein Suchbereich muss ausgewählt sein
            </p>
          )}
        </div>
      )}

      {/* Search summary */}
      {inputValue && (
        <div className="text-xs text-gray-500">
          Suche nach &ldquo;{inputValue}&rdquo; in: {selectedFields.map(f => fieldLabels[f]).join(', ')}
        </div>
      )}
    </div>
  );
};

interface QuickFiltersProps {
  activePreset?: string;
  onPresetSelect: (preset: FilterPreset) => void;
  presets?: FilterPreset[];
  className?: string;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  activePreset,
  onPresetSelect,
  presets = DEFAULT_FILTER_PRESETS.slice(0, 6), // Show first 6 by default
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {presets.map(preset => (
        <Button
          key={preset.id}
          variant={activePreset === preset.id ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPresetSelect(preset)}
          className="text-sm"
          title={preset.description}
        >
          <span className="mr-1">{preset.icon}</span>
          {preset.name}
        </Button>
      ))}
    </div>
  );
};

interface SearchStatsProps {
  totalResults: number;
  filteredResults: number;
  searchQuery?: string;
  isLoading?: boolean;
  className?: string;
}

export const SearchStats: React.FC<SearchStatsProps> = ({
  totalResults,
  filteredResults,
  searchQuery,
  isLoading = false,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <span className="animate-pulse">Suche läuft...</span>
      </div>
    );
  }

  const hasFilters = filteredResults !== totalResults || searchQuery?.trim();

  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      {hasFilters ? (
        <>
          <span className="font-medium">{filteredResults}</span> von{' '}
          <span className="text-gray-500">{totalResults}</span> Bewerbungen
          {searchQuery && (
            <span className="text-gray-500">
              {' '}für &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </>
      ) : (
        <>
          <span className="font-medium">{totalResults}</span> Bewerbungen gesamt
        </>
      )}
    </div>
  );
};
