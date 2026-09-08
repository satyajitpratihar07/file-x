import { Zap, Trash2 } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { FileCard } from '../components/upload/FileCard';
import { FormatSelector } from '../components/conversion/FormatSelector';
import { ResultPanel } from '../components/results/ResultPanel';
import { useConversionStore } from '../store/conversionStore';
import { formatBytes } from '../utils/fileUtils';
import { RecentConversions } from '../components/common/RecentConversions';

export function ConvertPage() {
  const {
    selectedFiles,
    removeSelectedFile,
    clearSelectedFiles,
    currentJob,
    isUploading,
    isConverting,
    uploadProgress,
    uploadAndConvert,
  } = useConversionStore();

  const hasFiles = selectedFiles.length > 0;
  const isActive = isUploading || isConverting;
  const showQueue = hasFiles && !currentJob;
  const showResults = !!currentJob;

  return (
    <main className="convert-page">
      <div className="convert-page-header">
        <h1>Universal File Converter</h1>
        <p>Convert documents, images, spreadsheets, presentations, code files, and more to PDF, JPG, or PNG.</p>
      </div>

      <div className="converter-container">
        {/* Upload Zone — always shown unless results are displaying */}
        {!showResults && (
          <section className="upload-section" aria-label="File upload">
            <DropZone />
          </section>
        )}

        {/* File queue */}
        {showQueue && (
          <section className="queue-section animate-fadeInUp" aria-label="Files to convert">
            <div className="queue-header">
              <h2>
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </h2>
              <div className="queue-header-actions">
                <span className="text-sm text-muted">
                  Total: {formatBytes(selectedFiles.reduce((s, f) => s + f.size, 0))}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearSelectedFiles}
                  disabled={isActive}
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              </div>
            </div>

            <div className="queue-list">
              {selectedFiles.map((file, i) => (
                <FileCard
                  key={`${file.name}-${file.size}-${i}`}
                  file={{
                    fileId: `local-${i}`,
                    originalName: file.name,
                    status: 'idle',
                    progress: 0,
                    outputFormat: useConversionStore.getState().outputFormat,
                    detectedMimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size,
                    extension: file.name.split('.').pop() || '',
                  }}
                  onRemove={() => removeSelectedFile(i)}
                />
              ))}
            </div>

            <div className="queue-controls">
              <FormatSelector />

              {isUploading ? (
                <div className="upload-progress-wrapper">
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <p className="text-sm text-muted text-center mt-2">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <button
                  className="btn btn-accent btn-xl convert-btn"
                  onClick={uploadAndConvert}
                  disabled={isActive || !hasFiles}
                  aria-label={`Convert ${selectedFiles.length} file(s)`}
                >
                  <Zap size={20} fill="currentColor" />
                  Convert {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Active conversion progress */}
        {isConverting && currentJob && (
          <section className="active-conversion animate-fadeInUp" aria-label="Conversion progress" aria-live="polite">
            <div className="active-conversion-header">
              <div className="active-conversion-spinner">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h2>Converting your files...</h2>
                <p className="text-sm text-muted">
                  {currentJob.files.filter((f) => f.status === 'completed').length} of{' '}
                  {currentJob.files.length} complete
                </p>
              </div>
            </div>

            <div className="queue-list">
              {currentJob.files.map((file) => (
                <FileCard
                  key={file.fileId}
                  file={file}
                  jobId={currentJob.jobId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {showResults && !isConverting && (
          <ResultPanel />
        )}

        {/* Recent Conversions History */}
        {!isActive && (
          <RecentConversions />
        )}
      </div>
    </main>
  );
}
