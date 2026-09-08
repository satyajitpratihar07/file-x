// Photo Print Studio Utility Engine

export interface PaperDefinition {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthInches: number;
  heightInches: number;
  pixelWidth300Dpi: number;
  pixelHeight300Dpi: number;
  description: string;
  recommendedFor: string;
}

export const PAPER_SIZES: Record<string, PaperDefinition> = {
  '4x6': {
    id: '4x6',
    name: '4 × 6 inches (10 × 15 cm)',
    widthMm: 101.6,
    heightMm: 152.4,
    widthInches: 4,
    heightInches: 6,
    pixelWidth300Dpi: 1200,
    pixelHeight300Dpi: 1800,
    description: 'Universal standard glossy photo paper for albums & frame prints',
    recommendedFor: 'Standard photo album prints & snapshots',
  },
  '5x7': {
    id: '5x7',
    name: '5 × 7 inches (13 × 18 cm)',
    widthMm: 127,
    heightMm: 177.8,
    widthInches: 5,
    heightInches: 7,
    pixelWidth300Dpi: 1500,
    pixelHeight300Dpi: 2100,
    description: 'Desk frames, portraits, and greeting card displays',
    recommendedFor: 'Framed portraits & special occasion photos',
  },
  'a4': {
    id: 'a4',
    name: 'A4 (210 × 297 mm)',
    widthMm: 210,
    heightMm: 297,
    widthInches: 8.27,
    heightInches: 11.69,
    pixelWidth300Dpi: 2480,
    pixelHeight300Dpi: 3508,
    description: 'Standard international paper for multi-photo sheets & posters',
    recommendedFor: 'Collages, multi-photo sheets & document printing',
  },
  'letter': {
    id: 'letter',
    name: 'Letter (8.5 × 11 in)',
    widthMm: 215.9,
    heightMm: 279.4,
    widthInches: 8.5,
    heightInches: 11.0,
    pixelWidth300Dpi: 2550,
    pixelHeight300Dpi: 3300,
    description: 'Standard North American document paper size',
    recommendedFor: 'Standard desktop printers in US / Canada',
  },
  'passport_sheet': {
    id: 'passport_sheet',
    name: 'Passport Photo Sheet (4 × 6″)',
    widthMm: 101.6,
    heightMm: 152.4,
    widthInches: 4,
    heightInches: 6,
    pixelWidth300Dpi: 1200,
    pixelHeight300Dpi: 1800,
    description: 'Optimized 8-pack or 6-pack passport/visa photos with cut lines',
    recommendedFor: 'Official ID, Visa, and Passport applications',
  },
};

export type FilterPreset =
  | 'none'
  | 'studio'
  | 'bw'
  | 'high_contrast'
  | 'sepia'
  | 'vintage'
  | 'vivid'
  | 'cool'
  | 'warm'
  | 'dramatic';

export interface PhotoAdjustments {
  brightness: number;  // -100 to 100 (0 = default)
  contrast: number;    // -100 to 100 (0 = default)
  saturation: number;  // -100 to 100 (0 = default)
  exposure: number;    // -50 to 50 (0 = default)
  warmth: number;      // -100 to 100 (0 = neutral, -100 cool/blue, +100 warm/amber)
  sharpness: number;   // 0 to 100 (0 = standard)
  blur: number;        // 0 to 20 px
  vignette: number;    // -100 to 100 (0 = none, +100 dark vignette, -100 white vignette)
  invert: boolean;
}

export interface CropRect {
  x: number;      // percentage 0..100
  y: number;      // percentage 0..100
  width: number;  // percentage 0..100
  height: number; // percentage 0..100
}

export interface PhotoPrintState {
  paperSizeId: string;
  orientation: 'portrait' | 'landscape';
  marginMm: number; // 0, 3, 5, 10
  showCuttingGuides: boolean;
  showSafeMargin: boolean;

  // Layout & Multi-photo
  layoutMode: 'single' | 'grid';
  gridCopies: 1 | 2 | 4 | 6 | 8 | 12;
  gridGapMm: number;

  // Single Photo Position & Sizing
  fitMode: 'custom' | 'contain' | 'cover';
  offsetX: number; // percentage offset -50..50
  offsetY: number; // percentage offset -50..50
  scale: number;   // 0.2 .. 3.0 (1.0 = 100%)
  rotation: number;// 0, 90, 180, 270 or fine degrees
  flipH: boolean;
  flipV: boolean;

  // Adjustments & Filters
  adjustments: PhotoAdjustments;
  filter: FilterPreset;
  crop: CropRect | null;

  // Border & Frame
  borderWidthMm: number;
  borderColor: string;
  borderRadiusMm: number;
  frameStyle: 'none' | 'solid' | 'polaroid';

  // Text / Timestamp
  captionText: string;
  captionPosition: 'bottom' | 'top';
  captionFontSize: number;
  captionColor: string;
}

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  warmth: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  invert: false,
};

export const DEFAULT_PRINT_STATE: PhotoPrintState = {
  paperSizeId: '4x6',
  orientation: 'portrait',
  marginMm: 5,
  showCuttingGuides: true,
  showSafeMargin: true,

  layoutMode: 'single',
  gridCopies: 1,
  gridGapMm: 4,

  fitMode: 'contain',
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipH: false,
  flipV: false,

  adjustments: { ...DEFAULT_ADJUSTMENTS },
  filter: 'none',
  crop: null,

  borderWidthMm: 0,
  borderColor: '#ffffff',
  borderRadiusMm: 0,
  frameStyle: 'none',

  captionText: '',
  captionPosition: 'bottom',
  captionFontSize: 16,
  captionColor: '#1e293b',
};

/**
 * Calculates paper dimensions in mm and pixels for given state.
 */
export function getActivePaperDimensions(state: PhotoPrintState) {
  const paper = PAPER_SIZES[state.paperSizeId] || PAPER_SIZES['4x6'];
  const isLandscape = state.orientation === 'landscape';

  const widthMm = isLandscape ? Math.max(paper.widthMm, paper.heightMm) : Math.min(paper.widthMm, paper.heightMm);
  const heightMm = isLandscape ? Math.min(paper.widthMm, paper.heightMm) : Math.max(paper.widthMm, paper.heightMm);

  const pixelWidth = Math.round((widthMm / 25.4) * 300);
  const pixelHeight = Math.round((heightMm / 25.4) * 300);

  return {
    paper,
    widthMm,
    heightMm,
    pixelWidth,
    pixelHeight,
    aspectRatio: widthMm / heightMm,
  };
}

/**
 * Builds CSS filter string from current adjustments and presets.
 */
export function getCssFilterString(adj: PhotoAdjustments, filter: FilterPreset): string {
  const b = 100 + adj.brightness + adj.exposure;
  const c = 100 + adj.contrast;
  const s = 100 + adj.saturation;
  const blur = adj.blur > 0 ? `blur(${adj.blur}px) ` : '';
  const invert = adj.invert ? 'invert(100%) ' : '';

  let filterAdd = '';
  switch (filter) {
    case 'studio':
      filterAdd = 'contrast(108%) brightness(104%) saturate(106%)';
      break;
    case 'bw':
      filterAdd = 'grayscale(100%) contrast(115%)';
      break;
    case 'high_contrast':
      filterAdd = 'grayscale(100%) contrast(160%) brightness(95%)';
      break;
    case 'sepia':
      filterAdd = 'sepia(85%) contrast(105%) brightness(95%)';
      break;
    case 'vintage':
      filterAdd = 'sepia(45%) contrast(90%) brightness(105%) saturate(85%)';
      break;
    case 'vivid':
      filterAdd = 'saturate(145%) contrast(112%) brightness(102%)';
      break;
    case 'cool':
      filterAdd = 'hue-rotate(185deg) saturate(95%)';
      break;
    case 'warm':
      filterAdd = 'sepia(30%) saturate(120%) brightness(102%)';
      break;
    case 'dramatic':
      filterAdd = 'contrast(135%) brightness(90%) saturate(110%)';
      break;
    default:
      break;
  }

  return `brightness(${Math.max(0, b)}%) contrast(${Math.max(0, c)}%) saturate(${Math.max(0, s)}%) ${blur}${invert}${filterAdd}`.trim();
}

/**
 * Applies sharpening convolution to an offscreen image canvas.
 */
function applySharpness(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0) return;
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const factor = (amount / 100) * 0.8;
    const w = width;

    // Simple 3x3 unsharp convolution kernel
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * w + x) * 4;
        const up = ((y - 1) * w + x) * 4;
        const down = ((y + 1) * w + x) * 4;
        const left = (y * w + (x - 1)) * 4;
        const right = (y * w + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const val = original[i + c] * (1 + 4 * factor) - (original[up + c] + original[down + c] + original[left + c] + original[right + c]) * factor;
          data[i + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Sharpness skipped', err);
  }
}

/**
 * Applies color temperature / warmth adjustments.
 */
function applyWarmth(ctx: CanvasRenderingContext2D, width: number, height: number, warmth: number) {
  if (warmth === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = warmth > 0 ? 'color-dodge' : 'color-burn';
  ctx.globalAlpha = Math.abs(warmth) / 300;
  ctx.fillStyle = warmth > 0 ? '#ffb347' : '#70a1ff';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Applies vignette gradient.
 */
function applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, vignette: number) {
  if (vignette === 0) return;
  ctx.save();
  const radius = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    radius * 0.35,
    width / 2,
    height / 2,
    radius
  );

  if (vignette > 0) {
    // Dark vignette
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, vignette / 100)})`);
  } else {
    // White vignette
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, `rgba(255,255,255,${Math.min(0.9, Math.abs(vignette) / 100)})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Pre-processes an image element with all crop, filters, warmth, vignette, and sharpness.
 * Returns a standalone offscreen canvas containing the edited photo.
 */
export function createProcessedPhotoCanvas(
  image: HTMLImageElement,
  state: PhotoPrintState
): HTMLCanvasElement {
  const crop = state.crop;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (crop) {
    sx = (crop.x / 100) * image.naturalWidth;
    sy = (crop.y / 100) * image.naturalHeight;
    sw = (crop.width / 100) * image.naturalWidth;
    sh = (crop.height / 100) * image.naturalHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Apply CSS filters
  ctx.filter = getCssFilterString(state.adjustments, state.filter);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  // Apply Pixel Adjustments (Warmth, Vignette, Sharpness)
  if (state.adjustments.warmth !== 0) {
    applyWarmth(ctx, canvas.width, canvas.height, state.adjustments.warmth);
  }
  if (state.adjustments.vignette !== 0) {
    applyVignette(ctx, canvas.width, canvas.height, state.adjustments.vignette);
  }
  if (state.adjustments.sharpness > 0) {
    applySharpness(ctx, canvas.width, canvas.height, state.adjustments.sharpness);
  }

  return canvas;
}

/**
 * Master Canvas Renderer: renders the complete white page with photo(s), borders,
 * multi-photo grids, scissor cutting lines, and captions onto the target canvas.
 */
export function renderPrintCanvas(
  targetCanvas: HTMLCanvasElement,
  image: HTMLImageElement,
  state: PhotoPrintState,
  options: { highDpi?: boolean } = {}
): void {
  const { widthMm, pixelWidth, pixelHeight } = getActivePaperDimensions(state);

  targetCanvas.width = pixelWidth;
  targetCanvas.height = pixelHeight;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const mmToPx = pixelWidth / widthMm;

  // 1. Fill Page with Crisp Clean White Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // 2. Process the edited photo offscreen
  const processedPhoto = createProcessedPhotoCanvas(image, state);

  // 3. Margin bounds
  const marginPx = state.marginMm * mmToPx;
  const printAreaX = marginPx;
  const printAreaY = marginPx;
  const printAreaW = pixelWidth - marginPx * 2;
  const printAreaH = pixelHeight - marginPx * 2;

  // Safe margin dotted lines preview (visual guide only)
  if (state.showSafeMargin && state.marginMm > 0 && !options.highDpi) {
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(printAreaX, printAreaY, printAreaW, printAreaH);
    ctx.restore();
  }

  // 4. Determine single vs multi-grid layout
  const copies = state.layoutMode === 'grid' ? state.gridCopies : 1;

  if (copies === 1) {
    renderSinglePhotoOnPage(ctx, processedPhoto, state, printAreaX, printAreaY, printAreaW, printAreaH, mmToPx);
  } else {
    renderMultiPhotoGridOnPage(ctx, processedPhoto, state, copies, printAreaX, printAreaY, printAreaW, printAreaH, mmToPx);
  }
}

export interface PhotoLayoutBounds {
  pixelWidth: number;
  pixelHeight: number;
  mmToPx: number;
  printAreaX: number;
  printAreaY: number;
  printAreaW: number;
  printAreaH: number;
  targetW: number;
  targetH: number;
  centerX: number;
  centerY: number;
  rotation: number;
}

export function computePhotoLayout(
  state: PhotoPrintState,
  photoAspect: number
): PhotoLayoutBounds {
  const { widthMm, pixelWidth, pixelHeight } = getActivePaperDimensions(state);
  const mmToPx = pixelWidth / widthMm;

  const marginPx = state.marginMm * mmToPx;
  const printAreaX = marginPx;
  const printAreaY = marginPx;
  const printAreaW = pixelWidth - marginPx * 2;
  const printAreaH = pixelHeight - marginPx * 2;

  const areaAspect = printAreaW / printAreaH;

  let targetW = printAreaW;
  let targetH = printAreaH;

  if (state.fitMode === 'contain') {
    if (photoAspect > areaAspect) {
      targetW = printAreaW;
      targetH = printAreaW / photoAspect;
    } else {
      targetH = printAreaH;
      targetW = printAreaH * photoAspect;
    }
  } else if (state.fitMode === 'cover') {
    if (photoAspect > areaAspect) {
      targetH = printAreaH;
      targetW = printAreaH * photoAspect;
    } else {
      targetW = printAreaW;
      targetH = printAreaW / photoAspect;
    }
  }

  targetW *= state.scale;
  targetH *= state.scale;

  const centerX = printAreaX + printAreaW / 2 + (state.offsetX / 100) * printAreaW;
  const centerY = printAreaY + printAreaH / 2 + (state.offsetY / 100) * printAreaH;

  return {
    pixelWidth,
    pixelHeight,
    mmToPx,
    printAreaX,
    printAreaY,
    printAreaW,
    printAreaH,
    targetW,
    targetH,
    centerX,
    centerY,
    rotation: state.rotation,
  };
}

/**
 * Renders a single photo on the printable area.
 */
function renderSinglePhotoOnPage(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  state: PhotoPrintState,
  _areaX: number,
  _areaY: number,
  _areaW: number,
  _areaH: number,
  mmToPx: number
) {
  const photoAspect = photo.width / photo.height;
  const layout = computePhotoLayout(state, photoAspect);
  drawSingleItemWithFrame(ctx, photo, state, layout.centerX, layout.centerY, layout.targetW, layout.targetH, mmToPx);
}

/**
 * Renders multi-photo grid (e.g. 2, 4, 6, 8, 12 passport photos) with cutting lines.
 */
function renderMultiPhotoGridOnPage(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  state: PhotoPrintState,
  copies: number,
  areaX: number,
  areaY: number,
  areaW: number,
  areaH: number,
  mmToPx: number
) {
  let cols = 1;
  let rows = 1;

  switch (copies) {
    case 2:
      cols = areaW >= areaH ? 2 : 1;
      rows = areaW >= areaH ? 1 : 2;
      break;
    case 4:
      cols = 2;
      rows = 2;
      break;
    case 6:
      cols = areaW >= areaH ? 3 : 2;
      rows = areaW >= areaH ? 2 : 3;
      break;
    case 8:
      cols = areaW >= areaH ? 4 : 2;
      rows = areaW >= areaH ? 2 : 4;
      break;
    case 12:
      cols = areaW >= areaH ? 4 : 3;
      rows = areaW >= areaH ? 3 : 4;
      break;
    default:
      cols = 1;
      rows = 1;
      break;
  }

  const gapPx = state.gridGapMm * mmToPx;
  const cellW = (areaW - gapPx * (cols - 1)) / cols;
  const cellH = (areaH - gapPx * (rows - 1)) / rows;

  const photoAspect = photo.width / photo.height;
  const cellAspect = cellW / cellH;

  let itemW = cellW;
  let itemH = cellH;

  if (photoAspect > cellAspect) {
    itemW = cellW;
    itemH = cellW / photoAspect;
  } else {
    itemH = cellH;
    itemW = cellH * photoAspect;
  }

  itemW *= state.scale;
  itemH *= state.scale;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellCenterX = areaX + c * (cellW + gapPx) + cellW / 2;
      const cellCenterY = areaY + r * (cellH + gapPx) + cellH / 2;

      drawSingleItemWithFrame(ctx, photo, state, cellCenterX, cellCenterY, itemW, itemH, mmToPx);

      if (state.showCuttingGuides) {
        drawCuttingGuides(ctx, cellCenterX - itemW / 2 - gapPx / 4, cellCenterY - itemH / 2 - gapPx / 4, itemW + gapPx / 2, itemH + gapPx / 2);
      }
    }
  }
}

/**
 * Draws an individual photo instance with rotations, flips, borders, rounded corners, and polaroid frame.
 */
function drawSingleItemWithFrame(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  state: PhotoPrintState,
  centerX: number,
  centerY: number,
  w: number,
  h: number,
  mmToPx: number
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);

  const halfW = w / 2;
  const halfH = h / 2;

  const borderPx = state.borderWidthMm * mmToPx;
  const radiusPx = state.borderRadiusMm * mmToPx;

  const isPolaroid = state.frameStyle === 'polaroid';
  const polaroidChinH = isPolaroid ? h * 0.22 : 0;
  const polaroidPad = isPolaroid ? Math.max(12, w * 0.05) : 0;

  if (isPolaroid) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(
      -halfW - polaroidPad,
      -halfH - polaroidPad,
      w + polaroidPad * 2,
      h + polaroidPad * 2 + polaroidChinH
    );
    ctx.restore();
  }

  // Draw Photo with rounded corners
  ctx.save();
  if (radiusPx > 0) {
    drawRoundedRectPath(ctx, -halfW, -halfH, w, h, radiusPx);
    ctx.clip();
  }

  ctx.drawImage(photo, -halfW, -halfH, w, h);
  ctx.restore();

  // Draw solid border if configured
  if (borderPx > 0) {
    ctx.save();
    ctx.lineWidth = borderPx;
    ctx.strokeStyle = state.borderColor || '#ffffff';
    if (radiusPx > 0) {
      drawRoundedRectPath(ctx, -halfW, -halfH, w, h, radiusPx);
      ctx.stroke();
    } else {
      ctx.strokeRect(-halfW, -halfH, w, h);
    }
    ctx.restore();
  }

  // Caption text
  if (state.captionText.trim().length > 0) {
    ctx.save();
    ctx.font = `600 ${state.captionFontSize * (mmToPx / 4)}px 'Inter', sans-serif`;
    ctx.fillStyle = state.captionColor || '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isPolaroid) {
      ctx.fillText(state.captionText, 0, halfH + polaroidPad + polaroidChinH / 2);
    } else if (state.captionPosition === 'bottom') {
      ctx.fillText(state.captionText, 0, halfH - 24);
    } else {
      ctx.fillText(state.captionText, 0, -halfH + 24);
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCuttingGuides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('✂', x - 8, y + 5);
  ctx.restore();
}

/**
 * Generates a compliant 300 DPI PDF binary from the canvas.
 * Encapsulates high-resolution JPEG into standard PDF 1.4.
 */
export async function generatePrintPdf(
  canvas: HTMLCanvasElement,
  paperSizeId: string,
  orientation: 'portrait' | 'landscape'
): Promise<Blob> {
  const paper = PAPER_SIZES[paperSizeId] || PAPER_SIZES['4x6'];
  const isLandscape = orientation === 'landscape';

  const ptW = (isLandscape ? Math.max(paper.widthMm, paper.heightMm) : Math.min(paper.widthMm, paper.heightMm)) * (72 / 25.4);
  const ptH = (isLandscape ? Math.min(paper.widthMm, paper.heightMm) : Math.max(paper.widthMm, paper.heightMm)) * (72 / 25.4);

  const jpegBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob || new Blob([])), 'image/jpeg', 0.98);
  });
  const jpegBuffer = await jpegBlob.arrayBuffer();
  const jpegBytes = new Uint8Array(jpegBuffer);

  const header = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const objects: Array<{ id: number; data: Uint8Array | string }> = [];

  objects.push({
    id: 1,
    data: `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
  });

  objects.push({
    id: 2,
    data: `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
  });

  objects.push({
    id: 3,
    data: `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`,
  });

  const streamContent = `q\n${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;
  objects.push({
    id: 4,
    data: `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  });

  const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const imgFooter = `\nendstream\nendobj\n`;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode(header)];
  const xrefOffsets: number[] = [0];

  let currentOffset = header.length;

  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(currentOffset);
    const obj = objects[i];
    const encoded = typeof obj.data === 'string' ? encoder.encode(obj.data) : obj.data;
    chunks.push(encoded);
    currentOffset += encoded.length;
  }

  xrefOffsets.push(currentOffset);
  const encImgHeader = encoder.encode(imgHeader);
  const encImgFooter = encoder.encode(imgFooter);
  chunks.push(encImgHeader);
  chunks.push(jpegBytes);
  chunks.push(encImgFooter);
  currentOffset += encImgHeader.length + jpegBytes.length + encImgFooter.length;

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${xrefOffsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < xrefOffsets.length; i++) {
    const offsetStr = xrefOffsets[i].toString().padStart(10, '0');
    xref += `${offsetStr} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${xrefOffsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(encoder.encode(xref));

  return new Blob(chunks as any[], { type: 'application/pdf' });
}

/**
 * Downloads a canvas directly as high-res PNG or JPEG image.
 */
export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg'
) {
  const ext = format === 'image/jpeg' ? 'jpg' : 'png';
  const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
  const dataUrl = canvas.toDataURL(format, 0.98);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Triggers native high-res browser print dialog.
 */
export function triggerDirectPrint(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Photo - Any-DoC</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            max-width: 100vw;
            max-height: 100vh;
            width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); setTimeout(function(){ window.close(); }, 1500);" />
      </body>
    </html>
  `);
  printWindow.document.close();
}
