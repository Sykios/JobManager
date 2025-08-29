import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReminderModel } from '../../models/Reminder';
import { ReminderService } from '../../services/ReminderService';
import { ReminderPriority, ReminderType, Application, Company } from '../../types';
import { Loading } from '../components/common/Loading';
import { SearchInput } from '../components/common/SearchFilter';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ReminderForm } from '../components/reminders/ReminderForm';

interface RemindersPageProps {
  onNavigate?: (page: string, state?: any) => void;
}

interface ReminderFilters {
  search: string;
  priority?: ReminderPriority;
  type?: ReminderType;
  status: 'all' | 'pending' | 'completed' | 'overdue' | 'due_today' | 'upcoming';
  application_id?: number;
  company_id?: number;
  date_range?: 'today' | 'week' | 'month' | 'custom';
}

export const RemindersPage: React.FC<RemindersPageProps> = ({ onNavigate }) => {
  const [allReminders, setAllReminders] = useState<ReminderModel[]>([]);
  const [applications, setApplications] = useState<(Application & { company_name?: string })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderModel | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [filters, setFilters] = useState<ReminderFilters>({
    search: '',
    status: 'pending'
  });

  // Memoized filtered reminders to prevent unnecessary re-renders
  const reminders = useMemo(() => {
    let filtered = [...allReminders];

    // Apply status filter
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    switch (filters.status) {
      case 'completed':
        filtered = filtered.filter(r => r.is_completed);
        break;
      case 'pending':
        filtered = filtered.filter(r => !r.is_completed);
        break;
      case 'overdue':
        filtered = filtered.filter(r => r.isOverdue() && !r.is_completed);
        break;
      case 'due_today':
        filtered = filtered.filter(r => r.isDueToday() && !r.is_completed);
        break;
      case 'upcoming':
        filtered = filtered.filter(r => {
          const reminderDate = new Date(r.reminder_date);
          return reminderDate > today && !r.is_completed;
        });
        break;
    }

    // Apply other filters
    if (filters.priority) {
      filtered = filtered.filter(r => r.priority === filters.priority);
    }
    if (filters.type) {
      filtered = filtered.filter(r => r.reminder_type === filters.type);
    }
    if (filters.application_id) {
      filtered = filtered.filter(r => r.application_id === filters.application_id);
    }
    if (filters.company_id) {
      filtered = filtered.filter(r => {
        const application = applications.find(app => app.id === r.application_id);
        return application?.company_id === filters.company_id;
      });
    }

    // Apply date range filter
    if (filters.date_range) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (filters.date_range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6, 23, 59, 59);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(0);
          endDate = new Date();
      }

      filtered = filtered.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        return reminderDate >= startDate && reminderDate <= endDate;
      });
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm) ||
        r.description?.toLowerCase().includes(searchTerm) ||
        r.reminder_type.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [allReminders, filters]);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 } as Record<ReminderPriority, number>
  });

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReminders(),
        loadApplications(),
        loadCompanies(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      loadReminders(),
      loadStats()
    ]);
  };

  const loadReminders = useCallback(async () => {
    try {
      // Load all reminders without filtering - let the frontend handle filtering
      const reminderData = await ReminderService.getReminders({});
      setAllReminders(reminderData);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const result = await window.electronAPI.queryDatabase(`
        SELECT a.*, c.name as company_name
        FROM applications a
        LEFT JOIN companies c ON a.company_id = c.id
        ORDER BY a.position ASC
      `, []);
      setApplications(result);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const result = await window.electronAPI.queryDatabase('SELECT * FROM companies ORDER BY name ASC', []);
      setCompanies(result);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await ReminderService.getReminderStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const handleCreateReminder = async (formData: {
    title: string;
    description: string;
    reminder_date: string;
    reminder_time: string;
    reminder_type: ReminderType;
    priority: ReminderPriority;
    application_id?: number;
    email_notification_enabled: boolean;
    notification_time: number;
    recurrence_pattern?: string;
  }) => {
    try {
      const reminderDateTime = new Date(`${formData.reminder_date}T${formData.reminder_time}`);
      
      const reminderData = {
        ...formData,
        reminder_date: reminderDateTime.toISOString(),
        application_id: formData.application_id || undefined
      };

      if (editingReminder) {
        await ReminderService.updateReminder(editingReminder.id, reminderData);
      } else {
        await ReminderService.createReminder(reminderData);
      }

      resetForm();
      await refreshData();
    } catch (error) {
      console.error('Failed to save reminder:', error);
      alert('Fehler beim Speichern der Erinnerung');
    }
  };

  const handleDeleteReminder = async (id: number) => {
    if (!confirm('Erinnerung wirklich löschen?')) return;
    
    try {
      await ReminderService.deleteReminder(id);
      await refreshData();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      alert('Fehler beim Löschen der Erinnerung');
    }
  };

  const handleCompleteReminder = async (id: number) => {
    try {
      await ReminderService.completeReminder(id);
      await refreshData();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };

  const handleSnoozeReminder = async (id: number, hours: number) => {
    try {
      await ReminderService.snoozeReminder(id, hours);
      await refreshData();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  };

  const [formInitialData, setFormInitialData] = useState<{
    title: string;
    description: string;
    reminder_date: string;
    reminder_time: string;
    reminder_type: ReminderType;
    priority: ReminderPriority;
    application_id?: number;
    email_notification_enabled: boolean;
    notification_time: number;
    recurrence_pattern?: string;
  } | undefined>(undefined);

  const handleEditReminder = (reminder: ReminderModel) => {
    setEditingReminder(reminder);
    const date = new Date(reminder.reminder_date);
    setFormInitialData({
      title: reminder.title,
      description: reminder.description || '',
      reminder_date: date.toISOString().split('T')[0],
      reminder_time: date.toTimeString().slice(0, 5),
      reminder_type: reminder.reminder_type,
      priority: reminder.priority,
      application_id: reminder.application_id,
      email_notification_enabled: reminder.email_notification_enabled,
      notification_time: reminder.notification_time,
      recurrence_pattern: reminder.recurrence_pattern
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormInitialData(undefined);
    setEditingReminder(null);
    setShowForm(false);
  };

  const getPriorityColor = (priority: ReminderPriority) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-orange-600 bg-orange-100',
      urgent: 'text-red-600 bg-red-100'
    };
    return colors[priority];
  };

  const getTypeIcon = (type: ReminderType) => {
    const icons = {
      custom: '📝',
      deadline: '⏰',
      follow_up: '📞',
      interview: '👔'
    };
    return icons[type];
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReminderCard = (reminder: ReminderModel) => (
    <div key={reminder.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
      reminder.isOverdue() ? 'border-red-300 bg-red-50' : 
      reminder.isDueToday() ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getTypeIcon(reminder.reminder_type)}</span>
            <h3 className={`font-medium truncate ${reminder.is_completed ? 'line-through text-gray-500' : ''}`}>
              {reminder.title}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(reminder.priority)}`}>
              {reminder.priority}
            </span>
            {reminder.isSnoozed() && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                Geschlummert
              </span>
            )}
          </div>
          
          {reminder.description && (
            <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{formatDateTime(reminder.reminder_date)}</span>
            {reminder.application_id && (
              <span className="text-blue-600">
                {applications.find(app => app.id === reminder.application_id)?.position || 'Bewerbung'}
              </span>
            )}
            {reminder.isOverdue() && (
              <span className="text-red-600 font-medium">
                {Math.abs(reminder.getDaysUntilDue())} Tage überfällig
              </span>
            )}
            {reminder.isDueToday() && (
              <span className="text-orange-600 font-medium">Heute fällig</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {!reminder.is_completed && (
            <>
              <button
                onClick={() => handleCompleteReminder(reminder.id)}
                className="p-2 text-green-600 hover:bg-green-100 rounded"
                title="Als erledigt markieren"
              >
                ✓
              </button>
              <div className="relative group">
                <button
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  title="Schlummern"
                >
                  ⏰
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-2 space-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleSnoozeReminder(reminder.id, 1)}
                    className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    1 Stunde
                  </button>
                  <button
                    onClick={() => handleSnoozeReminder(reminder.id, 24)}
                    className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    1 Tag
                  </button>
                  <button
                    onClick={() => handleSnoozeReminder(reminder.id, 168)}
                    className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    1 Woche
                  </button>
                </div>
              </div>
            </>
          )}
          
          <button
            onClick={() => handleEditReminder(reminder)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="Bearbeiten"
          >
            ✏️
          </button>
          
          <button
            onClick={() => handleDeleteReminder(reminder.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded"
            title="Löschen"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Erinnerungen</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => onNavigate?.('calendar')}
              leftIcon="📅"
            >
              Kalender
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              leftIcon="+"
              size="md"
            >
              Neue Erinnerung
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Gesamt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600">Überfällig</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
            <div className="text-sm text-gray-600">Heute</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-sm text-gray-600">Geplant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Erledigt</div>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={filters.status === 'overdue' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, status: 'overdue' }))}
            className="text-sm"
          >
            🚨 Überfällig ({stats.overdue})
          </Button>
          <Button
            variant={filters.status === 'due_today' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, status: 'due_today' }))}
            className="text-sm"
          >
            ⏰ Heute fällig ({stats.dueToday})
          </Button>
          <Button
            variant={filters.status === 'upcoming' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, status: 'upcoming' }))}
            className="text-sm"
          >
            📅 Geplant ({stats.upcoming})
          </Button>
          <Button
            variant={filters.priority === 'urgent' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              priority: filters.priority === 'urgent' ? undefined : 'urgent' 
            }))}
            className="text-sm"
          >
            🔥 Dringend ({stats.byPriority.urgent})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ search: '', status: 'all' })}
            className="text-sm text-gray-600"
          >
            ✕ Filter zurücksetzen
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          <div className="lg:col-span-2">
            <SearchInput
              value={filters.search}
              onChange={(value: string) => setFilters(prev => ({ ...prev, search: value }))}
              placeholder="Erinnerungen durchsuchen..."
              className="w-full"
            />
          </div>
          
          <Select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            options={[
              { value: 'all', label: 'Alle Status' },
              { value: 'pending', label: 'Ausstehend' },
              { value: 'completed', label: 'Erledigt' },
              { value: 'overdue', label: 'Überfällig' },
              { value: 'due_today', label: 'Heute fällig' },
              { value: 'upcoming', label: 'Geplant' }
            ]}
            fullWidth
          />

          <Select
            value={filters.priority || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              priority: e.target.value as ReminderPriority || undefined 
            }))}
            options={[
              { value: '', label: 'Alle Prioritäten' },
              { value: 'urgent', label: '🔥 Dringend' },
              { value: 'high', label: '🟠 Hoch' },
              { value: 'medium', label: '🟡 Mittel' },
              { value: 'low', label: '🟢 Niedrig' }
            ]}
            fullWidth
          />

          <Select
            value={filters.type || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              type: e.target.value as ReminderType || undefined 
            }))}
            options={[
              { value: '', label: 'Alle Typen' },
              { value: 'deadline', label: '⏰ Deadline' },
              { value: 'follow_up', label: '📞 Follow-up' },
              { value: 'interview', label: '👔 Interview' },
              { value: 'custom', label: '📝 Individuell' }
            ]}
            fullWidth
          />

          <Select
            value={filters.date_range || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              date_range: e.target.value as any || undefined 
            }))}
            options={[
              { value: '', label: 'Alle Termine' },
              { value: 'today', label: 'Heute' },
              { value: 'week', label: 'Diese Woche' },
              { value: 'month', label: 'Dieser Monat' }
            ]}
            fullWidth
          />
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select
            value={filters.application_id || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              application_id: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            options={[
              { value: '', label: 'Alle Bewerbungen' },
              ...applications.map(app => ({
                value: app.id,
                label: `${app.position} - ${app.company_name || 'Unbekannt'}`
              }))
            ]}
            fullWidth
          />

          <Select
            value={filters.company_id || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              company_id: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            options={[
              { value: '', label: 'Alle Unternehmen' },
              ...companies.map(company => ({
                value: company.id,
                label: company.name
              }))
            ]}
            fullWidth
          />
        </div>

        {/* Filter Summary */}
        {(filters.search || filters.priority || filters.type || filters.application_id || filters.company_id || filters.date_range || filters.status !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">Aktive Filter:</span>
            {filters.search && (
              <Badge variant="blue" className="text-xs">
                Suche: "{filters.search}"
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
            {filters.priority && (
              <Badge variant="orange" className="text-xs">
                Priorität: {filters.priority}
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, priority: undefined }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
            {filters.type && (
              <Badge variant="green" className="text-xs">
                Typ: {filters.type}
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, type: undefined }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
            {filters.application_id && (
              <Badge variant="purple" className="text-xs">
                Bewerbung: {applications.find(app => app.id === filters.application_id)?.position}
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, application_id: undefined }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
            {filters.company_id && (
              <Badge variant="indigo" className="text-xs">
                Unternehmen: {companies.find(c => c.id === filters.company_id)?.name}
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, company_id: undefined }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
            {filters.date_range && (
              <Badge variant="pink" className="text-xs">
                Zeitraum: {filters.date_range === 'today' ? 'Heute' : 
                          filters.date_range === 'week' ? 'Diese Woche' : 
                          filters.date_range === 'month' ? 'Dieser Monat' : filters.date_range}
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, date_range: undefined }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {reminders.length} von {allReminders.length} Erinnerungen
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              📋 Liste
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
            >
              🔲 Karten
            </button>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <div className="space-y-4">
        {reminders.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Erinnerungen gefunden</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.priority || filters.type ? 
                'Versuche andere Filtereinstellungen.' : 
                'Erstelle deine erste Erinnerung!'
              }
            </p>
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              leftIcon="+"
              size="lg"
            >
              Neue Erinnerung
            </Button>
          </div>
        ) : (
          reminders.map(renderReminderCard)
        )}
      </div>

      {/* Floating Action Button for mobile/quick access */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 z-50 flex items-center justify-center text-2xl"
        title="Neue Erinnerung erstellen"
      >
        +
      </button>

      {/* Reminder Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ReminderForm
              initialData={formInitialData}
              onSubmit={handleCreateReminder}
              onCancel={resetForm}
              submitLabel={editingReminder ? 'Erinnerung aktualisieren' : 'Erinnerung erstellen'}
              applications={applications}
            />
          </div>
        </div>
      )}
    </div>
  );
};
