import React, { createContext, ReactNode } from 'react';
import { FileService } from '../../services/FileService';
import { useDatabase } from './ApplicationContext'; // Import from ApplicationContext instead

interface FileServiceProviderProps {
  children: ReactNode;
}

export const FileServiceContext = createContext<FileService | null>(null);

export const FileServiceProvider: React.FC<FileServiceProviderProps> = ({ children }) => {
  const { fileService } = useDatabase();

  return (
    <FileServiceContext.Provider value={fileService}>
      {children}
    </FileServiceContext.Provider>
  );
};
