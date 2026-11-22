export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ImageToneAdjustments {
  brightness: number; // 100 = normal
  contrast: number; // 100 = normal
  saturate: number; // 100 = normal
  warmth: number; // 0 = neutral (-20..20)
}

export const DEFAULT_TONE: ImageToneAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
};

export function buildFilterString(tone: ImageToneAdjustments): string {
  const parts = [
    `brightness(${tone.brightness}%)`,
    `contrast(${tone.contrast}%)`,
    `saturate(${tone.saturate}%)`,
  ];
  if (tone.warmth > 0) {
    parts.push(`sepia(${Math.round(tone.warmth * 0.8)}%)`);
  } else if (tone.warmth < 0) {
    parts.push(`hue-rotate(${Math.round(tone.warmth * 0.7)}deg)`);
  }
  return parts.join(' ');
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportImageRegion(options: {
  src: string;
  filename: string;
  format?: ExportFormat;
  quality?: number;
  rect?: { x: number; y: number; w: number; h: number };
  maxWidth?: number;
  tone?: ImageToneAdjustments;
}): Promise<{ width: number; height: number }> {
  const {
    src,
    filename,
    format = 'image/png',
    quality = 0.94,
    rect = { x: 0, y: 0, w: 1, h: 1 },
    maxWidth,
    tone,
  } = options;

  const img = await loadImage(src);
  const sx = Math.round(rect.x * img.naturalWidth);
  const sy = Math.round(rect.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(rect.w * img.naturalWidth));
  const sh = Math.max(1, Math.round(rect.h * img.naturalHeight));

  let targetW = sw;
  let targetH = sh;
  if (maxWidth && sw > maxWidth) {
    const ratio = maxWidth / sw;
    targetW = Math.round(sw * ratio);
    targetH = Math.round(sh * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับบันทึกไฟล์ได้');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (tone) {
    ctx.filter = buildFilterString(tone);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, format, format === 'image/png' ? undefined : quality)
  );

  if (!blob) {
    throw new Error('ไม่สามารถแปลงไฟล์ภาพได้');
  }

  triggerBlobDownload(blob, filename);
  return { width: targetW, height: targetH };
}

export function getExtensionForFormat(format: ExportFormat): string {
  if (format === 'image/jpeg') return 'jpg';
  if (format === 'image/webp') return 'webp';
  return 'png';
}
