import { ConversionEngine } from './ConversionEngine';
import { ImageConverter } from './ImageConverter';
import { TextToPdfConverter } from './TextToPdfConverter';
import { OfficeToPdfConverter } from './OfficeToPdfConverter';
import { PdfToImageConverter } from './PdfToImageConverter';
import { PdfToDocxConverter } from './PdfToDocxConverter';
import { EpubToPdfConverter } from './EpubToPdfConverter';
import { ZipInspectorConverter } from './ZipInspectorConverter';
import { MarkdownAndDocxConverter } from './MarkdownAndDocxConverter';
import { DataConverter } from './DataConverter';
import { ConversionFile, OutputFormat, SupportedFormat } from '../types';
import { logger } from '../utils/logger';

// All registered converters, in priority order
const converters: ConversionEngine[] = [
  new PdfToDocxConverter(),       // PDF → DOCX / TXT
  new PdfToImageConverter(),      // PDF → JPG / PNG
  new EpubToPdfConverter(),       // EPUB → PDF / TXT
  new ZipInspectorConverter(),    // ZIP → PDF / TXT
  new MarkdownAndDocxConverter(), // MD/TXT → DOCX
  new ImageConverter(),           // Images (including HEIC/HEIF/SVG/ICO) → PDF / JPG / PNG / WEBP
  new DataConverter(),            // JSON/CSV/XML/YAML → PDF / JPG / PNG
  new OfficeToPdfConverter(),     // Office docs → PDF / JPG / PNG
  new TextToPdfConverter(),       // Text/Code/MD/CSV → PDF / JPG / PNG
];

/**
 * Find the appropriate converter for a given file and output format.
 * Returns null if no converter can handle this combination.
 */
export function findConverter(file: ConversionFile): ConversionEngine | null {
  const mime = file.metadata.detectedMimeType.toLowerCase();
  const ext = file.metadata.extension.toLowerCase();
  const category = file.metadata.category;
  const outputFormat = file.outputFormat;

  // 1. Strict category routing for IMAGE files (magic bytes identified as PNG/JPG/WEBP/GIF/BMP/TIFF/HEIC)
  if (category === 'IMAGE' || mime.startsWith('image/') || ext === 'heic' || ext === 'heif') {
    const imgConverter = converters.find((c) => c.name === 'ImageConverter');
    if (imgConverter && imgConverter.supportedOutputFormats.includes(outputFormat)) {
      logger.info(`[ROUTING] File ${file.metadata.originalName} categorized as IMAGE (${mime}). Routing directly to ImageConverter.`);
      return imgConverter;
    }
  }

  // 2. Strict category routing for PDF files (can go to DOCX, TXT, or Image)
  if (category === 'PDF' || mime === 'application/pdf') {
    const pdfConverter = converters.find(
      (c) =>
        (c.name === 'PdfToDocxConverter' || c.name === 'PdfToImageConverter') &&
        c.supportedOutputFormats.includes(outputFormat)
    );
    if (pdfConverter) {
      logger.info(`[ROUTING] File ${file.metadata.originalName} categorized as PDF (${mime}) → ${outputFormat}. Routing to ${pdfConverter.name}.`);
      return pdfConverter;
    }
  }

  // 3. EPUB E-Books
  if (category === 'EBOOK' || mime.includes('epub') || ext === 'epub') {
    const epubConverter = converters.find((c) => c.name === 'EpubToPdfConverter');
    if (epubConverter && epubConverter.supportedOutputFormats.includes(outputFormat)) {
      logger.info(`[ROUTING] File ${file.metadata.originalName} categorized as EBOOK (${mime}). Routing to EpubToPdfConverter.`);
      return epubConverter;
    }
  }

  // 4. ZIP Archives
  if (category === 'ARCHIVE' || mime.includes('zip') || ext === 'zip') {
    const zipConverter = converters.find((c) => c.name === 'ZipInspectorConverter');
    if (zipConverter && zipConverter.supportedOutputFormats.includes(outputFormat)) {
      logger.info(`[ROUTING] File ${file.metadata.originalName} categorized as ARCHIVE (${mime}). Routing to ZipInspectorConverter.`);
      return zipConverter;
    }
  }

  // 3. Fallback priority loop for standard MIME and extension matching
  for (const converter of converters) {
    const supportsMime = converter.supportedInputMimeTypes.includes(mime);
    const supportsExt = converter.supportedInputExtensions.includes(ext);
    const supportsOutput = converter.supportedOutputFormats.includes(outputFormat);

    if ((supportsMime || supportsExt) && supportsOutput) {
      logger.info(`Routing ${ext}/${mime} (Category: ${category}) → ${outputFormat} via ${converter.name}`);
      return converter;
    }
  }

  logger.warn(`No converter found for file=${file.metadata.originalName}, category=${category}, mime=${mime}, ext=${ext} → ${outputFormat}`);
  return null;
}

/**
 * Get all supported format metadata across all converters.
 */
export function getAllSupportedFormats(): SupportedFormat[] {
  const seen = new Set<string>();
  const formats: SupportedFormat[] = [];

  for (const converter of converters) {
    for (const format of converter.supportedFormatsMeta) {
      const key = `${format.extension}-${format.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        formats.push(format);
      }
    }
  }

  return formats;
}

/**
 * Check if a given extension+output combination is supported.
 */
export function isSupported(extension: string, outputFormat: OutputFormat): boolean {
  const ext = extension.toLowerCase();
  return converters.some(
    (c) =>
      c.supportedInputExtensions.includes(ext) &&
      c.supportedOutputFormats.includes(outputFormat)
  );
}

export { converters };
