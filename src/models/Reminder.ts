import { Reminder, ReminderType } from '../types';

export class ReminderModel implements Reminder {
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

  constructor(data: Partial<Reminder> = {}) {
    this.id = data.id || 0;
    this.application_id = data.application_id;
    this.title = data.title || '';
    this.description = data.description;
    this.reminder_date = data.reminder_date || new Date().toISOString();
    this.reminder_type = data.reminder_type || 'custom';
    this.is_completed = data.is_completed || false;
    this.notification_sent = data.notification_sent || false;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  static fromJSON(json: any): ReminderModel {
    return new ReminderModel({
      id: json.id,
      application_id: json.application_id,
      title: json.title,
      description: json.description,
      reminder_date: json.reminder_date,
      reminder_type: json.reminder_type,
      is_completed: Boolean(json.is_completed),
      notification_sent: Boolean(json.notification_sent),
      created_at: json.created_at,
      updated_at: json.updated_at
    });
  }

  toJSON(): Reminder {
    return {
      id: this.id,
      application_id: this.application_id,
      title: this.title,
      description: this.description,
      reminder_date: this.reminder_date,
      reminder_type: this.reminder_type,
      is_completed: this.is_completed,
      notification_sent: this.notification_sent,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) {
      errors.push('Titel ist erforderlich');
    }

    if (!this.reminder_date) {
      errors.push('Erinnerungsdatum ist erforderlich');
    } else {
      const reminderDate = new Date(this.reminder_date);
      if (isNaN(reminderDate.getTime())) {
        errors.push('Ungültiges Erinnerungsdatum');
      }
    }

    const validTypes: ReminderType[] = ['deadline', 'follow_up', 'interview', 'custom'];
    if (!validTypes.includes(this.reminder_type)) {
      errors.push('Ungültiger Erinnerungstyp');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isOverdue(): boolean {
    if (this.is_completed) return false;
    return new Date(this.reminder_date) < new Date();
  }

  isDueToday(): boolean {
    if (this.is_completed) return false;
    const today = new Date();
    const reminderDate = new Date(this.reminder_date);
    return (
      reminderDate.getDate() === today.getDate() &&
      reminderDate.getMonth() === today.getMonth() &&
      reminderDate.getFullYear() === today.getFullYear()
    );
  }

  getDaysUntilDue(): number {
    const today = new Date();
    const reminderDate = new Date(this.reminder_date);
    const diffTime = reminderDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
