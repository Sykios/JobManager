import React, { useState } from 'react';
import { ApplicationStatus } from '../../../types';
import { 
  getValidNextStatuses, 
  getStatusConfig, 
  isValidStatusTransition,
  isFinalStatus 
} from '../../../utils/statusUtils';
import { StatusBadge } from '../ui/StatusIndicators';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface StatusChangerProps {
  currentStatus: ApplicationStatus;
  onStatusChange: (newStatus: ApplicationStatus, note?: string) => Promise<void>;
  disabled?: boolean;
  showCurrentBadge?: boolean;
  compact?: boolean;
  className?: string;
}

export const StatusChanger: React.FC<StatusChangerProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  showCurrentBadge = true,
  compact = false,
  className = ''
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('');
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validNextStatuses = getValidNextStatuses(currentStatus);
  const currentConfig = getStatusConfig(currentStatus);
  const canChange = !isFinalStatus(currentStatus) && validNextStatuses.length > 0;

  // Create options for the Select component
  const statusOptions = validNextStatuses.map(status => {
    const config = getStatusConfig(status);
    return {
      value: status,
      label: `${config.icon} ${config.label} - ${config.description}`
    };
  });

  const handleStatusSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value;
    if (status === '') {
      setSelectedStatus('');
      setShowNoteInput(false);
      return;
    }

    const newStatus = status as ApplicationStatus;
    if (isValidStatusTransition(currentStatus, newStatus)) {
      setSelectedStatus(newStatus);
      setError(null);
      
      // For certain transitions, encourage adding a note
      if (newStatus === 'rejected' || newStatus === 'withdrawn' || newStatus === 'offer') {
        setShowNoteInput(true);
      }
    } else {
      setError(`Ungültiger Statuswechsel von ${currentConfig.label} zu ${getStatusConfig(newStatus).label}`);
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedStatus) return;

    setIsChanging(true);
    setError(null);

    try {
      await onStatusChange(selectedStatus, note.trim() || undefined);
      setSelectedStatus('');
      setNote('');
      setShowNoteInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Statuswechsel');
    } finally {
      setIsChanging(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus('');
    setNote('');
    setShowNoteInput(false);
    setError(null);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showCurrentBadge && <StatusBadge status={currentStatus} size="sm" />}
        
        {canChange && !disabled && (
          <Select
            value={selectedStatus}
            onChange={handleStatusSelect}
            options={statusOptions}
            placeholder="Status ändern..."
            disabled={isChanging}
          />
        )}

        {selectedStatus && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleConfirmChange}
              disabled={isChanging}
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isChanging}
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status Display */}
      {showCurrentBadge && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Aktueller Status:</span>
          <StatusBadge status={currentStatus} />
          {isFinalStatus(currentStatus) && (
            <span className="text-xs text-gray-500 italic">(Endstatus)</span>
          )}
        </div>
      )}

      {/* Status Change Section */}
      {canChange && !disabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status ändern zu:
            </label>
            <Select
              value={selectedStatus}
              onChange={handleStatusSelect}
              options={statusOptions}
              placeholder="Neuen Status wählen..."
              disabled={isChanging}
            />
          </div>

          {/* Note Input */}
          {showNoteInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notiz zum Statuswechsel (optional):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Zusätzliche Informationen..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isChanging}
              />
            </div>
          )}

          {/* Action Buttons */}
          {selectedStatus && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                onClick={handleConfirmChange}
                disabled={isChanging}
              >
                {isChanging ? 'Wird gespeichert...' : 'Status ändern'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isChanging}
              >
                Abbrechen
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No valid transitions */}
      {!canChange && !disabled && (
        <p className="text-sm text-gray-500 italic">
          Keine weiteren Statuswechsel möglich.
        </p>
      )}

      {/* Disabled state */}
      {disabled && (
        <p className="text-sm text-gray-400 italic">
          Statuswechsel nicht verfügbar.
        </p>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};
