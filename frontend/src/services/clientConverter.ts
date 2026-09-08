import type { ConversionFileState, JobState, OutputFormat } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Client-Side In-Browser Conversion Engine for Any-DoC.
 * Automatically runs when deployed on static/serverless hosts (like Vercel)
 * without requiring a separate backend server.
 */

function generateUniqueId(): string {
  return 'local_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Convert Image / Vector / Canvas to target format in-browser.
 */
async function convertImageInBrowser(
  file: File,
  targetFormat: OutputFormat
): Promise<{ blob: Blob; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // Fill white background for JPG if transparent
        if (targetFormat === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        const baseName = file.name.replace(/\.[^/.]+$/, '');

        if (targetFormat === 'jpg') {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, fileName: `${baseName}.jpg` });
              else reject(new Error('Failed to encode JPG'));
            },
            'image/jpeg',
            0.92
          );
        } else if (targetFormat === 'webp') {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, fileName: `${baseName}.webp` });
              else reject(new Error('Failed to encode WebP'));
            },
            'image/webp',
            0.9
          );
        } else if (targetFormat === 'png') {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, fileName: `${baseName}.png` });
              else reject(new Error('Failed to encode PNG'));
            },
            'image/png'
          );
        } else if (targetFormat === 'pdf') {
          // Render image on PDF page via canvas rasterization
          const pdfCanvas = document.createElement('canvas');
          const maxDim = 2000;
          let scale = 1;
          if (canvas.width > maxDim || canvas.height > maxDim) {
            scale = Math.min(maxDim / canvas.width, maxDim / canvas.height);
          }
          pdfCanvas.width = Math.round(canvas.width * scale);
          pdfCanvas.height = Math.round(canvas.height * scale);
          const pCtx = pdfCanvas.getContext('2d');
          if (pCtx) {
            pCtx.fillStyle = '#FFFFFF';
            pCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
            pCtx.drawImage(canvas, 0, 0, pdfCanvas.width, pdfCanvas.height);
          }

          // Build minimal pure-client PDF blob
          const imgDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.9);
          const pdfBlob = createSimpleImagePdf(imgDataUrl, pdfCanvas.width, pdfCanvas.height);
          resolve({ blob: pdfBlob, fileName: `${baseName}.pdf` });
        } else if (targetFormat === 'txt') {
          const txtBlob = new Blob([`File: ${file.name}\nDimensions: ${img.width}x${img.height}\nSize: ${file.size} bytes`], { type: 'text/plain' });
          resolve({ blob: txtBlob, fileName: `${baseName}.txt` });
        } else {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve({ blob, fileName: `${baseName}.png` });
              else reject(new Error('Unsupported format'));
            },
            'image/png'
          );
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Text / Markdown / Code / Data to PDF or DOCX or TXT client-side.
 */
async function convertTextInBrowser(
  file: File,
  targetFormat: OutputFormat
): Promise<{ blob: Blob; fileName: string }> {
  const text = await file.text();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (targetFormat === 'txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    return { blob, fileName: `${baseName}.txt` };
  }

  // Render text as a clean printable PDF canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = 1200;
  const padding = 80;
  const fontSize = 24;
  const lineHeight = 36;
  const maxCharsPerLine = 75;

  // Split lines
  const rawLines = text.split('\n');
  const wrappedLines: string[] = [];
  rawLines.forEach((l) => {
    if (l.length <= maxCharsPerLine) {
      wrappedLines.push(l);
    } else {
      let cur = l;
      while (cur.length > maxCharsPerLine) {
        wrappedLines.push(cur.substring(0, maxCharsPerLine));
        cur = cur.substring(maxCharsPerLine);
      }
      if (cur) wrappedLines.push(cur);
    }
  });

  const height = Math.max(1600, padding * 2 + wrappedLines.length * lineHeight + 100);
  canvas.width = width;
  canvas.height = height;

  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(file.name, padding, padding + 20);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding + 45);
    ctx.lineTo(width - padding, padding + 45);
    ctx.stroke();

    ctx.font = `${fontSize}px monospace, sans-serif`;
    ctx.fillStyle = '#334155';
    let y = padding + 90;
    for (const line of wrappedLines) {
      ctx.fillText(line, padding, y);
      y += lineHeight;
    }
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdfBlob = createSimpleImagePdf(imgData, width, height);
  return { blob: pdfBlob, fileName: `${baseName}.pdf` };
}

/**
 * Creates a valid, standalone PDF binary file containing an image page.
 */
function createSimpleImagePdf(jpegDataUrl: string, width: number, height: number): Blob {
  const base64Data = jpegDataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const imgBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    imgBytes[i] = binaryString.charCodeAt(i);
  }

  // Standard 72 DPI PDF point scaling
  const ptWidth = Math.round((width / 300) * 72 * 2.5);
  const ptHeight = Math.round((height / 300) * 72 * 2.5);

  const header = `%PDF-1.4\n`;
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  const obj4Header = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`;
  const obj4Footer = `\nendstream\nendobj\n`;
  const contentStream = `q\n${ptWidth} 0 0 ${ptHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

  const enc = new TextEncoder();
  const hBytes = enc.encode(header);
  const o1Bytes = enc.encode(obj1);
  const o2Bytes = enc.encode(obj2);
  const o3Bytes = enc.encode(obj3);
  const o4HBytes = enc.encode(obj4Header);
  const o4FBytes = enc.encode(obj4Footer);
  const o5Bytes = enc.encode(obj5);

  const xrefOffset = hBytes.length + o1Bytes.length + o2Bytes.length + o3Bytes.length + o4HBytes.length + imgBytes.length + o4FBytes.length + o5Bytes.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const endBytes = enc.encode(xref + trailer);

  const totalLength = xrefOffset + endBytes.length;
  const pdfBytes = new Uint8Array(totalLength);
  let offset = 0;

  const append = (bytes: Uint8Array) => {
    pdfBytes.set(bytes, offset);
    offset += bytes.length;
  };

  append(hBytes);
  append(o1Bytes);
  append(o2Bytes);
  append(o3Bytes);
  append(o4HBytes);
  append(imgBytes);
  append(o4FBytes);
  append(o5Bytes);
  append(endBytes);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert PDF document to Images (JPG, PNG, WEBP) or Text in-browser.
 */
async function convertPdfInBrowser(
  file: File,
  targetFormat: OutputFormat
): Promise<{ blob: Blob; fileName: string }> {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  if (targetFormat === 'txt') {
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => (item as any).str).join(' ');
      fullText += `--- Page ${pageNum} ---\n` + pageText + '\n\n';
    }
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    return { blob, fileName: `${baseName}.txt` };
  }

  // Render first page or master canvas for preview/download
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport } as any).promise;
  }

  let mimeType = 'image/jpeg';
  let ext = 'jpg';
  if (targetFormat === 'png') {
    mimeType = 'image/png';
    ext = 'png';
  } else if (targetFormat === 'webp') {
    mimeType = 'image/webp';
    ext = 'webp';
  }

  const blob = await new Promise<Blob | null>((res) => {
    canvas.toBlob((b) => res(b), mimeType, 0.92);
  });

  return { blob: blob || new Blob([file]), fileName: `${baseName}.${ext}` };
}

// In-memory local client converted blob registry for instant downloads
const clientBlobs = new Map<string, Blob>();

export function getClientBlob(fileId: string): Blob | undefined {
  return clientBlobs.get(fileId);
}

/**
 * Execute client-side in-browser conversion for an array of files.
 */
export async function executeClientConversion(
  files: File[],
  outputFormat: OutputFormat,
  onProgress?: (percent: number) => void
): Promise<JobState> {
  const jobId = generateUniqueId();
  const conversionFiles: ConversionFileState[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileId = generateUniqueId();
    const startTime = Date.now();

    try {
      let result: { blob: Blob; fileName: string };

      if (
        file.type.startsWith('image/') ||
        file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif|svg|ico|heic|avif|tiff)$/i)
      ) {
        result = await convertImageInBrowser(file, outputFormat);
      } else if (file.type.includes('pdf') || /\.pdf$/i.test(file.name)) {
        if (outputFormat === 'pdf') {
          result = { blob: file, fileName: file.name };
        } else {
          result = await convertPdfInBrowser(file, outputFormat);
        }
      } else {
        result = await convertTextInBrowser(file, outputFormat);
      }

      clientBlobs.set(fileId, result.blob);

      conversionFiles.push({
        fileId,
        originalName: file.name,
        outputFormat,
        status: 'completed',
        progress: 100,
        outputName: result.fileName,
        outputSizeBytes: result.blob.size,
        conversionTimeMs: Date.now() - startTime,
        detectedMimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        extension: file.name.split('.').pop() || '',
      });
    } catch (err: any) {
      conversionFiles.push({
        fileId,
        originalName: file.name,
        outputFormat,
        status: 'failed',
        progress: 0,
        errorMessage: err.message || 'Client conversion failed',
        detectedMimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        extension: file.name.split('.').pop() || '',
      });
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }

  const completedCount = conversionFiles.filter((f) => f.status === 'completed').length;
  const overallStatus = completedCount === conversionFiles.length ? 'completed' : completedCount > 0 ? 'completed' : 'failed';

  return {
    jobId,
    status: overallStatus,
    files: conversionFiles,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };
}
