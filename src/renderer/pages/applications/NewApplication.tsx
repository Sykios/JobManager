import React, { useState } from 'react';
import { ApplicationForm } from '../../components/applications/ApplicationForm';
import { ApplicationCreateData } from '../../../services/ApplicationService';

interface NewApplicationProps {
  onNavigate?: (page: string, state?: any) => void;
}

export const NewApplication: React.FC<NewApplicationProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (
    data: ApplicationCreateData,
    files?: {
      cv?: { file: File; description?: string };
      coverLetter?: { file: File; description?: string };
      additionalFiles: { file: File; description?: string }[];
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, create the application
      const query = `
        INSERT INTO applications (
          company_id, contact_id, title, position, job_url, application_channel,
          salary_range, work_type, location, remote_possible, status, priority,
          application_date, deadline, follow_up_date, notes, cover_letter,
          requirements, benefits
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.company_id || null,
        data.contact_id || null,
        data.title,
        data.position,
        data.job_url || null,
        data.application_channel || null,
        data.salary_range || null,
        data.work_type || null,
        data.location || null,
        data.remote_possible ? 1 : 0,
        'draft',
        data.priority || 1,
        data.application_date || null,
        data.deadline || null,
        data.follow_up_date || null,
        data.notes || null,
        data.cover_letter || null,
        data.requirements || null,
        data.benefits || null,
      ];

      const result = await window.electronAPI.executeQuery(query, params);
      const applicationId = result.lastID;

      // Handle file uploads if any files are provided
      if (files && applicationId) {
        const filesToUpload: Array<{
          file: File;
          description: string;
          type: 'cv' | 'cover_letter' | 'additional';
        }> = [];

        if (files.cv) {
          filesToUpload.push({
            file: files.cv.file,
            description: files.cv.description || 'Lebenslauf',
            type: 'cv'
          });
        }

        if (files.coverLetter) {
          filesToUpload.push({
            file: files.coverLetter.file,
            description: files.coverLetter.description || 'Anschreiben',
            type: 'cover_letter'
          });
        }

        files.additionalFiles.forEach(fileData => {
          filesToUpload.push({
            file: fileData.file,
            description: fileData.description || fileData.file.name,
            type: 'additional'
          });
        });

        // Upload each file using the new file upload API
        for (const fileData of filesToUpload) {
          try {
            // Convert File to ArrayBuffer
            const arrayBuffer = await fileData.file.arrayBuffer();
            
            // Determine file type from extension
            const getFileType = (filename: string) => {
              const ext = filename.split('.').pop()?.toLowerCase();
              switch (ext) {
                case 'pdf': return 'pdf';
                case 'doc':
                case 'docx': return 'docx';
                case 'txt': return 'txt';
                case 'jpg':
                case 'jpeg': return 'jpg';
                case 'png': return 'png';
                default: return 'other';
              }
            };
            
            const fileType = getFileType(fileData.file.name);
            
            // Upload file using the new API
            const uploadResult = await window.electronAPI.uploadFile({
              data: arrayBuffer,
              filename: fileData.file.name,
              applicationId: applicationId,
              fileType: fileType,
              description: fileData.description
            });
            
            if (!uploadResult.success) {
              throw new Error('Upload failed: success = false');
            }
            
            // Save file metadata to database
            const fileQuery = `
              INSERT INTO files (
                application_id, filename, original_name, file_path, size, 
                mime_type, type, description, upload_date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const fileParams = [
              applicationId,
              uploadResult.filename,
              uploadResult.originalName,
              uploadResult.filePath,
              uploadResult.size,
              fileData.file.type || 'application/octet-stream',
              fileType,
              fileData.description,
              new Date().toISOString()
            ];

            const fileResult = await window.electronAPI.executeQuery(fileQuery, fileParams);
          } catch (fileError) {
            console.error(`Error uploading file ${fileData.file.name}:`, fileError);
            setError(`Fehler beim Hochladen der Datei ${fileData.file.name}: ${fileError}`);
            // Continue with other files even if one fails
          }
        }
      } else if (files && !applicationId) {
        console.error('Cannot upload files: applicationId is missing!', { applicationId, hasFiles: !!files });
        setError('Fehler: Bewerbung wurde nicht korrekt erstellt. Dateien können nicht hochgeladen werden.');
      }
      
      setSuccess('Bewerbung erfolgreich erstellt!');
      
      // Reset form after successful submission
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('applications', { message: 'Bewerbung erfolgreich erstellt!' });
        }
      }, 2000);

    } catch (error) {
      setError(
        error instanceof Error 
          ? error.message 
          : 'Ein unbekannter Fehler ist aufgetreten'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onNavigate) {
      onNavigate('applications');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Neue Bewerbung</h1>
        <p className="mt-2 text-sm text-gray-600">
          Erfassen Sie alle wichtigen Informationen zu Ihrer neuen Bewerbung.
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Erfolg!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Fehler beim Erstellen der Bewerbung
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApplicationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel="Bewerbung erstellen"
      />
    </div>
  );
};
