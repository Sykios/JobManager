import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'md',
  hoverable = false,
  className,
  ...props
}) => {
  const baseClasses = ['bg-white'];

  const variantClasses = {
    default: 'border border-gray-200 shadow-sm',
    outlined: 'border border-gray-300',
    elevated: 'shadow-lg border border-gray-100',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
  };

  const cardClasses = clsx(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    roundedClasses[rounded],
    {
      'hover:shadow-md transition-shadow duration-200 cursor-pointer': hoverable,
    },
    className
  );

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  action,
  children,
  className,
  ...props
}) => {
  const headerClasses = clsx('flex items-start justify-between', className);

  return (
    <div className={headerClasses} {...props}>
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className,
  ...props
}) => {
  const bodyClasses = clsx('mt-4', className);

  return (
    <div className={bodyClasses} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  const footerClasses = clsx(
    'mt-4 pt-4 border-t border-gray-200 flex items-center justify-between',
    className
  );

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  );
};
