/**
 * Catalog and crisp high-resolution SVG rasterizer for Ratchasittharam 62
 * production chest emblems (exports/apparel) and 3/4 Isometric sleeve crests (V1-V5, S3).
 */

export type RatchasitSvgLogoId =
  | 'rs62-chest-monogram'
  | 'rs62-chest-stacked'
  | 'rs62-sleeve-v1'
  | 'rs62-sleeve-v2'
  | 'rs62-sleeve-v3'
  | 'rs62-sleeve-v4'
  | 'rs62-sleeve-v5'
  | 'rs62-sleeve-s3';

export interface RatchasitSvgSwatch {
  label: string;
  hex: string;
}

export interface RatchasitSvgMeta {
  id: RatchasitSvgLogoId;
  category: 'chest' | 'sleeve';
  badgeNumber: number;
  url: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  detailDesc: string;
  defaultWidthCm: number;
  hasLightPatch: boolean;
  paletteSwatches: RatchasitSvgSwatch[];
}

export const RATCHASIT_SVG_CATALOG: RatchasitSvgMeta[] = [
  {
    id: 'rs62-chest-monogram',
    category: 'chest',
    badgeNumber: 1,
    url: '/assets/ratchasit62/jacket-chest-monogram.svg',
    shortTitle: 'อกซ้าย Monogram',
    title: 'รุ่น 62 · ตราอกซ้าย Monogram (โครงถัก + ลูกดิ่ง)',
    subtitle: 'ทรงหกเหลี่ยม · ทองแชมเปญ + ขาว · ขนาดปัก 7.2 × 7.2 ซม.',
    detailDesc:
      'ตราองค์กรทรงหกเหลี่ยม-ลูกดิ่งพร้อมโครงถักหลังคาจั่วสำหรับกระเป๋าอกซ้าย (ปัก 2 สี ขาว-ทองแชมเปญ)',
    defaultWidthCm: 7.2,
    hasLightPatch: false,
    paletteSwatches: [
      { label: 'กรอบ/โครงถัก/ลูกดิ่ง', hex: '#E5C573' },
      { label: 'เลข 62 และข้อความ', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'rs62-chest-stacked',
    category: 'chest',
    badgeNumber: 2,
    url: '/assets/ratchasit62/jacket-chest-stacked.svg',
    shortTitle: 'อกซ้าย Stacked 62',
    title: 'รุ่น 62 · ตราอกซ้าย Stacked (จั่วสถาปัตย์ 62)',
    subtitle: 'เส้นจั่วมินิมอล + 62 ทอง · ขนาดปัก 7.5 × 4.8 ซม.',
    detailDesc:
      'โลโก้หน้าอกจัดวาง 2 บรรทัดพร้อมเส้นหน้าจั่วเฉียบคมและเลข 62 สีทองแชมเปญ',
    defaultWidthCm: 7.5,
    hasLightPatch: false,
    paletteSwatches: [
      { label: 'จั่วและเลข 62', hex: '#E5C573' },
      { label: 'ข้อความราชสิทธาราม', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'rs62-sleeve-v1',
    category: 'sleeve',
    badgeNumber: 3,
    url: '/assets/ratchasit62/ratchasittharam-62-v1.svg',
    shortTitle: 'แขน V1 แดงเลือดหมู',
    title: 'รุ่น 62 · V1 Heritage Crimson Hex Split',
    subtitle: 'กบไสไม้ 3/4 Iso · อาร์มขาว-กรมท่า-แดง · 6.5 × 6.8 ซม.',
    detailDesc:
      'อาร์มหกเหลี่ยมแบ่งช่อง แถบหัวกรมท่า คู่กบไสไม้ 3/4 Isometric รางกรมท่า-ใบกบแดงเลือดหมู',
    defaultWidthCm: 6.5,
    hasLightPatch: true,
    paletteSwatches: [
      { label: 'พื้นอาร์ม', hex: '#FFFFFF' },
      { label: 'กรอบ/แถบหัว/รางไม้', hex: '#0A1D56' },
      { label: 'เลข 62/ใบกบ/ลูกดิ่ง', hex: '#B81D24' },
    ],
  },
  {
    id: 'rs62-sleeve-v2',
    category: 'sleeve',
    badgeNumber: 4,
    url: '/assets/ratchasit62/ratchasittharam-62-v2.svg',
    shortTitle: 'แขน V2 ครีมแปดเหลี่ยม',
    title: 'รุ่น 62 · V2 Vintage Workwear Octagon',
    subtitle: 'กบไสไม้ 3/4 Iso · ครีม-สเลท-ส้มคอปเปอร์ · 6.6 × 6.6 ซม.',
    detailDesc:
      'อาร์มแปดเหลี่ยมวินเทจสีครีม แบ่งกริดซ้าย-ขวา กบไสไม้ 3/4 Iso รางสเลท-ใบกบคอปเปอร์',
    defaultWidthCm: 6.6,
    hasLightPatch: true,
    paletteSwatches: [
      { label: 'พื้นครีมวินเทจ', hex: '#F5EFE0' },
      { label: 'กรอบ/ตัวอักษร/รางไม้', hex: '#14213D' },
      { label: 'เลข 62/ใบกบ/ลูกดิ่ง', hex: '#C85A28' },
    ],
  },
  {
    id: 'rs62-sleeve-v3',
    category: 'sleeve',
    badgeNumber: 5,
    url: '/assets/ratchasit62/ratchasittharam-62-v3.svg',
    shortTitle: 'แขน V3 วงกลมทอง',
    title: 'รุ่น 62 · V3 Royal Circular Workwear Seal',
    subtitle: 'กบไสไม้ 3/4 Iso · พื้นโปร่งทองแชมเปญ-ขาว-แดง · 6.6 × 6.6 ซม.',
    detailDesc:
      'ตราวงกลมพื้นโปร่งเข้าชุดตราอกซ้าย กบไสไม้ 3/4 Isometric รางขาว-ใบกบทองเหนือสะพานแดง',
    defaultWidthCm: 6.6,
    hasLightPatch: false,
    paletteSwatches: [
      { label: 'รางไม้/เลข 62/ชื่อ', hex: '#FFFFFF' },
      { label: 'วงแหวน/ใบกบ/ลูกดิ่ง', hex: '#E5C573' },
      { label: 'สะพานคั่นและเพชร', hex: '#D9232E' },
    ],
  },
  {
    id: 'rs62-sleeve-v4',
    category: 'sleeve',
    badgeNumber: 6,
    url: '/assets/ratchasit62/ratchasittharam-62-v4.svg',
    shortTitle: 'แขน V4 พิมพ์เขียว',
    title: 'รุ่น 62 · V4 Blueprint Title-Block Stamp',
    subtitle: 'กบไสไม้ 3/4 Iso · ไอซ์บลู-คาร์บอน-แอมเบอร์ · 6.2 × 7.2 ซม.',
    detailDesc:
      'สแตมป์ตารางพิมพ์เขียวสถาปัตย์ กบไสไม้ 3/4 Iso รางหมึกคาร์บอน-ใบกบแอมเบอร์',
    defaultWidthCm: 6.2,
    hasLightPatch: true,
    paletteSwatches: [
      { label: 'พื้นไอซ์บลู', hex: '#F2F5F9' },
      { label: 'ตาราง/รางไม้/ชื่อ', hex: '#0F172A' },
      { label: 'จั่ว/ใบกบ/ลูกดิ่ง', hex: '#D98218' },
    ],
  },
  {
    id: 'rs62-sleeve-v5',
    category: 'sleeve',
    badgeNumber: 7,
    url: '/assets/ratchasit62/ratchasittharam-62-v5.svg',
    shortTitle: 'แขน V5 จั่วทองเหลือง',
    title: 'รุ่น 62 · V5 Oxford Navy & Antique Brass',
    subtitle: 'กบไสไม้ 3/4 Iso · โล่จั่วสองชั้น-ทองเหลือง · 6.5 × 7.0 ซม.',
    detailDesc:
      'โล่จั่วสองชั้นสง่างาม กบไสไม้ 3/4 Iso ยอดจั่ว รางกรมท่า-ใบกบทองเหลือง คู่แถบเอวกรมท่าทึบ',
    defaultWidthCm: 6.5,
    hasLightPatch: true,
    paletteSwatches: [
      { label: 'พื้นขาว', hex: '#FFFFFF' },
      { label: 'กรอบจั่ว/รางไม้', hex: '#0C1B3A' },
      { label: 'ใบกบ/62/ลูกดิ่ง', hex: '#B8862D' },
    ],
  },
  {
    id: 'rs62-sleeve-s3',
    category: 'sleeve',
    badgeNumber: 8,
    url: '/assets/ratchasit62/ratchasittharam-62-s3.svg',
    shortTitle: 'แขน S3 หกเหลี่ยมแดง',
    title: 'รุ่น 62 · S3 Compact Hex-Profile Badge',
    subtitle: 'กบไสไม้ 3/4 Iso · หกเหลี่ยมพื้นขาว-กรมท่า-แดง · 6.5 × 6.8 ซม.',
    detailDesc:
      'ตราหกเหลี่ยมพื้นขาวล้อทรงตราอกซ้าย กบไสไม้ 3/4 Isometric กรมท่า-แดง คมชัดระยะไกล',
    defaultWidthCm: 6.5,
    hasLightPatch: true,
    paletteSwatches: [
      { label: 'พื้นขาว', hex: '#FFFFFF' },
      { label: 'กรอบ/รางไม้/ชื่อ', hex: '#091854' },
      { label: '62/ใบกบ/ลูกดิ่ง', hex: '#E31E24' },
    ],
  },
];

const RATCHASIT_ID_SET = new Set<string>(RATCHASIT_SVG_CATALOG.map((item) => item.id));

export function isRatchasitSvgLogo(id: string): id is RatchasitSvgLogoId {
  return RATCHASIT_ID_SET.has(id);
}

export function getRatchasitSvgMeta(id: RatchasitSvgLogoId): RatchasitSvgMeta {
  return (
    RATCHASIT_SVG_CATALOG.find((item) => item.id === id) ?? RATCHASIT_SVG_CATALOG[0]
  );
}

const svgCanvasCache = new Map<string, Promise<HTMLCanvasElement>>();

function parseRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [244, 245, 246];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbLuminance([r, g, b]: [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Computes contrast-safe hex color remapping for transparent/unshielded SVGs
 * so lines, numbers, and Thai typography never vanish into white, cream, pastel,
 * gold, copper, or crimson/burgundy shirt fabric.
 */
export function computeSvgContrastMap(
  id: RatchasitSvgLogoId,
  shirtColor?: string,
  autoContrast = true
): Record<string, string> {
  if (!autoContrast || !shirtColor) return {};

  const meta = getRatchasitSvgMeta(id);
  const rgb = parseRgb(shirtColor);
  const [r, g, b] = rgb;
  const luma = rgbLuminance(rgb);

  const isLight = luma >= 145;
  const isGoldTone = r > 165 && g > 120 && b < 115 && luma >= 115;
  const isRedTone = r > 90 && r > g * 1.65 && r > b * 1.65 && luma < 155;
  const isCopperTone = r > 140 && g > 55 && b < 90 && luma >= 75 && luma < 145;

  const swap: Record<string, string> = {};

  if (!meta.hasLightPatch) {
    // Transparent line-art & unshielded crests (Monogram, Stacked 62, V3)
    if (isLight) {
      swap['#FFFFFF'] = '#12244D'; // Crisp Royal Navy instead of invisible white
      swap['#E5C573'] = isGoldTone ? '#7C2D12' : '#9E6E14'; // Burnished gold / bronze
      if (isRedTone) {
        swap['#D9232E'] = '#12244D';
      }
    } else if (isGoldTone) {
      swap['#E5C573'] = '#7C2D12';
      swap['#FFFFFF'] = '#12244D';
    } else {
      // Mid/dark shirt (navy, charcoal, olive, burgundy, brick red, copper)
      if (isRedTone || isCopperTone) {
        // V3 crimson bridge/diamonds vanish on burgundy or copper shirts -> deep charcoal navy
        swap['#D9232E'] = '#121C2E';
      }
    }
  }

  return swap;
}

/**
 * Returns the effective color swatch list actually rendered on the given shirtColor.
 */
export function getEffectiveSvgPaletteSwatches(
  id: RatchasitSvgLogoId,
  shirtColor?: string,
  autoContrast = true
): RatchasitSvgSwatch[] {
  const meta = getRatchasitSvgMeta(id);
  const swap = computeSvgContrastMap(id, shirtColor, autoContrast);
  if (Object.keys(swap).length === 0) return meta.paletteSwatches;

  const normalized = new Map<string, string>();
  for (const [k, v] of Object.entries(swap)) {
    normalized.set(k.toUpperCase(), v);
  }
  return meta.paletteSwatches.map((sw) => ({
    label: sw.label,
    hex: normalized.get(sw.hex.toUpperCase()) ?? sw.hex,
  }));
}

/** Single-pass case-insensitive hex replacement so swapped hexes never collide sequentially */
function remapSvgHexColors(svgText: string, swapMap: Record<string, string>): string {
  const entries = Object.entries(swapMap);
  if (entries.length === 0) return svgText;
  const normalized = new Map<string, string>();
  for (const [k, v] of entries) {
    normalized.set(k.toUpperCase(), v);
  }
  return svgText.replace(/#[0-9a-fA-F]{6}\b/g, (match) => {
    return normalized.get(match.toUpperCase()) ?? match;
  });
}

function parseViewBoxAspect(svgText: string): { vw: number; vh: number } {
  const vbMatch = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { vw: parts[2], vh: parts[3] };
    }
  }
  return { vw: 660, vh: 680 };
}

function rewriteSvgDimensions(svgText: string, pxW: number, pxH: number): string {
  return svgText.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const cleaned = attrs
      .replace(/\swidth\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\sheight\s*=\s*["'][^"']*["']/gi, '');
    return `<svg${cleaned} width="${pxW}" height="${pxH}">`;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to decode SVG image: ${url}`));
    img.src = url;
  });
}

/**
 * Fetches an SVG from public/assets/ratchasit62/, optionally remaps ink colors for
 * automatic shirt-fabric contrast, and rasterizes cleanly at targetMaxDim pixels.
 */
export function loadRatchasitSvgCanvas(
  id: RatchasitSvgLogoId,
  targetMaxDim = 1024,
  shirtColor?: string,
  autoContrast = true
): Promise<HTMLCanvasElement> {
  const swapMap = computeSvgContrastMap(id, shirtColor, autoContrast);
  const swapKey = Object.entries(swapMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}>${v}`)
    .join(',');
  const key = `${id}@${targetMaxDim}:${swapKey || 'orig'}`;

  const cached = svgCanvasCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const meta = getRatchasitSvgMeta(id);
    const resp = await fetch(meta.url);
    if (!resp.ok) {
      throw new Error(`Unable to fetch SVG asset ${meta.url} (${resp.status})`);
    }
    const rawSvg = await resp.text();
    const { vw, vh } = parseViewBoxAspect(rawSvg);
    const scale = targetMaxDim / Math.max(vw, vh);
    const pxW = Math.max(64, Math.round(vw * scale));
    const pxH = Math.max(64, Math.round(vh * scale));
    const recoloredSvg = remapSvgHexColors(rawSvg, swapMap);
    const sizedSvg = rewriteSvgDimensions(recoloredSvg, pxW, pxH);

    const blob = new Blob([sizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImageFromUrl(blobUrl);
      const canvas = document.createElement('canvas');
      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, pxW, pxH);
      }
      return canvas;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  })().catch((err) => {
    svgCanvasCache.delete(key);
    throw err;
  });

  svgCanvasCache.set(key, task);
  return task;
}
