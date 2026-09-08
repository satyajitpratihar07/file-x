import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { CONVERTER_TOOLS } from '../config/convertersCatalog';
import { SpecificToolUploader } from '../components/upload/SpecificToolUploader';
import { PhotoPrintPage } from './PhotoPrintPage';
import { FileAnalyzerPage } from './FileAnalyzerPage';
import { LatexStudioPage } from './LatexStudioPage';
import { RecentConversions } from '../components/common/RecentConversions';
import '../styles/globals.css';
import '../styles/components.css';

export const DynamicToolPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const tool = CONVERTER_TOOLS.find((t) => t.slug === slug);

  // If this route is photo print studio or analyzer, render their dedicated page
  if (slug === 'photo-print') {
    return <PhotoPrintPage />;
  }

  if (slug === 'analyzer' || slug === 'file-analyzer') {
    return <FileAnalyzerPage />;
  }

  if (slug === 'latex' || slug === 'latex-to-pdf' || slug === 'latex-studio' || slug === 'tex-to-pdf') {
    return <LatexStudioPage />;
  }

  if (!tool) {
    return (
      <main className="page text-center py-16">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-white mb-2">Tool Not Found</h1>
          <p className="text-slate-400 mb-6">The requested converter tool does not exist.</p>
          <Link to="/converters" className="btn btn-primary">
            Browse All Converters
          </Link>
        </div>
      </main>
    );
  }

  const relatedTools = CONVERTER_TOOLS.filter(
    (t) => t.category === tool.category && t.id !== tool.id
  ).slice(0, 4);

  return (
    <div className="dynamic-tool-view">
      {/* ─── Dedicated Tool-Specific Upload Section ─── */}
      <SpecificToolUploader tool={tool} />

      {/* ─── Quick Universal Converter Switch ─── */}
      <div className="text-center mt-6 mb-8">
        <Link
          to="/convert"
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} />
          <span>Need to convert multiple mixed formats? Use Universal Converter</span>
        </Link>
      </div>

      {/* Recent Conversions History */}
      <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <RecentConversions />
      </div>

      {/* Capabilities Section */}
      <section className="section section-dark" style={{ marginTop: '4rem' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div className="section-header">
            <h2>Dedicated Engine Capabilities</h2>
            <p>Built with enterprise-grade conversion libraries and binary header verification.</p>
          </div>

          <div className="dynamic-features-grid">
            {tool.features.map((feature, idx) => (
              <div key={idx} className="dynamic-feature-item">
                <div className="dynamic-feature-icon">
                  <CheckCircle2 size={15} />
                </div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Converters */}
      {relatedTools.length > 0 && (
        <section className="section">
          <div className="container" style={{ maxWidth: '960px' }}>
            <div className="section-header">
              <h2>Related {tool.categoryLabel} Converters</h2>
              <p>Other popular conversion pipelines in this category.</p>
            </div>

            <div className="catalog-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {relatedTools.map((rel) => (
                <div key={rel.id} className="catalog-card">
                  <div>
                    <span className="catalog-card-category">{rel.categoryLabel}</span>
                    <h3 className="catalog-card-title" style={{ marginTop: '8px' }}>
                      {rel.title}
                    </h3>
                    <p className="catalog-card-desc">{rel.shortDescription}</p>
                  </div>
                  <Link to={`/convert/${rel.slug}`} className="catalog-btn catalog-btn-primary">
                    <span>Use Converter</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
