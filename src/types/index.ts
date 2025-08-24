// Application Types
export type ApplicationStatus = 
  | 'draft' 
  | 'applied' 
  | 'in-review' 
  | 'interview' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';

export type WorkType = 
  | 'full-time' 
  | 'part-time' 
  | 'contract' 
  | 'internship' 
  | 'freelance';

export type Priority = 1 | 2 | 3 | 4 | 5;

export interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  company_id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
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
  // Optional file metadata
  fileCount?: number;
  totalFileSize?: number;
}

// Status History Types
export interface StatusHistory {
  id: number;
  application_id: number;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  note?: string;
  created_at: string;
  created_by?: string;
}

// Reminder Types
export type ReminderType = 'deadline' | 'follow_up' | 'interview' | 'custom';

export interface Reminder {
  id: number;
  application_id?: number;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_type: ReminderType;
  is_completed: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'application' | 'reminder' | 'deadline' | 'interview' | 'follow_up';
  description?: string;
  application_id?: number;
  reminder_id?: number;
  status?: ApplicationStatus;
  company_name?: string;
  position?: string;
}

// UI Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  count?: number;
}
