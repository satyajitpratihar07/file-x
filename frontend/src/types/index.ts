export type OutputFormat = 'pdf' | 'jpg' | 'png' | 'webp' | 'docx' | 'txt';

export type FileStatus =
  | 'idle'
  | 'queued'
  | 'uploading'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface ConversionFileState {
  fileId: string;
  originalName: string;
  status: FileStatus;
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
  // Local-only fields
  localFile?: File;
  previewUrl?: string;
}

export interface JobState {
  jobId: string;
  status: FileStatus;
  files: ConversionFileState[];
  createdAt: number;
  expiresAt: number;
}

export interface SupportedFormat {
  extension: string;
  mimeType: string;
  label: string;
  category: string;
  outputFormats: OutputFormat[];
  notes?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

export interface UploadResponse {
  jobId: string;
  status: FileStatus;
  files: ConversionFileState[];
  createdAt: number;
  expiresAt: number;
  validationErrors?: Array<{ name: string; error: string }>;
}

export interface FileAnalyzerResult {
  filename: string;
  detectedMimeType: string;
  detectedExtension: string;
  category: string;
  sizeBytes: number;
  magicBytesHex: string;
  dimensions?: { width: number; height: number };
  pageCount?: number;
  availableOutputFormats: OutputFormat[];
}
