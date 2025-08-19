// src/models/File.ts

export type FileType = 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | 'other';

export interface FileModelProps {
  id?: number;
  application_id?: number;
  filename: string;
  mime_type: string;
  type: FileType;
  size: number;
  upload_date: string;
  path?: string;
  description?: string;
}

export class FileModel {
  id?: number;
  application_id?: number;
  filename: string;
  mime_type: string;
  type: FileType;
  size: number;
  upload_date: string;
  path?: string;
  description?: string;

  constructor(props: FileModelProps) {
    this.id = props.id;
    this.application_id = props.application_id;
    this.filename = props.filename;
    this.mime_type = props.mime_type;
    this.type = props.type;
    this.size = props.size;
    this.upload_date = props.upload_date;
    this.path = props.path;
    this.description = props.description;
  }

  static fromJSON(json: any): FileModel {
    return new FileModel({
      id: json.id,
      application_id: json.application_id,
      filename: json.filename,
      mime_type: json.mime_type,
      type: json.type,
      size: json.size,
      upload_date: json.upload_date,
      path: json.path,
      description: json.description,
    });
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.filename || this.filename.trim().length === 0) {
      errors.push('Dateiname ist erforderlich.');
    }
    if (!this.type) {
      errors.push('Dateityp ist erforderlich.');
    }
    if (!this.size || this.size <= 0) {
      errors.push('Dateigröße muss größer als 0 sein.');
    }
    if (!this.upload_date) {
      errors.push('Upload-Datum ist erforderlich.');
    }
    return { isValid: errors.length === 0, errors };
  }

  getFileExtension(): string {
    return this.filename.split('.').pop() || '';
  }

  getFormattedSize(): string {
    if (this.size < 1024) return `${this.size} Bytes`;
    if (this.size < 1024 * 1024) return `${(this.size / 1024).toFixed(1)} KB`;
    return `${(this.size / (1024 * 1024)).toFixed(2)} MB`;
  }

  getTypeLabel(): string {
    switch (this.type) {
      case 'pdf': return 'PDF-Dokument';
      case 'doc':
      case 'docx': return 'Word-Dokument';
      case 'txt': return 'Textdatei';
      case 'jpg':
      case 'png': return 'Bilddatei';
      default: return 'Andere Datei';
    }
  }
}
