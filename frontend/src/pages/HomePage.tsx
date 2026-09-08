import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Clock, Globe, FileText, Image, Code2,
  FileSpreadsheet, ChevronDown, ChevronUp, ArrowRight,
  Lock, Download, CheckCircle2, Cpu, Sparkles, Binary, Database, Printer
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

const FORMAT_CATEGORIES = [
  { icon: <FileText size={20} />, label: 'Documents', formats: 'DOCX, DOC, ODT, RTF, PDF' },
  { icon: <FileSpreadsheet size={20} />, label: 'Spreadsheets', formats: 'XLSX, XLS, ODS, CSV' },
  { icon: <Image size={20} />, label: 'Images', formats: 'JPG, PNG, WEBP, SVG, TIFF, GIF' },
  { icon: <Code2 size={20} />, label: 'Code & Text', formats: 'PY, JS, TS, JSON, MD, YAML, SQL' },
];

const STEPS = [
  { num: '01', title: 'Upload Files', desc: 'Drag & drop or browse. Up to 50 files, 50MB each.' },
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
    a: 'Yes — 50MB per file, up to 50 files per batch. These limits ensure fast, reliable processing for everyone.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. ConvertX works without registration. Just upload and convert.',
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
    <div className="faq-item">
      <button
        className="faq-question"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="faq-answer"><p>{a}</p></div>}
    </div>
  );
}

export function HomePage() {
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
          <div className="hero-converter animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            {!showResults && <DropZone />}

            {hasFiles && !currentJob && (
              <div className="hero-queue animate-fadeInUp">
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
                      onClick={uploadAndConvert}
                      disabled={isActive}
                    >
                      <Zap size={20} fill="currentColor" />
                      Convert Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {isConverting && currentJob && (
              <div className="hero-queue animate-fadeInUp" aria-live="polite">
                <h3 style={{ marginBottom: '1rem' }}>Converting...</h3>
                <div className="queue-list">
                  {currentJob.files.map((f) => (
                    <FileCard key={f.fileId} file={f} jobId={currentJob.jobId} />
                  ))}
                </div>
              </div>
            )}

            {showResults && <ResultPanel />}

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

      {/* ─── Recently Added Engines & Features ───────────────────────── */}
      <section className="section section-dark" aria-labelledby="recently-added-heading">
        <div className="container">
          <div className="section-header">
            <div className="converters-badge" style={{ margin: '0 auto 1rem' }}>
              <Sparkles size={14} />
              <span>Newly Released Capabilities</span>
            </div>
            <h2 id="recently-added-heading">Recently Added Converters & Tools</h2>
            <p>Check out the latest enterprise-grade format converters and inspection tools added to ConvertX.</p>
          </div>

          <div className="format-grid">
            <div
              className="format-category-card card"
              style={{
                border: '2px solid var(--color-primary)',
                background: 'linear-gradient(180deg, var(--color-bg-card), var(--color-bg-2))',
                boxShadow: '0 8px 30px -6px rgba(92, 82, 230, 0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '2px 10px',
                  borderBottomLeftRadius: '8px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Featured Studio
              </div>

              <div className="format-category-icon text-primary" style={{ marginTop: '4px' }}>
                <Printer size={24} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Photo Print Studio</h3>
              </div>

              <p className="text-sm text-muted" style={{ margin: '8px 0 12px' }}>
                Position photos on realistic white paper (4×6″, A4, Passport sheets). Adjust directly with your mouse (drag, scale, rotate), edit with Photoshop-grade tools, and print at 300 DPI.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                <span className="badge" style={{ fontSize: '0.6875rem', background: 'var(--color-bg-2)', border: '1px solid var(--color-border)' }}>
                  🖱️ Mouse Adjust
                </span>
                <span className="badge" style={{ fontSize: '0.6875rem', background: 'var(--color-bg-2)', border: '1px solid var(--color-border)' }}>
                  ✂️ Passport 8-Pack
                </span>
                <span className="badge" style={{ fontSize: '0.6875rem', background: 'var(--color-bg-2)', border: '1px solid var(--color-border)' }}>
                  🖨️ 300 DPI Print
                </span>
                <span className="badge" style={{ fontSize: '0.6875rem', background: 'var(--color-bg-2)', border: '1px solid var(--color-border)' }}>
                  🎨 Photoshop Tones
                </span>
              </div>

              <Link to="/photo-print" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>
                Open Photo Studio →
              </Link>
            </div>

            <div className="format-category-card card">
              <div className="format-category-icon text-accent">
                <Binary size={22} />
              </div>
              <h3>File Inspector</h3>
              <p className="text-sm text-muted">Inspect raw magic bytes to detect real file types (like PNG disguised as .devtools).</p>
              <Link to="/analyzer" className="btn btn-ghost btn-sm mt-2" style={{ width: 'fit-content', padding: '4px 8px' }}>
                Analyze File →
              </Link>
            </div>

            <div className="format-category-card card">
              <div className="format-category-icon text-primary">
                <Database size={22} />
              </div>
              <h3>JSON to PDF</h3>
              <p className="text-sm text-muted">Format, syntax-wrap, and render JSON datasets directly into clean PDF documents.</p>
              <Link to="/convert/json-to-pdf" className="btn btn-ghost btn-sm mt-2" style={{ width: 'fit-content', padding: '4px 8px' }}>
                Convert JSON →
              </Link>
            </div>

            <div className="format-category-card card">
              <div className="format-category-icon text-primary">
                <Code2 size={22} />
              </div>
              <h3>Code to PDF</h3>
              <p className="text-sm text-muted">Convert Python, JavaScript, TypeScript, and SQL code with monospace pagination.</p>
              <Link to="/convert/code-to-pdf" className="btn btn-ghost btn-sm mt-2" style={{ width: 'fit-content', padding: '4px 8px' }}>
                Convert Code →
              </Link>
            </div>

            <div className="format-category-card card">
              <div className="format-category-icon text-accent">
                <FileText size={22} />
              </div>
              <h3>CSV to PDF</h3>
              <p className="text-sm text-muted">Transform comma-separated data tables into readable, paginated PDF reports.</p>
              <Link to="/convert/csv-to-pdf" className="btn btn-ghost btn-sm mt-2" style={{ width: 'fit-content', padding: '4px 8px' }}>
                Convert CSV →
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/converters" className="btn btn-primary">
              <Sparkles size={16} />
              <span>Explore All 25+ Converters</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Format Overview ─────────────────────────────────────────── */}
      <section className="section" aria-labelledby="formats-heading">
        <div className="container">
          <div className="section-header">
            <h2 id="formats-heading">Broad Format Support</h2>
            <p>Works with the formats you actually use — and more.</p>
          </div>
          <div className="format-grid">
            {FORMAT_CATEGORIES.map((cat) => (
              <div key={cat.label} className="format-category-card card">
                <div className="format-category-icon text-primary">{cat.icon}</div>
                <h3>{cat.label}</h3>
                <p className="text-sm text-muted">{cat.formats}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/formats" className="btn btn-ghost">
              View All Supported Formats <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section className="section section-dark" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-header">
            <h2 id="features-heading">Why ConvertX?</h2>
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
      <section className="section section-dark" id="faq" aria-labelledby="faq-heading">
        <div className="container-sm">
          <div className="section-header">
            <h2 id="faq-heading">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="section cta-section" aria-label="Call to action">
        <div className="container text-center">
          <h2>Ready to convert your files?</h2>
          <p className="mt-4">Free. Secure. No sign-up required.</p>
          <div className="cta-buttons mt-8">
            <Link to="/convert" className="btn btn-accent btn-xl">
              <Zap size={20} fill="currentColor" />
              Start Converting Now
            </Link>
            <Link to="/formats" className="btn btn-ghost btn-lg">
              View Supported Formats
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
