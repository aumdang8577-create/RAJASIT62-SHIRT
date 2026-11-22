import {
  CLEANED_IMAGE_URL,
  HEX_EMBLEM_LOGO_URL,
  USER_LOGO_URL,
} from '../constants/assets';
import { loadImage, triggerBlobDownload } from './canvasExport';
import {
  buildCustomDesignLogoCanvas,
  LOGO_VARIANT_CATALOG,
  type CustomLogoDesignId,
  type LogoVariantMeta,
} from './customLogoDesigns';

export { LOGO_VARIANT_CATALOG, type LogoVariantMeta };

export type LogoVariant = 'gable-62' | 'hex-crest' | CustomLogoDesignId;

export function getLogoVariantMeta(variant: LogoVariant): LogoVariantMeta {
  return (
    LOGO_VARIANT_CATALOG.find((item) => item.id === variant) ??
    LOGO_VARIANT_CATALOG[1]
  );
}

export type LogoStyle = 'embroidery' | 'navy-patch';
export type StageBackdrop = 'original' | 'white' | 'dark' | 'transparent';
export type LogoPlacement =
  | 'left-sleeve'
  | 'right-sleeve'
  | 'left-chest'
  | 'right-chest'
  | 'center-back'
  | 'chest-and-left-sleeve';

export interface PoloDesignConfig {
  /** Active logo option: 'gable-62' (original roof 62) or 'hex-crest' (hexagon plane + plumb bob) */
  logoVariant: LogoVariant;
  /** Polo shirt main body fabric hex color */
  shirtColor: string;
  /** Collar & sleeve cuff trim hex color */
  collarColor: string;
  /** Variant 1 (gable-62): Pitched roof / gable (จั่ว) hex color */
  roofColor: string;
  /** Variant 1 (gable-62): Number "62" and flanking bars hex color */
  numberColor: string;
  /** Variant 1 (gable-62): Thai text hex color */
  textColor: string;
  /** Variant 1 (gable-62): Woven patch background hex color */
  patchBgColor: string;
  /** Variant 1 (gable-62): Roof stroke thickness multiplier (1.0 - 3.0) */
  roofThickness: number;
  /** Variant 2 (hex-crest): Number "62" color (requested: navy) */
  hexNumberColor: string;
  /** Variant 2 (hex-crest): Bottom plumb bob (ลูกดิ่ง) color (requested: gold) */
  hexPlumbColor: string;
  /** Variant 2 (hex-crest): Carpenter's plane & divider accent color */
  hexAccentColor: string;
  /** Variant 2 (hex-crest): Hexagon frame, plane blade & Thai text color */
  hexFrameColor: string;
  /** Logo rendering mode (for gable-62) */
  style: LogoStyle;
  /** Logo placement on the polo shirt */
  placement: LogoPlacement;
  /** Real-world logo width in cm */
  widthCm: number;
  /** Distance above sleeve band in cm (or vertical offset cm on chest/back) */
  gapAboveBandCm: number;
  /** Fine horizontal shift (-0.25 .. +0.25) */
  horizontalShift: number;
  /** Studio backdrop tone for 2D mockup, 3D viewer, and PNG exports */
  backdrop: StageBackdrop;
}

export const STAGE_BACKDROP_OPTIONS: Array<{
  id: StageBackdrop;
  label: string;
  swatchStyle: string;
}> = [
  { id: 'original', label: 'ฉากเดิม', swatchStyle: '#B4C7C6' },
  { id: 'white', label: 'สตูดิโอขาว', swatchStyle: '#F8F9FA' },
  { id: 'dark', label: 'สตูดิโอดำ', swatchStyle: '#161B22' },
  { id: 'transparent', label: 'พื้นหลังโปร่งใส', swatchStyle: 'checker' },
];

export const DEFAULT_POLO_CONFIG: PoloDesignConfig = {
  logoVariant: 'hex-crest',
  shirtColor: '#F4F5F6',
  collarColor: '#1F3554',
  roofColor: '#C81E2B',
  numberColor: '#D4A848',
  textColor: '#1A2E4A',
  patchBgColor: '#192334',
  roofThickness: 2.1,
  hexNumberColor: '#12244D',
  hexPlumbColor: '#D4A848',
  hexAccentColor: '#D61F28',
  hexFrameColor: '#12244D',
  style: 'embroidery',
  placement: 'left-sleeve',
  widthCm: 4.0,
  gapAboveBandCm: 1.0,
  horizontalShift: 0,
  backdrop: 'original',
};

export interface ColorPreset {
  name: string;
  hex: string;
}

export const SHIRT_COLOR_PRESETS: ColorPreset[] = [
  { name: 'ขาวสตูดิโอ', hex: '#F4F5F6' },
  { name: 'ขาวครีม', hex: '#EFE9DD' },
  { name: 'เทาอ่อน', hex: '#CFD5DA' },
  { name: 'ฟ้าอ่อน', hex: '#C6D9EC' },
  { name: 'กรมท่า', hex: '#1C2E4A' },
  { name: 'ดำถ่าน', hex: '#23272D' },
  { name: 'เขียวมะกอก', hex: '#4B5E50' },
  { name: 'แดงเลือดหมู', hex: '#6E222B' },
];

export const COLLAR_COLOR_PRESETS: ColorPreset[] = [
  { name: 'กรมท่าเดิม', hex: '#1F3554' },
  { name: 'ดำเข้ม', hex: '#1A1D22' },
  { name: 'ขาว', hex: '#F3F4F6' },
  { name: 'แดงเลือดหมู', hex: '#7A1F28' },
  { name: 'ทองเข้ม', hex: '#9A762F' },
  { name: 'เทาเข้ม', hex: '#4A545E' },
];

export const LOGO_COLOR_PRESETS: ColorPreset[] = [
  { name: 'กรมท่า', hex: '#12244D' },
  { name: 'เหลืองทอง', hex: '#D4A848' },
  { name: 'แดงสด', hex: '#D61F28' },
  { name: 'ขาว', hex: '#FFFFFF' },
  { name: 'ดำ', hex: '#14171C' },
  { name: 'ส้มอิฐ', hex: '#D95D24' },
];

export const PLACEMENT_OPTIONS: Array<{
  id: LogoPlacement;
  label: string;
  shortDesc: string;
  defaultWidthCm: number;
}> = [
  {
    id: 'left-sleeve',
    label: 'ปลายแขนซ้าย',
    shortDesc: 'เหนือแถบแขนซ้าย 1.0 ซม.',
    defaultWidthCm: 4.0,
  },
  {
    id: 'right-sleeve',
    label: 'ปลายแขนขวา',
    shortDesc: 'เหนือแถบแขนขวา 1.0 ซม.',
    defaultWidthCm: 4.0,
  },
  {
    id: 'left-chest',
    label: 'อกซ้าย',
    shortDesc: 'ตำแหน่งมาตรฐานหน้าอกซ้าย',
    defaultWidthCm: 7.2,
  },
  {
    id: 'right-chest',
    label: 'อกขวา',
    shortDesc: 'ตำแหน่งหน้าอกขวา',
    defaultWidthCm: 7.2,
  },
  {
    id: 'center-back',
    label: 'กลางหลัง',
    shortDesc: 'กึ่งกลางด้านหลังช่วงบน',
    defaultWidthCm: 9.0,
  },
  {
    id: 'chest-and-left-sleeve',
    label: 'อกซ้าย + แขนซ้าย',
    shortDesc: 'ติดครบทั้งหน้าอกซ้ายและปลายแขนซ้าย',
    defaultWidthCm: 4.0,
  },
];

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getColorLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

interface DetectedCuff {
  id: string;
  midX: number;
  midY: number;
  cuffWidth: number;
  angleRad: number;
  scaleX: number;
  opacity: number;
}

interface CuffSearchROI {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  scaleX: number;
  opacity: number;
  fallback: {
    midX: number;
    midY: number;
    cuffWidth: number;
    angleDeg: number;
  };
}

const LEFT_SLEEVE_ROIS: CuffSearchROI[] = [
  {
    id: 'front-big',
    x0: 0.89,
    x1: 0.985,
    y0: 0.43,
    y1: 0.50,
    scaleX: 0.94,
    opacity: 0.95,
    fallback: { midX: 0.937, midY: 0.457, cuffWidth: 0.082, angleDeg: -12 },
  },
  {
    id: 'angled-big',
    x0: 0.54,
    x1: 0.63,
    y0: 0.35,
    y1: 0.45,
    scaleX: 0.96,
    opacity: 0.96,
    fallback: { midX: 0.582, midY: 0.394, cuffWidth: 0.084, angleDeg: -33 },
  },
  {
    id: 'mini-top',
    x0: 0.20,
    x1: 0.245,
    y0: 0.22,
    y1: 0.28,
    scaleX: 0.85,
    opacity: 0.88,
    fallback: { midX: 0.22, midY: 0.252, cuffWidth: 0.032, angleDeg: -32 },
  },
  {
    id: 'mini-back',
    x0: 0.072,
    x1: 0.112,
    y0: 0.62,
    y1: 0.66,
    scaleX: 0.88,
    opacity: 0.86,
    fallback: { midX: 0.091, midY: 0.633, cuffWidth: 0.029, angleDeg: 2 },
  },
];

const RIGHT_SLEEVE_ROIS: CuffSearchROI[] = [
  {
    id: 'front-big-right',
    x0: 0.648,
    x1: 0.694,
    y0: 0.39,
    y1: 0.445,
    scaleX: 0.68,
    opacity: 0.92,
    fallback: { midX: 0.671, midY: 0.415, cuffWidth: 0.046, angleDeg: 24 },
  },
  {
    id: 'angled-big-right',
    x0: 0.312,
    x1: 0.355,
    y0: 0.415,
    y1: 0.465,
    scaleX: 0.65,
    opacity: 0.9,
    fallback: { midX: 0.333, midY: 0.44, cuffWidth: 0.042, angleDeg: 18 },
  },
  {
    id: 'mini-top-right',
    x0: 0.068,
    x1: 0.102,
    y0: 0.268,
    y1: 0.295,
    scaleX: 0.72,
    opacity: 0.85,
    fallback: { midX: 0.084, midY: 0.281, cuffWidth: 0.028, angleDeg: 24 },
  },
];

interface FlatRegionTarget {
  id: string;
  cx: number;
  cy: number;
  refWidthPxRatio: number;
  angleDeg: number;
  scaleX: number;
  opacity: number;
}

const LEFT_CHEST_TARGETS: FlatRegionTarget[] = [
  {
    id: 'front-big-lc',
    cx: 0.816,
    cy: 0.365,
    refWidthPxRatio: 0.23,
    angleDeg: -1.5,
    scaleX: 0.98,
    opacity: 0.95,
  },
  {
    id: 'angled-big-lc',
    cx: 0.435,
    cy: 0.36,
    refWidthPxRatio: 0.21,
    angleDeg: -7,
    scaleX: 0.92,
    opacity: 0.95,
  },
  {
    id: 'mini-top-lc',
    cx: 0.168,
    cy: 0.242,
    refWidthPxRatio: 0.095,
    angleDeg: -6,
    scaleX: 0.94,
    opacity: 0.88,
  },
];

const RIGHT_CHEST_TARGETS: FlatRegionTarget[] = [
  {
    id: 'front-big-rc',
    cx: 0.718,
    cy: 0.365,
    refWidthPxRatio: 0.23,
    angleDeg: 1.5,
    scaleX: 0.96,
    opacity: 0.95,
  },
  {
    id: 'angled-big-rc',
    cx: 0.364,
    cy: 0.352,
    refWidthPxRatio: 0.19,
    angleDeg: 3,
    scaleX: 0.76,
    opacity: 0.9,
  },
  {
    id: 'mini-top-rc',
    cx: 0.118,
    cy: 0.248,
    refWidthPxRatio: 0.092,
    angleDeg: 4,
    scaleX: 0.86,
    opacity: 0.86,
  },
];

const CENTER_BACK_TARGETS: FlatRegionTarget[] = [
  {
    id: 'mini-back-center',
    cx: 0.162,
    cy: 0.612,
    refWidthPxRatio: 0.135,
    angleDeg: 4,
    scaleX: 0.95,
    opacity: 0.94,
  },
];

const TOP_HEADROOM_PX = 56;
const BASE_ROOF_STROKE_PX = 18;

let cachedBaseImage: HTMLImageElement | null = null;
let cachedGableLogoImage: HTMLImageElement | null = null;
let cachedHexLogoImage: HTMLImageElement | null = null;
let cachedLeftCuffs: DetectedCuff[] | null = null;
let cachedRightCuffs: DetectedCuff[] | null = null;
let cachedRoofMask: Uint8Array | null = null;
let cachedHexRaw: {
  w: number;
  h: number;
  data: Uint8ClampedArray;
  outerBgMask: Uint8Array;
} | null = null;
let cachedBaseRaw: {
  w: number;
  h: number;
  data: Uint8ClampedArray;
  bodyWeight: Float32Array;
  trimWeight: Float32Array;
  fgAlpha: Float32Array;
  floorShadow: Float32Array;
} | null = null;
const cachedBlankBackdrops: Partial<Record<StageBackdrop, string>> = {};

function detectCuffsFromROIs(
  img: HTMLImageElement,
  rois: CuffSearchROI[]
): DetectedCuff[] {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = w;
  scanCanvas.height = h;
  const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return rois.map((roi) => ({
      id: roi.id,
      midX: roi.fallback.midX * w,
      midY: roi.fallback.midY * h,
      cuffWidth: roi.fallback.cuffWidth * w,
      angleRad: (roi.fallback.angleDeg * Math.PI) / 180,
      scaleX: roi.scaleX,
      opacity: roi.opacity,
    }));
  }

  ctx.drawImage(img, 0, 0);
  const fullData = ctx.getImageData(0, 0, w, h).data;

  return rois.map((roi) => {
    const xStart = Math.max(0, Math.floor(roi.x0 * w));
    const xEnd = Math.min(w - 1, Math.ceil(roi.x1 * w));
    const yStart = Math.max(0, Math.floor(roi.y0 * h));
    const yEnd = Math.min(h - 1, Math.ceil(roi.y1 * h));

    const topPoints: Array<{ x: number; y: number }> = [];

    for (let x = xStart; x <= xEnd; x++) {
      let topY = -1;
      for (let y = yStart; y <= yEnd; y++) {
        const idx = (y * w + x) * 4;
        const r = fullData[idx];
        const g = fullData[idx + 1];
        const b = fullData[idx + 2];
        if (r < 72 && g < 88 && b < 126 && b > r + 6) {
          topY = y;
          break;
        }
      }
      if (topY !== -1) {
        topPoints.push({ x, y: topY });
      }
    }

    if (topPoints.length < 10) {
      return {
        id: roi.id,
        midX: roi.fallback.midX * w,
        midY: roi.fallback.midY * h,
        cuffWidth: roi.fallback.cuffWidth * w,
        angleRad: (roi.fallback.angleDeg * Math.PI) / 180,
        scaleX: roi.scaleX,
        opacity: roi.opacity,
      };
    }

    const trim = Math.max(1, Math.floor(topPoints.length * 0.08));
    const core = topPoints.slice(trim, topPoints.length - trim);

    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    for (const p of core) {
      sumX += p.x;
      sumY += p.y;
      sumXX += p.x * p.x;
      sumXY += p.x * p.y;
    }

    const n = core.length;
    const denom = n * sumXX - sumX * sumX;
    const slope = Math.abs(denom) > 1e-6 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    const minX = topPoints[0].x;
    const maxX = topPoints[topPoints.length - 1].x;
    const yLeft = slope * minX + intercept;
    const yRight = slope * maxX + intercept;

    const midX = (minX + maxX) / 2;
    const midY = (yLeft + yRight) / 2;
    const cuffWidth = Math.hypot(maxX - minX, yRight - yLeft);
    const angleRad = Math.atan(slope);

    return {
      id: roi.id,
      midX,
      midY,
      cuffWidth,
      angleRad,
      scaleX: roi.scaleX,
      opacity: roi.opacity,
    };
  });
}

function ensureBasePhotoMasks(img: HTMLImageElement) {
  if (cachedBaseRaw) return cachedBaseRaw;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    cachedBaseRaw = {
      w,
      h,
      data: new Uint8ClampedArray(w * h * 4),
      bodyWeight: new Float32Array(w * h),
      trimWeight: new Float32Array(w * h),
      fgAlpha: new Float32Array(w * h),
      floorShadow: new Float32Array(w * h),
    };
    return cachedBaseRaw;
  }

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const total = w * h;
  const bodyWeight = new Float32Array(total);
  const trimWeight = new Float32Array(total);
  const fgAlpha = new Float32Array(total);
  const floorShadow = new Float32Array(total);

  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  const bgLuma = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  const shirtBoxes = [
    { x0: 0.056, x1: 0.248, y0: 0.126, y1: 0.456 },
    { x0: 0.065, x1: 0.244, y0: 0.512, y1: 0.836 },
    { x0: 0.296, x1: 0.626, y0: 0.126, y1: 0.822 },
    { x0: 0.634, x1: 0.992, y0: 0.116, y1: 0.818 },
  ];

  const isInsideShirtBoxes = new Uint8Array(total);

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      let insideShirtArea = false;
      for (let bIdx = 0; bIdx < shirtBoxes.length; bIdx++) {
        const box = shirtBoxes[bIdx];
        if (nx >= box.x0 && nx <= box.x1 && ny >= box.y0 && ny <= box.y1) {
          insideShirtArea = true;
          break;
        }
      }
      if (!insideShirtArea) continue;

      const px = y * w + x;
      isInsideShirtBoxes[px] = 1;
      const i = px * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const sageTint = (g + b) * 0.5 - r;
      const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);

      if (b > r + 7 && r < 95 && g < 110 && b < 145) {
        const blueStrength = Math.min(1, Math.max(0, (b - r - 6) / 18));
        trimWeight[px] = blueStrength;
        continue;
      }

      if (luma > 105 && distBg > 12) {
        const neutralScore = Math.min(1, Math.max(0, (13 - sageTint) / 9));
        const lumaScore = Math.min(1, Math.max(0, (luma - 105) / 30));
        bodyWeight[px] = neutralScore * lumaScore;
      }
    }
  }

  // Flood-fill studio sage background from all 4 edges to extract clean polo silhouette
  const outerBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBackgroundCandidate = (px: number): boolean => {
    if (isInsideShirtBoxes[px] === 0) return true;
    const i = px * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const sageTint = (g + b) * 0.5 - r;
    const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
    return sageTint > 9.2 && distBg < 48 && luma > 132 && luma < 226;
  };

  const enqueue = (px: number) => {
    if (outerBg[px] === 0 && isBackgroundCandidate(px)) {
      outerBg[px] = 1;
      queue[tail++] = px;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    enqueue(y * w);
    enqueue(y * w + (w - 1));
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    if (cx > 0) enqueue(curr - 1);
    if (cx < w - 1) enqueue(curr + 1);
    if (cy > 0) enqueue(curr - w);
    if (cy < h - 1) enqueue(curr + w);
  }

  // Compute smooth anti-aliased foreground alpha and floor contact shadow matte
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const px = y * w + x;
      const i = px * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const sageTint = (g + b) * 0.5 - r;

      if (outerBg[px] === 1) {
        fgAlpha[px] = 0;
        if (ny > 0.42 && ny < 0.92 && luma < bgLuma - 4) {
          floorShadow[px] = Math.min(0.68, Math.max(0, (bgLuma - luma - 4) / 115));
        }
      } else {
        const touchesBg =
          (x > 0 && outerBg[px - 1] === 1) ||
          (x < w - 1 && outerBg[px + 1] === 1) ||
          (y > 0 && outerBg[px - w] === 1) ||
          (y < h - 1 && outerBg[px + w] === 1);
        if (touchesBg && sageTint > 6.5) {
          fgAlpha[px] = Math.min(1, Math.max(0.18, (14.5 - sageTint) / 8.0));
        } else {
          fgAlpha[px] = 1;
        }
      }
    }
  }

  cachedBaseRaw = { w, h, data, bodyWeight, trimWeight, fgAlpha, floorShadow };
  return cachedBaseRaw;
}

function renderRecoloredPoloBase(
  img: HTMLImageElement,
  shirtColor: string,
  collarColor: string,
  backdrop: StageBackdrop
): HTMLCanvasElement {
  const isDefaultShirt =
    shirtColor.toUpperCase() === DEFAULT_POLO_CONFIG.shirtColor.toUpperCase();
  const isDefaultCollar =
    collarColor.toUpperCase() === DEFAULT_POLO_CONFIG.collarColor.toUpperCase();
  const isOriginalBackdrop = backdrop === 'original';

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (isDefaultShirt && isDefaultCollar && isOriginalBackdrop) {
    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  const raw = ensureBasePhotoMasks(img);
  const out = ctx.createImageData(w, h);
  const dst = out.data;
  const src = raw.data;

  const [sr, sg, sb] = hexToRgb(shirtColor);
  const [cr, cg, cb] = hexToRgb(collarColor);
  const shirtLuma = 0.299 * sr + 0.587 * sg + 0.114 * sb;
  const collarLuma = 0.299 * cr + 0.587 * cg + 0.114 * cb;

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const px = y * w + x;
      const i = px * 4;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];

      const bw = raw.bodyWeight[px];
      const tw = raw.trimWeight[px];

      // Compute foreground polo pixel color
      let fr = r;
      let fg = g;
      let fb = b;

      if (!isDefaultShirt && bw > 0.01) {
        const origLuma = 0.299 * r + 0.587 * g + 0.114 * b;
        const shade = origLuma / 232;
        const specularLift =
          shirtLuma < 120 ? Math.max(0, origLuma - 210) * 0.62 : 0;

        const tr = Math.min(255, Math.max(0, sr * shade + specularLift));
        const tg = Math.min(255, Math.max(0, sg * shade + specularLift));
        const tb = Math.min(255, Math.max(0, sb * shade + specularLift));

        fr = Math.round(r + (tr - r) * bw);
        fg = Math.round(g + (tg - g) * bw);
        fb = Math.round(b + (tb - b) * bw);
      } else if (!isDefaultCollar && tw > 0.01) {
        const origLuma = 0.299 * r + 0.587 * g + 0.114 * b;
        const trimShade = Math.min(1.45, Math.max(0.45, origLuma / 58));
        const lift = collarLuma < 80 ? Math.max(0, origLuma - 65) * 0.45 : 0;

        const tr = Math.min(255, Math.max(0, cr * trimShade + lift));
        const tg = Math.min(255, Math.max(0, cg * trimShade + lift));
        const tb = Math.min(255, Math.max(0, cb * trimShade + lift));

        fr = Math.round(r + (tr - r) * tw);
        fg = Math.round(g + (tg - g) * tw);
        fb = Math.round(b + (tb - b) * tw);
      }

      if (isOriginalBackdrop) {
        dst[i] = fr;
        dst[i + 1] = fg;
        dst[i + 2] = fb;
        dst[i + 3] = 255;
        continue;
      }

      const alpha = raw.fgAlpha[px];

      // Subtle sage de-spill on semi-transparent anti-aliased edge pixels
      if (alpha > 0 && alpha < 0.99) {
        const neutralAvg = (fr * 0.5 + fg * 0.25 + fb * 0.25);
        fg = Math.round(fg + (neutralAvg - fg) * 0.45);
        fb = Math.round(fb + (neutralAvg - fb) * 0.45);
      }

      if (backdrop === 'transparent') {
        dst[i] = fr;
        dst[i + 1] = fg;
        dst[i + 2] = fb;
        dst[i + 3] = Math.round(alpha * 255);
        continue;
      }

      // Radial studio cyclorama gradient for white / dark studio
      const radial = Math.min(1, Math.hypot((nx - 0.54) * 1.15, (ny - 0.44) * 1.25));
      const shadow = raw.floorShadow[px];

      let br: number;
      let bg: number;
      let bb: number;

      if (backdrop === 'white') {
        const base = 254 - radial * 18;
        const shadowMul = 1 - shadow * 0.32;
        br = base * shadowMul;
        bg = (base + 1) * shadowMul;
        bb = (base + 3) * shadowMul;
      } else {
        // Dark studio obsidian vignette
        const shadowMul = 1 - shadow * 0.55;
        br = (34 - radial * 18) * shadowMul;
        bg = (40 - radial * 21) * shadowMul;
        bb = (50 - radial * 25) * shadowMul;
      }

      dst[i] = Math.round(br + (fr - br) * alpha);
      dst[i + 1] = Math.round(bg + (fg - bg) * alpha);
      dst[i + 2] = Math.round(bb + (fb - bb) * alpha);
      dst[i + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Renders the blank (logo-free) polo mockup with the selected studio backdrop for synchronized comparison */
export async function composeBlankPoloBackdrop(
  backdrop: StageBackdrop
): Promise<string> {
  if (backdrop === 'original') return CLEANED_IMAGE_URL;
  const cached = cachedBlankBackdrops[backdrop];
  if (cached) return cached;
  if (!cachedBaseImage) {
    cachedBaseImage = await loadImage(CLEANED_IMAGE_URL);
  }
  const canvas = renderRecoloredPoloBase(
    cachedBaseImage,
    DEFAULT_POLO_CONFIG.shirtColor,
    DEFAULT_POLO_CONFIG.collarColor,
    backdrop
  );
  const url = canvas.toDataURL('image/png');
  cachedBlankBackdrops[backdrop] = url;
  return url;
}

/* ===========================
 * VARIANT 1: GABLE 62 LOGO
 * =========================== */

function detectRoofMask(
  data: Uint8ClampedArray,
  w: number,
  h: number
): Uint8Array {
  const mask = new Uint8Array(w * h);
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const isForeground = (idx: number): boolean => {
    const p = idx * 4;
    const dist = Math.hypot(data[p] - bgR, data[p + 1] - bgG, data[p + 2] - bgB);
    return dist > 12;
  };

  let seedIdx = -1;
  const maxScanY = Math.floor(h * 0.28);
  outer: for (let y = 0; y < maxScanY; y++) {
    for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) {
      const idx = y * w + x;
      if (isForeground(idx)) {
        seedIdx = idx;
        break outer;
      }
    }
  }

  if (seedIdx === -1) return mask;

  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  mask[seedIdx] = 1;
  queue[tail++] = seedIdx;

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;

    for (let dy = -1; dy <= 1; dy++) {
      const ny = cy + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        if (nx < 0 || nx >= w) continue;
        const nIdx = ny * w + nx;
        if (mask[nIdx] === 0 && isForeground(nIdx)) {
          mask[nIdx] = 1;
          queue[tail++] = nIdx;
        }
      }
    }
  }

  return mask;
}

function getGableLogoRawPixels(logoImg: HTMLImageElement): {
  w: number;
  h: number;
  data: Uint8ClampedArray;
  roofMask: Uint8Array;
} {
  const w = logoImg.naturalWidth;
  const h = logoImg.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      w,
      h,
      data: new Uint8ClampedArray(w * h * 4),
      roofMask: new Uint8Array(w * h),
    };
  }
  ctx.drawImage(logoImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  if (!cachedRoofMask) {
    cachedRoofMask = detectRoofMask(imgData.data, w, h);
  }
  return { w, h, data: imgData.data, roofMask: cachedRoofMask };
}

function buildThickenedRoofLayer(
  srcData: Uint8ClampedArray,
  roofMask: Uint8Array,
  w: number,
  h: number,
  rgb: [number, number, number],
  roofThickness: number
): HTMLCanvasElement {
  const bgR = srcData[0];
  const bgG = srcData[1];
  const bgB = srcData[2];

  const singleRoof = document.createElement('canvas');
  singleRoof.width = w;
  singleRoof.height = h;
  const sctx = singleRoof.getContext('2d');
  if (sctx) {
    const out = sctx.createImageData(w, h);
    const d = out.data;
    for (let px = 0; px < w * h; px++) {
      if (roofMask[px] !== 1) continue;
      const i = px * 4;
      const distBg = Math.hypot(
        srcData[i] - bgR,
        srcData[i + 1] - bgG,
        srcData[i + 2] - bgB
      );
      const alpha = Math.min(1, Math.max(0, (distBg - 12) / 145));
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = Math.round(alpha * 255);
    }
    sctx.putImageData(out, 0, 0);
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h + TOP_HEADROOM_PX;
  const octx = outCanvas.getContext('2d');
  if (!octx) return outCanvas;

  const extraPx = Math.max(
    0,
    Math.round((roofThickness - 1) * BASE_ROOF_STROKE_PX)
  );
  const downPx = Math.min(4, Math.round(extraPx * 0.12));
  const upPx = Math.min(TOP_HEADROOM_PX - 4, extraPx - downPx);

  for (let dy = -upPx; dy <= downPx; dy++) {
    octx.drawImage(singleRoof, 0, TOP_HEADROOM_PX + dy);
  }

  return outCanvas;
}

async function buildGableLogoCanvas(
  config: Pick<
    PoloDesignConfig,
    | 'roofColor'
    | 'numberColor'
    | 'textColor'
    | 'patchBgColor'
    | 'roofThickness'
    | 'style'
  >
): Promise<HTMLCanvasElement> {
  if (!cachedGableLogoImage) {
    cachedGableLogoImage = await loadImage(USER_LOGO_URL);
  }
  const { w, h, data: srcData, roofMask } =
    getGableLogoRawPixels(cachedGableLogoImage);
  const fullH = h + TOP_HEADROOM_PX;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = fullH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const roofRgb = hexToRgb(config.roofColor);
  const numberRgb = hexToRgb(config.numberColor);
  const textRgb = hexToRgb(config.textColor);

  const bodyCanvas = document.createElement('canvas');
  bodyCanvas.width = w;
  bodyCanvas.height = h;
  const bctx = bodyCanvas.getContext('2d');
  if (bctx) {
    const outData = bctx.createImageData(w, h);
    const data = outData.data;

    const bgR = srcData[0];
    const bgG = srcData[1];
    const bgB = srcData[2];

    for (let px = 0; px < w * h; px++) {
      if (roofMask[px] === 1) continue;
      const i = px * 4;
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];

      const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
      if (distBg < 14) continue;

      const alphaFactor = Math.min(1, Math.max(0, (distBg - 12) / 145));
      const warmth = (r + g) * 0.5 - b;
      if (warmth > 28) {
        data[i] = numberRgb[0];
        data[i + 1] = numberRgb[1];
        data[i + 2] = numberRgb[2];
      } else {
        data[i] = textRgb[0];
        data[i + 1] = textRgb[1];
        data[i + 2] = textRgb[2];
      }
      data[i + 3] = Math.round(alphaFactor * 255);
    }
    bctx.putImageData(outData, 0, 0);
    ctx.drawImage(bodyCanvas, 0, TOP_HEADROOM_PX);
  }

  const roofLayer = buildThickenedRoofLayer(
    srcData,
    roofMask,
    w,
    h,
    roofRgb,
    config.roofThickness
  );
  ctx.drawImage(roofLayer, 0, 0);

  const finalData = ctx.getImageData(0, 0, w, fullH).data;
  let minX = w;
  let minY = fullH;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < fullH; y++) {
    for (let x = 0; x < w; x++) {
      if (finalData[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);
  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tctx = trimmed.getContext('2d');
  if (tctx) {
    tctx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  }

  if (config.style === 'embroidery') {
    return trimmed;
  }

  const pad = 34;
  const pw = cropW + pad * 2;
  const ph = cropH + pad * 2;
  const patch = document.createElement('canvas');
  patch.width = pw;
  patch.height = ph;
  const pctx = patch.getContext('2d');
  if (!pctx) return trimmed;

  pctx.beginPath();
  pctx.roundRect(0, 0, pw, ph, 36);
  pctx.clip();
  pctx.fillStyle = config.patchBgColor;
  pctx.fillRect(0, 0, pw, ph);
  pctx.drawImage(trimmed, pad, pad);
  return patch;
}

/* ===========================
 * VARIANT 2: HEXAGON CREST LOGO
 * (62 navy + plumb bob gold + clean transparent outside corners)
 * =========================== */

function ensureHexRawPixels(hexImg: HTMLImageElement) {
  if (cachedHexRaw) return cachedHexRaw;
  const w = hexImg.naturalWidth;
  const h = hexImg.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    cachedHexRaw = {
      w,
      h,
      data: new Uint8ClampedArray(w * h * 4),
      outerBgMask: new Uint8Array(w * h),
    };
    return cachedHexRaw;
  }
  ctx.drawImage(hexImg, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const outerBgMask = new Uint8Array(w * h);

  // Corner dark charcoal-navy background sample
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  // Flood-fill from all 4 corners to strip ONLY the outer corner background
  // outside the white-outlined hexagon crest
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const trySeed = (sx: number, sy: number) => {
    const idx = sy * w + sx;
    if (outerBgMask[idx] === 0) {
      outerBgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };
  trySeed(0, 0);
  trySeed(w - 1, 0);
  trySeed(0, h - 1);
  trySeed(w - 1, h - 1);

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < w - 1 ? curr + 1 : -1,
      cy > 0 ? curr - w : -1,
      cy < h - 1 ? curr + w : -1,
    ];
    for (let k = 0; k < 4; k++) {
      const nIdx = neighbors[k];
      if (nIdx === -1 || outerBgMask[nIdx] !== 0) continue;
      const p = nIdx * 4;
      const dist = Math.hypot(
        data[p] - bgR,
        data[p + 1] - bgG,
        data[p + 2] - bgB
      );
      if (dist < 42) {
        outerBgMask[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }
  }

  cachedHexRaw = { w, h, data, outerBgMask };
  return cachedHexRaw;
}

async function buildHexCrestLogoCanvas(
  config: Pick<
    PoloDesignConfig,
    'hexNumberColor' | 'hexPlumbColor' | 'hexAccentColor' | 'hexFrameColor'
  >
): Promise<HTMLCanvasElement> {
  if (!cachedHexLogoImage) {
    cachedHexLogoImage = await loadImage(HEX_EMBLEM_LOGO_URL);
  }
  const { w, h, data: src, outerBgMask } = ensureHexRawPixels(cachedHexLogoImage);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const out = ctx.createImageData(w, h);
  const dst = out.data;

  const bgR = src[0];
  const bgG = src[1];
  const bgB = src[2];

  const numRgb = hexToRgb(config.hexNumberColor);
  const plumbRgb = hexToRgb(config.hexPlumbColor);
  const accentRgb = hexToRgb(config.hexAccentColor);
  const frameRgb = hexToRgb(config.hexFrameColor);

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const px = y * w + x;
      const i = px * 4;

      if (outerBgMask[px] === 1) {
        dst[i + 3] = 0;
        continue;
      }

      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];

      // Smoothly feather the 1px outer anti-aliased edge adjacent to the stripped corner background
      const touchesOuter =
        (x > 0 && outerBgMask[px - 1] === 1) ||
        (x < w - 1 && outerBgMask[px + 1] === 1) ||
        (y > 0 && outerBgMask[px - w] === 1) ||
        (y < h - 1 && outerBgMask[px + w] === 1);

      if (touchesOuter) {
        const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
        const edgeAlpha = Math.min(1, Math.max(0, (distBg - 20) / 170));
        dst[i] = 255;
        dst[i + 1] = 255;
        dst[i + 2] = 255;
        dst[i + 3] = Math.round(edgeAlpha * 255);
        continue;
      }

      // Detect red graphic pixels (including smooth anti-aliased edge pixels against white interior)
      const redness = r - (g + b) * 0.5;
      if (redness > 12) {
        // Recover exact sub-pixel vector coverage against white interior (#FFFFFF -> red ~ #DC1E28)
        const cov = Math.min(1, Math.max(0, (255 - g) / 228));

        let targetRgb = accentRgb;
        if (ny >= 0.075 && ny <= 0.235 && nx >= 0.355 && nx <= 0.645) {
          // Top center "62" -> dark navy blue (or user-chosen hexNumberColor)
          targetRgb = numRgb;
        } else if (ny >= 0.77 && ny <= 0.96 && nx >= 0.39 && nx <= 0.61) {
          // Bottom center plumb bob ("ลูกดิ่ง") -> warm gold (or user-chosen hexPlumbColor)
          targetRgb = plumbRgb;
        }

        dst[i] = Math.round(255 + (targetRgb[0] - 255) * cov);
        dst[i + 1] = Math.round(255 + (targetRgb[1] - 255) * cov);
        dst[i + 2] = Math.round(255 + (targetRgb[2] - 255) * cov);
        dst[i + 3] = 255;
        continue;
      }

      // Detect dark navy pixels (hexagon frame, plane blade, Thai lettering)
      const blueness = b - r;
      if (blueness > 10 && r < 225) {
        const cov = Math.min(1, Math.max(0, (255 - r) / 235));
        dst[i] = Math.round(255 + (frameRgb[0] - 255) * cov);
        dst[i + 1] = Math.round(255 + (frameRgb[1] - 255) * cov);
        dst[i + 2] = Math.round(255 + (frameRgb[2] - 255) * cov);
        dst[i + 3] = 255;
        continue;
      }

      // Crisp white interior & white outer border
      dst[i] = r;
      dst[i + 1] = g;
      dst[i + 2] = b;
      dst[i + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

/**
 * Unified logo builder returning the active logo variant canvas at full resolution.
 */
export async function buildCustomizedLogoCanvas(
  config: PoloDesignConfig,
  overrideVariant?: LogoVariant,
  overrideStyle?: LogoStyle
): Promise<HTMLCanvasElement> {
  const variant = overrideVariant ?? config.logoVariant;
  if (variant === 'gable-62') {
    return buildGableLogoCanvas({
      ...config,
      style: overrideStyle ?? config.style,
    });
  }
  if (variant === 'hex-crest') {
    return buildHexCrestLogoCanvas(config);
  }
  return buildCustomDesignLogoCanvas(variant, {
    numberColor: config.hexNumberColor,
    plumbColor: config.hexPlumbColor,
    accentColor: config.hexAccentColor,
    frameColor: config.hexFrameColor,
  });
}

/** Downloads the customized high-res standalone logo PNG */
export async function downloadStandaloneLogoPng(
  config: PoloDesignConfig,
  overrideStyle?: LogoStyle
): Promise<{ width: number; height: number }> {
  const canvas = await buildCustomizedLogoCanvas(
    config,
    config.logoVariant,
    overrideStyle
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('ไม่สามารถสร้างไฟล์โลโก้ได้');

  const filename =
    config.logoVariant === 'gable-62'
      ? (overrideStyle ?? config.style) === 'navy-patch'
        ? 'logo-62-rachasitharam-patch.png'
        : 'logo-62-rachasitharam-gable-62.png'
      : `logo-62-rachasitharam-${config.logoVariant}.png`;

  triggerBlobDownload(blob, filename);
  return { width: canvas.width, height: canvas.height };
}

function drawLogoOnSleeveCuffs(
  ctx: CanvasRenderingContext2D,
  logoCanvas: HTMLCanvasElement,
  cuffs: DetectedCuff[],
  config: PoloDesignConfig,
  useMultiply: boolean,
  overrideWidthCm?: number
) {
  const logoAspect = logoCanvas.height / logoCanvas.width;
  const SLEEVE_CUFF_REAL_CM = 16.5;
  const widthCm = overrideWidthCm ?? config.widthCm;

  for (const cuff of cuffs) {
    const pxPerCm = cuff.cuffWidth / SLEEVE_CUFF_REAL_CM;
    const drawW = Math.max(8, widthCm * pxPerCm);
    const drawH = drawW * logoAspect;
    const gapPx = config.gapAboveBandCm * pxPerCm;

    const tx = Math.cos(cuff.angleRad);
    const ty = Math.sin(cuff.angleRad);
    const nx = Math.sin(cuff.angleRad);
    const ny = -Math.cos(cuff.angleRad);

    const lateralPx = config.horizontalShift * cuff.cuffWidth;
    const centerX = cuff.midX + nx * (gapPx + drawH / 2) + tx * lateralPx;
    const centerY = cuff.midY + ny * (gapPx + drawH / 2) + ty * lateralPx;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(cuff.angleRad);
    ctx.scale(cuff.scaleX, 1);
    ctx.globalAlpha = cuff.opacity;

    if (useMultiply) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(logoCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const hasBadgeShadow =
        getLogoVariantMeta(config.logoVariant).hasWhiteShield ||
        (config.logoVariant === 'gable-62' && config.style === 'navy-patch');
      if (hasBadgeShadow) {
        ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
        ctx.shadowBlur = Math.max(1, drawW * 0.03);
        ctx.shadowOffsetY = 1;
      }
      ctx.drawImage(logoCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }
}

function drawLogoOnFlatRegions(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  logoCanvas: HTMLCanvasElement,
  targets: FlatRegionTarget[],
  config: PoloDesignConfig,
  useMultiply: boolean,
  overrideWidthCm?: number
) {
  const logoAspect = logoCanvas.height / logoCanvas.width;
  const CHEST_REAL_CM = 46;
  const widthCm = overrideWidthCm ?? config.widthCm;

  for (const t of targets) {
    const refPx = t.refWidthPxRatio * imgW;
    const pxPerCm = refPx / CHEST_REAL_CM;
    const drawW = Math.max(10, widthCm * pxPerCm);
    const drawH = drawW * logoAspect;

    const vertShiftPx = (config.gapAboveBandCm - 1.0) * pxPerCm * 2.2;
    const horizShiftPx = config.horizontalShift * refPx * 0.35;

    const cx = t.cx * imgW + horizShiftPx;
    const cy = t.cy * imgH - vertShiftPx;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((t.angleDeg * Math.PI) / 180);
    ctx.scale(t.scaleX, 1);
    ctx.globalAlpha = t.opacity;

    if (useMultiply) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(logoCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const hasBadgeShadow =
        getLogoVariantMeta(config.logoVariant).hasWhiteShield ||
        (config.logoVariant === 'gable-62' && config.style === 'navy-patch');
      if (hasBadgeShadow) {
        ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
        ctx.shadowBlur = Math.max(1, drawW * 0.03);
        ctx.shadowOffsetY = 1;
      }
      ctx.drawImage(logoCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Renders the full 4-view 2D polo shirt mockup with live shirt/collar recoloring,
 * active logo variant, custom colors, roof thickness, and placement.
 */
export async function composePoloMockup(
  config: PoloDesignConfig
): Promise<string> {
  if (!cachedBaseImage) {
    cachedBaseImage = await loadImage(CLEANED_IMAGE_URL);
  }
  if (!cachedLeftCuffs) {
    cachedLeftCuffs = detectCuffsFromROIs(cachedBaseImage, LEFT_SLEEVE_ROIS);
  }
  if (!cachedRightCuffs) {
    cachedRightCuffs = detectCuffsFromROIs(cachedBaseImage, RIGHT_SLEEVE_ROIS);
  }

  const baseCanvas = renderRecoloredPoloBase(
    cachedBaseImage,
    config.shirtColor,
    config.collarColor,
    config.backdrop
  );
  const ctx = baseCanvas.getContext('2d');
  if (!ctx) return CLEANED_IMAGE_URL;

  const logoCanvas = await buildCustomizedLogoCanvas(config);
  const shirtLuma = getColorLuminance(config.shirtColor);
  const hasWhiteShield = getLogoVariantMeta(config.logoVariant).hasWhiteShield;
  // White-shield crests multiply on bright white shirts to show cotton folds,
  // while using source-over on colored/dark shirts to keep the shield crisp.
  const useMultiply = hasWhiteShield
    ? shirtLuma > 210
    : (config.logoVariant !== 'gable-62' || config.style === 'embroidery') &&
      shirtLuma > 160;

  if (config.placement === 'left-sleeve') {
    drawLogoOnSleeveCuffs(ctx, logoCanvas, cachedLeftCuffs, config, useMultiply);
  } else if (config.placement === 'right-sleeve') {
    drawLogoOnSleeveCuffs(ctx, logoCanvas, cachedRightCuffs, config, useMultiply);
  } else if (config.placement === 'left-chest') {
    drawLogoOnFlatRegions(
      ctx,
      baseCanvas.width,
      baseCanvas.height,
      logoCanvas,
      LEFT_CHEST_TARGETS,
      config,
      useMultiply
    );
  } else if (config.placement === 'right-chest') {
    drawLogoOnFlatRegions(
      ctx,
      baseCanvas.width,
      baseCanvas.height,
      logoCanvas,
      RIGHT_CHEST_TARGETS,
      config,
      useMultiply
    );
  } else if (config.placement === 'center-back') {
    drawLogoOnFlatRegions(
      ctx,
      baseCanvas.width,
      baseCanvas.height,
      logoCanvas,
      CENTER_BACK_TARGETS,
      config,
      useMultiply
    );
  } else if (config.placement === 'chest-and-left-sleeve') {
    drawLogoOnSleeveCuffs(
      ctx,
      logoCanvas,
      cachedLeftCuffs,
      config,
      useMultiply,
      Math.min(5.0, config.widthCm)
    );
    drawLogoOnFlatRegions(
      ctx,
      baseCanvas.width,
      baseCanvas.height,
      logoCanvas,
      LEFT_CHEST_TARGETS,
      config,
      useMultiply,
      Math.max(6.8, config.widthCm * 1.65)
    );
  }

  return baseCanvas.toDataURL('image/png');
}
