import React from 'react';
import { ContactModel } from '../../../models/Contact';

interface ContactCardProps {
  contact: ContactModel;
  applicationCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  isDeleting?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  applicationCount = 0,
  onEdit,
  onDelete,
  onSelect,
  isSelected = false,
  showActions = true,
  compact = false,
  className = '',
  isDeleting = false
}) => {
  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.email) {
      window.open(`mailto:${contact.email}`, '_blank');
    }
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.phone) {
      window.open(`tel:${contact.phone}`, '_blank');
    }
  };

  const handleLinkedInClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.linkedin_url) {
      window.open(contact.linkedin_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getInitials = (): string => {
    const firstName = contact.first_name || '';
    const lastName = contact.last_name || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '?';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE');
    } catch {
      return 'Unbekannt';
    }
  };

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : ''} ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-green-600">
                {getInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {contact.getFullName()}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {contact.position && <span>{contact.position}</span>}
                {contact.email && (
                  <>
                    {contact.position && <span>•</span>}
                    <span>📧</span>
                  </>
                )}
                {contact.phone && <span>📞</span>}
                {contact.linkedin_url && <span>�</span>}
              </div>
            </div>
          </div>
          {showActions && (onEdit || onDelete) && (
            <div className="flex space-x-1 ml-2">
              {onEdit && (
                <button
                  onClick={handleEditClick}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Bearbeiten"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isDeleting ? "Wird gelöscht…" : "Löschen"}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : ''} ${className}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-green-600">
              {getInitials()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {contact.getFullName()}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {contact.position && (
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-200">
                  {contact.position}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Kontakt bearbeiten"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={`p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isDeleting ? "Wird gelöscht…" : "Kontakt löschen"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact Details */}
      <div className="space-y-3 mb-4">
        {contact.email && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <button
              onClick={handleEmailClick}
              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
            >
              {contact.email}
            </button>
          </div>
        )}
        
        {contact.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <button
              onClick={handlePhoneClick}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {contact.getFormattedPhone()}
            </button>
          </div>
        )}

        {contact.linkedin_url && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM5 18a2 2 0 002-2v-2a2 2 0 00-2-2H3a2 2 0 00-2 2v2a2 2 0 002 2h2z" />
            </svg>
            <button
              onClick={handleLinkedInClick}
              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
            >
              LinkedIn Profil
            </button>
          </div>
        )}

        {contact.notes && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {contact.notes}
          </p>
        )}
      </div>

      {/* Contact Information Footer */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Erstellt: {formatDate(contact.created_at)}</span>
            </div>
            
            {contact.updated_at !== contact.created_at && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Aktualisiert: {formatDate(contact.updated_at)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>
                {applicationCount} Bewerbung{applicationCount !== 1 ? 'en' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;
