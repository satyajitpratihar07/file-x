import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ApiResponse } from '../../types';
import { config } from '../../config/config';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as any).requestId || 'unknown';

  // Log full error server-side (never expose to client)
  logger.error(`Unhandled error: ${err.message}`, {
    requestId,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: `File too large. Maximum file size is ${config.maxFileSizeMB}MB.`,
      requestId,
    });
    return;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(413).json({
      success: false,
      error: `Too many files. Maximum ${config.maxFilesPerBatch} files per batch.`,
      requestId,
    });
    return;
  }

  const status = err.status || 500;
  const message =
    status < 500
      ? err.message
      : 'An internal server error occurred. Please try again.';

  res.status(status).json({
    success: false,
    error: message,
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { generateRequestId } = require('../../utils/idGenerator');
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
