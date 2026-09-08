export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 255);
}

export function isImageExtension(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg', 'ico'].includes(ext.toLowerCase());
}

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    documents: 'Documents',
    spreadsheets: 'Spreadsheets',
    presentations: 'Presentations',
    images: 'Images',
    text_code: 'Text & Code',
    pdf_tools: 'PDF Tools',
  };
  return map[category] || category;
}
