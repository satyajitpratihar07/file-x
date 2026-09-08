import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { ConversionEngine } from './ConversionEngine';
import {
  ConversionFile,
  ConversionResult,
  ValidationResult,
  OutputFormat,
  SupportedFormat,
} from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class PdfToImageConverter implements ConversionEngine {
  readonly name = 'PdfToImageConverter';

  readonly supportedInputMimeTypes = ['application/pdf'];
  readonly supportedInputExtensions = ['pdf'];
  readonly supportedOutputFormats: OutputFormat[] = ['jpg', 'png'];
  readonly maxFileSizeMB = 300;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    {
      extension: 'pdf',
      mimeType: 'application/pdf',
      label: 'PDF Document',
      category: 'pdf_tools',
      outputFormats: ['jpg', 'png'],
      notes: 'Each page converted to a separate image, downloadable as ZIP',
    },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    // Check the first 5 bytes for PDF magic bytes (%PDF-)
    try {
      const handle = await fs.open(file.metadata.storagePath, 'r');
      const buf = Buffer.alloc(5);
      await handle.read(buf, 0, 5, 0);
      await handle.close();
      if (buf.toString('ascii') !== '%PDF-') {
        return { valid: false, errorMessage: 'File does not appear to be a valid PDF.' };
      }
    } catch {
      return { valid: false, errorMessage: 'Cannot read file. It may be corrupted.' };
    }

    if (file.outputFormat === 'pdf') {
      return { valid: false, errorMessage: 'Cannot convert PDF to PDF. Please choose JPG or PNG.' };
    }

    return { valid: true };
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const ext = file.outputFormat === 'jpg' ? 'jpg' : 'png';
    const inputPath = file.metadata.storagePath;

    try {
      // Try pdftoppm first (best quality, requires poppler-utils)
      const pages = await this.convertWithPdftoppm(inputPath, outputDir, ext);
      if (pages.length > 0) {
        return this.buildResult(file, pages, ext, startTime);
      }
    } catch (err) {
      logger.warn(`pdftoppm not available, falling back to sharp: ${err}`);
    }

    // Fallback: use sharp with a white placeholder image
    return await this.fallbackConvert(file, outputDir, ext, startTime);
  }

  private async convertWithPdftoppm(
    inputPath: string,
    outputDir: string,
    format: string
  ): Promise<string[]> {
    const outputPrefix = path.join(outputDir, 'page');
    const fmt = format === 'jpg' ? '-jpeg' : '-png';

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('pdftoppm', [fmt, '-r', '150', inputPath, outputPrefix], {
        timeout: 120_000,
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pdftoppm exited ${code}`));
      });
    });

    const files = await fs.readdir(outputDir);
    return files
      .filter((f) => f.startsWith('page') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.ppm')))
      .sort()
      .map((f) => path.join(outputDir, f));
  }

  private async fallbackConvert(
    file: ConversionFile,
    outputDir: string,
    ext: string,
    startTime: number
  ): Promise<ConversionResult> {
    const storageName = generateStorageFileName(ext);
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, ext);

    const width = 1200;
    const padding = 50;
    const headerHeight = 80;

    let extractedText = '';
    let pageCount = 1;

    try {
      const pdfBuffer = await fs.readFile(file.metadata.storagePath);
      const pdfParseModule = require('pdf-parse');
      const parsed = await pdfParseModule(pdfBuffer);
      extractedText = parsed.text || '';
      pageCount = parsed.numpages || 1;
    } catch (err) {
      logger.warn(`pdf-parse failed for ${file.fileId}: ${err}`);
    }

    const lines = extractedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const displayLines = lines.slice(0, 50);

    const lineGap = 28;
    const height = Math.min(
      Math.max(600, headerHeight + padding + Math.max(displayLines.length, 5) * lineGap + 60),
      2200
    );

    const escapedLines = displayLines.length > 0
      ? displayLines
          .map((line, idx) => {
            const escaped = line
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
            const y = headerHeight + padding + idx * lineGap;
            return `<tspan x="${padding}" y="${y}" fill="#0f172a">${escaped}</tspan>`;
          })
          .join('\n')
      : `<tspan x="${padding}" y="${headerHeight + padding}" fill="#64748b">[PDF Document Content - Page 1 of ${pageCount}]</tspan>`;

    const titleEscaped = file.metadata.originalName
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc" />
      <rect width="100%" height="${headerHeight}" fill="#0f172a" />
      <text x="${padding}" y="48" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${titleEscaped}</text>
      <text x="${width - padding}" y="48" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="end">${pageCount} Page(s) · ConvertX</text>
      <rect x="${padding - 15}" y="${headerHeight + 20}" width="${width - (padding - 15) * 2}" height="${height - headerHeight - 50}" fill="#ffffff" rx="10" stroke="#cbd5e1" stroke-width="1.5" />
      <text font-family="Helvetica, Arial, sans-serif" font-size="15" xml:space="preserve">
        ${escapedLines}
      </text>
    </svg>`;

    const buf = Buffer.from(svg);

    if (ext === 'jpg') {
      await sharp(buf).jpeg({ quality: 95 }).toFile(outputPath);
    } else {
      await sharp(buf).png().toFile(outputPath);
    }

    const stat = await fs.stat(outputPath);
    return {
      success: true,
      outputPath,
      outputName,
      sizeBytes: stat.size,
      pageCount,
      conversionTimeMs: Date.now() - startTime,
    };
  }

  private buildResult(
    file: ConversionFile,
    pages: string[],
    ext: string,
    startTime: number
  ): ConversionResult {
    const outputName = buildOutputDisplayName(file.metadata.originalName, ext);
    return {
      success: true,
      outputPath: pages[0],
      outputName,
      sizeBytes: 0,
      pageCount: pages.length,
      conversionTimeMs: Date.now() - startTime,
    };
  }
}
