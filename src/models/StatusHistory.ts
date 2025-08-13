import { ApplicationStatus } from '../types';

export interface StatusHistory {
  id: number;
  application_id: number;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note?: string;
  created_at: string;
  created_by?: string; // For future multi-user support
}

export class StatusHistoryModel {
  id: number;
  application_id: number;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note?: string;
  created_at: string;
  created_by?: string;

  constructor(data: Partial<StatusHistory> & { 
    application_id: number; 
    to_status: ApplicationStatus; 
  }) {
    this.id = data.id || 0;
    this.application_id = data.application_id;
    this.from_status = data.from_status || null;
    this.to_status = data.to_status;
    this.note = data.note;
    this.created_at = data.created_at || new Date().toISOString();
    this.created_by = data.created_by;
  }

  /**
   * Convert the model instance to a plain object for database operations
   */
  toJSON(): StatusHistory {
    return {
      id: this.id,
      application_id: this.application_id,
      from_status: this.from_status,
      to_status: this.to_status,
      note: this.note,
      created_at: this.created_at,
      created_by: this.created_by,
    };
  }

  /**
   * Create a StatusHistory model instance from database row
   */
  static fromJSON(data: StatusHistory): StatusHistoryModel {
    return new StatusHistoryModel(data);
  }

  /**
   * Check if this is the initial status (no previous status)
   */
  isInitialStatus(): boolean {
    return this.from_status === null;
  }

  /**
   * Get a human-readable description of the status change
   */
  getChangeDescription(): string {
    if (this.isInitialStatus()) {
      return `Bewerbung erstellt mit Status "${this.to_status}"`;
    }
    return `Status geändert von "${this.from_status}" zu "${this.to_status}"`;
  }

  /**
   * Get formatted date for display
   */
  getFormattedDate(): string {
    const date = new Date(this.created_at);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calculate time elapsed since this status change
   */
  getTimeElapsed(): string {
    const now = new Date();
    const changeDate = new Date(this.created_at);
    const diffMs = now.getTime() - changeDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
    } else if (diffHours > 0) {
      return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
    } else if (diffMinutes > 0) {
      return `vor ${diffMinutes} Minute${diffMinutes === 1 ? '' : 'n'}`;
    } else {
      return 'gerade eben';
    }
  }
}
