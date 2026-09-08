import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Binary,
  Zap,
  Upload
} from 'lucide-react';
import type { FileAnalyzerResult } from '../types';
import '../styles/globals.css';
import '../styles/components.css';

export const FileAnalyzerPage: React.FC = () => {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FileAnalyzerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error || 'Failed to inspect file structure');
      }
    } catch {
      setError('Could not connect to file analyzer service');
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <main className="analyzer-page">
      <div className="converters-hero">
        <div className="converters-badge">
          <Binary size={14} />
          <span>Magic-Byte Signature Inspection</span>
        </div>
        <h1 className="converters-title">
          File Inspector & <span>Format Analyzer</span>
        </h1>
        <p className="converters-subtitle">
          Upload any file with an unknown, custom, or disguised extension (like <code>.devtools</code>, <code>.data</code>, or <code>.bin</code>). Our engine inspects raw binary magic bytes to determine what it actually is.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`analyzer-dropzone ${dragActive ? 'analyzer-dropzone-active' : ''}`}
      >
        <input
          type="file"
          id="analyzer-input"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
        <label htmlFor="analyzer-input" style={{ cursor: 'pointer', display: 'block' }}>
          <div className="analyzer-icon-circle">
            <Upload size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Select or drop any file to inspect
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginBottom: '20px' }}>
            Inspects actual binary headers rather than trusting the filename extension
          </p>
          <span className="btn btn-accent btn-md">
            <Search size={16} />
            <span>Analyze File Signature</span>
          </span>
        </label>
      </div>

      {/* Loading State */}
      {analyzing && (
        <div className="loading-state" style={{ marginTop: '2rem' }}>
          <div className="loading-spinner" />
          <p style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem', fontWeight: 600 }}>
            Inspecting binary headers and calculating magic-byte signatures...
          </p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="error-alert" style={{ marginTop: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Result Card */}
      {result && (
        <div className="analyzer-result-card animate-fadeInUp">
          <div className="analyzer-result-header">
            <div>
              <span className="catalog-status-badge catalog-status-active">
                <FileCheck2 size={12} />
                <span>SIGNATURE VERIFIED</span>
              </span>
              <h2 className="analyzer-file-title" style={{ marginTop: '8px' }}>
                {result.filename}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', display: 'block' }}>File Size</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{formatSize(result.sizeBytes)}</span>
            </div>
          </div>

          <div className="analyzer-stats-grid">
            <div className="analyzer-stat-box">
              <span className="analyzer-stat-label">Detected MIME Type</span>
              <span className="analyzer-stat-value" style={{ color: 'var(--color-accent)' }}>
                {result.detectedMimeType}
              </span>
            </div>

            <div className="analyzer-stat-box">
              <span className="analyzer-stat-label">Verified Category</span>
              <span className="analyzer-stat-value">
                {result.category}
              </span>
            </div>

            <div className="analyzer-stat-box">
              <span className="analyzer-stat-label">Detected Format</span>
              <span className="analyzer-stat-value" style={{ textTransform: 'uppercase' }}>
                .{result.detectedExtension}
              </span>
            </div>

            <div className="analyzer-stat-box">
              <span className="analyzer-stat-label">Magic Bytes (Hex Signature)</span>
              <span className="analyzer-magic-bytes">
                {result.magicBytesHex}
              </span>
            </div>
          </div>

          {result.dimensions && (
            <div className="analyzer-stat-box" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="analyzer-stat-label" style={{ margin: 0 }}>Image Pixel Dimensions</span>
              <span className="analyzer-stat-value" style={{ color: 'var(--color-accent)' }}>
                {result.dimensions.width} × {result.dimensions.height} px
              </span>
            </div>
          )}

          {result.pageCount && (
            <div className="analyzer-stat-box" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="analyzer-stat-label" style={{ margin: 0 }}>Document Page Count</span>
              <span className="analyzer-stat-value" style={{ color: 'var(--color-accent)' }}>
                {result.pageCount} Pages
              </span>
            </div>
          )}

          {/* Direct Conversion CTA */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate('/convert')}
              className="btn btn-primary btn-xl"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Zap size={18} fill="currentColor" />
              <span>Convert this file now with Any-DoC</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
