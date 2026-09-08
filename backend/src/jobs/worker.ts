import { jobManager } from './jobManager';
import { findConverter } from '../converters/registry';
import { ConversionFile } from '../types';
import { logger } from '../utils/logger';
import { getJobOutputDir } from '../storage/LocalStorage';
import fs from 'fs/promises';

/**
 * Process a single file conversion within a job.
 * Called asynchronously — does not block the HTTP response.
 */
async function processFile(jobId: string, file: ConversionFile): Promise<void> {
  const fileLogger = logger.child({ jobId, fileId: file.fileId });

  try {
    // Mark as processing
    jobManager.updateFile(jobId, file.fileId, {
      status: 'processing',
      progress: 10,
      startedAt: Date.now(),
    });

    // Find converter
    const converter = findConverter(file);
    if (!converter) {
      jobManager.updateFile(jobId, file.fileId, {
        status: 'failed',
        progress: 0,
        errorMessage: `Unsupported conversion: .${file.metadata.extension} → ${file.outputFormat.toUpperCase()}`,
      });
      return;
    }

    fileLogger.info(`Converting with ${converter.name}`);
    jobManager.updateFile(jobId, file.fileId, { progress: 20 });

    // Validate
    const validation = await converter.validate(file);
    if (!validation.valid) {
      jobManager.updateFile(jobId, file.fileId, {
        status: 'failed',
        progress: 0,
        errorMessage: validation.errorMessage || 'Validation failed',
      });
      return;
    }

    jobManager.updateFile(jobId, file.fileId, { progress: 40 });

    // Get output directory
    const outputDir = getJobOutputDir(jobId);

    // Perform conversion
    const result = await converter.convert(file, outputDir);

    if (!result.success) {
      jobManager.updateFile(jobId, file.fileId, {
        status: 'failed',
        progress: 0,
        errorMessage: result.errorMessage || 'Conversion failed',
      });
      return;
    }

    // Verify output file exists, is non-empty, and valid
    try {
      const stat = await fs.stat(result.outputPath);
      if (stat.size === 0) {
        throw new Error('Output file is empty (0 bytes)');
      }

      if (file.outputFormat === 'pdf') {
        const handle = await fs.open(result.outputPath, 'r');
        const header = Buffer.alloc(5);
        await handle.read(header, 0, 5, 0);
        await handle.close();
        if (header.toString('ascii') !== '%PDF-') {
          throw new Error('Generated PDF is invalid or corrupt');
        }
      } else if (file.outputFormat === 'jpg' || file.outputFormat === 'png' || file.outputFormat === 'webp') {
        const sharpModule = require('sharp');
        const imgMeta = await sharpModule(result.outputPath).metadata();
        if (!imgMeta.width || !imgMeta.height || imgMeta.width === 0 || imgMeta.height === 0) {
          throw new Error('Generated image is invalid or has 0 dimensions');
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Output validation failed';
      fileLogger.error(`Output validation failed for ${file.fileId}: ${errMsg}`);
      jobManager.updateFile(jobId, file.fileId, {
        status: 'failed',
        progress: 0,
        errorMessage: `Output validation failed: ${errMsg}`,
      });
      return;
    }

    // Success
    jobManager.updateFile(jobId, file.fileId, {
      status: 'completed',
      progress: 100,
      outputPath: result.outputPath,
      outputName: result.outputName,
      outputSizeBytes: result.sizeBytes,
      pageCount: result.pageCount,
      conversionTimeMs: result.conversionTimeMs,
      completedAt: Date.now(),
    });

    fileLogger.info(
      `Conversion completed: ${result.outputName} (${result.sizeBytes} bytes, ${result.conversionTimeMs}ms)`
    );
  } catch (err) {
    fileLogger.error(`Conversion error: ${err}`);
    jobManager.updateFile(jobId, file.fileId, {
      status: 'failed',
      progress: 0,
      errorMessage:
        err instanceof Error
          ? `Conversion error: ${err.message}`
          : 'An unexpected error occurred during conversion',
    });
  }
}

/**
 * Start processing all files in a job concurrently (up to a limit).
 */
export async function processJob(jobId: string): Promise<void> {
  const job = jobManager.getJob(jobId);
  if (!job) {
    logger.error(`processJob: job ${jobId} not found`);
    return;
  }

  const CONCURRENCY = 3; // Max parallel conversions per job
  const files = [...job.files];

  // Process files in batches
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((file) => processFile(jobId, file)));
  }

  logger.info(`Job ${jobId} processing complete`);
}
