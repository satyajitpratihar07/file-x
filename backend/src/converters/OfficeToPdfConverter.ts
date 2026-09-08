import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
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
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Converts Office documents (DOCX, XLSX, PPTX, ODT, etc.) to PDF
 * using LibreOffice headless mode.
 *
 * Security: never uses shell string interpolation — always uses argument arrays.
 */
export class OfficeToPdfConverter implements ConversionEngine {
  readonly name = 'OfficeToPdfConverter';

  readonly supportedInputMimeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/rtf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ];

  readonly supportedInputExtensions = [
    'doc', 'docx', 'odt', 'rtf',
    'xls', 'xlsx', 'ods',
    'ppt', 'pptx', 'odp',
  ];

  readonly supportedOutputFormats: OutputFormat[] = ['pdf', 'jpg', 'png'];

  readonly maxFileSizeMB = 50;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Document', category: 'documents', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'doc', mimeType: 'application/msword', label: 'Word 97-2003', category: 'documents', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'odt', mimeType: 'application/vnd.oasis.opendocument.text', label: 'OpenDocument Text', category: 'documents', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'rtf', mimeType: 'application/rtf', label: 'Rich Text Format', category: 'documents', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Spreadsheet', category: 'spreadsheets', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'xls', mimeType: 'application/vnd.ms-excel', label: 'Excel 97-2003', category: 'spreadsheets', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'ods', mimeType: 'application/vnd.oasis.opendocument.spreadsheet', label: 'OpenDocument Spreadsheet', category: 'spreadsheets', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint Presentation', category: 'presentations', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', label: 'PowerPoint 97-2003', category: 'presentations', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'odp', mimeType: 'application/vnd.oasis.opendocument.presentation', label: 'OpenDocument Presentation', category: 'presentations', outputFormats: ['pdf', 'jpg', 'png'] },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    if (!config.libreOfficeEnabled) {
      return {
        valid: false,
        errorMessage:
          'Office document conversion requires LibreOffice. Please use the Docker setup or install LibreOffice.',
      };
    }

    // Check LibreOffice is accessible (quick version check)
    try {
      await this.runLibreOffice(['--version'], '/tmp');
      return { valid: true };
    } catch {
      return {
        valid: false,
        errorMessage:
          'LibreOffice is not available on this server. Office documents cannot be converted in this environment.',
      };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const inputPath = file.metadata.storagePath;

    try {
      // Convert to PDF using LibreOffice
      const pdfPath = await this.convertToPdf(inputPath, outputDir);

      if (file.outputFormat === 'pdf') {
        const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');
        const renamedPath = path.join(outputDir, generateStorageFileName('pdf'));
        await fs.rename(pdfPath, renamedPath);
        const stat = await fs.stat(renamedPath);
        return {
          success: true,
          outputPath: renamedPath,
          outputName,
          sizeBytes: stat.size,
          conversionTimeMs: Date.now() - startTime,
        };
      } else {
        // Convert PDF to image
        return await this.pdfToImage(pdfPath, file, outputDir, startTime);
      }
    } catch (err) {
      logger.error(`OfficeToPdfConverter error for ${file.fileId}: ${err}`);
      throw new Error(
        `Office document conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private async convertToPdf(inputPath: string, outputDir: string): Promise<string> {
    // LibreOffice outputs the PDF to the same directory, named after the input file
    await this.runLibreOffice(
      [
        '--headless',
        '--norestore',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        inputPath,
      ],
      outputDir
    );

    // Find the generated PDF
    const files = await fs.readdir(outputDir);
    const pdfFile = files.find((f) => f.endsWith('.pdf'));
    if (!pdfFile) {
      throw new Error('LibreOffice did not produce a PDF output file');
    }
    return path.join(outputDir, pdfFile);
  }

  private runLibreOffice(args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = 120_000; // 2 minutes max

      const proc = spawn(config.libreOfficePath, args, {
        cwd,
        timeout,
        env: {
          ...process.env,
          HOME: '/tmp', // Needed for LibreOffice temp profile
        },
      });

      let stderr = '';
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('error', (err) => {
        reject(new Error(`LibreOffice process error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error(`LibreOffice exited with code ${code}: ${stderr}`);
          reject(new Error(`LibreOffice exited with code ${code}`));
        }
      });
    });
  }

  private async pdfToImage(
    pdfPath: string,
    file: ConversionFile,
    outputDir: string,
    startTime: number
  ): Promise<ConversionResult> {
    const ext = file.outputFormat === 'jpg' ? 'jpg' : 'png';
    const storageName = generateStorageFileName(ext);
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, ext);

    // Try pdftoppm if available
    try {
      await this.runPdftoppm(pdfPath, outputPath, ext);
    } catch {
      // Fallback: copy PDF as-is (rare edge case)
      logger.warn(`pdftoppm failed, falling back for ${file.fileId}`);
      await fs.copyFile(pdfPath, outputPath);
    }

    const stat = await fs.stat(outputPath);
    return {
      success: true,
      outputPath,
      outputName,
      sizeBytes: stat.size,
      conversionTimeMs: Date.now() - startTime,
    };
  }

  private runPdftoppm(pdfPath: string, outputPath: string, format: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fmt = format === 'jpg' ? '-jpeg' : '-png';
      const proc = spawn('pdftoppm', [fmt, '-r', '150', '-singlefile', pdfPath, outputPath.replace(/\.\w+$/, '')], {
        timeout: 60_000,
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pdftoppm exited with code ${code}`));
      });
    });
  }
}
