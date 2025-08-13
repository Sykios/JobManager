import { ApplicationStatus, WorkType, Priority, Application } from '../types';

// Enhanced filter interfaces for advanced search functionality
export interface DateRangeFilter {
  start?: string;
  end?: string;
}

export interface SearchFieldFilter {
  fields: SearchableField[];
  query: string;
  caseSensitive?: boolean;
}

export type SearchableField = 
  | 'title' 
  | 'position' 
  | 'location' 
  | 'notes' 
  | 'requirements' 
  | 'benefits' 
  | 'cover_letter'
  | 'application_channel';

export interface AdvancedApplicationFilters {
  // Text search
  search?: SearchFieldFilter;
  
  // Status filters
  status?: ApplicationStatus | ApplicationStatus[];
  excludeStatus?: ApplicationStatus | ApplicationStatus[];
  
  // Company/Contact filters
  company_id?: number | number[];
  contact_id?: number | number[];
  hasCompany?: boolean;
  hasContact?: boolean;
  
  // Job details
  work_type?: WorkType | WorkType[];
  remote_possible?: boolean;
  location?: string | string[];
  priority?: Priority | Priority[];
  priorityRange?: { min: Priority; max: Priority };
  
  // Date filters
  application_date?: DateRangeFilter;
  deadline?: DateRangeFilter;
  follow_up_date?: DateRangeFilter;
  created_at?: DateRangeFilter;
  updated_at?: DateRangeFilter;
  
  // Advanced filters
  has_deadline?: boolean;
  is_overdue?: boolean;
  deadline_approaching?: { days: number };
  has_notes?: boolean;
  has_cover_letter?: boolean;
  salary_range?: string;
  
  // Sorting
  sortBy?: ApplicationSortField;
  sortDirection?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

export type ApplicationSortField = 
  | 'created_at'
  | 'updated_at'
  | 'application_date'
  | 'deadline'
  | 'follow_up_date'
  | 'title'
  | 'position'
  | 'priority'
  | 'status';

// Pre-defined filter presets for common searches
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: AdvancedApplicationFilters;
  icon?: string;
}

export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    name: 'Alle Bewerbungen',
    description: 'Zeigt alle Bewerbungen ohne Filter',
    filters: {},
    icon: '📋'
  },
  {
    id: 'active',
    name: 'Aktive Bewerbungen',
    description: 'Bewerbungen im Bewerbungsprozess',
    filters: {
      excludeStatus: ['rejected', 'withdrawn']
    },
    icon: '🔥'
  },
  {
    id: 'pending',
    name: 'Wartende Antworten',
    description: 'Bewerbungen die auf Rückmeldung warten',
    filters: {
      status: ['applied', 'in-review']
    },
    icon: '⏳'
  },
  {
    id: 'interviews',
    name: 'Vorstellungsgespräche',
    description: 'Bewerbungen mit Gesprächsterminen',
    filters: {
      status: ['interview']
    },
    icon: '💼'
  },
  {
    id: 'offers',
    name: 'Jobangebote',
    description: 'Erhaltene Stellenangebote',
    filters: {
      status: ['offer']
    },
    icon: '🎉'
  },
  {
    id: 'high-priority',
    name: 'Hohe Priorität',
    description: 'Bewerbungen mit Priorität 4-5',
    filters: {
      priorityRange: { min: 4, max: 5 }
    },
    icon: '🔴'
  },
  {
    id: 'deadlines-soon',
    name: 'Fristen bald',
    description: 'Bewerbungsfristen in den nächsten 7 Tagen',
    filters: {
      deadline_approaching: { days: 7 }
    },
    icon: '⚠️'
  },
  {
    id: 'overdue',
    name: 'Überfällig',
    description: 'Bewerbungen mit überschrittener Frist',
    filters: {
      is_overdue: true
    },
    icon: '🚨'
  },
  {
    id: 'remote',
    name: 'Remote-Jobs',
    description: 'Remote-mögliche Positionen',
    filters: {
      remote_possible: true
    },
    icon: '🏠'
  },
  {
    id: 'recent',
    name: 'Kürzlich erstellt',
    description: 'In den letzten 7 Tagen erstellt',
    filters: {
      created_at: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    },
    icon: '🆕'
  }
];

/**
 * Utility functions for filter operations
 */

export function combineFilters(
  base: AdvancedApplicationFilters,
  additional: AdvancedApplicationFilters
): AdvancedApplicationFilters {
  return {
    ...base,
    ...additional,
    // Combine arrays properly
    status: combineArrayFilters(base.status, additional.status),
    excludeStatus: combineArrayFilters(base.excludeStatus, additional.excludeStatus),
    work_type: combineArrayFilters(base.work_type, additional.work_type),
    location: combineArrayFilters(base.location, additional.location),
    priority: combineArrayFilters(base.priority, additional.priority),
  };
}

function combineArrayFilters<T>(a?: T | T[], b?: T | T[]): T | T[] | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  
  const aArray = Array.isArray(a) ? a : [a];
  const bArray = Array.isArray(b) ? b : [b];
  const combined = [...new Set([...aArray, ...bArray])];
  
  return combined.length === 1 ? combined[0] : combined;
}

export function isFilterEmpty(filters: AdvancedApplicationFilters): boolean {
  const keys = Object.keys(filters) as (keyof AdvancedApplicationFilters)[];
  return keys.every(key => {
    const value = filters[key];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  });
}

export function getActiveFilterCount(filters: AdvancedApplicationFilters): number {
  let count = 0;
  
  if (filters.search?.query.trim()) count++;
  if (filters.status) count++;
  if (filters.excludeStatus) count++;
  if (filters.company_id) count++;
  if (filters.work_type) count++;
  if (filters.remote_possible !== undefined) count++;
  if (filters.location) count++;
  if (filters.priority || filters.priorityRange) count++;
  if (filters.application_date) count++;
  if (filters.deadline) count++;
  if (filters.has_deadline !== undefined) count++;
  if (filters.is_overdue) count++;
  if (filters.deadline_approaching) count++;
  
  return count;
}

export function getFilterDescription(filters: AdvancedApplicationFilters): string {
  const descriptions: string[] = [];
  
  if (filters.search?.query.trim()) {
    descriptions.push(`Suche: "${filters.search.query}"`);
  }
  
  if (filters.status) {
    const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
    descriptions.push(`Status: ${statusArray.join(', ')}`);
  }
  
  if (filters.work_type) {
    const typeArray = Array.isArray(filters.work_type) ? filters.work_type : [filters.work_type];
    descriptions.push(`Arbeitsart: ${typeArray.join(', ')}`);
  }
  
  if (filters.remote_possible) {
    descriptions.push('Remote möglich');
  }
  
  if (filters.priorityRange) {
    descriptions.push(`Priorität: ${filters.priorityRange.min}-${filters.priorityRange.max}`);
  }
  
  if (filters.is_overdue) {
    descriptions.push('Überfällig');
  }
  
  if (filters.deadline_approaching) {
    descriptions.push(`Frist in ${filters.deadline_approaching.days} Tagen`);
  }
  
  return descriptions.join(' • ') || 'Keine Filter aktiv';
}

/**
 * Convert advanced filters to basic ApplicationFilters for service compatibility
 */
export function convertToServiceFilters(filters: AdvancedApplicationFilters): any {
  const serviceFilters: any = {};
  
  // Basic mappings
  if (filters.status) serviceFilters.status = filters.status;
  if (filters.company_id) serviceFilters.company_id = filters.company_id;
  if (filters.work_type) serviceFilters.work_type = filters.work_type;
  if (filters.remote_possible !== undefined) serviceFilters.remote_possible = filters.remote_possible;
  if (filters.priority) serviceFilters.priority = filters.priority;
  
  // Date range mappings
  if (filters.deadline?.start) serviceFilters.deadline_after = filters.deadline.start;
  if (filters.deadline?.end) serviceFilters.deadline_before = filters.deadline.end;
  
  // Search mapping
  if (filters.search?.query.trim()) {
    serviceFilters.search = filters.search.query;
  }
  
  return serviceFilters;
}
