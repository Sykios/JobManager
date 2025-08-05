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
}

// UI Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  count?: number;
}
