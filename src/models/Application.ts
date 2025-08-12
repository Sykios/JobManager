import { Application, ApplicationStatus, WorkType, Priority } from '../types';

export class ApplicationModel {
  id: number;
  company_id?: number;
  contact_id?: number;
  title: string;
  position: string;
  job_url?: string;
  application_channel?: string;
  salary_range?: string;
  work_type?: WorkType;
  location?: string;
  remote_possible: boolean;
  status: ApplicationStatus;
  priority: Priority;
  application_date?: string;
  deadline?: string;
  follow_up_date?: string;
  notes?: string;
  cover_letter?: string;
  requirements?: string;
  benefits?: string;
  created_at: string;
  updated_at: string;

  constructor(data: Partial<Application> & { title: string; position: string }) {
    this.id = data.id || 0;
    this.company_id = data.company_id;
    this.contact_id = data.contact_id;
    this.title = data.title;
    this.position = data.position;
    this.job_url = data.job_url;
    this.application_channel = data.application_channel;
    this.salary_range = data.salary_range;
    this.work_type = data.work_type;
    this.location = data.location;
    this.remote_possible = data.remote_possible || false;
    this.status = data.status || 'draft';
    this.priority = data.priority || 1;
    this.application_date = data.application_date;
    this.deadline = data.deadline;
    this.follow_up_date = data.follow_up_date;
    this.notes = data.notes;
    this.cover_letter = data.cover_letter;
    this.requirements = data.requirements;
    this.benefits = data.benefits;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Convert the model instance to a plain object for database operations
   */
  toJSON(): Application {
    return {
      id: this.id,
      company_id: this.company_id,
      contact_id: this.contact_id,
      title: this.title,
      position: this.position,
      job_url: this.job_url,
      application_channel: this.application_channel,
      salary_range: this.salary_range,
      work_type: this.work_type,
      location: this.location,
      remote_possible: this.remote_possible,
      status: this.status,
      priority: this.priority,
      application_date: this.application_date,
      deadline: this.deadline,
      follow_up_date: this.follow_up_date,
      notes: this.notes,
      cover_letter: this.cover_letter,
      requirements: this.requirements,
      benefits: this.benefits,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Create an Application model instance from database row
   */
  static fromJSON(data: Application): ApplicationModel {
    return new ApplicationModel(data);
  }

  /**
   * Update the application status and track the change
   */
  updateStatus(newStatus: ApplicationStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.updated_at = new Date().toISOString();
    }
  }

  /**
   * Check if the application has a deadline and if it's approaching
   */
  isDeadlineApproaching(daysThreshold: number = 3): boolean {
    if (!this.deadline) return false;
    
    const deadlineDate = new Date(this.deadline);
    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff <= daysThreshold && daysDiff >= 0;
  }

  /**
   * Check if the application deadline has passed
   */
  isOverdue(): boolean {
    if (!this.deadline) return false;
    
    const deadlineDate = new Date(this.deadline);
    const now = new Date();
    
    return deadlineDate < now;
  }

  /**
   * Validate required fields
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) {
      errors.push('Title is required');
    }

    if (!this.position.trim()) {
      errors.push('Position is required');
    }

    if (this.priority < 1 || this.priority > 5) {
      errors.push('Priority must be between 1 and 5');
    }

    if (this.deadline && this.application_date) {
      const deadlineDate = new Date(this.deadline);
      const applicationDate = new Date(this.application_date);
      
      if (deadlineDate < applicationDate) {
        errors.push('Deadline cannot be before application date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
