import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { jobManager } from '../../jobs/jobManager';
import { createJobZip } from '../../services/zipService';
import { isPathSafe, getJobOutputDir } from '../../storage/LocalStorage';
import { encodeContentDispositionFilename } from '../../security/sanitize';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/download/:jobId/zip
 * Download all converted files as a ZIP archive.
 * MUST be declared BEFORE /:jobId/:fileId to avoid route collision with fileId='zip'.
 */
router.get('/:jobId/zip', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const requestId = (req as any).requestId;

  const job = jobManager.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found or expired', requestId });
    return;
  }

  const completedFiles = job.files.filter((f) => f.status === 'completed' && f.outputPath);
  if (completedFiles.length === 0) {
    res.status(409).json({ success: false, error: 'No converted files are ready for download yet', requestId });
    return;
  }

  try {
    const zipPath = await createJobZip(job);
    const absoluteZipPath = path.resolve(zipPath);
    const zipFilename = `convertx_${jobId.slice(-8)}.zip`;

    res.download(absoluteZipPath, zipFilename, (err) => {
      if (err && !res.headersSent) {
        logger.error(`ZIP download error for job ${jobId}: ${err}`);
      }
      // Give Windows stream handle a few seconds to fully close before deleting temp zip
      setTimeout(async () => {
        try {
          await fs.unlink(absoluteZipPath);
        } catch {
          // Ignore cleanup errors
        }
      }, 5000);
    });
  } catch (err) {
    logger.error(`ZIP creation failed for job ${jobId}: ${err}`);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create ZIP archive',
      requestId,
    });
  }
});

/**
 * GET /api/download/:jobId/:fileId
 * Download a single converted file.
 */
router.get('/:jobId/:fileId', async (req: Request, res: Response, next) => {
  const { jobId, fileId } = req.params;
  const requestId = (req as any).requestId;

  // Safeguard in case 'zip' somehow reaches this handler
  if (fileId === 'zip') {
    return next();
  }

  const job = jobManager.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found or expired', requestId });
    return;
  }

  const file = job.files.find((f) => f.fileId === fileId);
  if (!file) {
    res.status(404).json({ success: false, error: 'File not found', requestId });
    return;
  }

  if (file.status !== 'completed' || !file.outputPath) {
    res.status(409).json({ success: false, error: 'File conversion is not complete', requestId });
    return;
  }

  const outputDir = getJobOutputDir(jobId);
  const absolutePath = path.resolve(file.outputPath);

  // Security: verify path is within allowed directory
  if (!isPathSafe(absolutePath, outputDir)) {
    logger.error(`Path traversal attempt detected for job ${jobId}, file ${fileId}`);
    res.status(403).json({ success: false, error: 'Access denied', requestId });
    return;
  }

  // Verify file exists
  try {
    await fs.access(absolutePath);
  } catch {
    res.status(404).json({ success: false, error: 'Output file not found. It may have expired.', requestId });
    return;
  }

  const displayName = file.outputName || `download.${file.outputFormat}`;

  res.download(absolutePath, displayName, (err) => {
    if (err && !res.headersSent) {
      logger.error(`Download error for ${fileId}: ${err}`);
      res.status(500).json({ success: false, error: 'Download failed', requestId });
    }
  });
});

function getContentType(format: string): string {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'jpg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'zip': return 'application/zip';
    default: return 'application/octet-stream';
  }
}

export default router;
