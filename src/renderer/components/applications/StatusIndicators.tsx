import React from 'react';
import { ApplicationStatus } from '../../../types';
import { getStatusConfig } from '../../../utils/statusUtils';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className = ''
}) => {
  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      title={config.description}
    >
      {showIcon && (
        <span className={iconSizes[size]} aria-hidden="true">
          {config.icon}
        </span>
      )}
      {showLabel && config.label}
    </span>
  );
};

interface StatusIndicatorProps {
  status: ApplicationStatus;
  size?: number;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 12,
  className = ''
}) => {
  const config = getStatusConfig(status);
  
  return (
    <div
      className={`
        rounded-full border-2 border-white shadow-sm
        ${config.bgColor}
        ${className}
      `}
      style={{ width: size, height: size }}
      title={`${config.label}: ${config.description}`}
    />
  );
};

interface StatusProgressProps {
  currentStatus: ApplicationStatus;
  className?: string;
}

export const StatusProgress: React.FC<StatusProgressProps> = ({
  currentStatus,
  className = ''
}) => {
  const statuses: ApplicationStatus[] = ['draft', 'applied', 'in-review', 'interview', 'offer'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  // Handle final states that aren't in the normal progression
  const isRejected = currentStatus === 'rejected';
  const isWithdrawn = currentStatus === 'withdrawn';
  
  return (
    <div className={`flex items-center ${className}`}>
      {statuses.map((status, index) => {
        const config = getStatusConfig(status);
        const isActive = index <= currentIndex && !isRejected && !isWithdrawn;
        const isCurrent = status === currentStatus;
        
        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm
                  transition-all duration-200
                  ${isCurrent 
                    ? `${config.bgColor} ${config.textColor} border-${config.color}-400` 
                    : isActive 
                      ? 'bg-blue-100 text-blue-600 border-blue-300' 
                      : 'bg-gray-100 text-gray-400 border-gray-300'
                  }
                `}
              >
                {config.icon}
              </div>
              <span className={`
                mt-1 text-xs font-medium
                ${isCurrent ? config.textColor : isActive ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {config.label}
              </span>
            </div>
            
            {index < statuses.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-2
                  ${index < currentIndex && !isRejected && !isWithdrawn
                    ? 'bg-blue-300' 
                    : 'bg-gray-200'
                  }
                `}
              />
            )}
          </React.Fragment>
        );
      })}
      
      {/* Show rejected/withdrawn status separately */}
      {(isRejected || isWithdrawn) && (
        <>
          <div className="flex-1 h-0.5 mx-2 bg-gray-200" />
          <div className="flex flex-col items-center">
            <div className={`
              w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm
              ${getStatusConfig(currentStatus).bgColor} 
              ${getStatusConfig(currentStatus).textColor}
              border-${getStatusConfig(currentStatus).color}-400
            `}>
              {getStatusConfig(currentStatus).icon}
            </div>
            <span className={`
              mt-1 text-xs font-medium
              ${getStatusConfig(currentStatus).textColor}
            `}>
              {getStatusConfig(currentStatus).label}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
