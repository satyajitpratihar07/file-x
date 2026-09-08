import { useRef, useEffect } from 'react';
import { Zap, Trash2 } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { FileCard } from '../components/upload/FileCard';
import { FormatSelector } from '../components/conversion/FormatSelector';
import { ResultPanel } from '../components/results/ResultPanel';
import { useConversionStore } from '../store/conversionStore';
import { formatBytes } from '../utils/fileUtils';
import { RecentConversions } from '../components/common/RecentConversions';

export function ConvertPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const {
    selectedFiles,
    removeSelectedFile,
    clearSelectedFiles,
    currentJob,
    isUploading,
    isConverting,
    uploadProgress,
    uploadAndConvert,
    outputFormat,
  } = useConversionStore();

  const hasFiles = selectedFiles.length > 0;
  const isActive = isUploading || isConverting;
  const showQueue = hasFiles && !currentJob && !isConverting;
  const showResults = !!currentJob && !isConverting;

  // Auto-scroll down when conversion finishes
  useEffect(() => {
    if (showResults) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showResults]);

  // Auto-scroll down to queue/controls when files are selected
  useEffect(() => {
    if (showQueue && !isActive) {
      const timer = setTimeout(() => {
        queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showQueue, isActive]);

  const handleConvert = async () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await uploadAndConvert();
  };

  return (
    <main className="convert-page">
      {!hideHeader && (
        <div className="convert-page-header">
          <h1>Universal File Converter</h1>
          <p>Convert documents, images, spreadsheets, presentations, code files, and more to PDF, JPG, or PNG.</p>
        </div>
      )}

      <div ref={containerRef} className="converter-container">
        {/* Upload Zone — always shown unless results are displaying */}
        {!showResults && (
          <section className="upload-section" aria-label="File upload">
            <DropZone />
          </section>
        )}

        {/* File queue */}
        {showQueue && (
          <section ref={queueRef} className="queue-section animate-fadeInUp" aria-label="Files to convert">
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
                    outputFormat: outputFormat,
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
                  onClick={handleConvert}
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
        {isConverting && (
          <section className="active-conversion animate-fadeInUp" aria-label="Conversion progress" aria-live="polite">
            <div className="active-conversion-header">
              <div className="active-conversion-spinner">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h2>Converting your files...</h2>
                <p className="text-sm text-muted">
                  {currentJob ? `${currentJob.files.filter((f) => f.status === 'completed').length} of ${currentJob.files.length} complete` : 'Processing files securely...'}
                </p>
              </div>
            </div>

            <div className="queue-list">
              {currentJob ? (
                currentJob.files.map((file) => (
                  <FileCard
                    key={file.fileId}
                    file={file}
                    jobId={currentJob.jobId}
                  />
                ))
              ) : (
                selectedFiles.map((file, i) => (
                  <FileCard
                    key={`conv-${file.name}-${i}`}
                    file={{
                      fileId: `local-${i}`,
                      originalName: file.name,
                      status: 'processing',
                      progress: uploadProgress || 50,
                      outputFormat: outputFormat,
                      detectedMimeType: file.type || 'application/octet-stream',
                      sizeBytes: file.size,
                      extension: file.name.split('.').pop() || '',
                    }}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* Results */}
        {showResults && (
          <div ref={resultsRef}>
            <ResultPanel />
          </div>
        )}

        {/* Recent Conversions History */}
        {!isActive && (
          <RecentConversions />
        )}
      </div>
    </main>
  );
}
