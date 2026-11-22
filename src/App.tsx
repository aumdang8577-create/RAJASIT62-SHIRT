import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { CompareStage } from './components/CompareStage';
import { LogoDetailCard } from './components/LogoDetailCard';
import { AngleCropsGrid } from './components/AngleCropsGrid';
import { RetouchStudio } from './components/RetouchStudio';
import type { CameraPresetId } from './components/Polo3DViewer';
import { CLEANED_IMAGE_URL } from './constants/assets';
import { exportImageRegion } from './utils/canvasExport';
import {
  applyAutoContrastForShirt,
  composePoloMockup,
  DEFAULT_POLO_CONFIG,
  GARMENT_COLORWAY_PRESETS,
  getLogoVariantMeta,
  isRatchasitSvgLogo,
  type FabricType,
  type GarmentStyle,
  type LogoPlacement,
  type LogoVariant,
  type PoloDesignConfig,
} from './utils/sleeveLogoComposer';

function parseInitialStateFromQuery(): {
  config: PoloDesignConfig;
  studioOpen: boolean;
  cameraPreset: CameraPresetId;
} {
  let cfg: PoloDesignConfig = { ...DEFAULT_POLO_CONFIG };
  let studioOpen = false;
  let cameraPreset: CameraPresetId = 'hero';

  if (typeof window === 'undefined') {
    return { config: cfg, studioOpen, cameraPreset };
  }

  const params = new URLSearchParams(window.location.search);

  const colorwayId = params.get('colorway');
  if (colorwayId) {
    const preset = GARMENT_COLORWAY_PRESETS.find((c) => c.id === colorwayId);
    if (preset) {
      cfg = {
        ...cfg,
        garmentStyle: preset.garmentStyle,
        fabricType: preset.fabricType,
        shirtColor: preset.shirtColor,
        collarColor: preset.collarColor,
        cuffColor: preset.cuffColor,
        tippingStyle: preset.tippingStyle,
        tippingColor: preset.tippingColor,
        placketColor: preset.placketColor,
        buttonColor: preset.buttonColor,
      };
    }
  }

  const garment = params.get('garment');
  if (garment === 'polo' || garment === 'stand-collar') {
    cfg.garmentStyle = garment as GarmentStyle;
  }

  const fabric = params.get('fabric');
  if (
    fabric === 'cotton-pique' ||
    fabric === 'heavy-twill' ||
    fabric === 'dry-fit'
  ) {
    cfg.fabricType = fabric as FabricType;
  }

  const chest = params.get('chest');
  if (chest && (chest === 'none' || isRatchasitSvgLogo(chest))) {
    cfg.chestLogoVariant = chest as LogoVariant | 'none';
  }

  const sleeve = params.get('sleeve');
  if (sleeve && (sleeve === 'none' || isRatchasitSvgLogo(sleeve))) {
    cfg.sleeveLogoVariant = sleeve as LogoVariant | 'none';
  }

  const logoParam = params.get('logo');
  if (logoParam) {
    const meta = getLogoVariantMeta(logoParam as LogoVariant);
    if (meta.id === logoParam) {
      cfg.logoVariant = meta.id;
      if (meta.defaultWidthCm) cfg.widthCm = meta.defaultWidthCm;
      if (meta.isRatchasitSvg) {
        cfg.placement = meta.category === 'chest' ? 'left-chest' : 'left-sleeve';
      }
    }
  }

  const placementParam = params.get('placement');
  if (
    placementParam === 'left-sleeve' ||
    placementParam === 'right-sleeve' ||
    placementParam === 'left-chest' ||
    placementParam === 'right-chest' ||
    placementParam === 'center-back' ||
    placementParam === 'chest-and-left-sleeve'
  ) {
    cfg.placement = placementParam as LogoPlacement;
  }

  if (params.get('dual') === '1') {
    cfg.placement = 'chest-and-left-sleeve';
    if (!logoParam && cfg.chestLogoVariant !== 'none') {
      cfg.logoVariant = cfg.chestLogoVariant;
      cfg.widthCm = cfg.chestWidthCm;
    }
  }

  if (params.get('panel') === 'open') {
    studioOpen = true;
  }

  const cam = params.get('camera');
  if (
    cam === 'hero' ||
    cam === 'front' ||
    cam === 'left-sleeve' ||
    cam === 'left-chest' ||
    cam === 'back' ||
    cam === 'right-sleeve'
  ) {
    cameraPreset = cam;
  }

  return { config: applyAutoContrastForShirt(cfg), studioOpen, cameraPreset };
}

export default function App() {
  const [initialState] = useState(parseInitialStateFromQuery);
  const [config, setConfig] = useState<PoloDesignConfig>(initialState.config);
  const [resultImageUrl, setResultImageUrl] = useState<string>(CLEANED_IMAGE_URL);
  const [isComposing, setIsComposing] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsComposing(true);

    composePoloMockup(config)
      .then((url) => {
        if (!cancelled) {
          setResultImageUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResultImageUrl(CLEANED_IMAGE_URL);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsComposing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  const handleDownloadFullPng = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { width, height } = await exportImageRegion({
        src: resultImageUrl,
        filename: `polo-mockup-${config.logoVariant}-${config.placement}.png`,
        format: 'image/png',
      });
      showToast(
        `ดาวน์โหลด polo-mockup-${config.logoVariant}-${config.placement}.png (${width} × ${height} px) เรียบร้อยแล้ว`
      );
    } catch {
      showToast('ไม่สามารถสร้างไฟล์ดาวน์โหลดได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  }, [resultImageUrl, config.logoVariant, config.placement, showToast]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F7] text-[#111827]">
      {/* Strict 3-Zone Top Bar (Opaque Header — zero scroll bleed) */}
      <header className="sticky top-0 z-30 bg-[#F6F7F7] border-b border-zinc-200/80 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#compare"
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#111827] whitespace-nowrap shrink-0"
          >
            62RAJASIT CONSTRUCTION
          </a>

          <nav
            aria-label="นำทางหลัก"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#525B63]"
          >
            <a
              href="#compare"
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0"
            >
              สตูดิโอเสื้อ
            </a>
            <a
              href="#logo-detail"
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0"
            >
              รายละเอียดโลโก้
            </a>
            <a
              href="#crops"
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0"
            >
              มุมแยกเสื้อ
            </a>
            <a
              href="#retouch"
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0"
            >
              ปรับแต่งภาพ
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleDownloadFullPng}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1B314D] hover:bg-[#14253B] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {isDownloading ? 'กำลังบันทึก...' : 'ดาวน์โหลด PNG'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <CompareStage
          resultImageUrl={resultImageUrl}
          isComposing={isComposing}
          config={config}
          onChangeConfig={setConfig}
          onDownloadFull={handleDownloadFullPng}
          isDownloading={isDownloading}
          onNotify={showToast}
          initialStudioOpen={initialState.studioOpen}
          initialCameraPreset={initialState.cameraPreset}
        />
        <LogoDetailCard
          config={config}
          onChangeConfig={setConfig}
          onNotify={showToast}
        />
        <AngleCropsGrid sourceImageUrl={resultImageUrl} onNotify={showToast} />
        <RetouchStudio defaultImageUrl={resultImageUrl} onNotify={showToast} />
      </main>

      <footer className="border-t border-zinc-200/80 py-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#525B63]">
          <p>62RAJASIT CONSTRUCTION — สตูดิโอออกแบบเสื้อโปโล / เสื้อคอตั้ง 3D และโลโก้รุ่น 62</p>
          <a
            href="#compare"
            className="hover:text-[#111827] transition-colors whitespace-nowrap"
          >
            กลับด้านบน
          </a>
        </div>
      </footer>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl bg-[#111827] text-white text-xs font-medium shadow-lg border border-white/10"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
