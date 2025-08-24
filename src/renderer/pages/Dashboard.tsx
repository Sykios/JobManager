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
