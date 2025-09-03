import { ReminderModel } from '../models/Reminder';
import { 
  Reminder, 
  ReminderTemplate, 
  SyncQueueItem, 
  NotificationHistory, 
  ReminderType, 
  ReminderPriority, 
  RecurrencePattern 
} from '../types';

export class ReminderService {
  /**
   * Create a new reminder
   */
  static async createReminder(data: Partial<Reminder>): Promise<ReminderModel> {
    const reminder = new ReminderModel(data);
    const validation = reminder.validate();
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const result = await window.electronAPI.executeQuery(`
      INSERT INTO reminders (
        application_id, title, description, reminder_date, reminder_time, reminder_type,
        priority, email_notification_enabled, notification_time, 
        recurrence_pattern, auto_generated, parent_reminder_id, sync_status, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reminder.application_id || null,
      reminder.title,
      reminder.description || null,
      reminder.reminder_date,
      reminder.reminder_time || null,
      reminder.reminder_type,
      reminder.priority,
      reminder.email_notification_enabled,
      reminder.notification_time,
      reminder.recurrence_pattern || null,
      reminder.auto_generated,
      reminder.parent_reminder_id || null,
      reminder.sync_status,
      reminder.is_active
    ]);

    const createdReminder = await this.getReminderById(result.lastID);
    
    // Queue for sync
    await this.queueForSync(result.lastID, 'create', createdReminder.toJSON());

    return createdReminder;
  }

  /**
   * Update an existing reminder
   */
  static async updateReminder(id: number, data: Partial<Reminder>): Promise<ReminderModel> {
    const existingReminder = await this.getReminderById(id);
    const reminderData = new ReminderModel({ ...existingReminder.toJSON(), ...data });
    const validation = reminderData.validate();
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    await window.electronAPI.executeQuery(`
      UPDATE reminders SET
        application_id = ?, title = ?, description = ?, reminder_date = ?, reminder_time = ?,
        reminder_type = ?, priority = ?, email_notification_enabled = ?,
        notification_time = ?, recurrence_pattern = ?, is_completed = ?, completed_at = ?,
        snooze_until = ?, completion_note = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      reminderData.application_id || null,
      reminderData.title,
      reminderData.description || null,
      reminderData.reminder_date,
      reminderData.reminder_time || null,
      reminderData.reminder_type,
      reminderData.priority,
      reminderData.email_notification_enabled,
      reminderData.notification_time,
      reminderData.recurrence_pattern || null,
      reminderData.is_completed,
      reminderData.completed_at || null,
      reminderData.snooze_until || null,
      reminderData.completion_note || null,
      reminderData.is_active,
      id
    ]);

    const finalReminder = await this.getReminderById(id);
    
    // Queue for sync
    await this.queueForSync(id, 'update', finalReminder.toJSON());

    return finalReminder;
  }

  /**
   * Delete a reminder (soft delete)
   */
  static async deleteReminder(id: number): Promise<void> {
    await window.electronAPI.executeQuery(`
      UPDATE reminders SET 
        deleted_at = CURRENT_TIMESTAMP, 
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [id]);

    // Queue for sync
    await this.queueForSync(id, 'delete');
  }

  /**
   * Permanently delete a reminder
   */
  static async hardDeleteReminder(id: number): Promise<void> {
    // Queue for sync before deleting
    await this.queueForSync(id, 'delete');
    
    await window.electronAPI.executeQuery('DELETE FROM reminders WHERE id = ?', [id]);
  }

  /**
   * Restore a soft-deleted reminder
   */
  static async restoreReminder(id: number): Promise<void> {
    await window.electronAPI.executeQuery(`
      UPDATE reminders SET 
        deleted_at = NULL, 
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [id]);
  }

  /**
   * Get reminder by ID
   */
  static async getReminderById(id: number): Promise<ReminderModel> {
    const result = await window.electronAPI.queryDatabase(
      'SELECT * FROM reminders WHERE id = ?', 
      [id]
    );
    
    if (result.length === 0) {
      throw new Error(`Reminder with ID ${id} not found`);
    }
    
    return ReminderModel.fromJSON(result[0]);
  }

  /**
   * Get all reminders with optional filters
   */
  static async getReminders(filters?: {
    applicationId?: number;
    completed?: boolean;
    overdue?: boolean;
    priority?: ReminderPriority;
    type?: ReminderType;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<ReminderModel[]> {
    let query = `
      SELECT r.*, a.position, a.title as application_title, c.name as company_name
      FROM reminders r
      LEFT JOIN applications a ON r.application_id = a.id
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE r.deleted_at IS NULL AND r.is_active = TRUE
    `;
    const params: any[] = [];

    if (filters?.applicationId) {
      query += ' AND r.application_id = ?';
      params.push(filters.applicationId);
    }

    if (filters?.completed !== undefined) {
      query += ' AND r.is_completed = ?';
      params.push(filters.completed);
    }

    if (filters?.priority) {
      query += ' AND r.priority = ?';
      params.push(filters.priority);
    }

    if (filters?.type) {
      query += ' AND r.reminder_type = ?';
      params.push(filters.type);
    }

    if (filters?.dateFrom) {
      query += ' AND r.reminder_date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      query += ' AND r.reminder_date <= ?';
      params.push(filters.dateTo);
    }

    if (filters?.overdue) {
      query += ` AND (
        (r.reminder_time IS NOT NULL AND datetime(r.reminder_date || ' ' || r.reminder_time) < datetime('now'))
        OR 
        (r.reminder_time IS NULL AND date(r.reminder_date) < date('now'))
      ) AND r.is_completed = 0 AND (r.snooze_until IS NULL OR r.snooze_until < datetime('now'))`;
    }

    query += ' ORDER BY r.reminder_date ASC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const result = await window.electronAPI.queryDatabase(query, params);
    return result.map((row: any) => ReminderModel.fromJSON(row));
  }

  /**
   * Get upcoming reminders (next 7 days)
   */
  static async getUpcomingReminders(): Promise<ReminderModel[]> {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    return this.getReminders({
      dateFrom: today.toISOString().split('T')[0],
      dateTo: weekFromNow.toISOString().split('T')[0],
      completed: false
    });
  }

  /**
   * Get overdue reminders
   */
  static async getOverdueReminders(): Promise<ReminderModel[]> {
    return this.getReminders({ overdue: true });
  }

  /**
   * Get reminders due today
   */
  static async getTodayReminders(): Promise<ReminderModel[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getReminders({
      dateFrom: today,
      dateTo: today,
      completed: false
    });
  }

  /**
   * Complete a reminder
   */
  static async completeReminder(id: number, note?: string): Promise<ReminderModel> {
    const reminder = await this.getReminderById(id);
    reminder.complete(note);
    
    // Handle recurring reminders
    if (reminder.isRecurring()) {
      await this.createNextRecurrence(reminder);
    }
    
    return this.updateReminder(id, reminder.toJSON());
  }

  /**
   * Snooze a reminder
   */
  static async snoozeReminder(id: number, hours: number): Promise<ReminderModel> {
    const reminder = await this.getReminderById(id);
    reminder.snooze(hours);
    return this.updateReminder(id, reminder.toJSON());
  }

  /**
   * Unsnooze a reminder
   */
  static async unsnoozeReminder(id: number): Promise<ReminderModel> {
    const reminder = await this.getReminderById(id);
    reminder.unsnooze();
    return this.updateReminder(id, reminder.toJSON());
  }

  /**
   * Create next recurrence for a recurring reminder
   */
  private static async createNextRecurrence(parentReminder: ReminderModel): Promise<ReminderModel | null> {
    const pattern = parentReminder.getRecurrencePattern();
    if (!pattern) return null;

    const nextDate = this.calculateNextRecurrenceDate(new Date(parentReminder.reminder_date), pattern);
    if (!nextDate) return null;

    const nextReminder = new ReminderModel({
      ...parentReminder.toJSON(),
      id: 0,
      reminder_date: nextDate.toISOString().split('T')[0], // Just date
      reminder_time: parentReminder.reminder_time, // Keep same time
      is_completed: false,
      completed_at: undefined,
      is_active: true,
      parent_reminder_id: parentReminder.parent_reminder_id || parentReminder.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return this.createReminder(nextReminder.toJSON());
  }

  /**
   * Calculate the next recurrence date
   */
  private static calculateNextRecurrenceDate(currentDate: Date, pattern: RecurrencePattern): Date | null {
    const nextDate = new Date(currentDate);

    switch (pattern.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
        break;
      default:
        return null;
    }

    // Check if we've exceeded the end date or max occurrences
    if (pattern.end_date && nextDate > new Date(pattern.end_date)) {
      return null;
    }

    return nextDate;
  }

  /**
   * Auto-generate reminders based on application data
   */
  static async autoGenerateReminders(applicationId: number): Promise<ReminderModel[]> {
    const application = await window.electronAPI.queryDatabase(
      `SELECT a.*, c.name as company_name
       FROM applications a 
       LEFT JOIN companies c ON a.company_id = c.id 
       WHERE a.id = ?`, 
      [applicationId]
    );

    if (application.length === 0) {
      throw new Error('Application not found');
    }

    const app = application[0];
    const createdReminders: ReminderModel[] = [];
    const templates = await this.getReminderTemplates({ systemOnly: true });

    for (const template of templates) {
      const conditions = template.trigger_conditions ? JSON.parse(template.trigger_conditions) : {};
      
      if (this.shouldCreateReminderFromTemplate(app, template, conditions)) {
        const reminderDate = this.calculateReminderDateFromTemplate(app, template, conditions);
        
        if (reminderDate) {
          const reminderData = {
            application_id: applicationId,
            title: this.replacePlaceholders(template.title_template, app),
            description: template.description_template ? 
              this.replacePlaceholders(template.description_template, app) : undefined,
            reminder_date: reminderDate.toISOString().split('T')[0], // Just date part
            reminder_time: reminderDate.toTimeString().slice(0, 5), // Time part HH:MM
            reminder_type: template.reminder_type,
            priority: template.default_priority,
            notification_time: template.default_notification_time,
            auto_generated: true
          };

          const reminder = await this.createReminder(reminderData);
          createdReminders.push(reminder);
        }
      }
    }

    return createdReminders;
  }

  /**
   * Get reminder templates
   */
  static async getReminderTemplates(filters?: { systemOnly?: boolean }): Promise<ReminderTemplate[]> {
    let query = 'SELECT * FROM reminder_templates';
    const params: any[] = [];

    if (filters?.systemOnly) {
      query += ' WHERE is_system_template = 1';
    }

    query += ' ORDER BY name ASC';

    const result = await window.electronAPI.queryDatabase(query, params);
    return result;
  }

  /**
   * Check if a reminder should be created from a template
   */
  private static shouldCreateReminderFromTemplate(
    application: any, 
    template: ReminderTemplate, 
    conditions: any
  ): boolean {
    if (conditions.status && application.status !== conditions.status) {
      return false;
    }

    if (conditions.deadline_field && !application.deadline) {
      return false;
    }

    // Check if similar reminder already exists
    // This is a simplified check - in production you might want more sophisticated logic
    return true;
  }

  /**
   * Calculate reminder date based on template conditions
   */
  private static calculateReminderDateFromTemplate(
    application: any, 
    template: ReminderTemplate, 
    conditions: any
  ): Date | null {
    const now = new Date();

    if (conditions.days_after_application && application.application_date) {
      const appDate = new Date(application.application_date);
      appDate.setDate(appDate.getDate() + conditions.days_after_application);
      return appDate;
    }

    if (conditions.days_before_deadline && application.deadline) {
      const deadline = new Date(application.deadline);
      deadline.setDate(deadline.getDate() - (conditions.days_before_deadline || 1));
      return deadline;
    }

    if (conditions.deadline_field && application.deadline) {
      return new Date(application.deadline);
    }

    // Default to tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  /**
   * Replace placeholders in template strings
   */
  private static replacePlaceholders(template: string, application: any): string {
    return template
      .replace(/{position}/g, application.position || 'Unknown Position')
      .replace(/{company}/g, application.company_name || 'Unknown Company')
      .replace(/{title}/g, application.title || application.position || 'Unknown')
      .replace(/{location}/g, application.location || '')
      .replace(/{status}/g, application.status || '');
  }

  /**
   * Get reminders that need notifications
   */
  static async getRemindersNeedingNotification(): Promise<ReminderModel[]> {
    // More efficient: query database directly instead of filtering in JS
    const query = `
      SELECT r.*, a.position, a.title as application_title, c.name as company_name
      FROM reminders r
      LEFT JOIN applications a ON r.application_id = a.id
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE r.deleted_at IS NULL 
        AND r.is_active = TRUE
        AND r.is_completed = FALSE
        AND r.email_notification_enabled = TRUE
        AND (r.snooze_until IS NULL OR r.snooze_until <= datetime('now'))
        AND (
          -- For reminders with time: check datetime combination
          (r.reminder_time IS NOT NULL AND 
           datetime(r.reminder_date || ' ' || r.reminder_time, '-' || r.notification_time || ' minutes') <= datetime('now'))
          OR
          -- For date-only reminders: check date with notification offset
          (r.reminder_time IS NULL AND 
           datetime(r.reminder_date || ' 09:00:00', '-' || r.notification_time || ' minutes') <= datetime('now'))
        )
      ORDER BY r.reminder_date ASC, r.reminder_time ASC
    `;
    
    const result = await window.electronAPI.queryDatabase(query);
    return result.map((row: any) => ReminderModel.fromJSON(row));
  }

  /**
   * Mark notification as sent (now only logs to history, no field to update)
   */
  static async markNotificationSent(reminderId: number, type: 'system' | 'email' | 'push'): Promise<void> {
    // We no longer have notification_sent field, just log the notification
    await this.logNotification(reminderId, type, 'sent');
  }

  /**
   * Log notification history
   */
  static async logNotification(
    reminderId: number, 
    type: 'system' | 'email' | 'push', 
    status: 'sent' | 'failed' | 'pending',
    recipient?: string,
    errorMessage?: string
  ): Promise<void> {
    await window.electronAPI.executeQuery(`
      INSERT INTO notification_history (reminder_id, notification_type, sent_at, status, error_message, recipient)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      reminderId,
      type,
      new Date().toISOString(),
      status,
      errorMessage || null,
      recipient || null
    ]);
  }

  /**
   * Get notification history for a reminder
   */
  static async getNotificationHistory(reminderId: number): Promise<NotificationHistory[]> {
    const result = await window.electronAPI.queryDatabase(
      'SELECT * FROM notification_history WHERE reminder_id = ? ORDER BY sent_at DESC',
      [reminderId]
    );
    return result;
  }

  /**
   * Get reminder statistics
   */
  static async getReminderStats(): Promise<{
    total: number;
    completed: number;
    overdue: number;
    dueToday: number;
    upcoming: number;
    byPriority: Record<ReminderPriority, number>;
    byType: Record<ReminderType, number>;
  }> {
    const allReminders = await this.getReminders();
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      total: allReminders.length,
      completed: allReminders.filter(r => r.is_completed).length,
      overdue: allReminders.filter(r => r.isOverdue()).length,
      dueToday: allReminders.filter(r => r.isDueToday()).length,
      upcoming: allReminders.filter(r => !r.is_completed && !r.isOverdue() && !r.isDueToday()).length,
      byPriority: {
        low: allReminders.filter(r => r.priority === 'low').length,
        medium: allReminders.filter(r => r.priority === 'medium').length,
        high: allReminders.filter(r => r.priority === 'high').length,
        urgent: allReminders.filter(r => r.priority === 'urgent').length
      } as Record<ReminderPriority, number>,
      byType: {
        custom: allReminders.filter(r => r.reminder_type === 'custom').length,
        deadline: allReminders.filter(r => r.reminder_type === 'deadline').length,
        follow_up: allReminders.filter(r => r.reminder_type === 'follow_up').length,
        interview: allReminders.filter(r => r.reminder_type === 'interview').length
      } as Record<ReminderType, number>
    };

    return stats;
  }

  /**
   * Queue reminder for synchronization
   */
  private static async queueForSync(recordId: number, operation: 'create' | 'update' | 'delete', data?: any): Promise<void> {
    try {
      await window.electronAPI.executeQuery(
        `INSERT INTO sync_queue (table_name, record_id, operation, data) 
         VALUES (?, ?, ?, ?)`,
        ['reminders', recordId, operation, data ? JSON.stringify(data) : null]
      );
    } catch (error) {
      console.error('Failed to queue reminder for sync:', error);
      // Don't fail the main operation if sync queueing fails
    }
  }
}
