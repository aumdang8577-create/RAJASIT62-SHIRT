import * as THREE from 'three';

/**
 * Photorealistic 3D Polo Garment Geometry, Procedural Fabric PBR Textures,
 * and Studio Softbox IBL Environment Builder.
 *
 * UV Convention across Torso & Sleeves:
 *   theta = (u - 0.5) * 2 * PI  (x = R * sin(theta), z = R * cos(theta))
 *   - u = 0.50 -> Exact Front Center (+Z)
 *   - u = 0.61 -> Wearer's Left Chest (+X, +Z)
 *   - u = 0.75 -> Wearer's Left Outer Side (+X)
 *   - u = 0.39 -> Wearer's Right Chest (-X, +Z)
 *   - u = 0.25 -> Wearer's Right Outer Side (-X)
 *   - u = 0.00 / 1.00 -> Exact Back Center (-Z)
 * All 4 faces read left-to-right (non-mirrored) with outward CCW normals.
 */

/**
 * Generates a procedural Cotton Piqué Honeycomb Tangent-Space Normal Map
 * + Roughness variation map for physically-based woven polo knit fabric.
 */
export function createCottonPiquePBRMaps(): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const heightField = new Float32Array(size * size);

  // Build subtle diamond/honeycomb cotton piqué knit heightfield
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 32; // 32 knit cells across tile
      const v = (y / size) * 32;
      const cellX = u - Math.floor(u);
      const cellY = v - Math.floor(v);
      const stagger = Math.floor(v) % 2 === 0 ? 0 : 0.5;
      const sx = (u + stagger) - Math.floor(u + stagger);

      // Waffle/piqué knit ridge + subtle yarn twist micro-grain
      const ridge1 = Math.sin(sx * Math.PI) * Math.sin(cellY * Math.PI);
      const ridge2 = Math.cos((cellX - 0.5) * Math.PI * 2) * 0.22;
      const yarnMicro =
        Math.sin(x * 1.7 + y * 0.6) * 0.06 + Math.cos(y * 2.1 - x * 0.4) * 0.05;
      heightField[y * size + x] = ridge1 * 0.78 + ridge2 + yarnMicro;
    }
  }

  // Convert heightfield to tangent-space RGB normal map + roughness map
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  if (nCtx && rCtx) {
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const nd = nImg.data;
    const rd = rImg.data;
    const strength = 2.1;

    for (let y = 0; y < size; y++) {
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xm = (x - 1 + size) % size;
        const xp = (x + 1) % size;

        const hL = heightField[y * size + xm];
        const hR = heightField[y * size + xp];
        const hD = heightField[ym * size + x];
        const hU = heightField[yp * size + x];

        const dx = (hL - hR) * strength;
        const dy = (hD - hU) * strength;
        const dz = 1.0;
        const invLen = 1 / Math.hypot(dx, dy, dz);

        const idx = (y * size + x) * 4;
        nd[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
        nd[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
        nd[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
        nd[idx + 3] = 255;

        // Higher yarn crowns are slightly smoother (0.84), recessed pores rougher (0.96)
        const hVal = heightField[y * size + x];
        const roughByte = Math.round(
          Math.min(252, Math.max(204, 232 - hVal * 26))
        );
        rd[idx] = roughByte;
        rd[idx + 1] = roughByte;
        rd[idx + 2] = roughByte;
        rd[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(14, 14);

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(14, 14);

  return { normalMap, roughnessMap };
}

/**
 * Generates a procedural Ribbed Knit Normal Map for the polo collar & ribbed sleeve cuffs.
 */
export function createRibKnitNormalMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Strong vertical knit wales + subtle horizontal course stitch
        const ribAngle = (x / size) * Math.PI * 2 * 44;
        const courseAngle = (y / size) * Math.PI * 2 * 22;
        const dx = Math.cos(ribAngle) * 0.65;
        const dy = Math.cos(courseAngle) * 0.14;
        const dz = 1.0;
        const inv = 1 / Math.hypot(dx, dy, dz);
        const idx = (y * size + x) * 4;
        d[idx] = Math.round((dx * inv * 0.5 + 0.5) * 255);
        d[idx + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
        d[idx + 2] = Math.round((dz * inv * 0.5 + 0.5) * 255);
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

/**
 * Builds a high-contrast photographic studio softbox IBL environment texture
 * (overhead main softbox, dual vertical strip lights, subtle floor bounce)
 * so cotton sheen, folds, and glossy buttons catch realistic studio highlights.
 */
export function createPhotoStudioEnvironment(
  renderer: THREE.WebGLRenderer
): THREE.Texture {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#272E36');

  const panelGeo = new THREE.PlaneGeometry(1, 1);

  const addPanel = (
    color: string,
    intensity: number,
    pos: [number, number, number],
    scale: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0]
  ) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(panelGeo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
    return mat;
  };

  const mats: THREE.Material[] = [
    // Large overhead studio softbox (warm neutral)
    addPanel('#FFFDF8', 2.4, [0, 6.5, 1.5], [7.5, 5.5, 1]),
    // Key right-front softbox
    addPanel('#FFF6EA', 2.8, [5.5, 2.8, 5.2], [4.2, 5.8, 1]),
    // Cool left fill reflector
    addPanel('#E4F0FB', 1.55, [-6.0, 2.0, 3.8], [4.5, 5.4, 1]),
    // Crisp back rim strip lights (left + right shoulders)
    addPanel('#EEF6FF', 2.2, [-4.2, 3.4, -5.8], [2.4, 5.0, 1]),
    addPanel('#FFF7EE', 1.9, [4.2, 3.4, -5.8], [2.4, 5.0, 1]),
    // Subtle neutral cyclorama floor bounce
    addPanel('#8E9BA3', 0.65, [0, -5.5, 0], [12, 12, 1]),
  ];

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTex = pmrem.fromScene(envScene, 0.04).texture;

  panelGeo.dispose();
  mats.forEach((m) => m.dispose());
  pmrem.dispose();

  return envTex;
}

/**
 * Helper to compute exact front chest Z surface height at given (y) for placket & buttons
 * so the placket and buttons sit flush against the sculpted torso with zero floating gap.
 */
export function sampleTorsoFrontSurfaceZ(y: number): number {
  const height = 1.66;
  const t = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1);
  let depthRadius = 0.285;
  if (t < 0.22) {
    depthRadius = 0.278 - t * 0.025;
  } else if (t < 0.72) {
    const k = (t - 0.22) / 0.50;
    depthRadius = 0.272 + Math.sin(k * Math.PI * 0.78) * 0.056;
  } else {
    const k = (t - 0.72) / 0.28;
    depthRadius = 0.308 - Math.pow(k, 1.45) * 0.125;
  }
  const chestLift =
    Math.sin(Math.max(0, t - 0.32) * Math.PI * 1.38) * 0.044;
  return depthRadius + chestLift;
}

/**
 * High-resolution sculpted invisible-mannequin Polo Torso Geometry (96 × 64)
 * with organic pectoral volume, sloped shoulders, scooped front collar neckline,
 * natural cotton drape folds, and underarm tension creases.
 */
export function createPhotorealTorsoGeometry(): THREE.BufferGeometry {
  const segU = 96;
  const segV = 64;
  const height = 1.66;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segV; j++) {
    const v = j / segV; // 0 = bottom hem, 1 = collar seam / shoulder top
    const baseY = (v - 0.5) * height;

    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const theta = (u - 0.5) * Math.PI * 2; // 0 = front +Z, +PI/2 = left +X
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const frontAmt = Math.max(0, cosT);
      const backAmt = Math.max(0, -cosT);
      const sideAmt = Math.abs(sinT);

      // 1. Anatomical width (X radius) & chest/waist depth (Z radius)
      let rx = 0.51;
      let rz = 0.285;

      if (v < 0.22) {
        // Subtle tailored waist taper from hip hem up
        const k = v / 0.22;
        rx = 0.515 - k * 0.032;
        rz = 0.278 - k * 0.006;
      } else if (v < 0.72) {
        // Athletic torso expansion through ribcage & broad chest
        const k = (v - 0.22) / 0.50;
        rx = 0.483 + Math.sin(k * Math.PI * 0.68) * 0.095;
        rz = 0.272 + Math.sin(k * Math.PI * 0.78) * 0.056;
      } else {
        // Smooth shoulder dome tapering cleanly into collar opening
        const k = (v - 0.72) / 0.28;
        const ease = Math.pow(k, 1.48);
        rx = 0.562 - ease * 0.326; // Ends at neck radius ~0.236
        rz = 0.308 - Math.pow(k, 1.45) * 0.125; // Ends at neck depth ~0.183
      }

      // 2. Sculpted pectoral fullness + upper back shoulder-blade contour
      const chestLift =
        Math.pow(frontAmt, 1.25) *
        Math.sin(Math.max(0, v - 0.32) * Math.PI * 1.38) *
        0.044;
      const backBladeLift =
        Math.pow(backAmt, 1.3) *
        Math.sin(Math.max(0, v - 0.42) * Math.PI * 1.45) *
        0.026;

      // Subtle clavicle/sternum hollow just below front collar
      const sternumDip =
        Math.pow(frontAmt, 3.2) *
        Math.exp(-Math.pow((v - 0.87) / 0.075, 2)) *
        -0.015;

      // 3. Natural multi-frequency cotton cloth drape folds
      const hemZone = Math.pow(Math.max(0, 1 - v * 1.42), 1.45);
      const hemDrapes =
        (Math.sin(theta * 5 + 0.65) * 0.013 +
          Math.cos(theta * 8 - 0.3) * 0.0065 +
          Math.sin(theta * 3 - 1.1) * 0.009) *
        hemZone;

      // Subtle diagonal underarm-to-chest tension ripples (classic real shirt cue!)
      const underarmBand = Math.exp(-Math.pow((v - 0.54) / 0.15, 2));
      const tensionCrease =
        Math.sin(theta * 7 + v * 12) * 0.0042 * underarmBand * (0.4 + 0.6 * sideAmt);

      // Gentle waist side-seam gather
      const waistGather =
        Math.exp(-Math.pow((v - 0.32) / 0.14, 2)) *
        Math.sin(v * 34 + sideAmt * 5) *
        0.0055 *
        sideAmt;

      // Slight inward hem tuck at the very bottom edge (real sewn hem weight)
      const hemLip = v < 0.025 ? -0.007 * (1 - v / 0.025) : 0;

      const radialNoise = hemDrapes + tensionCrease + waistGather + hemLip;

      // 4. Vertical neckline & shoulder slope sculpting
      const shoulderSlope =
        v > 0.72 ? -Math.pow(sideAmt, 1.3) * Math.pow((v - 0.72) / 0.28, 1.1) * 0.155 : 0;
      // Front collar scoops ~7.5cm lower than the back nape for authentic polo collar sit
      const frontNeckScoop =
        v > 0.76 ? -Math.pow(frontAmt, 2.2) * Math.pow((v - 0.76) / 0.24, 1.6) * 0.072 : 0;
      const backNeckRise =
        v > 0.82 ? Math.pow(backAmt, 2.0) * Math.pow((v - 0.82) / 0.18, 1.4) * 0.028 : 0;
      // Organic slightly wavy bottom hem line
      const hemWaveY =
        v < 0.12
          ? (Math.sin(theta * 3 + 0.4) * 0.012 + Math.cos(theta * 5) * 0.006) *
            (1 - v / 0.12)
          : 0;

      const x = (rx + radialNoise) * sinT;
      const z =
        (rz + radialNoise * 0.75) * cosT +
        chestLift +
        sternumDip -
        backBladeLift;
      const y = baseY + shoulderSlope + frontNeckScoop + backNeckRise + hemWaveY;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + 1;
      const c = a + (segU + 1) + 1;
      const d = a + (segU + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Short Polo Sleeve Geometry (64 × 24) with anatomical curved armscye top cap,
 * tapered deltoid-to-bicep profile, natural fabric creases, and exact aligned UVs.
 */
export function createSculptedSleeveGeometry(
  side: 'left' | 'right'
): THREE.BufferGeometry {
  const segU = 64;
  const segV = 24;
  const length = 0.56;
  const sign = side === 'left' ? 1 : -1;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segV; j++) {
    const v = j / segV; // 0 = cuff seam, 1 = shoulder armscye seam
    const baseY = (v - 0.5) * length;

    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const theta = (u - 0.5) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      // Outer shoulder faces +X for left sleeve (sinT > 0), -X for right sleeve (sinT < 0)
      const outerSide = Math.max(0, sign * sinT);
      const innerArmpit = Math.max(0, -sign * sinT);

      // Smooth bicep-to-deltoid taper
      const baseR = 0.172 + Math.pow(v, 1.35) * 0.056;
      const rx = baseR * (1.0 + Math.pow(v, 2) * 0.14);
      const rz = baseR * (0.93 + Math.pow(v, 2) * 0.08);

      // Natural sleeve drape folds near inner armpit & gentle bicep fullness
      const crease =
        Math.sin(theta * 4 + v * 7 * sign) * 0.0045 * (1 - v * 0.5) +
        Math.sin(v * Math.PI * 2.5) * 0.006 * innerArmpit;

      // Sculpted elliptical armscye cap at top so sleeve seamlessly seats into torso shoulder
      const armscyeCapLift =
        Math.pow(v, 2.2) * (outerSide * 0.075 - innerArmpit * 0.095);
      // Slight inward curve at top cap so shoulder looks naturally tailored & rounded
      const capTuck = v > 0.78 ? Math.pow((v - 0.78) / 0.22, 1.8) * 0.042 : 0;

      const x = (rx - capTuck + crease) * sinT;
      const z = (rz - capTuck * 0.7 + crease * 0.8) * cosT;
      const y = baseY + armscyeCapLift;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + 1;
      const c = a + (segU + 1) + 1;
      const d = a + (segU + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Thick Ribbed Sleeve Cuff Band with rounded pillowed outer profile + rolled lower hem edge.
 */
export function createRibbedCuffGeometry(): THREE.BufferGeometry {
  const segU = 56;
  const segV = 12;
  const cuffH = 0.072;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segV; j++) {
    const v = j / segV; // 0 = inner lip, 0.2 = bottom rolled edge, 1 = top seam
    let y: number;
    let rScale: number;

    if (v < 0.22) {
      // Rolled inner lip giving realistic 5mm knitted cuff thickness
      const k = v / 0.22;
      y = -cuffH * 0.5 + (1 - k) * 0.02;
      rScale = 0.945 + Math.sin(k * Math.PI * 0.5) * 0.055;
    } else {
      const k = (v - 0.22) / 0.78;
      y = -cuffH * 0.5 + k * cuffH;
      // Slight pillowed knit rib bulge in middle of cuff
      rScale = 1.0 + Math.sin(k * Math.PI) * 0.028;
    }

    const rx = 0.175 * rScale;
    const rz = 0.163 * rScale;

    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const theta = (u - 0.5) * Math.PI * 2;
      positions.push(rx * Math.sin(theta), y, rz * Math.cos(theta));
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + 1;
      const c = a + (segU + 1) + 1;
      const d = a + (segU + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom Sculpted 3D Fold-Over Polo Collar Geometry:
 * Sweeps continuously from inner neck stand -> rolled top crease -> outward flared collar leaf
 * with crisp pointed front lapel tips resting naturally beside the placket!
 */
export function createSculptedPoloCollarGeometry(): THREE.BufferGeometry {
  const segU = 84;
  const segV = 18;
  // Open gap in exact front center where collar points part above the top button
  const frontGapRad = 0.24;
  const totalArc = Math.PI * 2 - frontGapRad * 2;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segV; j++) {
    const v = j / segV; // 0 = base of inner stand, 0.34 = top rolled crease, 1 = outer pointed collar edge

    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      // theta goes from +frontGapRad (left front tip) -> +PI (back nape) -> 2PI - frontGapRad (right front tip)
      const theta = frontGapRad + u * totalArc;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      // Proximity to front collar point tips (0 = back/sides, 1 = crisp front tip)
      const tipProximity = Math.pow(Math.max(0, cosT), 2.4);
      const backAmt = Math.max(0, -cosT);

      // Anatomical neck base radius & height curve matching torso neckline
      const neckRx = 0.242;
      const neckRz = 0.194;
      const baseNeckY = 0.775 + backAmt * 0.042 - Math.max(0, cosT) * 0.056;

      // Stand height (higher at back nape, tapering gently at front)
      const standH = 0.095 + backAmt * 0.028 - tipProximity * 0.018;
      // Collar leaf drape length (longer pointed lapel tips in front!)
      const leafDrop = 0.125 + tipProximity * 0.058 + backAmt * 0.012;
      // Outward flare from neck stand onto shoulders/chest
      const flareOut = 0.092 + (1 - backAmt) * 0.036 + tipProximity * 0.014;

      let localR = 0;
      let localY = 0;

      if (v <= 0.30) {
        // Inner upright neck stand rising up
        const k = v / 0.30;
        localR = -0.005 + k * 0.006;
        localY = k * standH;
      } else if (v <= 0.48) {
        // Smooth rounded upper rolled fold crease!
        const k = (v - 0.30) / 0.18;
        const arc = k * Math.PI;
        const rollR = 0.017;
        localR = (1 - Math.cos(arc)) * rollR;
        localY = standH + Math.sin(arc) * rollR;
      } else {
        // Outer folded collar leaf draping smoothly downward & outward with pointed front lapels
        const k = (v - 0.48) / 0.52;
        const easeOut = Math.pow(k, 0.88);
        localR = 0.034 + easeOut * flareOut;
        localY = standH - Math.pow(k, 1.05) * leafDrop;
      }

      // Slight forward extension of the pointed front collar tips
      const tipForwardPull = v > 0.48 ? ((v - 0.48) / 0.52) * tipProximity * 0.032 : 0;

      const x = (neckRx + localR) * sinT;
      const z = (neckRz + localR * 0.92) * cosT + tipForwardPull;
      const y = baseNeckY + localY;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      const b = a + 1;
      const c = a + (segU + 1) + 1;
      const d = a + (segU + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Curved Front Button Placket hugging the exact anatomical torso curve
 * so it sits seamlessly flush on the chest without sticking out.
 */
export function createCurvedPlacketGeometry(): THREE.BufferGeometry {
  const segX = 12;
  const segY = 24;
  const width = 0.098;
  const yBottom = 0.34;
  const yTop = 0.748;
  const thickness = 0.011;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segY; j++) {
    const v = j / segY;
    const y = THREE.MathUtils.lerp(yBottom, yTop, v);
    const chestZ = sampleTorsoFrontSurfaceZ(y);

    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const x = (u - 0.5) * width;
      // Gently bevel left/right placket edges down to meet torso smoothly
      const edgeBevel = Math.sin(u * Math.PI);
      const bottomBevel = Math.min(1, v * 14);
      const z = chestZ + 0.002 + thickness * Math.pow(edgeBevel, 0.32) * bottomBevel - x * x * 0.75;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + (segX + 1) + 1;
      const d = a + (segX + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a realistic 4-hole concaved polo button group with subtle rim bevel and crossed stitch threads.
 */
export function createDetailedButtonGroup(
  buttonMat: THREE.Material,
  threadMat: THREE.Material
): {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
} {
  const group = new THREE.Group();

  // Outer sculpted lathe dish profile for authentic garment button
  const profile = [
    new THREE.Vector2(0.0, -0.004),
    new THREE.Vector2(0.021, -0.004),
    new THREE.Vector2(0.0225, 0.0),
    new THREE.Vector2(0.0215, 0.0065),
    new THREE.Vector2(0.0175, 0.0072),
    new THREE.Vector2(0.0145, 0.0042),
    new THREE.Vector2(0.0, 0.0038),
  ];
  const buttonGeo = new THREE.LatheGeometry(profile, 24);
  buttonGeo.rotateX(Math.PI / 2);

  const threadGeo = new THREE.CylinderGeometry(0.0014, 0.0014, 0.012, 6);

  const btnMesh = new THREE.Mesh(buttonGeo, buttonMat);
  group.add(btnMesh);

  // Cross-stitch threads in the recessed center
  const t1 = new THREE.Mesh(threadGeo, threadMat);
  t1.position.set(0, 0, 0.0046);
  t1.rotation.z = Math.PI / 4;
  const t2 = new THREE.Mesh(threadGeo, threadMat);
  t2.position.set(0, 0, 0.0048);
  t2.rotation.z = -Math.PI / 4;
  group.add(t1, t2);

  return { group, geometries: [buttonGeo, threadGeo] };
}

/**
 * Creates a crisp woven inner-neck collar label texture ("62 · ราชสิทธาราม · 100% COTTON PIQUÉ")
 * visible inside the back neckline of the 3D polo shirt.
 */
export function createInnerNeckLabelTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#D8DCE0';
    ctx.fillRect(0, 0, w, h);

    // Subtle woven half-moon yoke seam arc
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.14)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(w / 2, 16, 155, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small woven neck brand tag centered at back nape (u = 0.5 of inner neck cylinder)
    ctx.fillStyle = '#1B2C47';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 58, 54, 116, 48, 4);
    ctx.fill();

    ctx.fillStyle = '#E5C675';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 20px "Prompt", sans-serif';
    ctx.fillText('62 · RS', w / 2, 72);

    ctx.fillStyle = '#D8E0EA';
    ctx.font = '500 10px "IBM Plex Mono", monospace';
    ctx.fillText('COTTON PIQUÉ · L', w / 2, 91);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
