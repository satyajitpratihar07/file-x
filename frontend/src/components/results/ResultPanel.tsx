import { CheckCircle2, AlertCircle, Download, Trash2, RefreshCw } from 'lucide-react';
import { useConversionStore } from '../../store/conversionStore';
import { apiService } from '../../services/api';

export function ResultPanel() {
  const { currentJob, deleteCurrentJob, reset } = useConversionStore();

  if (!currentJob) return null;

  const completed = currentJob.files.filter((f) => f.status === 'completed');
  const failed = currentJob.files.filter((f) => f.status === 'failed');
  const hasResults = completed.length > 0;

  return (
    <div className="result-panel animate-fadeIn">
      <div className="result-panel-header">
        <div className="result-summary">
          {failed.length === 0 ? (
            <div className="result-summary-icon success">
              <CheckCircle2 size={24} />
            </div>
          ) : completed.length === 0 ? (
            <div className="result-summary-icon error">
              <AlertCircle size={24} />
            </div>
          ) : (
            <div className="result-summary-icon warning">
              <AlertCircle size={24} />
            </div>
          )}
          <div>
            <h3>
              {failed.length === 0
                ? `${completed.length} file${completed.length > 1 ? 's' : ''} converted!`
                : completed.length === 0
                ? 'Conversion failed'
                : `${completed.length} of ${currentJob.files.length} converted`}
            </h3>
            {failed.length > 0 && (
              <p className="text-sm text-muted">{failed.length} file(s) failed — see details below</p>
            )}
          </div>
        </div>

        <div className="result-panel-actions">
          {hasResults && currentJob.files.length > 1 && (
            <a
              href={apiService.getZipDownloadUrl(currentJob.jobId)}
              className="btn btn-primary"
              download
              aria-label="Download all files as ZIP"
            >
              <Download size={16} />
              Download All (ZIP)
            </a>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => { deleteCurrentJob(); reset(); }}
            aria-label="Convert another file"
          >
            <RefreshCw size={16} />
            Convert Another
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={deleteCurrentJob}
            aria-label="Delete all converted files"
            title="Delete files from server"
          >
            <Trash2 size={14} />
            Delete Files
          </button>
        </div>
      </div>

      <div className="result-files">
        {currentJob.files.map((file) => (
          <div
            key={file.fileId}
            className={`result-file-row ${file.status === 'completed' ? 'success' : 'error'}`}
          >
            <div className="result-file-info">
              <span className="result-file-name">{file.originalName}</span>
              {file.status === 'completed' ? (
                <span className="text-xs text-muted">
                  {file.outputName}
                  {file.outputSizeBytes ? ` · ${formatBytes(file.outputSizeBytes)}` : ''}
                  {file.pageCount && file.pageCount > 1 ? ` · ${file.pageCount} pages` : ''}
                  {file.conversionTimeMs ? ` · ${formatDuration(file.conversionTimeMs)}` : ''}
                </span>
              ) : (
                <span className="text-xs text-error">{file.errorMessage}</span>
              )}
            </div>
            {file.status === 'completed' && (
              <a
                href={apiService.getFileDownloadUrl(currentJob.jobId, file.fileId)}
                download={file.outputName}
                className="btn btn-ghost btn-sm"
                aria-label={`Download ${file.outputName}`}
              >
                <Download size={14} />
                Download
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="result-expiry-notice">
        <AlertCircle size={12} />
        <span>Files are automatically deleted from our servers after 60 minutes.</span>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
