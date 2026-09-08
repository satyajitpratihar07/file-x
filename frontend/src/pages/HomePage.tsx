import { useState, useRef, useEffect } from 'react';
import {
  Zap, Shield, Clock, Globe, ChevronDown, ChevronUp, ArrowRight,
  Lock, Download, CheckCircle2, Cpu, HelpCircle
} from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { FormatSelector } from '../components/conversion/FormatSelector';
import { FileCard } from '../components/upload/FileCard';
import { ResultPanel } from '../components/results/ResultPanel';
import { useConversionStore } from '../store/conversionStore';
import { RecentConversions } from '../components/common/RecentConversions';

const FEATURES = [
  {
    icon: <Zap size={24} />,
    title: 'Lightning Fast',
    desc: 'Optimized conversion pipelines process your files in seconds, not minutes.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Secure & Private',
    desc: 'Files are isolated per-job and permanently deleted after 60 minutes. Never stored permanently.',
  },
  {
    icon: <Globe size={24} />,
    title: '30+ Formats',
    desc: 'Documents, images, spreadsheets, presentations, source code, and more.',
  },
  {
    icon: <Clock size={24} />,
    title: 'Batch Processing',
    desc: "Upload up to 50 files at once. Each converts independently — one failure doesn't stop the rest.",
  },
  {
    icon: <Lock size={24} />,
    title: 'No Registration',
    desc: 'Convert files instantly without creating an account. No personal data collected.',
  },
  {
    icon: <Download size={24} />,
    title: 'ZIP Download',
    desc: 'Download all converted files in a single ZIP archive with one click.',
  },
];


const STEPS = [
  { num: '01', title: 'Upload Files', desc: 'Drag & drop or browse. Up to 50 files, 300MB each.' },
  { num: '02', title: 'Choose Format', desc: 'Select PDF, JPG, or PNG as your output.' },
  { num: '03', title: 'Convert', desc: 'Click Convert. Our engines process files in parallel.' },
  { num: '04', title: 'Download', desc: 'Download individually or get all files in a ZIP.' },
];

const FAQS = [
  {
    q: 'How long are my files stored?',
    a: 'All uploaded and converted files are automatically deleted from our servers after 60 minutes. You can also delete them immediately after downloading.',
  },
  {
    q: 'What file formats are supported?',
    a: 'We support DOCX, DOC, ODT, RTF, XLSX, XLS, ODS, CSV, PPTX, PPT, ODP, PDF, JPG, PNG, WEBP, SVG, GIF, BMP, TIFF, TXT, MD, JSON, XML, YAML, PY, JS, TS, and many more code/text formats.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'Yes — 300MB per file, up to 50 files per batch. These limits ensure fast, reliable processing for everyone.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. Any-DoC works without registration. Just upload and convert.',
  },
  {
    q: 'How secure is my data?',
    a: 'Files are stored in isolated temporary directories with random names. We validate file signatures (magic bytes), enforce size limits, and never execute uploaded files.',
  },
  {
    q: 'What if conversion fails?',
    a: "You'll see a clear error message explaining why. If one file in a batch fails, the others still complete successfully.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`faq-item ${open ? 'faq-item-open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="faq-question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="faq-q-text">{q}</span>
        <div className="faq-chevron-circle">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      <div className={`faq-answer-wrapper ${open ? 'expanded' : ''}`}>
        <div className="faq-answer">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const converterRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll down to queue/options when files are first dropped or selected
  useEffect(() => {
    if (hasFiles && !showResults && !isActive) {
      const timer = setTimeout(() => {
        queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [hasFiles, showResults, isActive]);

  const handleConvertNow = async () => {
    converterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await uploadAndConvert();
  };

  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero" aria-label="Hero section">
        <div className="container">
          <div className="hero-badge animate-fadeIn">
            <Zap size={14} fill="currentColor" />
            Free · Secure · No Registration Required
          </div>

          <h1 className="hero-title animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            Convert Any File to{' '}
            <span className="gradient-text">PDF, JPG & PNG</span>
          </h1>

          <p className="hero-subtitle animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            Upload documents, images, spreadsheets, presentations, code files and more.
            Get beautifully formatted PDF, JPG, or PNG output — instantly.
          </p>

          {/* ─── Inline Converter ─────────────────────────────────────── */}
          <div ref={converterRef} className="hero-converter animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            {!showResults && <DropZone />}

            {hasFiles && !currentJob && !isConverting && (
              <div ref={queueRef} className="hero-queue animate-fadeInUp">
                <div className="queue-header">
                  <h3>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ready</h3>
                  <button className="btn btn-ghost btn-sm" onClick={clearSelectedFiles}>Clear</button>
                </div>
                <div className="queue-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {selectedFiles.map((file, i) => (
                    <FileCard
                      key={`${file.name}-${i}`}
                      file={{
                        fileId: `local-${i}`,
                        originalName: file.name,
                        status: 'idle',
                        progress: 0,
                        outputFormat,
                        detectedMimeType: file.type || 'application/octet-stream',
                        sizeBytes: file.size,
                        extension: file.name.split('.').pop() || '',
                      }}
                      onRemove={() => removeSelectedFile(i)}
                    />
                  ))}
                </div>
                <div className="hero-convert-controls">
                  <FormatSelector />
                  {isUploading ? (
                    <div style={{ padding: '1rem 0' }}>
                      <div className="progress"><div className="progress-bar" style={{ width: `${uploadProgress}%` }} /></div>
                      <p className="text-sm text-muted text-center mt-2">Uploading... {uploadProgress}%</p>
                    </div>
                  ) : (
                    <button
                      className="btn btn-accent btn-xl convert-btn"
                      onClick={handleConvertNow}
                      disabled={isActive}
                    >
                      <Zap size={20} fill="currentColor" />
                      Convert Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {isConverting && (
              <div className="hero-queue animate-fadeInUp" aria-live="polite">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Zap size={18} className="text-accent animate-pulse" />
                  <h3 style={{ margin: 0 }}>Converting your files...</h3>
                </div>
                <div className="queue-list">
                  {currentJob ? (
                    currentJob.files.map((f) => (
                      <FileCard key={f.fileId} file={f} jobId={currentJob.jobId} />
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
                          outputFormat,
                          detectedMimeType: file.type || 'application/octet-stream',
                          sizeBytes: file.size,
                          extension: file.name.split('.').pop() || '',
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {showResults && (
              <div ref={resultsRef}>
                <ResultPanel />
              </div>
            )}

            {/* Recent Conversions History */}
            {!isActive && <RecentConversions compact />}
          </div>

          {/* Trust badges */}
          <div className="hero-trust animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            <span><CheckCircle2 size={14} /> No registration</span>
            <span><Shield size={14} /> Files deleted in 60 min</span>
            <span><Lock size={14} /> Secure upload</span>
            <span><Cpu size={14} /> Real conversion</span>
          </div>
        </div>
      </section>


      {/* ─── Features ────────────────────────────────────────────────── */}
      <section className="section section-dark" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-header">
            <h2 id="features-heading">Why Any-DoC?</h2>
            <p>Built with quality, security, and usability as top priorities.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card card">
                <div className="feature-icon text-primary">{f.icon}</div>
                <h3>{f.title}</h3>
                <p className="text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────── */}
      <section className="section" aria-labelledby="how-heading">
        <div className="container">
          <div className="section-header">
            <h2 id="how-heading">How It Works</h2>
            <p>Four simple steps — takes less than a minute.</p>
          </div>
          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.num} className="step-card">
                <div className="step-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p className="text-sm text-muted">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-arrow hide-mobile"><ArrowRight size={20} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────── */}
      <section className="section faq-enhanced-section" id="faq" aria-labelledby="faq-heading">
        <div className="container-sm">
          <div className="section-header text-center">
            <div className="faq-badge animate-fadeIn">
              <HelpCircle size={15} className="faq-badge-icon" />
              <span>Got Questions?</span>
            </div>
            <h2 id="faq-heading" className="faq-main-title">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="faq-main-subtitle">
              Everything you need to know about our conversion speeds, privacy, file safety, and format limits.
            </p>
          </div>
          <div className="faq-list">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
