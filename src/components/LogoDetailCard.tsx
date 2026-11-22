import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ALL_LOGO_VARIANTS,
  buildCustomizedLogoCanvas,
  downloadStandaloneLogoPng,
  getColorLuminance,
  getEffectiveSvgPaletteSwatches,
  getLogoVariantMeta,
  isRatchasitSvgLogo,
  PLACEMENT_OPTIONS,
  type PoloDesignConfig,
  type RatchasitSvgLogoId,
} from '../utils/sleeveLogoComposer';

type PreviewBackdrop = 'shirt' | 'checker' | 'dark';

interface LogoDetailCardProps {
  config: PoloDesignConfig;
  onChangeConfig: (next: PoloDesignConfig) => void;
  onNotify: (message: string) => void;
}

export const LogoDetailCard: React.FC<LogoDetailCardProps> = ({
  config,
  onChangeConfig,
  onNotify,
}) => {
  const [backdrop, setBackdrop] = useState<PreviewBackdrop>('shirt');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoAspect, setLogoAspect] = useState<number>(1.0);
  const [logoPxSize, setLogoPxSize] = useState<{ w: number; h: number }>({
    w: 650,
    h: 680,
  });
  const [downloadingType, setDownloadingType] = useState<
    'embroidery' | 'navy-patch' | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    buildCustomizedLogoCanvas(config, config.logoVariant, config.style, {
      useReferenceDarkForThumb: backdrop === 'dark',
    })
      .then((canvas) => {
        if (cancelled) return;
        setLogoUrl(canvas.toDataURL('image/png'));
        setLogoAspect(canvas.height / Math.max(1, canvas.width));
        setLogoPxSize({ w: canvas.width, h: canvas.height });
      })
      .catch(() => {
        // Handled silently
      });
    return () => {
      cancelled = true;
    };
  }, [
    config.logoVariant,
    config.shirtColor,
    config.autoContrastLogo,
    backdrop,
    config.roofColor,
    config.numberColor,
    config.textColor,
    config.patchBgColor,
    config.roofThickness,
    config.style,
    config.hexNumberColor,
    config.hexPlumbColor,
    config.hexAccentColor,
    config.hexFrameColor,
  ]);

  const placementMeta =
    PLACEMENT_OPTIONS.find((p) => p.id === config.placement) ??
    PLACEMENT_OPTIONS[0];
  const heightCm = config.widthCm * logoAspect;
  const isLightShirt = getColorLuminance(config.shirtColor) > 165;
  const isOriginalGable = config.logoVariant === 'gable-62';
  const variantMeta = getLogoVariantMeta(config.logoVariant);

  const colorSpecs = isRatchasitSvgLogo(config.logoVariant)
    ? getEffectiveSvgPaletteSwatches(
        config.logoVariant as RatchasitSvgLogoId,
        backdrop === 'dark' ? undefined : config.shirtColor,
        backdrop === 'dark' ? false : config.autoContrastLogo
      ).map((s) => ({ label: s.label, hex: s.hex }))
    : !isOriginalGable
      ? [
          { label: variantMeta.colorLabels.number, hex: config.hexNumberColor },
          { label: variantMeta.colorLabels.plumb, hex: config.hexPlumbColor },
          { label: variantMeta.colorLabels.accent, hex: config.hexAccentColor },
          { label: variantMeta.colorLabels.frame, hex: config.hexFrameColor },
        ]
      : [
          { label: 'เส้นจั่วด้านบน', hex: config.roofColor },
          { label: 'เลข 62 และขีดข้าง', hex: config.numberColor },
          { label: 'ข้อความภาษาไทย', hex: config.textColor },
          {
            label: 'สีตัวเสื้อ / ปก-แขน',
            hex: config.shirtColor,
            secondaryHex: config.collarColor,
          },
        ];

  const handleDownload = async (type: 'embroidery' | 'navy-patch') => {
    setDownloadingType(type);
    try {
      const { width, height } = await downloadStandaloneLogoPng(config, type);
      onNotify(
        `ดาวน์โหลดไฟล์โลโก้ (${width} × ${height} px · PNG) เรียบร้อยแล้ว`
      );
    } catch {
      onNotify('ไม่สามารถสร้างไฟล์โลโก้ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <section id="logo-detail" className="py-14 md:py-16 border-t border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111827]"
              style={{ textWrap: 'balance' }}
            >
              รายละเอียดโลโก้ (Logo Detail)
            </h2>
            <p className="mt-1.5 text-sm text-[#525B63]">
              ตรวจสอบความคมชัด สัดส่วนจริง และค่าสีทุกองค์ประกอบก่อนส่งปักหรือสกรีน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 bg-[#EAEFEF] rounded-lg">
              {(
                [
                  { id: 'shirt', label: 'สีเสื้อจริง' },
                  { id: 'checker', label: 'พื้นโปร่งใส' },
                  { id: 'dark', label: 'พื้นเข้ม' },
                ] as Array<{ id: PreviewBackdrop; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBackdrop(opt.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    backdrop === opt.id
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Logo Switcher Strip */}
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {ALL_LOGO_VARIANTS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                onChangeConfig({
                  ...config,
                  logoVariant: opt.id,
                  widthCm: opt.defaultWidthCm ?? config.widthCm,
                })
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                config.logoVariant === opt.id
                  ? 'bg-[#1B314D] text-white border-[#1B314D]'
                  : 'bg-white text-[#374151] border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {opt.isRatchasitSvg ? 'SVG · ' : `${opt.badgeNumber}. `}
              {opt.shortTitle}
            </button>
          ))}
        </div>

        {/* Single-Elevation Detail Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left: High-Res Magnified Logo Stage */}
          <div
            className="lg:col-span-6 relative min-h-[300px] sm:min-h-[360px] flex items-center justify-center p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-zinc-200/80"
            style={
              backdrop === 'shirt'
                ? {
                    backgroundColor: config.shirtColor,
                    backgroundImage:
                      'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
                    backgroundSize: '5px 5px',
                  }
                : backdrop === 'checker'
                  ? {
                      backgroundColor: '#F3F4F6',
                      backgroundImage:
                        'linear-gradient(45deg, #E2E6E9 25%, transparent 25%), linear-gradient(-45deg, #E2E6E9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E2E6E9 75%), linear-gradient(-45deg, transparent 75%, #E2E6E9 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    }
                  : { backgroundColor: '#16202E' }
            }
          >
            {logoUrl ? (
              <div className="relative flex flex-col items-center">
                <img
                  src={logoUrl}
                  alt="ภาพขยายรายละเอียดโลโก้ 62 ราชสิทธาราม ช่างก่อสร้าง"
                  referrerPolicy="no-referrer"
                  className="max-w-[290px] sm:max-w-[330px] max-h-[250px] w-auto h-auto object-contain select-none"
                />

                <div
                  className={`mt-5 flex items-center gap-3 text-xs font-mono tabular-nums ${
                    backdrop === 'dark' ||
                    (backdrop === 'shirt' && !isLightShirt)
                      ? 'text-white/80'
                      : 'text-[#374151]'
                  }`}
                >
                  <span>กว้าง {config.widthCm.toFixed(1)} ซม.</span>
                  <span aria-hidden="true">×</span>
                  <span>สูง {heightCm.toFixed(1)} ซม.</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {logoPxSize.w}×{logoPxSize.h} px
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#525B63]">กำลังประมวลผลโลโก้...</span>
            )}
          </div>

          {/* Right: Structured Spec Breakdown & Export */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#111827]">
                  {variantMeta.title}
                </h3>
                <p className="mt-1 text-xs text-[#525B63]">
                  รูปแบบ:{' '}
                  <span className="text-[#111827] font-medium">
                    {isOriginalGable
                      ? config.style === 'embroidery'
                        ? 'ปัก / สกรีนลงเนื้อผ้าโดยตรง (พื้นโปร่งใส)'
                        : 'อาร์มทอพื้นสีเข้มขอบมน'
                      : variantMeta.detailDesc}
                  </span>
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 border-y border-zinc-100 text-xs">
                <div>
                  <dt className="text-[#525B63]">ตำแหน่งบนตัวเสื้อ</dt>
                  <dd className="mt-1 font-medium text-[#111827]">
                    {placementMeta.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#525B63]">
                    {config.placement === 'left-sleeve' ||
                    config.placement === 'right-sleeve' ||
                    config.placement === 'chest-and-left-sleeve'
                      ? 'ระยะห่างเหนือแถบแขน'
                      : 'ระยะปรับขึ้น–ลง'}
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-medium text-[#111827]">
                    {config.gapAboveBandCm.toFixed(1)} ซม.
                  </dd>
                </div>
                <div>
                  <dt className="text-[#525B63]">ขนาดวางจริงโดยประมาณ</dt>
                  <dd className="mt-1 font-mono tabular-nums font-medium text-[#111827]">
                    {config.widthCm.toFixed(1)} × {heightCm.toFixed(1)} ซม.
                  </dd>
                </div>
                <div>
                  <dt className="text-[#525B63]">
                    {isOriginalGable ? 'ความหนาเส้นจั่ว' : 'สีตัวเสื้อ / ปก-แขน'}
                  </dt>
                  <dd className="mt-1 font-mono tabular-nums font-medium text-[#111827]">
                    {isOriginalGable
                      ? `${config.roofThickness.toFixed(1)}× (จากเส้นเดิม)`
                      : `${config.shirtColor.toUpperCase()} / ${config.collarColor.toUpperCase()}`}
                  </dd>
                </div>
              </dl>

              {/* Color Swatch Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#111827]">
                  รหัสสีองค์ประกอบโลโก้
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {colorSpecs.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[#F7F9F9] border border-zinc-200/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                          style={{ backgroundColor: item.hex }}
                          aria-hidden="true"
                        />
                        {'secondaryHex' in item && item.secondaryHex && (
                          <span
                            className="w-4 h-4 rounded-sm border border-black/15 shrink-0 -ml-1"
                            style={{ backgroundColor: item.secondaryHex }}
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-[#374151] truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] uppercase tabular-nums text-[#525B63] shrink-0">
                        {item.hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Standalone Logo Downloads */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleDownload('embroidery')}
                disabled={downloadingType !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#1B314D] hover:bg-[#14253B] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {downloadingType === 'embroidery'
                  ? 'กำลังบันทึก...'
                  : `ดาวน์โหลด${variantMeta.shortTitle}พื้นโปร่งใส (PNG)`}
              </button>

              {isOriginalGable && (
                <button
                  type="button"
                  onClick={() => handleDownload('navy-patch')}
                  disabled={downloadingType !== null}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#111827] bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  {downloadingType === 'navy-patch'
                    ? 'กำลังบันทึก...'
                    : 'ดาวน์โหลดแบบอาร์ม (PNG)'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
