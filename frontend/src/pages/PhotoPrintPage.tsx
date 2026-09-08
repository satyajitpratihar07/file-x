import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Printer,
  FileDown,
  Image as ImageIcon,
  Upload,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Sparkles,
  Crop,
  Layers,
  Type,
  FileText,
  RefreshCw,
  Eye,
  Move,
  Download,
  ChevronDown,
} from 'lucide-react';
import {
  PAPER_SIZES,
  DEFAULT_PRINT_STATE,
  DEFAULT_ADJUSTMENTS,
  renderPrintCanvas,
  getActivePaperDimensions,
  computePhotoLayout,
  generatePrintPdf,
  downloadCanvasImage,
  triggerDirectPrint,
} from '../utils/photoPrintUtils';
import type { PhotoPrintState, FilterPreset } from '../utils/photoPrintUtils';
import '../styles/photo-print.css';

type ActiveTab = 'paper' | 'adjust' | 'photoshop' | 'filters' | 'crop' | 'frame';

export function PhotoPrintPage() {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('paper');
  const [state, setState] = useState<PhotoPrintState>({ ...DEFAULT_PRINT_STATE });
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [showGizmo, setShowGizmo] = useState<boolean>(true);
  const [isHoveringGizmo, setIsHoveringGizmo] = useState<boolean>(false);
  const [dragSession, setDragSession] = useState<{
    mode: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    initialScale: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
    startDist: number;
    startAngle: number;
  } | null>(null);

  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Close export dropdown on click outside or escape
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  // Load image when file is selected
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WEBP, etc.)');
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      const isLandscape = img.naturalWidth > img.naturalHeight;
      setState((prev) => ({
        ...prev,
        orientation: isLandscape ? 'landscape' : 'portrait',
      }));
    };
    img.src = url;
  }, []);

  // One-click demo sample photo loader
  const loadSamplePhoto = useCallback(() => {
    const off = document.createElement('canvas');
    off.width = 1200;
    off.height = 1600;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1600);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.4, '#312e81');
    bgGrad.addColorStop(0.7, '#4338ca');
    bgGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Subtle radial aura
    const aura = ctx.createRadialGradient(600, 680, 50, 600, 680, 550);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    aura.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 1200, 1600);

    // Warm portrait silhouette
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(600, 560, 200, 0, Math.PI * 2);
    ctx.fill();

    // Body silhouette
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(600, 1150, 360, 320, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(600, 510, 210, Math.PI, Math.PI * 2);
    ctx.fill();

    // Frame badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(240, 1380, 720, 140, 24);
    } else {
      ctx.rect(240, 1380, 720, 140);
    }
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Studio Sample Portrait', 600, 1445);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 28px Inter, sans-serif';
    ctx.fillText('Ready for Printout & Adjustments', 600, 1490);

    const dataUrl = off.toDataURL('image/jpeg', 0.95);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setImageSrc(dataUrl);
      setState((prev) => ({
        ...prev,
        orientation: 'portrait',
      }));
    };
    img.src = dataUrl;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Re-render canvas whenever state or comparing state changes
  useEffect(() => {
    if (!canvasRef.current || !imageElement) return;

    const targetCanvas = canvasRef.current;
    if (isComparing) {
      const cleanState: PhotoPrintState = {
        ...state,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        filter: 'none',
        crop: null,
      };
      renderPrintCanvas(targetCanvas, imageElement, cleanState);
    } else {
      renderPrintCanvas(targetCanvas, imageElement, state);
    }
  }, [state, imageElement, isComparing]);

  const BASE_DISPLAY_HEIGHT = 460;
  const { paper, widthMm, heightMm, pixelWidth, pixelHeight, aspectRatio } = getActivePaperDimensions(state);

  let displayHeight = Math.round(BASE_DISPLAY_HEIGHT * previewZoom);
  let displayWidth = Math.round(displayHeight * aspectRatio);

  const maxAllowedWidth = Math.round(580 * previewZoom);
  if (displayWidth > maxAllowedWidth) {
    displayWidth = maxAllowedWidth;
    displayHeight = Math.round(displayWidth / aspectRatio);
  }

  const scaleRatio = displayWidth / pixelWidth;
  const photoAspect = imageElement ? imageElement.naturalWidth / imageElement.naturalHeight : 1;
  const layout = computePhotoLayout(state, photoAspect);

  const gizmoBox = {
    width: layout.targetW * scaleRatio,
    height: layout.targetH * scaleRatio,
    left: layout.centerX * scaleRatio - (layout.targetW * scaleRatio) / 2,
    top: layout.centerY * scaleRatio - (layout.targetH * scaleRatio) / 2,
  };

  // Global mouse event listeners for transform gizmo (supports fast dragging without losing focus)
  useEffect(() => {
    if (!dragSession) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragSession.mode === 'move') {
        const dx = e.clientX - dragSession.startX;
        const dy = e.clientY - dragSession.startY;
        const printAreaScreenW = (layout.printAreaW * scaleRatio) || 1;
        const printAreaScreenH = (layout.printAreaH * scaleRatio) || 1;

        const deltaOffsetX = (dx / printAreaScreenW) * 100;
        const deltaOffsetY = (dy / printAreaScreenH) * 100;

        setState((prev) => ({
          ...prev,
          offsetX: Math.max(-100, Math.min(100, Number((dragSession.initialOffsetX + deltaOffsetX).toFixed(1)))),
          offsetY: Math.max(-100, Math.min(100, Number((dragSession.initialOffsetY + deltaOffsetY).toFixed(1)))),
        }));
      } else if (dragSession.mode === 'scale') {
        const curDist = Math.hypot(e.clientX - dragSession.centerX, e.clientY - dragSession.centerY);
        const ratio = curDist / (dragSession.startDist || 1);
        const newScale = Math.max(0.15, Math.min(3.5, Number((dragSession.initialScale * ratio).toFixed(2))));
        setState((prev) => ({ ...prev, scale: newScale }));
      } else if (dragSession.mode === 'rotate') {
        const curAngle = Math.atan2(e.clientY - dragSession.centerY, e.clientX - dragSession.centerX) * (180 / Math.PI);
        const deltaAngle = curAngle - dragSession.startAngle;
        let newRot = Math.round(dragSession.initialRotation + deltaAngle);
        while (newRot > 180) newRot -= 360;
        while (newRot < -180) newRot += 360;
        setState((prev) => ({ ...prev, rotation: newRot }));
      }
    };

    const handleWindowMouseUp = () => {
      setDragSession(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragSession, layout.printAreaW, layout.printAreaH, scaleRatio]);

  const startGizmoDrag = (e: React.MouseEvent, mode: 'move' | 'scale' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const screenCenterX = canvasRect.left + layout.centerX * scaleRatio;
    const screenCenterY = canvasRect.top + layout.centerY * scaleRatio;

    const startDist = Math.hypot(e.clientX - screenCenterX, e.clientY - screenCenterY);
    const startAngle = Math.atan2(e.clientY - screenCenterY, e.clientX - screenCenterX) * (180 / Math.PI);

    setDragSession({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: state.offsetX,
      initialOffsetY: state.offsetY,
      initialScale: state.scale,
      initialRotation: state.rotation,
      centerX: screenCenterX,
      centerY: screenCenterY,
      startDist,
      startAngle,
    });
  };

  const handlePaperWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setState((prev) => ({
      ...prev,
      scale: Math.max(0.15, Math.min(3.5, Number((prev.scale + delta).toFixed(2)))),
    }));
  };

  // Quick Preset Handlers
  const applyPreset = (type: 'passport' | 'photo4x6' | 'framed5x7' | 'a4print' | 'polaroid') => {
    switch (type) {
      case 'passport':
        setState((prev) => ({
          ...prev,
          paperSizeId: '4x6',
          orientation: 'portrait',
          layoutMode: 'grid',
          gridCopies: 8,
          gridGapMm: 4,
          marginMm: 6,
          showCuttingGuides: true,
          showSafeMargin: true,
          fitMode: 'contain',
          scale: 1,
          borderWidthMm: 0.5,
          borderColor: '#e2e8f0',
          borderRadiusMm: 0,
          frameStyle: 'solid',
        }));
        break;
      case 'photo4x6':
        setState((prev) => ({
          ...prev,
          paperSizeId: '4x6',
          layoutMode: 'single',
          marginMm: 4,
          fitMode: 'contain',
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          showCuttingGuides: false,
          frameStyle: 'none',
        }));
        break;
      case 'framed5x7':
        setState((prev) => ({
          ...prev,
          paperSizeId: '5x7',
          layoutMode: 'single',
          marginMm: 8,
          fitMode: 'contain',
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          borderWidthMm: 2,
          borderColor: '#ffffff',
          frameStyle: 'solid',
        }));
        break;
      case 'a4print':
        setState((prev) => ({
          ...prev,
          paperSizeId: 'a4',
          layoutMode: 'single',
          marginMm: 10,
          fitMode: 'contain',
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          showCuttingGuides: false,
          frameStyle: 'none',
        }));
        break;
      case 'polaroid':
        setState((prev) => ({
          ...prev,
          paperSizeId: '4x6',
          layoutMode: 'single',
          marginMm: 6,
          fitMode: 'contain',
          scale: 0.85,
          offsetX: 0,
          offsetY: -6,
          frameStyle: 'polaroid',
          captionText: prev.captionText || 'Printout',
        }));
        break;
    }
  };

  // Direct Print Handler
  const handlePrint = () => {
    if (!canvasRef.current) return;
    triggerDirectPrint(canvasRef.current);
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    try {
      setExporting('pdf');
      const pdfBlob = await generatePrintPdf(canvasRef.current, state.paperSizeId, state.orientation);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo_print_${state.paperSizeId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  // JPG Export
  const handleExportJpg = () => {
    if (!canvasRef.current) return;
    setExporting('jpg');
    downloadCanvasImage(canvasRef.current, `photo_print_${state.paperSizeId}_${Date.now()}`, 'image/jpeg');
    setExporting(null);
  };

  return (
    <div className="photo-studio-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
        }}
      />

      {/* Top Header Bar */}
      <div className="studio-topbar">
        <div className="studio-title-box">
          <div className="studio-badge">
            <Printer size={13} />
            <span>Studio</span>
          </div>
          <div className="studio-title-content">
            <h1 className="studio-title">Photo Printout & Studio</h1>
            <span className="studio-subtitle">300 DPI High-Precision Photo Printing</span>
          </div>
        </div>

        <div className="studio-topbar-actions">
          {imageElement && (
            <>
              <button
                className="btn btn-secondary btn-sm studio-action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change or upload a different photo"
              >
                <Upload size={14} />
                <span>Replace</span>
              </button>

              <button
                className="btn btn-ghost btn-sm studio-action-btn"
                onClick={() => setState({ ...DEFAULT_PRINT_STATE })}
                title="Reset all settings to default"
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>

              {/* Export Dropdown Menu */}
              <div className="studio-export-wrapper" ref={exportMenuRef}>
                <button
                  className="btn btn-secondary btn-sm studio-action-btn export-trigger-btn"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  disabled={exporting !== null}
                  title="Export options: 300 DPI PDF or JPG"
                >
                  <Download size={14} />
                  <span>{exporting === 'pdf' ? 'Creating PDF...' : exporting === 'jpg' ? 'Saving JPG...' : 'Export'}</span>
                  <ChevronDown size={12} className={`dropdown-arrow ${exportMenuOpen ? 'open' : ''}`} />
                </button>

                {exportMenuOpen && (
                  <div className="studio-dropdown-card">
                    <button
                      className="studio-dropdown-option"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleExportPdf();
                      }}
                    >
                      <div className="dropdown-option-icon pdf-badge">
                        <FileDown size={16} />
                      </div>
                      <div className="dropdown-option-text">
                        <div className="option-name">Print-Ready PDF</div>
                        <div className="option-meta">300 DPI vector layout for printing</div>
                      </div>
                    </button>

                    <button
                      className="studio-dropdown-option"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleExportJpg();
                      }}
                    >
                      <div className="dropdown-option-icon jpg-badge">
                        <ImageIcon size={16} />
                      </div>
                      <div className="dropdown-option-text">
                        <div className="option-name">High-Res JPG</div>
                        <div className="option-meta">300 DPI full raster photo file</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Primary Print Button */}
              <button
                className="btn btn-primary btn-sm studio-print-btn"
                onClick={handlePrint}
                title="Send directly to printer at 300 DPI"
              >
                <Printer size={15} />
                <span>Print Photo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="studio-workspace">
        {/* Center Stage: White Page Canvas */}
        <div
          ref={stageRef}
          className="studio-stage"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {!imageElement ? (
            <div
              className="studio-empty-state"
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <div className="studio-upload-icon-circle">
                <Upload size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                Upload Photo for Printout
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', marginBottom: '20px' }}>
                Select or drag any photo (JPG, PNG, WEBP). Below it will appear on a realistic white
                sheet of paper ready to adjust, edit with Photoshop tools, and print!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Choose Photo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSamplePhoto();
                  }}
                  title="Try sample portrait to test studio tools instantly"
                >
                  <Sparkles size={16} /> Try Sample Photo
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Unified Quick Presets & Dimension Info Toolbar */}
              <div className="quick-preset-bar">
                <div className="quick-presets-group">
                  <span className="quick-presets-label">
                    Quick Layouts:
                  </span>
                  <button
                    className={`quick-preset-btn ${state.paperSizeId === '4x6' && state.layoutMode === 'grid' && state.gridCopies === 8 ? 'active' : ''}`}
                    onClick={() => applyPreset('passport')}
                    title="8 passport photos on 4x6 inch paper"
                  >
                    <Scissors size={13} /> Passport 8-Pack
                  </button>
                  <button
                    className={`quick-preset-btn ${state.paperSizeId === '4x6' && state.layoutMode === 'single' && state.frameStyle !== 'polaroid' ? 'active' : ''}`}
                    onClick={() => applyPreset('photo4x6')}
                    title="Standard 4x6 inch photo print"
                  >
                    <ImageIcon size={13} /> 4 × 6″ Photo
                  </button>
                  <button
                    className={`quick-preset-btn ${state.paperSizeId === '5x7' ? 'active' : ''}`}
                    onClick={() => applyPreset('framed5x7')}
                    title="5x7 inch frame portrait"
                  >
                    <Layers size={13} /> 5 × 7″ Frame
                  </button>
                  <button
                    className={`quick-preset-btn ${state.paperSizeId === 'a4' && state.layoutMode === 'single' ? 'active' : ''}`}
                    onClick={() => applyPreset('a4print')}
                    title="Full A4 page print"
                  >
                    <FileText size={13} /> Full A4 Print
                  </button>
                  <button
                    className={`quick-preset-btn ${state.frameStyle === 'polaroid' ? 'active' : ''}`}
                    onClick={() => applyPreset('polaroid')}
                    title="Polaroid style with wide bottom margin and caption"
                  >
                    <Type size={13} /> Polaroid Chin
                  </button>
                </div>

                <div className="quick-presets-divider" />

                <div className="paper-dimension-inline">
                  <FileText size={13} />
                  <span>
                    <strong>{paper.name}</strong> ({widthMm} × {heightMm} mm) · 300 DPI ({pixelWidth} × {pixelHeight} px)
                  </span>
                  {state.layoutMode === 'grid' && (
                    <span className="grid-copies-indicator">
                      · {state.gridCopies} Photos Grid
                    </span>
                  )}
                </div>
              </div>

              {/* The Realistic White Paper Container with Rulers and Gizmo */}
              <div
                className="paper-wrapper"
                onWheel={handlePaperWheel}
              >
                <div className="paper-frame-with-rulers">
                  <div className="paper-ruler-corner">mm</div>
                  <div className="paper-ruler-h" style={{ width: `${displayWidth}px` }}>
                    <span>0</span>
                    <span>{Math.round(widthMm * 0.25)}</span>
                    <span>{Math.round(widthMm * 0.5)}</span>
                    <span>{Math.round(widthMm * 0.75)}</span>
                    <span>{widthMm}mm</span>
                  </div>
                  <div className="paper-ruler-v" style={{ height: `${displayHeight}px` }}>
                    <span>0</span>
                    <span>{Math.round(heightMm * 0.5)}</span>
                    <span>{heightMm}mm</span>
                  </div>

                  <div style={{ position: 'relative', width: `${displayWidth}px`, height: `${displayHeight}px` }}>
                    <canvas
                      ref={canvasRef}
                      className="white-paper-sheet"
                      style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                      }}
                      title="Adjust with mouse: Drag to move, corners to scale, top handle to rotate, scroll wheel to zoom"
                    />

                    {/* Interactive In-Page Transform Gizmo (Single Photo Mode) */}
                    {state.layoutMode === 'single' && showGizmo && (
                      <div className="interactive-gizmo-layer">
                        <div
                          className={`photo-gizmo-box ${dragSession ? 'dragging' : ''}`}
                          style={{
                            left: `${gizmoBox.left}px`,
                            top: `${gizmoBox.top}px`,
                            width: `${gizmoBox.width}px`,
                            height: `${gizmoBox.height}px`,
                            transform: `rotate(${state.rotation}deg)`,
                          }}
                          onMouseEnter={() => setIsHoveringGizmo(true)}
                          onMouseLeave={() => setIsHoveringGizmo(false)}
                          onMouseDown={(e) => startGizmoDrag(e, 'move')}
                          title="Drag with mouse to reposition anywhere on the white page"
                        >
                          {/* Corner Scale Handles */}
                          <div
                            className="gizmo-handle gizmo-handle-nw"
                            onMouseDown={(e) => startGizmoDrag(e, 'scale')}
                            title="Drag corner to scale photo"
                          />
                          <div
                            className="gizmo-handle gizmo-handle-ne"
                            onMouseDown={(e) => startGizmoDrag(e, 'scale')}
                            title="Drag corner to scale photo"
                          />
                          <div
                            className="gizmo-handle gizmo-handle-sw"
                            onMouseDown={(e) => startGizmoDrag(e, 'scale')}
                            title="Drag corner to scale photo"
                          />
                          <div
                            className="gizmo-handle gizmo-handle-se"
                            onMouseDown={(e) => startGizmoDrag(e, 'scale')}
                            title="Drag corner to scale photo"
                          />

                          {/* Rotation Stalk and Circular Handle */}
                          <div className="gizmo-rotate-stalk" />
                          <div
                            className="gizmo-rotate-handle"
                            onMouseDown={(e) => startGizmoDrag(e, 'rotate')}
                            title="Drag with mouse to rotate photo"
                          >
                            <RotateCw size={12} />
                          </div>

                          {/* Floating Coordinate Pill */}
                          {(dragSession || isHoveringGizmo) && (
                            <div className="gizmo-coord-pill">
                              {dragSession?.mode === 'move' && `X: ${Math.round(state.offsetX)}% · Y: ${Math.round(state.offsetY)}%`}
                              {dragSession?.mode === 'scale' && `Scale: ${Math.round(state.scale * 100)}%`}
                              {dragSession?.mode === 'rotate' && `Angle: ${state.rotation}°`}
                              {!dragSession && `Scale: ${Math.round(state.scale * 100)}% · Angle: ${state.rotation}°`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Stage Controls */}
              <div className="stage-floating-toolbar">
                <div className="stage-info-pill">
                  {Math.round(previewZoom * 100)}% Preview
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreviewZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(1))))}
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreviewZoom(1.0)}
                  title="Fit Paper to Screen"
                >
                  <Maximize2 size={15} /> 100% Fit
                </button>

                {state.layoutMode === 'single' && (
                  <button
                    className={`btn btn-sm ${showGizmo ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setShowGizmo(!showGizmo)}
                    title="Toggle interactive mouse transform handles"
                  >
                    <Move size={14} /> Handles
                  </button>
                )}

                <button
                  className={`btn btn-sm ${isComparing ? 'btn-primary' : 'btn-ghost'}`}
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  title="Hold to see original unedited photo"
                >
                  <Eye size={15} /> Hold: Original
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Editing Sidebar */}
        {imageElement && (
          <aside className="studio-sidebar" aria-label="Photo Edit Tools">
            {/* Tab Navigation */}
            <div className="sidebar-tab-nav">
              <button
                className={`sidebar-tab-btn ${activeTab === 'paper' ? 'active' : ''}`}
                onClick={() => setActiveTab('paper')}
                title="Paper & Layout"
              >
                <Printer size={16} />
                <span>Paper</span>
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
                onClick={() => setActiveTab('adjust')}
                title="Position & Scale"
              >
                <Move size={16} />
                <span>Position</span>
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'photoshop' ? 'active' : ''}`}
                onClick={() => setActiveTab('photoshop')}
                title="Photoshop Adjustments"
              >
                <Sliders size={16} />
                <span>Adjust</span>
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
                onClick={() => setActiveTab('filters')}
                title="Filter Presets"
              >
                <Sparkles size={16} />
                <span>Filters</span>
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'crop' ? 'active' : ''}`}
                onClick={() => setActiveTab('crop')}
                title="Crop & Aspect"
              >
                <Crop size={16} />
                <span>Crop</span>
              </button>
              <button
                className={`sidebar-tab-btn ${activeTab === 'frame' ? 'active' : ''}`}
                onClick={() => setActiveTab('frame')}
                title="Borders & Captions"
              >
                <Layers size={16} />
                <span>Frame</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="sidebar-tab-content">
              {/* TAB 1: PAPER & PRINT LAYOUT */}
              {activeTab === 'paper' && (
                <>
                  <div className="studio-group">
                    <div className="studio-group-title">
                      <Printer size={15} /> Quick Print Presets
                    </div>
                    <div className="preset-grid">
                      <button
                        className={`preset-card-btn ${state.paperSizeId === '4x6' && state.layoutMode === 'grid' ? 'active' : ''}`}
                        onClick={() => applyPreset('passport')}
                      >
                        <span className="preset-card-title">🛂 Passport 8-Pack</span>
                        <span className="preset-card-desc">8 photos + cutting lines on 4×6″</span>
                      </button>
                      <button
                        className={`preset-card-btn ${state.paperSizeId === '4x6' && state.layoutMode === 'single' ? 'active' : ''}`}
                        onClick={() => applyPreset('photo4x6')}
                      >
                        <span className="preset-card-title">📸 4 × 6″ Photo</span>
                        <span className="preset-card-desc">Standard album photo paper</span>
                      </button>
                      <button
                        className={`preset-card-btn ${state.paperSizeId === '5x7' ? 'active' : ''}`}
                        onClick={() => applyPreset('framed5x7')}
                      >
                        <span className="preset-card-title">🖼️ 5 × 7″ Frame</span>
                        <span className="preset-card-desc">Desk & wall frame portrait</span>
                      </button>
                      <button
                        className={`preset-card-btn ${state.paperSizeId === 'a4' ? 'active' : ''}`}
                        onClick={() => applyPreset('a4print')}
                      >
                        <span className="preset-card-title">📄 A4 Document</span>
                        <span className="preset-card-desc">Full page standard printer</span>
                      </button>
                    </div>
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">Paper Size & Orientation</div>
                    <div className="slider-control">
                      <label className="slider-label-row">
                        <span>Select Paper Size</span>
                      </label>
                      <select
                        className="input"
                        value={state.paperSizeId}
                        onChange={(e) => setState((prev) => ({ ...prev, paperSizeId: e.target.value }))}
                      >
                        {Object.values(PAPER_SIZES).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="btn-grid-2">
                      <button
                        className={`btn btn-sm ${state.orientation === 'portrait' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, orientation: 'portrait' }))}
                      >
                        Portrait (Vertical)
                      </button>
                      <button
                        className={`btn btn-sm ${state.orientation === 'landscape' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, orientation: 'landscape' }))}
                      >
                        Landscape (Horizontal)
                      </button>
                    </div>
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">Multi-Photo Layout (Grid Mode)</div>
                    <div className="btn-grid-2">
                      <button
                        className={`btn btn-sm ${state.layoutMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, layoutMode: 'single' }))}
                      >
                        Single Photo
                      </button>
                      <button
                        className={`btn btn-sm ${state.layoutMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, layoutMode: 'grid' }))}
                      >
                        Multiple Copies (Grid)
                      </button>
                    </div>

                    {state.layoutMode === 'grid' && (
                      <>
                        <div className="slider-control">
                          <div className="slider-label-row">
                            <span>Copies on Page</span>
                            <span className="slider-value-tag">{state.gridCopies} Photos</span>
                          </div>
                          <div className="btn-grid-4">
                            {([2, 4, 6, 8, 12] as const).map((num) => (
                              <button
                                key={num}
                                className={`btn btn-xs ${state.gridCopies === num ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setState((prev) => ({ ...prev, gridCopies: num }))}
                              >
                                {num}x
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="slider-control">
                          <div className="slider-label-row">
                            <span>Gap Between Photos</span>
                            <span className="slider-value-tag">{state.gridGapMm} mm</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={state.gridGapMm}
                            className="studio-slider"
                            onChange={(e) => setState((prev) => ({ ...prev, gridGapMm: Number(e.target.value) }))}
                          />
                        </div>

                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={state.showCuttingGuides}
                            onChange={(e) => setState((prev) => ({ ...prev, showCuttingGuides: e.target.checked }))}
                          />
                          <span style={{ fontSize: '0.8125rem' }}>
                            <Scissors size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Show scissor cut lines between photos
                          </span>
                        </label>
                      </>
                    )}
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">Page Margins</div>
                    <div className="slider-control">
                      <div className="slider-label-row">
                        <span>Safe Margin</span>
                        <span className="slider-value-tag">{state.marginMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="1"
                        value={state.marginMm}
                        className="studio-slider"
                        onChange={(e) => setState((prev) => ({ ...prev, marginMm: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: POSITION & SCALE */}
              {activeTab === 'adjust' && (
                <>
                  <div className="studio-group">
                    <div className="studio-group-title">Photo Size & Zoom</div>
                    <div className="slider-control">
                      <div className="slider-label-row">
                        <span>Photo Scale</span>
                        <span className="slider-value-tag">{Math.round(state.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.5"
                        step="0.05"
                        value={state.scale}
                        className="studio-slider"
                        onChange={(e) => setState((prev) => ({ ...prev, scale: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="btn-grid-3">
                      <button
                        className={`btn btn-xs ${state.fitMode === 'contain' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, fitMode: 'contain', scale: 1 }))}
                      >
                        Fit to Margin
                      </button>
                      <button
                        className={`btn btn-xs ${state.fitMode === 'cover' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, fitMode: 'cover', scale: 1 }))}
                      >
                        Fill Page
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setState((prev) => ({ ...prev, scale: 1, offsetX: 0, offsetY: 0 }))}
                      >
                        Reset 100%
                      </button>
                    </div>
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">Center & Alignment</div>
                    <div className="btn-grid-3">
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setState((prev) => ({ ...prev, offsetX: 0, offsetY: 0 }))}
                      >
                        Center
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setState((prev) => ({ ...prev, offsetY: -30 }))}
                      >
                        Top
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setState((prev) => ({ ...prev, offsetY: 30 }))}
                      >
                        Bottom
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', margin: '4px 0 0' }}>
                      💡 Tip: You can also click and drag the photo directly on the white sheet to place it anywhere!
                    </p>
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">Rotate & Flip</div>
                    <div className="btn-grid-3">
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                      >
                        <RotateCw size={13} /> +90°
                      </button>
                      <button
                        className={`btn btn-xs ${state.flipH ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, flipH: !prev.flipH }))}
                      >
                        <FlipHorizontal size={13} /> Flip H
                      </button>
                      <button
                        className={`btn btn-xs ${state.flipV ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, flipV: !prev.flipV }))}
                      >
                        <FlipVertical size={13} /> Flip V
                      </button>
                    </div>

                    <div className="slider-control" style={{ marginTop: '8px' }}>
                      <div className="slider-label-row">
                        <span>Fine Angle Rotation</span>
                        <span className="slider-value-tag">{state.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={state.rotation}
                        className="studio-slider"
                        onChange={(e) => setState((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: PHOTOSHOP ADJUSTMENTS */}
              {activeTab === 'photoshop' && (
                <>
                  <div className="studio-group-header">
                    <div className="studio-group-title">
                      <Sliders size={15} /> Color & Light Studio
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setState((prev) => ({ ...prev, adjustments: { ...DEFAULT_ADJUSTMENTS } }))}
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Brightness */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Brightness</span>
                      <span className="slider-value-tag">{state.adjustments.brightness > 0 ? `+${state.adjustments.brightness}` : state.adjustments.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.brightness}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, brightness: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Contrast */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Contrast</span>
                      <span className="slider-value-tag">{state.adjustments.contrast > 0 ? `+${state.adjustments.contrast}` : state.adjustments.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.contrast}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, contrast: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Saturation */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Saturation</span>
                      <span className="slider-value-tag">{state.adjustments.saturation > 0 ? `+${state.adjustments.saturation}` : state.adjustments.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.saturation}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, saturation: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Warmth / Color Temp */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Warmth (Color Temp)</span>
                      <span className="slider-value-tag">
                        {state.adjustments.warmth > 0 ? `Warm +${state.adjustments.warmth}` : state.adjustments.warmth < 0 ? `Cool ${state.adjustments.warmth}` : 'Neutral'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.warmth}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, warmth: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Sharpness */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Sharpness & Clarity</span>
                      <span className="slider-value-tag">+{state.adjustments.sharpness}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={state.adjustments.sharpness}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, sharpness: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Vignette */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Vignette</span>
                      <span className="slider-value-tag">{state.adjustments.vignette}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.vignette}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, vignette: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Blur */}
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Soft Blur</span>
                      <span className="slider-value-tag">{state.adjustments.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={state.adjustments.blur}
                      className="studio-slider"
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, blur: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>

                  {/* Invert */}
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={state.adjustments.invert}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, invert: e.target.checked },
                        }))
                      }
                    />
                    <span style={{ fontSize: '0.8125rem' }}>Negative / Invert Colors</span>
                  </label>
                </>
              )}

              {/* TAB 4: FILTERS */}
              {activeTab === 'filters' && (
                <>
                  <div className="studio-group-title">
                    <Sparkles size={15} /> Professional Photo Filters
                  </div>
                  <div className="filter-grid">
                    {([
                      { id: 'none', label: 'Original' },
                      { id: 'studio', label: 'Studio Clean' },
                      { id: 'bw', label: 'Classic B&W' },
                      { id: 'high_contrast', label: 'High Contrast' },
                      { id: 'sepia', label: 'Warm Sepia' },
                      { id: 'vintage', label: 'Vintage 70s' },
                      { id: 'vivid', label: 'Vivid Pop' },
                      { id: 'cool', label: 'Cool Chrome' },
                      { id: 'warm', label: 'Golden Hour' },
                      { id: 'dramatic', label: 'Dramatic' },
                    ] as const).map((f) => (
                      <button
                        key={f.id}
                        className={`filter-chip ${state.filter === f.id ? 'active' : ''}`}
                        onClick={() => setState((prev) => ({ ...prev, filter: f.id as FilterPreset }))}
                      >
                        {imageSrc && (
                          <img
                            src={imageSrc}
                            alt={f.label}
                            className="filter-preview-thumb"
                            style={{
                              filter:
                                f.id === 'bw'
                                  ? 'grayscale(100%)'
                                  : f.id === 'sepia'
                                  ? 'sepia(80%)'
                                  : f.id === 'vivid'
                                  ? 'saturate(160%)'
                                  : f.id === 'cool'
                                  ? 'hue-rotate(180deg)'
                                  : f.id === 'high_contrast'
                                  ? 'grayscale(100%) contrast(160%)'
                                  : 'none',
                            }}
                          />
                        )}
                        <span className="filter-chip-name">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 5: CROP & ASPECT */}
              {activeTab === 'crop' && (
                <>
                  <div className="studio-group">
                    <div className="studio-group-title">
                      <Crop size={15} /> Aspect Ratio Presets
                    </div>
                    <div className="btn-grid-2">
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            crop: { x: 10, y: 10, width: 80, height: 80 },
                          }))
                        }
                      >
                        1 : 1 Square
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            crop: { x: 15, y: 5, width: 70, height: 90 },
                          }))
                        }
                      >
                        35 × 45 mm Passport
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            crop: { x: 5, y: 10, width: 90, height: 67.5 },
                          }))
                        }
                      >
                        4 : 3 Camera
                      </button>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            crop: { x: 5, y: 15, width: 90, height: 50.6 },
                          }))
                        }
                      >
                        16 : 9 Widescreen
                      </button>
                    </div>

                    {state.crop && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: '12px' }}
                        onClick={() => setState((prev) => ({ ...prev, crop: null }))}
                      >
                        Reset Crop (Show Full Image)
                      </button>
                    )}
                  </div>

                  {state.crop && (
                    <div className="studio-group">
                      <div className="studio-group-title">Fine Crop Sliders</div>
                      <div className="slider-control">
                        <div className="slider-label-row">
                          <span>Crop Width</span>
                          <span className="slider-value-tag">{Math.round(state.crop.width)}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={state.crop.width}
                          className="studio-slider"
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              crop: prev.crop ? { ...prev.crop, width: Number(e.target.value) } : null,
                            }))
                          }
                        />
                      </div>
                      <div className="slider-control">
                        <div className="slider-label-row">
                          <span>Crop Height</span>
                          <span className="slider-value-tag">{Math.round(state.crop.height)}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={state.crop.height}
                          className="studio-slider"
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              crop: prev.crop ? { ...prev.crop, height: Number(e.target.value) } : null,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 6: FRAME & CAPTIONS */}
              {activeTab === 'frame' && (
                <>
                  <div className="studio-group">
                    <div className="studio-group-title">
                      <Layers size={15} /> Frame Style
                    </div>
                    <div className="btn-grid-3">
                      <button
                        className={`btn btn-xs ${state.frameStyle === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, frameStyle: 'none' }))}
                      >
                        No Frame
                      </button>
                      <button
                        className={`btn btn-xs ${state.frameStyle === 'solid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, frameStyle: 'solid', borderWidthMm: prev.borderWidthMm || 2 }))}
                      >
                        Solid Border
                      </button>
                      <button
                        className={`btn btn-xs ${state.frameStyle === 'polaroid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setState((prev) => ({ ...prev, frameStyle: 'polaroid' }))}
                      >
                        Polaroid
                      </button>
                    </div>
                  </div>

                  {state.frameStyle === 'solid' && (
                    <div className="studio-group">
                      <div className="slider-control">
                        <div className="slider-label-row">
                          <span>Border Thickness</span>
                          <span className="slider-value-tag">{state.borderWidthMm} mm</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="15"
                          step="0.5"
                          value={state.borderWidthMm}
                          className="studio-slider"
                          onChange={(e) => setState((prev) => ({ ...prev, borderWidthMm: Number(e.target.value) }))}
                        />
                      </div>

                      <div className="slider-control">
                        <label className="slider-label-row">
                          <span>Border Color</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={state.borderColor}
                            onChange={(e) => setState((prev) => ({ ...prev, borderColor: e.target.value }))}
                            style={{ width: '40px', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                          />
                          <input
                            type="text"
                            value={state.borderColor}
                            className="input"
                            style={{ flex: 1 }}
                            onChange={(e) => setState((prev) => ({ ...prev, borderColor: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="studio-group">
                    <div className="slider-control">
                      <div className="slider-label-row">
                        <span>Rounded Corners</span>
                        <span className="slider-value-tag">{state.borderRadiusMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={state.borderRadiusMm}
                        className="studio-slider"
                        onChange={(e) => setState((prev) => ({ ...prev, borderRadiusMm: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="studio-group">
                    <div className="studio-group-title">
                      <Type size={15} /> Caption / Date Stamp
                    </div>
                    <div className="slider-control">
                      <input
                        type="text"
                        placeholder="e.g. Passport Photo — Sept 2026"
                        value={state.captionText}
                        className="input"
                        onChange={(e) => setState((prev) => ({ ...prev, captionText: e.target.value }))}
                      />
                    </div>

                    {state.captionText && (
                      <div className="slider-control">
                        <div className="slider-label-row">
                          <span>Font Size</span>
                          <span className="slider-value-tag">{state.captionFontSize}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="32"
                          value={state.captionFontSize}
                          className="studio-slider"
                          onChange={(e) => setState((prev) => ({ ...prev, captionFontSize: Number(e.target.value) }))}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default PhotoPrintPage;
