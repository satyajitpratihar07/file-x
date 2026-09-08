import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  LayoutGrid,
  Star,
  FileText,
  FileDown,
  Image,
  Layers,
  Camera,
  Table,
  Presentation,
  Code,
  Database,
  Globe,
  BookOpen,
  Archive,
  PenTool,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CONVERTER_TOOLS, CATEGORY_FILTERS } from '../config/convertersCatalog';
import type { CatalogCategory, ConverterTool } from '../config/convertersCatalog';
import { RecentConversions } from '../components/common/RecentConversions';
import '../styles/globals.css';
import '../styles/components.css';

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'grid': return <LayoutGrid size={15} />;
    case 'star': return <Star size={15} />;
    case 'file-text': return <FileText size={15} />;
    case 'pdf': return <FileDown size={15} />;
    case 'image': return <Image size={15} />;
    case 'images': return <Layers size={15} />;
    case 'camera': return <Camera size={15} />;
    case 'table': return <Table size={15} />;
    case 'presentation': return <Presentation size={15} />;
    case 'code': return <Code size={15} />;
    case 'database': return <Database size={15} />;
    case 'globe': return <Globe size={15} />;
    case 'book': return <BookOpen size={15} />;
    case 'archive': return <Archive size={15} />;
    case 'pen-tool': return <PenTool size={15} />;
    case 'zap': return <Zap size={15} />;
    default: return <LayoutGrid size={15} />;
  }
};

export const AllConvertersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('all');
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const filteredTools = useMemo(() => {
    return CONVERTER_TOOLS.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === ('popular' as any)
          ? tool.popular
          : tool.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.inputFormats.some((fmt) => fmt.toLowerCase().includes(q)) ||
        tool.outputFormats.some((fmt) => fmt.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <main className="converters-page">
      {/* Hero Header */}
      <div className="converters-hero">
        <div className="converters-badge">
          <span className="converters-pulse-dot" />
          <span>Universal Conversion Engine v2.0</span>
        </div>
        <h1 className="converters-title">
          Explore All <span>File Converters</span>
        </h1>
        <p className="converters-subtitle">
          Convert documents, images, PDFs, spreadsheets, code, and structured data with true binary signature inspection and zero placeholder content.
        </p>

        {/* Search Bar */}
        <div className="catalog-search-wrapper">
          <div className="catalog-search-box">
            <Search size={18} className="catalog-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 25+ tools by name, input, or output format (e.g. PDF, JPG, DOCX, CSV)..."
              className="catalog-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="catalog-search-clear"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Conversions History */}
      <RecentConversions />

      {/* Category Pills Navigation with Scroll Buttons */}
      <div className="catalog-tabs-wrapper">
        <button
          type="button"
          className="tabs-nav-btn left"
          onClick={() => scrollTabs('left')}
          title="Scroll categories left"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="catalog-tabs-container" ref={tabsRef}>
          <div className="catalog-tabs">
            {CATEGORY_FILTERS.map((cat) => {
              const count =
                cat.id === 'all'
                  ? CONVERTER_TOOLS.length
                  : cat.id === ('popular' as any)
                  ? CONVERTER_TOOLS.filter((t) => t.popular).length
                  : CONVERTER_TOOLS.filter((t) => t.category === cat.id).length;

              const isSelected = selectedCategory === (cat.id as any);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`catalog-tab ${isSelected ? 'catalog-tab-active' : ''}`}
                >
                  <span className="catalog-tab-icon">{getCategoryIcon(cat.icon)}</span>
                  <span className="catalog-tab-label">{cat.label}</span>
                  <span className="catalog-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="tabs-nav-btn right"
          onClick={() => scrollTabs('right')}
          title="Scroll categories right"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={32} />
          </div>
          <h3>No converter tools found</h3>
          <p>No tools matched "{searchQuery}" in this category.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="btn btn-primary btn-sm mt-4"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredTools.map((tool) => (
            <ConverterCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </main>
  );
};

const ConverterCard: React.FC<{ tool: ConverterTool }> = ({ tool }) => {
  const isAnalyzer = tool.id === 'file-analyzer';
  const isUniversal = tool.id === 'universal-converter';
  const isPhotoPrint = tool.id === 'photo-print-studio';
  const isLatex = tool.id === 'latex-to-pdf';

  const linkPath = isAnalyzer
    ? '/analyzer'
    : isUniversal
    ? '/convert'
    : isPhotoPrint
    ? '/photo-print'
    : isLatex
    ? '/latex'
    : `/convert/${tool.slug}`;

  const buttonLabel = isAnalyzer
    ? 'Inspect File'
    : isPhotoPrint
    ? 'Open Photo Studio'
    : isLatex
    ? 'Open LaTeX Studio'
    : 'Open Converter';

  return (
    <div className="catalog-card">
      <div>
        {/* Top Header with Badges */}
        <div className="catalog-card-header">
          <span className="catalog-card-category">{tool.categoryLabel}</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {tool.recentlyAdded && (
              <span className="catalog-status-badge catalog-status-new">
                <Sparkles size={10} />
                <span>NEW</span>
              </span>
            )}
            {tool.status === 'supported' ? (
              <span className="catalog-status-badge catalog-status-active">
                <CheckCircle2 size={11} />
                <span>Active</span>
              </span>
            ) : (
              <span className="catalog-status-badge catalog-status-soon">
                <AlertCircle size={11} />
                <span>Coming Soon</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="catalog-card-title">
          {tool.title}
        </h3>

        {/* Short Description */}
        <p className="catalog-card-desc">
          {tool.shortDescription}
        </p>

        {/* Format Flow Badges */}
        <div className="catalog-format-flow">
          {tool.inputFormats.map((fmt) => (
            <span key={fmt} className="catalog-format-chip">
              {fmt.toUpperCase()}
            </span>
          ))}
          {tool.outputFormats[0] !== 'INSPECT' && (
            <>
              <span className="catalog-format-arrow">→</span>
              {tool.outputFormats.map((fmt) => (
                <span key={fmt} className="catalog-format-chip catalog-format-chip-out">
                  {fmt.toUpperCase()}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Action Button */}
      {tool.status === 'supported' ? (
        <Link to={linkPath} className="catalog-btn catalog-btn-primary">
          <span>{buttonLabel}</span>
          <ArrowRight size={15} />
        </Link>
      ) : (
        <button disabled className="catalog-btn catalog-btn-disabled">
          <span>Coming Soon</span>
        </button>
      )}
    </div>
  );
};
