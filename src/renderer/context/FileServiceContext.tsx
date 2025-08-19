import React, { createContext, ReactNode } from 'react';
import { FileService } from '../../services/FileService';
import { useDatabase } from './DatabaseContext'; // Assuming you have a similar context for the database

interface FileServiceProviderProps {
  children: ReactNode;
}

export const FileServiceContext = createContext<FileService | null>(null);

export const FileServiceProvider: React.FC<FileServiceProviderProps> = ({ children }) => {
  const db = useDatabase();
  const [fileService, setFileService] = React.useState<FileService | null>(null);

  React.useEffect(() => {
    if (db) {
      const service = new FileService(db);
      service.initializeTable().then(() => {
        setFileService(service);
      });
    }
  }, [db]);

  return (
    <FileServiceContext.Provider value={fileService}>
      {children}
    </FileServiceContext.Provider>
  );
};
