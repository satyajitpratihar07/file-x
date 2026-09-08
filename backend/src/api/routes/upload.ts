import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/config';
import { jobManager } from '../../jobs/jobManager';
import { processJob } from '../../jobs/worker';
import { validateFile, validateOutputFormat } from '../../validation/fileValidator';
import { sanitizeDisplayName, buildOutputDisplayName } from '../../security/sanitize';
import { createJobDir, getJobUploadDir } from '../../storage/LocalStorage';
import { generateJobId, generateStorageFileName } from '../../utils/idGenerator';
import { logger } from '../../utils/logger';
import { ConversionFile, OutputFormat } from '../../types';

const router = Router();

// Configure multer with disk storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const jobId = (req as any).jobId || generateJobId();
    (req as any).jobId = jobId;
    try {
      const { uploadDir } = await createJobDir(jobId);
      cb(null, uploadDir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const storageName = generateStorageFileName(ext);
    cb(null, storageName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
    files: config.maxFilesPerBatch,
  },
  fileFilter: (req, file, cb) => {
    // Basic extension check (full validation happens after upload)
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ext.length === 0) {
      return cb(null, true); // Allow, will fail in validator
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload
 * Upload files and create a conversion job.
 * Body: multipart/form-data with files[] and outputFormat
 */
router.post('/', upload.array('files', config.maxFilesPerBatch), async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'unknown';

  try {
    const uploadedFiles = req.files as Express.Multer.File[];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded', requestId });
      return;
    }

    const outputFormat = (req.body.outputFormat as string) || 'pdf';
    if (!validateOutputFormat(outputFormat)) {
      res.status(400).json({ success: false, error: 'Invalid output format. Choose pdf, jpg, or png.', requestId });
      return;
    }

    const jobId = (req as any).jobId || generateJobId();
    const uploadDir = getJobUploadDir(jobId);

    // Validate each file
    const conversionFiles: ConversionFile[] = [];
    const validationErrors: Array<{ name: string; error: string }> = [];

    for (const multerFile of uploadedFiles) {
      const originalName = sanitizeDisplayName(multerFile.originalname);
      const ext = path.extname(originalName).toLowerCase().replace('.', '');

      const validation = await validateFile(
        multerFile.path,
        originalName,
        multerFile.mimetype,
        multerFile.size
      );

      if (!validation.valid) {
        validationErrors.push({ name: originalName, error: validation.errorMessage || 'Validation failed' });
        // Clean up invalid file
        await fs.unlink(multerFile.path).catch(() => {});
        continue;
      }

      const fileId = uuidv4();
      conversionFiles.push({
        fileId,
        metadata: {
          id: fileId,
          originalName,
          storageName: path.basename(multerFile.path),
          storagePath: multerFile.path,
          mimeType: multerFile.mimetype,
          detectedMimeType: validation.details.detectedMimeType,
          category: validation.details.category,
          extension: ext,
          sizeBytes: multerFile.size,
        },
        outputFormat: outputFormat as OutputFormat,
        status: 'queued',
        progress: 0,
      });
    }

    if (conversionFiles.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid files to convert',
        details: validationErrors,
        requestId,
      });
      return;
    }

    // Create job
    const job = jobManager.createJob(jobId, conversionFiles, req.ip);

    // Start async processing (do NOT await — return immediately)
    setImmediate(() => {
      processJob(jobId).catch((err) => {
        logger.error(`processJob error for ${jobId}: ${err}`);
      });
    });

    logger.info(`Job ${jobId} created with ${conversionFiles.length} file(s)`, { requestId });

    const { jobId: _jid, ...jobData } = jobManager.serializeJob(job);
    res.status(202).json({
      success: true,
      data: {
        jobId,
        ...jobData,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      },
      requestId,
    });
  } catch (err) {
    logger.error(`Upload error: ${err}`, { requestId });
    res.status(500).json({
      success: false,
      error: 'Upload failed. Please try again.',
      requestId,
    });
  }
});

export default router;
