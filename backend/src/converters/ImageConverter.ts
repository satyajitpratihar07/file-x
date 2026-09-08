import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import PDFDocument from 'pdfkit';
import { ConversionEngine } from './ConversionEngine';
import { ConversionFile, ConversionResult, ValidationResult, OutputFormat, SupportedFormat } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class ImageConverter implements ConversionEngine {
  readonly name = 'ImageConverter';

  readonly supportedInputMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ];

  readonly supportedInputExtensions = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg', 'ico', 'heic', 'heif',
  ];

  readonly supportedOutputFormats: OutputFormat[] = ['pdf', 'jpg', 'png', 'webp'];

  readonly maxFileSizeMB = 50;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    { extension: 'jpg', mimeType: 'image/jpeg', label: 'JPEG Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'jpeg', mimeType: 'image/jpeg', label: 'JPEG Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'png', mimeType: 'image/png', label: 'PNG Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'webp', mimeType: 'image/webp', label: 'WebP Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'gif', mimeType: 'image/gif', label: 'GIF Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'], notes: 'Only first frame used for conversion' },
    { extension: 'bmp', mimeType: 'image/bmp', label: 'BMP Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'tiff', mimeType: 'image/tiff', label: 'TIFF Image', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'svg', mimeType: 'image/svg+xml', label: 'SVG Vector', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'ico', mimeType: 'image/x-icon', label: 'Icon File', category: 'images', outputFormats: ['pdf', 'jpg', 'png', 'webp'] },
    { extension: 'heic', mimeType: 'image/heic', label: 'Apple HEIC Photo', category: 'images', outputFormats: ['jpg', 'png', 'webp', 'pdf'] },
    { extension: 'heif', mimeType: 'image/heif', label: 'HEIF Image', category: 'images', outputFormats: ['jpg', 'png', 'webp', 'pdf'] },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const metadata = await sharp(file.metadata.storagePath).metadata();
      if (!metadata.width || !metadata.height) {
        return { valid: false, errorMessage: 'Image dimensions could not be read. The file may be corrupted.' };
      }
      // Protect against decompression bombs
      if (metadata.width > 20000 || metadata.height > 20000) {
        return { valid: false, errorMessage: 'Image dimensions are too large (max 20000×20000 pixels).' };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, errorMessage: 'Cannot read image. The file may be corrupted or in an unsupported format.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const { outputFormat } = file;
    const inputPath = file.metadata.storagePath;

    try {
      if (outputFormat === 'pdf') {
        return await this.imageToPdf(file, outputDir, startTime);
      } else {
        return await this.imageToImage(file, outputDir, outputFormat as 'jpg' | 'png' | 'webp', startTime);
      }
    } catch (err) {
      logger.error(`ImageConverter error for ${file.fileId}: ${err}`);
      throw new Error(`Image conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private async imageToImage(
    file: ConversionFile,
    outputDir: string,
    format: 'jpg' | 'png' | 'webp',
    startTime: number
  ): Promise<ConversionResult> {
    const ext = format;
    const storageName = generateStorageFileName(ext);
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, ext);

    const sharpInstance = sharp(file.metadata.storagePath);

    if (format === 'jpg') {
      await sharpInstance
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90, progressive: true })
        .toFile(outputPath);
    } else if (format === 'webp') {
      await sharpInstance.webp({ quality: 90 }).toFile(outputPath);
    } else {
      await sharpInstance.png({ compressionLevel: 6 }).toFile(outputPath);
    }

    const stat = await fs.stat(outputPath);
    return {
      success: true,
      outputPath,
      outputName,
      sizeBytes: stat.size,
      pageCount: 1,
      conversionTimeMs: Date.now() - startTime,
    };
  }

  private async imageToPdf(
    file: ConversionFile,
    outputDir: string,
    startTime: number
  ): Promise<ConversionResult> {
    const storageName = generateStorageFileName('pdf');
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');

    // Convert image to PNG buffer for embedding (handles SVG, ICO, etc.)
    const imgBuffer = await sharp(file.metadata.storagePath)
      .png()
      .toBuffer();

    const metadata = await sharp(imgBuffer).metadata();
    const imgWidth = metadata.width || 800;
    const imgHeight = metadata.height || 600;

    // Calculate PDF page size: A4 or match image proportions
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const MARGIN = 40;

    const availWidth = A4_WIDTH - MARGIN * 2;
    const availHeight = A4_HEIGHT - MARGIN * 2;
    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight, 1);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (A4_WIDTH - drawWidth) / 2;
    const y = (A4_HEIGHT - drawHeight) / 2;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: outputName } });
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);
      doc.image(imgBuffer, x, y, { width: drawWidth, height: drawHeight });
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const stat = await fs.stat(outputPath);
    return {
      success: true,
      outputPath,
      outputName,
      sizeBytes: stat.size,
      pageCount: 1,
      conversionTimeMs: Date.now() - startTime,
    };
  }
}
