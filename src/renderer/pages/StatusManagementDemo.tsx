import React, { useState } from 'react';
import { ApplicationStatus } from '../../types';
import { StatusBadge, StatusIndicator, StatusProgress } from '../components/ui/StatusIndicators';
import { StatusChanger } from '../components/applications/StatusChanger';
import { StatusTimeline, StatusTimelineStats } from '../components/applications/StatusTimeline';
import { StatusHistoryModel } from '../../models/StatusHistory';
import { getStatusConfig, sortStatusesByPriority } from '../../utils/statusUtils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const StatusManagementDemo: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>('draft');
  const [history, setHistory] = useState<StatusHistoryModel[]>([
    new StatusHistoryModel({
      id: 1,
      application_id: 1,
      from_status: null,
      to_status: 'draft',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ]);

  const handleStatusChange = async (newStatus: ApplicationStatus, note?: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newEntry = new StatusHistoryModel({
      id: history.length + 1,
      application_id: 1,
      from_status: currentStatus,
      to_status: newStatus,
      note,
      created_at: new Date().toISOString(),
    });

    setHistory([...history, newEntry]);
    setCurrentStatus(newStatus);
  };

  const resetDemo = () => {
    setCurrentStatus('draft');
    setHistory([
      new StatusHistoryModel({
        id: 1,
        application_id: 1,
        from_status: null,
        to_status: 'draft',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]);
  };

  const allStatuses: ApplicationStatus[] = ['draft', 'applied', 'in-review', 'interview', 'offer', 'rejected', 'withdrawn'];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Status Management Demo
        </h1>
        <p className="text-gray-600">
          Feature 3: Comprehensive status management system for job applications
        </p>
        <Button 
          variant="ghost" 
          onClick={resetDemo}
          className="mt-4"
        >
          🔄 Demo zurücksetzen
        </Button>
      </div>

      {/* Status Indicators Overview */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Indicators</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              {allStatuses.map(status => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Compact Status Indicators</h3>
            <div className="flex items-center gap-2">
              {allStatuses.map(status => (
                <StatusIndicator key={status} status={status} size={16} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status Sizes</h3>
            <div className="flex items-center gap-4">
              <StatusBadge status={currentStatus} size="sm" />
              <StatusBadge status={currentStatus} size="md" />
              <StatusBadge status={currentStatus} size="lg" />
            </div>
          </div>
        </div>
      </Card>

      {/* Status Progress */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Progress Visualization</h2>
        <StatusProgress currentStatus={currentStatus} />
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Test with different statuses</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['draft', 'applied', 'interview', 'rejected'].map(status => (
              <div key={status} className="p-3 border rounded-lg">
                <p className="text-xs text-gray-600 mb-2">{getStatusConfig(status as ApplicationStatus).label}</p>
                <StatusProgress currentStatus={status as ApplicationStatus} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Interactive Status Changer */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Interactive Status Changer</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Full View</h3>
            <StatusChanger
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              showCurrentBadge={true}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Compact View</h3>
            <StatusChanger
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              compact={true}
              showCurrentBadge={true}
            />
          </div>
        </div>
      </Card>

      {/* Status Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Timeline & History</h2>
        
        <StatusTimelineStats history={history} className="mb-6" />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Full Timeline</h3>
            <StatusTimeline history={history} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Compact Timeline</h3>
            <StatusTimeline history={history} compact={true} />
          </div>
        </div>
      </Card>

      {/* Status Configuration */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Status Configuration Overview</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Label</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Color</th>
                <th className="text-left py-2">Valid Transitions</th>
              </tr>
            </thead>
            <tbody>
              {sortStatusesByPriority(allStatuses).map((status: ApplicationStatus) => {
                const config = getStatusConfig(status);
                return (
                  <tr key={status} className="border-b">
                    <td className="py-2">
                      <StatusBadge status={status} size="sm" />
                    </td>
                    <td className="py-2 font-medium">{config.label}</td>
                    <td className="py-2 text-gray-600">{config.description}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${config.bgColor} ${config.textColor}`}>
                        {config.color}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {/* This would need to import and use getValidNextStatuses */}
                        <span className="text-xs text-gray-500">...</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
