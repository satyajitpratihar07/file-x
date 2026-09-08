import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FileText, Image, FileSpreadsheet, Presentation, Code2, Layers, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import type { SupportedFormat } from '../types';
import { getCategoryLabel } from '../utils/fileUtils';

const CATEGORY_ICONS: Record<string, ReactNode> = {
  documents: <FileText size={20} />,
  spreadsheets: <FileSpreadsheet size={20} />,
  presentations: <Presentation size={20} />,
  images: <Image size={20} />,
  text_code: <Code2 size={20} />,
  pdf_tools: <Layers size={20} />,
};

const CATEGORY_ORDER = ['documents', 'spreadsheets', 'presentations', 'images', 'text_code', 'pdf_tools'];

export function SupportedFormatsPage() {
  const [grouped, setGrouped] = useState<Record<string, SupportedFormat[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService
      .getSupportedFormats()
      .then((data) => { setGrouped(data.grouped); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Supported Formats</h1>
        <p>These are the file formats ConvertX can actually convert — no false claims.</p>
      </div>

      <div className="container">
        {loading && (
          <div className="loading-state">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p>Loading supported formats...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p className="text-error">Failed to load formats: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="formats-page-grid">
            {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((category) => (
              <section key={category} className="formats-category" aria-labelledby={`cat-${category}`}>
                <div className="formats-category-header">
                  <span className="text-primary">{CATEGORY_ICONS[category]}</span>
                  <h2 id={`cat-${category}`}>{getCategoryLabel(category)}</h2>
                  <span className="badge badge-queued">{grouped[category].length} formats</span>
                </div>

                <div className="formats-table">
                  <div className="formats-table-header">
                    <span>Format</span>
                    <span>Type</span>
                    <span>Converts to</span>
                    <span>Notes</span>
                  </div>
                  {grouped[category].map((fmt) => (
                    <div key={`${fmt.extension}-${fmt.category}`} className="formats-table-row">
                      <span className="format-ext-chip">.{fmt.extension}</span>
                      <span className="text-sm text-muted">{fmt.label}</span>
                      <span className="format-outputs">
                        {fmt.outputFormats.map((o) => (
                          <span key={o} className="badge badge-completed">{o.toUpperCase()}</span>
                        ))}
                      </span>
                      <span className="text-xs text-muted">{fmt.notes || '—'}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="formats-note card">
          <h3>Honest Format Support</h3>
          <p>
            ConvertX only lists formats that are genuinely supported by tested conversion pipelines.
            We use LibreOffice for Office documents (requires Docker/Linux), Sharp for images,
            and PDFKit for text and code files. If a format is listed here, it works.
          </p>
          <p className="mt-4">
            <strong>Need a format not listed?</strong> Office document conversion (DOCX, XLSX, PPTX)
            requires LibreOffice headless, which is available in the Docker deployment.
            Running on a bare Windows machine without LibreOffice will fall back to a graceful error message.
          </p>
        </div>
      </div>
    </main>
  );
}
