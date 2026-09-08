import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp } from 'lucide-react';
import { useConversionStore } from '../../store/conversionStore';

const MAX_SIZE = 300 * 1024 * 1024; // 300MB
const MAX_FILES = 50; // Support 50 files at a time

interface DropZoneProps {
  compact?: boolean;
}

// Recursive directory traversal for drag-and-drop support (allows dropping folders onto dropzone)
async function extractFilesFromDropEvent(event: any): Promise<File[]> {
  const target = (event as any).target;
  if (target && target.files) {
    return Array.from(target.files as FileList);
  }

  const dragEvent = event as DragEvent;
  const items = dragEvent.dataTransfer?.items;
  if (!items || items.length === 0) {
    if (dragEvent.dataTransfer?.files) {
      return Array.from(dragEvent.dataTransfer.files);
    }
    return [];
  }

  const files: File[] = [];

  const readAllDirEntries = async (dirReader: any): Promise<any[]> => {
    const list: any[] = [];
    let batch: any[];
    do {
      batch = await new Promise((resolve) => {
        dirReader.readEntries(
          (entries: any[]) => resolve(entries),
          () => resolve([])
        );
      });
      list.push(...batch);
    } while (batch.length > 0);
    return list;
  };

  const traverse = async (entry: any): Promise<void> => {
    if (!entry) return;
    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            if (!file.name.startsWith('.') && file.name !== 'Thumbs.db' && file.name !== 'desktop.ini') {
              files.push(file);
            }
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await readAllDirEntries(dirReader);
      for (const child of entries) {
        await traverse(child);
      }
    }
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        promises.push(traverse(entry));
      } else {
        const file = item.getAsFile();
        if (file && !file.name.startsWith('.')) {
          files.push(file);
        }
      }
    }
  }

  await Promise.all(promises);
  return files;
}

export function DropZone({ compact = false }: DropZoneProps) {
  const { addSelectedFiles, addToast } = useConversionStore();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (acceptedFiles.length > 0) {
        addSelectedFiles(acceptedFiles);
        if (acceptedFiles.length > 1) {
          addToast({
            type: 'success',
            message: `Added ${acceptedFiles.length} files to conversion queue`,
          });
        }
      }
      rejectedFiles.forEach((f) => {
        const error = f.errors[0];
        if (error?.code === 'file-too-large') {
          addToast({ type: 'error', message: `${f.file.name}: File too large (max 300MB)` });
        } else if (error?.code === 'too-many-files') {
          addToast({ type: 'warning', message: `Maximum ${MAX_FILES} files per batch` });
        } else {
          addToast({ type: 'warning', message: `${f.file.name}: ${error?.message || 'Rejected'}` });
        }
      });
    },
    [addSelectedFiles, addToast]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    getFilesFromEvent: extractFilesFromDropEvent,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isDragReject ? 'dropzone-reject' : ''} ${compact ? 'dropzone-compact' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="File upload area. Click or drag files here."
    >
      <input {...getInputProps()} aria-label="File input" />

      <div className="dropzone-content">
        <div className={`dropzone-icon ${isDragActive ? 'dropzone-icon-active' : ''}`}>
          {isDragReject ? (
            <span className="dropzone-emoji">❌</span>
          ) : isDragActive ? (
            <span className="dropzone-emoji">📂</span>
          ) : (
            <Upload size={compact ? 32 : 48} strokeWidth={1.5} />
          )}
        </div>

        {!compact && (
          <>
            <h3 className="dropzone-title">
              {isDragActive ? 'Drop your files here' : 'Drag & drop your files'}
            </h3>
            <p className="dropzone-subtitle">
              {isDragReject
                ? 'Some files are not supported'
                : 'PDF, images, documents, spreadsheets, code and more'}
            </p>
          </>
        )}

        <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            id="choose-files-btn"
            className="btn btn-primary btn-lg"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            title="Click to browse and choose files"
          >
            <FileUp size={19} />
            <span>Choose Files</span>
          </button>

          {!compact && (
            <div className="dropzone-meta">
              <span className="text-xs text-muted">
                Up to {MAX_FILES} files at once · Max 300MB each
              </span>
            </div>
          )}
        </div>

        {!compact && (
          <div className="dropzone-formats">
            {['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'WEBP', 'SVG', 'MD', 'JSON', 'CSV', 'TXT', '+ more'].map((fmt) => (
              <span key={fmt} className="format-chip">{fmt}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
