import React, { useState, useEffect } from 'react';
import { Application } from '../../../types';
import { ApplicationForm } from '../../components/applications/ApplicationForm';
import { Button } from '../../components/ui/Button';
import { ApplicationCreateData } from '../../../services/ApplicationService';
import { useNavigation } from '../../context/NavigationContext';

interface ApplicationEditProps {
  application?: Application;
  applicationId?: number;
  onNavigate?: (page: string, state?: any) => void;
}

export const ApplicationEdit: React.FC<ApplicationEditProps> = ({ 
  application: propApplication,
  applicationId, 
  onNavigate 
}) => {
  const { goBack, canGoBack } = useNavigation();
  const [application, setApplication] = useState<Application | null>(propApplication || null);
  const [loading, setLoading] = useState(!propApplication && !!applicationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load application data if not provided via props
  useEffect(() => {
    if (!propApplication && applicationId) {
      loadApplication(applicationId);
    }
  }, [applicationId, propApplication]);

  const loadApplication = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const query = 'SELECT * FROM applications WHERE id = ?';
      const result = await window.electronAPI.queryDatabase(query, [id]);
      
      if (result.length === 0) {
        setError('Bewerbung nicht gefunden');
        return;
      }

      setApplication(result[0]);
    } catch (err) {
      console.error('Error loading application:', err);
      setError('Fehler beim Laden der Bewerbung');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: ApplicationCreateData, files?: any) => {
    if (!application) return;

    try {
      setSaving(true);
      setError(null);

      // Update application in database
      const updateQuery = `
        UPDATE applications SET
          title = ?,
          position = ?,
          company_id = ?,
          contact_id = ?,
          job_url = ?,
          application_channel = ?,
          salary_range = ?,
          work_type = ?,
          location = ?,
          remote_possible = ?,
          priority = ?,
          application_date = ?,
          deadline = ?,
          follow_up_date = ?,
          notes = ?,
          cover_letter = ?,
          requirements = ?,
          benefits = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const updateParams = [
        formData.title,
        formData.position,
        formData.company_id || null,
        formData.contact_id || null,
        formData.job_url || null,
        formData.application_channel || null,
        formData.salary_range || null,
        formData.work_type || null,
        formData.location || null,
        formData.remote_possible ? 1 : 0,
        formData.priority || 3,
        formData.application_date || null,
        formData.deadline || null,
        formData.follow_up_date || null,
        formData.notes || null,
        formData.cover_letter || null,
        formData.requirements || null,
        formData.benefits || null,
        application.id
      ];

      await window.electronAPI.executeQuery(updateQuery, updateParams);

      // Handle file uploads if present
      if (files) {
        console.log('Processing file uploads in edit mode...');

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

        files.additionalFiles.forEach((fileData: { file: File; description?: string }) => {
          filesToUpload.push({
            file: fileData.file,
            description: fileData.description || fileData.file.name,
            type: 'additional'
          });
        });

        console.log(`Uploading ${filesToUpload.length} files...`);

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

            // Upload file using the API
            const uploadResult = await window.electronAPI.uploadFile({
              data: arrayBuffer,
              filename: fileData.file.name,
              applicationId: application.id,
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
                application_id: application.id,
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

        console.log(`Successfully uploaded ${successfulUploads.length} files`);

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
          console.log(`Inserted ${successfulUploads.length} file records into database`);
        }

        if (failedUploads.length > 0) {
          console.error('Some files failed to upload:', failedUploads);
          setError(`Einige Dateien konnten nicht hochgeladen werden: ${failedUploads.join(', ')}`);
        }
      }

      // Navigate back to application detail
      if (onNavigate) {
        onNavigate('application-detail', { 
          application: { ...application, ...formData },
          applicationId: application.id 
        });
      }
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Fehler beim Speichern der Bewerbung');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (onNavigate) {
      if (application) {
        onNavigate('application-detail', { 
          application,
          applicationId: application.id 
        });
      } else {
        onNavigate('applications');
      }
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      goBack();
    } else if (onNavigate) {
      // Fallback to applications page if no history
      onNavigate('applications');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bewerbung wird geladen...
          </h2>
          <p className="text-gray-600">
            Bitte warten Sie einen Moment.
          </p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Bewerbung nicht gefunden'}
          </h2>
          <p className="text-gray-600 mb-6">
            Die Bewerbung konnte nicht geladen werden oder ist nicht verfügbar.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  // Prepare initial data for the form
  const initialData: Partial<ApplicationCreateData> = {
    title: application.title,
    position: application.position,
    company_id: application.company_id,
    contact_id: application.contact_id,
    job_url: application.job_url || '',
    application_channel: application.application_channel || '',
    salary_range: application.salary_range || '',
    work_type: application.work_type,
    location: application.location || '',
    remote_possible: !!application.remote_possible,
    priority: application.priority,
    application_date: application.application_date || '',
    deadline: application.deadline || '',
    follow_up_date: application.follow_up_date || '',
    notes: application.notes || '',
    cover_letter: application.cover_letter || '',
    requirements: application.requirements || '',
    benefits: application.benefits || '',
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Button
              variant="ghost"
              onClick={handleCancel}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Zurück
            </Button>
          </div>
        </div>

        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Bewerbung bearbeiten</h1>
        </div>

        <div className="text-gray-600">
          <p>Bearbeiten Sie die Details Ihrer Bewerbung für "{application.title}"</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
      <ApplicationForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={saving}
        submitLabel="Bewerbung aktualisieren"
      />
    </div>
  );
};
