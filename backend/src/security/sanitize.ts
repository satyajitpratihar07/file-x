import sanitizeFilename from 'sanitize-filename';
import path from 'path';

/**
 * Sanitize a filename for safe display in the UI.
 * - Strips path components
 * - Removes dangerous characters
 * - Limits length
 */
export function sanitizeDisplayName(raw: string): string {
  // Strip any directory components
  const basename = path.basename(raw);
  // Use sanitize-filename library
  const sanitized = sanitizeFilename(basename, { replacement: '_' });
  // Limit length while preserving extension
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const truncatedName = name.slice(0, 100);
  return `${truncatedName}${ext}` || 'file';
}

/**
 * Build an output filename for a converted file, safe for Content-Disposition.
 */
export function buildOutputDisplayName(originalName: string, outputExt: string): string {
  const sanitized = sanitizeDisplayName(originalName);
  const inputExt = path.extname(sanitized);
  const baseName = path.basename(sanitized, inputExt);
  const ext = outputExt.startsWith('.') ? outputExt : `.${outputExt}`;
  return `${baseName}${ext}`;
}

/**
 * Validate that a resolved path stays within an allowed base directory.
 * Prevents path traversal attacks.
 */
export function isPathWithinDir(filePath: string, baseDir: string): boolean {
  const resolved = path.resolve(filePath).toLowerCase();
  const base = path.resolve(baseDir).toLowerCase();
  return resolved.startsWith(base + path.sep) || resolved === base;
}

/**
 * Escape a filename for use in a Content-Disposition header.
 */
export function encodeContentDispositionFilename(filename: string): string {
  const safe = filename.replace(/[^\w\s.\-_()[\]]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `filename="${safe}"; filename*=UTF-8''${encoded}`;
}
