import { useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Download, Trash2, RefreshCw } from 'lucide-react';
import { useConversionStore } from '../../store/conversionStore';
import { apiService } from '../../services/api';

export function ResultPanel() {
  const { currentJob, deleteCurrentJob, reset } = useConversionStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  if (!currentJob) return null;

  const completed = currentJob.files.filter((f) => f.status === 'completed');
  const failed = currentJob.files.filter((f) => f.status === 'failed');
  const hasResults = completed.length > 0;

  return (
    <div ref={panelRef} className="result-panel animate-fadeIn">
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
            className={`result-file-card ${file.status === 'completed' ? 'success' : 'error'} animate-fadeIn`}
          >
            <div className="result-file-top">
              <div className="result-file-info">
                <div className="result-file-title-row">
                  <span className="result-file-name">{file.originalName}</span>
                  {file.status === 'completed' && (
                    <span className="result-badge-success">Ready</span>
                  )}
                </div>
                {file.status === 'completed' ? (
                  <span className="result-file-meta">
                    <span className="result-meta-tag">{file.outputName}</span>
                    {file.outputSizeBytes ? <span>· {formatBytes(file.outputSizeBytes)}</span> : null}
                    {file.pageCount && file.pageCount > 1 ? <span>· {file.pageCount} pages</span> : null}
                    {file.conversionTimeMs ? <span>· {formatDuration(file.conversionTimeMs)}</span> : null}
                  </span>
                ) : (
                  <span className="text-xs text-error">{file.errorMessage}</span>
                )}
              </div>
            </div>

            {/* ─── Compact Centered Animated Download Button ─── */}
            {file.status === 'completed' && (
              <div className="result-download-center-wrapper">
                <div className="download-btn-aura-container">
                  {/* Subtle pulsating wave aura */}
                  <div className="download-aura-pulse"></div>

                  <a
                    href={apiService.getFileDownloadUrl(currentJob.jobId, file.fileId)}
                    download={file.outputName}
                    className="btn-download-compact-animated"
                    aria-label={`Download ${file.outputName}`}
                  >
                    {/* Glossy light streak flare */}
                    <span className="download-flare-sweep"></span>

                    {/* Animated bouncy download icon */}
                    <span className="download-icon-bounce-box">
                      <Download size={18} strokeWidth={2.4} className="download-icon-bounce-energetic" />
                    </span>

                    <span className="download-main-text">Download</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="result-expiry-notice">
        <AlertCircle size={14} />
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
