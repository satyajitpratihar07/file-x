import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';
import { ConversionEngine } from './ConversionEngine';
import { ConversionFile, ConversionResult, ValidationResult, OutputFormat, SupportedFormat } from '../types';
import { generateStorageFileName } from '../utils/idGenerator';
import { buildOutputDisplayName } from '../security/sanitize';
import { logger } from '../utils/logger';

export class EpubToPdfConverter implements ConversionEngine {
  readonly name = 'EpubToPdfConverter';
  readonly supportedInputMimeTypes = ['application/epub+zip', 'application/zip'];
  readonly supportedInputExtensions = ['epub'];
  readonly supportedOutputFormats: OutputFormat[] = ['pdf', 'txt'];
  readonly maxFileSizeMB = 300;

  readonly supportedFormatsMeta: SupportedFormat[] = [
    {
      extension: 'epub',
      mimeType: 'application/epub+zip',
      label: 'EPUB E-Book',
      category: 'EBOOK' as any,
      outputFormats: ['pdf', 'txt'],
    },
  ];

  async validate(file: ConversionFile): Promise<ValidationResult> {
    try {
      const zip = new AdmZip(file.metadata.storagePath);
      const entries = zip.getEntries();
      const hasContainer = entries.some((e) => e.entryName.includes('container.xml') || e.entryName.endsWith('.opf'));
      if (!hasContainer && !file.metadata.originalName.toLowerCase().endsWith('.epub')) {
        return { valid: false, errorMessage: 'Invalid EPUB file: Missing container.xml or package manifest.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, errorMessage: 'Cannot read EPUB file. The archive may be corrupted.' };
    }
  }

  async convert(file: ConversionFile, outputDir: string): Promise<ConversionResult> {
    const startTime = Date.now();
    const { outputFormat } = file;
    const inputPath = file.metadata.storagePath;

    try {
      const zip = new AdmZip(inputPath);
      const entries = zip.getEntries();

      // 1. Locate OPF file
      let opfEntry = entries.find((e) => e.entryName.endsWith('.opf'));
      let basePath = '';

      if (opfEntry) {
        basePath = path.dirname(opfEntry.entryName);
        if (basePath === '.') basePath = '';
      }

      // 2. Extract metadata & spine from OPF
      let bookTitle = path.basename(file.metadata.originalName, path.extname(file.metadata.originalName));
      let bookAuthor = 'Unknown Author';
      const chapterHrefs: string[] = [];

      if (opfEntry) {
        const opfXml = opfEntry.getData().toString('utf-8');

        const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (titleMatch && titleMatch[1]) bookTitle = titleMatch[1].trim();

        const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
        if (authorMatch && authorMatch[1]) bookAuthor = authorMatch[1].trim();

        // Build manifest map id -> href
        const manifestMap = new Map<string, string>();
        const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
          manifestMap.set(itemMatch[1], itemMatch[2]);
        }

        // Parse spine itemrefs
        const spineRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
        let spineMatch;
        while ((spineMatch = spineRegex.exec(opfXml)) !== null) {
          const href = manifestMap.get(spineMatch[1]);
          if (href && (href.endsWith('.xhtml') || href.endsWith('.html') || href.endsWith('.htm') || href.endsWith('.xml'))) {
            chapterHrefs.push(basePath ? path.join(basePath, href).replace(/\\/g, '/') : href);
          }
        }
      }

      // Fallback: If no spine parsed, grab all html/xhtml entries sorted by name
      if (chapterHrefs.length === 0) {
        entries
          .filter((e) => !e.isDirectory && (e.entryName.endsWith('.xhtml') || e.entryName.endsWith('.html')))
          .sort((a, b) => a.entryName.localeCompare(b.entryName))
          .forEach((e) => chapterHrefs.push(e.entryName));
      }

      // 3. Extract text from chapters
      interface Chapter {
        title?: string;
        paragraphs: string[];
      }

      const chapters: Chapter[] = [];
      let fullTextBuffer = '';

      for (const href of chapterHrefs) {
        const entry = entries.find((e) => e.entryName === href || e.entryName.endsWith(href));
        if (!entry) continue;

        const rawHtml = entry.getData().toString('utf-8');
        // Clean out styles and scripts
        const withoutScripts = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Extract chapter heading
        const hMatch = withoutScripts.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
        const chapterTitle = hMatch ? hMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

        // Split paragraphs
        const pRegex = /<(?:p|div|li)[^>]*>(.*?)<\/(?:p|div|li)>/gi;
        let pMatch;
        const paragraphs: string[] = [];

        while ((pMatch = pRegex.exec(withoutScripts)) !== null) {
          const cleaned = pMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();

          if (cleaned.length > 0) {
            paragraphs.push(cleaned);
          }
        }

        // If no <p> tags, fallback to naive tag strip
        if (paragraphs.length === 0) {
          const rawStripped = withoutScripts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (rawStripped) paragraphs.push(rawStripped);
        }

        if (paragraphs.length > 0 || chapterTitle) {
          chapters.push({ title: chapterTitle, paragraphs });
          if (chapterTitle) fullTextBuffer += `\n\n=== ${chapterTitle} ===\n\n`;
          fullTextBuffer += paragraphs.join('\n\n') + '\n\n';
        }
      }

      // TXT Output
      if (outputFormat === 'txt') {
        const storageName = generateStorageFileName('txt');
        const outputPath = path.join(outputDir, storageName);
        const outputName = buildOutputDisplayName(file.metadata.originalName, 'txt');
        await fs.promises.writeFile(outputPath, `${bookTitle}\nBy: ${bookAuthor}\n\n${fullTextBuffer}`, 'utf-8');
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

      // PDF Output
      const storageName = generateStorageFileName('pdf');
      const outputPath = path.join(outputDir, storageName);
      const outputName = buildOutputDisplayName(file.metadata.originalName, 'pdf');

      return await new Promise<ConversionResult>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 54, bottom: 54, left: 54, right: 54 },
          bufferPages: true,
          info: {
            Title: bookTitle,
            Author: bookAuthor,
            Producer: 'ConvertX Universal E-Book Engine',
          },
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // --- Cover Page ---
        doc.moveDown(4);
        doc.fontSize(28).font('Helvetica-Bold').fillColor('#0f172a').text(bookTitle, { align: 'center' });
        doc.moveDown(1.5);
        doc.fontSize(16).font('Helvetica').fillColor('#475569').text(`By ${bookAuthor}`, { align: 'center' });
        doc.moveDown(4);
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#94a3b8').text('Formatted & Converted by ConvertX', { align: 'center' });

        // --- Chapters ---
        for (let i = 0; i < chapters.length; i++) {
          const chap = chapters[i];
          doc.addPage();

          if (chap.title) {
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text(chap.title, { align: 'left' });
            doc.moveDown(1);
          }

          doc.fontSize(11).font('Helvetica').fillColor('#1e293b').lineGap(4);

          for (const para of chap.paragraphs) {
            doc.text(para, {
              align: 'justify',
              lineGap: 4,
              paragraphGap: 8,
            });
          }
        }

        // Add page numbers in footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          if (i > range.start) {
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(
              `Page ${i + 1} of ${range.count}`,
              54,
              doc.page.height - 40,
              { align: 'center', width: doc.page.width - 108 }
            );
          }
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
              pageCount: range.count,
              conversionTimeMs: Date.now() - startTime,
            });
          } catch (e) {
            reject(e);
          }
        });

        writeStream.on('error', (err) => reject(err));
      });
    } catch (err) {
      logger.error(`EpubToPdfConverter error for ${file.fileId}: ${err}`);
      throw new Error(`EPUB conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
