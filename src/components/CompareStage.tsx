import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Check,
  Columns2,
  Download,
  Eye,
  Layers,
  Maximize2,
  Palette,
  RotateCcw,
  Shirt,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CLEANED_IMAGE_URL,
  ORIGINAL_IMAGE_URL,
  SLEEVE_HOTSPOTS,
  type InspectHotspot,
} from '../constants/assets';
import {
  buildCustomizedLogoCanvas,
  COLLAR_COLOR_PRESETS,
  composeBlankPoloBackdrop,
  DEFAULT_POLO_CONFIG,
  getColorLuminance,
  getLogoVariantMeta,
  LOGO_COLOR_PRESETS,
  LOGO_VARIANT_CATALOG,
  PLACEMENT_OPTIONS,
  SHIRT_COLOR_PRESETS,
  STAGE_BACKDROP_OPTIONS,
  type LogoPlacement,
  type LogoStyle,
  type LogoVariant,
  type PoloDesignConfig,
} from '../utils/sleeveLogoComposer';
import { Polo3DViewer } from './Polo3DViewer';

type ViewMode = 'mockup' | '3d' | 'slider' | 'side-by-side';
type CompareBase = 'blank' | 'original';
type ControlTab = 'position' | 'shirt' | 'logo-color';

interface CompareStageProps {
  resultImageUrl: string;
  isComposing: boolean;
  config: PoloDesignConfig;
  onChangeConfig: (next: PoloDesignConfig) => void;
  onDownloadFull: () => void;
  isDownloading: boolean;
  onNotify: (message: string) => void;
}

export const CompareStage: React.FC<CompareStageProps> = ({
  resultImageUrl,
  isComposing,
  config,
  onChangeConfig,
  onDownloadFull,
  isDownloading,
  onNotify,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [controlTab, setControlTab] = useState<ControlTab>('position');
  const [compareBase, setCompareBase] = useState<CompareBase>('blank');
  const [sliderPos, setSliderPos] = useState<number>(48);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [peekingBefore, setPeekingBefore] = useState<boolean>(false);
  const [activeHotspot, setActiveHotspot] = useState<InspectHotspot | null>(null);
  const [manualZoom, setManualZoom] = useState<number>(1);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxShowBefore, setLightboxShowBefore] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [variantThumbs, setVariantThumbs] = useState<
    Partial<Record<LogoVariant, string>>
  >({});
  const [blankBackdropUrl, setBlankBackdropUrl] = useState<string>(CLEANED_IMAGE_URL);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const beforeImageUrl =
    compareBase === 'blank' ? blankBackdropUrl : ORIGINAL_IMAGE_URL;
  const beforeLabel =
    compareBase === 'blank' ? 'เสื้อเปล่า (ก่อนติดโลโก้)' : 'ต้นฉบับเดิม (โลโก้ 18)';

  const placementMeta =
    PLACEMENT_OPTIONS.find((p) => p.id === config.placement) ??
    PLACEMENT_OPTIONS[0];
  const isSleevePlacement =
    config.placement === 'left-sleeve' ||
    config.placement === 'right-sleeve' ||
    config.placement === 'chest-and-left-sleeve';
  const isOriginalGable = config.logoVariant === 'gable-62';
  const activeVariantMeta = getLogoVariantMeta(config.logoVariant);

  const checkerBackdropStyle: React.CSSProperties = {
    backgroundColor: '#F3F4F6',
    backgroundImage:
      'linear-gradient(45deg, #E1E5E9 25%, transparent 25%), linear-gradient(-45deg, #E1E5E9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E1E5E9 75%), linear-gradient(-45deg, transparent 75%, #E1E5E9 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  };

  const stageBackdropStyle: React.CSSProperties =
    config.backdrop === 'transparent'
      ? checkerBackdropStyle
      : config.backdrop === 'white'
        ? { backgroundColor: '#F5F7F9' }
        : config.backdrop === 'dark'
          ? { backgroundColor: '#14181F' }
          : { backgroundColor: '#B4C7C6' };

  // Keep blank reference shirt synchronized with selected studio backdrop
  useEffect(() => {
    let cancelled = false;
    composeBlankPoloBackdrop(config.backdrop)
      .then((url) => {
        if (!cancelled) setBlankBackdropUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBlankBackdropUrl(CLEANED_IMAGE_URL);
      });
    return () => {
      cancelled = true;
    };
  }, [config.backdrop]);

  // Generate crisp live mini thumbnails for all 7 logo variants
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      LOGO_VARIANT_CATALOG.map(async (item) => {
        const canvas = await buildCustomizedLogoCanvas(
          config,
          item.id,
          'embroidery'
        );
        return [item.id, canvas.toDataURL('image/png')] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        const next: Partial<Record<LogoVariant, string>> = {};
        for (const [id, url] of entries) {
          next[id] = url;
        }
        setVariantThumbs(next);
      })
      .catch(() => {
        // Ignored safely
      });
    return () => {
      cancelled = true;
    };
  }, [
    config.roofColor,
    config.numberColor,
    config.textColor,
    config.roofThickness,
    config.hexNumberColor,
    config.hexPlumbColor,
    config.hexAccentColor,
    config.hexFrameColor,
  ]);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      updateSliderFromClientX(e.clientX);
    };
    const handlePointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, updateSliderFromClientX]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  const handleSelectShirtColor = (hex: string) => {
    const isDark = getColorLuminance(hex) < 120;
    let nextTextColor = config.textColor;
    if (isDark && getColorLuminance(config.textColor) < 90) {
      nextTextColor = '#FFFFFF';
    } else if (!isDark && config.textColor.toUpperCase() === '#FFFFFF') {
      nextTextColor = '#1A2E4A';
    }

    let nextHexFrame = config.hexFrameColor;
    let nextHexNumber = config.hexNumberColor;
    if (config.logoVariant === 'minimal-gable') {
      if (isDark) {
        if (getColorLuminance(nextHexFrame) < 90) nextHexFrame = '#FFFFFF';
        if (getColorLuminance(nextHexNumber) < 90) nextHexNumber = '#FFFFFF';
      } else {
        if (nextHexFrame.toUpperCase() === '#FFFFFF') nextHexFrame = '#12244D';
        if (nextHexNumber.toUpperCase() === '#FFFFFF') nextHexNumber = '#12244D';
      }
    }

    onChangeConfig({
      ...config,
      shirtColor: hex,
      textColor: nextTextColor,
      hexFrameColor: nextHexFrame,
      hexNumberColor: nextHexNumber,
    });
  };

  const handleSelectPlacement = (placement: LogoPlacement) => {
    const opt = PLACEMENT_OPTIONS.find((p) => p.id === placement);
    onChangeConfig({
      ...config,
      placement,
      widthCm: opt ? opt.defaultWidthCm : config.widthCm,
      gapAboveBandCm: 1.0,
      horizontalShift: 0,
    });
  };

  const isCompareMode = viewMode === 'slider' || viewMode === 'side-by-side';
  const isSideBySide = viewMode === 'side-by-side';

  const handleToggleSideBySideSwitch = () => {
    if (viewMode === 'side-by-side') {
      setViewMode('slider');
    } else {
      setViewMode('side-by-side');
    }
  };

  const handleSelectHotspot = (spot: InspectHotspot) => {
    if (activeHotspot?.id === spot.id && viewMode !== '3d') {
      setActiveHotspot(null);
      setManualZoom(1);
      return;
    }
    if (viewMode === '3d') {
      setViewMode('mockup');
    }
    setActiveHotspot(spot);
    setManualZoom(spot.zoom);
  };

  const handleResetView = () => {
    setActiveHotspot(null);
    setManualZoom(1);
    setSliderPos(48);
  };

  const effectiveZoom = activeHotspot ? activeHotspot.zoom : manualZoom;
  const transformOrigin = activeHotspot
    ? `${activeHotspot.x * 100}% ${activeHotspot.y * 100}%`
    : '50% 50%';

  return (
    <section id="compare" className="pt-10 pb-14 md:pt-12 md:pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Title & Metadata Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-7">
          <div className="max-w-2xl">
            <h1
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#111827] leading-[1.2]"
              style={{ textWrap: 'balance' }}
            >
              สตูดิโอออกแบบเสื้อโปโลและโลโก้
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#525B63]">
              <span>{activeVariantMeta.title}</span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span>{placementMeta.label}</span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="font-mono text-xs tabular-nums text-[#111827]">
                กว้าง {config.widthCm.toFixed(1)} ซม.
              </span>
              {naturalSize && viewMode !== '3d' && (
                <>
                  <span aria-hidden="true" className="text-zinc-300">·</span>
                  <span className="font-mono text-xs tabular-nums">
                    {naturalSize.w} × {naturalSize.h} px
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary View Mode Switcher + Dedicated Side-by-side Switch */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              role="tablist"
              aria-label="โหมดการแสดงผลเสื้อ"
              className="inline-flex flex-wrap items-center p-1 bg-[#EAEFEF] rounded-lg border border-zinc-200/70"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'mockup'}
                onClick={() => setViewMode('mockup')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'mockup'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B63] hover:text-[#111827]'
                }`}
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ม็อกอัพ 4 มุม
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === '3d'}
                onClick={() => {
                  setViewMode('3d');
                  setActiveHotspot(null);
                  setManualZoom(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B63] hover:text-[#111827]'
                }`}
              >
                <Box className="w-3.5 h-3.5" aria-hidden="true" />
                หมุนเสื้อ 3D
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isCompareMode}
                onClick={() => {
                  if (!isCompareMode) {
                    setViewMode('side-by-side');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isCompareMode
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B63] hover:text-[#111827]'
                }`}
              >
                {isSideBySide ? (
                  <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                เทียบก่อน–หลัง
              </button>
            </div>

            {/* Dedicated Side-by-Side Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isSideBySide}
              onClick={handleToggleSideBySideSwitch}
              title="สลับแสดงภาพก่อน–หลังแบบเคียงข้าง (Side-by-side) แทนแบบสไลเดอร์"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSideBySide
                  ? 'bg-[#F4F7FA] border-[#1B314D] text-[#111827]'
                  : 'bg-white border-zinc-200 text-[#374151] hover:bg-zinc-50'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5 text-[#1B314D]" aria-hidden="true" />
              <span>เคียงข้าง</span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  isSideBySide ? 'bg-[#1B314D]' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                    isSideBySide ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            {viewMode !== '3d' && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="เปิดดูภาพขนาดเต็มหน้าจอ"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                เต็มจอ
              </button>
            )}
          </div>
        </div>

        {/* Unified Single-Elevation Stage + Customizer Frame */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
          {/* Background Selector Bar (White Studio / Dark Studio / Transparent / Original) */}
          <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="inline-flex items-center gap-2 text-[#111827] font-semibold">
              <Layers className="w-3.5 h-3.5 text-[#1B314D]" aria-hidden="true" />
              <span>เปลี่ยนฉากหลัง:</span>
            </div>
            <div
              role="radiogroup"
              aria-label="เลือกโทนสีฉากหลังสตูดิโอ"
              className="flex flex-wrap items-center gap-1.5"
            >
              {STAGE_BACKDROP_OPTIONS.map((opt) => {
                const selected = config.backdrop === opt.id;
                const isChecker = opt.swatchStyle === 'checker';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      onChangeConfig({ ...config, backdrop: opt.id })
                    }
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      selected
                        ? 'border-[#1B314D] bg-[#F4F7FA] text-[#111827] ring-1 ring-[#1B314D]'
                        : 'border-zinc-200 bg-white text-[#374151] hover:bg-zinc-50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-3.5 h-3.5 rounded-xs border border-black/20 shrink-0"
                      style={
                        isChecker
                          ? {
                              backgroundColor: '#F3F4F6',
                              backgroundImage:
                                'linear-gradient(45deg, #CBD5E1 25%, transparent 25%), linear-gradient(-45deg, #CBD5E1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #CBD5E1 75%), linear-gradient(-45deg, transparent 75%, #CBD5E1 75%)',
                              backgroundSize: '8px 8px',
                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                            }
                          : { backgroundColor: opt.swatchStyle }
                      }
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Before/After Comparison Toolbar (Slider <-> Side-by-Side Switch + Sync Zoom) */}
          {isCompareMode && !imageError && (
            <div className="px-4 sm:px-6 py-3 bg-[#FAFBFB] border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Left: Slider <-> Side-by-side Switch */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`font-medium transition-colors ${
                    !isSideBySide ? 'text-[#111827]' : 'text-[#525B63]'
                  }`}
                >
                  สไลเดอร์
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSideBySide}
                  aria-label="สลับโหมดเปรียบเทียบระหว่างสไลเดอร์กับเคียงข้าง (Side-by-side)"
                  onClick={handleToggleSideBySideSwitch}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B314D] ${
                    isSideBySide ? 'bg-[#1B314D]' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                      isSideBySide ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`font-medium transition-colors ${
                    isSideBySide ? 'text-[#1B314D]' : 'text-[#525B63]'
                  }`}
                >
                  เคียงข้าง (Side-by-side)
                </span>
              </div>

              {/* Right: Reference Base + Synchronized Zoom */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5">
                  <span className="text-[#525B63]">เทียบกับ:</span>
                  <button
                    type="button"
                    onClick={() => setCompareBase('blank')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      compareBase === 'blank'
                        ? 'bg-[#1B314D] text-white'
                        : 'bg-[#EAEFEF] text-[#525B63] hover:text-[#111827]'
                    }`}
                  >
                    เสื้อเปล่าไร้โลโก้
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareBase('original')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      compareBase === 'original'
                        ? 'bg-[#1B314D] text-white'
                        : 'bg-[#EAEFEF] text-[#525B63] hover:text-[#111827]'
                    }`}
                  >
                    ต้นฉบับเดิม
                  </button>
                </div>

                <div className="inline-flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveHotspot(null);
                      setManualZoom((z) => Math.max(1, Number((z - 0.5).toFixed(2))));
                    }}
                    aria-label="ซูมออกพร้อมกัน"
                    className="p-1.5 text-[#111827] hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono tabular-nums text-[#111827]">
                    {Math.round(effectiveZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveHotspot(null);
                      setManualZoom((z) => Math.min(3.5, Number((z + 0.5).toFixed(2))));
                    }}
                    aria-label="ซูมเข้าพร้อมกัน"
                    className="p-1.5 text-[#111827] hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {effectiveZoom > 1 && (
                  <button
                    type="button"
                    onClick={handleResetView}
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-medium rounded-md bg-white hover:bg-zinc-50 text-[#111827] border border-zinc-200 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    เต็มเฟรม
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Viewport Area */}
          {viewMode === '3d' ? (
            <Polo3DViewer config={config} onNotify={onNotify} />
          ) : imageError ? (
            <div className="aspect-[3/2] w-full bg-[#B5C8C7]/35 flex flex-col items-center justify-center p-8 text-center">
              <p className="text-base font-medium text-[#111827]">
                ไม่สามารถโหลดไฟล์ภาพได้ในขณะนี้
              </p>
              <p className="text-sm text-[#525B63] mt-1">
                ลองรีเฟรชหน้าเว็บเพื่อโหลดภาพม็อกอัพเสื้อโปโลอีกครั้ง
              </p>
            </div>
          ) : viewMode === 'side-by-side' ? (
            <div className="p-4 sm:p-5 bg-[#FAFBFB]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <figure className="bg-white rounded-xl border border-zinc-200/80 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between text-xs text-[#525B63]">
                    <span className="font-medium text-[#111827]">
                      ก่อน ({beforeLabel})
                    </span>
                    <span className="font-mono tabular-nums">Before</span>
                  </div>
                  <div
                    className="aspect-[3/2] overflow-hidden"
                    style={
                      compareBase === 'blank'
                        ? stageBackdropStyle
                        : { backgroundColor: '#B4C7C6' }
                    }
                  >
                    <img
                      src={beforeImageUrl}
                      alt={beforeLabel}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 ease-out"
                      style={{
                        transform: `scale(${effectiveZoom})`,
                        transformOrigin,
                      }}
                    />
                  </div>
                </figure>

                <figure className="bg-white rounded-xl border border-[#1B314D]/25 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between text-xs text-[#525B63]">
                    <span className="font-medium text-[#1B314D]">
                      หลัง · {activeVariantMeta.shortTitle} ({placementMeta.label})
                    </span>
                    <span className="font-mono tabular-nums text-[#1B314D]">
                      After
                    </span>
                  </div>
                  <div
                    className="aspect-[3/2] overflow-hidden"
                    style={stageBackdropStyle}
                  >
                    <img
                      src={resultImageUrl}
                      alt="ภาพม็อกอัพเสื้อโปโลที่ปรับแต่งแล้ว"
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-300 ease-out ${
                        isComposing ? 'opacity-90' : 'opacity-100'
                      }`}
                      style={{
                        transform: `scale(${effectiveZoom})`,
                        transformOrigin,
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                      }}
                      onError={() => setImageError(true)}
                    />
                  </div>
                </figure>
              </div>
            </div>
          ) : (
            <div
              ref={stageRef}
              className={`relative aspect-[3/2] w-full select-none overflow-hidden ${
                viewMode === 'slider' ? 'cursor-ew-resize' : 'cursor-default'
              }`}
              style={stageBackdropStyle}
              onPointerDown={(e) => {
                if (viewMode !== 'slider') return;
                setIsDragging(true);
                updateSliderFromClientX(e.clientX);
              }}
            >
              <img
                src={peekingBefore ? beforeImageUrl : resultImageUrl}
                alt="ภาพม็อกอัพเสื้อโปโลพร้อมโลโก้ที่ปรับแต่ง"
                referrerPolicy="no-referrer"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (!peekingBefore) {
                    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }
                }}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover transition-transform duration-300 ease-out ${
                  isComposing ? 'opacity-90' : 'opacity-100'
                }`}
                style={{
                  clipPath:
                    viewMode === 'slider'
                      ? `inset(0 0 0 ${sliderPos}%)`
                      : undefined,
                  transform: `scale(${effectiveZoom})`,
                  transformOrigin,
                }}
              />

              {viewMode === 'slider' && (
                <>
                  <img
                    src={beforeImageUrl}
                    alt={beforeLabel}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-300 ease-out"
                    style={{
                      clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                      transform: `scale(${effectiveZoom})`,
                      transformOrigin,
                    }}
                  />

                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(17,24,39,0.35)] pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label="เลื่อนเพื่อเปรียบเทียบก่อนและหลังปรับแต่ง"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(sliderPos)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          setSliderPos((p) => Math.max(0, p - 4));
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          setSliderPos((p) => Math.min(100, p + 4));
                        }
                      }}
                      className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1B314D] text-white border-2 border-white shadow-md flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B314D]"
                    >
                      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="pointer-events-none absolute top-4 left-4 px-2.5 py-1 rounded bg-black/65 text-white text-xs font-medium">
                    ก่อน · {beforeLabel}
                  </div>
                  <div className="pointer-events-none absolute top-4 right-4 px-2.5 py-1 rounded bg-[#1B314D]/85 text-white text-xs font-medium">
                    หลัง · {placementMeta.label}
                  </div>
                </>
              )}

              {viewMode === 'mockup' && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={() => setPeekingBefore(true)}
                    onPointerUp={() => setPeekingBefore(false)}
                    onPointerLeave={() => setPeekingBefore(false)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setPeekingBefore(true);
                    }}
                    onKeyUp={() => setPeekingBefore(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-black/70 hover:bg-black/85 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    {peekingBefore ? 'กำลังดูเสื้อเปล่า' : 'กดค้างดูเสื้อเปล่า'}
                  </button>

                  <div className="inline-flex items-center bg-white/95 border border-zinc-200 rounded-lg overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot(null);
                        setManualZoom((z) => Math.max(1, Number((z - 0.5).toFixed(2))));
                      }}
                      aria-label="ซูมออก"
                      className="p-2 text-[#111827] hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-mono tabular-nums text-[#111827]">
                      {Math.round(effectiveZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotspot(null);
                        setManualZoom((z) => Math.min(3.5, Number((z + 0.5).toFixed(2))));
                      }}
                      aria-label="ซูมเข้า"
                      className="p-2 text-[#111827] hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {effectiveZoom > 1 && (
                    <button
                      type="button"
                      onClick={handleResetView}
                      aria-label="รีเซ็ตมุมมอง"
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-lg bg-white/95 hover:bg-white text-[#111827] border border-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      เต็มเฟรม
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Logo Variant Gallery Strip (7 Options: 2 Original + 5 New Designs) */}
          <div className="px-4 sm:px-6 py-4 border-t border-zinc-200/80 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="text-xs font-semibold text-[#111827]">
                เลือกแบบโลโก้ทางเลือก (7 แบบ · ออกแบบใหม่ 5 แบบ)
              </div>
              <div className="text-xs text-[#525B63] truncate">
                กำลังใช้:{' '}
                <span className="font-medium text-[#1B314D]">
                  {activeVariantMeta.title}
                </span>{' '}
                — {activeVariantMeta.subtitle}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {LOGO_VARIANT_CATALOG.map((item) => {
                const selected = config.logoVariant === item.id;
                const thumb = variantThumbs[item.id];
                const isNewDesign = item.badgeNumber >= 3;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeConfig({ ...config, logoVariant: item.id })
                    }
                    title={`${item.title} — ${item.subtitle}`}
                    className={`group flex flex-col items-center p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#1B314D] bg-[#F4F7FA] ring-1 ring-[#1B314D]'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <div className="relative w-full aspect-square max-h-[82px] rounded-lg bg-[#EEF2F3] border border-zinc-200/70 flex items-center justify-center p-1.5 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                      <span
                        className={`absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold leading-none rounded ${
                          selected
                            ? 'bg-[#1B314D] text-white'
                            : 'bg-white/90 text-[#374151] border border-zinc-200/80'
                        }`}
                      >
                        {item.badgeNumber}
                      </span>
                      {isNewDesign && (
                        <span className="absolute top-1 right-1 px-1 py-0.5 text-[9px] font-semibold leading-none rounded bg-[#C81E2B] text-white">
                          ใหม่
                        </span>
                      )}
                    </div>
                    <div className="mt-2 w-full text-[11px] font-semibold text-[#111827] truncate">
                      {item.shortTitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Interactive Customizer Controls */}
          <div className="border-t border-zinc-200/80 bg-[#FAFBFB]">
            <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-zinc-200/70 flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="หมวดปรับแต่งเสื้อและโลโก้"
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EAEFEF] rounded-lg"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={controlTab === 'position'}
                  onClick={() => setControlTab('position')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    controlTab === 'position'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  ตำแหน่งและขนาด
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={controlTab === 'shirt'}
                  onClick={() => setControlTab('shirt')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    controlTab === 'shirt'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" aria-hidden="true" />
                  เฉดสีเสื้อและปก
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={controlTab === 'logo-color'}
                  onClick={() => setControlTab('logo-color')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    controlTab === 'logo-color'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  สีโลโก้แยกส่วน
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="#logo-detail"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B314D] hover:underline underline-offset-2 whitespace-nowrap"
                >
                  <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                  ดูการ์ดรายละเอียดโลโก้
                </a>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...DEFAULT_POLO_CONFIG,
                      logoVariant: config.logoVariant,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#525B63] hover:text-[#111827] bg-white border border-zinc-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  คืนค่าเริ่มต้น
                </button>
              </div>
            </div>

            {/* Tab Panel Content */}
            <div className="px-4 sm:px-6 py-5">
              {controlTab === 'position' && (
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#525B63] mr-1">
                        ตำแหน่งโลโก้:
                      </span>
                      {PLACEMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectPlacement(opt.id)}
                          title={opt.shortDesc}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            config.placement === opt.id
                              ? 'bg-[#1B314D] text-white'
                              : 'bg-white text-[#2D3640] border border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {isOriginalGable && (
                      <div className="inline-flex items-center gap-1 p-1 bg-[#EAEFEF] rounded-lg shrink-0 self-start md:self-auto">
                        {(
                          [
                            { id: 'embroidery', label: 'ปักลงผ้า' },
                            { id: 'navy-patch', label: 'อาร์มพื้นสีเข้ม' },
                          ] as Array<{ id: LogoStyle; label: string }>
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onChangeConfig({ ...config, style: opt.id })
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                              config.style === opt.id
                                ? 'bg-white text-[#111827] shadow-xs'
                                : 'text-[#525B63] hover:text-[#111827]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 ${
                      isOriginalGable ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                    } gap-5 pt-1`}
                  >
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <label htmlFor="logo-width-cm" className="text-[#525B63]">
                          ขนาดโลโก้
                        </label>
                        <span className="font-mono tabular-nums text-[#111827]">
                          {config.widthCm.toFixed(1)} ซม.
                        </span>
                      </div>
                      <input
                        id="logo-width-cm"
                        type="range"
                        min={2.5}
                        max={10.5}
                        step={0.1}
                        value={config.widthCm}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            widthCm: Number(e.target.value),
                          })
                        }
                        className="w-full studio-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <label htmlFor="logo-gap-cm" className="text-[#525B63]">
                          {isSleevePlacement ? 'เหนือแถบแขน' : 'เลื่อนขึ้น–ลง'}
                        </label>
                        <span className="font-mono tabular-nums text-[#111827]">
                          {config.gapAboveBandCm.toFixed(1)} ซม.
                        </span>
                      </div>
                      <input
                        id="logo-gap-cm"
                        type="range"
                        min={0.3}
                        max={2.8}
                        step={0.1}
                        value={config.gapAboveBandCm}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            gapAboveBandCm: Number(e.target.value),
                          })
                        }
                        className="w-full studio-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <label htmlFor="logo-shift" className="text-[#525B63]">
                          เลื่อนซ้าย–ขวา
                        </label>
                        <span className="font-mono tabular-nums text-[#111827]">
                          {Math.round(config.horizontalShift * 100)}%
                        </span>
                      </div>
                      <input
                        id="logo-shift"
                        type="range"
                        min={-0.25}
                        max={0.25}
                        step={0.01}
                        value={config.horizontalShift}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            horizontalShift: Number(e.target.value),
                          })
                        }
                        className="w-full studio-slider"
                      />
                    </div>

                    {isOriginalGable && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <label htmlFor="roof-thickness" className="text-[#525B63]">
                            ความหนาเส้นจั่ว
                          </label>
                          <span className="font-mono tabular-nums text-[#111827]">
                            {config.roofThickness.toFixed(1)}×
                          </span>
                        </div>
                        <input
                          id="roof-thickness"
                          type="range"
                          min={1.0}
                          max={3.0}
                          step={0.1}
                          value={config.roofThickness}
                          onChange={(e) =>
                            onChangeConfig({
                              ...config,
                              roofThickness: Number(e.target.value),
                            })
                          }
                          className="w-full studio-slider"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {controlTab === 'shirt' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111827]">
                        เฉดสีตัวเสื้อโปโล
                      </span>
                      <span className="font-mono uppercase tabular-nums text-[#525B63]">
                        {config.shirtColor}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {SHIRT_COLOR_PRESETS.map((preset) => {
                        const selected =
                          config.shirtColor.toUpperCase() ===
                          preset.hex.toUpperCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => handleSelectShirtColor(preset.hex)}
                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#1B314D] bg-white text-[#111827] ring-1 ring-[#1B314D]'
                                : 'border-zinc-200 bg-white text-[#374151] hover:border-zinc-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                              style={{ backgroundColor: preset.hex }}
                              aria-hidden="true"
                            />
                            {preset.name}
                          </button>
                        );
                      })}
                      <label className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-200 bg-white text-[#374151] hover:border-zinc-300 cursor-pointer">
                        <input
                          type="color"
                          value={config.shirtColor}
                          onChange={(e) => handleSelectShirtColor(e.target.value)}
                          className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                          aria-label="เลือกเฉดสีตัวเสื้อแบบกำหนดเอง"
                        />
                        กำหนดเอง
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111827]">
                        สีปกคอและแถบปลายแขน
                      </span>
                      <span className="font-mono uppercase tabular-nums text-[#525B63]">
                        {config.collarColor}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLLAR_COLOR_PRESETS.map((preset) => {
                        const selected =
                          config.collarColor.toUpperCase() ===
                          preset.hex.toUpperCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() =>
                              onChangeConfig({ ...config, collarColor: preset.hex })
                            }
                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#1B314D] bg-white text-[#111827] ring-1 ring-[#1B314D]'
                                : 'border-zinc-200 bg-white text-[#374151] hover:border-zinc-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                              style={{ backgroundColor: preset.hex }}
                              aria-hidden="true"
                            />
                            {preset.name}
                          </button>
                        );
                      })}
                      <label className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-200 bg-white text-[#374151] hover:border-zinc-300 cursor-pointer">
                        <input
                          type="color"
                          value={config.collarColor}
                          onChange={(e) =>
                            onChangeConfig({
                              ...config,
                              collarColor: e.target.value,
                            })
                          }
                          className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                          aria-label="เลือกสีปกคอและแถบแขนแบบกำหนดเอง"
                        />
                        กำหนดเอง
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {controlTab === 'logo-color' &&
                (!isOriginalGable ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {(
                      [
                        {
                          key: 'hexNumberColor',
                          label: `1. ${activeVariantMeta.colorLabels.number}`,
                          value: config.hexNumberColor,
                        },
                        {
                          key: 'hexPlumbColor',
                          label: `2. ${activeVariantMeta.colorLabels.plumb}`,
                          value: config.hexPlumbColor,
                        },
                        {
                          key: 'hexAccentColor',
                          label: `3. ${activeVariantMeta.colorLabels.accent}`,
                          value: config.hexAccentColor,
                        },
                        {
                          key: 'hexFrameColor',
                          label: `4. ${activeVariantMeta.colorLabels.frame}`,
                          value: config.hexFrameColor,
                        },
                      ] as const
                    ).map((part) => (
                      <div key={part.key} className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#111827]">
                            {part.label}
                          </span>
                          <span className="font-mono uppercase tabular-nums text-[#525B63]">
                            {part.value}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {LOGO_COLOR_PRESETS.map((preset) => (
                            <button
                              key={`${part.key}-${preset.hex}`}
                              type="button"
                              onClick={() =>
                                onChangeConfig({
                                  ...config,
                                  [part.key]: preset.hex,
                                })
                              }
                              title={preset.name}
                              aria-label={`${part.label} ${preset.name}`}
                              className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                                part.value.toUpperCase() ===
                                preset.hex.toUpperCase()
                                  ? 'border-[#1B314D] ring-2 ring-[#1B314D]/40 scale-105'
                                  : 'border-black/15 hover:scale-105'
                              }`}
                              style={{ backgroundColor: preset.hex }}
                            />
                          ))}
                          <label className="inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded-md border border-zinc-200 bg-white text-[#374151] cursor-pointer">
                            <input
                              type="color"
                              value={part.value}
                              onChange={(e) =>
                                onChangeConfig({
                                  ...config,
                                  [part.key]: e.target.value,
                                })
                              }
                              className="w-3.5 h-3.5 p-0 border-0 bg-transparent cursor-pointer"
                              aria-label={`เลือก${part.label}เอง`}
                            />
                            สีอื่น
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(
                      [
                        {
                          key: 'roofColor',
                          label: '1. สีเส้นจั่วด้านบน',
                          value: config.roofColor,
                        },
                        {
                          key: 'numberColor',
                          label: '2. สีเลข 62 และขีดข้าง',
                          value: config.numberColor,
                        },
                        {
                          key: 'textColor',
                          label: '3. สีข้อความ (ราชสิทธาราม)',
                          value: config.textColor,
                        },
                      ] as const
                    ).map((part) => (
                      <div key={part.key} className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#111827]">
                            {part.label}
                          </span>
                          <span className="font-mono uppercase tabular-nums text-[#525B63]">
                            {part.value}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {LOGO_COLOR_PRESETS.map((preset) => (
                            <button
                              key={`${part.key}-${preset.hex}`}
                              type="button"
                              onClick={() =>
                                onChangeConfig({
                                  ...config,
                                  [part.key]: preset.hex,
                                })
                              }
                              title={preset.name}
                              aria-label={`${part.label} ${preset.name}`}
                              className={`w-7 h-7 rounded-md border transition-transform cursor-pointer ${
                                part.value.toUpperCase() ===
                                preset.hex.toUpperCase()
                                  ? 'border-[#1B314D] ring-2 ring-[#1B314D]/40 scale-105'
                                  : 'border-black/15 hover:scale-105'
                              }`}
                              style={{ backgroundColor: preset.hex }}
                            />
                          ))}
                          <label className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded-md border border-zinc-200 bg-white text-[#374151] cursor-pointer">
                            <input
                              type="color"
                              value={part.value}
                              onChange={(e) =>
                                onChangeConfig({
                                  ...config,
                                  [part.key]: e.target.value,
                                })
                              }
                              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                              aria-label={`เลือก${part.label}เอง`}
                            />
                            เลือกสี
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Bottom Utility Bar: Zoom Inspector + Quick Download */}
          <div className="px-4 sm:px-6 py-4 border-t border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#525B63] mr-1">
                ซูมตรวจม็อกอัพ:
              </span>
              {SLEEVE_HOTSPOTS.map((spot) => {
                const isActive =
                  activeHotspot?.id === spot.id && viewMode !== '3d';
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handleSelectHotspot(spot)}
                    title={spot.detail}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#1B314D] text-white'
                        : 'bg-[#F1F4F4] text-[#2D3640] hover:bg-[#E4EAEA]'
                    }`}
                  >
                    {spot.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onDownloadFull}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1B314D] hover:bg-[#14253B] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {isDownloading ? 'กำลังบันทึก...' : 'ดาวน์โหลดภาพม็อกอัพ (PNG)'}
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="มุมมองภาพเต็มหน้าจอ"
          className="fixed inset-0 z-50 bg-[#0B0F14]/95 flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 gap-3">
            <div className="text-sm text-white/90 font-medium truncate">
              {isSideBySide
                ? `เทียบก่อน–หลังแบบเคียงข้าง · ${placementMeta.label}`
                : lightboxShowBefore
                  ? beforeLabel
                  : `ภาพม็อกอัพเสื้อโปโล · ${placementMeta.label}`}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!isSideBySide && (
                <button
                  type="button"
                  onClick={() => setLightboxShowBefore((prev) => !prev)}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {lightboxShowBefore ? 'สลับดูแบบที่แต่งแล้ว' : 'สลับดูเสื้อเปล่า'}
                </button>
              )}
              <button
                type="button"
                onClick={onDownloadFull}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0B0F14] bg-white hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                ดาวน์โหลด PNG
              </button>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="ปิดมุมมองเต็มจอ"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxOpen(false);
            }}
          >
            {isSideBySide ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full max-w-[1440px]">
                <figure className="space-y-2">
                  <figcaption className="text-xs text-white/75 font-medium">
                    ก่อน ({beforeLabel})
                  </figcaption>
                  <div
                    className="rounded-lg overflow-hidden shadow-2xl"
                    style={
                      compareBase === 'blank' && config.backdrop === 'transparent'
                        ? checkerBackdropStyle
                        : undefined
                    }
                  >
                    <img
                      src={beforeImageUrl}
                      alt={beforeLabel}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block"
                    />
                  </div>
                </figure>
                <figure className="space-y-2">
                  <figcaption className="text-xs text-white font-medium">
                    หลัง · {activeVariantMeta.shortTitle} ({placementMeta.label})
                  </figcaption>
                  <div
                    className="rounded-lg overflow-hidden shadow-2xl"
                    style={
                      config.backdrop === 'transparent'
                        ? checkerBackdropStyle
                        : undefined
                    }
                  >
                    <img
                      src={resultImageUrl}
                      alt="ภาพม็อกอัพเสื้อโปโลที่ปรับแต่งแล้ว"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block"
                    />
                  </div>
                </figure>
              </div>
            ) : (
              <div
                className="max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl flex items-center justify-center"
                style={
                  config.backdrop === 'transparent'
                    ? checkerBackdropStyle
                    : undefined
                }
              >
                <img
                  src={lightboxShowBefore ? beforeImageUrl : resultImageUrl}
                  alt="มุมมองขนาดเต็มของภาพม็อกอัพเสื้อโปโล"
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[82vh] object-contain block"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
