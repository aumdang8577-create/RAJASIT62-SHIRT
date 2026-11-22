import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { CompareStage } from './components/CompareStage';
import { LogoDetailCard } from './components/LogoDetailCard';
import { AngleCropsGrid } from './components/AngleCropsGrid';
import { RetouchStudio } from './components/RetouchStudio';
import { CLEANED_IMAGE_URL } from './constants/assets';
import { exportImageRegion } from './utils/canvasExport';
import {
  composePoloMockup,
  DEFAULT_POLO_CONFIG,
  type PoloDesignConfig,
} from './utils/sleeveLogoComposer';

export default function App() {
  const [config, setConfig] = useState<PoloDesignConfig>(DEFAULT_POLO_CONFIG);
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
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#F6F7F7]/95 border-b border-zinc-200/80">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#compare"
            className="font-display text-lg font-semibold tracking-tight text-[#111827] whitespace-nowrap shrink-0"
          >
            CleanMockup
          </a>

          {/* Zone 2: Concise Single-Line Nav Links */}
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

          {/* Zone 3: Single Primary Action */}
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

      {/* Main Content */}
      <main className="flex-1">
        <CompareStage
          resultImageUrl={resultImageUrl}
          isComposing={isComposing}
          config={config}
          onChangeConfig={setConfig}
          onDownloadFull={handleDownloadFullPng}
          isDownloading={isDownloading}
          onNotify={showToast}
        />
        <LogoDetailCard
          config={config}
          onChangeConfig={setConfig}
          onNotify={showToast}
        />
        <AngleCropsGrid sourceImageUrl={resultImageUrl} onNotify={showToast} />
        <RetouchStudio defaultImageUrl={resultImageUrl} onNotify={showToast} />
      </main>

      {/* Quiet Studio Footer */}
      <footer className="border-t border-zinc-200/80 py-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#525B63]">
          <p>CleanMockup — สตูดิโอออกแบบเสื้อโปโล 3D และรายละเอียดโลโก้</p>
          <a
            href="#compare"
            className="hover:text-[#111827] transition-colors whitespace-nowrap"
          >
            กลับด้านบน
          </a>
        </div>
      </footer>

      {/* Accessible Action Toast */}
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
