import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Camera, Pause, Play, RotateCcw, Sun } from 'lucide-react';
import {
  buildCustomizedLogoCanvas,
  getColorLuminance,
  getLogoVariantMeta,
  type PoloDesignConfig,
} from '../utils/sleeveLogoComposer';
import { triggerBlobDownload } from '../utils/canvasExport';
import {
  createCottonPiquePBRMaps,
  createCurvedPlacketGeometry,
  createDetailedButtonGroup,
  createInnerNeckLabelTexture,
  createPhotorealTorsoGeometry,
  createPhotoStudioEnvironment,
  createRibbedCuffGeometry,
  createRibKnitNormalMap,
  createSculptedPoloCollarGeometry,
  createSculptedSleeveGeometry,
  sampleTorsoFrontSurfaceZ,
} from '../utils/polo3DBuilder';

interface Polo3DViewerProps {
  config: PoloDesignConfig;
  onNotify: (message: string) => void;
}

type CameraPresetId =
  | 'hero'
  | 'front'
  | 'left-sleeve'
  | 'left-chest'
  | 'back'
  | 'right-sleeve';

type LightingPresetId = 'softbox' | 'showroom' | 'warm';

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  hero: {
    label: 'มุมเฉียง 3/4',
    pos: [1.55, 0.34, 2.85],
    target: [0.06, 0.06, 0],
  },
  front: {
    label: 'ด้านหน้า',
    pos: [0, 0.22, 3.15],
    target: [0, 0.05, 0],
  },
  'left-sleeve': {
    label: 'ซูมแขนซ้าย',
    pos: [2.15, 0.42, 0.92],
    target: [0.68, 0.34, 0.02],
  },
  'left-chest': {
    label: 'ซูมอกซ้าย',
    pos: [0.62, 0.38, 1.88],
    target: [0.18, 0.26, 0.16],
  },
  back: {
    label: 'ด้านหลัง',
    pos: [0, 0.22, -3.15],
    target: [0, 0.05, 0],
  },
  'right-sleeve': {
    label: 'ซูมแขนขวา',
    pos: [-2.15, 0.42, 0.92],
    target: [-0.68, 0.34, 0.02],
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
    keyIntensity: 1.48,
    fillColor: 0xe6f0fa,
    fillIntensity: 0.62,
    rimColor: 0xdcebf7,
    rimIntensity: 0.85,
    hemiIntensity: 0.72,
    envIntensity: 0.56,
    exposure: 1.04,
  },
  showroom: {
    label: 'โชว์รูมคมชัด',
    keyColor: 0xffffff,
    keyIntensity: 1.85,
    fillColor: 0xdbeafe,
    fillIntensity: 0.48,
    rimColor: 0xf0f9ff,
    rimIntensity: 1.15,
    hemiIntensity: 0.54,
    envIntensity: 0.68,
    exposure: 1.08,
  },
  warm: {
    label: 'แสงอุ่นธรรมชาติ',
    keyColor: 0xffecd2,
    keyIntensity: 1.62,
    fillColor: 0xfef3e2,
    fillIntensity: 0.55,
    rimColor: 0xdbeafe,
    rimIntensity: 0.78,
    hemiIntensity: 0.68,
    envIntensity: 0.52,
    exposure: 1.06,
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

/** Soft elliptical ground contact shadow texture for floating ghost-mannequin presentation */
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
    grad.addColorStop(0, 'rgba(15, 23, 34, 0.42)');
    grad.addColorStop(0.45, 'rgba(15, 23, 34, 0.16)');
    grad.addColorStop(0.8, 'rgba(15, 23, 34, 0.04)');
    grad.addColorStop(1, 'rgba(15, 23, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Paints tailored stitching & 3 recessed horizontal buttonholes onto the placket texture */
function paintPlacketCanvas(
  canvas: HTMLCanvasElement,
  shirtColor: string,
  isLight: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle folded center seam shadow
  const seamGrad = ctx.createLinearGradient(0, 0, w, 0);
  seamGrad.addColorStop(0, 'rgba(0,0,0,0.09)');
  seamGrad.addColorStop(0.12, 'rgba(0,0,0,0)');
  seamGrad.addColorStop(0.88, 'rgba(0,0,0,0)');
  seamGrad.addColorStop(1, 'rgba(0,0,0,0.11)');
  ctx.fillStyle = seamGrad;
  ctx.fillRect(0, 0, w, h);

  // Crisp twin-needle box-stitch perimeter along placket edges
  const stitchColor = isLight
    ? 'rgba(20, 30, 44, 0.24)'
    : 'rgba(255, 255, 255, 0.22)';
  ctx.strokeStyle = stitchColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(14, 6, w - 28, h - 18);

  // Bottom bar-tack reinforcement box (classic polo tailoring detail)
  ctx.strokeRect(14, h - 54, w - 28, 42);
  ctx.setLineDash([]);

  // Three horizontal stitched buttonholes aligned with the 3 sculpted buttons
  const holeYs = [h * 0.14, h * 0.44, h * 0.74];
  for (const hy of holeYs) {
    ctx.fillStyle = isLight ? 'rgba(15,23,42,0.38)' : 'rgba(0,0,0,0.55)';
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
  onNotify,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('hero');
  const [lightingPreset, setLightingPreset] =
    useState<LightingPresetId>('softbox');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);

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
  const requestRenderRef = useRef<() => void>(() => {});
  const autoRotateRef = useRef<boolean>(false);
  const cameraTransitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.hero.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.hero.target),
  });

  // Dynamic PBR material & canvas texture refs so config updates never recreate WebGL
  const materialsRef = useRef<{
    torsoMat: THREE.MeshPhysicalMaterial | null;
    leftSleeveMat: THREE.MeshPhysicalMaterial | null;
    rightSleeveMat: THREE.MeshPhysicalMaterial | null;
    trimMat: THREE.MeshPhysicalMaterial | null;
    placketMat: THREE.MeshPhysicalMaterial | null;
    torsoCanvas: HTMLCanvasElement | null;
    leftSleeveCanvas: HTMLCanvasElement | null;
    rightSleeveCanvas: HTMLCanvasElement | null;
    placketCanvas: HTMLCanvasElement | null;
    torsoTex: THREE.CanvasTexture | null;
    leftSleeveTex: THREE.CanvasTexture | null;
    rightSleeveTex: THREE.CanvasTexture | null;
    placketTex: THREE.CanvasTexture | null;
  }>({
    torsoMat: null,
    leftSleeveMat: null,
    rightSleeveMat: null,
    trimMat: null,
    placketMat: null,
    torsoCanvas: null,
    leftSleeveCanvas: null,
    rightSleeveCanvas: null,
    placketCanvas: null,
    torsoTex: null,
    leftSleeveTex: null,
    rightSleeveTex: null,
    placketTex: null,
  });

  const paintTextures = useCallback(async (cfg: PoloDesignConfig) => {
    const m = materialsRef.current;
    if (
      !m.torsoCanvas ||
      !m.leftSleeveCanvas ||
      !m.rightSleeveCanvas ||
      !m.placketCanvas ||
      !m.torsoTex ||
      !m.leftSleeveTex ||
      !m.rightSleeveTex ||
      !m.placketTex ||
      !m.torsoMat ||
      !m.leftSleeveMat ||
      !m.rightSleeveMat ||
      !m.trimMat ||
      !m.placketMat
    ) {
      return;
    }

    const logoCanvas = await buildCustomizedLogoCanvas(cfg);
    const logoAspect = logoCanvas.height / Math.max(1, logoCanvas.width);
    const shirtLuma = getColorLuminance(cfg.shirtColor);
    const isLight = shirtLuma > 160;
    const hasWhiteShield = getLogoVariantMeta(cfg.logoVariant).hasWhiteShield;
    const useMultiply = hasWhiteShield
      ? shirtLuma > 210
      : (cfg.logoVariant !== 'gable-62' || cfg.style === 'embroidery') &&
        isLight;

    // Helper: fill cotton piqué base color + realistic subtle sewn tailoring seams & AO
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

      // Subtle micro cotton piqué grain modulation baked in albedo
      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.014)' : 'rgba(255,255,255,0.018)';
      for (let x = 0; x < cw; x += 6) {
        ctx.fillRect(x, 0, 2, ch);
      }

      if (mode === 'torso') {
        // Subtle ambient occlusion shading right beneath folded polo collar (top edge y=0..90)
        const collarAO = ctx.createLinearGradient(0, 0, 0, ch * 0.12);
        collarAO.addColorStop(0, 'rgba(10, 18, 30, 0.24)');
        collarAO.addColorStop(0.55, 'rgba(10, 18, 30, 0.06)');
        collarAO.addColorStop(1, 'rgba(10, 18, 30, 0)');
        ctx.fillStyle = collarAO;
        ctx.fillRect(0, 0, cw, ch * 0.12);

        // Subtle side tailoring seam lines at u = 0.25 and u = 0.75
        const seamStroke = isLight
          ? 'rgba(15, 23, 42, 0.09)'
          : 'rgba(255, 255, 255, 0.11)';
        ctx.strokeStyle = seamStroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        for (const uSide of [0.25, 0.75]) {
          ctx.beginPath();
          ctx.moveTo(cw * uSide, ch * 0.34);
          ctx.lineTo(cw * uSide, ch - 36);
          ctx.stroke();
        }

        // Twin-needle lower hem stitch lines
        for (const offset of [28, 38]) {
          ctx.beginPath();
          ctx.moveTo(0, ch - offset);
          ctx.lineTo(cw, ch - offset);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else {
        // Subtle cuff seam shading right above the ribbed knit sleeve cuff (bottom edge)
        const cuffAO = ctx.createLinearGradient(0, ch * 0.9, 0, ch);
        cuffAO.addColorStop(0, 'rgba(10, 18, 30, 0)');
        cuffAO.addColorStop(1, 'rgba(10, 18, 30, 0.14)');
        ctx.fillStyle = cuffAO;
        ctx.fillRect(0, ch * 0.9, cw, ch * 0.1);

        // Twin-needle coverstitch seam right above cuff rib
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
      cx: number,
      cy: number,
      dw: number,
      dh: number
    ) => {
      ctx.save();
      if (useMultiply) {
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        if (hasWhiteShield || cfg.style === 'navy-patch') {
          ctx.shadowColor = 'rgba(10, 18, 30, 0.24)';
          ctx.shadowBlur = Math.max(2, dw * 0.028);
          ctx.shadowOffsetY = 2;
        }
      }
      ctx.drawImage(logoCanvas, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
    };

    // 1. High-Res Torso Texture (2048 × 2048)
    const tCtx = fillFabric(m.torsoCanvas, 'torso');
    if (tCtx) {
      const tw = m.torsoCanvas.width;
      const th = m.torsoCanvas.height;
      // Front torso width across ~42% of circumference represents ~48 cm
      const chestPxPerCm = (tw * 0.42) / 48;
      const chestWidthCm =
        cfg.placement === 'chest-and-left-sleeve'
          ? Math.max(6.8, cfg.widthCm * 1.65)
          : cfg.widthCm;

      const drawOnTorso = (uCenter: number, vCanvasY: number, wCm: number) => {
        const dw = wCm * chestPxPerCm;
        const dh = dw * logoAspect;
        const cx = uCenter * tw + cfg.horizontalShift * tw * 0.08;
        const cy =
          vCanvasY * th - (cfg.gapAboveBandCm - 1.0) * chestPxPerCm * 1.5;
        drawLogoCrisp(tCtx, cx, cy, dw, dh);
      };

      if (
        cfg.placement === 'left-chest' ||
        cfg.placement === 'chest-and-left-sleeve'
      ) {
        // Wearer's left chest (+X, +Z) sits cleanly at u = 0.605
        drawOnTorso(0.605, 0.34, chestWidthCm);
      } else if (cfg.placement === 'right-chest') {
        drawOnTorso(0.395, 0.34, chestWidthCm);
      } else if (cfg.placement === 'center-back') {
        // Back center (-Z) wraps across u = 0 / 1 seam
        drawOnTorso(0.0, 0.29, chestWidthCm);
        drawOnTorso(1.0, 0.29, chestWidthCm);
      }
    }

    // 2. High-Res Left Sleeve Texture (1536 × 768) — outer left face at u = 0.75
    const lsCtx = fillFabric(m.leftSleeveCanvas, 'sleeve');
    if (lsCtx) {
      if (
        cfg.placement === 'left-sleeve' ||
        cfg.placement === 'chest-and-left-sleeve'
      ) {
        const sw = m.leftSleeveCanvas.width;
        const sh = m.leftSleeveCanvas.height;
        const pxPerCmX = sw / 34;
        const pxPerCmY = sh / 22;
        const wCm =
          cfg.placement === 'chest-and-left-sleeve'
            ? Math.min(5.0, cfg.widthCm)
            : cfg.widthCm;
        const dw = wCm * pxPerCmX;
        const dh = dw * logoAspect * (pxPerCmY / pxPerCmX);

        const cx = sw * 0.75 + cfg.horizontalShift * sw * 0.14;
        const cy = sh - cfg.gapAboveBandCm * pxPerCmY - dh / 2 - 14;
        drawLogoCrisp(lsCtx, cx, cy, dw, dh);
      }
    }

    // 3. High-Res Right Sleeve Texture (1536 × 768) — outer right face at u = 0.25
    const rsCtx = fillFabric(m.rightSleeveCanvas, 'sleeve');
    if (rsCtx) {
      if (cfg.placement === 'right-sleeve') {
        const sw = m.rightSleeveCanvas.width;
        const sh = m.rightSleeveCanvas.height;
        const pxPerCmX = sw / 34;
        const pxPerCmY = sh / 22;
        const dw = cfg.widthCm * pxPerCmX;
        const dh = dw * logoAspect * (pxPerCmY / pxPerCmX);

        const cx = sw * 0.25 + cfg.horizontalShift * sw * 0.14;
        const cy = sh - cfg.gapAboveBandCm * pxPerCmY - dh / 2 - 14;
        drawLogoCrisp(rsCtx, cx, cy, dw, dh);
      }
    }

    // 4. Stitched Placket Texture
    paintPlacketCanvas(m.placketCanvas, cfg.shirtColor, isLight);

    // 5. Update physical fabric sheen tint (slightly lighter than base fabric for cotton peach-fuzz scatter)
    const fabricSheen = new THREE.Color(cfg.shirtColor).lerp(
      new THREE.Color('#FFFFFF'),
      isLight ? 0.5 : 0.35
    );
    const collarSheen = new THREE.Color(cfg.collarColor).lerp(
      new THREE.Color('#FFFFFF'),
      0.32
    );
    m.torsoMat.sheenColor.copy(fabricSheen);
    m.leftSleeveMat.sheenColor.copy(fabricSheen);
    m.rightSleeveMat.sheenColor.copy(fabricSheen);
    m.placketMat.sheenColor.copy(fabricSheen);
    m.trimMat.color.set(cfg.collarColor);
    m.trimMat.sheenColor.copy(collarSheen);

    m.torsoTex.needsUpdate = true;
    m.leftSleeveTex.needsUpdate = true;
    m.rightSleeveTex.needsUpdate = true;
    m.placketTex.needsUpdate = true;
    requestRenderRef.current();
  }, []);

  // Initialize Three.js Photorealistic Studio Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#B5C8C7');
    scene.fog = new THREE.Fog('#B5C8C7', 8.5, 18);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 40);
    camera.position.set(...CAMERA_PRESETS.hero.pos);
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

    // Custom Procedural Photo Studio Softbox IBL Environment
    const envTex = createPhotoStudioEnvironment(renderer);
    scene.environment = envTex;
    scene.environmentIntensity = LIGHTING_PRESETS.softbox.envIntensity;

    // 4-Light Fashion Photography Rig (Hemisphere + Warm Key + Cool Fill + Sculpting Rim)
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
    keyLight.position.set(3.4, 4.6, 4.0);
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

    // Procedural Cotton Piqué + Rib-Knit PBR Texture Maps
    const { normalMap: piqueNormalMap, roughnessMap: piqueRoughnessMap } =
      createCottonPiquePBRMaps();
    const ribNormalMap = createRibKnitNormalMap();
    const innerLabelTex = createInnerNeckLabelTexture();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const torsoCanvas = document.createElement('canvas');
    torsoCanvas.width = 2048;
    torsoCanvas.height = 2048;
    const torsoTex = new THREE.CanvasTexture(torsoCanvas);
    torsoTex.colorSpace = THREE.SRGBColorSpace;
    torsoTex.anisotropy = maxAniso;

    const leftSleeveCanvas = document.createElement('canvas');
    leftSleeveCanvas.width = 1536;
    leftSleeveCanvas.height = 768;
    const leftSleeveTex = new THREE.CanvasTexture(leftSleeveCanvas);
    leftSleeveTex.colorSpace = THREE.SRGBColorSpace;
    leftSleeveTex.anisotropy = maxAniso;

    const rightSleeveCanvas = document.createElement('canvas');
    rightSleeveCanvas.width = 1536;
    rightSleeveCanvas.height = 768;
    const rightSleeveTex = new THREE.CanvasTexture(rightSleeveCanvas);
    rightSleeveTex.colorSpace = THREE.SRGBColorSpace;
    rightSleeveTex.anisotropy = maxAniso;

    const placketCanvas = document.createElement('canvas');
    placketCanvas.width = 256;
    placketCanvas.height = 512;
    const placketTex = new THREE.CanvasTexture(placketCanvas);
    placketTex.colorSpace = THREE.SRGBColorSpace;
    placketTex.anisotropy = maxAniso;

    // Physically-Based Fabric Materials (MeshPhysicalMaterial with micro-fiber sheen)
    const torsoMat = new THREE.MeshPhysicalMaterial({
      map: torsoTex,
      normalMap: piqueNormalMap,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughnessMap: piqueRoughnessMap,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.65,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color('#FFFFFF'),
      side: THREE.DoubleSide,
    });

    const leftSleeveMat = new THREE.MeshPhysicalMaterial({
      map: leftSleeveTex,
      normalMap: piqueNormalMap,
      normalScale: new THREE.Vector2(0.36, 0.36),
      roughnessMap: piqueRoughnessMap,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.65,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color('#FFFFFF'),
      side: THREE.DoubleSide,
    });

    const rightSleeveMat = new THREE.MeshPhysicalMaterial({
      map: rightSleeveTex,
      normalMap: piqueNormalMap,
      normalScale: new THREE.Vector2(0.36, 0.36),
      roughnessMap: piqueRoughnessMap,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.65,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color('#FFFFFF'),
      side: THREE.DoubleSide,
    });

    const trimMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.collarColor),
      normalMap: ribNormalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.86,
      metalness: 0.0,
      sheen: 0.58,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color('#CBD5E1'),
      side: THREE.DoubleSide,
    });

    const placketMat = new THREE.MeshPhysicalMaterial({
      map: placketTex,
      normalMap: piqueNormalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.9,
      metalness: 0.0,
      sheen: 0.58,
      sheenRoughness: 0.74,
      sheenColor: new THREE.Color('#FFFFFF'),
    });

    // Glossy pearlized dark horn buttons with clearcoat
    const buttonMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#191D24'),
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    });

    const buttonThreadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B4554'),
      roughness: 0.85,
      metalness: 0,
    });

    const innerNeckMat = new THREE.MeshStandardMaterial({
      map: innerLabelTex,
      roughness: 0.94,
      metalness: 0,
      side: THREE.BackSide,
    });

    materialsRef.current = {
      torsoMat,
      leftSleeveMat,
      rightSleeveMat,
      trimMat,
      placketMat,
      torsoCanvas,
      leftSleeveCanvas,
      rightSleeveCanvas,
      placketCanvas,
      torsoTex,
      leftSleeveTex,
      rightSleeveTex,
      placketTex,
    };

    // Assemble Photorealistic Sculpted Polo Garment Group
    const poloGroup = new THREE.Group();
    poloGroup.position.set(0, 0.05, 0);
    scene.add(poloGroup);

    const disposableGeos: THREE.BufferGeometry[] = [];

    // 1. Sculpted Anatomical Torso
    const torsoGeo = createPhotorealTorsoGeometry();
    disposableGeos.push(torsoGeo);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.castShadow = !isSoftwareGl;
    torsoMesh.receiveShadow = !isSoftwareGl;
    poloGroup.add(torsoMesh);

    // 2. Inner Neck Woven Yoke & Brand Label Lining
    const innerNeckGeo = new THREE.CylinderGeometry(0.236, 0.285, 0.26, 40, 2, true);
    disposableGeos.push(innerNeckGeo);
    const innerNeckMesh = new THREE.Mesh(innerNeckGeo, innerNeckMat);
    innerNeckMesh.position.set(0, 0.71, -0.008);
    innerNeckMesh.scale.set(1.0, 1.0, 0.84);
    poloGroup.add(innerNeckMesh);

    // 3. Sculpted Left Sleeve (+X wearer's left) + Thick Ribbed Cuff
    const leftSleeveGeo = createSculptedSleeveGeometry('left');
    const cuffGeo = createRibbedCuffGeometry();
    disposableGeos.push(leftSleeveGeo, cuffGeo);

    const leftSleeveGroup = new THREE.Group();
    leftSleeveGroup.position.set(0.60, 0.435, 0.008);
    leftSleeveGroup.rotation.set(0.03, 0, 0.54);
    const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, leftSleeveMat);
    leftSleeveMesh.castShadow = !isSoftwareGl;
    leftSleeveMesh.receiveShadow = !isSoftwareGl;
    const leftCuffMesh = new THREE.Mesh(cuffGeo, trimMat);
    leftCuffMesh.position.set(0, -0.305, 0);
    leftCuffMesh.castShadow = !isSoftwareGl;
    leftSleeveGroup.add(leftSleeveMesh, leftCuffMesh);
    poloGroup.add(leftSleeveGroup);

    // 4. Sculpted Right Sleeve (-X wearer's right) + Thick Ribbed Cuff
    const rightSleeveGeo = createSculptedSleeveGeometry('right');
    disposableGeos.push(rightSleeveGeo);

    const rightSleeveGroup = new THREE.Group();
    rightSleeveGroup.position.set(-0.60, 0.435, 0.008);
    rightSleeveGroup.rotation.set(0.03, 0, -0.54);
    const rightSleeveMesh = new THREE.Mesh(rightSleeveGeo, rightSleeveMat);
    rightSleeveMesh.castShadow = !isSoftwareGl;
    rightSleeveMesh.receiveShadow = !isSoftwareGl;
    const rightCuffMesh = new THREE.Mesh(cuffGeo, trimMat);
    rightCuffMesh.position.set(0, -0.305, 0);
    rightCuffMesh.castShadow = !isSoftwareGl;
    rightSleeveGroup.add(rightSleeveMesh, rightCuffMesh);
    poloGroup.add(rightSleeveGroup);

    // 5. Continuous Sculpted 3D Fold-Over Polo Collar with Pointed Front Lapels
    const collarGeo = createSculptedPoloCollarGeometry();
    disposableGeos.push(collarGeo);
    const collarMesh = new THREE.Mesh(collarGeo, trimMat);
    collarMesh.castShadow = !isSoftwareGl;
    collarMesh.receiveShadow = !isSoftwareGl;
    poloGroup.add(collarMesh);

    // 6. Contoured Curved Front Button Placket hugging exact torso chest curve
    const placketGeo = createCurvedPlacketGeometry();
    disposableGeos.push(placketGeo);
    const placketMesh = new THREE.Mesh(placketGeo, placketMat);
    placketMesh.castShadow = !isSoftwareGl;
    placketMesh.receiveShadow = !isSoftwareGl;
    poloGroup.add(placketMesh);

    // 7. Three Sculpted 4-Hole Pearlized Buttons with Crossed Threads
    const buttonYs = [0.688, 0.568, 0.448];
    const buttonSample = createDetailedButtonGroup(buttonMat, buttonThreadMat);
    disposableGeos.push(...buttonSample.geometries);
    buttonYs.forEach((by, idx) => {
      const btnGroup =
        idx === 0 ? buttonSample.group : buttonSample.group.clone(true);
      const bz = sampleTorsoFrontSurfaceZ(by) + 0.015;
      // Tilt button slightly to match chest surface normal slope
      const dz =
        sampleTorsoFrontSurfaceZ(by + 0.02) -
        sampleTorsoFrontSurfaceZ(by - 0.02);
      const slopeAngle = Math.atan2(dz, 0.04);
      btnGroup.position.set(0, by, bz);
      btnGroup.rotation.x = slopeAngle;
      poloGroup.add(btnGroup);
    });

    // 8. Soft Ground Studio Contact Shadow Plane
    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
    shadowMatRef.current = shadowMat;
    const shadowGeo = new THREE.PlaneGeometry(2.15, 1.85);
    disposableGeos.push(shadowGeo);
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -0.94, 0);
    scene.add(shadowPlane);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.hero.target);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.45;
    controls.maxDistance = 4.6;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.65;
    controlsRef.current = controls;

    // On-demand render scheduler with software-WebGL pacing
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
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            trans.pos.x,
            7,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            trans.pos.y,
            7,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            trans.pos.z,
            7,
            dt
          );
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            trans.target.x,
            7,
            dt
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            trans.target.y,
            7,
            dt
          );
          controls.target.z = THREE.MathUtils.damp(
            controls.target.z,
            trans.target.z,
            7,
            dt
          );

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
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      disposableGeos.forEach((g) => g.dispose());
      shadowMat.dispose();
      torsoMat.dispose();
      leftSleeveMat.dispose();
      rightSleeveMat.dispose();
      trimMat.dispose();
      placketMat.dispose();
      buttonMat.dispose();
      buttonThreadMat.dispose();
      innerNeckMat.dispose();
      torsoTex.dispose();
      leftSleeveTex.dispose();
      rightSleeveTex.dispose();
      placketTex.dispose();
      piqueNormalMap.dispose();
      piqueRoughnessMap.dispose();
      ribNormalMap.dispose();
      innerLabelTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-paint high-res PBR garment textures whenever polo/logo config changes
  useEffect(() => {
    paintTextures(config);
  }, [config, paintTextures]);

  // Sync studio lighting preset & backdrop mood
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const lights = lightsRef.current;
    const shadowMat = shadowMatRef.current;
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
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity * 0.85;
      }
      if (shadowMat) shadowMat.opacity = 0.36;
    } else if (config.backdrop === 'dark') {
      scene.background = new THREE.Color('#13171E');
      scene.fog = new THREE.Fog('#13171E', 9.0, 20);
      renderer.setClearColor(0x13171e, 1);
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity * 1.45;
      }
      if (shadowMat) shadowMat.opacity = 0.82;
    } else if (config.backdrop === 'transparent') {
      scene.background = null;
      scene.fog = null;
      renderer.setClearColor(0x000000, 0);
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity;
      }
      if (shadowMat) shadowMat.opacity = 0;
    } else {
      scene.background = new THREE.Color('#B5C8C7');
      scene.fog = new THREE.Fog('#B5C8C7', 8.5, 18);
      renderer.setClearColor(0xb5c8c7, 1);
      if (lights.rim) {
        lights.rim.color.setHex(lp.rimColor);
        lights.rim.intensity = lp.rimIntensity;
      }
      if (shadowMat) shadowMat.opacity = 0.72;
    }
    requestRenderRef.current();
  }, [config.backdrop, lightingPreset]);

  // Smoothly swing camera to inspect the newly selected placement
  useEffect(() => {
    if (config.placement === 'left-sleeve') {
      snapCamera('hero');
    } else if (config.placement === 'right-sleeve') {
      snapCamera('right-sleeve');
    } else if (config.placement === 'left-chest') {
      snapCamera('left-chest');
    } else if (config.placement === 'center-back') {
      snapCamera('back');
    } else {
      snapCamera('front');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.placement]);

  const snapCamera = (preset: CameraPresetId) => {
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
  };

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
        `polo-3d-${config.logoVariant}-${suffix}.png`
      );
      onNotify(
        `บันทึกภาพเสื้อโปโล 3D (polo-3d-${config.logoVariant}-${suffix}.png) เรียบร้อยแล้ว`
      );
    }, 'image/png');
  };

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
      className="relative aspect-[3/2] w-full overflow-hidden select-none"
      style={containerBackdropStyle}
    >
      {/* Dedicated isolated WebGL mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="มุมมองเสื้อโปโล 3 มิติแบบสมจริง หมุนได้ 360 องศา"
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

      {/* Top-Left Gesture Hint + Top-Right Studio Lighting Switch (Solid surfaces, zero backdrop-blur) */}
      <div className="pointer-events-none absolute top-4 left-4 px-3 py-1.5 rounded-md bg-[#111827]/82 text-white text-xs font-medium">
        ลากเพื่อหมุน 360° · เลื่อนลูกกลิ้งเพื่อซูมตรวจเนื้อผ้าและโลโก้
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1 p-1 rounded-lg bg-white/95 border border-zinc-200/90 shadow-xs">
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

      {/* Bottom Unified Camera & Snapshot Dock (Solid surface, zero backdrop-blur) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[96%] flex flex-wrap items-center justify-center gap-1 p-1.5 rounded-xl bg-white/95 border border-zinc-200/90 shadow-sm">
        {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => snapCamera(key)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activePreset === key && !autoRotate
                ? 'bg-[#1B314D] text-white'
                : 'text-[#374151] hover:bg-zinc-100'
            }`}
          >
            {CAMERA_PRESETS[key].label}
          </button>
        ))}

        <span aria-hidden="true" className="w-px h-5 bg-zinc-200 mx-0.5" />

        <button
          type="button"
          onClick={toggleAutoRotate}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            autoRotate
              ? 'bg-[#1B314D] text-white'
              : 'text-[#374151] hover:bg-zinc-100'
          }`}
        >
          {autoRotate ? (
            <Pause className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {autoRotate ? 'หยุดหมุน' : 'หมุน 360°'}
        </button>

        <button
          type="button"
          onClick={() => snapCamera('hero')}
          aria-label="รีเซ็ตมุมกล้อง"
          className="p-1.5 text-[#374151] hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          title="รีเซ็ตมุมกล้อง 3/4"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleCapture3D}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B314D] bg-[#EEF2F5] hover:bg-[#1B314D] hover:text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          บันทึกภาพ 3D
        </button>
      </div>
    </div>
  );
};
