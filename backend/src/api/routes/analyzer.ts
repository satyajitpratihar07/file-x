import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { validateFile } from '../../validation/fileValidator';
import { FileAnalyzerResult, OutputFormat } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

const router = Router();
const upload = multer({
  dest: path.join(__dirname, '../../../temp/analyzer'),
  limits: { fileSize: config.maxFileSizeMB * 1024 * 1024 },
});

/**
 * POST /api/analyze
 * Inspect any uploaded file and return real magic-byte metadata.
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'analyzer';
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: 'No file uploaded', requestId });
    return;
  }

  try {
    const validation = await validateFile(file.path, file.originalname, file.mimetype, file.size);
    const details = validation.details;

    // Read first 16 magic bytes as hex
    const handle = await fs.open(file.path, 'r');
    const headerBuf = Buffer.alloc(16);
    await handle.read(headerBuf, 0, 16, 0);
    await handle.close();

    const magicBytesHex = headerBuf.toString('hex').toUpperCase();

    let dimensions: { width: number; height: number } | undefined = undefined;
    if (details.category === 'IMAGE') {
      try {
        const meta = await sharp(file.path).metadata();
        if (meta.width && meta.height) {
          dimensions = { width: meta.width, height: meta.height };
        }
      } catch (err) {
        logger.warn(`Could not extract image metadata: ${err}`);
      }
    }

    let pageCount: number | undefined = undefined;
    if (details.category === 'PDF') {
      try {
        const content = await fs.readFile(file.path, 'ascii');
        const matches = content.match(/\/Type\s*\/Page\b/g);
        pageCount = matches ? matches.length : 1;
      } catch {
        pageCount = 1;
      }
    }

    // Determine available output formats based on category
    let availableOutputFormats: OutputFormat[] = ['pdf'];
    if (details.category === 'IMAGE') {
      availableOutputFormats = ['jpg', 'png', 'pdf'];
    } else if (details.category === 'PDF') {
      availableOutputFormats = ['jpg', 'png', 'pdf'];
    } else if (details.category === 'TEXT' || details.category === 'CODE') {
      availableOutputFormats = ['pdf'];
    }

    const result: FileAnalyzerResult = {
      filename: file.originalname,
      detectedMimeType: details.detectedMimeType,
      detectedExtension: details.detectedExtension,
      category: details.category,
      sizeBytes: file.size,
      magicBytesHex,
      dimensions,
      pageCount,
      availableOutputFormats,
    };

    // Clean up uploaded temporary file
    await fs.unlink(file.path).catch(() => {});

    res.json({
      success: true,
      data: result,
      requestId,
    });
  } catch (err) {
    logger.error(`Analyzer error: ${err}`);
    if (file && file.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    res.status(500).json({
      success: false,
      error: 'Failed to analyze file format',
      requestId,
    });
  }
});

export default router;
