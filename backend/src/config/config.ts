import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // File limits
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '300', 10),
  maxFilesPerBatch: parseInt(process.env.MAX_FILES_PER_BATCH || '50', 10),

  // Storage
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'),
  outputsDir: process.env.OUTPUTS_DIR || path.join(__dirname, '../../outputs'),

  // Cleanup
  jobExpiryMinutes: parseInt(process.env.JOB_EXPIRY_MINUTES || '60', 10),
  cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '15', 10),

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),

  // LibreOffice
  libreOfficePath: process.env.LIBRE_OFFICE_PATH || 'libreoffice',
  libreOfficeEnabled: process.env.LIBRE_OFFICE_ENABLED !== 'false',

  // Playwright / Chromium (for HTML→PDF)
  playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === 'true',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Image output defaults
  imageQuality: parseInt(process.env.IMAGE_QUALITY || '90', 10),
  imageDpi: parseInt(process.env.IMAGE_DPI || '150', 10),
};

export type Config = typeof config;
