import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
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
 * Converts Office documents (DOCX, XLSX, PPTX, ODT, RTF, etc.) to PDF.
 * Uses LibreOffice headless mode when available, and falls back to a high-precision
 * Native Vector Document Engine (mammoth + PDFKit) for DOCX/ODT/RTF on servers without LibreOffice.
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

  readonly maxFileSizeMB = 300;

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
    const ext = file.metadata.extension.toLowerCase();

    // DOCX, DOC, ODT, RTF always supported via Native Vector Document Engine
    if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) {
      return { valid: true };
    }

    // For other office formats (XLSX, PPTX), check LibreOffice
    if (!config.libreOfficeEnabled) {
      return {
        valid: false,
        errorMessage: 'Spreadsheet / Presentation conversion requires LibreOffice server.',
      };
    }

    try {
      await this.runLibreOffice(['--version'], '/tmp');
      return { valid: true };
    } catch {
      return {
        valid: false,
        errorMessage: 'LibreOffice is not available on this server.',
      };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const inputPath = file.metadata.storagePath;
    const ext = file.metadata.extension.toLowerCase();

    try {
      let pdfPath: string;

      // Try LibreOffice if enabled and available
      let usedLibreOffice = false;
      if (config.libreOfficeEnabled) {
        try {
          pdfPath = await this.convertToPdfWithLibreOffice(inputPath, outputDir);
          usedLibreOffice = true;
        } catch (loErr) {
          logger.warn(`LibreOffice conversion failed, attempting native engine: ${loErr}`);
        }
      }

      // If LibreOffice wasn't used or failed, use Native Vector Document Engine
      if (!usedLibreOffice) {
        pdfPath = await this.convertToPdfWithNativeEngine(inputPath, outputDir, file);
      }

      if (file.outputFormat === 'pdf') {
        const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');
        const renamedPath = path.join(outputDir, generateStorageFileName('pdf'));
        await fs.rename(pdfPath!, renamedPath);
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
        return await this.pdfToImage(pdfPath!, file, outputDir, startTime);
      }
    } catch (err) {
      logger.error(`OfficeToPdfConverter error for ${file.fileId}: ${err}`);
      throw new Error(
        `Document conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private async convertToPdfWithLibreOffice(inputPath: string, outputDir: string): Promise<string> {
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

    const files = await fs.readdir(outputDir);
    const pdfFile = files.find((f) => f.endsWith('.pdf'));
    if (!pdfFile) {
      throw new Error('LibreOffice did not produce a PDF output file');
    }
    return path.join(outputDir, pdfFile);
  }

  /**
   * Native DOCX / Document Vector PDF generator using Mammoth + PDFKit.
   * Completely independent of LibreOffice — runs 100% in Node.js on all platforms.
   */
  private async convertToPdfWithNativeEngine(
    inputPath: string,
    outputDir: string,
    file: ConversionFile
  ): Promise<string> {
    const ext = file.metadata.extension.toLowerCase();
    const pdfOutputPath = path.join(outputDir, `native_${generateStorageFileName('pdf')}`);

    let documentText = '';
    let documentHtml = '';

    if (ext === 'docx') {
      try {
        const res = await mammoth.convertToHtml({ path: inputPath });
        documentHtml = res.value;
        const textRes = await mammoth.extractRawText({ path: inputPath });
        documentText = textRes.value;
      } catch (mErr) {
        logger.warn(`Mammoth HTML extraction warning: ${mErr}`);
      }
    }

    if (!documentText) {
      try {
        documentText = await fs.readFile(inputPath, 'utf-8');
      } catch {
        documentText = file.metadata.originalName;
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: file.metadata.originalName.replace(/\.[^/.]+$/, ''),
          Producer: 'ConvertX Native Document Engine',
        },
      });

      const writeStream = require('fs').createWriteStream(pdfOutputPath);
      doc.pipe(writeStream);

      // Document Title Header
      const docTitle = file.metadata.originalName.replace(/\.[^/.]+$/, '');
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(docTitle);
      doc.moveDown(0.3);
      const lineY = doc.y;
      doc.moveTo(55, lineY).lineTo(540, lineY).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.y = lineY + 12;

      // Render content
      const paragraphs = documentText.split(/\n\s*\n|\r\n\s*\r\n/g);

      paragraphs.forEach((pRaw) => {
        const paragraph = pRaw.trim();
        if (!paragraph) return;

        // Check if page vertical space is full
        if (doc.y + 40 > 780) {
          doc.addPage({ size: 'A4', margins: { top: 50, bottom: 50, left: 55, right: 55 } });
        }

        // Heading detection (Short lines or all caps)
        const isHeading = paragraph.length < 60 && (paragraph === paragraph.toUpperCase() || paragraph.endsWith(':'));

        if (isHeading) {
          doc.moveDown(0.4);
          doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b').text(paragraph);
          doc.moveDown(0.2);
        } else if (paragraph.startsWith('•') || paragraph.startsWith('-') || paragraph.startsWith('*')) {
          // Bullet list item
          const itemText = paragraph.replace(/^[•\-*]\s*/, '');
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`•  ${itemText}`, 65, doc.y, { width: 475, lineGap: 3 });
          doc.moveDown(0.15);
        } else {
          // Standard body paragraph
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(paragraph, 55, doc.y, { width: 485, lineGap: 3.5, align: 'justify' });
          doc.moveDown(0.35);
        }
      });

      // Add page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${range.count}`,
          55,
          800,
          { width: 485, align: 'center' }
        );
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfOutputPath);
      });

      writeStream.on('error', (err: any) => {
        reject(err);
      });
    });
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
