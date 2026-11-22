import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Download,
  Eraser,
  RotateCcw,
  Undo2,
  Upload,
} from 'lucide-react';
import {
  buildFilterString,
  DEFAULT_TONE,
  getExtensionForFormat,
  loadImage,
  triggerBlobDownload,
  type ExportFormat,
  type ImageToneAdjustments,
} from '../utils/canvasExport';

type BrushTool = 'heal' | 'clone';

interface RetouchStudioProps {
  defaultImageUrl: string;
  onNotify: (message: string) => void;
}

const MAX_UNDO_STEPS = 12;

export const RetouchStudio: React.FC<RetouchStudioProps> = ({
  defaultImageUrl,
  onNotify,
}) => {
  const [customUploadUrl, setCustomUploadUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('polo-sleeve-logo.png');
  const sourceUrl = customUploadUrl ?? defaultImageUrl;
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [imgDims, setImgDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const [tool, setTool] = useState<BrushTool>('heal');
  const [brushSize, setBrushSize] = useState<number>(28);
  const [brushSoftness, setBrushSoftness] = useState<number>(75);
  const [pickingCloneSource, setPickingCloneSource] = useState<boolean>(false);
  const [cloneAnchor, setCloneAnchor] = useState<{ x: number; y: number } | null>(null);

  const [tone, setTone] = useState<ImageToneAdjustments>(DEFAULT_TONE);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('image/png');
  const [exportQuality, setExportQuality] = useState<number>(92);
  const [exportWidth, setExportWidth] = useState<'original' | '1600' | '1080'>('original');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [undoCount, setUndoCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const strokeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const strokeCloneBaseRef = useRef<{ x: number; y: number } | null>(null);

  // Load image into working canvas
  const initializeCanvas = useCallback(async (url: string) => {
    try {
      const img = await loadImage(url);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      undoStackRef.current = [];
      setUndoCount(0);
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      setCloneAnchor(null);
      setCanvasReady(true);
    } catch {
      setCanvasReady(false);
    }
  }, []);

  useEffect(() => {
    initializeCanvas(sourceUrl);
  }, [sourceUrl, initializeCanvas]);

  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const stack = undoStackRef.current;
    stack.push(snapshot);
    if (stack.length > MAX_UNDO_STEPS) {
      stack.shift();
    }
    setUndoCount(stack.length);
  };

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const prev = undoStackRef.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      setUndoCount(undoStackRef.current.length);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Perimeter ring sampling healing dab (blends clean surrounding pixels inward smoothly)
  const applyHealDab = (cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const r = Math.max(4, brushSize);
    const sampleRadius = r + Math.max(6, Math.round(r * 0.45));
    const samples = 16;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;

    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const sx = Math.round(cx + Math.cos(angle) * sampleRadius);
      const sy = Math.round(cy + Math.sin(angle) * sampleRadius);
      if (sx >= 0 && sy >= 0 && sx < canvas.width && sy < canvas.height) {
        const px = ctx.getImageData(sx, sy, 1, 1).data;
        sumR += px[0];
        sumG += px[1];
        sumB += px[2];
        count++;
      }
    }

    if (count === 0) return;
    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    const innerStop = Math.max(0.05, 1 - brushSoftness / 100);
    const grad = ctx.createRadialGradient(cx, cy, r * innerStop * 0.4, cx, cy, r);
    grad.addColorStop(0, `rgba(${avgR}, ${avgG}, ${avgB}, 0.92)`);
    grad.addColorStop(0.65, `rgba(${avgR}, ${avgG}, ${avgB}, 0.55)`);
    grad.addColorStop(1, `rgba(${avgR}, ${avgG}, ${avgB}, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Clone stamp dab copying textured pixels from anchor offset
  const applyCloneDab = (cx: number, cy: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !strokeOriginRef.current || !strokeCloneBaseRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dx = cx - strokeOriginRef.current.x;
    const dy = cy - strokeOriginRef.current.y;
    const sx = strokeCloneBaseRef.current.x + dx;
    const sy = strokeCloneBaseRef.current.y + dy;

    const r = Math.max(4, brushSize);
    const diameter = Math.ceil(r * 2);
    const temp = document.createElement('canvas');
    temp.width = diameter;
    temp.height = diameter;
    const tctx = temp.getContext('2d');
    if (!tctx) return;

    tctx.drawImage(canvas, sx - r, sy - r, diameter, diameter, 0, 0, diameter, diameter);
    tctx.globalCompositeOperation = 'destination-in';

    const innerStop = Math.max(0.1, 1 - brushSoftness / 100);
    const mask = tctx.createRadialGradient(r, r, r * innerStop, r, r, r);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.fillStyle = mask;
    tctx.fillRect(0, 0, diameter, diameter);

    ctx.drawImage(temp, cx - r, cy - r);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasReady) return;
    const pt = getCanvasPoint(e);

    if (tool === 'clone' && (pickingCloneSource || e.altKey)) {
      setCloneAnchor(pt);
      setPickingCloneSource(false);
      onNotify('ตั้งจุดต้นแบบสำหรับโคลนพื้นผิวผ้าแล้ว — ลากระบายบนบริเวณที่ต้องการแต่งได้เลย');
      return;
    }

    if (tool === 'clone' && !cloneAnchor) {
      setCloneAnchor(pt);
      onNotify('ตั้งจุดต้นแบบอัตโนมัติที่ตำแหน่งนี้แล้ว ลากระบายเพื่อโคลนพื้นผิว');
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndoSnapshot();
    isDrawingRef.current = true;
    strokeOriginRef.current = pt;
    strokeCloneBaseRef.current = cloneAnchor ? { ...cloneAnchor } : null;

    if (tool === 'heal') {
      applyHealDab(pt.x, pt.y);
    } else {
      applyCloneDab(pt.x, pt.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = getCanvasPoint(e);
    if (tool === 'heal') {
      applyHealDab(pt.x, pt.y);
    } else {
      applyCloneDab(pt.x, pt.y);
    }
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomUploadUrl(objectUrl);
    setSourceLabel(file.name);
    setTone(DEFAULT_TONE);
    onNotify(`โหลดภาพ ${file.name} เข้าสู่พื้นที่รีทัชแล้ว`);
    e.target.value = '';
  };

  const handleResetAll = () => {
    setTone(DEFAULT_TONE);
    initializeCanvas(sourceUrl);
    onNotify('คืนค่าภาพกลับเป็นสภาพก่อนรีทัชบนแคนวาสแล้ว');
  };

  const handleExportCanvas = async () => {
    const srcCanvas = canvasRef.current;
    if (!srcCanvas) return;
    setIsExporting(true);

    try {
      let targetW = srcCanvas.width;
      let targetH = srcCanvas.height;
      if (exportWidth !== 'original') {
        const limit = Number(exportWidth);
        if (srcCanvas.width > limit) {
          const ratio = limit / srcCanvas.width;
          targetW = Math.round(srcCanvas.width * ratio);
          targetH = Math.round(srcCanvas.height * ratio);
        }
      }

      const out = document.createElement('canvas');
      out.width = targetW;
      out.height = targetH;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = buildFilterString(tone);
      ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(
          resolve,
          exportFormat,
          exportFormat === 'image/png' ? undefined : exportQuality / 100
        )
      );

      if (!blob) throw new Error('Export failed');
      const ext = getExtensionForFormat(exportFormat);
      const baseName = sourceLabel.replace(/\.[^.]+$/, '');
      const filename = `${baseName}-clean.${ext}`;
      triggerBlobDownload(blob, filename);
      onNotify(`บันทึกไฟล์ ${filename} (${targetW} × ${targetH} px) สำเร็จ`);
    } catch {
      onNotify('ไม่สามารถบันทึกไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section id="retouch" className="py-16 md:py-20 border-t border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111827]"
              style={{ textWrap: 'balance' }}
            >
              แต่งเก็บรายละเอียดและส่งออกไฟล์
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#525B63] leading-relaxed">
              ปรับความสว่าง โทนสีผ้า หรือใช้แปรงเกลี่ยจุดและโคลนพื้นผิวผ้าเพิ่มเติมได้ทันที พร้อมรองรับการอัปโหลดภาพอื่นมาแต่งต่อในเครื่องของคุณ
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              อัปโหลดภาพอื่น
            </button>
            {customUploadUrl && (
              <button
                type="button"
                onClick={() => {
                  setCustomUploadUrl(null);
                  setSourceLabel('polo-sleeve-logo.png');
                  setTone(DEFAULT_TONE);
                }}
                className="px-3 py-2 text-xs font-medium text-[#525B63] hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                กลับไปภาพเสื้อโปโล
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Studio Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Canvas Panel */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#525B63] min-w-0">
                <span className="font-medium text-[#111827] truncate max-w-[200px]">
                  {sourceLabel}
                </span>
                {imgDims.w > 0 && (
                  <>
                    <span aria-hidden="true" className="text-zinc-300">·</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {imgDims.w} × {imgDims.h} px
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoCount === 0}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#111827] bg-[#F1F4F4] hover:bg-[#E4EAEA] disabled:opacity-40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ย้อนกลับ {undoCount > 0 ? `(${undoCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#525B63] hover:text-[#111827] hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  คืนค่าเดิม
                </button>
              </div>
            </div>

            <div className="relative bg-[#B4C7C6] flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`block w-full h-auto max-h-[600px] object-contain touch-none ${
                  pickingCloneSource ? 'cursor-crosshair' : 'cursor-cell'
                }`}
                style={{
                  filter: buildFilterString(tone),
                }}
              />
            </div>

            <div className="px-4 py-3 border-t border-zinc-100 text-xs text-[#525B63]">
              {tool === 'heal'
                ? 'โหมดเกลี่ยลบจุด: คลิกลากทับจุดหรือรอยเปื้อนเล็กๆ ระบบจะเกลี่ยสีจากเนื้อผ้ารอบข้างให้กลมกลืนอัตโนมัติ'
                : pickingCloneSource
                  ? 'คลิกเลือกบริเวณเนื้อผ้าที่สะอาดบนภาพเพื่อตั้งเป็นจุดต้นแบบในการโคลน'
                  : 'โหมดโคลนพื้นผิว: กด Alt+คลิก (หรือกดปุ่มเลือกจุดต้นแบบ) เพื่อดูดลายผ้า แล้วลากระบายทับจุดที่ต้องการ'}
            </div>
          </div>

          {/* Right Controls Rail */}
          <div id="export" className="lg:col-span-4 space-y-7">
            {/* Brush Controls */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111827]">
                เครื่องมือแปรงรีทัช
              </h3>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EAEFEF] rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setTool('heal');
                    setPickingCloneSource(false);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    tool === 'heal'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                  เกลี่ยลบจุด
                </button>
                <button
                  type="button"
                  onClick={() => setTool('clone')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    tool === 'clone'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                  โคลนพื้นผิว
                </button>
              </div>

              {tool === 'clone' && (
                <button
                  type="button"
                  onClick={() => setPickingCloneSource((v) => !v)}
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    pickingCloneSource
                      ? 'bg-[#1B314D] text-white border-[#1B314D]'
                      : 'bg-white text-[#111827] border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {pickingCloneSource
                    ? 'กำลังรอคลิกเลือกจุดต้นแบบบนภาพ...'
                    : cloneAnchor
                      ? 'เปลี่ยนจุดต้นแบบใหม่ (Alt + คลิก)'
                      : 'คลิกเพื่อเลือกจุดต้นแบบลายผ้า'}
                </button>
              )}

              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label htmlFor="brush-size" className="text-[#525B63]">
                      ขนาดหัวแปรง
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {brushSize} px
                    </span>
                  </div>
                  <input
                    id="brush-size"
                    type="range"
                    min={8}
                    max={80}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label htmlFor="brush-softness" className="text-[#525B63]">
                      ความฟุ้งขอบแปรง
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {brushSoftness}%
                    </span>
                  </div>
                  <input
                    id="brush-softness"
                    type="range"
                    min={20}
                    max={100}
                    value={brushSoftness}
                    onChange={(e) => setBrushSoftness(Number(e.target.value))}
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            </div>

            <hr className="border-zinc-200/80" />

            {/* Tone Adjustments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827]">
                  ปรับแสงและโทนสีผ้า
                </h3>
                <button
                  type="button"
                  onClick={() => setTone(DEFAULT_TONE)}
                  className="text-xs text-[#525B63] hover:text-[#111827] underline-offset-2 hover:underline cursor-pointer"
                >
                  ค่ามาตรฐาน
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTone(DEFAULT_TONE)}
                  className="px-2.5 py-1 text-xs font-medium bg-[#F1F4F4] hover:bg-[#E4EAEA] text-[#2D3640] rounded-md transition-colors cursor-pointer"
                >
                  ธรรมชาติ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTone({ brightness: 105, contrast: 104, saturate: 96, warmth: -4 })
                  }
                  className="px-2.5 py-1 text-xs font-medium bg-[#F1F4F4] hover:bg-[#E4EAEA] text-[#2D3640] rounded-md transition-colors cursor-pointer"
                >
                  ขาวสว่างคลีน
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTone({ brightness: 101, contrast: 112, saturate: 108, warmth: 3 })
                  }
                  className="px-2.5 py-1 text-xs font-medium bg-[#F1F4F4] hover:bg-[#E4EAEA] text-[#2D3640] rounded-md transition-colors cursor-pointer"
                >
                  คมชัดสตูดิโอ
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="tone-brightness" className="text-[#525B63]">
                      ความสว่าง
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {tone.brightness}%
                    </span>
                  </div>
                  <input
                    id="tone-brightness"
                    type="range"
                    min={80}
                    max={125}
                    value={tone.brightness}
                    onChange={(e) =>
                      setTone((t) => ({ ...t, brightness: Number(e.target.value) }))
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="tone-contrast" className="text-[#525B63]">
                      คอนทราสต์
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {tone.contrast}%
                    </span>
                  </div>
                  <input
                    id="tone-contrast"
                    type="range"
                    min={80}
                    max={130}
                    value={tone.contrast}
                    onChange={(e) =>
                      setTone((t) => ({ ...t, contrast: Number(e.target.value) }))
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="tone-saturate" className="text-[#525B63]">
                      ความสดของสี
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {tone.saturate}%
                    </span>
                  </div>
                  <input
                    id="tone-saturate"
                    type="range"
                    min={60}
                    max={140}
                    value={tone.saturate}
                    onChange={(e) =>
                      setTone((t) => ({ ...t, saturate: Number(e.target.value) }))
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            </div>

            <hr className="border-zinc-200/80" />

            {/* Export Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111827]">
                ตั้งค่าส่งออกไฟล์
              </h3>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#EAEFEF] rounded-lg">
                {(
                  [
                    { label: 'PNG', value: 'image/png' },
                    { label: 'JPG', value: 'image/jpeg' },
                    { label: 'WebP', value: 'image/webp' },
                  ] as const
                ).map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => setExportFormat(fmt.value)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      exportFormat === fmt.value
                        ? 'bg-white text-[#111827] shadow-xs'
                        : 'text-[#525B63] hover:text-[#111827]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              {exportFormat !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="export-quality" className="text-[#525B63]">
                      คุณภาพไฟล์
                    </label>
                    <span className="font-mono tabular-nums text-[#111827]">
                      {exportQuality}%
                    </span>
                  </div>
                  <input
                    id="export-quality"
                    type="range"
                    min={70}
                    max={100}
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                    className="w-full studio-slider"
                  />
                </div>
              )}

              <div>
                <label htmlFor="export-width" className="block text-xs text-[#525B63] mb-1.5">
                  ขนาดความกว้างภาพ
                </label>
                <select
                  id="export-width"
                  value={exportWidth}
                  onChange={(e) =>
                    setExportWidth(e.target.value as 'original' | '1600' | '1080')
                  }
                  className="w-full px-3 py-2 text-xs text-[#111827] bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-[#1B314D]"
                >
                  <option value="original">
                    ขนาดต้นฉบับเต็มความละเอียด {imgDims.w ? `(${imgDims.w} px)` : ''}
                  </option>
                  <option value="1600">เหมาะสำหรับเว็บไซต์ (กว้าง 1600 px)</option>
                  <option value="1080">เหมาะสำหรับโซเชียลมีเดีย (กว้าง 1080 px)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportCanvas}
                disabled={isExporting || !canvasReady}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-[#1B314D] hover:bg-[#14253B] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                {isExporting
                  ? 'กำลังบันทึกไฟล์...'
                  : `ดาวน์โหลดภาพ (${getExtensionForFormat(exportFormat).toUpperCase()})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
