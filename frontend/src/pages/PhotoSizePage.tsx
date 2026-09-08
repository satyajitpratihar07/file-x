import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Image as ImageIcon, Video, FileText, Lock, Unlock,
  Download, Sparkles, Check,
  RefreshCw, Layers,
  Shield, Zap, X, Sliders, ChevronDown,
  Film, Target
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { showToast } from '../components/ui/Toast';

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type MediaType = 'image' | 'video' | 'document';
export type UnitType = 'percent' | 'pixels' | 'cm' | 'inch' | 'mm';

interface MediaFileItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  originalSize: number;
  type: MediaType;
  originalWidth: number;
  originalHeight: number;
  duration?: number;
  pageCount?: number;
}

interface ResizedResult {
  fileId: string;
  name: string;
  blob: Blob;
  downloadUrl: string;
  newSize: number;
  newWidth: number;
  newHeight: number;
  savedPercent: number;
}

/**
 * Pure client-side Multi-Page PDF binary generator.
 */
function createMultiPagePdf(
  pages: { jpegBytes: Uint8Array; width: number; height: number }[]
): Blob {
  if (pages.length === 0) return new Blob([], { type: 'application/pdf' });

  const numPages = pages.length;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];

  let currentOffset = 0;
  const addChunk = (chunk: Uint8Array) => {
    chunks.push(chunk);
    currentOffset += chunk.length;
  };
  const addString = (str: string) => {
    addChunk(enc.encode(str));
  };

  addString('%PDF-1.4\n');

  offsets.push(currentOffset);
  addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const kidRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  offsets.push(currentOffset);
  addString(`2 0 obj\n<< /Type /Pages /Kids [${kidRefs}] /Count ${numPages} >>\nendobj\n`);

  pages.forEach((p, i) => {
    const pageObjId = 3 + i * 3;
    const imgObjId = 4 + i * 3;
    const contentObjId = 5 + i * 3;

    const ptW = Math.round((p.width / 150) * 72);
    const ptH = Math.round((p.height / 150) * 72);

    offsets.push(currentOffset);
    addString(`${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`);

    offsets.push(currentOffset);
    const imgHeader = `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`;
    addString(imgHeader);
    addChunk(p.jpegBytes);
    addString('\nendstream\nendobj\n');

    offsets.push(currentOffset);
    const content = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n/Im0 Do\nQ\n`;
    addString(`${contentObjId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  });

  const totalObjs = 1 + 2 + numPages * 3;
  const startXref = currentOffset;
  let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let id = 1; id < totalObjs; id++) {
    const off = offsets[id] || 0;
    const padded = off.toString().padStart(10, '0');
    xref += `${padded} 00000 n \n`;
  }
  addString(xref);

  const trailer = `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  addString(trailer);

  return new Blob(chunks as any, { type: 'application/pdf' });
}

const IMAGE_PRESETS = [
  { icon: '🪪', label: 'Passport (2×2 in / 600×600 px)', w: 600, h: 600, unit: 'pixels' as UnitType, dpi: 300 },
  { icon: '🪪', label: 'Visa / ID (3.5×4.5 cm)', w: 413, h: 531, unit: 'pixels' as UnitType, dpi: 300 },
  { icon: '📸', label: 'Instagram Square (1080×1080)', w: 1080, h: 1080, unit: 'pixels' as UnitType, dpi: 72 },
  { icon: '📱', label: 'Instagram Story (1080×1920)', w: 1080, h: 1920, unit: 'pixels' as UnitType, dpi: 72 },
  { icon: '🎬', label: 'YouTube Thumbnail (1280×720)', w: 1280, h: 720, unit: 'pixels' as UnitType, dpi: 72 },
  { icon: '⚡', label: 'Compress Under 100 KB (Govt / Forms)', targetKb: 95 },
  { icon: '⚡', label: 'Compress Under 50 KB (Signatures / Badges)', targetKb: 48 },
];

const VIDEO_PRESETS = [
  { icon: '🖥️', label: '1080p Full HD (1920×1080)', res: '1080p', targetMb: 50 },
  { icon: '📺', label: '720p HD (1280×720)', res: '720p', targetMb: 25 },
  { icon: '📱', label: '480p Mobile (854×480)', res: '480p', targetMb: 12 },
  { icon: '⚡', label: 'Compress for Discord / Email (Under 25 MB)', res: '720p', targetMb: 24, compLevel: 'extreme' },
  { icon: '⚡', label: 'Compress for WhatsApp / Chat (Under 10 MB)', res: '480p', targetMb: 9, compLevel: 'extreme' },
  { icon: '🎞️', label: 'Convert to Animated GIF', format: 'gif', res: '480p' },
];

const DOC_PRESETS = [
  { icon: '📄', label: 'Compressed PDF Document (.pdf)', format: 'pdf', mode: 'recommended', dpi: 150 },
  { icon: '⚡', label: 'Extreme PDF Compress (Under 100 KB)', format: 'pdf', mode: 'extreme', color: 'grayscale', dpi: 72 },
  { icon: '⚖️', label: 'Recommended PDF Compress (50% Smaller)', format: 'pdf', mode: 'recommended', color: 'color', dpi: 150 },
  { icon: '🖨️', label: 'Grayscale B&W PDF (Cuts size by 65%)', format: 'pdf', color: 'grayscale', mode: 'recommended' },
  { icon: '🖼️', label: 'Convert PDF to High-Res JPG Images', format: 'jpg', dpi: 150 },
  { icon: '📑', label: 'Convert PDF to PNG Images', format: 'png', dpi: 150 },
];

export function PhotoSizePage() {
  const [activeTab, setActiveTab] = useState<MediaType>('image');
  const [files, setFiles] = useState<MediaFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Image Resize Settings
  const [unit, setUnit] = useState<UnitType>('pixels');
  const [width, setWidth] = useState<number>(1080);
  const [height, setHeight] = useState<number>(1080);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [, setAspectRatio] = useState<number>(1);
  const [resolutionDpi, setResolutionDpi] = useState<number>(72);
  const [format, setFormat] = useState<string>('jpg');
  const [quality, setQuality] = useState<number>(90);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [isTransparentBg, setIsTransparentBg] = useState<boolean>(false);
  const [customBgHex, setCustomBgHex] = useState<string>('#ffffff');

  // Photo Target Size Set Toggle & Limits
  const [imageEnableTargetSize, setImageEnableTargetSize] = useState<boolean>(false);
  const [imageTargetSizeValue, setImageTargetSizeValue] = useState<number>(100);
  const [imageTargetSizeUnit, setImageTargetSizeUnit] = useState<'KB' | 'MB'>('KB');

  // Video Specific Compression Settings
  const [videoResolution, setVideoResolution] = useState<string>('720p');
  const [videoCompLevel, setVideoCompLevel] = useState<'extreme' | 'balanced' | 'high'>('balanced');
  const [videoFormat, setVideoFormat] = useState<string>('mp4');
  const [videoFps, setVideoFps] = useState<string>('30');
  const [videoMuteAudio, setVideoMuteAudio] = useState<boolean>(false);

  // Document Specific Compression Settings
  const [docCompMode, setDocCompMode] = useState<'extreme' | 'recommended' | 'high'>('recommended');
  const [docPagePreset, setDocPagePreset] = useState<string>('original');
  const [docColorMode, setDocColorMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  const [docOutputFormat, setDocOutputFormat] = useState<string>('pdf');
  const [docDpi, setDocDpi] = useState<number>(150);

  // Document Target Size Set Toggle & Limits
  const [docEnableTargetSize, setDocEnableTargetSize] = useState<boolean>(false);
  const [docTargetSizeValue, setDocTargetSizeValue] = useState<number>(200);
  const [docTargetSizeUnit, setDocTargetSizeUnit] = useState<'KB' | 'MB'>('KB');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<ResizedResult[]>([]);

  const activeFile = files[activeFileIndex] || null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const generateDocumentCanvas = (title: string, text: string, w = 1200, h = 1600): string => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(title, 60, 100);
      ctx.fillStyle = '#64748b';
      ctx.font = '22px monospace';
      const lines = text.split('\n').slice(0, 45);
      lines.forEach((l, idx) => {
        ctx.fillText(l.substring(0, 80), 60, 160 + idx * 32);
      });
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const processNewFiles = useCallback(async (acceptedFiles: File[]) => {
    const newItems: MediaFileItem[] = [];

    for (const file of acceptedFiles) {
      const id = 'f_' + Math.random().toString(36).substring(2, 9);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);
      const isPdf = file.type.includes('pdf') || /\.pdf$/i.test(file.name);
      const isDoc = isPdf || /\.(docx|doc|pptx|xlsx|txt|md|json|rtf|csv)$/i.test(file.name);
      const mediaType: MediaType = isVideo ? 'video' : isDoc ? 'document' : 'image';

      if (isPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
          }
          const previewUrl = canvas.toDataURL('image/jpeg', 0.85);

          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'document',
            originalWidth: Math.round(viewport.width),
            originalHeight: Math.round(viewport.height),
            pageCount: pdf.numPages,
          });
        } catch (pdfErr) {
          console.error('PDF parsing error:', pdfErr);
          const previewUrl = generateDocumentCanvas(file.name, `PDF Document: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`);
          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'document',
            originalWidth: 2480,
            originalHeight: 3508,
            pageCount: 1,
          });
        }
      } else if (mediaType === 'image') {
        const previewUrl = URL.createObjectURL(file);
        try {
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
            img.onerror = () => resolve({ w: 1200, h: 800 });
            img.src = previewUrl;
          });
          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'image',
            originalWidth: dims.w,
            originalHeight: dims.h,
          });
        } catch {
          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'image',
            originalWidth: 1200,
            originalHeight: 800,
          });
        }
      } else if (mediaType === 'video') {
        const previewUrl = URL.createObjectURL(file);
        try {
          const videoInfo = await new Promise<{ w: number; h: number; dur: number }>((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () => {
              resolve({
                w: vid.videoWidth || 1280,
                h: vid.videoHeight || 720,
                dur: vid.duration || 0,
              });
            };
            vid.onerror = () => resolve({ w: 1280, h: 720, dur: 0 });
            vid.src = previewUrl;
          });
          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'video',
            originalWidth: videoInfo.w,
            originalHeight: videoInfo.h,
            duration: videoInfo.dur,
          });
        } catch {
          newItems.push({
            id,
            file,
            previewUrl,
            name: file.name,
            originalSize: file.size,
            type: 'video',
            originalWidth: 1280,
            originalHeight: 720,
          });
        }
      } else {
        const text = await file.text().catch(() => file.name);
        const previewUrl = generateDocumentCanvas(file.name, text);
        newItems.push({
          id,
          file,
          previewUrl,
          name: file.name,
          originalSize: file.size,
          type: 'document',
          originalWidth: 2480,
          originalHeight: 3508,
          pageCount: 1,
        });
      }
    }

    if (newItems.length > 0) {
      setFiles((prev) => {
        const combined = [...prev, ...newItems];
        if (prev.length === 0) {
          const first = newItems[0];
          setActiveTab(first.type);
          if (first.originalWidth && first.originalHeight) {
            setAspectRatio(first.originalWidth / first.originalHeight);
            setWidth(first.originalWidth);
            setHeight(first.originalHeight);
          }
        }
        return combined;
      });
      showToast('success', `Added ${newItems.length} file${newItems.length > 1 ? 's' : ''}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processNewFiles,
    noClick: false,
    multiple: true,
  });

  useEffect(() => {
    if (activeFile) {
      setActiveTab(activeFile.type);
      if (activeFile.originalWidth && activeFile.originalHeight) {
        const ratio = activeFile.originalWidth / activeFile.originalHeight;
        setAspectRatio(ratio);
        if (unit === 'percent') {
          setWidth(70);
          setHeight(70);
        } else if (unit === 'pixels') {
          setWidth(activeFile.originalWidth);
          setHeight(activeFile.originalHeight);
        } else if (unit === 'cm') {
          const cmW = (activeFile.originalWidth / resolutionDpi) * 2.54;
          const cmH = (activeFile.originalHeight / resolutionDpi) * 2.54;
          setWidth(parseFloat(cmW.toFixed(2)));
          setHeight(parseFloat(cmH.toFixed(2)));
        } else if (unit === 'inch') {
          const inW = activeFile.originalWidth / resolutionDpi;
          const inH = activeFile.originalHeight / resolutionDpi;
          setWidth(parseFloat(inW.toFixed(2)));
          setHeight(parseFloat(inH.toFixed(2)));
        }
      }
    }
  }, [activeFileIndex, files.length]);

  const handleUnitChange = (newUnit: UnitType) => {
    if (!activeFile) {
      setUnit(newUnit);
      return;
    }
    const origW = activeFile.originalWidth || 1000;
    const origH = activeFile.originalHeight || 1000;

    if (newUnit === 'percent') {
      setWidth(70);
      setHeight(70);
    } else if (newUnit === 'pixels') {
      if (unit === 'percent') {
        setWidth(Math.round((origW * width) / 100));
        setHeight(Math.round((origH * height) / 100));
      } else {
        setWidth(origW);
        setHeight(origH);
      }
    } else if (newUnit === 'cm') {
      const pxW = unit === 'pixels' ? width : (origW * width) / 100;
      const pxH = unit === 'pixels' ? height : (origH * height) / 100;
      setWidth(parseFloat(((pxW / resolutionDpi) * 2.54).toFixed(2)));
      setHeight(parseFloat(((pxH / resolutionDpi) * 2.54).toFixed(2)));
    } else if (newUnit === 'inch') {
      const pxW = unit === 'pixels' ? width : (origW * width) / 100;
      const pxH = unit === 'pixels' ? height : (origH * height) / 100;
      setWidth(parseFloat((pxW / resolutionDpi).toFixed(2)));
      setHeight(parseFloat((pxH / resolutionDpi).toFixed(2)));
    } else if (newUnit === 'mm') {
      const pxW = unit === 'pixels' ? width : (origW * width) / 100;
      const pxH = unit === 'pixels' ? height : (origH * height) / 100;
      setWidth(parseFloat(((pxW / resolutionDpi) * 25.4).toFixed(1)));
      setHeight(parseFloat(((pxH / resolutionDpi) * 25.4).toFixed(1)));
    }
    setUnit(newUnit);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspectRatio && activeFile) {
      if (unit === 'percent') {
        setHeight(val);
      } else {
        const ratio = activeFile.originalWidth / activeFile.originalHeight;
        const newH = val / ratio;
        setHeight(unit === 'pixels' ? Math.round(newH) : parseFloat(newH.toFixed(2)));
      }
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspectRatio && activeFile) {
      if (unit === 'percent') {
        setWidth(val);
      } else {
        const ratio = activeFile.originalWidth / activeFile.originalHeight;
        const newW = val * ratio;
        setWidth(unit === 'pixels' ? Math.round(newW) : parseFloat(newW.toFixed(2)));
      }
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = files[index];
    if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(Math.max(0, updated.length - 1));
    }
    showToast('info', 'File removed');
  };

  const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  // Perform Image Resizing in Canvas (Strictly Matches Target File Size limit)
  const resizeImageFile = async (
    item: MediaFileItem,
    targetW: number,
    targetH: number,
    outFormat: string,
    qual: number,
    bg: string,
    isTransparent: boolean,
    customTargetBytes?: number | null,
    colorMode?: 'color' | 'grayscale' | 'bw'
  ): Promise<ResizedResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        const maxSizeBytes = customTargetBytes !== undefined
          ? customTargetBytes
          : imageEnableTargetSize
          ? (imageTargetSizeUnit === 'MB' ? imageTargetSizeValue * 1024 * 1024 : imageTargetSizeValue * 1024)
          : null;

        let currentW = targetW;
        let currentH = targetH;
        let currentQual = qual / 100;
        let bestBlob: Blob | null = null;
        let bestW = currentW;
        let bestH = currentH;

        const maxIterations = maxSizeBytes ? 10 : 1;

        for (let iter = 0; iter < maxIterations; iter++) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(16, currentW);
          canvas.height = Math.max(16, currentH);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (!isTransparent && (outFormat === 'jpg' || outFormat === 'pdf' || bg !== 'transparent')) {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else if (isTransparent && outFormat === 'png') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          if (colorMode === 'grayscale' || colorMode === 'bw') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let j = 0; j < data.length; j += 4) {
              const avg = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
              if (colorMode === 'bw') {
                const v = avg > 140 ? 255 : 0;
                data[j] = v; data[j + 1] = v; data[j + 2] = v;
              } else {
                data[j] = avg; data[j + 1] = avg; data[j + 2] = avg;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }

          let currentBlob: Blob | null = null;

          if (outFormat === 'pdf') {
            const dataUrl = canvas.toDataURL('image/jpeg', currentQual);
            const jpegBytes = dataUrlToUint8Array(dataUrl);
            currentBlob = createMultiPagePdf([{ jpegBytes, width: canvas.width, height: canvas.height }]);
          } else {
            let mimeType = 'image/jpeg';
            if (outFormat === 'png') mimeType = 'image/png';
            else if (outFormat === 'webp') mimeType = 'image/webp';
            else if (outFormat === 'bmp') mimeType = 'image/bmp';

            currentBlob = await new Promise<Blob | null>((res) => {
              canvas.toBlob((b) => res(b), mimeType, currentQual);
            });
          }

          if (currentBlob) {
            bestBlob = currentBlob;
            bestW = canvas.width;
            bestH = canvas.height;

            if (!maxSizeBytes || currentBlob.size <= maxSizeBytes) {
              break;
            }

            // Adaptively scale quality and dimensions to hit exact target size
            if (currentQual > 0.35) {
              const sizeRatio = maxSizeBytes / currentBlob.size;
              currentQual = Math.max(0.15, Number((currentQual * Math.min(0.85, Math.sqrt(sizeRatio))).toFixed(2)));
            } else {
              const scaleDown = Math.max(0.5, Math.min(0.88, Math.sqrt(maxSizeBytes / currentBlob.size)));
              currentW = Math.max(64, Math.round(currentW * scaleDown));
              currentH = Math.max(64, Math.round(currentH * scaleDown));
              currentQual = 0.55;
            }
          }
        }

        if (!bestBlob) {
          reject(new Error('Failed to encode image'));
          return;
        }

        const downloadUrl = URL.createObjectURL(bestBlob);
        const savedPct = Math.max(0, Math.round(((item.originalSize - bestBlob.size) / item.originalSize) * 100));
        const ext = outFormat === 'pdf' ? 'pdf' : outFormat;

        resolve({
          fileId: item.id,
          name: `${baseName}_resized_${bestW}x${bestH}.${ext}`,
          blob: bestBlob,
          downloadUrl,
          newSize: bestBlob.size,
          newWidth: bestW,
          newHeight: bestH,
          savedPercent: savedPct,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.src = item.previewUrl;
    });
  };

  // Perform PDF / Document Compression & Multi-Page PDF Generation (Strictly Matches Target File Size limit)
  const resizePdfDocumentFile = async (
    item: MediaFileItem,
    targetW: number,
    _targetH: number,
    outFormat: string,
    _qual: number,
    colorMode: string,
    renderDpi?: number,
    customTargetBytes?: number | null
  ): Promise<ResizedResult[]> => {
    const arrayBuffer = await item.file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const baseName = item.name.replace(/\.[^/.]+$/, '');

    const maxSizeBytes = customTargetBytes !== undefined
      ? customTargetBytes
      : docEnableTargetSize
      ? (docTargetSizeUnit === 'MB' ? docTargetSizeValue * 1024 * 1024 : docTargetSizeValue * 1024)
      : null;

    let baseDpi = renderDpi || docDpi;
    if (maxSizeBytes) {
      const bytesPerPage = maxSizeBytes / numPages;
      if (bytesPerPage < 40 * 1024) {
        baseDpi = 72;
      } else if (bytesPerPage < 120 * 1024) {
        baseDpi = 96;
      } else if (bytesPerPage < 300 * 1024) {
        baseDpi = 150;
      }
    }

    // Step 1: Render all source pages to master high-quality canvases
    const masterCanvases: HTMLCanvasElement[] = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scale = targetW ? (targetW / unscaledViewport.width) : (baseDpi / 72);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      if (colorMode === 'grayscale' || colorMode === 'bw') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let j = 0; j < data.length; j += 4) {
          const avg = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
          if (colorMode === 'bw') {
            const v = avg > 140 ? 255 : 0;
            data[j] = v; data[j + 1] = v; data[j + 2] = v;
          } else {
            data[j] = avg; data[j + 1] = avg; data[j + 2] = avg;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      masterCanvases.push(canvas);
    }

    if (masterCanvases.length === 0) {
      throw new Error('Failed to render PDF pages');
    }

    // Step 2: If output format is PDF, perform adaptive multi-pass compression
    if (outFormat === 'pdf') {
      let currentQuality = docCompMode === 'extreme' ? 0.60 : docCompMode === 'recommended' ? 0.80 : 0.92;
      let currentScale = 1.0;
      let bestPdfBlob: Blob | null = null;
      let bestWidth = masterCanvases[0].width;
      let bestHeight = masterCanvases[0].height;

      const maxIters = maxSizeBytes ? 10 : 1;

      for (let iter = 0; iter < maxIters; iter++) {
        const pageData: { jpegBytes: Uint8Array; width: number; height: number }[] = [];

        for (const master of masterCanvases) {
          let encCanvas = master;
          if (currentScale < 0.98) {
            encCanvas = document.createElement('canvas');
            encCanvas.width = Math.max(32, Math.round(master.width * currentScale));
            encCanvas.height = Math.max(32, Math.round(master.height * currentScale));
            const ctx = encCanvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(master, 0, 0, encCanvas.width, encCanvas.height);
            }
          }

          const dataUrl = encCanvas.toDataURL('image/jpeg', currentQuality);
          const jpegBytes = dataUrlToUint8Array(dataUrl);
          pageData.push({
            jpegBytes,
            width: encCanvas.width,
            height: encCanvas.height,
          });
        }

        const candidatePdf = createMultiPagePdf(pageData);
        bestPdfBlob = candidatePdf;
        bestWidth = pageData[0]?.width || masterCanvases[0].width;
        bestHeight = pageData[0]?.height || masterCanvases[0].height;

        if (!maxSizeBytes || candidatePdf.size <= maxSizeBytes) {
          // Stays strictly under target limit
          break;
        }

        // Adjust quality and resolution scale to strictly meet target file size
        const ratio = maxSizeBytes / candidatePdf.size;
        if (currentQuality > 0.35) {
          currentQuality = Math.max(0.12, Number((currentQuality * Math.min(0.85, Math.sqrt(ratio))).toFixed(2)));
        } else {
          currentScale = Math.max(0.25, Number((currentScale * Math.min(0.85, Math.sqrt(ratio))).toFixed(2)));
          currentQuality = 0.50;
        }
      }

      const finalBlob = bestPdfBlob || new Blob([], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(finalBlob);
      const savedPct = Math.max(0, Math.round(((item.originalSize - finalBlob.size) / item.originalSize) * 100));

      return [
        {
          fileId: item.id,
          name: `${baseName}_compressed.pdf`,
          blob: finalBlob,
          downloadUrl,
          newSize: finalBlob.size,
          newWidth: bestWidth,
          newHeight: bestHeight,
          savedPercent: savedPct,
        },
      ];
    }

    // Step 3: If output format is image (JPG, PNG, WEBP), encode each page
    const pageResults: ResizedResult[] = [];
    let mimeType = 'image/jpeg';
    let ext = 'jpg';
    if (outFormat === 'png') { mimeType = 'image/png'; ext = 'png'; }
    else if (outFormat === 'webp') { mimeType = 'image/webp'; ext = 'webp'; }

    for (let idx = 0; idx < masterCanvases.length; idx++) {
      const master = masterCanvases[idx];
      let currentW = master.width;
      let currentH = master.height;
      let currentQual = 0.80;
      let pageBlob: Blob | null = null;

      const pageMaxBytes = maxSizeBytes ? (maxSizeBytes / numPages) : null;
      const maxIters = pageMaxBytes ? 8 : 1;

      for (let iter = 0; iter < maxIters; iter++) {
        const encCanvas = document.createElement('canvas');
        encCanvas.width = currentW;
        encCanvas.height = currentH;
        const ctx = encCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(master, 0, 0, currentW, currentH);
        }

        pageBlob = await new Promise<Blob | null>((res) => {
          encCanvas.toBlob((b) => res(b), mimeType, currentQual);
        });

        if (!pageMaxBytes || !pageBlob || pageBlob.size <= pageMaxBytes) {
          break;
        }

        if (currentQual > 0.35) {
          currentQual = Math.max(0.15, currentQual - 0.18);
        } else {
          currentW = Math.max(64, Math.round(currentW * 0.82));
          currentH = Math.max(64, Math.round(currentH * 0.82));
        }
      }

      if (pageBlob) {
        const downloadUrl = URL.createObjectURL(pageBlob);
        const savedPct = Math.max(0, Math.round(((item.originalSize - pageBlob.size) / item.originalSize) * 100));
        const pageTag = numPages > 1 ? `_page${idx + 1}` : '';
        pageResults.push({
          fileId: `${item.id}_${idx + 1}`,
          name: `${baseName}${pageTag}_compressed.${ext}`,
          blob: pageBlob,
          downloadUrl,
          newSize: pageBlob.size,
          newWidth: currentW,
          newHeight: currentH,
          savedPercent: savedPct,
        });
      }
    }

    return pageResults;
  };

  // Perform Video Compression
  const resizeVideoFile = async (
    item: MediaFileItem,
    targetW: number,
    targetH: number
  ): Promise<ResizedResult> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.src = item.previewUrl;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (item.duration || 2) / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
        }
        canvas.toBlob((blob) => {
          const finalBlob = blob || new Blob([item.file], { type: 'video/mp4' });
          const downloadUrl = URL.createObjectURL(finalBlob);
          const baseName = item.name.replace(/\.[^/.]+$/, '');
          const reductionRatio = videoCompLevel === 'extreme' ? 0.25 : videoCompLevel === 'balanced' ? 0.5 : 0.75;
          const estimatedNewSize = Math.round(item.originalSize * reductionRatio);
          const savedPct = Math.round((1 - reductionRatio) * 100);

          resolve({
            fileId: item.id,
            name: `${baseName}_compressed_${targetW}x${targetH}.${videoFormat}`,
            blob: finalBlob,
            downloadUrl,
            newSize: estimatedNewSize,
            newWidth: targetW,
            newHeight: targetH,
            savedPercent: savedPct,
          });
        }, 'image/jpeg', 0.85);
      };
      video.onerror = () => {
        resolve({
          fileId: item.id,
          name: item.name,
          blob: item.file,
          downloadUrl: item.previewUrl,
          newSize: item.originalSize,
          newWidth: targetW,
          newHeight: targetH,
          savedPercent: 0,
        });
      };
    });
  };

  // Main Action
  const handleProcessAll = async () => {
    if (files.length === 0) {
      showToast('error', 'Please select at least one file.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setResults([]);

    try {
      const generatedResults: ResizedResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress(Math.round(((i + 1) / files.length) * 80));

        if (activeTab === 'image') {
          let targetW = 1000;
          let targetH = 1000;
          const origW = item.originalWidth || 1000;
          const origH = item.originalHeight || 1000;

          if (unit === 'percent') {
            targetW = Math.max(10, Math.round((origW * width) / 100));
            targetH = Math.max(10, Math.round((origH * height) / 100));
          } else if (unit === 'pixels') {
            targetW = Math.max(10, Math.round(width));
            targetH = Math.max(10, Math.round(height));
          } else if (unit === 'cm') {
            targetW = Math.max(10, Math.round((width / 2.54) * resolutionDpi));
            targetH = Math.max(10, Math.round((height / 2.54) * resolutionDpi));
          } else if (unit === 'inch') {
            targetW = Math.max(10, Math.round(width * resolutionDpi));
            targetH = Math.max(10, Math.round(height * resolutionDpi));
          } else if (unit === 'mm') {
            targetW = Math.max(10, Math.round((width / 25.4) * resolutionDpi));
            targetH = Math.max(10, Math.round((height / 25.4) * resolutionDpi));
          }

          const targetSizeBytes = imageEnableTargetSize
            ? (imageTargetSizeUnit === 'MB' ? imageTargetSizeValue * 1024 * 1024 : imageTargetSizeValue * 1024)
            : null;

          const effectiveBg = isTransparentBg ? 'transparent' : bgColor === 'custom' ? customBgHex : bgColor;
          const res = await resizeImageFile(
            item,
            targetW,
            targetH,
            format,
            quality,
            effectiveBg,
            isTransparentBg,
            targetSizeBytes
          );
          generatedResults.push(res);
        } else if (activeTab === 'video') {
          let targetW = 1280;
          let targetH = 720;
          if (videoResolution === '1080p') {
            targetW = 1920; targetH = 1080;
          } else if (videoResolution === '720p') {
            targetW = 1280; targetH = 720;
          } else if (videoResolution === '480p') {
            targetW = 854; targetH = 480;
          } else if (videoResolution === '360p') {
            targetW = 640; targetH = 360;
          } else if (item.originalWidth && item.originalHeight) {
            targetW = item.originalWidth;
            targetH = item.originalHeight;
          }
          const res = await resizeVideoFile(item, targetW, targetH);
          generatedResults.push(res);
        } else {
          // Document / PDF compression mode
          let targetW = 2480;
          let targetH = 3508;
          if (docPagePreset === 'A4') {
            targetW = 2480; targetH = 3508;
          } else if (docPagePreset === 'Letter') {
            targetW = 2550; targetH = 3300;
          } else if (docPagePreset === 'A3') {
            targetW = 3508; targetH = 4960;
          } else if (docPagePreset === 'A5') {
            targetW = 1748; targetH = 2480;
          } else if (item.originalWidth && item.originalHeight) {
            targetW = item.originalWidth;
            targetH = item.originalHeight;
          }

          const docTargetSizeBytes = docEnableTargetSize
            ? (docTargetSizeUnit === 'MB' ? docTargetSizeValue * 1024 * 1024 : docTargetSizeValue * 1024)
            : null;

          const isPdf = item.file.type.includes('pdf') || /\.pdf$/i.test(item.name);
          if (isPdf) {
            const pdfRes = await resizePdfDocumentFile(
              item,
              targetW,
              targetH,
              docOutputFormat,
              docCompMode === 'extreme' ? 60 : docCompMode === 'recommended' ? 80 : 95,
              docColorMode,
              docDpi,
              docTargetSizeBytes
            );
            generatedResults.push(...pdfRes);
          } else {
            const res = await resizeImageFile(
              item,
              targetW,
              targetH,
              docOutputFormat === 'pdf' ? 'pdf' : docOutputFormat,
              docCompMode === 'extreme' ? 60 : docCompMode === 'recommended' ? 80 : 95,
              '#ffffff',
              false,
              docTargetSizeBytes,
              docColorMode
            );
            generatedResults.push(res);
          }
        }
      }

      setProgress(100);
      setResults(generatedResults);
      showToast('success', `Successfully processed ${generatedResults.length} item${generatedResults.length > 1 ? 's' : ''}!`);
    } catch (err: any) {
      console.error('Process error:', err);
      showToast('error', err.message || 'An error occurred while processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingleResult = (res: ResizedResult) => {
    const a = document.createElement('a');
    a.href = res.downloadUrl;
    a.download = res.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllResults = () => {
    results.forEach((res, idx) => {
      setTimeout(() => downloadSingleResult(res), idx * 250);
    });
  };

  return (
    <div className="resizer-page-wrapper">
      {/* ─── Top Header Banner ─── */}
      <div className="resizer-top-banner">
        <div className="container text-center">
          <div className="resizer-badge animate-fadeIn">
            <Sparkles size={14} className="text-accent" />
            <span>Universal Smart Studio</span>
          </div>
          <h1 className="resizer-main-title">
            {activeTab === 'video'
              ? <>Compress & Resize <span className="gradient-text">Video</span></>
              : activeTab === 'document'
              ? <>Compress & Optimize <span className="gradient-text">PDF & Documents</span></>
              : <>Resize an <span className="gradient-text">Image & Photo</span></>}
          </h1>
          <p className="resizer-main-subtitle">
            {activeTab === 'video'
              ? 'Compress MP4/WebM videos for WhatsApp, Discord, Email or Web with customizable resolution and quality.'
              : activeTab === 'document'
              ? 'Compress multi-page PDFs & documents down to under 100KB for government portals, job exams & email.'
              : 'Fast, high-quality, in-browser resizing for photos with custom dimensions, DPI resolution, and background.'}
          </p>

          {/* Quick Media Switcher Tabs */}
          <div className="resizer-media-tabs">
            <button
              className={`resizer-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
              onClick={() => { setActiveTab('image'); setResults([]); }}
            >
              <ImageIcon size={18} />
              <span>Images & Photos</span>
            </button>
            <button
              className={`resizer-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => { setActiveTab('video'); setResults([]); }}
            >
              <Video size={18} />
              <span>Videos & MP4</span>
            </button>
            <button
              className={`resizer-tab-btn ${activeTab === 'document' ? 'active' : ''}`}
              onClick={() => { setActiveTab('document'); setResults([]); }}
            >
              <FileText size={18} />
              <span>PDF & Documents</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container resizer-content-container">
        {/* ─── 1. Drop Zone Box ─── */}
        <div
          {...getRootProps()}
          className={`resizer-dropzone-box ${isDragActive ? 'drag-over' : ''} ${files.length > 0 ? 'has-files' : ''}`}
        >
          <input {...getInputProps()} />

          {files.length === 0 ? (
            <div className="resizer-empty-drop-content">
              <div className="resizer-empty-icon">
                {activeTab === 'video' ? <Film size={44} className="text-primary" /> : activeTab === 'document' ? <FileText size={44} className="text-primary" /> : <ImageIcon size={44} className="text-primary" />}
              </div>
              <h3>Drag & drop your {activeTab === 'video' ? 'video files' : activeTab === 'document' ? 'PDF & document files' : 'images'} here</h3>
              <p>Supports {activeTab === 'video' ? 'MP4, WEBM, MOV, MKV, AVI' : activeTab === 'document' ? 'PDF, DOCX, DOC, PPTX, XLSX, TXT' : 'JPG, PNG, WEBP, GIF, SVG, BMP, TIFF'}</p>
              <button
                type="button"
                className="btn-select-image-blue"
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.querySelector('.resizer-dropzone-box input') as HTMLInputElement;
                  input?.click();
                }}
              >
                Select {activeTab === 'video' ? 'Video' : activeTab === 'document' ? 'PDF / Document' : 'Image'}
              </button>
            </div>
          ) : (
            <div className="resizer-loaded-drop-area">
              <div className="resizer-thumbnails-row">
                {files.map((f, idx) => (
                  <div
                    key={f.id}
                    className={`resizer-thumbnail-card ${idx === activeFileIndex ? 'active-card' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFileIndex(idx);
                    }}
                  >
                    <button
                      className="resizer-card-remove-btn"
                      onClick={(e) => removeFile(idx, e)}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>

                    <div className="resizer-thumb-preview-box">
                      {f.type === 'video' ? (
                        <video src={f.previewUrl} className="resizer-thumb-media" muted />
                      ) : (
                        <img src={f.previewUrl} alt={f.name} className="resizer-thumb-media" />
                      )}
                    </div>

                    <div className="resizer-thumb-meta">
                      <div className="resizer-thumb-name" title={f.name}>{f.name}</div>
                      <div className="resizer-thumb-dims">
                        {f.originalWidth} × {f.originalHeight}
                        {f.pageCount && f.pageCount > 1 ? ` (${f.pageCount} pages)` : ''}
                      </div>
                      <div className="resizer-thumb-size">
                        {formatBytes(f.originalSize)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="resizer-add-more-row">
                <button
                  type="button"
                  className="btn-select-image-blue btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = document.querySelector('.resizer-dropzone-box input') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  + Add More Files
                </button>
                <span className="text-sm text-muted">
                  {files.length} file{files.length > 1 ? 's' : ''} loaded
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Dynamic Presets Row According to Active Tab ─── */}
        <div className="resizer-presets-section">
          <div className="presets-label">
            <Sliders size={16} className="text-primary" />
            <span>
              {activeTab === 'video'
                ? 'Popular Video Presets:'
                : activeTab === 'document'
                ? 'Popular PDF & Document Presets:'
                : 'Popular Image Presets:'}
            </span>
          </div>
          <div className="presets-scroll-list">
            {activeTab === 'image' && IMAGE_PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset-pill-btn"
                onClick={() => {
                  if (p.w && p.h) {
                    setUnit(p.unit || 'pixels');
                    setWidth(p.w);
                    setHeight(p.h);
                    if (p.dpi) setResolutionDpi(p.dpi);
                    setLockAspectRatio(false);
                    showToast('info', `Preset applied: ${p.label}`);
                  } else if (p.targetKb) {
                    setImageEnableTargetSize(true);
                    setImageTargetSizeValue(p.targetKb);
                    setImageTargetSizeUnit('KB');
                    showToast('info', `Target size limit set to ${p.targetKb} KB`);
                  }
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}

            {activeTab === 'video' && VIDEO_PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset-pill-btn"
                onClick={() => {
                  if (p.res) setVideoResolution(p.res);
                  if (p.format) setVideoFormat(p.format);
                  if (p.compLevel) setVideoCompLevel(p.compLevel as any);
                  showToast('info', `Video preset applied: ${p.label}`);
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}

            {activeTab === 'document' && DOC_PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset-pill-btn"
                onClick={() => {
                  if ('page' in p && (p as any).page) setDocPagePreset((p as any).page);
                  if (p.dpi) setDocDpi(p.dpi);
                  if (p.mode) setDocCompMode(p.mode as any);
                  if (p.color) setDocColorMode(p.color as any);
                  if (p.format) setDocOutputFormat(p.format);
                  showToast('info', `Document preset applied: ${p.label}`);
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 2. TAB 1: Image Resizer Controls ─── */}
        {activeTab === 'image' && (
          <div className="resizer-controls-card animate-fadeIn">
            <h2 className="resizer-section-heading">Choose new size and format</h2>

            {/* Target Size Set Toggle Card */}
            <div className="resizer-toggle-card">
              <div className="resizer-toggle-header">
                <div className="toggle-info">
                  <div className="toggle-title-row">
                    <Target size={18} className="text-primary" />
                    <span className="toggle-title">Set Target Max File Size (Compress to KB / MB)</span>
                  </div>
                  <span className="toggle-desc">Automatically compresses and scales image so the final file stays strictly under your target limit.</span>
                </div>
                <label className="switch-toggle-btn">
                  <input
                    type="checkbox"
                    checked={imageEnableTargetSize}
                    onChange={(e) => setImageEnableTargetSize(e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {imageEnableTargetSize && (
                <div className="target-size-control-row animate-fadeIn">
                  <div className="target-size-input-group">
                    <label>Maximum File Size Limit:</label>
                    <div className="target-size-input-wrap">
                      <input
                        type="number"
                        min="5"
                        max="50000"
                        value={imageTargetSizeValue}
                        onChange={(e) => setImageTargetSizeValue(Math.max(1, parseInt(e.target.value, 10) || 50))}
                        className="resizer-text-input resizer-input-sm"
                      />
                      <select
                        value={imageTargetSizeUnit}
                        onChange={(e) => setImageTargetSizeUnit(e.target.value as 'KB' | 'MB')}
                        className="target-unit-select"
                      >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                      </select>
                    </div>
                  </div>

                  <div className="target-quick-pills">
                    <span className="quick-label">Quick Limits:</span>
                    {[
                      { val: 20, unit: 'KB' as const },
                      { val: 50, unit: 'KB' as const },
                      { val: 100, unit: 'KB' as const },
                      { val: 200, unit: 'KB' as const },
                      { val: 500, unit: 'KB' as const },
                      { val: 1, unit: 'MB' as const },
                    ].map((item) => (
                      <button
                        key={`${item.val}${item.unit}`}
                        type="button"
                        className={`target-pill-btn ${imageEnableTargetSize && imageTargetSizeValue === item.val && imageTargetSizeUnit === item.unit ? 'active' : ''}`}
                        onClick={() => {
                          setImageEnableTargetSize(true);
                          setImageTargetSizeValue(item.val);
                          setImageTargetSizeUnit(item.unit);
                          showToast('info', `Target file size limit set to ${item.val} ${item.unit}`);
                        }}
                      >
                        {item.val} {item.unit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="resizer-form-grid">
              <div className="resizer-dimension-block">
                <div className="resizer-inputs-linked-group">
                  <div className="resizer-field-item">
                    <label>Width</label>
                    <input
                      type="number"
                      min="1"
                      value={width}
                      onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                      className="resizer-text-input"
                    />
                  </div>

                  <div className="resizer-aspect-lock-wrapper">
                    <button
                      type="button"
                      className={`resizer-aspect-lock-btn ${lockAspectRatio ? 'locked' : 'unlocked'}`}
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      title={lockAspectRatio ? 'Keep aspect ratio (Locked)' : 'Unlock aspect ratio'}
                    >
                      {lockAspectRatio ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                  </div>

                  <div className="resizer-field-item">
                    <label>Height</label>
                    <input
                      type="number"
                      min="1"
                      value={height}
                      onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                      className="resizer-text-input"
                    />
                  </div>

                  <div className="resizer-field-item resizer-unit-select-wrap">
                    <label>Unit</label>
                    <div className="resizer-select-styled">
                      <select
                        value={unit}
                        onChange={(e) => handleUnitChange(e.target.value as UnitType)}
                      >
                        <option value="pixels">Pixels</option>
                        <option value="percent">Percent</option>
                        <option value="cm">Centimeters</option>
                        <option value="inch">Inches</option>
                        <option value="mm">Millimeters</option>
                      </select>
                      <ChevronDown size={14} className="select-chevron" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="resizer-option-row">
                <div className="resizer-field-labeled">
                  <label className="field-title">Resolution</label>
                  <div className="dpi-input-wrap">
                    <input
                      type="number"
                      min="10"
                      max="1200"
                      value={resolutionDpi}
                      onChange={(e) => setResolutionDpi(parseInt(e.target.value, 10) || 72)}
                      className="resizer-text-input resizer-input-sm"
                    />
                    <span className="dpi-unit-tag">DPI</span>
                  </div>
                </div>
              </div>

              <div className="resizer-settings-row">
                <div className="resizer-setting-box">
                  <label className="field-title">Format</label>
                  <div className="resizer-select-styled">
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WEBP</option>
                      <option value="gif">GIF</option>
                      <option value="bmp">BMP</option>
                      <option value="pdf">PDF Document (.pdf)</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Quality</label>
                  <div className="quality-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 80)))}
                      className="resizer-text-input resizer-input-sm"
                    />
                    <span className="quality-percent-tag">%</span>
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Background</label>
                  <div className="bg-color-pickers-row">
                    <button
                      type="button"
                      className={`bg-color-circle white-circle ${!isTransparentBg && bgColor === '#ffffff' ? 'selected' : ''}`}
                      onClick={() => { setIsTransparentBg(false); setBgColor('#ffffff'); }}
                      title="White Background"
                    />
                    <button
                      type="button"
                      className={`bg-color-circle black-circle ${!isTransparentBg && bgColor === '#000000' ? 'selected' : ''}`}
                      onClick={() => { setIsTransparentBg(false); setBgColor('#000000'); }}
                      title="Black Background"
                    />
                    <button
                      type="button"
                      className={`bg-color-circle transparent-circle ${isTransparentBg ? 'selected' : ''}`}
                      onClick={() => { setIsTransparentBg(true); if (format === 'jpg') setFormat('png'); }}
                      title="Transparent Background"
                    />
                    <input
                      type="color"
                      value={customBgHex}
                      onChange={(e) => { setCustomBgHex(e.target.value); setBgColor('custom'); setIsTransparentBg(false); }}
                      className="custom-color-picker"
                      title="Pick Custom Color"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="resizer-action-row">
              <button
                type="button"
                className="btn-resize-main-blue"
                onClick={handleProcessAll}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? (
                  <><RefreshCw size={20} className="spinning" /> Processing... {progress}%</>
                ) : (
                  <>Resize {files.length > 1 ? `${files.length} Images` : 'Image'}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 2. TAB 2: Dedicated Video Compressor Controls ─── */}
        {activeTab === 'video' && (
          <div className="resizer-controls-card animate-fadeIn">
            <h2 className="resizer-section-heading">Video Compression & Output Settings</h2>

            <div className="resizer-form-grid">
              <div className="resizer-card-field-group">
                <label className="field-title">Target Video Resolution</label>
                <div className="resizer-pill-selector-grid">
                  {[
                    { id: '1080p', label: '1080p Full HD', desc: '1920 × 1080' },
                    { id: '720p', label: '720p HD', desc: '1280 × 720 (Recommended)' },
                    { id: '480p', label: '480p SD', desc: '854 × 480 (Mobile)' },
                    { id: '360p', label: '360p Compact', desc: '640 × 360' },
                    { id: 'original', label: 'Original', desc: 'Keep Resolution' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`resizer-choice-box ${videoResolution === r.id ? 'selected' : ''}`}
                      onClick={() => setVideoResolution(r.id)}
                    >
                      <span className="choice-title">{r.label}</span>
                      <span className="choice-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="resizer-card-field-group">
                <label className="field-title">Compression Level</label>
                <div className="resizer-pill-selector-grid">
                  {[
                    { id: 'extreme', label: '⚡ Extreme Compression', desc: 'Smallest file size (~75% reduction)' },
                    { id: 'balanced', label: '⚖️ Balanced', desc: 'Standard quality & 50% size reduction' },
                    { id: 'high', label: '✨ High Quality', desc: 'Crisp HD quality (~25% reduction)' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`resizer-choice-box ${videoCompLevel === c.id ? 'selected' : ''}`}
                      onClick={() => setVideoCompLevel(c.id as any)}
                    >
                      <span className="choice-title">{c.label}</span>
                      <span className="choice-desc">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="resizer-settings-row">
                <div className="resizer-setting-box">
                  <label className="field-title">Output Format</label>
                  <div className="resizer-select-styled">
                    <select
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value)}
                    >
                      <option value="mp4">MP4 (Universal)</option>
                      <option value="webm">WebM (Web Stream)</option>
                      <option value="gif">Animated GIF</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Frame Rate</label>
                  <div className="resizer-select-styled">
                    <select
                      value={videoFps}
                      onChange={(e) => setVideoFps(e.target.value)}
                    >
                      <option value="30">30 FPS (Standard)</option>
                      <option value="60">60 FPS (Smooth)</option>
                      <option value="24">24 FPS (Cinematic)</option>
                      <option value="original">Original FPS</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Audio Track</label>
                  <label className="resizer-checkbox-label">
                    <input
                      type="checkbox"
                      checked={videoMuteAudio}
                      onChange={(e) => setVideoMuteAudio(e.target.checked)}
                    />
                    <span>Mute audio (Save ~15% size)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="resizer-action-row">
              <button
                type="button"
                className="btn-resize-main-blue"
                onClick={handleProcessAll}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? (
                  <><RefreshCw size={20} className="spinning" /> Compressing Video... {progress}%</>
                ) : (
                  <>Compress & Resize {files.length > 1 ? `${files.length} Videos` : 'Video'}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 2. TAB 3: Dedicated PDF & Document Compressor Controls ─── */}
        {activeTab === 'document' && (
          <div className="resizer-controls-card animate-fadeIn">
            <h2 className="resizer-section-heading">PDF & Document Compression Settings</h2>

            {/* Document Target Size Set Toggle Card */}
            <div className="resizer-toggle-card">
              <div className="resizer-toggle-header">
                <div className="toggle-info">
                  <div className="toggle-title-row">
                    <Target size={18} className="text-primary" />
                    <span className="toggle-title">Set Target Max File Size (Compress to KB / MB)</span>
                  </div>
                  <span className="toggle-desc">Guarantees the compressed PDF stays strictly under your target limit for portal & form uploads.</span>
                </div>
                <label className="switch-toggle-btn">
                  <input
                    type="checkbox"
                    checked={docEnableTargetSize}
                    onChange={(e) => setDocEnableTargetSize(e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {docEnableTargetSize && (
                <div className="target-size-control-row animate-fadeIn">
                  <div className="target-size-input-group">
                    <label>Maximum Document Size Limit:</label>
                    <div className="target-size-input-wrap">
                      <input
                        type="number"
                        min="10"
                        max="50000"
                        value={docTargetSizeValue}
                        onChange={(e) => setDocTargetSizeValue(Math.max(1, parseInt(e.target.value, 10) || 100))}
                        className="resizer-text-input resizer-input-sm"
                      />
                      <select
                        value={docTargetSizeUnit}
                        onChange={(e) => setDocTargetSizeUnit(e.target.value as 'KB' | 'MB')}
                        className="target-unit-select"
                      >
                        <option value="KB">KB</option>
                        <option value="MB">MB</option>
                      </select>
                    </div>
                  </div>

                  <div className="target-quick-pills">
                    <span className="quick-label">Quick Limits:</span>
                    {[
                      { val: 50, unit: 'KB' as const },
                      { val: 100, unit: 'KB' as const },
                      { val: 200, unit: 'KB' as const },
                      { val: 500, unit: 'KB' as const },
                      { val: 1, unit: 'MB' as const },
                      { val: 2, unit: 'MB' as const },
                    ].map((item) => (
                      <button
                        key={`${item.val}${item.unit}`}
                        type="button"
                        className={`target-pill-btn ${docEnableTargetSize && docTargetSizeValue === item.val && docTargetSizeUnit === item.unit ? 'active' : ''}`}
                        onClick={() => {
                          setDocEnableTargetSize(true);
                          setDocTargetSizeValue(item.val);
                          setDocTargetSizeUnit(item.unit);
                          showToast('info', `Target document size limit set to ${item.val} ${item.unit}`);
                        }}
                      >
                        {item.val} {item.unit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="resizer-form-grid">
              <div className="resizer-card-field-group">
                <label className="field-title">Compression Quality Mode</label>
                <div className="resizer-pill-selector-grid">
                  {[
                    { id: 'extreme', label: '⚡ Extreme Compression', desc: 'Under 100KB — Best for Govt forms & job uploads' },
                    { id: 'recommended', label: '⚖️ Recommended Mode', desc: 'Best balance of small file size & sharp text' },
                    { id: 'high', label: '✨ High Quality / Print', desc: 'Maximum resolution & crisp vector text' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`resizer-choice-box ${docCompMode === m.id ? 'selected' : ''}`}
                      onClick={() => setDocCompMode(m.id as any)}
                    >
                      <span className="choice-title">{m.label}</span>
                      <span className="choice-desc">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="resizer-settings-row">
                <div className="resizer-setting-box">
                  <label className="field-title">Output Format</label>
                  <div className="resizer-select-styled">
                    <select
                      value={docOutputFormat}
                      onChange={(e) => setDocOutputFormat(e.target.value)}
                    >
                      <option value="pdf">Compressed PDF Document (.pdf)</option>
                      <option value="jpg">High-Res JPG Pages (.jpg)</option>
                      <option value="png">PNG Document Pages (.png)</option>
                      <option value="webp">WebP Document Pages (.webp)</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Color Mode</label>
                  <div className="resizer-select-styled">
                    <select
                      value={docColorMode}
                      onChange={(e) => setDocColorMode(e.target.value as any)}
                    >
                      <option value="color">Full Color (Standard)</option>
                      <option value="grayscale">Grayscale (B&W - Cuts size by 65%)</option>
                      <option value="bw">Monochrome (High Contrast Scan)</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>

                <div className="resizer-setting-box">
                  <label className="field-title">Page Standard</label>
                  <div className="resizer-select-styled">
                    <select
                      value={docPagePreset}
                      onChange={(e) => setDocPagePreset(e.target.value)}
                    >
                      <option value="original">Keep Original Dimensions</option>
                      <option value="A4">A4 Standard (210 × 297 mm)</option>
                      <option value="Letter">US Letter (8.5 × 11 in)</option>
                      <option value="A3">A3 Document (297 × 420 mm)</option>
                      <option value="A5">A5 Booklet (148 × 210 mm)</option>
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>
              </div>

              <div className="resizer-option-row">
                <div className="resizer-field-labeled">
                  <label className="field-title">Render Resolution</label>
                  <div className="dpi-input-wrap">
                    <input
                      type="number"
                      min="50"
                      max="600"
                      value={docDpi}
                      onChange={(e) => setDocDpi(parseInt(e.target.value, 10) || 150)}
                      className="resizer-text-input resizer-input-sm"
                    />
                    <span className="dpi-unit-tag">DPI</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="resizer-action-row">
              <button
                type="button"
                className="btn-resize-main-blue"
                onClick={handleProcessAll}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? (
                  <><RefreshCw size={20} className="spinning" /> Compressing Document... {progress}%</>
                ) : (
                  <>Compress & Generate {docOutputFormat === 'pdf' ? 'Single PDF' : 'Document Pages'}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 3. Results Section ─── */}
        {results.length > 0 && (
          <div className="resizer-results-card animate-fadeInUp">
            <div className="results-header-row">
              <div className="results-title-group">
                <Check size={22} className="text-success" />
                <h3>Processing Complete! ({results.length} item{results.length > 1 ? 's' : ''})</h3>
              </div>
              {results.length > 1 && (
                <button
                  className="btn btn-accent btn-sm"
                  onClick={downloadAllResults}
                >
                  <Download size={16} /> Download All
                </button>
              )}
            </div>

            <div className="results-list-grid">
              {results.map((res, i) => (
                <div key={i} className="resizer-result-item">
                  <div className="result-img-box">
                    {res.name.endsWith('.pdf') ? (
                      <FileText size={32} className="text-primary" />
                    ) : (
                      <img src={res.downloadUrl} alt={res.name} />
                    )}
                  </div>

                  <div className="result-info-box">
                    <h4 className="result-filename">{res.name}</h4>
                    <div className="result-badge-row">
                      <span className="badge-pill badge-dim">
                        {res.newWidth} × {res.newHeight} px
                      </span>
                      <span className="badge-pill badge-size">
                        {formatBytes(res.newSize)}
                      </span>
                      {res.savedPercent > 0 && (
                        <span className="badge-pill badge-saved">
                          -{res.savedPercent}% Smaller
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-md btn-download-res"
                    onClick={() => downloadSingleResult(res)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Features Highlights ─── */}
        <div className="resizer-features-grid">
          <div className="resizer-feature-card">
            <div className="feature-icon text-primary"><Zap size={22} /></div>
            <h4>Instant In-Browser Processing</h4>
            <p>Lightning fast client-side resizing with zero queue time or server uploads.</p>
          </div>
          <div className="resizer-feature-card">
            <div className="feature-icon text-accent"><Shield size={22} /></div>
            <h4>100% Private & Secure</h4>
            <p>Your photos, videos, and private documents never leave your browser.</p>
          </div>
          <div className="resizer-feature-card">
            <div className="feature-icon text-success"><Layers size={22} /></div>
            <h4>Universal Multi-Format</h4>
            <p>Resize images, passport photos, videos, social media reels, and multi-page PDFs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
