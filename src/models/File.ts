// src/models/File.ts

export type FileType = 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | 'other';

export interface FileModelProps {
  id?: number;
  application_id?: number;
  filename: string;
  original_name?: string;
  file_path?: string;
  size: number;
  mime_type: string;
  type: FileType;
  description?: string;
  data?: Uint8Array | Buffer;
  upload_date: string;
  created_at?: string;
  updated_at?: string;
}

export class FileModel {
  id?: number;
  application_id?: number;
  filename: string;
  original_name?: string;
  file_path?: string;
  size: number;
  mime_type: string;
  type: FileType;
  description?: string;
  data?: Uint8Array | Buffer;
  upload_date: string;
  created_at?: string;
  updated_at?: string;

  constructor(props: FileModelProps) {
    this.id = props.id;
    this.application_id = props.application_id;
    this.filename = props.filename;
    this.original_name = props.original_name;
    this.file_path = props.file_path;
    this.size = props.size;
    this.mime_type = props.mime_type;
    this.type = props.type;
    this.description = props.description;
    this.data = props.data;
    this.upload_date = props.upload_date;
    this.created_at = props.created_at;
    this.updated_at = props.updated_at;
  }

  static fromJSON(json: any): FileModel {
    return new FileModel({
      id: json.id,
      application_id: json.application_id,
      filename: json.filename,
      original_name: json.original_name,
      file_path: json.file_path,
      size: json.size,
      mime_type: json.mime_type,
      type: json.type,
      description: json.description,
      data: json.data,
      upload_date: json.upload_date,
      created_at: json.created_at,
      updated_at: json.updated_at,
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
