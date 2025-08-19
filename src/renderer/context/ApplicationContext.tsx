import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ApplicationService } from '../../services/ApplicationService';
import { ContactService } from '../../services/ContactService';
import { FileService } from '../../services/FileService';

interface DatabaseContextType {
  db: Database | null;
  applicationService: ApplicationService | null;
  contactService: ContactService | null;
  fileService: FileService | null;
  isLoading: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [applicationService, setApplicationService] = useState<ApplicationService | null>(null);
  const [contactService, setContactService] = useState<ContactService | null>(null);
  const [fileService, setFileService] = useState<FileService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const { open } = await import('sqlite');
        const database = await open({
          filename: './jobmanager.db',
          driver: sqlite3.Database,
        });

        const appService = new ApplicationService(database);
        await appService.initializeTable();

        const conService = new ContactService(database);
        await conService.initializeTable();

        const fService = new FileService(database);
        await fService.initializeTable();

        setDb(database);
        setApplicationService(appService);
        setContactService(conService);
        setFileService(fService);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabase();

    return () => {
      db?.close();
    };
  }, []);

  const value = { db, applicationService, contactService, fileService, isLoading, error };

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

