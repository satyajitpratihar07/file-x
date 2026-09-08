import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { ConversionEngine } from './ConversionEngine';
import { ConversionFile, ConversionResult, ValidationResult, OutputFormat, SupportedFormat } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class MarkdownAndDocxConverter implements ConversionEngine {
  readonly name = 'MarkdownAndDocxConverter';
  readonly supportedInputMimeTypes = ['text/markdown', 'text/x-markdown', 'text/plain'];
  readonly supportedInputExtensions = ['md', 'markdown', 'txt'];
  readonly supportedOutputFormats: OutputFormat[] = ['docx', 'txt'];
  readonly maxFileSizeMB = 300;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    {
      extension: 'md',
      mimeType: 'text/markdown',
      label: 'Markdown to Word DOCX',
      category: 'documents',
      outputFormats: ['docx', 'txt'],
    },
    {
      extension: 'txt',
      mimeType: 'text/plain',
      label: 'Plain Text to Word DOCX',
      category: 'documents',
      outputFormats: ['docx'],
    },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const buffer = await fs.readFile(file.metadata.storagePath);
      if (buffer.length === 0) {
        return { valid: false, errorMessage: 'File is empty.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, errorMessage: 'Cannot read text file.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const inputPath = file.metadata.storagePath;

    try {
      const content = await fs.readFile(inputPath, 'utf-8');
      const storageName = generateStorageFileName('docx');
      const outputPath = path.join(outputDir, storageName);
      const outputName = buildOutputDisplayName(file.metadata.originalName, 'docx');

      const docxChildren: Paragraph[] = [];
      const tokens = marked.lexer(content);

      for (const token of tokens) {
        if (token.type === 'heading') {
          let headingLevel: any = HeadingLevel.HEADING_1;
          if (token.depth === 2) headingLevel = HeadingLevel.HEADING_2;
          else if (token.depth >= 3) headingLevel = HeadingLevel.HEADING_3;

          docxChildren.push(
            new Paragraph({
              text: token.text,
              heading: headingLevel,
              spacing: { before: 240, after: 120 },
            })
          );
        } else if (token.type === 'paragraph') {
          docxChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: token.text.replace(/[*_`]/g, ''),
                  size: 24, // 12pt
                  font: 'Calibri',
                }),
              ],
              spacing: { line: 276, after: 120 },
            })
          );
        } else if (token.type === 'code') {
          docxChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: token.text,
                  font: 'Consolas',
                  size: 20, // 10pt
                }),
              ],
              spacing: { before: 120, after: 120 },
            })
          );
        } else if (token.type === 'list') {
          for (const item of token.items) {
            docxChildren.push(
              new Paragraph({
                text: `• ${item.text.replace(/[*_`]/g, '')}`,
                spacing: { line: 240, after: 60 },
              })
            );
          }
        }
      }

      if (docxChildren.length === 0) {
        docxChildren.push(new Paragraph({ text: content }));
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
        pageCount: 1,
        conversionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      logger.error(`MarkdownAndDocxConverter error for ${file.fileId}: ${err}`);
      throw new Error(`DOCX conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
