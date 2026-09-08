import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileUp,
  Zap,
  Trash2,
  FileText,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  ArrowRight,
  Code2,
  Database,
  Table,
} from 'lucide-react';
import type { ConverterTool } from '../../config/convertersCatalog';
import { useConversionStore } from '../../store/conversionStore';
import { FileCard } from './FileCard';
import { ResultPanel } from '../results/ResultPanel';
import { formatBytes } from '../../utils/fileUtils';
import type { OutputFormat } from '../../types';

const MAX_SIZE = 300 * 1024 * 1024; // 300MB

// Build MIME / extension map for react-dropzone based on tool inputFormats
function buildAcceptMap(inputFormats: string[]): Record<string, string[]> | undefined {
  if (inputFormats.includes('ANY')) return undefined;

  const acceptMap: Record<string, string[]> = {};

  const mimeByExt: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    odt: 'application/vnd.oasis.opendocument.text',
    rtf: 'application/rtf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    odp: 'application/vnd.oasis.opendocument.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    ico: 'image/x-icon',
    json: 'application/json',
    xml: 'application/xml',
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    log: 'text/plain',
    py: 'text/x-python',
    js: 'text/javascript',
    ts: 'text/typescript',
    jsx: 'text/jsx',
    tsx: 'text/tsx',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    sql: 'application/sql',
    epub: 'application/epub+zip',
    zip: 'application/zip',
  };

  inputFormats.forEach((fmt) => {
    const cleanExt = fmt.toLowerCase().replace(/^\./, '');
    const mime = mimeByExt[cleanExt] || `application/x-${cleanExt}`;
    if (!acceptMap[mime]) {
      acceptMap[mime] = [];
    }
    acceptMap[mime].push(`.${cleanExt}`);
  });

  return acceptMap;
}

interface SpecificToolUploaderProps {
  tool: ConverterTool;
}

export function SpecificToolUploader({ tool }: SpecificToolUploaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    selectedFiles,
    removeSelectedFile,
    clearSelectedFiles,
    addSelectedFiles,
    currentJob,
    isUploading,
    isConverting,
    uploadProgress,
    uploadAndConvert,
    outputFormat,
    setOutputFormat,
    addToast,
  } = useConversionStore();

  // Tool specific options
  const [quality, setQuality] = useState<number>(92);
  const [dpi, setDpi] = useState<number>(150);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [lineNumbers, setLineNumbers] = useState<boolean>(true);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState<boolean>(true);

  // Set default output format for this specific tool when loaded
  useEffect(() => {
    if (tool.outputFormats.length > 0) {
      const primaryOut = tool.outputFormats[0] as OutputFormat;
      if (['pdf', 'jpg', 'png', 'webp', 'docx', 'txt'].includes(primaryOut)) {
        setOutputFormat(primaryOut);
      }
    }
  }, [tool.id, tool.outputFormats, setOutputFormat]);

  const hasFiles = selectedFiles.length > 0;
  const isActive = isUploading || isConverting;
  const showQueue = hasFiles && !currentJob && !isConverting;
  const showResults = !!currentJob && !isConverting;

  const handleConvert = async () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await uploadAndConvert();
  };

  const acceptMap = buildAcceptMap(tool.inputFormats);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (acceptedFiles.length > 0) {
        addSelectedFiles(acceptedFiles);
        addToast({
          type: 'success',
          message: `Added ${acceptedFiles.length} file(s) to ${tool.title}`,
        });
      }

      if (rejectedFiles.length > 0) {
        const first = rejectedFiles[0];
        if (first.errors?.[0]?.code === 'file-invalid-type') {
          addToast({
            type: 'error',
            message: `This tool only accepts ${tool.inputFormats.map((f) => `.${f}`).join(', ')} files.`,
            duration: 6000,
          });
        } else if (first.errors?.[0]?.code === 'file-too-large') {
          addToast({ type: 'error', message: 'File too large (max 300MB)' });
        } else {
          addToast({
            type: 'warning',
            message: `File rejected: ${first.errors?.[0]?.message || 'Unsupported format'}`,
          });
        }
      }
    },
    [addSelectedFiles, addToast, tool]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    accept: acceptMap,
    maxSize: MAX_SIZE,
    maxFiles: 50,
    multiple: true,
  });

  const getToolIcon = () => {
    switch (tool.category) {
      case 'images':
      case 'image_to_pdf':
        return <ImageIcon size={36} />;
      case 'pdf_tools':
      case 'pdf_to_image':
        return <FileText size={36} />;
      case 'spreadsheets':
        return <Table size={36} />;
      case 'text_code':
        return <Code2 size={36} />;
      case 'data':
        return <Database size={36} />;
      default:
        return <Zap size={36} />;
    }
  };

  return (
    <div ref={containerRef} className="specific-tool-uploader">
      {/* ─── Specific Tool Header Banner ─── */}
      <div className="tool-upload-hero card animate-fadeIn">
        <div className="tool-upload-badge">
          <Sparkles size={14} />
          <span>Dedicated {tool.categoryLabel} Converter</span>
        </div>
        <h2 className="tool-upload-title">{tool.title}</h2>
        <p className="tool-upload-desc">{tool.shortDescription}</p>

        {/* Input/Output summary flow */}
        <div className="tool-flow-pill">
          <div className="tool-flow-tag">
            <span className="tool-flow-label">INPUT</span>
            <strong>{tool.inputFormats.map((f) => f.toUpperCase()).join(' / ')}</strong>
          </div>
          <ArrowRight size={16} className="text-muted" />
          <div className="tool-flow-tag tool-flow-out">
            <span className="tool-flow-label">OUTPUT</span>
            <strong>{tool.outputFormats.map((f) => f.toUpperCase()).join(' / ')}</strong>
          </div>
        </div>
      </div>

      {/* ─── Dedicated DropZone (if no active results) ─── */}
      {!showResults && (
        <div className="tool-dropzone-container">
          <div
            {...getRootProps()}
            className={`dropzone tool-dropzone ${isDragActive ? 'dropzone-active' : ''} ${isDragReject ? 'dropzone-reject' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Upload files for ${tool.title}`}
          >
            <input {...getInputProps()} />

            <div className="dropzone-content">
              <div className={`dropzone-icon ${isDragActive ? 'dropzone-icon-active' : ''}`}>
                {isDragReject ? (
                  <span className="dropzone-emoji">❌</span>
                ) : isDragActive ? (
                  <span className="dropzone-emoji">📂</span>
                ) : (
                  getToolIcon()
                )}
              </div>

              <h3 className="dropzone-title">
                {isDragActive
                  ? `Drop your ${tool.inputFormats[0].toUpperCase()} files here`
                  : `Upload ${tool.inputFormats.map((f) => f.toUpperCase()).join(', ')} files`}
              </h3>

              <p className="dropzone-subtitle">
                {isDragReject
                  ? `Invalid format! Please drop ${tool.inputFormats.map((f) => `.${f}`).join(', ')} files.`
                  : `Drag & drop here or choose from your computer (up to 300MB per file)`}
              </p>

              <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg tool-choose-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                >
                  <FileUp size={19} />
                  <span>Choose {tool.inputFormats[0].toUpperCase()} Files</span>
                </button>
              </div>

              {/* Supported format tags for this tool */}
              <div className="tool-accepted-tags">
                <span className="tool-accepted-label">Accepted in this section:</span>
                {tool.inputFormats.map((fmt) => (
                  <span key={fmt} className="format-chip format-chip-active">
                    .{fmt.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tool Options Customization Panel (if tool supports options) ─── */}
      {tool.options && !showResults && (
        <div className="tool-options-panel card animate-fadeIn">
          <div className="tool-options-header">
            <Sliders size={18} className="text-primary" />
            <h4>Conversion Preferences</h4>
          </div>

          <div className="tool-options-grid">
            {tool.options.quality && (
              <div className="tool-option-group">
                <label>
                  <span>Output Quality ({quality}%)</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="tool-slider"
                />
              </div>
            )}

            {tool.options.dpi && (
              <div className="tool-option-group">
                <label>Resolution (DPI):</label>
                <div className="tool-btn-group">
                  {[72, 150, 300].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn btn-sm ${dpi === d ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDpi(d)}
                    >
                      {d} DPI
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool.options.pageSize && (
              <div className="tool-option-group">
                <label>Page Format:</label>
                <div className="tool-btn-group">
                  {(['A4', 'Letter', 'Fit'] as const).map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      className={`btn btn-sm ${pageSize === ps ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPageSize(ps)}
                    >
                      {ps}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool.options.orientation && (
              <div className="tool-option-group">
                <label>Orientation:</label>
                <div className="tool-btn-group">
                  {(['portrait', 'landscape'] as const).map((ori) => (
                    <button
                      key={ori}
                      type="button"
                      className={`btn btn-sm ${orientation === ori ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setOrientation(ori)}
                    >
                      {ori.charAt(0).toUpperCase() + ori.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool.options.lineNumbers && (
              <div className="tool-option-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={lineNumbers}
                    onChange={(e) => setLineNumbers(e.target.checked)}
                  />
                  <span>Display line numbers in code output</span>
                </label>
              </div>
            )}

            {tool.options.syntaxHighlighting && (
              <div className="tool-option-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={syntaxHighlighting}
                    onChange={(e) => setSyntaxHighlighting(e.target.checked)}
                  />
                  <span>Format syntax and pretty-print structure</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── File Queue ─── */}
      {showQueue && (
        <section className="queue-section animate-fadeInUp" aria-label="Files to convert">
          <div className="queue-header">
            <h2>
              {selectedFiles.length} {tool.inputFormats[0].toUpperCase()} file{selectedFiles.length > 1 ? 's' : ''} ready
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
                Clear
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

          {/* Dedicated Target Selector for this Tool */}
          <div className="tool-target-bar card">
            <div className="tool-target-info">
              <span className="tool-target-label">Target Format:</span>
              <div className="tool-target-formats">
                {tool.outputFormats.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`btn btn-sm ${outputFormat === fmt ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setOutputFormat(fmt as OutputFormat)}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {isUploading ? (
              <div className="upload-progress-wrapper" style={{ flex: 1, margin: 0 }}>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-muted text-center mt-1">Uploading... {uploadProgress}%</p>
              </div>
            ) : (
              <button
                className="btn btn-accent btn-lg convert-btn"
                onClick={handleConvert}
                disabled={isActive || !hasFiles}
              >
                <Zap size={18} fill="currentColor" />
                <span>Convert to {outputFormat.toUpperCase()}</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ─── Active Conversion Progress ─── */}
      {isConverting && (
        <section className="active-conversion animate-fadeInUp" aria-label="Conversion progress">
          <div className="active-conversion-header">
            <div className="active-conversion-spinner">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h2>Processing {tool.title}...</h2>
              <p className="text-sm text-muted">
                {currentJob
                  ? `${currentJob.files.filter((f) => f.status === 'completed').length} of ${currentJob.files.length} complete`
                  : 'Converting files securely...'}
              </p>
            </div>
          </div>

          <div className="queue-list">
            {currentJob ? (
              currentJob.files.map((file) => (
                <FileCard key={file.fileId} file={file} jobId={currentJob.jobId} />
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

      {/* ─── Results Panel ─── */}
      {showResults && <ResultPanel />}
    </div>
  );
}
