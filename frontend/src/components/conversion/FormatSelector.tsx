import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Image,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  Globe,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import type { OutputFormat } from '../../types';
import { useConversionStore } from '../../store/conversionStore';
import { CONVERTER_TOOLS, type ConverterTool } from '../../config/convertersCatalog';
import { showToast } from '../ui/Toast';

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
  const { outputFormat, setOutputFormat, isUploading, isConverting } = useConversionStore();
  const disabled = isUploading || isConverting;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('all');
  const [activeTool, setActiveTool] = useState<ConverterTool | null>(null);

  const filteredTools = CONVERTER_TOOLS.filter((t) => {
    if (selectedCat === 'all') return true;
    if (selectedCat === 'data') return t.category === 'data' || t.category === 'text_code';
    return t.category === selectedCat;
  });

  const handleToolClick = (tool: ConverterTool) => {
    const supportedOutputs: OutputFormat[] = ['pdf', 'jpg', 'png', 'webp', 'docx', 'txt'];
    let targetFormat: OutputFormat = 'pdf';

    const matched = tool.outputFormats
      ?.map((f) => f.toLowerCase())
      .find((f) => (supportedOutputs as string[]).includes(f));

    if (matched) {
      targetFormat = matched as OutputFormat;
    }

    setOutputFormat(targetFormat);
    setActiveTool(tool);
    setDrawerOpen(false);
    showToast('success', `Selected: ${tool.title} · Converting to ${targetFormat.toUpperCase()} here`);
  };

  const handlePrimaryClick = (fmtValue: OutputFormat) => {
    if (!disabled) {
      setOutputFormat(fmtValue);
      setActiveTool(null);
      setDrawerOpen(false);
    }
  };

  return (
    <div className="format-selector-wrapper" style={{ width: '100%' }}>
      {/* Active Workflow Preset Banner */}
      {activeTool && (
        <div className="active-tool-banner animate-fadeIn">
          <div className="active-tool-info">
            <span className="active-tool-icon">
              <CheckCircle2 size={16} />
            </span>
            <div className="active-tool-text-group">
              <span className="active-tool-preset-label">Active Workflow Preset</span>
              <span className="active-tool-title">{activeTool.title}</span>
            </div>
            <span className="active-tool-arrow">→</span>
            <span className="active-tool-badge">{outputFormat.toUpperCase()}</span>
          </div>
          <button
            type="button"
            className="active-tool-reset-btn"
            onClick={() => {
              setActiveTool(null);
              showToast('info', 'Returned to standard converter mode');
            }}
            title="Reset preset to default"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        </div>
      )}

      <div className="format-selector" role="radiogroup" aria-label="Output format">
        <label className="format-selector-label">Convert to:</label>
        <div className="format-selector-options" style={{ flexWrap: 'wrap' }}>
          {/* Primary format options */}
          {PRIMARY_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              role="radio"
              aria-checked={outputFormat === fmt.value && !activeTool}
              className={`format-option ${outputFormat === fmt.value && !drawerOpen && !activeTool ? 'format-option-active' : ''}`}
              onClick={() => handlePrimaryClick(fmt.value)}
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
            className={`format-option-all ${drawerOpen ? 'active' : ''} ${activeTool ? 'has-active-tool' : ''}`}
            onClick={() => !disabled && setDrawerOpen(!drawerOpen)}
            disabled={disabled}
            title="Browse all 25+ converter options"
          >
            <span className="format-all-badge">{activeTool ? 'Active' : '25+ Tools'}</span>
            <span className="format-option-icon" style={{ color: 'var(--color-primary-light)' }}>
              <Sparkles size={18} />
            </span>
            <span className="format-option-label" style={{ color: 'var(--color-text)', fontWeight: 700 }}>
              {activeTool ? activeTool.outputFormats[0]?.toUpperCase() + ' Mode' : 'All Converters'}
            </span>
            <span className="format-option-desc" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
              {drawerOpen ? 'Click to close' : activeTool ? 'Change Tool Preset' : 'Explore All Formats'}
            </span>
          </button>
        </div>
      </div>

      {/* In-Section All Converters Drawer */}
      {drawerOpen && (
        <div className="all-converters-drawer animate-fadeIn">
          <div className="drawer-header">
            <div className="drawer-title-group">
              <div className="drawer-icon-box">
                <Compass size={18} />
              </div>
              <div>
                <h4 className="drawer-title">All Supported Converters & Tools</h4>
                <span className="drawer-subtitle">
                  Pick a workflow or switch output format
                </span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="drawer-close-btn"
              title="Close drawer"
              aria-label="Close drawer"
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
            {filteredTools.map((tool) => {
              const tag = tool.outputFormats[0]?.toUpperCase() || 'TOOL';
              const isPdf = tag === 'PDF';
              const isImg = tag === 'JPG' || tag === 'PNG' || tag === 'WEBP';
              const isSpecial = tag === 'INSPECT' || tag === 'PRINT';
              const tagClass = isPdf ? 'tag-pdf' : isImg ? 'tag-img' : isSpecial ? 'tag-special' : 'tag-default';

              return (
                <div
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className={`drawer-tool-item ${activeTool?.id === tool.id ? 'selected-tool-item' : ''}`}
                  title={tool.title}
                >
                  <span className="drawer-tool-name">
                    {tool.title}
                  </span>
                  <span className={`drawer-tool-tag ${tagClass}`}>
                    {tag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer with Link to All Converters Page */}
          <div className="drawer-footer">
            <span className="drawer-footer-text">
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
