import React, { useState, useEffect } from 'react';
import { CalendarEvent, ReminderType, ApplicationStatus } from '../../types';
import { ReminderModel } from '../../models/Reminder';

interface CalendarProps {
  onNavigate?: (page: string, state?: any) => void;
}

interface ReminderFormData {
  title: string;
  description: string;
  reminder_date: string;
  reminder_type: ReminderType;
  application_id?: number;
}

export const Calendar: React.FC<CalendarProps> = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderModel | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [eventFilters, setEventFilters] = useState({
    application: true,
    deadline: true,
    follow_up: true,
    interview: true,
    custom: true
  });
  const [reminderForm, setReminderForm] = useState<ReminderFormData>({
    title: '',
    description: '',
    reminder_date: '',
    reminder_type: 'custom',
    application_id: undefined
  });

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, viewMode]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadApplicationEvents(),
        loadReminders(),
        loadApplications()
      ]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationEvents = async () => {
    const startDate = getViewStartDate();
    const endDate = getViewEndDate();

    const result = await window.electronAPI.queryDatabase(`
      SELECT a.*, c.name as company_name
      FROM applications a
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE (a.application_date BETWEEN ? AND ?) 
         OR (a.deadline BETWEEN ? AND ?)
         OR (a.follow_up_date BETWEEN ? AND ?)
      ORDER BY a.application_date ASC
    `, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]);

    const applicationEvents: CalendarEvent[] = [];
    
    result.forEach((app: any) => {
      if (app.application_date) {
        applicationEvents.push({
          id: `app-${app.id}-applied`,
          title: `Bewerbung: ${app.position}`,
          date: app.application_date,
          type: 'application',
          description: `Bewerbung bei ${app.company_name || 'Unbekannt'}`,
          application_id: app.id,
          status: app.status,
          company_name: app.company_name,
          position: app.position
        });
      }

      if (app.deadline) {
        applicationEvents.push({
          id: `app-${app.id}-deadline`,
          title: `Deadline: ${app.position}`,
          date: app.deadline,
          type: 'deadline',
          description: `Bewerbungsdeadline für ${app.company_name || 'Unbekannt'}`,
          application_id: app.id,
          status: app.status,
          company_name: app.company_name,
          position: app.position
        });
      }

      if (app.follow_up_date) {
        applicationEvents.push({
          id: `app-${app.id}-followup`,
          title: `Follow-up: ${app.position}`,
          date: app.follow_up_date,
          type: 'follow_up',
          description: `Nachfrage bei ${app.company_name || 'Unbekannt'}`,
          application_id: app.id,
          status: app.status,
          company_name: app.company_name,
          position: app.position
        });
      }
    });

    setEvents(prev => [...prev.filter(e => !e.application_id), ...applicationEvents]);
  };

  const loadReminders = async () => {
    const startDate = getViewStartDate();
    const endDate = getViewEndDate();

    const result = await window.electronAPI.queryDatabase(`
      SELECT r.*, a.position, c.name as company_name
      FROM reminders r
      LEFT JOIN applications a ON r.application_id = a.id
      LEFT JOIN companies c ON a.company_id = c.id
      WHERE r.reminder_date BETWEEN ? AND ?
      ORDER BY r.reminder_date ASC
    `, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ]);

    const reminderEvents: CalendarEvent[] = result.map((reminder: any) => ({
      id: `reminder-${reminder.id}`,
      title: reminder.title,
      date: reminder.reminder_date,
      type: reminder.reminder_type,
      description: reminder.description,
      reminder_id: reminder.id,
      application_id: reminder.application_id,
      company_name: reminder.company_name,
      position: reminder.position
    }));

    setEvents(prev => [...prev.filter(e => !e.reminder_id), ...reminderEvents]);
  };

  const loadApplications = async () => {
    const result = await window.electronAPI.queryDatabase(`
      SELECT a.id, a.position, c.name as company_name
      FROM applications a
      LEFT JOIN companies c ON a.company_id = c.id
      ORDER BY a.position ASC
    `, []);
    
    setApplications(result);
  };

  const getViewStartDate = () => {
    const start = new Date(currentDate);
    if (viewMode === 'month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    } else if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay());
    } else {
      start.setDate(start.getDate() - 30); // Agenda: 30 days back
    }
    return start;
  };

  const getViewEndDate = () => {
    const end = new Date(currentDate);
    if (viewMode === 'month') {
      end.setMonth(end.getMonth() + 1, 0); // Last day of month
      end.setDate(end.getDate() + (6 - end.getDay())); // End on Saturday
    } else if (viewMode === 'week') {
      end.setDate(end.getDate() + 6 - end.getDay());
    } else {
      end.setDate(end.getDate() + 60); // Agenda: 60 days forward
    }
    return end;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const toggleEventFilter = (eventType: keyof typeof eventFilters) => {
    setEventFilters(prev => ({
      ...prev,
      [eventType]: !prev[eventType]
    }));
  };

  const getFilteredEvents = () => {
    return events.filter(event => eventFilters[event.type as keyof typeof eventFilters]);
  };

  const handleCreateReminder = async () => {
    try {
      const reminder = new ReminderModel(reminderForm);
      const validation = reminder.validate();
      
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      await window.electronAPI.executeQuery(`
        INSERT INTO reminders (application_id, title, description, reminder_date, reminder_type)
        VALUES (?, ?, ?, ?, ?)
      `, [
        reminderForm.application_id || null,
        reminderForm.title,
        reminderForm.description || null,
        reminderForm.reminder_date,
        reminderForm.reminder_type
      ]);

      setReminderForm({
        title: '',
        description: '',
        reminder_date: '',
        reminder_type: 'custom',
        application_id: undefined
      });
      setShowReminderForm(false);
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('Fehler beim Erstellen der Erinnerung');
    }
  };

  const handleDeleteReminder = async (reminderId: number) => {
    if (!confirm('Erinnerung wirklich löschen?')) return;
    
    try {
      await window.electronAPI.executeQuery(
        'DELETE FROM reminders WHERE id = ?',
        [reminderId]
      );
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      alert('Fehler beim Löschen der Erinnerung');
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      application: 'bg-blue-500',
      reminder: 'bg-gray-500',
      deadline: 'bg-red-500',
      interview: 'bg-green-500',
      follow_up: 'bg-yellow-500',
      custom: 'bg-purple-500'
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      application: 'Bewerbung',
      reminder: 'Erinnerung',
      deadline: 'Deadline',
      interview: 'Interview',
      follow_up: 'Follow-up',
      custom: 'Termin'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = 
      viewMode === 'month' 
        ? { year: 'numeric', month: 'long' }
        : viewMode === 'week'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long' };
    
    return currentDate.toLocaleDateString('de-DE', options);
  };

  const renderMonthView = () => {
    const startDate = getViewStartDate();
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = getFilteredEvents().filter(event => 
        event.date === date.toISOString().split('T')[0]
      );

      const isToday = date.toDateString() === today.toDateString();
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();

      days.push(
        <div
          key={i}
          className={`min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
            !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
          } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
          onClick={() => {
            setSelectedDate(date);
            setReminderForm(prev => ({ 
              ...prev, 
              reminder_date: date.toISOString().split('T')[0] 
            }));
            setShowReminderForm(true);
          }}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
            {date.getDate()}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                className={`text-xs px-1 py-0.5 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                title={event.description}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} weitere
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map(day => (
          <div key={day} className="bg-gray-100 p-3 text-center text-sm font-medium">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...getFilteredEvents()].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const groupedEvents = sortedEvents.reduce((groups, event) => {
      const date = event.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

    return (
      <div className="space-y-4">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date} className="bg-white border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium">
                {new Date(date).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {dayEvents.map(event => (
                <div key={event.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    {event.description && (
                      <div className="text-sm text-gray-600">{event.description}</div>
                    )}
                    <div className="text-xs text-gray-500">
                      {getEventTypeLabel(event.type)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {event.application_id && (
                      <button
                        onClick={() => onNavigate?.('application-detail', { applicationId: event.application_id })}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Details
                      </button>
                    )}
                    {event.reminder_id && (
                      <button
                        onClick={() => handleDeleteReminder(event.reminder_id!)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedEvents).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Keine Termine im gewählten Zeitraum
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'agenda'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-sm rounded ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'month' ? 'Monat' : 'Agenda'}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowReminderForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Termin hinzufügen
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold">{formatDateHeader()}</h2>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg ml-4"
            >
              Heute
            </button>
          </div>
        </div>
      </div>

      {/* Event Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Termine anzeigen:</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eventFilters.application}
              onChange={() => toggleEventFilter('application')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Bewerbungen</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eventFilters.deadline}
              onChange={() => toggleEventFilter('deadline')}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Deadlines</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eventFilters.follow_up}
              onChange={() => toggleEventFilter('follow_up')}
              className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-700">Nachfassen</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eventFilters.interview}
              onChange={() => toggleEventFilter('interview')}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Interviews</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={eventFilters.custom}
              onChange={() => toggleEventFilter('custom')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">Sonstige</span>
          </label>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-sm">
        {viewMode === 'month' ? renderMonthView() : renderAgendaView()}
      </div>

      {/* Reminder Form Modal */}
      {showReminderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingReminder ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. Interview mit Max Mustermann"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Zusätzliche Details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  value={reminderForm.reminder_date}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, reminder_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ
                </label>
                <select
                  value={reminderForm.reminder_type}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, reminder_type: e.target.value as ReminderType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="custom">Individueller Termin</option>
                  <option value="interview">Interview</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="deadline">Deadline</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bewerbung (optional)
                </label>
                <select
                  value={reminderForm.application_id || ''}
                  onChange={(e) => setReminderForm(prev => ({ 
                    ...prev, 
                    application_id: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Keine Bewerbung zuordnen</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.position} - {app.company_name || 'Unbekannt'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReminderForm(false);
                  setEditingReminder(null);
                  setReminderForm({
                    title: '',
                    description: '',
                    reminder_date: '',
                    reminder_type: 'custom',
                    application_id: undefined
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingReminder ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
