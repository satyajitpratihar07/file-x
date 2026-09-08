import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/** Generate a cryptographically random job ID */
export function generateJobId(): string {
  return `job_${uuidv4().replace(/-/g, '')}`;
}

/** Generate a random file storage name (not the original name) */
export function generateStorageFileName(extension: string): string {
  const random = crypto.randomBytes(16).toString('hex');
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${random}${ext}`;
}

/** Generate a short correlation ID for request logging */
export function generateRequestId(): string {
  return crypto.randomBytes(4).toString('hex');
}
