import fs from 'fs/promises';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { ConversionEngine } from './ConversionEngine';
import { ConversionFile, ConversionResult, ValidationResult, OutputFormat, SupportedFormat } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class PdfToDocxConverter implements ConversionEngine {
  readonly name = 'PdfToDocxConverter';
  readonly supportedInputMimeTypes = ['application/pdf'];
  readonly supportedInputExtensions = ['pdf'];
  readonly supportedOutputFormats: OutputFormat[] = ['docx', 'txt'];
  readonly maxFileSizeMB = 50;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    {
      extension: 'pdf',
      mimeType: 'application/pdf',
      label: 'PDF Document to Word (DOCX) or Text',
      category: 'documents',
      outputFormats: ['docx', 'txt'],
    },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const buffer = await fs.readFile(file.metadata.storagePath);
      if (buffer.length < 10) {
        return { valid: false, errorMessage: 'PDF file is empty or corrupted.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, errorMessage: 'Cannot read PDF file.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const { outputFormat } = file;
    const inputPath = file.metadata.storagePath;

    try {
      const dataBuffer = await fs.readFile(inputPath);
      let text = '';
      let pageCount = 1;

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse(new Uint8Array(dataBuffer));
        await parser.load();
        const textResult = await parser.getText();
        text = textResult?.text || '';
        pageCount = textResult?.total || 1;
        await parser.destroy?.();
      } catch (parseErr) {
        logger.warn(`pdf-parse error: ${parseErr}`);
        text = dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ');
      }

      if (outputFormat === 'txt') {
        const storageName = generateStorageFileName('txt');
        const outputPath = path.join(outputDir, storageName);
        const outputName = buildOutputDisplayName(file.metadata.originalName, 'txt');
        await fs.writeFile(outputPath, text, 'utf-8');
        const stat = await fs.stat(outputPath);
        return {
          success: true,
          outputPath,
          outputName,
          sizeBytes: stat.size,
          pageCount: pageCount || 1,
          conversionTimeMs: Date.now() - startTime,
        };
      }

      // DOCX conversion
      const storageName = generateStorageFileName('docx');
      const outputPath = path.join(outputDir, storageName);
      const outputName = buildOutputDisplayName(file.metadata.originalName, 'docx');

      const rawLines = text.split(/\r?\n/);
      const docxChildren: Paragraph[] = [];

      let isFirst = true;
      for (const rawLine of rawLines) {
        const line = rawLine.trim();
        if (!line) {
          docxChildren.push(new Paragraph({ text: '' }));
          continue;
        }

        // Heuristic: First short line is Title
        if (isFirst && line.length < 80) {
          docxChildren.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.TITLE,
              spacing: { after: 240 },
            })
          );
          isFirst = false;
        } else if (line.length < 60 && /^[A-Z0-9\s:.-]+$/.test(line)) {
          // All-caps short line treated as Heading 1
          docxChildren.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 120 },
            })
          );
        } else {
          docxChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 24, // 12pt
                  font: 'Calibri',
                }),
              ],
              spacing: { line: 276, after: 120 },
            })
          );
        }
      }

      if (docxChildren.length === 0) {
        docxChildren.push(new Paragraph({ text: 'Converted from PDF (Empty document).' }));
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docxChildren,
          },
        ],
      });

      const docxBuffer = await Packer.toBuffer(doc);
      await fs.writeFile(outputPath, docxBuffer);
      const stat = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        outputName,
        sizeBytes: stat.size,
        pageCount: pageCount || 1,
        conversionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      logger.error(`PdfToDocxConverter error for ${file.fileId}: ${err}`);
      throw new Error(`PDF to DOCX conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
