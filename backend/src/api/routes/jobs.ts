import { Router, Request, Response } from 'express';
import { jobManager } from '../../jobs/jobManager';
import { deleteJobFiles } from '../../storage/LocalStorage';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/jobs/:jobId
 * Get current status of a job (polling fallback).
 */
router.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const requestId = (req as any).requestId;

  const job = jobManager.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found or expired', requestId });
    return;
  }

  res.json({
    success: true,
    data: jobManager.serializeJob(job),
    requestId,
  });
});

/**
 * GET /api/jobs/:jobId/events
 * Server-Sent Events stream for real-time job progress.
 */
router.get('/:jobId/events', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = jobManager.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found or expired' });
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial state immediately
  const sendEvent = (event: string, data: unknown) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  };

  sendEvent('connected', { jobId });
  sendEvent('job_update', jobManager.serializeJob(job));

  // Register for updates
  const unregister = jobManager.registerSseClient(jobId, sendEvent);

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 30_000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    unregister();
    logger.debug(`SSE client disconnected for job ${jobId}`);
  });
});

/**
 * DELETE /api/jobs/:jobId
 * Delete a job and all its temporary files.
 */
router.delete('/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const requestId = (req as any).requestId;

  const job = jobManager.getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found', requestId });
    return;
  }

  try {
    await deleteJobFiles(jobId);
    jobManager.removeJob(jobId);
    res.json({ success: true, data: { message: 'Job deleted successfully' }, requestId });
  } catch (err) {
    logger.error(`Failed to delete job ${jobId}: ${err}`);
    res.status(500).json({ success: false, error: 'Failed to delete job', requestId });
  }
});

export default router;
