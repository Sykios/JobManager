import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, Company } from '../../types';

interface DashboardProps {
  onNavigate?: (page: string, state?: any) => void;
}

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  interviewApplications: number;
  offerApplications: number;
  rejectedApplications: number;
  thisMonthApplications: number;
}

interface RecentApplication extends Application {
  company_name?: string;
}

// Development Helper Component
const DevelopmentHelper: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<string>('');

  const createTestData = async () => {
    try {
      setMessage('🔄 Creating test data...');
      
      // First create test companies
      const testCompanies = [
        {
          name: 'TechCorp GmbH',
          industry: 'Software Development',
          location: 'Wien',
          website: 'https://techcorp.at'
        },
        {
          name: 'StartupXY',
          industry: 'E-Commerce',
          location: 'Graz', 
          website: 'https://startupxy.com'
        },
        {
          name: 'Digital Solutions',
          industry: 'Consulting',
          location: 'Salzburg',
          website: 'https://digitalsolutions.co.at'
        }
      ];

      const companyIds = [];
      for (const company of testCompanies) {
        await window.electronAPI.queryDatabase(
          `INSERT INTO companies (name, industry, location, website, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [company.name, company.industry, company.location, company.website]
        );
        
        // Get the last inserted ID using SQLite syntax
        const result = await window.electronAPI.queryDatabase(
          'SELECT last_insert_rowid() as id',
          []
        );
        if (result && result.length > 0) {
          companyIds.push(result[0].id);
        }
      }

      // Then create test applications with proper company_id references
      const testApplications = [
        {
          company_id: companyIds[0],
          title: 'Junior Developer Position',
          position: 'Junior Developer',
          status: 'applied',
          application_date: new Date().toISOString().split('T')[0],
          salary_range: '45.000€ - 55.000€',
          work_type: 'full-time',
          location: 'Wien',
          remote_possible: true,
          priority: 3,
          notes: 'Applied via company website'
        },
        {
          company_id: companyIds[1],
          title: 'Frontend Developer Position', 
          position: 'Frontend Developer',
          status: 'interview',
          application_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          salary_range: '42.000€ - 52.000€',
          work_type: 'full-time',
          location: 'Graz',
          remote_possible: false,
          priority: 4,
          notes: 'Phone interview scheduled for next week'
        },
        {
          company_id: companyIds[2],
          title: 'Full Stack Developer Position',
          position: 'Full Stack Developer',
          status: 'rejected',
          application_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          salary_range: '50.000€ - 65.000€',
          work_type: 'full-time',
          location: 'Salzburg',
          remote_possible: true,
          priority: 5,
          notes: 'Not enough experience with React'
        }
      ];

      for (const app of testApplications) {
        await window.electronAPI.queryDatabase(
          `INSERT INTO applications (
            company_id, title, position, status, application_date, 
            salary_range, work_type, location, remote_possible, priority, 
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            app.company_id, app.title, app.position, app.status, 
            app.application_date, app.salary_range, app.work_type, 
            app.location, app.remote_possible, app.priority, app.notes
          ]
        );
      }

      setMessage('✅ Test data created successfully! Refresh the page to see changes.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create test data:', error);
      setMessage('❌ Failed to create test data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ This will delete ALL application data. Are you sure?')) return;
    
    try {
      setMessage('🗑️ Clearing all data...');
      await window.electronAPI.queryDatabase('DELETE FROM applications', []);
      setMessage('✅ All data cleared! Refresh the page to see changes.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      setMessage('❌ Failed to clear data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development' && false) return null;

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-800 font-medium">🛠️ Development Mode</span>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded text-yellow-800"
        >
          {isVisible ? 'Hide' : 'Show'} Tools
        </button>
      </div>
      
      {isVisible && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={createTestData}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
            >
              📝 Create Test Applications
            </button>
            <button
              onClick={clearAllData}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
            >
              🗑️ Clear All Data
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
            >
              🔄 Refresh Dashboard
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            These development tools help you test the application with sample data.
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    interviewApplications: 0,
    offerApplications: 0,
    rejectedApplications: 0,
    thisMonthApplications: 0
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load statistics
      await loadStats();
      
      // Load recent applications
      await loadRecentApplications();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Fehler beim Laden der Dashboard-Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Get total applications count
    const totalResult = await window.electronAPI.queryDatabase(
      'SELECT COUNT(*) as count FROM applications',
      []
    );
    
    // Get applications by status
    const statusResults = await window.electronAPI.queryDatabase(
      `SELECT status, COUNT(*) as count FROM applications GROUP BY status`,
      []
    );
    
    // Get applications from this month
    const thisMonthResult = await window.electronAPI.queryDatabase(
      `SELECT COUNT(*) as count FROM applications 
       WHERE date(created_at) >= date('now', 'start of month')`,
      []
    );
    
    // Process status counts
    const statusCounts: Record<ApplicationStatus, number> = {
      draft: 0,
      applied: 0,
      'in-review': 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0
    };
    
    statusResults.forEach((row: any) => {
      statusCounts[row.status as ApplicationStatus] = row.count;
    });
    
    setStats({
      totalApplications: totalResult[0]?.count || 0,
      pendingApplications: statusCounts.applied + statusCounts['in-review'],
      interviewApplications: statusCounts.interview,
      offerApplications: statusCounts.offer,
      rejectedApplications: statusCounts.rejected,
      thisMonthApplications: thisMonthResult[0]?.count || 0
    });
  };

  const loadRecentApplications = async () => {
    const result = await window.electronAPI.queryDatabase(
      `SELECT a.*, c.name as company_name
       FROM applications a
       LEFT JOIN companies c ON a.company_id = c.id
       ORDER BY a.created_at DESC
       LIMIT 5`,
      []
    );
    
    setRecentApplications(result || []);
  };

  const getStatusColor = (status: ApplicationStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      applied: 'bg-blue-100 text-blue-800',
      'in-review': 'bg-yellow-100 text-yellow-800',
      interview: 'bg-purple-100 text-purple-800',
      offer: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.draft;
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    const labels = {
      draft: 'Entwurf',
      applied: 'Beworben',
      'in-review': 'In Prüfung',
      interview: 'Interview',
      offer: 'Angebot',
      rejected: 'Abgelehnt',
      withdrawn: 'Zurückgezogen'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-red-800 mb-2">Fehler</h1>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Development Helper */}
      <DevelopmentHelper />
      
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Überblick über Ihre Bewerbungsaktivitäten</p>
        {stats.thisMonthApplications > 0 && (
          <p className="text-sm text-green-600 mt-2">
            {stats.thisMonthApplications} neue Bewerbungen diesen Monat
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gesamt Bewerbungen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Wartend</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
              <p className="text-xs text-gray-500">Beworben + In Prüfung</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Interviews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.interviewApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Angebote</p>
              <p className="text-2xl font-bold text-gray-900">{stats.offerApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Abgelehnt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejectedApplications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Letzte Bewerbungen</h2>
        </div>
        <div className="p-6">
          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bewerbungen</h3>
              <p className="text-gray-600 mb-4">Sie haben noch keine Bewerbungen erstellt.</p>
              <button 
                onClick={() => onNavigate?.('new-application')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Erste Bewerbung erstellen
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApplications.map((app) => (
                <div 
                  key={app.id} 
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigate?.('application-detail', { application: app })}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {app.company_name 
                          ? app.company_name.substring(0, 2).toUpperCase()
                          : app.position.substring(0, 2).toUpperCase()
                        }
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{app.position}</h3>
                      <p className="text-sm text-gray-600">
                        {app.company_name || 'Unbekanntes Unternehmen'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {getStatusLabel(app.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
