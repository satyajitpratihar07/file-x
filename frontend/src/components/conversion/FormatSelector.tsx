import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Image,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  Globe,
  Compass
} from 'lucide-react';
import type { OutputFormat } from '../../types';
import { useConversionStore } from '../../store/conversionStore';
import { CONVERTER_TOOLS } from '../../config/convertersCatalog';

interface FormatOption {
  value: OutputFormat;
  label: string;
  description: string;
  icon: ReactNode;
}

const PRIMARY_FORMATS: FormatOption[] = [
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Portable Document',
    icon: <FileText size={18} />,
  },
  {
    value: 'jpg',
    label: 'JPG',
    description: 'JPEG Image',
    icon: <Image size={18} />,
  },
  {
    value: 'png',
    label: 'PNG',
    description: 'PNG Lossless',
    icon: <Layers size={18} />,
  },
  {
    value: 'webp',
    label: 'WEBP',
    description: 'WebP Modern Image',
    icon: <Globe size={18} />,
  },
];

const DRAWER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'documents', label: 'Documents' },
  { id: 'images', label: 'Images' },
  { id: 'pdf_tools', label: 'PDF Tools' },
  { id: 'spreadsheets', label: 'Spreadsheets' },
  { id: 'data', label: 'Data & Code' },
  { id: 'utilities', label: 'Utilities' },
];

export function FormatSelector() {
  const navigate = useNavigate();
  const { outputFormat, setOutputFormat, isUploading, isConverting } = useConversionStore();
  const disabled = isUploading || isConverting;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('all');

  const filteredTools = CONVERTER_TOOLS.filter((t) => {
    if (selectedCat === 'all') return true;
    if (selectedCat === 'data') return t.category === 'data' || t.category === 'text_code';
    return t.category === selectedCat;
  });

  const handleToolClick = (tool: typeof CONVERTER_TOOLS[0]) => {
    if (tool.slug === 'analyzer') {
      navigate('/analyzer');
      return;
    }
    // If outputFormat is one of the supported formats, set it
    const firstOutput = tool.outputFormats[0] as OutputFormat;
    if (['pdf', 'jpg', 'png', 'webp'].includes(firstOutput)) {
      setOutputFormat(firstOutput);
    }
    // Navigate to specialized page if not universal
    if (tool.slug !== 'universal-converter') {
      navigate(`/convert/${tool.slug}`);
    }
    setDrawerOpen(false);
  };

  return (
    <div className="format-selector-wrapper" style={{ width: '100%' }}>
      <div className="format-selector" role="radiogroup" aria-label="Output format">
        <label className="format-selector-label">Convert to:</label>
        <div className="format-selector-options" style={{ flexWrap: 'wrap' }}>
          {/* Primary format options */}
          {PRIMARY_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              role="radio"
              aria-checked={outputFormat === fmt.value}
              className={`format-option ${outputFormat === fmt.value && !drawerOpen ? 'format-option-active' : ''}`}
              onClick={() => {
                if (!disabled) {
                  setOutputFormat(fmt.value);
                  setDrawerOpen(false);
                }
              }}
              disabled={disabled}
            >
              <span className="format-option-icon">{fmt.icon}</span>
              <span className="format-option-label">{fmt.label}</span>
              <span className="format-option-desc">{fmt.description}</span>
            </button>
          ))}

          {/* All Converters Option Button */}
          <button
            type="button"
            className={`format-option-all ${drawerOpen ? 'active' : ''}`}
            onClick={() => !disabled && setDrawerOpen(!drawerOpen)}
            disabled={disabled}
            title="Browse all 25+ converter options"
          >
            <span className="format-all-badge">25+ Tools</span>
            <span className="format-option-icon" style={{ color: 'var(--color-accent)' }}>
              <Sparkles size={18} />
            </span>
            <span className="format-option-label" style={{ color: '#fff' }}>
              All Converters
            </span>
            <span className="format-option-desc" style={{ color: 'var(--color-accent)' }}>
              {drawerOpen ? 'Click to close' : 'Explore All Formats'}
            </span>
          </button>
        </div>
      </div>

      {/* In-Section All Converters Drawer */}
      {drawerOpen && (
        <div className="all-converters-drawer animate-fadeIn">
          <div className="drawer-header">
            <div className="drawer-title-group">
              <Compass size={18} style={{ color: 'var(--color-accent)' }} />
              <div>
                <h4 className="drawer-title">All Supported Converters & Tools</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                  Pick a workflow or switch output format
                </span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="drawer-close-btn"
              title="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Category Filters */}
          <div className="drawer-categories">
            {DRAWER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`drawer-cat-btn ${selectedCat === cat.id ? 'drawer-cat-active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Tools Grid */}
          <div className="drawer-tools-grid">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="drawer-tool-item"
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tool.title}
                </span>
                <span className="drawer-tool-tag">
                  {tool.outputFormats[0]?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Drawer Footer with Link to All Converters Page */}
          <div className="drawer-footer">
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
              Full catalog with 14 categories & specifications
            </span>
            <Link
              to="/converters"
              onClick={() => setDrawerOpen(false)}
              className="drawer-catalog-link"
            >
              <span>View All Converters Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
