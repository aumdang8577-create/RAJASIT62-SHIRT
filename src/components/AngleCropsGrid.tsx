import React, { useEffect, useState } from 'react';
import { Download, Maximize2, X } from 'lucide-react';
import { ANGLE_CROPS, type AngleCropSpec } from '../constants/assets';
import { exportImageRegion, loadImage } from '../utils/canvasExport';

interface AngleCropsGridProps {
  sourceImageUrl: string;
  onNotify: (message: string) => void;
}

interface GeneratedCropPreview {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
}

export const AngleCropsGrid: React.FC<AngleCropsGridProps> = ({
  sourceImageUrl,
  onNotify,
}) => {
  const [previews, setPreviews] = useState<Record<string, GeneratedCropPreview>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<AngleCropSpec | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPreviews() {
      try {
        const img = await loadImage(sourceImageUrl);
        if (cancelled) return;

        const nextPreviews: Record<string, GeneratedCropPreview> = {};

        for (const spec of ANGLE_CROPS) {
          const sx = Math.round(spec.rect.x * img.naturalWidth);
          const sy = Math.round(spec.rect.y * img.naturalHeight);
          const sw = Math.max(1, Math.round(spec.rect.w * img.naturalWidth));
          const sh = Math.max(1, Math.round(spec.rect.h * img.naturalHeight));

          const canvas = document.createElement('canvas');
          const previewScale = Math.min(1, 900 / Math.max(sw, sh));
          canvas.width = Math.max(1, Math.round(sw * previewScale));
          canvas.height = Math.max(1, Math.round(sh * previewScale));

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          nextPreviews[spec.id] = {
            id: spec.id,
            dataUrl: canvas.toDataURL('image/jpeg', 0.92),
            width: sw,
            height: sh,
          };
        }

        if (!cancelled) {
          setPreviews(nextPreviews);
        }
      } catch {
        // Fallback handled gracefully in UI
      }
    }

    renderPreviews();
    return () => {
      cancelled = true;
    };
  }, [sourceImageUrl]);

  useEffect(() => {
    if (!activePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActivePreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePreview]);

  const handleDownloadCrop = async (spec: AngleCropSpec) => {
    setDownloadingId(spec.id);
    try {
      const { width, height } = await exportImageRegion({
        src: sourceImageUrl,
        filename: spec.filename,
        format: 'image/png',
        rect: spec.rect,
      });
      onNotify(`ดาวน์โหลด ${spec.filename} (${width} × ${height} px) เรียบร้อยแล้ว`);
    } catch {
      onNotify('เกิดข้อผิดพลาดระหว่างสร้างไฟล์ดาวน์โหลด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section id="crops" className="py-16 md:py-20 border-t border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10">
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111827]"
            style={{ textWrap: 'balance' }}
          >
            ดาวน์โหลดแยกตามมุมเสื้อ
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#525B63] leading-relaxed">
            ครอปแยกแต่ละมุมจากแบบเสื้อที่ติดโลโก้ปลายแขนซ้ายล่าสุด อัปเดตตามขนาดและระยะห่างที่คุณปรับไว้ด้านบนโดยอัตโนมัติ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ANGLE_CROPS.map((spec) => {
            const preview = previews[spec.id];
            const isBusy = downloadingId === spec.id;

            return (
              <article
                key={spec.id}
                className="group bg-white rounded-xl border border-zinc-200/80 overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => setActivePreview(spec)}
                  className="relative aspect-[4/4] w-full bg-[#B4C7C6] overflow-hidden text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1B314D]"
                  aria-label={`ดูตัวอย่าง ${spec.title}`}
                >
                  {preview ? (
                    <img
                      src={preview.dataUrl}
                      alt={spec.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-3 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#1B314D]/70">
                      กำลังเตรียมตัวอย่าง...
                    </div>
                  )}

                  <span className="absolute top-3 right-3 p-1.5 rounded-md bg-white/85 text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </button>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    {spec.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#525B63] leading-relaxed">
                    {spec.subtitle}
                  </p>

                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs text-[#525B63]">
                    <span className="font-mono tabular-nums truncate">
                      {preview ? `${preview.width}×${preview.height}` : spec.aspectLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadCrop(spec)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B314D] bg-[#EEF2F5] hover:bg-[#1B314D] hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      {isBusy ? 'กำลังบันทึก' : 'ดาวน์โหลด'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Crop Lightbox Preview */}
      {activePreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`ตัวอย่าง ${activePreview.title}`}
          className="fixed inset-0 z-50 bg-[#0B0F14]/92 flex items-center justify-center p-4 sm:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePreview(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#111827]">
                  {activePreview.title}
                </h3>
                <p className="text-xs text-[#525B63] mt-0.5">
                  {activePreview.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                aria-label="ปิดหน้าต่างตัวอย่าง"
                className="p-2 text-[#525B63] hover:text-[#111827] hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#B4C7C6] p-6 flex items-center justify-center max-h-[65vh]">
              {previews[activePreview.id] && (
                <img
                  src={previews[activePreview.id].dataUrl}
                  alt={activePreview.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[55vh] w-auto object-contain rounded"
                />
              )}
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 flex items-center justify-between gap-4">
              <span className="text-xs font-mono tabular-nums text-[#525B63]">
                {previews[activePreview.id]
                  ? `${previews[activePreview.id].width} × ${previews[activePreview.id].height} px · PNG`
                  : 'PNG'}
              </span>
              <button
                type="button"
                onClick={() => handleDownloadCrop(activePreview)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1B314D] hover:bg-[#14253B] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                ดาวน์โหลดมุมนี้ (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
