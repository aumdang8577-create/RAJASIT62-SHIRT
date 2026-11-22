import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Camera,
  ChevronLeft,
  Move,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Shirt,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import {
  applyAutoContrastForShirt,
  buildCustomizedLogoCanvas,
  BUTTON_COLOR_PRESETS,
  COLLAR_COLOR_PRESETS,
  FABRIC_TYPE_OPTIONS,
  GARMENT_COLORWAY_PRESETS,
  getColorLuminance,
  getLogoVariantMeta,
  RATCHASIT_SVG_CATALOG,
  SHIRT_COLOR_PRESETS,
  shouldMultiplyLogoOnShirt,
  TIPPING_STYLE_OPTIONS,
  type FabricType,
  type GarmentColorwayPreset,
  type LogoVariant,
  type PoloDesignConfig,
  type TippingStyle,
} from '../utils/sleeveLogoComposer';
import { triggerBlobDownload } from '../utils/canvasExport';
import {
  createDetailedButtonGroup,
  createFabricPBRMaps,
  createPhotoStudioEnvironment,
  createRibKnitNormalMap,
  createStudioCycloramaGeometry,
  createUnifiedGarmentSystem,
  paintPocketCanvas,
  paintTrimCanvas,
  paintWovenNeckTagCanvas,
  type ButtonMount,
  type FabricPBRPreset,
  type UnifiedGarmentResult,
} from '../utils/polo3DBuilder';

export type CameraPresetId =
  | 'hero'
  | 'front'
  | 'left-sleeve'
  | 'left-chest'
  | 'back'
  | 'right-sleeve';

type LightingPresetId = 'softbox' | 'showroom' | 'warm';
type ColorZoneTab = 'shirt' | 'collar' | 'cuff' | 'placket' | 'button';

interface Polo3DViewerProps {
  config: PoloDesignConfig;
  onChangeConfig: (next: PoloDesignConfig) => void;
  onNotify: (message: string) => void;
  initialStudioOpen?: boolean;
  initialCameraPreset?: CameraPresetId;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  hero: {
    label: 'มุมเฉียง 3/4',
    pos: [1.62, 0.24, 3.16],
    target: [0.05, 0.01, 0],
  },
  front: {
    label: 'ด้านหน้า',
    pos: [0, 0.14, 3.36],
    target: [0, 0.01, 0],
  },
  'left-sleeve': {
    label: 'ซูมแขนซ้าย',
    pos: [2.16, 0.28, 0.94],
    target: [0.64, 0.23, 0.02],
  },
  'left-chest': {
    label: 'ซูมอกซ้าย',
    pos: [0.58, 0.28, 1.78],
    target: [0.23, 0.25, 0.23],
  },
  back: {
    label: 'ด้านหลัง',
    pos: [0, 0.16, -3.36],
    target: [0, 0.01, 0],
  },
  'right-sleeve': {
    label: 'ซูมแขนขวา',
    pos: [-2.16, 0.28, 0.94],
    target: [-0.64, 0.23, 0.02],
  },
};

const LIGHTING_PRESETS: Record<
  LightingPresetId,
  {
    label: string;
    keyColor: number;
    keyIntensity: number;
    fillColor: number;
    fillIntensity: number;
    rimColor: number;
    rimIntensity: number;
    hemiIntensity: number;
    envIntensity: number;
    exposure: number;
  }
> = {
  softbox: {
    label: 'สตูดิโอนุ่ม',
    keyColor: 0xfff8f0,
    keyIntensity: 2.15,
    fillColor: 0xe6f0fa,
    fillIntensity: 0.34,
    rimColor: 0xdcebf7,
    rimIntensity: 1.05,
    hemiIntensity: 0.42,
    envIntensity: 0.42,
    exposure: 1.02,
  },
  showroom: {
    label: 'โชว์รูมคมชัด',
    keyColor: 0xffffff,
    keyIntensity: 2.45,
    fillColor: 0xdbeafe,
    fillIntensity: 0.28,
    rimColor: 0xf0f9ff,
    rimIntensity: 1.30,
    hemiIntensity: 0.34,
    envIntensity: 0.48,
    exposure: 1.04,
  },
  warm: {
    label: 'แสงอุ่นธรรมชาติ',
    keyColor: 0xffecd2,
    keyIntensity: 2.25,
    fillColor: 0xfef3e2,
    fillIntensity: 0.34,
    rimColor: 0xdbeafe,
    rimIntensity: 0.95,
    hemiIntensity: 0.40,
    envIntensity: 0.40,
    exposure: 1.03,
  },
};

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      10,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, 'rgba(15, 23, 34, 0.44)');
    grad.addColorStop(0.45, 'rgba(15, 23, 34, 0.17)');
    grad.addColorStop(0.8, 'rgba(15, 23, 34, 0.04)');
    grad.addColorStop(1, 'rgba(15, 23, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Paints tailored stitching & recessed buttonholes aligned exactly to 3D button Y positions */
function paintPlacketCanvas(
  canvas: HTMLCanvasElement,
  placketColor: string,
  isLight: boolean,
  buttonYs: number[],
  yBottom: number,
  yTop: number,
  showBottomBoxTack: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = placketColor;
  ctx.fillRect(0, 0, w, h);

  const seamGrad = ctx.createLinearGradient(0, 0, w, 0);
  seamGrad.addColorStop(0, 'rgba(0,0,0,0.09)');
  seamGrad.addColorStop(0.12, 'rgba(0,0,0,0)');
  seamGrad.addColorStop(0.88, 'rgba(0,0,0,0)');
  seamGrad.addColorStop(1, 'rgba(0,0,0,0.11)');
  ctx.fillStyle = seamGrad;
  ctx.fillRect(0, 0, w, h);

  const stitchColor = isLight
    ? 'rgba(20, 30, 44, 0.24)'
    : 'rgba(255, 255, 255, 0.20)';
  ctx.strokeStyle = stitchColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(14, 6, w - 28, h - 14);

  if (showBottomBoxTack) {
    ctx.strokeRect(14, h - 54, w - 28, 42);
  }
  ctx.setLineDash([]);

  const span = Math.max(0.01, yTop - yBottom);
  for (const by of buttonYs) {
    const vNorm = (by - yBottom) / span;
    const hy = THREE.MathUtils.clamp((1 - vNorm) * h, 18, h - 18);
    ctx.fillStyle = isLight ? 'rgba(15,23,42,0.38)' : 'rgba(0,0,0,0.58)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 22, hy - 3, 44, 6, 3);
    ctx.fill();

    ctx.strokeStyle = stitchColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 25, hy - 6, 50, 12, 5);
    ctx.stroke();
  }
}

export const Polo3DViewer: React.FC<Polo3DViewerProps> = ({
  config,
  onChangeConfig,
  onNotify,
  initialStudioOpen = false,
  initialCameraPreset = 'hero',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [studioOpen, setStudioOpen] = useState<boolean>(initialStudioOpen);
  const [colorZone, setColorZone] = useState<ColorZoneTab>('shirt');
  const [activePreset, setActivePreset] =
    useState<CameraPresetId>(initialCameraPreset);
  const [lightingPreset, setLightingPreset] =
    useState<LightingPresetId>('softbox');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<'orbit' | 'pan'>('orbit');
  const [contextLost, setContextLost] = useState<boolean>(false);
  const isFirstMountPlacementRef = useRef<boolean>(true);
  const paintSeqRef = useRef<number>(0);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const lightsRef = useRef<{
    hemi: THREE.HemisphereLight | null;
    key: THREE.DirectionalLight | null;
    fill: THREE.DirectionalLight | null;
    rim: THREE.DirectionalLight | null;
  }>({ hemi: null, key: null, fill: null, rim: null });
  const shadowMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const cycloramaRef = useRef<{
    mesh: THREE.Mesh | null;
    mat: THREE.MeshStandardMaterial | null;
  }>({ mesh: null, mat: null });
  const requestRenderRef = useRef<() => void>(() => {});
  const autoRotateRef = useRef<boolean>(false);
  const cameraTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS[initialCameraPreset].pos),
    target: new THREE.Vector3(...CAMERA_PRESETS[initialCameraPreset].target),
  });

  // Garment variant sub-groups toggled smoothly by config.garmentStyle
  const variantMeshesRef = useRef<{
    poloCollar: THREE.Mesh | null;
    standCollar: THREE.Mesh | null;
    poloPlacket: THREE.Mesh | null;
    standPlacket: THREE.Mesh | null;
    poloButtons: THREE.Group | null;
    standButtons: THREE.Group | null;
    leftRibCuff: THREE.Mesh | null;
    rightRibCuff: THREE.Mesh | null;
    leftHemCuff: THREE.Mesh | null;
    rightHemCuff: THREE.Mesh | null;
    chestPocket: THREE.Mesh | null;
  }>({
    poloCollar: null,
    standCollar: null,
    poloPlacket: null,
    standPlacket: null,
    poloButtons: null,
    standButtons: null,
    leftRibCuff: null,
    rightRibCuff: null,
    leftHemCuff: null,
    rightHemCuff: null,
    chestPocket: null,
  });

  // Cached PBR fabric maps across 3 weaves + geometric bounds from unified cage
  const fabricCacheRef = useRef<Partial<Record<FabricType, FabricPBRPreset>>>({});
  const garmentMetaRef = useRef<Pick<
    UnifiedGarmentResult,
    'poloPlacketMeta' | 'standPlacketMeta' | 'torsoBounds'
  > | null>(null);

  // Dynamic PBR material & canvas texture refs so config updates never recreate WebGL
  const materialsRef = useRef<{
    torsoMat: THREE.MeshPhysicalMaterial | null;
    leftSleeveMat: THREE.MeshPhysicalMaterial | null;
    rightSleeveMat: THREE.MeshPhysicalMaterial | null;
    innerLiningMat: THREE.MeshStandardMaterial | null;
    collarMat: THREE.MeshPhysicalMaterial | null;
    cuffMat: THREE.MeshPhysicalMaterial | null;
    poloPlacketMat: THREE.MeshPhysicalMaterial | null;
    standPlacketMat: THREE.MeshPhysicalMaterial | null;
    pocketMat: THREE.MeshPhysicalMaterial | null;
    buttonMat: THREE.MeshPhysicalMaterial | null;
    neckTagMat: THREE.MeshStandardMaterial | null;
    torsoCanvas: HTMLCanvasElement | null;
    leftSleeveCanvas: HTMLCanvasElement | null;
    rightSleeveCanvas: HTMLCanvasElement | null;
    collarCanvas: HTMLCanvasElement | null;
    cuffCanvas: HTMLCanvasElement | null;
    poloPlacketCanvas: HTMLCanvasElement | null;
    standPlacketCanvas: HTMLCanvasElement | null;
    pocketCanvas: HTMLCanvasElement | null;
    neckTagCanvas: HTMLCanvasElement | null;
    torsoTex: THREE.CanvasTexture | null;
    leftSleeveTex: THREE.CanvasTexture | null;
    rightSleeveTex: THREE.CanvasTexture | null;
    collarTex: THREE.CanvasTexture | null;
    cuffTex: THREE.CanvasTexture | null;
    poloPlacketTex: THREE.CanvasTexture | null;
    standPlacketTex: THREE.CanvasTexture | null;
    pocketTex: THREE.CanvasTexture | null;
    neckTagTex: THREE.CanvasTexture | null;
  }>({
    torsoMat: null,
    leftSleeveMat: null,
    rightSleeveMat: null,
    innerLiningMat: null,
    collarMat: null,
    cuffMat: null,
    poloPlacketMat: null,
    standPlacketMat: null,
    pocketMat: null,
    buttonMat: null,
    neckTagMat: null,
    torsoCanvas: null,
    leftSleeveCanvas: null,
    rightSleeveCanvas: null,
    collarCanvas: null,
    cuffCanvas: null,
    poloPlacketCanvas: null,
    standPlacketCanvas: null,
    pocketCanvas: null,
    neckTagCanvas: null,
    torsoTex: null,
    leftSleeveTex: null,
    rightSleeveTex: null,
    collarTex: null,
    cuffTex: null,
    poloPlacketTex: null,
    standPlacketTex: null,
    pocketTex: null,
    neckTagTex: null,
  });

  const paintTextures = useCallback(async (cfg: PoloDesignConfig) => {
    const m = materialsRef.current;
    const gMeta = garmentMetaRef.current;
    if (
      !gMeta ||
      !m.torsoCanvas ||
      !m.leftSleeveCanvas ||
      !m.rightSleeveCanvas ||
      !m.collarCanvas ||
      !m.cuffCanvas ||
      !m.poloPlacketCanvas ||
      !m.standPlacketCanvas ||
      !m.pocketCanvas ||
      !m.neckTagCanvas ||
      !m.torsoTex ||
      !m.leftSleeveTex ||
      !m.rightSleeveTex ||
      !m.collarTex ||
      !m.cuffTex ||
      !m.poloPlacketTex ||
      !m.standPlacketTex ||
      !m.pocketTex ||
      !m.neckTagTex ||
      !m.torsoMat ||
      !m.leftSleeveMat ||
      !m.rightSleeveMat ||
      !m.innerLiningMat ||
      !m.collarMat ||
      !m.cuffMat ||
      !m.poloPlacketMat ||
      !m.standPlacketMat ||
      !m.pocketMat ||
      !m.buttonMat
    ) {
      return;
    }

    const seq = ++paintSeqRef.current;

    const chestVariant: LogoVariant | null =
      cfg.placement === 'chest-and-left-sleeve'
        ? cfg.chestLogoVariant === 'none'
          ? null
          : cfg.chestLogoVariant
        : cfg.placement === 'left-chest' || cfg.placement === 'right-chest'
          ? cfg.logoVariant
          : null;

    const sleeveVariant: LogoVariant | null =
      cfg.placement === 'chest-and-left-sleeve'
        ? cfg.sleeveLogoVariant === 'none'
          ? null
          : cfg.sleeveLogoVariant
        : cfg.placement === 'left-sleeve' || cfg.placement === 'right-sleeve'
          ? cfg.logoVariant
          : null;

    const backVariant: LogoVariant | null =
      cfg.placement === 'center-back' ? cfg.logoVariant : null;

    const [chestLogoCanvas, sleeveLogoCanvas, backLogoCanvas] =
      await Promise.all([
        chestVariant
          ? buildCustomizedLogoCanvas(cfg, chestVariant)
          : Promise.resolve(null),
        sleeveVariant
          ? sleeveVariant === chestVariant && chestVariant
            ? Promise.resolve(null)
            : buildCustomizedLogoCanvas(cfg, sleeveVariant)
          : Promise.resolve(null),
        backVariant
          ? buildCustomizedLogoCanvas(cfg, backVariant)
          : Promise.resolve(null),
      ]);

    if (seq !== paintSeqRef.current) return;

    const resolvedSleeveCanvas =
      sleeveLogoCanvas ??
      (sleeveVariant && sleeveVariant === chestVariant ? chestLogoCanvas : null);

    const shirtLuma = getColorLuminance(cfg.shirtColor);
    const isLight = shirtLuma > 160;
    const placketLuma = getColorLuminance(cfg.placketColor);
    const isPlacketLight = placketLuma > 160;

    const fillFabric = (
      canvas: HTMLCanvasElement,
      mode: 'torso' | 'sleeve'
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const cw = canvas.width;
      const ch = canvas.height;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = cfg.shirtColor;
      ctx.fillRect(0, 0, cw, ch);

      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.014)' : 'rgba(255,255,255,0.018)';
      for (let x = 0; x < cw; x += 6) {
        ctx.fillRect(x, 0, 2, ch);
      }

      if (mode === 'torso') {
        const collarAO = ctx.createLinearGradient(0, 0, 0, ch * 0.14);
        collarAO.addColorStop(0, 'rgba(10, 18, 30, 0.28)');
        collarAO.addColorStop(0.55, 'rgba(10, 18, 30, 0.08)');
        collarAO.addColorStop(1, 'rgba(10, 18, 30, 0)');
        ctx.fillStyle = collarAO;
        ctx.fillRect(0, 0, cw, ch * 0.14);

        // Subtle contact shading flanking center front placket entrance
        const placketGlow = ctx.createLinearGradient(cw * 0.45, 0, cw * 0.55, 0);
        placketGlow.addColorStop(0, 'rgba(10, 18, 30, 0)');
        placketGlow.addColorStop(0.22, 'rgba(10, 18, 30, 0.075)');
        placketGlow.addColorStop(0.5, 'rgba(10, 18, 30, 0.02)');
        placketGlow.addColorStop(0.78, 'rgba(10, 18, 30, 0.075)');
        placketGlow.addColorStop(1, 'rgba(10, 18, 30, 0)');
        ctx.fillStyle = placketGlow;
        ctx.fillRect(cw * 0.45, ch * 0.04, cw * 0.10, ch * 0.30);

        const seamStroke = isLight
          ? 'rgba(15, 23, 42, 0.11)'
          : 'rgba(255, 255, 255, 0.13)';
        ctx.strokeStyle = seamStroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        for (const uSide of [0.25, 0.75]) {
          ctx.beginPath();
          ctx.moveTo(cw * uSide, ch * 0.34);
          ctx.lineTo(cw * uSide, ch - 36);
          ctx.stroke();
        }
        // Subtle shoulder-top stitch guide & crisp twin-needle bottom hem
        for (const offset of [26, 36]) {
          ctx.beginPath();
          ctx.moveTo(0, ch - offset);
          ctx.lineTo(cw, ch - offset);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else {
        const cuffAO = ctx.createLinearGradient(0, ch * 0.9, 0, ch);
        cuffAO.addColorStop(0, 'rgba(10, 18, 30, 0)');
        cuffAO.addColorStop(1, 'rgba(10, 18, 30, 0.14)');
        ctx.fillStyle = cuffAO;
        ctx.fillRect(0, ch * 0.9, cw, ch * 0.1);

        ctx.strokeStyle = isLight
          ? 'rgba(15, 23, 42, 0.11)'
          : 'rgba(255, 255, 255, 0.13)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(0, ch - 12);
        ctx.lineTo(cw, ch - 12);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return ctx;
    };

    const drawLogoCrisp = (
      ctx: CanvasRenderingContext2D,
      logoCanvas: HTMLCanvasElement,
      variantId: LogoVariant,
      cx: number,
      cy: number,
      dw: number,
      dh: number
    ) => {
      const useMultiply = shouldMultiplyLogoOnShirt(
        variantId,
        cfg.style,
        cfg.shirtColor
      );
      const hasBadgeShadow =
        getLogoVariantMeta(variantId).hasWhiteShield ||
        (variantId === 'gable-62' && cfg.style === 'navy-patch');

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (useMultiply) {
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        if (hasBadgeShadow) {
          ctx.shadowColor = 'rgba(10, 18, 30, 0.24)';
          ctx.shadowBlur = Math.max(2, dw * 0.028);
          ctx.shadowOffsetY = 2;
        }
      }
      ctx.drawImage(logoCanvas, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    };

    // 1. Torso Texture (2048 x 2048) with cylindrical X/Y metric compensation
    const tCtx = fillFabric(m.torsoCanvas, 'torso');
    const isLeftChestTarget =
      cfg.placement === 'left-chest' ||
      cfg.placement === 'chest-and-left-sleeve';
    const renderChestOnPocket =
      cfg.garmentStyle === 'stand-collar' && isLeftChestTarget;

    if (tCtx) {
      const tw = m.torsoCanvas.width;
      const th = m.torsoCanvas.height;
      const ySpanCm = (gMeta.torsoBounds.yMax - gMeta.torsoBounds.yMin) * 50; // ~77.5 cm
      const chestPxPerCmY = th / Math.max(40, ySpanCm);
      const chestPxPerCmX = tw / 150.5; // local front chest circumference scale

      const drawOnTorso = (
        logoCanvas: HTMLCanvasElement,
        variantId: LogoVariant,
        uCenter: number,
        vCanvasY: number,
        wCm: number
      ) => {
        const aspect = logoCanvas.height / Math.max(1, logoCanvas.width);
        const dw = wCm * chestPxPerCmX;
        const dh = wCm * aspect * chestPxPerCmY;
        const cx = uCenter * tw + cfg.horizontalShift * tw * 0.06;
        const cy =
          vCanvasY * th - (cfg.gapAboveBandCm - 1.0) * chestPxPerCmY * 1.4;
        drawLogoCrisp(tCtx, logoCanvas, variantId, cx, cy, dw, dh);
      };

      if (chestLogoCanvas && chestVariant && !renderChestOnPocket) {
        const wCm =
          cfg.placement === 'chest-and-left-sleeve'
            ? cfg.chestWidthCm
            : cfg.widthCm;
        if (isLeftChestTarget) {
          drawOnTorso(
            chestLogoCanvas,
            chestVariant,
            gMeta.torsoBounds.midChestU,
            gMeta.torsoBounds.midChestCanvasY,
            wCm
          );
        } else if (cfg.placement === 'right-chest') {
          drawOnTorso(
            chestLogoCanvas,
            chestVariant,
            1 - gMeta.torsoBounds.midChestU,
            gMeta.torsoBounds.midChestCanvasY,
            wCm
          );
        }
      } else if (backLogoCanvas && backVariant) {
        drawOnTorso(backLogoCanvas, backVariant, 0.0, 0.28, cfg.widthCm);
        drawOnTorso(backLogoCanvas, backVariant, 1.0, 0.28, cfg.widthCm);
      }
    }

    // 2. Left Chest 3D Pocket Canvas (512 x 512)
    if (renderChestOnPocket && chestLogoCanvas && chestVariant) {
      const wCm =
        cfg.placement === 'chest-and-left-sleeve'
          ? cfg.chestWidthCm
          : cfg.widthCm;
      const pocketMultiply = shouldMultiplyLogoOnShirt(
        chestVariant,
        cfg.style,
        cfg.shirtColor
      );
      const pocketShadow =
        getLogoVariantMeta(chestVariant).hasWhiteShield ||
        (chestVariant === 'gable-62' && cfg.style === 'navy-patch');
      paintPocketCanvas(
        m.pocketCanvas,
        cfg.shirtColor,
        isLight,
        chestLogoCanvas,
        wCm,
        pocketMultiply,
        pocketShadow
      );
    } else {
      paintPocketCanvas(
        m.pocketCanvas,
        cfg.shirtColor,
        isLight,
        null,
        0,
        false,
        false
      );
    }

    // 3. Left Sleeve Texture (2048 x 1024) — outer bicep centered at u=0.50 (un-mirrored L->R, 1:1 true aspect)
    const lsCtx = fillFabric(m.leftSleeveCanvas, 'sleeve');
    if (
      lsCtx &&
      resolvedSleeveCanvas &&
      sleeveVariant &&
      (cfg.placement === 'left-sleeve' ||
        cfg.placement === 'chest-and-left-sleeve')
    ) {
      const sw = m.leftSleeveCanvas.width;
      const sh = m.leftSleeveCanvas.height;
      const aspect =
        resolvedSleeveCanvas.height / Math.max(1, resolvedSleeveCanvas.width);
      const pxPerCmX = sw / 42.5;
      const pxPerCmY = sh / 21.0;
      const wCm =
        cfg.placement === 'chest-and-left-sleeve'
          ? cfg.sleeveWidthCm
          : cfg.widthCm;
      const dw = wCm * pxPerCmX;
      const dh = wCm * aspect * pxPerCmY;

      const cx = sw * 0.50 + cfg.horizontalShift * sw * 0.14;
      const cy = sh - cfg.gapAboveBandCm * pxPerCmY - dh / 2 - 22;
      drawLogoCrisp(
        lsCtx,
        resolvedSleeveCanvas,
        sleeveVariant,
        cx,
        cy,
        dw,
        dh
      );
    }

    // 4. Right Sleeve Texture (2048 x 1024) — outer bicep centered at u=0.50 (1:1 true aspect)
    const rsCtx = fillFabric(m.rightSleeveCanvas, 'sleeve');
    if (
      rsCtx &&
      resolvedSleeveCanvas &&
      sleeveVariant &&
      cfg.placement === 'right-sleeve'
    ) {
      const sw = m.rightSleeveCanvas.width;
      const sh = m.rightSleeveCanvas.height;
      const aspect =
        resolvedSleeveCanvas.height / Math.max(1, resolvedSleeveCanvas.width);
      const pxPerCmX = sw / 42.5;
      const pxPerCmY = sh / 21.0;
      const dw = cfg.widthCm * pxPerCmX;
      const dh = cfg.widthCm * aspect * pxPerCmY;

      const cx = sw * 0.50 + cfg.horizontalShift * sw * 0.14;
      const cy = sh - cfg.gapAboveBandCm * pxPerCmY - dh / 2 - 22;
      drawLogoCrisp(
        rsCtx,
        resolvedSleeveCanvas,
        sleeveVariant,
        cx,
        cy,
        dw,
        dh
      );
    }

    // 5. Collar, Cuff, Plackets & Woven Neck Tag
    paintTrimCanvas(
      m.collarCanvas,
      cfg.collarColor,
      cfg.tippingStyle,
      cfg.tippingColor,
      'collar',
      cfg.garmentStyle
    );
    paintTrimCanvas(
      m.cuffCanvas,
      cfg.cuffColor,
      cfg.tippingStyle,
      cfg.tippingColor,
      'cuff',
      cfg.garmentStyle
    );
    paintPlacketCanvas(
      m.poloPlacketCanvas,
      cfg.placketColor,
      isPlacketLight,
      gMeta.poloPlacketMeta.buttonYs,
      gMeta.poloPlacketMeta.yBottom,
      gMeta.poloPlacketMeta.yTop,
      true
    );
    paintPlacketCanvas(
      m.standPlacketCanvas,
      cfg.placketColor,
      isPlacketLight,
      gMeta.standPlacketMeta.buttonYs,
      gMeta.standPlacketMeta.yBottom,
      gMeta.standPlacketMeta.yTop,
      false
    );
    paintWovenNeckTagCanvas(m.neckTagCanvas);

    // 6. Sync Physical Material Sheen, Inner Lining Shade & Color Tints
    const fabricSheen = new THREE.Color(cfg.shirtColor).lerp(
      new THREE.Color('#FFFFFF'),
      isLight ? 0.5 : 0.35
    );
    const innerTint = new THREE.Color(cfg.shirtColor).lerp(
      new THREE.Color('#0B1018'),
      0.24
    );
    const collarSheen = new THREE.Color(cfg.collarColor).lerp(
      new THREE.Color('#FFFFFF'),
      0.32
    );
    const cuffSheen = new THREE.Color(cfg.cuffColor).lerp(
      new THREE.Color('#FFFFFF'),
      0.32
    );
    const placketSheen = new THREE.Color(cfg.placketColor).lerp(
      new THREE.Color('#FFFFFF'),
      isPlacketLight ? 0.48 : 0.34
    );

    m.torsoMat.sheenColor.copy(fabricSheen);
    m.leftSleeveMat.sheenColor.copy(fabricSheen);
    m.rightSleeveMat.sheenColor.copy(fabricSheen);
    m.innerLiningMat.color.copy(innerTint);
    m.pocketMat.sheenColor.copy(fabricSheen);
    m.poloPlacketMat.sheenColor.copy(placketSheen);
    m.standPlacketMat.sheenColor.copy(placketSheen);
    m.collarMat.sheenColor.copy(collarSheen);
    m.cuffMat.sheenColor.copy(cuffSheen);
    m.buttonMat.color.set(cfg.buttonColor);

    m.torsoTex.needsUpdate = true;
    m.leftSleeveTex.needsUpdate = true;
    m.rightSleeveTex.needsUpdate = true;
    m.collarTex.needsUpdate = true;
    m.cuffTex.needsUpdate = true;
    m.poloPlacketTex.needsUpdate = true;
    m.standPlacketTex.needsUpdate = true;
    m.pocketTex.needsUpdate = true;
    m.neckTagTex.needsUpdate = true;

    requestRenderRef.current();
  }, []);

  // Initialize Three.js Studio Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#B5C8C7');
    scene.fog = new THREE.Fog('#B5C8C7', 9.0, 20);
    sceneRef.current = scene;

    const initCam = CAMERA_PRESETS[initialCameraPreset];
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 40);
    camera.position.set(...initCam.pos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = LIGHTING_PRESETS.softbox.exposure;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored
    );

    const envTex = createPhotoStudioEnvironment(renderer);
    scene.environment = envTex;
    scene.environmentIntensity = LIGHTING_PRESETS.softbox.envIntensity;

    const hemiLight = new THREE.HemisphereLight(
      0xf8fafc,
      0x6b7c7d,
      LIGHTING_PRESETS.softbox.hemiIntensity
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      LIGHTING_PRESETS.softbox.keyColor,
      LIGHTING_PRESETS.softbox.keyIntensity
    );
    keyLight.position.set(4.8, 3.6, 2.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.left = -2.2;
      keyLight.shadow.camera.right = 2.2;
      keyLight.shadow.camera.top = 2.2;
      keyLight.shadow.camera.bottom = -2.2;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.018;
      keyLight.shadow.radius = 3.5;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      LIGHTING_PRESETS.softbox.fillColor,
      LIGHTING_PRESETS.softbox.fillIntensity
    );
    fillLight.position.set(-3.8, 1.8, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(
      LIGHTING_PRESETS.softbox.rimColor,
      LIGHTING_PRESETS.softbox.rimIntensity
    );
    rimLight.position.set(-2.8, 3.0, -3.8);
    scene.add(rimLight);

    lightsRef.current = {
      hemi: hemiLight,
      key: keyLight,
      fill: fillLight,
      rim: rimLight,
    };

    // Pre-generate all 3 PBR fabric weave presets for instant zero-lag switching
    const piquePreset = createFabricPBRMaps('cotton-pique');
    const twillPreset = createFabricPBRMaps('heavy-twill');
    const dryFitPreset = createFabricPBRMaps('dry-fit');
    fabricCacheRef.current = {
      'cotton-pique': piquePreset,
      'heavy-twill': twillPreset,
      'dry-fit': dryFitPreset,
    };

    const activePresetMaps =
      fabricCacheRef.current[config.fabricType] ?? piquePreset;
    const ribNormalMap = createRibKnitNormalMap();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const makeCanvasTex = (w: number, h: number, wrapRepeatS = false) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      if (wrapRepeatS) {
        t.wrapS = THREE.RepeatWrapping;
      }
      return [c, t] as const;
    };

    const [torsoCanvas, torsoTex] = makeCanvasTex(2048, 2048, true);
    const [leftSleeveCanvas, leftSleeveTex] = makeCanvasTex(2048, 1024, true);
    const [rightSleeveCanvas, rightSleeveTex] = makeCanvasTex(2048, 1024, true);
    const [collarCanvas, collarTex] = makeCanvasTex(512, 256, true);
    const [cuffCanvas, cuffTex] = makeCanvasTex(512, 128, true);
    const [poloPlacketCanvas, poloPlacketTex] = makeCanvasTex(256, 512);
    const [standPlacketCanvas, standPlacketTex] = makeCanvasTex(256, 1024);
    const [pocketCanvas, pocketTex] = makeCanvasTex(512, 512);
    const [neckTagCanvas, neckTagTex] = makeCanvasTex(512, 256);
    paintWovenNeckTagCanvas(neckTagCanvas);

    const makeClothMat = (map: THREE.CanvasTexture, useVertexColors = false) =>
      new THREE.MeshPhysicalMaterial({
        map,
        normalMap: activePresetMaps.normalMap,
        normalScale: new THREE.Vector2(
          activePresetMaps.normalScale,
          activePresetMaps.normalScale
        ),
        roughnessMap: activePresetMaps.roughnessMap,
        roughness: activePresetMaps.roughness,
        metalness: 0.0,
        sheen: activePresetMaps.sheen,
        sheenRoughness: activePresetMaps.sheenRoughness,
        sheenColor: new THREE.Color('#FFFFFF'),
        vertexColors: useVertexColors,
        side: THREE.DoubleSide,
      });

    const torsoMat = makeClothMat(torsoTex, true);
    const leftSleeveMat = makeClothMat(leftSleeveTex, true);
    const rightSleeveMat = makeClothMat(rightSleeveTex, true);
    const innerLiningMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.shirtColor).lerp(
        new THREE.Color('#0B1018'),
        0.24
      ),
      roughness: 0.94,
      metalness: 0.0,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const pocketMat = makeClothMat(pocketTex);

    const poloPlacketMat = makeClothMat(poloPlacketTex);
    poloPlacketMat.side = THREE.FrontSide;
    const standPlacketMat = makeClothMat(standPlacketTex);
    standPlacketMat.side = THREE.FrontSide;

    const collarMat = new THREE.MeshPhysicalMaterial({
      map: collarTex,
      normalMap: ribNormalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.58,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color('#CBD5E1'),
      side: THREE.DoubleSide,
    });

    const cuffMat = new THREE.MeshPhysicalMaterial({
      map: cuffTex,
      normalMap: ribNormalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.58,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color('#CBD5E1'),
      side: THREE.DoubleSide,
    });

    const buttonMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.buttonColor),
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.38,
      clearcoatRoughness: 0.26,
    });

    const buttonThreadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B4554'),
      roughness: 0.85,
      metalness: 0,
    });

    const neckTagMat = new THREE.MeshStandardMaterial({
      map: neckTagTex,
      roughness: 0.90,
      metalness: 0.04,
      side: THREE.FrontSide,
    });

    materialsRef.current = {
      torsoMat,
      leftSleeveMat,
      rightSleeveMat,
      innerLiningMat,
      collarMat,
      cuffMat,
      poloPlacketMat,
      standPlacketMat,
      pocketMat,
      buttonMat,
      neckTagMat,
      torsoCanvas,
      leftSleeveCanvas,
      rightSleeveCanvas,
      collarCanvas,
      cuffCanvas,
      poloPlacketCanvas,
      standPlacketCanvas,
      pocketCanvas,
      neckTagCanvas,
      torsoTex,
      leftSleeveTex,
      rightSleeveTex,
      collarTex,
      cuffTex,
      poloPlacketTex,
      standPlacketTex,
      pocketTex,
      neckTagTex,
    };

    const poloGroup = new THREE.Group();
    poloGroup.position.set(0, 0.09, 0);
    scene.add(poloGroup);

    const disposableGeos: THREE.BufferGeometry[] = [];

    // 1. Unified Catmull-Clark Subdivided Garment System (Watertight Torso + Sleeves + Linings)
    const garment = createUnifiedGarmentSystem();
    garmentMetaRef.current = {
      poloPlacketMeta: garment.poloPlacketMeta,
      standPlacketMeta: garment.standPlacketMeta,
      torsoBounds: garment.torsoBounds,
    };

    disposableGeos.push(
      garment.garmentGeo,
      garment.poloCollarGeo,
      garment.standCollarGeo,
      garment.leftRibCuffGeo,
      garment.rightRibCuffGeo,
      garment.leftHemCuffGeo,
      garment.rightHemCuffGeo,
      garment.poloPlacketGeo,
      garment.standPlacketGeo,
      garment.chestPocketGeo,
      garment.neckTagGeo
    );

    const garmentMesh = new THREE.Mesh(garment.garmentGeo, [
      torsoMat,
      leftSleeveMat,
      rightSleeveMat,
      innerLiningMat,
    ]);
    garmentMesh.castShadow = !isSoftwareGl;
    garmentMesh.receiveShadow = !isSoftwareGl;
    poloGroup.add(garmentMesh);

    // Woven inner-neck brand tag seated inside back yoke
    const neckTagMesh = new THREE.Mesh(garment.neckTagGeo, neckTagMat);
    poloGroup.add(neckTagMesh);

    // 2. Zero-Gap Cuffs swept directly from subdivided sleeve loops (world poloGroup coords)
    const leftRibCuff = new THREE.Mesh(garment.leftRibCuffGeo, cuffMat);
    const rightRibCuff = new THREE.Mesh(garment.rightRibCuffGeo, cuffMat);
    const leftHemCuff = new THREE.Mesh(garment.leftHemCuffGeo, cuffMat);
    const rightHemCuff = new THREE.Mesh(garment.rightHemCuffGeo, cuffMat);
    [leftRibCuff, rightRibCuff, leftHemCuff, rightHemCuff].forEach((mMesh) => {
      mMesh.castShadow = !isSoftwareGl;
      mMesh.receiveShadow = !isSoftwareGl;
    });
    poloGroup.add(leftRibCuff, rightRibCuff, leftHemCuff, rightHemCuff);

    // 3. Sculpted Fold-Over Polo & Stand Collars swept from subdivided neckline loop
    const poloCollar = new THREE.Mesh(garment.poloCollarGeo, collarMat);
    poloCollar.castShadow = !isSoftwareGl;
    poloCollar.receiveShadow = !isSoftwareGl;
    poloGroup.add(poloCollar);

    const standCollar = new THREE.Mesh(garment.standCollarGeo, collarMat);
    standCollar.castShadow = !isSoftwareGl;
    standCollar.receiveShadow = !isSoftwareGl;
    poloGroup.add(standCollar);

    // 4. Barycentric Flush Plackets & Left-Chest Patch Pocket
    const poloPlacket = new THREE.Mesh(garment.poloPlacketGeo, poloPlacketMat);
    poloPlacket.castShadow = !isSoftwareGl;
    poloPlacket.receiveShadow = !isSoftwareGl;
    poloGroup.add(poloPlacket);

    const standPlacket = new THREE.Mesh(garment.standPlacketGeo, standPlacketMat);
    standPlacket.castShadow = !isSoftwareGl;
    standPlacket.receiveShadow = !isSoftwareGl;
    poloGroup.add(standPlacket);

    const chestPocket = new THREE.Mesh(garment.chestPocketGeo, pocketMat);
    chestPocket.castShadow = !isSoftwareGl;
    chestPocket.receiveShadow = !isSoftwareGl;
    poloGroup.add(chestPocket);

    // 5. Flush 4-Hole Pearlized Buttons for both silhouettes
    const buttonSample = createDetailedButtonGroup(buttonMat, buttonThreadMat);
    disposableGeos.push(...buttonSample.geometries);

    const mountButtons = (mounts: ButtonMount[]): THREE.Group => {
      const grp = new THREE.Group();
      mounts.forEach(({ pos, rotX, rotY }) => {
        const btnGroup = buttonSample.group.clone(true);
        btnGroup.position.copy(pos);
        btnGroup.rotation.set(rotX, rotY, 0);
        grp.add(btnGroup);
      });
      return grp;
    };

    const poloButtons = mountButtons(garment.poloButtonMounts);
    const standButtons = mountButtons(garment.standButtonMounts);
    poloGroup.add(poloButtons, standButtons);

    variantMeshesRef.current = {
      poloCollar,
      standCollar,
      poloPlacket,
      standPlacket,
      poloButtons,
      standButtons,
      leftRibCuff,
      rightRibCuff,
      leftHemCuff,
      rightHemCuff,
      chestPocket,
    };

    // 8. Studio Cyclorama Sweep + Soft Contact Shadow Plane
    const cycGeo = createStudioCycloramaGeometry();
    disposableGeos.push(cycGeo);
    const cycMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#B5C8C7'),
      roughness: 0.96,
      metalness: 0.0,
    });
    const cycMesh = new THREE.Mesh(cycGeo, cycMat);
    cycMesh.receiveShadow = !isSoftwareGl;
    scene.add(cycMesh);
    cycloramaRef.current = { mesh: cycMesh, mat: cycMat };

    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.62,
    });
    shadowMatRef.current = shadowMat;
    const shadowGeo = new THREE.PlaneGeometry(1.75, 1.15);
    disposableGeos.push(shadowGeo);
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -0.80, 0);
    scene.add(shadowPlane);

    // OrbitControls with full Orbit + Pan + Zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initCam.target);
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 0.9;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.95;
    controls.maxDistance = 4.8;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.65;
    controlsRef.current = controls;

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, clock.getDelta() || 0.016);

        let keepGoing = false;
        const trans = cameraTransitionRef.current;
        if (trans.active) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, trans.pos.x, 7, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, trans.pos.y, 7, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, trans.pos.z, 7, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, trans.target.x, 7, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, trans.target.y, 7, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, trans.target.z, 7, dt);

          if (
            camera.position.distanceTo(trans.pos) < 0.01 &&
            controls.target.distanceTo(trans.target) < 0.01
          ) {
            camera.position.copy(trans.pos);
            controls.target.copy(trans.target);
            trans.active = false;
          } else {
            keepGoing = true;
          }
        }

        if (autoRotateRef.current && !isSoftwareGl) {
          controls.autoRotate = true;
          keepGoing = true;
        } else {
          controls.autoRotate = false;
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || keepGoing) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    const handleControlStart = () => {
      cameraTransitionRef.current.active = false;
      if (autoRotateRef.current) {
        autoRotateRef.current = false;
        setAutoRotate(false);
      }
    };
    const handleControlChange = () => {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -1.15, 1.15);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, -0.95, 0.95);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -0.85, 0.85);
      requestRender();
    };

    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', handleControlChange);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(200, Math.floor(entry.contentRect.width));
      const h = Math.max(200, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    paintTextures(config);
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('change', handleControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      disposableGeos.forEach((g) => g.dispose());
      shadowMat.dispose();
      cycMat.dispose();
      torsoMat.dispose();
      leftSleeveMat.dispose();
      rightSleeveMat.dispose();
      innerLiningMat.dispose();
      collarMat.dispose();
      cuffMat.dispose();
      poloPlacketMat.dispose();
      standPlacketMat.dispose();
      pocketMat.dispose();
      buttonMat.dispose();
      buttonThreadMat.dispose();
      neckTagMat.dispose();
      torsoTex.dispose();
      leftSleeveTex.dispose();
      rightSleeveTex.dispose();
      collarTex.dispose();
      cuffTex.dispose();
      poloPlacketTex.dispose();
      standPlacketTex.dispose();
      pocketTex.dispose();
      neckTagTex.dispose();
      Object.values(fabricCacheRef.current).forEach((preset) => {
        preset?.normalMap.dispose();
        preset?.roughnessMap.dispose();
      });
      ribNormalMap.dispose();
      shadowTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap garment silhouette meshes + cloth PBR maps when garmentStyle or fabricType changes
  useEffect(() => {
    const vm = variantMeshesRef.current;
    const isStand = config.garmentStyle === 'stand-collar';
    if (vm.poloCollar) vm.poloCollar.visible = !isStand;
    if (vm.standCollar) vm.standCollar.visible = isStand;
    if (vm.poloPlacket) vm.poloPlacket.visible = !isStand;
    if (vm.standPlacket) vm.standPlacket.visible = isStand;
    if (vm.poloButtons) vm.poloButtons.visible = !isStand;
    if (vm.standButtons) vm.standButtons.visible = isStand;
    if (vm.leftRibCuff) vm.leftRibCuff.visible = !isStand;
    if (vm.rightRibCuff) vm.rightRibCuff.visible = !isStand;
    if (vm.leftHemCuff) vm.leftHemCuff.visible = isStand;
    if (vm.rightHemCuff) vm.rightHemCuff.visible = isStand;
    if (vm.chestPocket) vm.chestPocket.visible = isStand;

    const preset = fabricCacheRef.current[config.fabricType];
    const m = materialsRef.current;
    if (preset) {
      const clothMats = [
        m.torsoMat,
        m.leftSleeveMat,
        m.rightSleeveMat,
        m.poloPlacketMat,
        m.standPlacketMat,
        m.pocketMat,
      ];
      for (const mat of clothMats) {
        if (!mat) continue;
        mat.normalMap = preset.normalMap;
        mat.normalScale.set(preset.normalScale, preset.normalScale);
        mat.roughnessMap = preset.roughnessMap;
        mat.roughness = preset.roughness;
        mat.sheen = preset.sheen;
        mat.sheenRoughness = preset.sheenRoughness;
        mat.needsUpdate = true;
      }
    }

    paintTextures(config);
  }, [config, paintTextures]);

  // Sync studio lighting, fog, and Cyclorama sweep backdrop
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const lights = lightsRef.current;
    const shadowMat = shadowMatRef.current;
    const { mesh: cycMesh, mat: cycMat } = cycloramaRef.current;
    if (!scene || !renderer) return;

    const lp = LIGHTING_PRESETS[lightingPreset];
    if (lights.key) {
      lights.key.color.setHex(lp.keyColor);
      lights.key.intensity = lp.keyIntensity;
    }
    if (lights.fill) {
      lights.fill.color.setHex(lp.fillColor);
      lights.fill.intensity = lp.fillIntensity;
    }
    if (lights.hemi) {
      lights.hemi.intensity = lp.hemiIntensity;
    }
    scene.environmentIntensity = lp.envIntensity;
    renderer.toneMappingExposure = lp.exposure;

    if (config.backdrop === 'white') {
      scene.background = new THREE.Color('#F4F6F8');
      scene.fog = new THREE.Fog('#F4F6F8', 9.0, 20);
      renderer.setClearColor(0xf4f6f8, 1);
      if (cycMesh && cycMat) {
        cycMesh.visible = true;
        cycMat.color.set('#EFF2F6');
      }
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity * 0.85;
      }
      if (shadowMat) shadowMat.opacity = 0.38;
    } else if (config.backdrop === 'dark') {
      scene.background = new THREE.Color('#13171E');
      scene.fog = new THREE.Fog('#13171E', 9.0, 20);
      renderer.setClearColor(0x13171e, 1);
      if (cycMesh && cycMat) {
        cycMesh.visible = true;
        cycMat.color.set('#141A23');
      }
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity * 1.45;
      }
      if (shadowMat) shadowMat.opacity = 0.78;
    } else if (config.backdrop === 'transparent') {
      scene.background = null;
      scene.fog = null;
      renderer.setClearColor(0x000000, 0);
      if (cycMesh) cycMesh.visible = false;
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity;
      }
      if (shadowMat) shadowMat.opacity = 0;
    } else {
      scene.background = new THREE.Color('#B5C8C7');
      scene.fog = new THREE.Fog('#B5C8C7', 9.0, 20);
      renderer.setClearColor(0xb5c8c7, 1);
      if (cycMesh && cycMat) {
        cycMesh.visible = true;
        cycMat.color.set('#AEC2C1');
      }
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity;
      }
      if (shadowMat) shadowMat.opacity = 0.62;
    }
    requestRenderRef.current();
  }, [config.backdrop, lightingPreset]);

  // Synchronize mouse & touch mode between Orbit (rotate) and Pan (drag canvas)
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (interactionMode === 'pan') {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
      controls.touches = {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
    } else {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
    }
  }, [interactionMode]);

  const snapCamera = useCallback((preset: CameraPresetId) => {
    setActivePreset(preset);
    autoRotateRef.current = false;
    setAutoRotate(false);
    const p = CAMERA_PRESETS[preset];
    _targetPos.set(p.pos[0], p.pos[1], p.pos[2]);
    _targetLook.set(p.target[0], p.target[1], p.target[2]);
    cameraTransitionRef.current = {
      active: true,
      pos: _targetPos.clone(),
      target: _targetLook.clone(),
    };
    requestRenderRef.current();
  }, []);

  // Swing camera on user-initiated placement switch (skipping deep-linked initial camera on mount)
  useEffect(() => {
    if (isFirstMountPlacementRef.current) {
      isFirstMountPlacementRef.current = false;
      return;
    }
    if (config.placement === 'left-sleeve') {
      snapCamera('hero');
    } else if (config.placement === 'right-sleeve') {
      snapCamera('right-sleeve');
    } else if (config.placement === 'left-chest') {
      snapCamera('left-chest');
    } else if (config.placement === 'center-back') {
      snapCamera('back');
    } else if (config.placement === 'chest-and-left-sleeve') {
      snapCamera('hero');
    } else {
      snapCamera('front');
    }
  }, [config.placement, snapCamera]);

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    autoRotateRef.current = next;
    setAutoRotate(next);
    if (next) {
      cameraTransitionRef.current.active = false;
      requestRenderRef.current();
    }
  };

  const handleCapture3D = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
      if (!blob) {
        onNotify('ไม่สามารถบันทึกภาพมุม 3D ได้');
        return;
      }
      const suffix =
        config.backdrop === 'transparent' ? 'transparent' : config.backdrop;
      triggerBlobDownload(
        blob,
        `polo-3d-${config.garmentStyle}-${config.logoVariant}-${suffix}.png`
      );
      onNotify(
        `บันทึกภาพเสื้อ 3D (polo-3d-${config.garmentStyle}-${suffix}.png) เรียบร้อยแล้ว`
      );
    }, 'image/png');
  };

  const applyColorway = (preset: GarmentColorwayPreset) => {
    onChangeConfig(
      applyAutoContrastForShirt({
        ...config,
        garmentStyle: preset.garmentStyle,
        fabricType: preset.fabricType,
        shirtColor: preset.shirtColor,
        collarColor: preset.collarColor,
        cuffColor: preset.cuffColor,
        tippingStyle: preset.tippingStyle,
        tippingColor: preset.tippingColor,
        placketColor: preset.placketColor,
        buttonColor: preset.buttonColor,
      })
    );
  };

  const handleZoneColorChange = (hex: string) => {
    if (colorZone === 'shirt') {
      const followPlacket =
        config.placketColor.toUpperCase() === config.shirtColor.toUpperCase();
      onChangeConfig(
        applyAutoContrastForShirt({
          ...config,
          shirtColor: hex,
          placketColor: followPlacket ? hex : config.placketColor,
        })
      );
    } else if (colorZone === 'collar') {
      const followCuff =
        config.cuffColor.toUpperCase() === config.collarColor.toUpperCase();
      onChangeConfig({
        ...config,
        collarColor: hex,
        cuffColor: followCuff ? hex : config.cuffColor,
      });
    } else if (colorZone === 'cuff') {
      onChangeConfig({ ...config, cuffColor: hex });
    } else if (colorZone === 'placket') {
      onChangeConfig({ ...config, placketColor: hex });
    } else {
      onChangeConfig({ ...config, buttonColor: hex });
    }
  };

  const activeZoneColor =
    colorZone === 'shirt'
      ? config.shirtColor
      : colorZone === 'collar'
        ? config.collarColor
        : colorZone === 'cuff'
          ? config.cuffColor
          : colorZone === 'placket'
            ? config.placketColor
            : config.buttonColor;

  const activeZonePresets =
    colorZone === 'shirt' || colorZone === 'placket'
      ? SHIRT_COLOR_PRESETS
      : colorZone === 'button'
        ? BUTTON_COLOR_PRESETS
        : COLLAR_COLOR_PRESETS;

  const chestSvgs = RATCHASIT_SVG_CATALOG.filter((i) => i.category === 'chest');
  const sleeveSvgs = RATCHASIT_SVG_CATALOG.filter((i) => i.category === 'sleeve');

  const containerBackdropStyle: React.CSSProperties =
    config.backdrop === 'transparent'
      ? {
          backgroundColor: '#F3F4F6',
          backgroundImage:
            'linear-gradient(45deg, #E1E5E9 25%, transparent 25%), linear-gradient(-45deg, #E1E5E9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E1E5E9 75%), linear-gradient(-45deg, transparent 75%, #E1E5E9 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }
      : config.backdrop === 'white'
        ? { backgroundColor: '#F4F6F8' }
        : config.backdrop === 'dark'
          ? { backgroundColor: '#13171E' }
          : { backgroundColor: '#B5C8C7' };

  return (
    <div
      className="relative h-[530px] sm:h-[570px] lg:h-[600px] w-full overflow-hidden select-none"
      style={containerBackdropStyle}
    >
      {/* Dedicated isolated WebGL mount */}
      <div
        ref={mountRef}
        className={`w-full h-full ${
          interactionMode === 'pan'
            ? 'cursor-move'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        aria-label="มุมมองเสื้อ 3 มิติแบบสมจริง หมุนและแพนภาพได้ 360 องศา"
      />

      {contextLost && (
        <div className="absolute inset-0 bg-[#B5C8C7] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-[#111827]">
            WebGL หยุดทำงานชั่วคราว
          </p>
          <p className="text-xs text-[#374151] mt-1">
            สลับไปใช้โหมด “ม็อกอัพ 4 มุม” หรือรีเฟรชหน้าเว็บเพื่อดูแบบ 3 มิติอีกครั้ง
          </p>
        </div>
      )}

      {/* Top-Left Quick Studio Toggle + Hint Pill */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStudioOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
            studioOpen
              ? 'bg-[#1B314D] text-white border-[#1B314D]'
              : 'bg-white text-[#111827] border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          {studioOpen ? (
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1B314D]" aria-hidden="true" />
          )}
          {studioOpen ? 'ซ่อนแผงแต่ง 3D' : 'แต่งทรง / สีเสื้อ 3D'}
        </button>

        {!studioOpen && (
          <div className="hidden sm:block pointer-events-none px-2.5 py-1.5 rounded-md bg-[#111827]/82 text-white text-[11px] font-medium">
            ลากซ้ายหมุน 360° · คลิกขวาหรือกด “แพน” เพื่อเลื่อนภาพ · เลื่อนลูกกลิ้งซูม
          </div>
        )}
      </div>

      {/* Collapsible Quick 3D Studio Panel (Garment, Fabric, 5-Zone Color, Dual Kit) */}
      {studioOpen && (
        <aside
          aria-label="แผงปรับแต่งเสื้อ 3D ด่วน"
          className="absolute top-12 left-3.5 z-10 w-[290px] sm:w-[308px] max-h-[calc(100%-112px)] overflow-y-auto bg-white border border-zinc-200/95 rounded-xl shadow-lg p-3 space-y-2.5 text-xs"
        >
          {/* 1. Garment Silhouette */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#111827] inline-flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-[#1B314D]" aria-hidden="true" />
                ทรงเสื้อ 3 มิติ
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                {config.garmentStyle === 'polo' ? 'Polo' : 'Stand-Collar'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#EAEFEF] rounded-lg">
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({ ...config, garmentStyle: 'polo' })
                }
                className={`py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                  config.garmentStyle === 'polo'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B63] hover:text-[#111827]'
                }`}
              >
                เสื้อโปโลปกพับ
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({ ...config, garmentStyle: 'stand-collar' })
                }
                className={`py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                  config.garmentStyle === 'stand-collar'
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B63] hover:text-[#111827]'
                }`}
              >
                คอตั้ง + กระเป๋าอก
              </button>
            </div>
          </div>

          {/* 2. PBR Fabric Type */}
          <div className="space-y-1.5">
            <span className="block font-semibold text-[#111827]">
              เนื้อผ้า (PBR Weave)
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAEFEF] rounded-lg">
              {FABRIC_TYPE_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  title={f.shortDesc}
                  onClick={() => onChangeConfig({ ...config, fabricType: f.id })}
                  className={`py-1 px-1.5 text-[10.5px] font-medium rounded-md transition-colors truncate cursor-pointer ${
                    config.fabricType === f.id
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#525B63] hover:text-[#111827]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 8 Quick Colorways */}
          <div className="space-y-1.5">
            <span className="block font-semibold text-[#111827]">
              ชุดสีสำเร็จรูป (คลิกสลับทันที)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {GARMENT_COLORWAY_PRESETS.map((preset) => {
                const isActive =
                  config.shirtColor.toUpperCase() ===
                    preset.shirtColor.toUpperCase() &&
                  config.collarColor.toUpperCase() ===
                    preset.collarColor.toUpperCase() &&
                  config.garmentStyle === preset.garmentStyle;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyColorway(preset)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#1B314D] bg-[#F4F7FA] ring-1 ring-[#1B314D]'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <span className="flex items-center shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: preset.shirtColor }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 -ml-1"
                        style={{
                          backgroundColor:
                            preset.tippingStyle !== 'none'
                              ? preset.tippingColor
                              : preset.collarColor,
                        }}
                      />
                    </span>
                    <span className="text-[10.5px] font-medium text-[#111827] truncate">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 5-Zone Garment Color Switcher */}
          <div className="space-y-2 pt-1 border-t border-zinc-200/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#111827] inline-flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-[#1B314D]" aria-hidden="true" />
                ปรับสีแยก 5 ชิ้นส่วน
              </span>
              <span className="font-mono text-[10px] uppercase text-[#525B63]">
                {activeZoneColor}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'shirt', label: 'ตัวเสื้อ' },
                  { id: 'collar', label: 'ปกคอ' },
                  { id: 'cuff', label: 'ปลายแขน' },
                  { id: 'placket', label: 'สาบ' },
                  { id: 'button', label: 'กระดุม' },
                ] as Array<{ id: ColorZoneTab; label: string }>
              ).map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setColorZone(z.id)}
                  className={`px-2 py-1 text-[10.5px] font-medium rounded-md border transition-colors cursor-pointer ${
                    colorZone === z.id
                      ? 'bg-[#1B314D] text-white border-[#1B314D]'
                      : 'bg-white text-[#374151] border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {activeZonePresets.map((p) => {
                const selected =
                  activeZoneColor.toUpperCase() === p.hex.toUpperCase();
                return (
                  <button
                    key={`${colorZone}-${p.hex}`}
                    type="button"
                    title={p.name}
                    aria-label={`${colorZone} ${p.name}`}
                    onClick={() => handleZoneColorChange(p.hex)}
                    className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                      selected
                        ? 'border-[#1B314D] ring-2 ring-[#1B314D]/45 scale-110'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
              <label className="inline-flex items-center gap-1 px-1.5 h-5 text-[10px] rounded border border-zinc-200 bg-white text-[#374151] cursor-pointer">
                <input
                  type="color"
                  value={activeZoneColor}
                  onChange={(e) => handleZoneColorChange(e.target.value)}
                  className="w-3.5 h-3.5 p-0 border-0 bg-transparent cursor-pointer"
                  aria-label="กำหนดสีเอง"
                />
                สีอื่น
              </label>
            </div>

            {(colorZone === 'collar' || colorZone === 'cuff') && (
              <div className="space-y-1.5 pt-1 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-medium text-[#525B63]">
                    เส้นขลิบปก/ปลายแขน
                  </span>
                  {config.tippingStyle !== 'none' && (
                    <label className="inline-flex items-center gap-1 text-[10px] text-[#374151] cursor-pointer">
                      <input
                        type="color"
                        value={config.tippingColor}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            tippingColor: e.target.value,
                          })
                        }
                        className="w-3.5 h-3.5 p-0 border-0 bg-transparent cursor-pointer"
                        aria-label="สีเส้นขลิบ"
                      />
                      {config.tippingColor.toUpperCase()}
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {TIPPING_STYLE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        onChangeConfig({
                          ...config,
                          tippingStyle: t.id as TippingStyle,
                        })
                      }
                      className={`py-1 px-1 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                        config.tippingStyle === t.id
                          ? 'bg-[#1B314D] text-white border-[#1B314D]'
                          : 'bg-white text-[#374151] border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Auto-Contrast Toggle + Ratchasit 62 Dual-Kit Quick Selector */}
          <div className="space-y-2 pt-1 border-t border-zinc-200/80">
            <button
              type="button"
              onClick={() => {
                const nextAuto = !config.autoContrastLogo;
                const updated = { ...config, autoContrastLogo: nextAuto };
                onChangeConfig(
                  nextAuto ? applyAutoContrastForShirt(updated) : updated
                );
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10.5px] font-medium transition-colors cursor-pointer ${
                config.autoContrastLogo
                  ? 'border-[#1B314D]/35 bg-[#F4F7FA] text-[#1B314D]'
                  : 'border-zinc-200 bg-white text-[#525B63] hover:bg-zinc-50'
              }`}
            >
              <span>ปรับสีโลโก้ตัดสีเสื้ออัตโนมัติ</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                  config.autoContrastLogo
                    ? 'bg-[#1B314D] text-white'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {config.autoContrastLogo ? 'เปิด' : 'ปิด'}
              </span>
            </button>

            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-[#111827]">
                โหมดติดคู่จริง (รุ่น 62)
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    placement: 'chest-and-left-sleeve',
                  })
                }
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                  config.placement === 'chest-and-left-sleeve'
                    ? 'bg-[#1B314D] text-white'
                    : 'bg-[#EEF2F5] text-[#1B314D] hover:bg-[#DCE4EA]'
                }`}
              >
                {config.placement === 'chest-and-left-sleeve'
                  ? 'กำลังติดคู่'
                  : 'เปิดติดคู่'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div>
                <div className="text-[10.5px] text-[#525B63] mb-1">
                  ตราอกซ้าย / กระเป๋าอก
                </div>
                <div className="flex flex-wrap gap-1">
                  {chestSvgs.map((item) => {
                    const selected =
                      config.placement === 'chest-and-left-sleeve'
                        ? config.chestLogoVariant === item.id
                        : config.logoVariant === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          onChangeConfig({
                            ...config,
                            placement: 'chest-and-left-sleeve',
                            chestLogoVariant: item.id,
                            logoVariant: item.id,
                            chestWidthCm: item.defaultWidthCm,
                          })
                        }
                        className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#1B314D] text-white border-[#1B314D]'
                            : 'bg-white text-[#374151] border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {item.shortTitle.replace('อกซ้าย ', '')}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        placement: 'chest-and-left-sleeve',
                        chestLogoVariant: 'none',
                      })
                    }
                    className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                      config.placement === 'chest-and-left-sleeve' &&
                      config.chestLogoVariant === 'none'
                        ? 'bg-[#1B314D] text-white border-[#1B314D]'
                        : 'bg-white text-[#525B63] border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    ปิด
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10.5px] text-[#525B63] mb-1">
                  ตราแขนซ้าย (กบไสไม้ 3/4 Iso)
                </div>
                <div className="flex flex-wrap gap-1">
                  {sleeveSvgs.map((item) => {
                    const selected =
                      config.placement === 'chest-and-left-sleeve'
                        ? config.sleeveLogoVariant === item.id
                        : config.logoVariant === item.id;
                    const code = item.id.replace('rs62-sleeve-', '').toUpperCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.title}
                        onClick={() =>
                          onChangeConfig({
                            ...config,
                            placement: 'chest-and-left-sleeve',
                            sleeveLogoVariant: item.id,
                            sleeveWidthCm: item.defaultWidthCm,
                          })
                        }
                        className={`px-2 py-1 text-[10px] font-mono font-semibold rounded border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#1B314D] text-white border-[#1B314D]'
                            : 'bg-white text-[#374151] border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig({
                        ...config,
                        placement: 'chest-and-left-sleeve',
                        sleeveLogoVariant: 'none',
                      })
                    }
                    className={`px-2 py-1 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                      config.placement === 'chest-and-left-sleeve' &&
                      config.sleeveLogoVariant === 'none'
                        ? 'bg-[#1B314D] text-white border-[#1B314D]'
                        : 'bg-white text-[#525B63] border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Top-Right Studio Lighting Switch */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 p-1 rounded-lg bg-white/95 border border-zinc-200/90 shadow-xs">
        <Sun className="w-3.5 h-3.5 text-[#525B63] ml-1.5 mr-0.5" aria-hidden="true" />
        {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLightingPreset(id)}
            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              lightingPreset === id
                ? 'bg-[#1B314D] text-white'
                : 'text-[#374151] hover:bg-zinc-100'
            }`}
          >
            {LIGHTING_PRESETS[id].label}
          </button>
        ))}
      </div>

      {/* Bottom Single-Row Camera & Snapshot Dock */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 max-w-[96%] z-10 flex flex-nowrap overflow-x-auto items-center gap-1 p-1 rounded-xl bg-white/95 border border-zinc-200/90 shadow-sm">
        {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => snapCamera(key)}
            className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePreset === key && !autoRotate
                ? 'bg-[#1B314D] text-white'
                : 'text-[#374151] hover:bg-zinc-100'
            }`}
          >
            {CAMERA_PRESETS[key].label}
          </button>
        ))}

        <span aria-hidden="true" className="w-px h-4 bg-zinc-200 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={() =>
            setInteractionMode((mode) => (mode === 'pan' ? 'orbit' : 'pan'))
          }
          title="สลับโหมดลากเลื่อนภาพ (Pan)"
          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            interactionMode === 'pan'
              ? 'bg-[#1B314D] text-white'
              : 'text-[#374151] hover:bg-zinc-100'
          }`}
        >
          <Move className="w-3 h-3" aria-hidden="true" />
          แพน
        </button>

        <button
          type="button"
          onClick={toggleAutoRotate}
          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            autoRotate
              ? 'bg-[#1B314D] text-white'
              : 'text-[#374151] hover:bg-zinc-100'
          }`}
        >
          {autoRotate ? (
            <Pause className="w-3 h-3" aria-hidden="true" />
          ) : (
            <Play className="w-3 h-3" aria-hidden="true" />
          )}
          {autoRotate ? 'หยุดหมุน' : 'หมุน 360°'}
        </button>

        <button
          type="button"
          onClick={() => snapCamera('hero')}
          aria-label="รีเซ็ตมุมกล้อง"
          className="p-1 text-[#374151] hover:bg-zinc-100 rounded-lg transition-colors shrink-0 cursor-pointer"
          title="รีเซ็ตมุมกล้อง 3/4"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleCapture3D}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1B314D] bg-[#EEF2F5] hover:bg-[#1B314D] hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          บันทึกภาพ 3D
        </button>
      </div>
    </div>
  );
};
