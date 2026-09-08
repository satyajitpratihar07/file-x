import {
  FileText, Image, FileSpreadsheet, Presentation, Code2, File,
  X, AlertCircle, CheckCircle2, Loader2, Clock
} from 'lucide-react';
import type { ConversionFileState, FileStatus } from '../../types';
import { formatBytes, formatDuration } from '../../utils/fileUtils';

interface FileCardProps {
  file: ConversionFileState;
  onRemove?: () => void;
  jobId?: string;
}

function getFileIcon(ext: string, mime: string) {
  const e = ext.toLowerCase();
  const m = mime.toLowerCase();

  if (m.startsWith('image/')) return <Image size={20} />;
  if (['xlsx','xls','csv','ods'].includes(e)) return <FileSpreadsheet size={20} />;
  if (['pptx','ppt','odp'].includes(e)) return <Presentation size={20} />;
  if (['docx','doc','odt','rtf','pdf'].includes(e)) return <FileText size={20} />;
  if (['py','js','ts','java','c','cpp','html','css','sql','sh','json','yaml'].includes(e)) return <Code2 size={20} />;
  return <File size={20} />;
}

function getStatusBadge(status: FileStatus) {
  switch (status) {
    case 'queued':    return <span className="badge badge-queued"><Clock size={10} /> Queued</span>;
    case 'uploading': return <span className="badge badge-processing"><Loader2 size={10} className="animate-spin" /> Uploading</span>;
    case 'validating':return <span className="badge badge-processing"><Loader2 size={10} className="animate-spin" /> Validating</span>;
    case 'processing':return <span className="badge badge-processing"><Loader2 size={10} className="animate-spin" /> Converting</span>;
    case 'completed': return <span className="badge badge-completed"><CheckCircle2 size={10} /> Done</span>;
    case 'failed':    return <span className="badge badge-failed"><AlertCircle size={10} /> Failed</span>;
    default:          return <span className="badge badge-queued">Ready</span>;
  }
}

export function FileCard({ file, onRemove, jobId }: FileCardProps) {
  const isProcessing = ['queued', 'uploading', 'validating', 'processing'].includes(file.status);
  const isCompleted = file.status === 'completed';
  const isFailed = file.status === 'failed';

  const downloadUrl = jobId && isCompleted
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/download/${jobId}/${file.fileId}`
    : null;

  return (
    <div className={`file-card ${isCompleted ? 'file-card-success' : ''} ${isFailed ? 'file-card-error' : ''}`}>
      <div className="file-card-icon">
        {getFileIcon(file.extension, file.detectedMimeType)}
      </div>

      <div className="file-card-info">
        <div className="file-card-header">
          <span className="file-card-name" title={file.originalName}>
            {file.originalName}
          </span>
          <div className="file-card-badges">
            {getStatusBadge(file.status)}
            <span className="badge badge-queued">.{file.extension} → {file.outputFormat.toUpperCase()}</span>
          </div>
        </div>

        <div className="file-card-meta">
          <span>{formatBytes(file.sizeBytes)}</span>
          {isCompleted && file.outputSizeBytes && (
            <span>→ {formatBytes(file.outputSizeBytes)}</span>
          )}
          {isCompleted && file.pageCount && file.pageCount > 1 && (
            <span>{file.pageCount} pages</span>
          )}
          {isCompleted && file.conversionTimeMs && (
            <span>{formatDuration(file.conversionTimeMs)}</span>
          )}
          <span className="text-xs text-muted">{file.detectedMimeType}</span>
        </div>

        {isFailed && file.errorMessage && (
          <div className="file-card-error-msg">
            <AlertCircle size={12} />
            <span>{file.errorMessage}</span>
          </div>
        )}

        {isProcessing && (
          <div className="file-card-progress">
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${file.progress}%` }}
                role="progressbar"
                aria-valuenow={file.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-xs text-muted">{file.progress}%</span>
          </div>
        )}
      </div>

      <div className="file-card-actions">
        {downloadUrl && isCompleted && (
          <a
            href={downloadUrl}
            download={file.outputName}
            className="btn btn-ghost btn-sm"
            aria-label={`Download ${file.outputName}`}
          >
            ↓
          </a>
        )}
        {onRemove && !isProcessing && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={onRemove}
            aria-label={`Remove ${file.originalName}`}
            title="Remove file"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
