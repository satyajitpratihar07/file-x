export type OutputFormat = 'pdf' | 'jpg' | 'png' | 'webp' | 'docx' | 'txt';

export type JobStatus =
  | 'queued'
  | 'uploading'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export type FileCategory =
  | 'IMAGE'
  | 'PDF'
  | 'OFFICE_DOCUMENT'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'TEXT'
  | 'CODE'
  | 'ARCHIVE'
  | 'EBOOK'
  | 'OTHER'
  | 'UNSUPPORTED';

export interface FileMetadata {
  id: string;
  originalName: string;          // sanitized display name
  storageName: string;           // random name on disk
  storagePath: string;           // absolute path (never exposed to client)
  mimeType: string;
  detectedMimeType: string;
  category: FileCategory;
  extension: string;
  sizeBytes: number;
}

export interface ConversionFile {
  fileId: string;
  metadata: FileMetadata;
  outputFormat: OutputFormat;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  outputPath?: string;           // absolute path (never exposed to client)
  outputName?: string;           // display name for download
  outputSizeBytes?: number;
  pageCount?: number;
  conversionTimeMs?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ConversionJob {
  jobId: string;
  status: JobStatus;
  files: ConversionFile[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  clientIp?: string;
}

export interface ConversionResult {
  success: boolean;
  outputPath: string;
  outputName: string;
  sizeBytes: number;
  pageCount?: number;
  conversionTimeMs: number;
  errorMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export interface SupportedFormat {
  extension: string;
  mimeType: string;
  label: string;
  category: FormatCategory;
  outputFormats: OutputFormat[];
  notes?: string;
}

export type FormatCategory =
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'images'
  | 'text_code'
  | 'pdf_tools'
  | 'web'
  | 'ebooks'
  | 'archives'
  | 'data'
  | 'vector'
  | 'fonts'
  | 'utilities';

export interface FileAnalyzerResult {
  filename: string;
  detectedMimeType: string;
  detectedExtension: string;
  category: FileCategory;
  sizeBytes: number;
  magicBytesHex: string;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  availableOutputFormats: OutputFormat[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  files: Array<{
    fileId: string;
    originalName: string;
    status: JobStatus;
    progress: number;
    outputFormat: OutputFormat;
    errorMessage?: string;
    outputName?: string;
    outputSizeBytes?: number;
    pageCount?: number;
    conversionTimeMs?: number;
    detectedMimeType: string;
    sizeBytes: number;
    extension: string;
  }>;
  createdAt: number;
  expiresAt: number;
}
