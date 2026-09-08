import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';
import { ConversionEngine } from './ConversionEngine';
import { ConversionFile, ConversionResult, ValidationResult, OutputFormat, SupportedFormat } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class ZipInspectorConverter implements ConversionEngine {
  readonly name = 'ZipInspectorConverter';
  readonly supportedInputMimeTypes = ['application/zip', 'application/x-zip-compressed'];
  readonly supportedInputExtensions = ['zip'];
  readonly supportedOutputFormats: OutputFormat[] = ['pdf', 'txt'];
  readonly maxFileSizeMB = 300;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    {
      extension: 'zip',
      mimeType: 'application/zip',
      label: 'ZIP Archive Manifest & Inspection',
      category: 'archives',
      outputFormats: ['pdf', 'txt'],
    },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const zip = new AdmZip(file.metadata.storagePath);
      const entries = zip.getEntries();
      if (!entries) {
        return { valid: false, errorMessage: 'Corrupted or empty ZIP archive.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, errorMessage: 'Cannot read ZIP archive.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const { outputFormat } = file;
    const inputPath = file.metadata.storagePath;

    try {
      const zip = new AdmZip(inputPath);
      const entries = zip.getEntries();

      let totalUncompressedBytes = 0;
      let totalCompressedBytes = 0;

      const fileList = entries.map((entry) => {
        totalUncompressedBytes += entry.header.size;
        totalCompressedBytes += entry.header.compressedSize;
        return {
          name: entry.entryName,
          isDirectory: entry.isDirectory,
          size: entry.header.size,
          compressedSize: entry.header.compressedSize,
          date: entry.header.time ? new Date(entry.header.time).toLocaleString() : 'N/A',
        };
      });

      const overallRatio =
        totalUncompressedBytes > 0
          ? Math.round((1 - totalCompressedBytes / totalUncompressedBytes) * 100)
          : 0;

      if (outputFormat === 'txt') {
        const storageName = generateStorageFileName('txt');
        const outputPath = path.join(outputDir, storageName);
        const outputName = buildOutputDisplayName(file.metadata.originalName, 'txt');

        let report = `=================================================================\n`;
        report += `           CONVERTX ZIP ARCHIVE INSPECTION REPORT                \n`;
        report += `=================================================================\n`;
        report += `Archive Name:         ${file.metadata.originalName}\n`;
        report += `Total Entries:        ${entries.length}\n`;
        report += `Total Files:          ${entries.filter((e) => !e.isDirectory).length}\n`;
        report += `Total Directories:    ${entries.filter((e) => e.isDirectory).length}\n`;
        report += `Uncompressed Size:    ${(totalUncompressedBytes / 1024 / 1024).toFixed(2)} MB (${totalUncompressedBytes.toLocaleString()} bytes)\n`;
        report += `Compressed Size:      ${(totalCompressedBytes / 1024 / 1024).toFixed(2)} MB (${totalCompressedBytes.toLocaleString()} bytes)\n`;
        report += `Compression Ratio:    ${overallRatio}%\n`;
        report += `Inspection Date:      ${new Date().toLocaleString()}\n`;
        report += `=================================================================\n\n`;
        report += `FILES & FOLDERS LIST:\n`;
        report += `-----------------------------------------------------------------\n`;

        for (const item of fileList) {
          const type = item.isDirectory ? '[DIR ]' : '[FILE]';
          const sizeKb = (item.size / 1024).toFixed(1) + ' KB';
          report += `${type} ${item.name.padEnd(50)} ${sizeKb.padStart(10)}  ${item.date}\n`;
        }

        await fs.promises.writeFile(outputPath, report, 'utf-8');
        const stat = await fs.promises.stat(outputPath);

        return {
          success: true,
          outputPath,
          outputName,
          sizeBytes: stat.size,
          pageCount: 1,
          conversionTimeMs: Date.now() - startTime,
        };
      }

      // PDF Manifest Output
      const storageName = generateStorageFileName('pdf');
      const outputPath = path.join(outputDir, storageName);
      const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');

      return await new Promise<ConversionResult>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          bufferPages: true,
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text('ZIP Archive Inspection Report');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Archive: ${file.metadata.originalName} · Scanned by ConvertX Universal Engine`);
        doc.moveDown(1);

        // Summary Card
        doc.rect(40, doc.y, doc.page.width - 80, 70).fillAndStroke('#f8fafc', '#e2e8f0');
        const startY = doc.y - 60;
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(`Total Entries: ${entries.length} (${entries.filter((e) => !e.isDirectory).length} files, ${entries.filter((e) => e.isDirectory).length} folders)`, 54, startY);
        doc.text(`Uncompressed Size: ${(totalUncompressedBytes / 1024 / 1024).toFixed(2)} MB (${totalUncompressedBytes.toLocaleString()} bytes)`, 54, startY + 16);
        doc.text(`Compressed Archive Size: ${(totalCompressedBytes / 1024 / 1024).toFixed(2)} MB (${overallRatio}% space saved)`, 54, startY + 32);
        doc.moveDown(3);

        // Table Header
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('Type', 40, doc.y, { width: 45 });
        doc.text('Entry Path', 90, doc.y - 11, { width: 330 });
        doc.text('Size', 420, doc.y - 11, { width: 75, align: 'right' });
        doc.moveDown(0.4);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#cbd5e1');
        doc.moveDown(0.5);

        // Table Rows
        doc.font('Courier').fontSize(8).fillColor('#334155');
        for (const item of fileList) {
          if (doc.y > doc.page.height - 50) {
            doc.addPage();
            doc.font('Courier').fontSize(8).fillColor('#334155');
          }
          const typeStr = item.isDirectory ? '[DIR]' : '[FILE]';
          const sizeStr = item.isDirectory ? '-' : (item.size / 1024).toFixed(1) + ' KB';
          const rowY = doc.y;
          doc.text(typeStr, 40, rowY, { width: 45 });
          doc.text(item.name, 90, rowY, { width: 330, ellipsis: true });
          doc.text(sizeStr, 420, rowY, { width: 75, align: 'right' });
          doc.moveDown(0.4);
        }

        doc.end();

        writeStream.on('finish', async () => {
          try {
            const stat = await fs.promises.stat(outputPath);
            resolve({
              success: true,
              outputPath,
              outputName,
              sizeBytes: stat.size,
              pageCount: doc.bufferedPageRange().count,
              conversionTimeMs: Date.now() - startTime,
            });
          } catch (e) {
            reject(e);
          }
        });

        writeStream.on('error', (err) => reject(err));
      });
    } catch (err) {
      logger.error(`ZipInspectorConverter error for ${file.fileId}: ${err}`);
      throw new Error(`ZIP inspection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
