import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Application, ApplicationStatus } from '../../../types';
import { StatusBadge, StatusProgress } from './StatusIndicators';
import { StatusChanger } from './StatusChanger';

export interface ApplicationCardProps {
  application: Application;
  onEdit?: (application: Application) => void;
  onDelete?: (application: Application) => void;
  onStatusChange?: (application: Application, newStatus: ApplicationStatus, note?: string) => Promise<void>;
  onView?: (application: Application) => void;
  showStatusChanger?: boolean;
  showStatusProgress?: boolean;
}

const statusConfig: Record<ApplicationStatus, { color: string; label: string }> = {
  draft: { color: 'gray', label: 'Entwurf' },
  applied: { color: 'blue', label: 'Beworben' },
  'in-review': { color: 'yellow', label: 'In Prüfung' },
  interview: { color: 'purple', label: 'Gespräch' },
  offer: { color: 'green', label: 'Angebot' },
  rejected: { color: 'red', label: 'Abgelehnt' },
  withdrawn: { color: 'gray', label: 'Zurückgezogen' },
};

const priorityConfig = {
  1: { color: 'gray', label: 'Niedrig' },
  2: { color: 'blue', label: 'Gering' },
  3: { color: 'yellow', label: 'Mittel' },
  4: { color: 'orange', label: 'Hoch' },
  5: { color: 'red', label: 'Sehr hoch' },
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onEdit,
  onDelete,
  onStatusChange,
  onView,
  showStatusChanger = false,
  showStatusProgress = false,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const statusInfo = statusConfig[application.status];
  const priorityInfo = priorityConfig[application.priority];

  const handleStatusChange = async (newStatus: ApplicationStatus, note?: string) => {
    if (!onStatusChange) return;
    
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(application, newStatus, note);
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error; // Re-throw to let StatusChanger handle the error
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const isDeadlineApproaching = () => {
    if (!application.deadline) return false;
    const deadline = new Date(application.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const isOverdue = () => {
    if (!application.deadline) return false;
    return new Date(application.deadline) < new Date();
  };

  return (
    <Card hoverable className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {application.title}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {application.position}
            </p>
            {application.location && (
              <p className="text-sm text-gray-500 truncate">
                📍 {application.location}
                {Number(application.remote_possible) === 1 && ' • Remote möglich'}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <StatusBadge status={application.status} size="sm" />
            {application.priority > 3 && (
              <Badge variant={priorityInfo.color as any} size="sm">
                P{application.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="space-y-2">
          {application.work_type && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              {application.work_type === 'full-time' && 'Vollzeit'}
              {application.work_type === 'part-time' && 'Teilzeit'}
              {application.work_type === 'contract' && 'Vertrag'}
              {application.work_type === 'internship' && 'Praktikum'}
              {application.work_type === 'freelance' && 'Freelance'}
            </div>
          )}

          {application.salary_range && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              {application.salary_range}
            </div>
          )}

          {application.fileCount !== undefined && application.fileCount > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {application.fileCount} {application.fileCount === 1 ? 'Datei' : 'Dateien'}
              {application.totalFileSize && application.totalFileSize > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({application.totalFileSize < 1024 ? `${application.totalFileSize} B` :
                    application.totalFileSize < 1024 * 1024 ? `${(application.totalFileSize / 1024).toFixed(1)} KB` :
                    `${(application.totalFileSize / 1024 / 1024).toFixed(2)} MB`})
                </span>
              )}
            </div>
          )}

          {(application.application_date || application.deadline) && (
            <div className="space-y-1">
              {application.application_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Beworben: {formatDate(application.application_date)}
                </div>
              )}
              
              {application.deadline && (
                <div className={`flex items-center text-sm ${
                  isOverdue() ? 'text-red-600' : isDeadlineApproaching() ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Frist: {formatDate(application.deadline)}
                  {isOverdue() && ' (Überfällig)'}
                  {isDeadlineApproaching() && !isOverdue() && ' (Bald fällig)'}
                </div>
              )}
            </div>
          )}

          {application.notes && (
            <div className="mt-3">
              <p className="text-sm text-gray-700 line-clamp-2">
                {application.notes}
              </p>
            </div>
          )}

          {/* Status Progress */}
          {showStatusProgress && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <StatusProgress currentStatus={application.status} />
            </div>
          )}

          {/* Status Changer */}
          {showStatusChanger && onStatusChange && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <StatusChanger
                currentStatus={application.status}
                onStatusChange={handleStatusChange}
                disabled={isUpdatingStatus}
                compact={true}
                showCurrentBadge={false}
              />
            </div>
          )}
        </div>
      </CardBody>

      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-gray-500">
            Erstellt: {formatDate(application.created_at)}
          </div>
          
          <div className="flex items-center space-x-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(application)}
              >
                Ansehen
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(application)}
                leftIcon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                Bearbeiten
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(application)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2"
                title="Löschen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
