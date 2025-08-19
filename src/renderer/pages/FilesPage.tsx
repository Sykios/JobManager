import React, { useEffect, useState } from 'react';
import { FileModel } from '../../models/File';
import { FileList } from '../components/files/FileList';
import { useFileService } from '../hooks/useFileService';
import { Loading } from '../components/common/Loading';

const FilesPage: React.FC = () => {
  const fileService = useFileService();
  const [files, setFiles] = useState<FileModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!fileService) return;
      try {
        setLoading(true);
        const allFiles = await fileService.getAll();
        setFiles(allFiles);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [fileService]);

  const handleFileDownload = async (file: FileModel) => {
    if (!fileService || !file.id) return;
    try {
      const buffer = await fileService.getFileBuffer(file.id);
      // Convert buffer to Uint8Array for blob creation
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: file.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Fehler beim Herunterladen der Datei.');
    }
  };

  const handleFileDelete = async (file: FileModel) => {
    if (!fileService || !file.id) return;
    try {
      await fileService.delete(file.id);
      setFiles(prevFiles => prevFiles.filter(f => f.id !== file.id));
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Fehler beim Löschen der Datei.');
    }
  };

  if (loading) {
    return <Loading message="Lade alle Dateien..." />;
  }

  return (
    <div className="page-container p-6 bg-gray-50 min-h-screen">
      <header className="page-header mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dateiverwaltung</h1>
        <p className="text-md text-gray-600 mt-1">
          Hier können Sie alle hochgeladenen Dokumente und Anhänge einsehen und verwalten.
        </p>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Fehler</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <FileList
          files={files}
          onDownload={handleFileDownload}
          onDelete={handleFileDelete}
          showFilters={true}
          emptyMessage="Es wurden noch keine Dateien hochgeladen."
        />
      </div>
    </div>
  );
};

export default FilesPage;
