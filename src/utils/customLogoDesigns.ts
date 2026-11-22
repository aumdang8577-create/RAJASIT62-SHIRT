/**
 * Parametric high-resolution vector logo designs for "62 ราชสิทธาราม — ช่างก่อสร้าง".
 * All 5 alternative emblems support live 4-channel color customization, crisp
 * Thai typography (Prompt / IBM Plex Sans Thai), and transparent PNG output.
 */

export type CustomLogoDesignId =
  | 'shield-trowel'
  | 'circle-seal'
  | 'diamond-truss'
  | 'minimal-gable'
  | 'varsity-ribbon';

export interface CustomLogoPalette {
  numberColor: string;
  plumbColor: string;
  accentColor: string;
  frameColor: string;
}

export interface LogoVariantMeta {
  id:
    | 'gable-62'
    | 'hex-crest'
    | CustomLogoDesignId;
  badgeNumber: number;
  shortTitle: string;
  title: string;
  subtitle: string;
  detailDesc: string;
  hasWhiteShield: boolean;
  colorLabels: {
    number: string;
    plumb: string;
    accent: string;
    frame: string;
  };
}

export const LOGO_VARIANT_CATALOG: LogoVariantMeta[] = [
  {
    id: 'gable-62',
    badgeNumber: 1,
    shortTitle: 'จั่วแดง 62',
    title: 'แบบที่ 1 · จั่วแดง 62 (ต้นฉบับ)',
    subtitle: 'จั่วแดงเส้นหนา · เลข 62 ทอง · สไตล์ปักตรง',
    detailDesc: 'โลโก้ต้นฉบับปรับจั่วสีแดงเส้นหนา วางแบบปักลงเนื้อผ้าหรืออาร์มทอ',
    hasWhiteShield: false,
    colorLabels: {
      number: 'สีเลข 62 และขีดข้าง',
      plumb: 'สีไฮไลต์',
      accent: 'สีเส้นจั่วด้านบน',
      frame: 'สีข้อความภาษาไทย',
    },
  },
  {
    id: 'hex-crest',
    badgeNumber: 2,
    shortTitle: 'ตราหกเหลี่ยม',
    title: 'แบบที่ 2 · ตราหกเหลี่ยม กบไสไม้',
    subtitle: '62 กรมท่า · ลูกดิ่งทอง · กบไสไม้แดง',
    detailDesc: 'ตราอาร์มหกเหลี่ยมตัดพื้นหลังมุมนอกโปร่งใส · 62 กรมท่า · ลูกดิ่งทอง',
    hasWhiteShield: true,
    colorLabels: {
      number: 'สีเลข 62 ด้านบน',
      plumb: 'สีลูกดิ่งด้านล่าง',
      accent: 'สีกบไสไม้และเส้นคั่น',
      frame: 'สีกรอบหกเหลี่ยมและข้อความ',
    },
  },
  {
    id: 'shield-trowel',
    badgeNumber: 3,
    shortTitle: 'ตราโล่เกรียงก่อ',
    title: 'แบบที่ 3 · ตราโล่เกรียงก่อ & ไม้ฉาก',
    subtitle: 'โล่คลาสสิก · เกรียงไขว้ฉากเหล็ก · ลูกดิ่งทอง',
    detailDesc: 'ตราโล่เกียรติยศช่างก่อสร้าง เกรียงก่ออิฐไขว้ไม้ฉากเหล็กพร้อมลูกดิ่งทองตรงกลาง',
    hasWhiteShield: true,
    colorLabels: {
      number: 'สีเลข 62 ด้านบน',
      plumb: 'สีลูกดิ่งและขอบทอง',
      accent: 'สีเกรียงก่อและเส้นเน้น',
      frame: 'สีโล่ ไม้ฉาก และข้อความ',
    },
  },
  {
    id: 'circle-seal',
    badgeNumber: 4,
    shortTitle: 'ตรากลมวงเวียน',
    title: 'แบบที่ 4 · ตรากลมวงเวียน & จั่ว',
    subtitle: 'อาร์มวงกลม · วงเวียนร่างแบบ · เหมาะติดอก/แขน',
    detailDesc: 'ตราอาร์มวงกลมขอบคู่ ตัวอักษรโค้งรอบวง วงเวียนร่างแบบครอบเลข 62 และลูกดิ่งทอง',
    hasWhiteShield: true,
    colorLabels: {
      number: 'สีเลข 62 กลางตรา',
      plumb: 'สีลูกดิ่งและดาวทอง',
      accent: 'สีวงแหวนในและจั่วแดง',
      frame: 'สีวงแหวนหลักและวงเวียน',
    },
  },
  {
    id: 'diamond-truss',
    badgeNumber: 5,
    shortTitle: 'ข้าวหลามตัดโครงถัก',
    title: 'แบบที่ 5 · ข้าวหลามตัดโครงถัก',
    subtitle: 'ทรงเรขาคณิตเท่ · โครงถักจั่วแดง · ลูกดิ่งทอง',
    detailDesc: 'ตราข้าวหลามตัดมุมเฉียงสไตล์วิศวกรรม โครงถักหลังคาจั่วแดงคู่เลข 62 กรมท่า',
    hasWhiteShield: true,
    colorLabels: {
      number: 'สีเลข 62 กลางตรา',
      plumb: 'สีลูกดิ่งและแนวก่ออิฐ',
      accent: 'สีโครงถักหลังคาและขีดข้าง',
      frame: 'สีกรอบข้าวหลามตัดและข้อความ',
    },
  },
  {
    id: 'minimal-gable',
    badgeNumber: 6,
    shortTitle: 'มินิมอลจั่วคู่',
    title: 'แบบที่ 6 · มินิมอลจั่วคู่ & ลูกดิ่ง',
    subtitle: 'ไร้กรอบนอก · ปักเรียบหรู · ใส่ได้ทุกโอกาส',
    detailDesc: 'โลโก้มินิมอลแบบไร้กรอบ พื้นโปร่งใส 100% จั่วคู่แดง-ทองและลูกดิ่งกลางเลข 62',
    hasWhiteShield: false,
    colorLabels: {
      number: 'สีเลข 62 ตรงกลาง',
      plumb: 'สีจั่วในและลูกดิ่งทอง',
      accent: 'สีจั่วนอกและคานระดับน้ำ',
      frame: 'สีข้อความภาษาไทย',
    },
  },
  {
    id: 'varsity-ribbon',
    badgeNumber: 7,
    shortTitle: 'ริบบิ้นเกียรติยศ',
    title: 'แบบที่ 7 · ตราริบบิ้นเกียรติยศ & อิฐก่อ',
    subtitle: 'สไตล์ Varsity · ริบบิ้นพับแดง · ลูกดิ่งคู่ทอง',
    detailDesc: 'ตราอาร์มสไตล์ Varsity พร้อมลวดลายอิฐก่อ ริบบิ้นพับสีแดง และลูกดิ่งทองคู่',
    hasWhiteShield: true,
    colorLabels: {
      number: 'สีเลข 62 ด้านบน',
      plumb: 'สีลูกดิ่งคู่และขอบทอง',
      accent: 'สีริบบิ้นพับและอิฐก่อ',
      frame: 'สีกรอบตราและข้อความล่าง',
    },
  },
];

let fontsReadyPromise: Promise<unknown> | null = null;
function waitForFonts(): Promise<unknown> {
  if (!fontsReadyPromise) {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      fontsReadyPromise = document.fonts.ready.catch(() => undefined);
    } else {
      fontsReadyPromise = Promise.resolve();
    }
  }
  return fontsReadyPromise;
}

/** Splits a Thai string into grapheme clusters so combining vowels/tones stay attached */
function splitThaiGraphemes(text: string): string[] {
  const IntlAny = Intl as unknown as {
    Segmenter?: new (
      locale: string,
      opts: { granularity: 'grapheme' }
    ) => { segment: (s: string) => Iterable<{ segment: string }> };
  };
  if (typeof IntlAny.Segmenter === 'function') {
    const seg = new IntlAny.Segmenter('th', { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return (
    text.match(/[^\u0E31\u0E34-\u0E3A\u0E47-\u0E4E][\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]*/g) ??
    Array.from(text)
  );
}

/** Draws bold octagonal chamfered architectural/varsity digits "62" */
function drawGeometric62(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  height: number,
  fillColor: string,
  outlineColor?: string,
  outlineWidth = 0
) {
  const unitH = 1.32;
  const scale = height / unitH;
  const digitW = 1.0 * scale;
  const gap = 0.16 * scale;
  const totalW = digitW * 2 + gap;
  const startX = cx - totalW / 2;
  const startY = cy - height / 2;

  const traceDigit6 = (ox: number, oy: number) => {
    const s = scale;
    const c = 0.14 * s;
    const t = 0.25 * s;
    const w = 1.0 * s;
    const h = unitH * s;
    const ic = 0.05 * s;

    ctx.beginPath();
    // Outer contour clockwise
    ctx.moveTo(ox + c, oy);
    ctx.lineTo(ox + w - c, oy);
    ctx.lineTo(ox + w, oy + c);
    ctx.lineTo(ox + w, oy + 0.34 * s);
    ctx.lineTo(ox + w - t, oy + 0.34 * s);
    ctx.lineTo(ox + w - t, oy + t);
    ctx.lineTo(ox + t, oy + t);
    ctx.lineTo(ox + t, oy + 0.52 * s);
    ctx.lineTo(ox + w - c, oy + 0.52 * s);
    ctx.lineTo(ox + w, oy + 0.52 * s + c);
    ctx.lineTo(ox + w, oy + h - c);
    ctx.lineTo(ox + w - c, oy + h);
    ctx.lineTo(ox + c, oy + h);
    ctx.lineTo(ox, oy + h - c);
    ctx.lineTo(ox, oy + c);
    ctx.closePath();

    // Inner counter hole (even-odd)
    const hx0 = ox + t;
    const hx1 = ox + w - t;
    const hy0 = oy + 0.77 * s;
    const hy1 = oy + h - t;
    ctx.moveTo(hx0 + ic, hy0);
    ctx.lineTo(hx1 - ic, hy0);
    ctx.lineTo(hx1, hy0 + ic);
    ctx.lineTo(hx1, hy1 - ic);
    ctx.lineTo(hx1 - ic, hy1);
    ctx.lineTo(hx0 + ic, hy1);
    ctx.lineTo(hx0, hy1 - ic);
    ctx.lineTo(hx0, hy0 + ic);
    ctx.closePath();
  };

  const traceDigit2 = (ox: number, oy: number) => {
    const s = scale;
    const c = 0.14 * s;
    const t = 0.25 * s;
    const w = 1.0 * s;
    const h = unitH * s;

    ctx.beginPath();
    ctx.moveTo(ox + c, oy);
    ctx.lineTo(ox + w - c, oy);
    ctx.lineTo(ox + w, oy + c);
    ctx.lineTo(ox + w, oy + 0.60 * s);
    ctx.lineTo(ox + w - c, oy + 0.74 * s);
    ctx.lineTo(ox + t + 0.04 * s, oy + 0.74 * s);
    ctx.lineTo(ox + t, oy + 0.78 * s);
    ctx.lineTo(ox + t, oy + h - t);
    ctx.lineTo(ox + w, oy + h - t);
    ctx.lineTo(ox + w, oy + h);
    ctx.lineTo(ox, oy + h);
    ctx.lineTo(ox, oy + 0.64 * s);
    ctx.lineTo(ox + c, oy + 0.50 * s);
    ctx.lineTo(ox + w - t, oy + 0.50 * s);
    ctx.lineTo(ox + w - t, oy + t);
    ctx.lineTo(ox + t, oy + t);
    ctx.lineTo(ox + t, oy + 0.36 * s);
    ctx.lineTo(ox, oy + 0.36 * s);
    ctx.lineTo(ox, oy + c);
    ctx.closePath();
  };

  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.lineJoin = 'round';

  // Digit 6
  traceDigit6(startX, startY);
  if (outlineColor && outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
  }
  ctx.fill('evenodd');

  // Digit 2
  traceDigit2(startX + digitW + gap, startY);
  if (outlineColor && outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
  }
  ctx.fill();
  ctx.restore();
}

/** Draws an iconic crisp construction plumb bob (ลูกดิ่ง) */
function drawPlumbBob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  height: number,
  color: string,
  withStringLen = 0
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (withStringLen > 0) {
    ctx.lineWidth = Math.max(2.5, height * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx, topY - withStringLen);
    ctx.lineTo(cx, topY + height * 0.06);
    ctx.stroke();
  }

  const w = height * 0.58;
  // Top T-cap spool
  const capW = w * 0.64;
  const capH = height * 0.12;
  ctx.fillRect(cx - capW / 2, topY, capW, capH);

  // Narrow neck
  const neckW = w * 0.24;
  const neckH = height * 0.14;
  ctx.fillRect(cx - neckW / 2, topY + capH - 1, neckW, neckH + 2);

  // Faceted plumb bob body
  const bodyTop = topY + capH + neckH;
  const shoulderY = topY + height * 0.49;
  const tipY = topY + height;

  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.85, bodyTop);
  ctx.lineTo(cx + neckW * 0.85, bodyTop);
  ctx.lineTo(cx + w / 2, shoulderY);
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx - w / 2, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Subtle vertical specular facet highlight on left half
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.6, bodyTop + 2);
  ctx.lineTo(cx, bodyTop + 2);
  ctx.lineTo(cx, tipY - 3);
  ctx.lineTo(cx - w * 0.42, shoulderY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Draws a crisp 5-point star */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  color: string
) {
  const innerR = outerR * 0.44;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draws Thai text cleanly curved along an arc with grapheme-safe clustering */
function drawCurvedThaiText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  isBottom: boolean,
  font: string,
  color: string,
  extraTrackingPx = 6
) {
  const clusters = splitThaiGraphemes(text);
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const widths = clusters.map((ch) => ctx.measureText(ch).width + extraTrackingPx);
  const totalWidth = widths.reduce((a, b) => a + b, 0) - extraTrackingPx;
  const totalAngle = totalWidth / radius;

  if (!isBottom) {
    let angle = -Math.PI / 2 - totalAngle / 2;
    for (let i = 0; i < clusters.length; i++) {
      const charAngle = widths[i] / radius;
      const mid = angle + charAngle / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(mid) * radius, cy + Math.sin(mid) * radius);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillText(clusters[i], 0, 0);
      ctx.restore();
      angle += charAngle;
    }
  } else {
    let angle = Math.PI / 2 + totalAngle / 2;
    for (let i = 0; i < clusters.length; i++) {
      const charAngle = widths[i] / radius;
      const mid = angle - charAngle / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(mid) * radius, cy + Math.sin(mid) * radius);
      ctx.rotate(mid - Math.PI / 2);
      ctx.fillText(clusters[i], 0, 0);
      ctx.restore();
      angle -= charAngle;
    }
  }
  ctx.restore();
}

/** Traces a classic pointed collegiate heraldic shield path */
function traceShieldPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  w: number,
  h: number
) {
  const halfW = w / 2;
  const shoulderY = topY + h * 0.08;
  const sideEndY = topY + h * 0.56;
  const bottomY = topY + h;

  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.quadraticCurveTo(cx + halfW * 0.52, topY + h * 0.06, cx + halfW, shoulderY);
  ctx.lineTo(cx + halfW, sideEndY);
  ctx.bezierCurveTo(
    cx + halfW,
    topY + h * 0.79,
    cx + halfW * 0.52,
    topY + h * 0.92,
    cx,
    bottomY
  );
  ctx.bezierCurveTo(
    cx - halfW * 0.52,
    topY + h * 0.92,
    cx - halfW,
    topY + h * 0.79,
    cx - halfW,
    sideEndY
  );
  ctx.lineTo(cx - halfW, shoulderY);
  ctx.quadraticCurveTo(cx - halfW * 0.52, topY + h * 0.06, cx, topY);
  ctx.closePath();
}

/* ============================================================================
 * DESIGN 3: SHIELD TROWEL & SQUARE (ตราโล่เกรียงก่อ & ไม้ฉาก)
 * ============================================================================ */
function renderShieldTrowel(palette: CustomLogoPalette): HTMLCanvasElement {
  const W = 720;
  const H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = W / 2;

  // 1. White outer piping rim for dark shirt visibility
  traceShieldPath(ctx, cx, 18, 650, 760);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 2. Main thick navy shield rim
  traceShieldPath(ctx, cx, 34, 616, 724);
  ctx.fillStyle = palette.frameColor;
  ctx.fill();

  // 3. Crisp white shield field
  traceShieldPath(ctx, cx, 62, 558, 662);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 4. Thin inner gold trim line
  traceShieldPath(ctx, cx, 78, 526, 628);
  ctx.strokeStyle = palette.plumbColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  // 5. Top "62" flanked by angled crimson engineering bars
  drawGeometric62(ctx, cx, 174, 108, palette.numberColor);

  ctx.save();
  ctx.fillStyle = palette.accentColor;
  // Left angled dash
  ctx.save();
  ctx.translate(cx - 148, 166);
  ctx.rotate(-0.22);
  ctx.fillRect(-38, -9, 76, 18);
  ctx.restore();
  // Right angled dash
  ctx.save();
  ctx.translate(cx + 148, 166);
  ctx.rotate(0.22);
  ctx.fillRect(-38, -9, 76, 18);
  ctx.restore();
  ctx.restore();

  // 6. Centerpiece: Crossed Carpenter's L-Square (navy) + Brick Trowel (crimson) + Gold Plumb Bob
  const iconCy = 342;

  // Carpenter's L-Square (diagonal right-down to left-up)
  ctx.save();
  ctx.translate(cx, iconCy);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = palette.frameColor;
  // Vertical blade
  ctx.fillRect(-86, -86, 30, 176);
  // Horizontal blade
  ctx.fillRect(-86, 60, 178, 30);
  // White ruler tick marks along the L-square
  ctx.fillStyle = '#FFFFFF';
  for (let i = -72; i <= 48; i += 16) {
    ctx.fillRect(-86, i, i % 32 === 0 ? 14 : 9, 3.5);
  }
  for (let i = -54; i <= 76; i += 16) {
    ctx.fillRect(i, 76, 3.5, i % 32 === 0 ? 14 : 9);
  }
  ctx.restore();

  // Brick Trowel (crossing opposite diagonal with crisp white separation halo)
  ctx.save();
  ctx.translate(cx, iconCy);
  ctx.rotate(Math.PI / 4);

  // Subtle white knockout outline where trowel crosses square
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';

  // Trowel diamond blade
  ctx.beginPath();
  ctx.moveTo(0, -112);
  ctx.lineTo(44, -22);
  ctx.lineTo(28, 18);
  ctx.lineTo(-28, 18);
  ctx.lineTo(-44, -22);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = palette.accentColor;
  ctx.fill();

  // Blade center ridge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // Cranked tang
  ctx.fillStyle = palette.frameColor;
  ctx.fillRect(-7, 16, 14, 28);

  // Wooden/grip handle
  ctx.fillStyle = palette.accentColor;
  ctx.beginPath();
  ctx.roundRect(-14, 42, 28, 66, 12);
  ctx.fill();
  ctx.fillStyle = palette.plumbColor;
  ctx.fillRect(-14, 48, 28, 8);
  ctx.fillRect(-14, 92, 28, 8);
  ctx.restore();

  // Gold Plumb Bob centered cleanly right down the axis
  ctx.save();
  // Clean white circular backing badge behind plumb bob so it pops clearly
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, iconCy + 14, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.frameColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  drawPlumbBob(ctx, cx, iconCy - 17, 62, palette.plumbColor, 10);
  ctx.restore();

  // 7. Structural crimson divider bar
  ctx.fillStyle = palette.accentColor;
  ctx.beginPath();
  ctx.moveTo(cx - 216, 468);
  ctx.lineTo(cx + 216, 468);
  ctx.lineTo(cx + 206, 480);
  ctx.lineTo(cx - 206, 480);
  ctx.closePath();
  ctx.fill();

  // 8. Bold Thai Typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.frameColor;
  ctx.font = '700 68px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ราชสิทธาราม', cx, 534);

  ctx.font = '700 44px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ช่างก่อสร้าง', cx, 598);

  // Flanking red bars beside ช่างก่อสร้าง
  ctx.fillStyle = palette.accentColor;
  ctx.fillRect(cx - 182, 594, 42, 10);
  ctx.fillRect(cx + 140, 594, 42, 10);

  // Bottom apex gold star
  drawStar(ctx, cx, 660, 18, palette.plumbColor);

  return canvas;
}

/* ============================================================================
 * DESIGN 4: CIRCULAR HERITAGE SEAL (ตรากลมวงเวียน & โครงหลังคา)
 * ============================================================================ */
function renderCircleSeal(palette: CustomLogoPalette): HTMLCanvasElement {
  const S = 780;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = S / 2;
  const cy = S / 2;

  // 1. Crisp white outer ring rim
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 376, 0, Math.PI * 2);
  ctx.fill();

  // 2. Main dark navy outer band
  ctx.fillStyle = palette.frameColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 358, 0, Math.PI * 2);
  ctx.fill();

  // 3. Thin gold decorative circle near outer edge
  ctx.strokeStyle = palette.plumbColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 342, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Crimson inner separator ring
  ctx.fillStyle = palette.accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();

  // 5. White center medallion
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 226, 0, Math.PI * 2);
  ctx.fill();

  // 6. Subtle architectural blueprint grid crosshair inside center medallion
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 222, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(18, 36, 77, 0.08)';
  ctx.lineWidth = 2;
  for (let d = -200; d <= 200; d += 40) {
    ctx.beginPath();
    ctx.moveTo(cx + d, cy - 224);
    ctx.lineTo(cx + d, cy + 224);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 224, cy + d);
    ctx.lineTo(cx + 224, cy + d);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Curved Thai lettering on navy ring
  drawCurvedThaiText(
    ctx,
    'ราชสิทธาราม',
    cx,
    cy,
    296,
    false,
    '700 58px "Prompt", "IBM Plex Sans Thai", sans-serif',
    '#FFFFFF',
    8
  );
  drawCurvedThaiText(
    ctx,
    'ช่างก่อสร้าง',
    cx,
    cy,
    298,
    true,
    '700 52px "Prompt", "IBM Plex Sans Thai", sans-serif',
    '#FFFFFF',
    10
  );

  // Left & Right gold stars on the navy ring equator
  drawStar(ctx, cx - 297, cy, 17, palette.plumbColor);
  drawStar(ctx, cx + 297, cy, 17, palette.plumbColor);

  // 8. Center Architectural Drafting Compass + Red Gable Peak
  // Drafting compass legs behind 62
  ctx.save();
  ctx.strokeStyle = palette.frameColor;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 172);
  ctx.lineTo(cx - 122, cy + 96);
  ctx.moveTo(cx, cy - 172);
  ctx.lineTo(cx + 122, cy + 96);
  ctx.stroke();

  // Compass locking arc bar
  ctx.strokeStyle = palette.plumbColor;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy - 172, 118, Math.PI * 0.34, Math.PI * 0.66);
  ctx.stroke();

  // Compass hinge ring crown
  ctx.fillStyle = palette.frameColor;
  ctx.beginPath();
  ctx.arc(cx, cy - 166, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy - 166, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.frameColor;
  ctx.fillRect(cx - 7, cy - 202, 14, 18);
  ctx.restore();

  // Bold red architectural roof chevron framing upper center
  ctx.save();
  ctx.strokeStyle = palette.accentColor;
  ctx.lineWidth = 18;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(cx - 154, cy - 42);
  ctx.lineTo(cx - 122, cy - 42);
  ctx.lineTo(cx, cy - 118);
  ctx.lineTo(cx + 122, cy - 42);
  ctx.lineTo(cx + 154, cy - 42);
  ctx.stroke();
  ctx.restore();

  // White backing plate behind "62" so compass legs never clash with numerals
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cx - 134, cy - 58, 268, 134, 16);
  ctx.fill();
  drawGeometric62(ctx, cx, cy + 10, 116, palette.numberColor);
  ctx.restore();

  // Gold Plumb Bob hanging below "62"
  drawPlumbBob(ctx, cx, cy + 94, 96, palette.plumbColor, 14);

  return canvas;
}

/* ============================================================================
 * DESIGN 5: ARCHITECTURAL DIAMOND TRUSS (ตราข้าวหลามตัดโครงถัก)
 * ============================================================================ */
function traceOctDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  cut: number
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx - cut, cy - cut);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx + rx - cut, cy + cut);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx + cut, cy + cut);
  ctx.lineTo(cx - rx, cy);
  ctx.lineTo(cx - rx + cut, cy - cut);
  ctx.closePath();
}

function renderDiamondTruss(palette: CustomLogoPalette): HTMLCanvasElement {
  const S = 780;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = S / 2;
  const cy = S / 2;

  // 1. Crisp white outer border
  traceOctDiamond(ctx, cx, cy, 372, 372, 42);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 2. Bold navy outer diamond frame
  traceOctDiamond(ctx, cx, cy, 354, 354, 40);
  ctx.fillStyle = palette.frameColor;
  ctx.fill();

  // 3. White interior diamond
  traceOctDiamond(ctx, cx, cy, 318, 318, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 4. Inner fine hairline accent diamond
  traceOctDiamond(ctx, cx, cy, 298, 298, 33);
  ctx.strokeStyle = palette.accentColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // 5. Architectural Steel Roof Truss Crown in upper triangle
  ctx.save();
  ctx.strokeStyle = palette.accentColor;
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Main truss triangle
  ctx.moveTo(cx - 148, 250);
  ctx.lineTo(cx, 134);
  ctx.lineTo(cx + 148, 250);
  ctx.closePath();
  ctx.stroke();

  // Internal truss webbing struts
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, 136);
  ctx.lineTo(cx, 250);
  ctx.moveTo(cx - 72, 192);
  ctx.lineTo(cx, 250);
  ctx.lineTo(cx + 72, 192);
  ctx.moveTo(cx - 72, 192);
  ctx.lineTo(cx - 72, 250);
  ctx.moveTo(cx + 72, 192);
  ctx.lineTo(cx + 72, 250);
  ctx.stroke();
  ctx.restore();

  // 6. Monumental geometric "62" across the wide equator
  drawGeometric62(ctx, cx, 352, 136, palette.numberColor);

  // Flanking engineering angle chevron bars
  ctx.fillStyle = palette.accentColor;
  ctx.beginPath();
  ctx.moveTo(cx - 246, 352);
  ctx.lineTo(cx - 208, 314);
  ctx.lineTo(cx - 190, 314);
  ctx.lineTo(cx - 228, 352);
  ctx.lineTo(cx - 190, 390);
  ctx.lineTo(cx - 208, 390);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 246, 352);
  ctx.lineTo(cx + 208, 314);
  ctx.lineTo(cx + 190, 314);
  ctx.lineTo(cx + 228, 352);
  ctx.lineTo(cx + 190, 390);
  ctx.lineTo(cx + 208, 390);
  ctx.closePath();
  ctx.fill();

  // 7. Gold brick-bond horizontal rule
  const brickY = 442;
  ctx.fillStyle = palette.plumbColor;
  const brickW = 54;
  const brickGap = 8;
  const totalBricksW = 5 * brickW + 4 * brickGap;
  let bx = cx - totalBricksW / 2;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(bx, brickY, brickW, 11);
    bx += brickW + brickGap;
  }

  // 8. Bold Thai lettering
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.frameColor;
  ctx.font = '700 58px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ราชสิทธาราม', cx, 502);

  ctx.font = '700 38px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ช่างก่อสร้าง', cx, 556);

  // 9. Gold Plumb Bob anchored right into the bottom diamond point
  drawPlumbBob(ctx, cx, 594, 86, palette.plumbColor, 6);

  return canvas;
}

/* ============================================================================
 * DESIGN 6: MINIMALIST DOUBLE GABLE & PLUMB BOB (มินิมอลจั่วคู่ & ลูกดิ่ง)
 * Direct-embroidery open transparent style — zero heavy outer box!
 * ============================================================================ */
function renderMinimalGable(palette: CustomLogoPalette): HTMLCanvasElement {
  const W = 800;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = W / 2;

  // 1. Thick outer crimson architectural gable roof with crisp horizontal eaves
  ctx.save();
  ctx.strokeStyle = palette.accentColor;
  ctx.lineWidth = 28;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(92, 168);
  ctx.lineTo(150, 168);
  ctx.lineTo(cx, 44);
  ctx.lineTo(W - 150, 168);
  ctx.lineTo(W - 92, 168);
  ctx.stroke();

  // 2. Refined inner gold parallel echo gable
  ctx.strokeStyle = palette.plumbColor;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(166, 186);
  ctx.lineTo(cx, 84);
  ctx.lineTo(W - 166, 186);
  ctx.stroke();
  ctx.restore();

  // 3. Suspended gold plumb bob hanging gracefully from the inner apex
  drawPlumbBob(ctx, cx, 126, 62, palette.plumbColor, 34);

  // 4. Bold geometric "62" centered neatly below the apex
  drawGeometric62(ctx, cx, 294, 166, palette.numberColor);

  // 5. Crisp horizontal structural beam / spirit-level divider
  const beamY = 408;
  ctx.fillStyle = palette.accentColor;
  ctx.fillRect(88, beamY, W - 176, 12);
  // Center gold spirit-level bubble accent
  ctx.fillStyle = palette.plumbColor;
  ctx.fillRect(cx - 56, beamY - 2, 112, 16);

  // 6. Clean modern Thai typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.frameColor;
  ctx.font = '700 84px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ราชสิทธาราม', cx, 486);

  ctx.font = '700 58px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ช่างก่อสร้าง', cx, 572);

  // Flanking gold architectural bars beside ช่างก่อสร้าง
  ctx.fillStyle = palette.plumbColor;
  ctx.beginPath();
  ctx.roundRect(74, 562, 108, 20, 4);
  ctx.roundRect(W - 182, 562, 108, 20, 4);
  ctx.fill();

  return canvas;
}

/* ============================================================================
 * DESIGN 7: VARSITY RIBBON & MASONRY EMBLEM (ตราริบบิ้นเกียรติยศ & อิฐก่อ)
 * ============================================================================ */
function traceVarsityCrest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  w: number,
  h: number
) {
  const hw = w / 2;
  const archDrop = h * 0.14;
  const midY = topY + h * 0.62;
  const botY = topY + h;

  ctx.beginPath();
  ctx.moveTo(cx - hw, topY + archDrop);
  ctx.quadraticCurveTo(cx, topY - h * 0.04, cx + hw, topY + archDrop);
  ctx.lineTo(cx + hw, midY);
  ctx.quadraticCurveTo(cx + hw * 0.85, topY + h * 0.88, cx, botY);
  ctx.quadraticCurveTo(cx - hw * 0.85, topY + h * 0.88, cx - hw, midY);
  ctx.closePath();
}

function renderVarsityRibbon(palette: CustomLogoPalette): HTMLCanvasElement {
  const W = 800;
  const H = 760;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = W / 2;

  // 1. White outer piping behind crest
  traceVarsityCrest(ctx, cx, 44, 624, 686);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 2. Bold navy varsity crest body
  traceVarsityCrest(ctx, cx, 60, 590, 650);
  ctx.fillStyle = palette.frameColor;
  ctx.fill();

  // 3. White interior shield
  traceVarsityCrest(ctx, cx, 84, 540, 598);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // 4. Inner gold athletic double stripe
  traceVarsityCrest(ctx, cx, 98, 510, 568);
  ctx.strokeStyle = palette.plumbColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // 5. Stylized interlocking masonry brickwork crown at top arch
  const brickColors = [palette.accentColor, palette.plumbColor, palette.accentColor];
  const row1Y = 128;
  const bw = 64;
  const bh = 16;
  const bgap = 8;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = brickColors[i];
    ctx.fillRect(cx - (3 * bw + 2 * bgap) / 2 + i * (bw + bgap), row1Y, bw, bh);
  }
  ctx.fillStyle = palette.frameColor;
  ctx.fillRect(cx - (2 * bw + bgap) / 2, row1Y + bh + 6, bw, bh);
  ctx.fillRect(cx + bgap / 2, row1Y + bh + 6, bw, bh);

  // 6. Monumental Varsity "62" with crisp gold outline accent
  drawGeometric62(ctx, cx, 274, 152, palette.numberColor, palette.plumbColor, 8);

  // 7. Folded 3D Crimson Heraldic Ribbon sweeping across midsection
  const ribTop = 382;
  const ribH = 104;
  const ribHalfW = 336;

  // Back folded ribbon tails (darker shaded)
  ctx.save();
  ctx.fillStyle = palette.frameColor;
  // Left tail
  ctx.beginPath();
  ctx.moveTo(cx - ribHalfW + 30, ribTop + 26);
  ctx.lineTo(cx - ribHalfW - 44, ribTop + 26);
  ctx.lineTo(cx - ribHalfW - 14, ribTop + ribH / 2 + 22);
  ctx.lineTo(cx - ribHalfW - 44, ribTop + ribH + 18);
  ctx.lineTo(cx - ribHalfW + 36, ribTop + ribH + 18);
  ctx.closePath();
  ctx.fill();

  // Right tail
  ctx.beginPath();
  ctx.moveTo(cx + ribHalfW - 30, ribTop + 26);
  ctx.lineTo(cx + ribHalfW + 44, ribTop + 26);
  ctx.lineTo(cx + ribHalfW + 14, ribTop + ribH / 2 + 22);
  ctx.lineTo(cx + ribHalfW + 44, ribTop + ribH + 18);
  ctx.lineTo(cx + ribHalfW - 36, ribTop + ribH + 18);
  ctx.closePath();
  ctx.fill();

  // White crisp border around main front ribbon
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cx - ribHalfW - 8, ribTop - 8, ribHalfW * 2 + 16, ribH + 16, 12);
  ctx.fill();

  // Main front crimson ribbon bar
  ctx.fillStyle = palette.accentColor;
  ctx.beginPath();
  ctx.roundRect(cx - ribHalfW, ribTop, ribHalfW * 2, ribH, 8);
  ctx.fill();

  // Subtle top/bottom gold stitching stripes inside ribbon
  ctx.fillStyle = palette.plumbColor;
  ctx.fillRect(cx - ribHalfW + 14, ribTop + 10, ribHalfW * 2 - 28, 4);
  ctx.fillRect(cx - ribHalfW + 14, ribTop + ribH - 14, ribHalfW * 2 - 28, 4);

  // Crisp white "ราชสิทธาราม" inside ribbon
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 66px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ราชสิทธาราม', cx, ribTop + ribH / 2 + 2);
  ctx.restore();

  // 8. Lower Shield Section: "ช่างก่อสร้าง" + Twin Gold Plumb Bobs
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.frameColor;
  ctx.font = '700 46px "Prompt", "IBM Plex Sans Thai", sans-serif';
  ctx.fillText('ช่างก่อสร้าง', cx, 546);

  // Twin gold plumb bobs flanking bottom apex + central gold star
  drawPlumbBob(ctx, cx - 86, 586, 62, palette.plumbColor, 4);
  drawStar(ctx, cx, 616, 17, palette.accentColor);
  drawPlumbBob(ctx, cx + 86, 586, 62, palette.plumbColor, 4);

  return canvas;
}

/** Main async renderer for the 5 newly designed parametric logos */
export async function buildCustomDesignLogoCanvas(
  designId: CustomLogoDesignId,
  palette: CustomLogoPalette
): Promise<HTMLCanvasElement> {
  await waitForFonts();
  switch (designId) {
    case 'shield-trowel':
      return renderShieldTrowel(palette);
    case 'circle-seal':
      return renderCircleSeal(palette);
    case 'diamond-truss':
      return renderDiamondTruss(palette);
    case 'minimal-gable':
      return renderMinimalGable(palette);
    case 'varsity-ribbon':
      return renderVarsityRibbon(palette);
  }
}
