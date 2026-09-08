import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { ConversionJob } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { getJobOutputDir } from '../storage/LocalStorage';
import { isPathSafe } from '../storage/LocalStorage';
import { logger } from '../utils/logger';

/**
 * Create a ZIP archive of all successfully converted files in a job.
 * Security: validates all file paths before adding to ZIP.
 */
export async function createJobZip(job: ConversionJob): Promise<string> {
  const outputDir = getJobOutputDir(job.jobId);
  const zipName = generateStorageFileName('zip');
  const zipPath = path.join(outputDir, zipName);

  const completedFiles = job.files.filter(
    (f) => f.status === 'completed' && f.outputPath && f.outputName
  );

  if (completedFiles.length === 0) {
    throw new Error('No completed files to archive');
  }

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn(`ZIP warning: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    const usedNames = new Map<string, number>();

    for (const file of completedFiles) {
      const filePath = file.outputPath!;
      const displayName = file.outputName!;

      // Security: verify path is within allowed directory
      if (!isPathSafe(filePath, outputDir)) {
        logger.error(`ZIP security: path traversal attempt detected: ${filePath}`);
        continue;
      }

      // Sanitize display name inside ZIP (prevent path traversal within archive)
      let safeName = path.basename(displayName).replace(/[/\\]/g, '_');

      // Deduplicate file names inside archive (e.g. name_(1).jpg, name_(2).jpg)
      if (usedNames.has(safeName)) {
        const count = usedNames.get(safeName)! + 1;
        usedNames.set(safeName, count);
        const parsed = path.parse(safeName);
        safeName = `${parsed.name}_(${count})${parsed.ext}`;
      } else {
        usedNames.set(safeName, 1);
      }

      archive.file(filePath, { name: safeName });
    }

    archive.finalize();
  });

  logger.info(`ZIP created for job ${job.jobId}: ${zipPath}`);
  return zipPath;
}
