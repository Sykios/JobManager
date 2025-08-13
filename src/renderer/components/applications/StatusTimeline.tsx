import React from 'react';
import { StatusHistoryModel } from '../../../models/StatusHistory';
import { getStatusConfig } from '../../../utils/statusUtils';
import { StatusBadge } from '../ui/StatusIndicators';

interface StatusTimelineProps {
  history: StatusHistoryModel[];
  compact?: boolean;
  showNotes?: boolean;
  className?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  history,
  compact = false,
  showNotes = true,
  className = ''
}) => {
  if (history.length === 0) {
    return (
      <div className={`text-gray-500 text-sm italic ${className}`}>
        Keine Statushistorie verfügbar
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {history.map((entry, index) => {
          const config = getStatusConfig(entry.to_status);
          const isLast = index === history.length - 1;
          
          return (
            <React.Fragment key={entry.id}>
              <div 
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs"
                style={{ 
                  backgroundColor: config.bgColor.replace('bg-', '').replace('-100', ''),
                  color: config.textColor.replace('text-', '').replace('-800', '')
                }}
                title={`${config.label} - ${entry.getFormattedDate()}`}
              >
                {config.icon}
              </div>
              {!isLast && (
                <div className="w-4 h-0.5 bg-gray-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Status-Verlauf ({history.length} Änderung{history.length === 1 ? '' : 'en'})
      </h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {history.map((entry, index) => {
          const config = getStatusConfig(entry.to_status);
          const isFirst = index === 0;
          const isLast = index === history.length - 1;
          
          return (
            <div key={entry.id} className="relative flex items-start gap-4 pb-4 last:pb-0">
              {/* Status indicator */}
              <div 
                className={`
                  relative z-10 flex items-center justify-center w-8 h-8 rounded-full 
                  border-2 border-white shadow-sm text-sm font-medium
                  ${config.bgColor} ${config.textColor}
                `}
              >
                {config.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge 
                    status={entry.to_status} 
                    size="sm" 
                    showIcon={false} 
                  />
                  <span className="text-xs text-gray-500">
                    {entry.getFormattedDate()}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({entry.getTimeElapsed()})
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-1">
                  {entry.getChangeDescription()}
                </p>
                
                {showNotes && entry.note && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border-l-2 border-blue-200">
                    <p className="text-xs text-gray-600 italic">
                      &ldquo;{entry.note}&rdquo;
                    </p>
                  </div>
                )}
                
                {isFirst && entry.isInitialStatus() && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                    <span>✨</span>
                    Bewerbung erstellt
                  </span>
                )}
                
                {isLast && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    <span>📍</span>
                    Aktueller Status
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface StatusTimelineStatsProps {
  history: StatusHistoryModel[];
  className?: string;
}

export const StatusTimelineStats: React.FC<StatusTimelineStatsProps> = ({
  history,
  className = ''
}) => {
  if (history.length === 0) {
    return null;
  }

  const totalChanges = history.length;
  const firstChange = history[0];
  const lastChange = history[history.length - 1];
  
  const daysSinceStart = Math.floor(
    (new Date().getTime() - new Date(firstChange.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const daysSinceLastChange = Math.floor(
    (new Date().getTime() - new Date(lastChange.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const averageDaysBetweenChanges = totalChanges > 1 
    ? Math.floor(daysSinceStart / (totalChanges - 1))
    : 0;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{totalChanges}</div>
        <div className="text-xs text-gray-500">Statusänderungen</div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{daysSinceStart}</div>
        <div className="text-xs text-gray-500">Tage seit Start</div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{daysSinceLastChange}</div>
        <div className="text-xs text-gray-500">Tage seit letzter Änderung</div>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">
          {averageDaysBetweenChanges > 0 ? averageDaysBetweenChanges : '—'}
        </div>
        <div className="text-xs text-gray-500">⌀ Tage zwischen Änderungen</div>
      </div>
    </div>
  );
};
