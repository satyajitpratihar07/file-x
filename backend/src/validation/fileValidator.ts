import fs from 'fs/promises';
import path from 'path';
import { ValidationResult, OutputFormat, FileCategory } from '../types';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface FileDetails {
  detectedMimeType: string;
  detectedExtension: string;
  category: FileCategory;
  originalFilename: string;
  fileSize: number;
}

// Dynamic import wrapper for ESM-only file-type package
async function detectFromBuffer(buffer: Buffer): Promise<{ mime: string; ext: string } | undefined> {
  try {
    const { fileTypeFromBuffer } = await import('file-type');
    return fileTypeFromBuffer(buffer);
  } catch {
    return undefined;
  }
}

/**
 * Synchronous, 100% deterministic native magic bytes inspection.
 * Checked FIRST before anything else.
 */
export function detectMagicBytes(buffer: Buffer): { mime: string; ext: string; category: FileCategory } | undefined {
  if (!buffer || buffer.length < 4) return undefined;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png', category: 'IMAGE' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg', category: 'IMAGE' };
  }

  // GIF: 47 49 46 38 ('GIF87a' or 'GIF89a')
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { mime: 'image/gif', ext: 'gif', category: 'IMAGE' };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp', category: 'IMAGE' };
  }

  // BMP: 42 4D ('BM')
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return { mime: 'image/bmp', ext: 'bmp', category: 'IMAGE' };
  }

  // TIFF: II*. (49 49 2A 00) or MM.* (4D 4D 00 2A)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return { mime: 'image/tiff', ext: 'tiff', category: 'IMAGE' };
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mime: 'application/pdf', ext: 'pdf', category: 'PDF' };
  }

  // HEIC / HEIF: ....ftypheic, ftypmif1, ftypmsf1, ftyphevc
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.slice(8, 12).toString('ascii').toLowerCase();
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand)) {
      return { mime: 'image/heic', ext: 'heic', category: 'IMAGE' };
    }
  }

  // ZIP / EPUB: PK.. (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const sample = buffer.slice(0, 120).toString('ascii');
    if (sample.includes('mimetype') && sample.includes('epub')) {
      return { mime: 'application/epub+zip', ext: 'epub', category: 'EBOOK' };
    }
    return { mime: 'application/zip', ext: 'zip', category: 'ARCHIVE' };
  }

  return undefined;
}

// Helper to check if a buffer contains text/printable characters (no null bytes)
function isTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  const sampleSize = Math.min(buffer.length, 4096);
  let nullCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) nullCount++;
  }
  return nullCount === 0;
}

export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg', 'ico', 'heic', 'heif',
]);

export const CODE_EXTENSIONS = new Set([
  'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r',
  'sh', 'bash', 'zsh', 'ps1', 'sql', 'html', 'htm', 'css', 'scss',
  'json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'dockerfile', 'makefile', 'gradle', 'properties', 'devtools',
]);

export const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'log',
]);

export const OFFICE_EXTENSIONS = new Set([
  'doc', 'docx', 'odt', 'rtf',
  'xls', 'xlsx', 'ods',
  'ppt', 'pptx', 'odp',
]);

// Allowed MIME types whitelist
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text', 'application/rtf', 'text/rtf',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
  'application/epub+zip', 'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/x-markdown', 'text/xml',
  'application/json', 'application/xml', 'application/x-yaml', 'text/x-yaml',
  'application/javascript', 'text/javascript', 'application/x-sh', 'text/x-python',
  'text/x-java-source', 'text/x-csrc', 'text/x-c++src', 'text/x-sql', 'text/x-typescript',
]);

/**
 * Detect full file details (MIME, extension, category) from actual file bytes.
 * BINARY MAGIC BYTES TAKE ABSOLUTE PRIORITY OVER FILENAME EXTENSIONS.
 */
export async function detectFileDetails(filePath: string, originalFilename: string): Promise<FileDetails> {
  const ext = path.extname(originalFilename).toLowerCase().replace('.', '');
  let fileSize = 0;
  let buffer: Buffer = Buffer.alloc(0);

  try {
    const handle = await fs.open(filePath, 'r');
    const stat = await handle.stat();
    fileSize = stat.size;
    const readLen = Math.min(fileSize, 8192);
    buffer = Buffer.alloc(readLen);
    await handle.read(buffer, 0, readLen, 0);
    await handle.close();
  } catch (err) {
    logger.warn(`Could not read file for detection ${filePath}: ${err}`);
  }

  // 1. Native Magic Bytes Check (Determines true format regardless of extension)
  const magic = detectMagicBytes(buffer);
  if (magic) {
    if (magic.category === 'IMAGE') {
      return {
        detectedMimeType: magic.mime,
        detectedExtension: magic.ext,
        category: 'IMAGE',
        originalFilename,
        fileSize,
      };
    }
    if (magic.category === 'PDF') {
      return {
        detectedMimeType: 'application/pdf',
        detectedExtension: 'pdf',
        category: 'PDF',
        originalFilename,
        fileSize,
      };
    }
    if (magic.category === 'EBOOK' || ext === 'epub') {
      return {
        detectedMimeType: 'application/epub+zip',
        detectedExtension: 'epub',
        category: 'EBOOK',
        originalFilename,
        fileSize,
      };
    }
    if (magic.category === 'ARCHIVE') {
      if (ext === 'epub') {
        return {
          detectedMimeType: 'application/epub+zip',
          detectedExtension: 'epub',
          category: 'EBOOK',
          originalFilename,
          fileSize,
        };
      }
      if (OFFICE_EXTENSIONS.has(ext)) {
        if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
          return {
            detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            detectedExtension: ext,
            category: 'OFFICE_DOCUMENT',
            originalFilename,
            fileSize,
          };
        }
        if (['xls', 'xlsx', 'ods'].includes(ext)) {
          return {
            detectedMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            detectedExtension: ext,
            category: 'SPREADSHEET',
            originalFilename,
            fileSize,
          };
        }
        if (['ppt', 'pptx', 'odp'].includes(ext)) {
          return {
            detectedMimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            detectedExtension: ext,
            category: 'PRESENTATION',
            originalFilename,
            fileSize,
          };
        }
      }
      return {
        detectedMimeType: 'application/zip',
        detectedExtension: 'zip',
        category: 'ARCHIVE',
        originalFilename,
        fileSize,
      };
    }
  }

  // 2. Library file-type check
  const ftDetected = await detectFromBuffer(buffer);
  if (ftDetected) {
    if (ftDetected.mime.startsWith('image/')) {
      return {
        detectedMimeType: ftDetected.mime,
        detectedExtension: ftDetected.ext,
        category: 'IMAGE',
        originalFilename,
        fileSize,
      };
    }
    if (ftDetected.mime === 'application/pdf') {
      return {
        detectedMimeType: 'application/pdf',
        detectedExtension: 'pdf',
        category: 'PDF',
        originalFilename,
        fileSize,
      };
    }
  }

  // 3. SVG Image Check
  if (ext === 'svg' || (isTextBuffer(buffer) && buffer.toString('utf-8').includes('<svg'))) {
    return {
      detectedMimeType: 'image/svg+xml',
      detectedExtension: 'svg',
      category: 'IMAGE',
      originalFilename,
      fileSize,
    };
  }

  // 4. Text / Code / Spreadsheet Check
  if (isTextBuffer(buffer)) {
    if (ext === 'csv') {
      return {
        detectedMimeType: 'text/csv',
        detectedExtension: 'csv',
        category: 'SPREADSHEET',
        originalFilename,
        fileSize,
      };
    }
    if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'xml') {
      return {
        detectedMimeType: ext === 'json' ? 'application/json' : 'text/plain',
        detectedExtension: ext,
        category: 'CODE',
        originalFilename,
        fileSize,
      };
    }
    if (CODE_EXTENSIONS.has(ext)) {
      return {
        detectedMimeType: 'text/plain',
        detectedExtension: ext,
        category: 'CODE',
        originalFilename,
        fileSize,
      };
    }
    return {
      detectedMimeType: 'text/plain',
      detectedExtension: ext || 'txt',
      category: 'TEXT',
      originalFilename,
      fileSize,
    };
  }

  // 5. Unrecognized Binary
  return {
    detectedMimeType: 'application/octet-stream',
    detectedExtension: ext || 'bin',
    category: 'UNSUPPORTED',
    originalFilename,
    fileSize,
  };
}

/**
 * Validate uploaded file: size, MIME type, extension, category.
 */
export async function validateFile(
  filePath: string,
  originalName: string,
  reportedMimeType: string,
  sizeBytes: number
): Promise<ValidationResult & { details: FileDetails }> {
  const maxBytes = config.maxFileSizeMB * 1024 * 1024;

  if (sizeBytes === 0) {
    const details: FileDetails = {
      detectedMimeType: '',
      detectedExtension: '',
      category: 'UNSUPPORTED',
      originalFilename: originalName,
      fileSize: 0,
    };
    return { valid: false, errorMessage: 'File is empty (0 bytes)', details };
  }

  if (sizeBytes > maxBytes) {
    const details: FileDetails = {
      detectedMimeType: '',
      detectedExtension: '',
      category: 'UNSUPPORTED',
      originalFilename: originalName,
      fileSize: sizeBytes,
    };
    return {
      valid: false,
      errorMessage: `File exceeds maximum allowed size of ${config.maxFileSizeMB}MB`,
      details,
    };
  }

  const details = await detectFileDetails(filePath, originalName);

  if (details.category === 'UNSUPPORTED') {
    return {
      valid: false,
      errorMessage: `Unsupported or corrupted binary file format. Could not classify file contents.`,
      details,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(details.detectedMimeType) && details.category !== 'IMAGE' && details.category !== 'TEXT' && details.category !== 'CODE' && details.category !== 'EBOOK' && details.category !== 'ARCHIVE') {
    return {
      valid: false,
      errorMessage: `Unsupported file type: ${details.detectedMimeType}. Please upload a supported document, image, ebook, or text file.`,
      details,
    };
  }

  return { valid: true, details };
}

/**
 * Check if output format is valid.
 */
export function validateOutputFormat(format: string): format is OutputFormat {
  return ['pdf', 'jpg', 'png', 'webp', 'docx', 'txt'].includes(format);
}
