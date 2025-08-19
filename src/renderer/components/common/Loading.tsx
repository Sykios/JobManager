import React from 'react';
import clsx from 'clsx';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div className={clsx('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizeClasses[size])} />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'h-4 bg-gray-200 rounded',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={clsx('animate-pulse', className)}
        />
      ))}
    </>
  );
};

export interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <Skeleton className="h-6 bg-gray-200 rounded w-3/4" />
              <Skeleton className="h-4 bg-gray-200 rounded w-1/2" />
              <Skeleton className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
            
            {/* Body */}
            <div className="space-y-2">
              <Skeleton className="h-3 bg-gray-200 rounded w-full" />
              <Skeleton className="h-3 bg-gray-200 rounded w-full" />
              <Skeleton className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center pt-4">
              <Skeleton className="h-3 bg-gray-200 rounded w-1/4" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 bg-gray-200 rounded w-20" />
                <Skeleton className="h-8 bg-gray-200 rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
