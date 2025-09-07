import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from './auth/LoginForm';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isOfflineMode } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading JobManager...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated and not in offline mode
  if (!isAuthenticated && !isOfflineMode) {
    return <LoginForm />;
  }

  // Render the app if authenticated or in offline mode
  return <>{children}</>;
};
