import React, { useState, useEffect } from 'react';
import { ApplicationForm } from '../../components/applications/ApplicationForm';
import { ApplicationCreateData } from '../../../services/ApplicationService';

interface NewApplicationProps {
  onNavigate?: (page: string, state?: any) => void;
}

export const NewApplication: React.FC<NewApplicationProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // Cleanup navigation timer on unmount
  useEffect(() => {
    return () => {
      if ((window as any).navigationTimer) {
        clearTimeout((window as any).navigationTimer);
      }
    };
  }, []);

  const handleSubmit = async (
    data: ApplicationCreateData,
    files?: {
      cv?: { file: File; description?: string };
      coverLetter?: { file: File; description?: string };
      additionalFiles: { file: File; description?: string }[];
    }
  ) => {

    // Prevent duplicate submissions
    if (isLoading) {
      console.log('Preventing duplicate submission - already loading');
      return;
    }

    // Prevent submission if already submitted successfully
    if (success) {
      console.log('Preventing submission - already successful');
      return;
    }

    // Set loading state immediately
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use optimized application creation
      const createResult = await window.electronAPI.createApplicationOptimized(data);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create application');
      }

      const applicationId = createResult.application?.id;

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

        files.additionalFiles.forEach((fileData) => {
          filesToUpload.push({
            file: fileData.file,
            description: fileData.description || fileData.file.name,
            type: 'additional'
          });
        });

        // Upload files in parallel for better performance
        const uploadPromises = filesToUpload.map(async (fileData) => {
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

            // Return file metadata for batch insertion
            return {
              success: true,
              filename: fileData.file.name,
              metadata: {
                application_id: applicationId,
                filename: uploadResult.filename,
                original_name: uploadResult.originalName,
                file_path: uploadResult.filePath,
                size: uploadResult.size,
                mime_type: fileData.file.type || 'application/octet-stream',
                type: fileType,
                description: fileData.description,
                upload_date: new Date().toISOString()
              }
            };
          } catch (fileError) {
            console.error(`Error uploading file ${fileData.file.name}:`, fileError);
            return {
              success: false,
              filename: fileData.file.name,
              error: fileError instanceof Error ? fileError.message : 'Unknown error'
            };
          }
        });

        // Wait for all uploads to complete
        const uploadResults = await Promise.allSettled(uploadPromises);

        // Separate successful and failed uploads
        const successfulUploads = uploadResults
          .filter(result => result.status === 'fulfilled' && result.value.success)
          .map(result => (result as PromiseFulfilledResult<any>).value);

        const failedUploads = uploadResults
          .filter(result => result.status === 'rejected' ||
            (result.status === 'fulfilled' && !result.value.success))
          .map(result => {
            if (result.status === 'rejected') {
              return 'Unknown file (Promise rejected)';
            }
            return result.value.filename;
          });

        // Batch insert file metadata for successful uploads
        if (successfulUploads.length > 0) {
          const batchOperations = successfulUploads.map(upload => ({
            query: `
              INSERT INTO files (
                application_id, filename, original_name, file_path, size,
                mime_type, type, description, upload_date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
              upload.metadata.application_id,
              upload.metadata.filename,
              upload.metadata.original_name,
              upload.metadata.file_path,
              upload.metadata.size,
              upload.metadata.mime_type,
              upload.metadata.type,
              upload.metadata.description,
              upload.metadata.upload_date
            ]
          }));

          await window.electronAPI.batchExecute(batchOperations);
        }

        if (failedUploads.length > 0) {
          console.error('Some files failed to upload:', failedUploads);
          setError(`Einige Dateien konnten nicht hochgeladen werden: ${failedUploads.join(', ')}`);
        }
      } else if (files && !applicationId) {
        console.error('Cannot upload files: applicationId is missing!');
        setError('Fehler: Bewerbung wurde nicht korrekt erstellt. Dateien können nicht hochgeladen werden.');
      }

      setSuccess('Bewerbung erfolgreich erstellt!');

      // Navigate back after successful submission - give user time to see success message
      const navigateTimer = setTimeout(() => {
        if (onNavigate) {
          onNavigate('applications', { message: 'Bewerbung erfolgreich erstellt!' });
        } else {
          console.error('onNavigate function is not available!');
          // Fallback: try to navigate using window.location or other methods
          console.log('Attempting fallback navigation...');
          // You might need to implement a fallback navigation method here
        }
      }, 50);

      // Store the timer so we can clear it if needed
      (window as any).navigationTimer = navigateTimer;

    } catch (error) {
      console.error('Error during submission:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Ein unbekannter Fehler ist aufgetreten'
      );
    } finally {
      console.log('Setting loading to false');
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
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                Erfolg!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    console.log('Manual navigation triggered');
                    if (onNavigate) {
                      onNavigate('applications', { message: 'Bewerbung erfolgreich erstellt!' });
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Zurück zu Bewerbungen
                </button>
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
