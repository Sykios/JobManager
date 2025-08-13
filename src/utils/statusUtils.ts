import { ApplicationStatus } from '../types';

// Define valid status transitions to prevent invalid state changes
export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  'draft': ['applied', 'withdrawn'],
  'applied': ['in-review', 'rejected', 'withdrawn'],
  'in-review': ['interview', 'rejected', 'withdrawn'],
  'interview': ['offer', 'rejected', 'withdrawn'],
  'offer': ['rejected', 'withdrawn'], // Note: accepted would be final state, but not included in current types
  'rejected': [], // Final state
  'withdrawn': [], // Final state
};

// Status display configuration
export const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  description: string;
}> = {
  'draft': {
    label: 'Entwurf',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '📝',
    description: 'Bewerbung ist noch nicht abgesendet'
  },
  'applied': {
    label: 'Beworben',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '📤',
    description: 'Bewerbung wurde abgesendet'
  },
  'in-review': {
    label: 'In Prüfung',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '👀',
    description: 'Bewerbung wird vom Unternehmen geprüft'
  },
  'interview': {
    label: 'Vorstellungsgespräch',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '💼',
    description: 'Zum Vorstellungsgespräch eingeladen'
  },
  'offer': {
    label: 'Angebot',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '🎉',
    description: 'Jobangebot erhalten'
  },
  'rejected': {
    label: 'Abgelehnt',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '❌',
    description: 'Bewerbung wurde abgelehnt'
  },
  'withdrawn': {
    label: 'Zurückgezogen',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    icon: '↩️',
    description: 'Bewerbung zurückgezogen'
  }
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Get all possible next statuses for a current status
 */
export function getValidNextStatuses(currentStatus: ApplicationStatus): ApplicationStatus[] {
  return STATUS_TRANSITIONS[currentStatus];
}

/**
 * Get status configuration
 */
export function getStatusConfig(status: ApplicationStatus) {
  return STATUS_CONFIG[status];
}

/**
 * Check if a status is final (no further transitions possible)
 */
export function isFinalStatus(status: ApplicationStatus): boolean {
  return STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Get status priority for sorting (earlier stages have lower numbers)
 */
export function getStatusPriority(status: ApplicationStatus): number {
  const priorities: Record<ApplicationStatus, number> = {
    'draft': 0,
    'applied': 1,
    'in-review': 2,
    'interview': 3,
    'offer': 4,
    'rejected': 5,
    'withdrawn': 5
  };
  return priorities[status];
}

/**
 * Sort statuses by their natural flow order
 */
export function sortStatusesByPriority(statuses: ApplicationStatus[]): ApplicationStatus[] {
  return statuses.sort((a, b) => getStatusPriority(a) - getStatusPriority(b));
}
