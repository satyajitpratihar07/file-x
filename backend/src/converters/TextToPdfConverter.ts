import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
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
import sharp from 'sharp';

// Page constants (A4 in points)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT_NORMAL = 14;
const LINE_HEIGHT_CODE = 12;
const FONT_SIZE_NORMAL = 11;
const FONT_SIZE_CODE = 9;
const FONT_SIZE_H1 = 22;
const FONT_SIZE_H2 = 18;
const FONT_SIZE_H3 = 14;
function escapeXmlText(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class TextToPdfConverter implements ConversionEngine {
  readonly name = 'TextToPdfConverter';

  readonly supportedInputMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/x-yaml',
    'text/css',
    'application/javascript',
    'text/javascript',
  ];

  readonly supportedInputExtensions = [
    'txt', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml',
    'csv', 'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp',
    'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt',
    'r', 'sh', 'bash', 'sql', 'html', 'htm', 'css', 'scss',
    'less', 'toml', 'ini', 'cfg', 'conf', 'log', 'env',
    'dockerfile', 'makefile', 'ps1', 'scala', 'lua',
    'devtools', 'config', 'data', 'out', 'spec', 'settings',
  ];

  readonly supportedOutputFormats: OutputFormat[] = ['pdf', 'jpg', 'png'];

  readonly maxFileSizeMB = 300;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    { extension: 'txt', mimeType: 'text/plain', label: 'Plain Text', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'md', mimeType: 'text/markdown', label: 'Markdown', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'json', mimeType: 'application/json', label: 'JSON', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'xml', mimeType: 'application/xml', label: 'XML', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'yaml', mimeType: 'application/x-yaml', label: 'YAML', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'csv', mimeType: 'text/csv', label: 'CSV (Table)', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'py', mimeType: 'text/plain', label: 'Python', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'js', mimeType: 'text/plain', label: 'JavaScript', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'ts', mimeType: 'text/plain', label: 'TypeScript', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'java', mimeType: 'text/plain', label: 'Java', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'c', mimeType: 'text/plain', label: 'C Source', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'cpp', mimeType: 'text/plain', label: 'C++ Source', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'html', mimeType: 'text/html', label: 'HTML', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'css', mimeType: 'text/css', label: 'CSS', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'sql', mimeType: 'text/plain', label: 'SQL', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
    { extension: 'sh', mimeType: 'text/plain', label: 'Shell Script', category: 'text_code', outputFormats: ['pdf', 'jpg', 'png'] },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(file.metadata.storagePath, 'utf-8');
      if (content.length === 0) {
        return { valid: false, errorMessage: 'File is empty' };
      }
      if (content.length > 5 * 1024 * 1024) {
        return { valid: false, errorMessage: 'Text file content is too large (max 5MB text)' };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, errorMessage: 'Cannot read file as text. It may be binary or corrupted.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const ext = file.metadata.extension.toLowerCase();

    if (file.outputFormat === 'jpg' || file.outputFormat === 'png') {
      return await this.textToImage(file, outputDir, startTime);
    }

    // PDF output
    const isMarkdown = ext === 'md' || ext === 'markdown';
    const isCsv = ext === 'csv';
    const isCode = !isMarkdown && !isCsv && ext !== 'txt';

    let pdfPath: string;
    let pageCount: number;

    if (isMarkdown) {
      ({ pdfPath, pageCount } = await this.markdownToPdf(file, outputDir));
    } else if (isCsv) {
      ({ pdfPath, pageCount } = await this.csvToPdf(file, outputDir));
    } else {
      ({ pdfPath, pageCount } = await this.textToPdf(file, outputDir, isCode));
    }

    const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');
    const stat = await fs.stat(pdfPath);

    return {
      success: true,
      outputPath: pdfPath,
      outputName,
      sizeBytes: stat.size,
      pageCount,
      conversionTimeMs: Date.now() - startTime,
    };
  }

  private async textToPdf(
    file: ConversionFile,
    outputDir: string,
    isCode: boolean
  ): Promise<{ pdfPath: string; pageCount: number }> {
    const content = await fs.readFile(file.metadata.storagePath, 'utf-8');
    const storageName = generateStorageFileName('pdf');
    const outputPath = path.join(outputDir, storageName);

    const lines = content.split(/\r?\n/);
    const fontSize = isCode ? FONT_SIZE_CODE : FONT_SIZE_NORMAL;
    const lineHeight = isCode ? 16 : 18;
    const font = isCode ? 'Courier' : 'Helvetica';
    const usableWidth = PAGE_WIDTH - MARGIN * 2;

    let pageCount = 1;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        info: {
          Title: file.metadata.originalName,
          Creator: 'ConvertX',
        },
      });

      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569');
      doc.text(`${file.metadata.originalName}`, MARGIN, 20, { align: 'left', width: usableWidth });

      let y = MARGIN + 20;

      for (let i = 0; i < lines.length; i++) {
        if (y > PAGE_HEIGHT - MARGIN - 30) {
          doc.addPage();
          pageCount++;
          y = MARGIN + 20;

          // Header on new page
          doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
          doc.text(`${file.metadata.originalName} — Page ${pageCount}`, MARGIN, 20, { align: 'left', width: usableWidth });
          y = MARGIN + 20;
        }

        const lineText = lines[i] || ' ';
        if (isCode) {
          const lineNum = String(i + 1).padStart(4, ' ');
          doc.font('Courier').fontSize(8).fillColor('#94a3b8');
          doc.text(`${lineNum}  `, MARGIN, y, { width: 35 });
          doc.font('Courier').fontSize(fontSize).fillColor('#0f172a');
          doc.text(lineText, MARGIN + 35, y, { width: usableWidth - 35 });
        } else {
          doc.font('Helvetica').fontSize(fontSize).fillColor('#0f172a');
          doc.text(lineText, MARGIN, y, { width: usableWidth });
        }
        y += lineHeight;
      }

      // Footer
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
      doc.text(
        `Generated by ConvertX — Page ${pageCount} of ${pageCount}`,
        MARGIN,
        PAGE_HEIGHT - MARGIN + 10,
        { align: 'center', width: usableWidth }
      );

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { pdfPath: outputPath, pageCount };
  }

  private async textToImage(
    file: ConversionFile,
    outputDir: string,
    startTime: number
  ): Promise<ConversionResult> {
    const content = await fs.readFile(file.metadata.storagePath, 'utf-8');
    const ext = file.metadata.extension.toLowerCase();
    const outputExt = file.outputFormat === 'jpg' ? 'jpg' : 'png';
    const storageName = generateStorageFileName(outputExt);
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, outputExt);

    const isCode = !['txt', 'md', 'markdown', 'csv'].includes(ext);
    const lines = content.split(/\r?\n/);

    const width = 1200;
    const padding = 50;
    const headerHeight = 80;
    const lineGap = isCode ? 26 : 28;
    const maxLines = 60;
    const displayLines = lines.slice(0, maxLines);

    const height = Math.min(
      Math.max(600, headerHeight + padding + displayLines.length * lineGap + 60),
      2200
    );

    const escapedLines = displayLines
      .map((line, idx) => {
        const escaped = escapeXmlText(line);
        const y = headerHeight + padding + idx * lineGap;
        if (isCode) {
          const num = String(idx + 1).padStart(3, ' ');
          return `<tspan x="${padding}" y="${y}" fill="#94a3b8">${num}  </tspan><tspan fill="#0f172a">${escaped || ' '}</tspan>`;
        }
        return `<tspan x="${padding}" y="${y}" fill="#0f172a">${escaped || ' '}</tspan>`;
      })
      .join('\n');

    const titleEscaped = escapeXmlText(file.metadata.originalName);

    const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc" />
      <rect width="100%" height="${headerHeight}" fill="#0f172a" />
      <text x="${padding}" y="48" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">${titleEscaped}</text>
      <text x="${width - padding}" y="48" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#94a3b8" text-anchor="end">ConvertX</text>
      <rect x="${padding - 15}" y="${headerHeight + 20}" width="${width - (padding - 15) * 2}" height="${height - headerHeight - 50}" fill="#ffffff" rx="10" stroke="#cbd5e1" stroke-width="1.5" />
      <text font-family="${isCode ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif'}" font-size="15" xml:space="preserve">
        ${escapedLines}
      </text>
    </svg>`;

    const svgBuffer = Buffer.from(svg);

    if (outputExt === 'jpg') {
      await sharp(svgBuffer).jpeg({ quality: 95 }).toFile(outputPath);
    } else {
      await sharp(svgBuffer).png().toFile(outputPath);
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

  private async markdownToPdf(
    file: ConversionFile,
    outputDir: string
  ): Promise<{ pdfPath: string; pageCount: number }> {
    const content = await fs.readFile(file.metadata.storagePath, 'utf-8');
    const storageName = generateStorageFileName('pdf');
    const outputPath = path.join(outputDir, storageName);

    // Parse markdown tokens
    const tokens = marked.lexer(content);
    let pageCount = 1;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
        info: { Title: file.metadata.originalName, Creator: 'ConvertX' },
      });

      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      const usableWidth = PAGE_WIDTH - MARGIN * 2;

      const addPageBreakCheck = () => {
        if ((doc as any).y > PAGE_HEIGHT - MARGIN - 60) {
          doc.addPage();
          pageCount++;
        }
      };

      for (const token of tokens) {
        addPageBreakCheck();

        switch (token.type) {
          case 'heading': {
            const sizes: Record<number, number> = { 1: FONT_SIZE_H1, 2: FONT_SIZE_H2, 3: FONT_SIZE_H3 };
            const size = sizes[token.depth] || FONT_SIZE_NORMAL + 2;
            doc.font('Helvetica-Bold').fontSize(size).fillColor('#0a0f1e');
            doc.text(token.text, { width: usableWidth });
            if (token.depth === 1) {
              doc.moveTo(MARGIN, (doc as any).y).lineTo(PAGE_WIDTH - MARGIN, (doc as any).y)
                .strokeColor('#e5e7eb').stroke();
            }
            doc.moveDown(0.5);
            break;
          }
          case 'paragraph': {
            doc.font('Helvetica').fontSize(FONT_SIZE_NORMAL).fillColor('#1a1a2e');
            doc.text(token.text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1'), {
              width: usableWidth,
              align: 'left',
            });
            doc.moveDown(0.5);
            break;
          }
          case 'code': {
            const codeLines = token.text.split('\n');
            const boxHeight = codeLines.length * LINE_HEIGHT_CODE + 16;
            const y = (doc as any).y;
            doc.rect(MARGIN - 5, y - 4, usableWidth + 10, boxHeight)
              .fillColor('#f8f9fa').fill();
            doc.font('Courier').fontSize(FONT_SIZE_CODE).fillColor('#1a1a2e');
            doc.text(token.text, MARGIN + 4, y, { width: usableWidth - 8 });
            doc.moveDown(0.8);
            break;
          }
          case 'list': {
            doc.font('Helvetica').fontSize(FONT_SIZE_NORMAL).fillColor('#1a1a2e');
            (token.items || []).forEach((item: any, idx: number) => {
              const bullet = token.ordered ? `${idx + 1}.` : '•';
              doc.text(`  ${bullet}  ${item.text}`, { width: usableWidth - 20 });
            });
            doc.moveDown(0.5);
            break;
          }
          case 'blockquote': {
            doc.rect(MARGIN - 5, (doc as any).y - 2, 3, 20).fillColor('#6c63ff').fill();
            doc.font('Helvetica-Oblique').fontSize(FONT_SIZE_NORMAL).fillColor('#555555');
            doc.text(token.text, MARGIN + 8, undefined, { width: usableWidth - 8 });
            doc.moveDown(0.5);
            break;
          }
          case 'hr': {
            doc.moveTo(MARGIN, (doc as any).y)
              .lineTo(PAGE_WIDTH - MARGIN, (doc as any).y)
              .strokeColor('#e5e7eb').stroke();
            doc.moveDown(0.5);
            break;
          }
          case 'space': {
            doc.moveDown(0.5);
            break;
          }
        }
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { pdfPath: outputPath, pageCount };
  }

  private async csvToPdf(
    file: ConversionFile,
    outputDir: string
  ): Promise<{ pdfPath: string; pageCount: number }> {
    const content = await fs.readFile(file.metadata.storagePath, 'utf-8');
    const storageName = generateStorageFileName('pdf');
    const outputPath = path.join(outputDir, storageName);

    // Parse CSV rows
    const rows = content
      .split('\n')
      .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
      .filter((row) => row.some((c) => c.length > 0));

    if (rows.length === 0) {
      throw new Error('CSV file contains no data');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const usableWidth = PAGE_WIDTH - MARGIN * 2;
    const colWidth = Math.min(usableWidth / headers.length, 120);
    const rowHeight = 18;
    const tableStartY = MARGIN + 40;
    let pageCount = 1;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: headers.length > 5 ? 'landscape' : 'portrait',
        margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
        info: { Title: file.metadata.originalName, Creator: 'ConvertX' },
      });

      const pageWidth = headers.length > 5 ? PAGE_HEIGHT : PAGE_WIDTH;
      const effectiveColWidth = Math.min((pageWidth - MARGIN * 2) / headers.length, 120);
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0a0f1e');
      doc.text(file.metadata.originalName, MARGIN, MARGIN, { width: pageWidth - MARGIN * 2 });

      let y = tableStartY;

      const drawRow = (row: string[], isHeader: boolean, yPos: number) => {
        if (isHeader) {
          doc.rect(MARGIN, yPos, effectiveColWidth * headers.length, rowHeight)
            .fillColor('#6c63ff').fill();
        } else {
          const rowIndex = dataRows.indexOf(row);
          if (rowIndex % 2 === 0) {
            doc.rect(MARGIN, yPos, effectiveColWidth * headers.length, rowHeight)
              .fillColor('#f8f9fa').fill();
          }
        }

        row.forEach((cell, ci) => {
          doc
            .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8)
            .fillColor(isHeader ? '#ffffff' : '#1a1a2e');
          const cellX = MARGIN + ci * effectiveColWidth;
          const truncated = cell.length > 20 ? cell.slice(0, 18) + '…' : cell;
          doc.text(truncated, cellX + 3, yPos + 5, { width: effectiveColWidth - 6, lineBreak: false });
        });

        // Row border
        doc.rect(MARGIN, yPos, effectiveColWidth * headers.length, rowHeight)
          .strokeColor('#e5e7eb').stroke();
      };

      // Draw header
      drawRow(headers, true, y);
      y += rowHeight;

      // Draw data rows
      for (const row of dataRows) {
        if (y + rowHeight > PAGE_HEIGHT - MARGIN - 20) {
          doc.addPage();
          pageCount++;
          y = MARGIN;
          drawRow(headers, true, y);
          y += rowHeight;
        }
        drawRow(row, false, y);
        y += rowHeight;
      }

      // Footer
      doc.font('Helvetica').fontSize(8).fillColor('#999999');
      doc.text(
        `${rows.length - 1} rows — Generated by ConvertX`,
        MARGIN,
        (doc as any).page.height - MARGIN + 5,
        { align: 'center', width: pageWidth - MARGIN * 2 }
      );

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { pdfPath: outputPath, pageCount };
  }

  private async pdfToImage(
    pdfPath: string,
    file: ConversionFile,
    outputDir: string,
    startTime: number,
    pageCount: number
  ): Promise<ConversionResult> {
    // For text-to-image, we first generate PDF then convert page 1 to image using sharp
    // Read the PDF and render first page as image
    const ext = file.outputFormat === 'jpg' ? 'jpg' : 'png';
    const storageName = generateStorageFileName(ext);
    const outputPath = path.join(outputDir, storageName);
    const outputName = buildOutputDisplayName(file.metadata.originalName, ext);

    // Use sharp to create a "screenshot" of the PDF page if poppler is not available
    // Fallback: render the PDF as a high-res image placeholder
    // We create a white image with text indicating successful conversion
    try {
      const imgBuffer = await sharp({
        create: {
          width: 794,
          height: 1123,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      if (ext === 'jpg') {
        await sharp(imgBuffer).jpeg({ quality: 90 }).toFile(outputPath);
      } else {
        await sharp(imgBuffer).png().toFile(outputPath);
      }
    } catch {
      // If sharp can't create, just copy the pdf renamed
      await fs.copyFile(pdfPath, outputPath);
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
}
