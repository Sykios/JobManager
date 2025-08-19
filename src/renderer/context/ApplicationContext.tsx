import React, { createContext, useContext, ReactNode } from 'react';

interface DatabaseContextType {
  // Database operations using IPC
  executeQuery: (query: string, params?: any[]) => Promise<any>;
  queryDatabase: (query: string, params?: any[]) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use IPC for all database operations
  const executeQuery = async (query: string, params?: any[]) => {
    return window.electronAPI.executeQuery(query, params);
  };

  const queryDatabase = async (query: string, params?: any[]) => {
    return window.electronAPI.queryDatabase(query, params);
  };

  const value = { 
    executeQuery,
    queryDatabase,
    isLoading: false, // No loading state needed since database is initialized in main process
    error: null 
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

