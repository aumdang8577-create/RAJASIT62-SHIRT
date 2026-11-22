import * as THREE from 'three';
import type { FabricType, GarmentStyle, TippingStyle } from './sleeveLogoComposer';

/**
 * Photorealistic 3D Garment Geometry Engine (Catmull-Clark Subdivided Manifold Mesh):
 *  - Single watertight torso + relaxed drop sleeves + tucked interior neck/hem/cuff linings
 *  - Exact 4-material regions (0: torso, 1: leftSleeve, 2: rightSleeve, 3: innerLining)
 *  - Seamless back-spine & underarm UV unwrapping with zero mirrored text
 *  - Pre-computed smooth normals + baked vertex-color ambient occlusion
 *  - Collar & ribbed/hem cuffs swept directly from subdivided boundary loops (0.000 mm gap)
 *  - Barycentric chest surface projector for flush plackets, mitered pocket, & 4-hole buttons
 */

export interface FabricPBRPreset {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  normalScale: number;
}

export interface PlacketMeta {
  yBottom: number;
  yTop: number;
  buttonYs: number[];
}

export interface ButtonMount {
  pos: THREE.Vector3;
  rotX: number;
  rotY: number;
}

export interface UnifiedGarmentResult {
  garmentGeo: THREE.BufferGeometry;
  poloCollarGeo: THREE.BufferGeometry;
  standCollarGeo: THREE.BufferGeometry;
  leftRibCuffGeo: THREE.BufferGeometry;
  rightRibCuffGeo: THREE.BufferGeometry;
  leftHemCuffGeo: THREE.BufferGeometry;
  rightHemCuffGeo: THREE.BufferGeometry;
  poloPlacketGeo: THREE.BufferGeometry;
  standPlacketGeo: THREE.BufferGeometry;
  chestPocketGeo: THREE.BufferGeometry;
  neckTagGeo: THREE.BufferGeometry;
  poloPlacketMeta: PlacketMeta;
  standPlacketMeta: PlacketMeta;
  poloButtonMounts: ButtonMount[];
  standButtonMounts: ButtonMount[];
  torsoBounds: { yMin: number; yMax: number; midChestU: number; midChestCanvasY: number };
  leftSleeveBounds: { rootProj: number; cuffProj: number };
  rightSleeveBounds: { rootProj: number; cuffProj: number };
}

type RegionId = 0 | 1 | 2 | 3;

interface QuadFace {
  v: [number, number, number, number];
  region: RegionId;
}

interface QuadCage {
  verts: THREE.Vector3[];
  quads: QuadFace[];
  loops: {
    neck: number[];
    leftCuff: number[];
    rightCuff: number[];
  };
}

interface TriSample {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  cx: number;
  cy: number;
  cz: number;
  nax: number;
  nay: number;
  naz: number;
  nbx: number;
  nby: number;
  nbz: number;
  ncx: number;
  ncy: number;
  ncz: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const TORSO_Y_MIN = -0.80;
const TORSO_Y_MAX = 0.75;

/** Evaluates tailored athletic torso ring positions in the coarse base cage */
function evaluateCageTorsoPoint(
  ringIdx: number,
  segIdx: number,
  totalSegs = 16
): THREE.Vector3 {
  // Normalized theta in [-PI, PI): seg=0 -> -PI (Back Center), seg=8 -> 0 (Front Center)
  const theta = (segIdx / totalSegs - 0.5) * Math.PI * 2;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const frontAmt = Math.max(0, cosT);
  const backAmt = Math.max(0, -cosT);
  const sideAmt = Math.abs(sinT);

  // 9 anatomically spaced vertical rings (r=0 Hem .. r=8 Neck Rim)
  const ringSpecs: Array<{ y: number; rx: number; rz: number }> = [
    { y: -0.795, rx: 0.502, rz: 0.275 }, // 0: Hem rim
    { y: -0.490, rx: 0.470, rz: 0.262 }, // 1: Lower tailored waist taper
    { y: -0.180, rx: 0.484, rz: 0.274 }, // 2: Mid abdomen
    { y: 0.085, rx: 0.514, rz: 0.292 },  // 3: Lower ribcage
    { y: 0.262, rx: 0.524, rz: 0.298 },  // 4: Armhole pit floor
    { y: 0.435, rx: 0.526, rz: 0.302 },  // 5: Mid chest / mid armhole
    { y: 0.588, rx: 0.506, rz: 0.246 },  // 6: Shoulder acromion crest
    { y: 0.682, rx: 0.332, rz: 0.205 },  // 7: Mid-trapezius / clavicle transition
    { y: 0.742, rx: 0.228, rz: 0.178 },  // 8: Neck collar seat
  ];

  const spec = ringSpecs[ringIdx];
  let rx = spec.rx;
  let rz = spec.rz;
  let y = spec.y;

  // Slightly widen armhole depth in Z around rings 4..6 so sleeve sockets are rounded ovals
  if (ringIdx >= 4 && ringIdx <= 6 && sideAmt > 0.75) {
    rz *= ringIdx === 5 ? 1.12 : 1.07;
  }

  // Sculpted upper chest pec contour & back shoulder-blade fullness
  const vNorm = ringIdx / 8;
  const chestLift =
    Math.pow(frontAmt, 1.3) *
    Math.sin(Math.max(0, vNorm - 0.30) * Math.PI * 1.4) *
    0.036;
  const backBlade =
    Math.pow(backAmt, 1.35) *
    Math.sin(Math.max(0, vNorm - 0.42) * Math.PI * 1.45) *
    0.022;
  const sternumDip =
    ringIdx >= 6
      ? Math.pow(frontAmt, 3.0) * (ringIdx === 8 ? -0.020 : -0.012)
      : 0;

  // Sloping shoulder trapezius line + tailored front neck scoop
  if (ringIdx === 6) {
    y -= sideAmt * 0.018;
    y += backAmt * 0.010;
  } else if (ringIdx === 7) {
    y -= sideAmt * 0.016;
    y -= Math.pow(frontAmt, 2.0) * 0.068;
    y += Math.pow(backAmt, 2.0) * 0.014;
  } else if (ringIdx === 8) {
    y -= sideAmt * 0.044;
    y -= Math.pow(frontAmt, 2.1) * 0.118; // Deep clean front neckline v-scoop for placket
    y += Math.pow(backAmt, 2.0) * 0.024;
  }

  // Natural asymmetric studio garment hang + waist taper & organic lower hem gather
  if (ringIdx === 0) {
    y -= backAmt * 0.018;
    y += Math.pow(sideAmt, 2.8) * 0.018;
    y += Math.sin(theta * 3 + 0.55) * 0.012 + Math.cos(theta * 2 - 0.7) * 0.008;
    rx += Math.cos(theta * 5 + 0.4) * 0.010;
    rz += Math.sin(theta * 4 - 0.3) * 0.007;
  } else if (ringIdx === 1 || ringIdx === 2) {
    const twistShift = ringIdx === 1 ? 0.011 : -0.008;
    rx += twistShift * sinT;
  }

  const x = rx * sinT;
  const z = rz * cosT + chestLift + sternumDip - backBlade;
  return new THREE.Vector3(x, y, z);
}

/** Ensures a quad's geometric normal points along expectedOutward */
function orientQuad(
  verts: THREE.Vector3[],
  q: [number, number, number, number],
  expectedOutward: THREE.Vector3
): [number, number, number, number] {
  const a = verts[q[0]];
  const b = verts[q[1]];
  const c = verts[q[2]];
  const d = verts[q[3]];
  const e1 = new THREE.Vector3().subVectors(c, a);
  const e2 = new THREE.Vector3().subVectors(d, b);
  const n = new THREE.Vector3().crossVectors(e1, e2);
  if (n.dot(expectedOutward) < 0) {
    return [q[0], q[3], q[2], q[1]];
  }
  return q;
}

/**
 * Builds the unified watertight quad control cage:
 *  - 9 Torso rings x 16 segs (with clean 2x2 armholes removed on left i=11..13 & right i=3..5)
 *  - 2 Relaxed downward-sloping short sleeves extruded seamlessly from the 8-vert armhole loops
 *  - Tucked interior fabric linings at neck, bottom hem, and both sleeve cuffs
 */
function buildBaseGarmentCage(): QuadCage {
  const N = 16;
  const RINGS = 9;
  const verts: THREE.Vector3[] = [];
  const quads: QuadFace[] = [];

  const torsoGrid: number[][] = [];
  for (let r = 0; r < RINGS; r++) {
    const row: number[] = [];
    for (let i = 0; i < N; i++) {
      row.push(verts.length);
      verts.push(evaluateCageTorsoPoint(r, i, N));
    }
    torsoGrid.push(row);
  }

  // Torso exterior quads, skipping left armhole (r=4..5, i=11..12) and right armhole (r=4..5, i=3..4)
  for (let r = 0; r < RINGS - 1; r++) {
    for (let i = 0; i < N; i++) {
      const iNext = (i + 1) % N;
      const inLeftArmhole = r >= 4 && r <= 5 && (i === 11 || i === 12);
      const inRightArmhole = r >= 4 && r <= 5 && (i === 3 || i === 4);
      if (inLeftArmhole || inRightArmhole) continue;

      const raw: [number, number, number, number] = [
        torsoGrid[r][i],
        torsoGrid[r][iNext],
        torsoGrid[r + 1][iNext],
        torsoGrid[r + 1][i],
      ];
      const mid = new THREE.Vector3()
        .add(verts[raw[0]])
        .add(verts[raw[1]])
        .add(verts[raw[2]])
        .add(verts[raw[3]])
        .multiplyScalar(0.25);
      const outDir = new THREE.Vector3(mid.x, r >= 6 ? mid.y - 0.45 : 0, mid.z);
      quads.push({ v: orientQuad(verts, raw, outDir), region: 0 });
    }
  }

  // Soft turned-in Bottom Hem lining kept safely inside outer drape envelope
  const hemInRow: number[] = [];
  for (let i = 0; i < N; i++) {
    const p = verts[torsoGrid[0][i]];
    hemInRow.push(verts.length);
    verts.push(new THREE.Vector3(p.x * 0.87, p.y + 0.055, p.z * 0.84));
  }
  const hemLipRow: number[] = [];
  for (let i = 0; i < N; i++) {
    const p = verts[torsoGrid[0][i]];
    hemLipRow.push(verts.length);
    verts.push(new THREE.Vector3(p.x * 0.96, p.y - 0.008, p.z * 0.95));
  }
  for (let i = 0; i < N; i++) {
    const iNext = (i + 1) % N;
    quads.push({
      v: [torsoGrid[0][iNext], torsoGrid[0][i], hemLipRow[i], hemLipRow[iNext]],
      region: 0,
    });
    quads.push({
      v: [hemLipRow[iNext], hemLipRow[i], hemInRow[i], hemInRow[iNext]],
      region: 3,
    });
  }

  // Deep Inner Neck Yoke lining seated just beneath collar stand base
  const neckLipRow: number[] = [];
  const neckInUpper: number[] = [];
  const neckInDeep: number[] = [];
  for (let i = 0; i < N; i++) {
    const p = verts[torsoGrid[8][i]];
    const radXZ = new THREE.Vector3(p.x, 0, p.z);
    neckLipRow.push(verts.length);
    verts.push(
      new THREE.Vector3(radXZ.x * 0.965, p.y - 0.004, radXZ.z * 0.965)
    );
    neckInUpper.push(verts.length);
    verts.push(
      new THREE.Vector3(radXZ.x * 0.935, p.y - 0.068, radXZ.z * 0.925)
    );
    neckInDeep.push(verts.length);
    verts.push(
      new THREE.Vector3(radXZ.x * 1.02, p.y - 0.175, radXZ.z * 0.96)
    );
  }
  for (let i = 0; i < N; i++) {
    const iNext = (i + 1) % N;
    quads.push({
      v: [torsoGrid[8][i], torsoGrid[8][iNext], neckLipRow[iNext], neckLipRow[i]],
      region: 0,
    });
    quads.push({
      v: [neckLipRow[i], neckLipRow[iNext], neckInUpper[iNext], neckInUpper[i]],
      region: 3,
    });
    quads.push({
      v: [neckInUpper[i], neckInUpper[iNext], neckInDeep[iNext], neckInDeep[i]],
      region: 3,
    });
  }

  // Helper to build one seamless extruded sleeve from an ordered 8-vert armhole loop
  // Order: 0=TopShoulder, 1=UpFront, 2=MidFront, 3=LowFront, 4=PitBottom, 5=LowBack, 6=MidBack, 7=UpBack
  const extrudeSleeve = (
    rootLoop: number[],
    sideSign: 1 | -1,
    region: 1 | 2
  ): number[] => {
    const S_RINGS = 4;
    // Natural ~22 deg relaxed downward hang closer to torso sides
    const cuffCenter = new THREE.Vector3(sideSign * 0.640, 0.160, 0.014);
    const sleeveAxis = new THREE.Vector3(sideSign * 0.37, -0.929, 0.022).normalize();

    // Build orthonormal radial basis around cuff plane: U_up points up-out, U_front points +Z
    const refFront = new THREE.Vector3(0, 0, 1);
    const uUp = new THREE.Vector3()
      .crossVectors(refFront, sleeveAxis)
      .multiplyScalar(sideSign)
      .normalize();
    const uFront = new THREE.Vector3()
      .crossVectors(sleeveAxis, uUp)
      .multiplyScalar(sideSign)
      .normalize();

    // Ensure uFront always points toward +Z Front and uUp always points Up & Out
    if (uFront.z < 0) uFront.negate();
    if (uUp.y < 0) uUp.negate();

    const sleeveRings: number[][] = [rootLoop];
    const rxCuff = 0.135;
    const rzCuff = 0.132;

    for (let s = 1; s <= S_RINGS; s++) {
      const t = s / S_RINGS;
      const ring: number[] = [];
      for (let k = 0; k < 8; k++) {
        const rootPos = verts[rootLoop[k]];
        const phi = (k / 8) * Math.PI * 2; // 0=top(+uUp), 2=front(+uFront), 4=bottom(-uUp), 6=back(-uFront)
        const cuffTarget = cuffCenter
          .clone()
          .addScaledVector(uUp, Math.cos(phi) * rxCuff)
          .addScaledVector(uFront, Math.sin(phi) * rzCuff);

        // Smooth rounded deltoid cap draping naturally downward strictly BELOW shoulder apex
        const isTop = k === 0 || k === 1 || k === 7;
        const pos = new THREE.Vector3().lerpVectors(rootPos, cuffTarget, t);

        const deltoidCurve =
          Math.sin(t * Math.PI) * (isTop ? 0.036 : k === 4 ? -0.006 : 0.014);
        pos.x += sideSign * deltoidCurve * 0.88;
        pos.y += Math.sin(t * Math.PI) * (k === 0 ? 0.018 : 0.005);
        if (s === 1 && (k === 0 || k === 1 || k === 7)) {
          pos.y = Math.min(pos.y, rootPos.y - 0.022);
        }

        ring.push(verts.length);
        verts.push(pos);
      }
      sleeveRings.push(ring);
    }

    // Sleeve exterior quads
    for (let s = 0; s < S_RINGS; s++) {
      const r0 = sleeveRings[s];
      const r1 = sleeveRings[s + 1];
      const ringCenter = new THREE.Vector3();
      for (let k = 0; k < 8; k++) ringCenter.add(verts[r0[k]]).add(verts[r1[k]]);
      ringCenter.multiplyScalar(1 / 16);

      for (let k = 0; k < 8; k++) {
        const kn = (k + 1) % 8;
        const raw: [number, number, number, number] = [
          r0[k],
          r0[kn],
          r1[kn],
          r1[k],
        ];
        const mid = new THREE.Vector3()
          .add(verts[raw[0]])
          .add(verts[raw[1]])
          .add(verts[raw[2]])
          .add(verts[raw[3]])
          .multiplyScalar(0.25);
        const outDir = mid.clone().sub(ringCenter);
        quads.push({ v: orientQuad(verts, raw, outDir), region });
      }
    }

    // Tucked inner sleeve lining (0.078 units deep inside sleeve mouth)
    const rim = sleeveRings[S_RINGS];
    const inLip: number[] = [];
    const inDeep: number[] = [];
    for (let k = 0; k < 8; k++) {
      const p = verts[rim[k]];
      const rad = p.clone().sub(cuffCenter);
      inLip.push(verts.length);
      verts.push(
        cuffCenter
          .clone()
          .addScaledVector(rad, 0.90)
          .addScaledVector(sleeveAxis, 0.006)
      );
      inDeep.push(verts.length);
      verts.push(
        cuffCenter
          .clone()
          .addScaledVector(rad, 0.88)
          .addScaledVector(sleeveAxis, -0.075)
      );
    }
    for (let k = 0; k < 8; k++) {
      const kn = (k + 1) % 8;
      const rawLip: [number, number, number, number] = [
        rim[k],
        rim[kn],
        inLip[kn],
        inLip[k],
      ];
      const midLip = new THREE.Vector3()
        .add(verts[rawLip[0]])
        .add(verts[rawLip[1]])
        .add(verts[rawLip[2]])
        .add(verts[rawLip[3]])
        .multiplyScalar(0.25);
      quads.push({
        v: orientQuad(verts, rawLip, sleeveAxis.clone()),
        region,
      });

      const rawDeep: [number, number, number, number] = [
        inLip[k],
        inLip[kn],
        inDeep[kn],
        inDeep[k],
      ];
      const inwardDir = cuffCenter.clone().sub(midLip);
      quads.push({
        v: orientQuad(verts, rawDeep, inwardDir),
        region: 3,
      });
    }

    return rim;
  };

  // Ordered 8-vertex armhole loops directly referencing torsoGrid vertices
  const leftArmhole = [
    torsoGrid[6][12], // 0: Top shoulder
    torsoGrid[6][11], // 1: Up front
    torsoGrid[5][11], // 2: Mid front
    torsoGrid[4][11], // 3: Low front
    torsoGrid[4][12], // 4: Pit bottom
    torsoGrid[4][13], // 5: Low back
    torsoGrid[5][13], // 6: Mid back
    torsoGrid[6][13], // 7: Up back
  ];

  const rightArmhole = [
    torsoGrid[6][4], // 0: Top shoulder
    torsoGrid[6][5], // 1: Up front
    torsoGrid[5][5], // 2: Mid front
    torsoGrid[4][5], // 3: Low front
    torsoGrid[4][4], // 4: Pit bottom
    torsoGrid[4][3], // 5: Low back
    torsoGrid[5][3], // 6: Mid back
    torsoGrid[6][3], // 7: Up back
  ];

  const leftCuffLoop = extrudeSleeve(leftArmhole, 1, 1);
  const rightCuffLoop = extrudeSleeve(rightArmhole, -1, 2);

  // Ordered neckline loop starting at Back Center i=0 going CCW through Front Center i=8
  const neckLoop = [...torsoGrid[8]];

  return {
    verts,
    quads,
    loops: {
      neck: neckLoop,
      leftCuff: leftCuffLoop,
      rightCuff: rightCuffLoop,
    },
  };
}

/** One pass of Catmull-Clark Subdivision preserving region tags and boundary loops */
function catmullClarkStep(cage: QuadCage): QuadCage {
  const { verts, quads, loops } = cage;
  const nVerts = verts.length;

  // 1. Face points
  const facePts: THREE.Vector3[] = new Array(quads.length);
  const vertAdjQuads: number[][] = Array.from({ length: nVerts }, () => []);
  for (let qi = 0; qi < quads.length; qi++) {
    const [a, b, c, d] = quads[qi].v;
    facePts[qi] = new THREE.Vector3()
      .add(verts[a])
      .add(verts[b])
      .add(verts[c])
      .add(verts[d])
      .multiplyScalar(0.25);
    vertAdjQuads[a].push(qi);
    vertAdjQuads[b].push(qi);
    vertAdjQuads[c].push(qi);
    vertAdjQuads[d].push(qi);
  }

  // 2. Edges map
  interface EdgeInfo {
    a: number;
    b: number;
    quads: number[];
    pt: THREE.Vector3;
    newIdx: number;
  }
  const edgeMap = new Map<string, EdgeInfo>();
  const vertAdjEdges: EdgeInfo[][] = Array.from({ length: nVerts }, () => []);

  const getEdgeKey = (u: number, v: number) =>
    u < v ? `${u}_${v}` : `${v}_${u}`;

  const getOrCreateEdge = (u: number, v: number, qi: number): EdgeInfo => {
    const k = getEdgeKey(u, v);
    let info = edgeMap.get(k);
    if (!info) {
      info = {
        a: Math.min(u, v),
        b: Math.max(u, v),
        quads: [],
        pt: new THREE.Vector3(),
        newIdx: -1,
      };
      edgeMap.set(k, info);
      vertAdjEdges[info.a].push(info);
      vertAdjEdges[info.b].push(info);
    }
    if (!info.quads.includes(qi)) info.quads.push(qi);
    return info;
  };

  const quadEdges: [EdgeInfo, EdgeInfo, EdgeInfo, EdgeInfo][] = new Array(
    quads.length
  );
  for (let qi = 0; qi < quads.length; qi++) {
    const [a, b, c, d] = quads[qi].v;
    quadEdges[qi] = [
      getOrCreateEdge(a, b, qi),
      getOrCreateEdge(b, c, qi),
      getOrCreateEdge(c, d, qi),
      getOrCreateEdge(d, a, qi),
    ];
  }

  // 3. Allocate new vertex positions: [0..nVerts-1]=updated orig verts, then faces, then edges
  const nextVerts: THREE.Vector3[] = new Array(nVerts);

  const edgeList = Array.from(edgeMap.values());
  edgeList.forEach((e) => {
    if (e.quads.length === 2) {
      e.pt
        .copy(verts[e.a])
        .add(verts[e.b])
        .add(facePts[e.quads[0]])
        .add(facePts[e.quads[1]])
        .multiplyScalar(0.25);
    } else {
      e.pt.copy(verts[e.a]).add(verts[e.b]).multiplyScalar(0.5);
    }
  });

  for (let vi = 0; vi < nVerts; vi++) {
    const p = verts[vi];
    const adjQ = vertAdjQuads[vi];
    const adjE = vertAdjEdges[vi];
    const boundaryEdges = adjE.filter((e) => e.quads.length === 1);

    if (boundaryEdges.length >= 2) {
      const m0 = verts[boundaryEdges[0].a]
        .clone()
        .add(verts[boundaryEdges[0].b])
        .multiplyScalar(0.5);
      const m1 = verts[boundaryEdges[1].a]
        .clone()
        .add(verts[boundaryEdges[1].b])
        .multiplyScalar(0.5);
      nextVerts[vi] = p
        .clone()
        .multiplyScalar(6)
        .add(m0)
        .add(m1)
        .multiplyScalar(1 / 8);
    } else if (adjQ.length > 0 && adjE.length > 0) {
      const n = adjQ.length;
      const fAvg = new THREE.Vector3();
      for (const qi of adjQ) fAvg.add(facePts[qi]);
      fAvg.multiplyScalar(1 / n);

      const rAvg = new THREE.Vector3();
      for (const e of adjE) {
        rAvg.add(verts[e.a]).add(verts[e.b]);
      }
      rAvg.multiplyScalar(0.5 / adjE.length);

      nextVerts[vi] = fAvg
        .clone()
        .addScaledVector(rAvg, 2)
        .addScaledVector(p, n - 3)
        .multiplyScalar(1 / n);
    } else {
      nextVerts[vi] = p.clone();
    }
  }

  const faceNewIdx = new Array<number>(quads.length);
  for (let qi = 0; qi < quads.length; qi++) {
    faceNewIdx[qi] = nextVerts.length;
    nextVerts.push(facePts[qi]);
  }
  for (const e of edgeList) {
    e.newIdx = nextVerts.length;
    nextVerts.push(e.pt);
  }

  // 4. Emit 4 child quads per parent quad
  const nextQuads: QuadFace[] = [];
  for (let qi = 0; qi < quads.length; qi++) {
    const [v0, v1, v2, v3] = quads[qi].v;
    const [e01, e12, e23, e30] = quadEdges[qi];
    const fp = faceNewIdx[qi];
    const region = quads[qi].region;

    nextQuads.push({ v: [v0, e01.newIdx, fp, e30.newIdx], region });
    nextQuads.push({ v: [e01.newIdx, v1, e12.newIdx, fp], region });
    nextQuads.push({ v: [fp, e12.newIdx, v2, e23.newIdx], region });
    nextQuads.push({ v: [e30.newIdx, fp, e23.newIdx, v3], region });
  }

  // 5. Refine closed boundary loops consistently
  const refineLoop = (loop: number[]): number[] => {
    const out: number[] = [];
    for (let k = 0; k < loop.length; k++) {
      const a = loop[k];
      const b = loop[(k + 1) % loop.length];
      out.push(a);
      const e = edgeMap.get(getEdgeKey(a, b));
      out.push(e ? e.newIdx : a);
    }
    return out;
  };

  return {
    verts: nextVerts,
    quads: nextQuads,
    loops: {
      neck: refineLoop(loops.neck),
      leftCuff: refineLoop(loops.leftCuff),
      rightCuff: refineLoop(loops.rightCuff),
    },
  };
}

/** Subdivides base cage through N Catmull-Clark iterations */
function subdivideQuadMesh(cage: QuadCage, levels = 2): QuadCage {
  let current = cage;
  for (let i = 0; i < levels; i++) {
    current = catmullClarkStep(current);
  }
  return current;
}

/**
 * Sculpts asymmetric studio cloth folds, underarm radiating creases,
 * collar contact shading, and cool-neutral vertex AO on the subdivided mesh.
 */
function applyClothDrapesAndBakeAO(cage: QuadCage): Float32Array {
  const { verts, quads } = cage;
  const n = verts.length;

  const regMasks = new Uint8Array(n);
  for (const q of quads) {
    const bit = 1 << q.region;
    regMasks[q.v[0]] |= bit;
    regMasks[q.v[1]] |= bit;
    regMasks[q.v[2]] |= bit;
    regMasks[q.v[3]] |= bit;
  }

  const aoValues = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    const p = verts[i];
    const mask = regMasks[i];
    const isTorso = (mask & 1) !== 0;
    const isSleeve = (mask & 2) !== 0 || (mask & 4) !== 0;
    const isArmholeSeam = isTorso && isSleeve;
    const isInnerOnly = mask === 8;

    let ao = 1.0;

    if (isTorso) {
      const rLen = Math.hypot(p.x, p.z) || 1;
      const nx = p.x / rLen;
      const nz = p.z / rLen;
      let totalDisp = 0;

      // 1. Asymmetric front abdomen & waist diagonal gravity folds (fading cleanly above chest & at bottom hem lip)
      const hemClearMask = THREE.MathUtils.smoothstep(p.y, -0.785, -0.635);
      if (p.z > -0.05 && p.y < 0.22) {
        const chestClearMask = THREE.MathUtils.smoothstep(0.18 - p.y, 0.0, 0.36);
        const sideEnvelope = 0.58 + 0.42 * Math.exp(-Math.pow((p.x - 0.12) / 0.40, 2));
        const sweepA = Math.sin(p.x * 7.6 - p.y * 6.4 + 0.4 + Math.cos(p.y * 2.5) * 0.6);
        const sweepB = Math.sin(p.x * 11.4 + p.y * 5.2 - 0.9);
        const hemGather =
          p.y < -0.38
            ? Math.sin(p.y * 18.0 + p.x * 4.5) *
              Math.exp(-Math.pow((p.y + 0.58) / 0.18, 2)) *
              0.012
            : 0;
        const ridgeA = (Math.sign(sweepA) * Math.pow(Math.abs(sweepA), 0.78)) * 0.0215;
        const ridgeB = sweepB * 0.0085;
        const frontFold =
          (ridgeA + ridgeB + hemGather) * chestClearMask * sideEnvelope * hemClearMask;
        totalDisp += frontFold;
        ao -= Math.max(0, -frontFold) * 8.2;
      }

      // 2. Back lumbar & scapula horizontal-diagonal drapes
      if (p.z < -0.02 && p.y < 0.38) {
        const backMask = THREE.MathUtils.smoothstep(0.38 - p.y, 0.0, 0.30) * hemClearMask;
        const lumbarFold =
          (Math.sin(p.x * 6.8 + p.y * 5.6 - 0.3) * 0.014 +
            Math.cos(p.y * 15.0 + p.x * 2.8) * 0.0065) *
          backMask;
        totalDisp += lumbarFold;
        ao -= Math.max(0, -lumbarFold) * 7.2;
      }

      // 3. Radiating underarm tension creases (front & back armpit walls)
      if (Math.abs(p.x) > 0.32 && p.y > 0.05 && p.y < 0.38) {
        const armpitEnv =
          Math.exp(-Math.pow((p.y - 0.23) / 0.14, 2)) *
          Math.min(1, (Math.abs(p.x) - 0.32) / 0.16);
        const tension =
          Math.sin((Math.abs(p.x) * 14 - p.y * 11) * (p.z >= 0 ? 1 : -1)) *
          0.0075 *
          armpitEnv;
        totalDisp += tension;
        ao -= Math.max(0, -tension) * 7.0;
      }

      p.x += nx * totalDisp;
      p.z += nz * totalDisp * 0.82;

      // 4. Subtle contact shadow under the collar points & placket top on front clavicle
      if (p.z > 0.12 && p.y > 0.44 && p.y < 0.68 && Math.abs(p.x) < 0.23) {
        const collarShadow =
          Math.exp(-Math.pow((p.y - 0.56) / 0.09, 2)) *
          Math.exp(-Math.pow(p.x / 0.16, 2));
        ao -= collarShadow * 0.13;
      }
    }

    // 5. Gentle longitudinal cloth drape under lower sleeve faces (keeping outer bicep crisp)
    if (isSleeve && !isTorso && !isInnerOnly) {
      const sleeveDropEnv = Math.max(0, 0.45 - p.y);
      const sleeveRipple =
        Math.sin(p.z * 22.0 + p.y * 14.0) * 0.0048 * Math.min(1, sleeveDropEnv * 2.5);
      p.z += sleeveRipple;
      ao -= Math.max(0, -sleeveRipple) * 5.2;
    }

    // 6. Tailored inset stitch crease & contact shadow along shoulder armholes
    if (isArmholeSeam) {
      const sideSign = p.x >= 0 ? 1 : -1;
      p.x -= sideSign * 0.0032;
      p.z *= 0.994;
      ao = Math.min(ao, 0.87);
    }

    // 7. Deep underarm pit shadow
    if (Math.abs(p.x) > 0.36 && p.y > 0.08 && p.y < 0.36) {
      const pitProximity =
        Math.exp(-Math.pow((p.y - 0.24) / 0.12, 2)) *
        Math.min(1, (Math.abs(p.x) - 0.36) / 0.16);
      ao -= pitProximity * 0.16;
    }

    // 8. Inner sleeve/hem/neck lining shading
    if (isInnerOnly) {
      if (p.y > 0.50) {
        const depth = THREE.MathUtils.clamp((0.72 - p.y) / 0.18, 0, 1);
        ao = THREE.MathUtils.lerp(0.84, 0.44, depth);
      } else if (Math.abs(p.x) > 0.48) {
        const sleeveDepth = THREE.MathUtils.clamp((Math.abs(p.x) - 0.52) / 0.18, 0, 1);
        ao = THREE.MathUtils.lerp(0.30, 0.60, sleeveDepth);
      } else {
        ao = 0.44;
      }
    }

    ao = THREE.MathUtils.clamp(ao, 0.30, 1.0);
    // Cool photographic neutral ambient tint in recessed folds (prevents warm muddy grey)
    const coolShade = 1.0 - ao;
    aoValues[i * 3] = ao - coolShade * 0.025;
    aoValues[i * 3 + 1] = ao - coolShade * 0.008;
    aoValues[i * 3 + 2] = Math.min(1.0, ao + coolShade * 0.075);
  }

  return aoValues;
}

/** Compute smooth area-weighted vertex normals across the whole subdivided watertight mesh */
function computeSmoothManifoldNormals(
  verts: THREE.Vector3[],
  quads: QuadFace[]
): THREE.Vector3[] {
  const normals = Array.from({ length: verts.length }, () => new THREE.Vector3());
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();

  for (const q of quads) {
    const [a, b, c, d] = q.v;
    e1.subVectors(verts[b], verts[a]);
    e2.subVectors(verts[c], verts[a]);
    fn.crossVectors(e1, e2);
    normals[a].add(fn);
    normals[b].add(fn);
    normals[c].add(fn);

    e1.subVectors(verts[c], verts[a]);
    e2.subVectors(verts[d], verts[a]);
    fn.crossVectors(e1, e2);
    normals[a].add(fn);
    normals[c].add(fn);
    normals[d].add(fn);
  }

  for (const n of normals) {
    if (n.lengthSq() > 1e-10) n.normalize();
    else n.set(0, 0, 1);
  }
  return normals;
}

/** Builds sleeve cylindrical frame from subdivided armhole-to-cuff positions */
function computeSleeveFrame(
  verts: THREE.Vector3[],
  cuffLoop: number[],
  sideSign: 1 | -1
) {
  const cuffCenter = new THREE.Vector3();
  for (const idx of cuffLoop) cuffCenter.add(verts[idx]);
  cuffCenter.multiplyScalar(1 / cuffLoop.length);

  // Newell polygon normal along sleeve axis
  const axis = new THREE.Vector3();
  for (let i = 0; i < cuffLoop.length; i++) {
    const p1 = verts[cuffLoop[i]];
    const p2 = verts[cuffLoop[(i + 1) % cuffLoop.length]];
    axis.x += (p1.y - p2.y) * (p1.z + p2.z);
    axis.y += (p1.z - p2.z) * (p1.x + p2.x);
    axis.z += (p1.x - p2.x) * (p1.y + p2.y);
  }
  axis.normalize();
  if (axis.x * sideSign < 0) axis.negate();

  const uFront = new THREE.Vector3(0, 0, 1)
    .addScaledVector(axis, -axis.z)
    .normalize();
  const uUp = new THREE.Vector3().crossVectors(uFront, axis).normalize();
  if (uUp.y < 0) uUp.negate();

  const originRoot = cuffCenter.clone().addScaledVector(axis, -0.34);
  const cuffProj = cuffCenter.clone().sub(originRoot).dot(axis);
  return { originRoot, axis, uFront, uUp, rootProj: 0, cuffProj };
}

/**
 * Emits non-indexed GPU triangles grouped by material region (0..3) using the
 * pre-computed watertight manifold normals & seam-unwrapped cylindrical UVs.
 * Also builds front torso spatial index for barycentric placket/pocket mounting.
 */
function buildSubdividedGarmentGeometry(
  cage: QuadCage,
  aoColors: Float32Array
): {
  geo: THREE.BufferGeometry;
  frontTris: TriSample[];
  leftSleeveBounds: { rootProj: number; cuffProj: number };
  rightSleeveBounds: { rootProj: number; cuffProj: number };
} {
  const smoothNormals = computeSmoothManifoldNormals(cage.verts, cage.quads);
  const leftFrame = computeSleeveFrame(cage.verts, cage.loops.leftCuff, 1);
  const rightFrame = computeSleeveFrame(cage.verts, cage.loops.rightCuff, -1);

  // Track exact axial bounds of region 1 & 2 vertices along their sleeve axis
  let lMinProj = Infinity;
  let lMaxProj = -Infinity;
  let rMinProj = Infinity;
  let rMaxProj = -Infinity;
  for (const q of cage.quads) {
    if (q.region === 1) {
      for (const vi of q.v) {
        const proj = cage.verts[vi]
          .clone()
          .sub(leftFrame.originRoot)
          .dot(leftFrame.axis);
        if (proj < lMinProj) lMinProj = proj;
        if (proj > lMaxProj) lMaxProj = proj;
      }
    } else if (q.region === 2) {
      for (const vi of q.v) {
        const proj = cage.verts[vi]
          .clone()
          .sub(rightFrame.originRoot)
          .dot(rightFrame.axis);
        if (proj < rMinProj) rMinProj = proj;
        if (proj > rMaxProj) rMaxProj = proj;
      }
    }
  }

  // Group triangles strictly by region so geometry.groups match [torso, left, right, inner]
  const buckets: QuadFace[][] = [[], [], [], []];
  for (const q of cage.quads) buckets[q.region].push(q);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const frontTris: TriSample[] = [];

  const getRegionUV = (vi: number, region: RegionId): [number, number] => {
    const p = cage.verts[vi];
    if (region === 0 || region === 3) {
      const theta = Math.atan2(p.x, p.z);
      const u = theta / (Math.PI * 2) + 0.5;
      const v = THREE.MathUtils.clamp(
        (p.y - TORSO_Y_MIN) / (TORSO_Y_MAX - TORSO_Y_MIN),
        0.002,
        0.998
      );
      return [u, v];
    }

    const frame = region === 1 ? leftFrame : rightFrame;
    const cuffProj = region === 1 ? lMaxProj : rMaxProj;

    const rel = p.clone().sub(frame.originRoot);
    const proj = rel.dot(frame.axis);
    const rad = rel.addScaledVector(frame.axis, -proj);
    const cFront = rad.dot(frame.uFront);
    const cUp = rad.dot(frame.uUp);

    // Non-mirrored reading order:
    //  Left Sleeve (+X, looking -X):  u=0.25 Front (+Z, screen left) -> 0.50 Outer Bicep -> 0.75 Back (-Z, screen right) -> 0/1 Underarm seam
    //  Right Sleeve (-X, looking +X): u=0.25 Back (-Z, screen left) -> 0.50 Outer Bicep -> 0.75 Front (+Z, screen right) -> 0/1 Underarm seam
    const u =
      region === 1
        ? Math.atan2(-cFront, cUp) / (Math.PI * 2) + 0.5
        : Math.atan2(cFront, cUp) / (Math.PI * 2) + 0.5;
    // Constant perpendicular span 0.42 world units (= 21.0 cm) from cuff rim so 1:1 badge aspect is preserved
    const v = THREE.MathUtils.clamp((cuffProj - proj) / 0.42, 0.002, 0.998);
    return [u, v];
  };

  const geo = new THREE.BufferGeometry();
  let vertexOffset = 0;

  for (let reg = 0 as RegionId; reg < 4; reg = (reg + 1) as RegionId) {
    const start = vertexOffset;
    const regionQuads = buckets[reg];

    for (const q of regionQuads) {
      const tris: [number, number, number][] = [
        [q.v[0], q.v[1], q.v[2]],
        [q.v[0], q.v[2], q.v[3]],
      ];

      for (const [i0, i1, i2] of tris) {
        const p0 = cage.verts[i0];
        const p1 = cage.verts[i1];
        const p2 = cage.verts[i2];
        const n0 = smoothNormals[i0];
        const n1 = smoothNormals[i1];
        const n2 = smoothNormals[i2];

        const [u0Raw, v0] = getRegionUV(i0, reg);
        const [u1Raw, v1] = getRegionUV(i1, reg);
        const [u2Raw, v2] = getRegionUV(i2, reg);

        // Seam-unwrapping guard: never stretch across u=0/u=1 seam
        let u0 = u0Raw;
        let u1 = u1Raw;
        let u2 = u2Raw;
        const maxU = Math.max(u0, u1, u2);
        const minU = Math.min(u0, u1, u2);
        if (maxU - minU > 0.5) {
          if (u0 < 0.5) u0 += 1.0;
          if (u1 < 0.5) u1 += 1.0;
          if (u2 < 0.5) u2 += 1.0;
        }

        const corners = [
          { idx: i0, p: p0, n: n0, u: u0, v: v0 },
          { idx: i1, p: p1, n: n1, u: u1, v: v1 },
          { idx: i2, p: p2, n: n2, u: u2, v: v2 },
        ];

        for (const c of corners) {
          positions.push(c.p.x, c.p.y, c.p.z);
          normals.push(c.n.x, c.n.y, c.n.z);
          uvs.push(c.u, c.v);
          colors.push(
            aoColors[c.idx * 3],
            aoColors[c.idx * 3 + 1],
            aoColors[c.idx * 3 + 2]
          );
        }

        if (
          reg === 0 &&
          (p0.z > 0.02 || p1.z > 0.02 || p2.z > 0.02) &&
          Math.max(p0.x, p1.x, p2.x) >= -0.32 &&
          Math.min(p0.x, p1.x, p2.x) <= 0.44
        ) {
          frontTris.push({
            ax: p0.x,
            ay: p0.y,
            az: p0.z,
            bx: p1.x,
            by: p1.y,
            bz: p1.z,
            cx: p2.x,
            cy: p2.y,
            cz: p2.z,
            nax: n0.x,
            nay: n0.y,
            naz: n0.z,
            nbx: n1.x,
            nby: n1.y,
            nbz: n1.z,
            ncx: n2.x,
            ncy: n2.y,
            ncz: n2.z,
            minX: Math.min(p0.x, p1.x, p2.x),
            maxX: Math.max(p0.x, p1.x, p2.x),
            minY: Math.min(p0.y, p1.y, p2.y),
            maxY: Math.max(p0.y, p1.y, p2.y),
          });
        }

        vertexOffset += 3;
      }
    }

    geo.addGroup(start, vertexOffset - start, reg);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  return {
    geo,
    frontTris,
    leftSleeveBounds: { rootProj: lMinProj, cuffProj: lMaxProj },
    rightSleeveBounds: { rootProj: rMinProj, cuffProj: rMaxProj },
  };
}

/** Fast XY barycentric projection onto actual subdivided torso front surface */
function projectOntoTorsoFront(
  frontTris: TriSample[],
  x: number,
  y: number
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  let bestZ = -Infinity;
  let bestPos = new THREE.Vector3(x, y, 0.28);
  let bestNorm = new THREE.Vector3(0, 0, 1);
  let foundExact = false;

  for (const t of frontTris) {
    if (x < t.minX - 0.002 || x > t.maxX + 0.002 || y < t.minY - 0.002 || y > t.maxY + 0.002) {
      continue;
    }
    const v0x = t.bx - t.ax;
    const v0y = t.by - t.ay;
    const v1x = t.cx - t.ax;
    const v1y = t.cy - t.ay;
    const denom = v0x * v1y - v1x * v0y;
    if (Math.abs(denom) < 1e-9) continue;

    const px = x - t.ax;
    const py = y - t.ay;
    const u = (px * v1y - v1x * py) / denom;
    const v = (v0x * py - px * v0y) / denom;
    const w = 1 - u - v;

    if (u >= -0.02 && v >= -0.02 && w >= -0.02) {
      const z = w * t.az + u * t.bz + v * t.cz;
      if (z > bestZ) {
        bestZ = z;
        foundExact = true;
        bestPos.set(x, y, z);
        bestNorm
          .set(
            w * t.nax + u * t.nbx + v * t.ncx,
            w * t.nay + u * t.nby + v * t.ncy,
            w * t.naz + u * t.nbz + v * t.ncz
          )
          .normalize();
      }
    }
  }

  if (!foundExact) {
    // Fallback to nearest centroid
    let minD2 = Infinity;
    for (const t of frontTris) {
      const mx = (t.ax + t.bx + t.cx) / 3;
      const my = (t.ay + t.by + t.cy) / 3;
      const d2 = (mx - x) * (mx - x) + (my - y) * (my - y);
      if (d2 < minD2) {
        minD2 = d2;
        bestPos.set(x, y, (t.az + t.bz + t.cz) / 3);
        bestNorm
          .set(
            t.nax + t.nbx + t.ncx,
            t.nay + t.nby + t.ncy,
            t.naz + t.nbz + t.ncz
          )
          .normalize();
      }
    }
  }

  return { pos: bestPos, normal: bestNorm };
}

/**
 * Sweeps a 0-gap knitted rib cuff or turned hem cuff directly around the
 * extracted subdivided sleeve boundary loop in poloGroup coordinates.
 */
function buildCuffFromLoop(
  verts: THREE.Vector3[],
  cuffLoop: number[],
  sideSign: 1 | -1,
  mode: 'rib' | 'hem'
): THREE.BufferGeometry {
  const frame = computeSleeveFrame(verts, cuffLoop, sideSign);
  const cuffCenter = new THREE.Vector3();
  for (const vi of cuffLoop) cuffCenter.add(verts[vi]);
  cuffCenter.multiplyScalar(1 / cuffLoop.length);

  // Order points monotonically by angle around sleeve axis so UV u runs seamlessly 0..1
  const ordered = cuffLoop
    .map((vi) => {
      const p = verts[vi];
      const rad = p.clone().sub(cuffCenter);
      rad.addScaledVector(frame.axis, -rad.dot(frame.axis));
      const a = Math.atan2(rad.dot(frame.uUp), rad.dot(frame.uFront));
      return { p, radDir: rad.normalize(), angle: a };
    })
    .sort((a, b) => a.angle - b.angle);

  // Sleek true-scale knit rib & hem cuffs (with inner turns mapped to plain base v=0.98)
  const prof: Array<{ axial: number; radial: number; v: number }> =
    mode === 'rib'
      ? [
          { axial: -0.008, radial: -0.003, v: 0.99 },
          { axial: -0.008, radial: 0.0014, v: 0.95 },
          { axial: 0.0, radial: 0.0032, v: 0.78 },
          { axial: 0.012, radial: 0.0034, v: 0.54 },
          { axial: 0.026, radial: 0.0029, v: 0.30 },
          { axial: 0.036, radial: 0.0021, v: 0.14 },
          { axial: 0.042, radial: 0.0004, v: 0.02 },
          { axial: 0.037, radial: -0.0032, v: 0.98 },
          { axial: 0.014, radial: -0.0054, v: 0.99 },
        ]
      : [
          { axial: -0.008, radial: -0.0025, v: 0.98 },
          { axial: -0.008, radial: 0.0012, v: 0.92 },
          { axial: 0.008, radial: 0.0026, v: 0.55 },
          { axial: 0.024, radial: 0.0024, v: 0.18 },
          { axial: 0.034, radial: 0.0008, v: 0.02 },
          { axial: 0.029, radial: -0.0028, v: 0.97 },
          { axial: 0.010, radial: -0.0046, v: 0.99 },
        ];

  const M = ordered.length;
  const S = prof.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j < S; j++) {
    const st = prof[j];
    for (let i = 0; i <= M; i++) {
      const pt = ordered[i % M];
      const pos = pt.p
        .clone()
        .addScaledVector(frame.axis, st.axial)
        .addScaledVector(pt.radDir, st.radial);
      positions.push(pos.x, pos.y, pos.z);
      uvs.push(i / M, st.v);
    }
  }

  for (let j = 0; j < S - 1; j++) {
    for (let i = 0; i < M; i++) {
      const a = j * (M + 1) + i;
      const b = a + 1;
      const c = a + (M + 1) + 1;
      const d = a + (M + 1);

      const pa = new THREE.Vector3(positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]);
      const pb = new THREE.Vector3(positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]);
      const pc = new THREE.Vector3(positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2]);
      const n = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa));
      const midRad = pa.clone().sub(cuffCenter);

      // Ensure outer face points outward for j in 1..6 and inward for tucked return j=S-2
      const expectOut = j < S - 2 ? 1 : -1;
      if (n.dot(midRad) * expectOut >= 0) {
        indices.push(a, b, c, a, c, d);
      } else {
        indices.push(a, c, b, a, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Helper resampling closed neckline loop cleanly at desired angle theta from front (+Z) */
function sampleNecklineAtAngle(
  neckVerts: THREE.Vector3[],
  theta: number
): { pos: THREE.Vector3; radOut: THREE.Vector3 } {
  const targetU = Math.atan2(Math.sin(theta), Math.cos(theta));
  const withAngle = neckVerts
    .map((p) => ({
      p,
      ang: Math.atan2(p.x, p.z),
    }))
    .sort((a, b) => a.ang - b.ang);

  const count = withAngle.length;
  for (let i = 0; i < count; i++) {
    const cur = withAngle[i];
    const nxt = withAngle[(i + 1) % count];
    let a0 = cur.ang;
    let a1 = nxt.ang;
    if (i === count - 1) a1 += Math.PI * 2;
    let tU = targetU;
    if (tU < a0 && i === count - 1) tU += Math.PI * 2;

    if (tU >= a0 - 1e-4 && tU <= a1 + 1e-4) {
      const alpha = THREE.MathUtils.clamp((tU - a0) / Math.max(1e-5, a1 - a0), 0, 1);
      const pos = new THREE.Vector3().lerpVectors(cur.p, nxt.p, alpha);
      const radOut = new THREE.Vector3(pos.x, 0, pos.z).normalize();
      return { pos, radOut };
    }
  }
  const fallback = neckVerts[0];
  return {
    pos: fallback.clone(),
    radOut: new THREE.Vector3(fallback.x, 0, fallback.z).normalize(),
  };
}

/**
 * Builds crisp tailored fold-over polo collar directly from subdivided neckline loop:
 * tall structured back stand -> tight pressed roll -> sharp triangular front collar points
 * surface-projected flush over the upper chest curve with sealed front leaf end-caps.
 */
function buildPoloCollarFromNeckLoop(
  neckVerts: THREE.Vector3[],
  frontTris: TriSample[]
): THREE.BufferGeometry {
  const segU = 72;
  const profSteps = 10;
  const openHalfGap = 0.048; // Crisp tailored V-junction at top placket entrance

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const gridV: THREE.Vector3[][] = [];

  for (let i = 0; i <= segU; i++) {
    const uFrac = i / segU;
    const theta = THREE.MathUtils.lerp(
      openHalfGap,
      Math.PI * 2 - openHalfGap,
      uFrac
    );
    const { pos: root, radOut } = sampleNecklineAtAngle(neckVerts, theta);

    const tipDist = Math.min(uFrac, 1 - uFrac) * 2; // 0 at placket tips, 1 at back center
    const frontFactor = Math.exp(-Math.pow(tipDist / 0.36, 2)); // Sharp triangular blade wings
    const standH = THREE.MathUtils.lerp(0.036, 0.088, Math.min(1, tipDist * 1.9));
    const bladeLen = THREE.MathUtils.lerp(0.082, 0.168, Math.pow(frontFactor, 0.82));
    const flareOut = THREE.MathUtils.lerp(0.072, 0.062, frontFactor * 0.65);
    const yTipBoost = frontFactor * 0.014;

    const ringPts: THREE.Vector3[] = [];
    for (let j = 0; j <= profSteps; j++) {
      const s = j / profSteps;
      let dr = 0;
      let dy = 0;
      let vCoord = 0;

      if (s <= 0.32) {
        const k = s / 0.32;
        dr = THREE.MathUtils.lerp(-0.008, -0.015, k);
        dy = THREE.MathUtils.lerp(-0.018, standH, k);
        vCoord = k * 0.12;
      } else if (s <= 0.48) {
        const k = (s - 0.32) / 0.16;
        const a = k * Math.PI * 0.5;
        dr = -0.015 + (1 - Math.cos(a)) * 0.026;
        dy = standH + Math.sin(a) * 0.015;
        vCoord = 0.12 + k * 0.14;
      } else if (s <= 0.92) {
        const k = (s - 0.48) / 0.44;
        const curve = Math.pow(k, 1.04);
        dr = 0.011 + curve * flareOut;
        dy = standH + 0.015 - curve * bladeLen - yTipBoost * Math.sin(k * Math.PI);
        vCoord = 0.26 + k * 0.70;
      } else {
        const k = (s - 0.92) / 0.08;
        dr = 0.011 + flareOut - k * 0.006;
        dy = standH + 0.015 - bladeLen + k * 0.004;
        vCoord = 0.96 - k * 0.08;
      }

      const pt = root.clone().addScaledVector(radOut, dr);
      pt.y += dy;
      if (frontFactor > 0.12 && s > 0.48) {
        const k = THREE.MathUtils.clamp((s - 0.48) / 0.44, 0, 1);
        const sideSign = pt.x >= 0 ? 1 : -1;
        pt.x += sideSign * frontFactor * 0.056 * Math.pow(k, 1.05);
        pt.z += frontFactor * 0.024 * k;
      }

      // Enforce flush external clearance over anterior chest pecs so sharp collar tips never sink into shirt
      if (s > 0.46 && pt.z > 0.06 && tipDist < 0.72) {
        const kOuter = THREE.MathUtils.clamp((s - 0.46) / 0.46, 0, 1);
        const hit = projectOntoTorsoFront(frontTris, pt.x, pt.y);
        if (hit.pos.z > 0.05) {
          const minFrontZ = hit.pos.z + 0.013 - kOuter * 0.006;
          if (pt.z < minFrontZ) {
            pt.z = minFrontZ;
          }
        }
      }

      ringPts.push(pt);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(uFrac, vCoord);
    }
    gridV.push(ringPts);
  }

  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < profSteps; j++) {
      const a = i * (profSteps + 1) + j;
      const b = (i + 1) * (profSteps + 1) + j;
      const c = (i + 1) * (profSteps + 1) + j + 1;
      const d = i * (profSteps + 1) + j + 1;

      const pa = gridV[i][j];
      const pb = gridV[i + 1][j];
      const pc = gridV[i + 1][j + 1];
      const n = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa));
      const radial = new THREE.Vector3(pa.x, j < 4 ? 0 : 0.25, pa.z);
      const expectOut = j >= profSteps - 1 ? -1 : j < 3 ? -1 : 1;

      if (n.dot(radial) * expectOut >= 0) {
        indices.push(a, b, c, a, c, d);
      } else {
        indices.push(a, c, b, a, d, c);
      }
    }
  }

  // Seal both front collar leaf vertical end-caps cleanly so close-ups show fabric fold thickness
  const addEndCap = (ringIdx: number, capNormalX: -1 | 1) => {
    const base = ringIdx * (profSteps + 1);
    const expect = new THREE.Vector3(capNormalX, 0, 0);
    for (let s = 0; s < 4; s++) {
      const iIn = base + s;
      const iInNext = base + s + 1;
      const iOut = base + (profSteps - 1 - s);
      const iOutPrev = base + (profSteps - 2 - s);
      if (iOutPrev <= iInNext) break;
      const pa = gridV[ringIdx][s];
      const pb = gridV[ringIdx][s + 1];
      const pc = gridV[ringIdx][profSteps - 1 - s];
      const triN = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa));
      if (triN.dot(expect) >= 0) {
        indices.push(iIn, iInNext, iOut, iIn, iOut, iOutPrev);
      } else {
        indices.push(iIn, iOut, iInNext, iIn, iOutPrev, iOut);
      }
    }
  };
  addEndCap(0, -1);
  addEndCap(segU, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds slim upright Mandarin/Technician stand-collar directly from subdivided neckline loop.
 */
function buildStandCollarFromNeckLoop(neckVerts: THREE.Vector3[]): THREE.BufferGeometry {
  const segU = 64;
  const profSteps = 6;
  const openHalfGap = 0.032; // Neat snug placket meet at front throat

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const gridV: THREE.Vector3[][] = [];

  for (let i = 0; i <= segU; i++) {
    const uFrac = i / segU;
    const theta = THREE.MathUtils.lerp(
      openHalfGap,
      Math.PI * 2 - openHalfGap,
      uFrac
    );
    const { pos: root, radOut } = sampleNecklineAtAngle(neckVerts, theta);

    const tipDist = Math.min(uFrac, 1 - uFrac) * 2;
    const cornerEase = Math.min(1, Math.pow(tipDist / 0.14, 0.7));
    const colH = 0.072 * (0.58 + 0.42 * cornerEase);

    const ringPts: THREE.Vector3[] = [];
    for (let j = 0; j <= profSteps; j++) {
      const s = j / profSteps; // 0..0.42 inner face up -> 0.50 rounded top edge -> 0.58..1.0 outer face down
      let dr = 0;
      let dy = 0;
      if (s <= 0.44) {
        const k = s / 0.44;
        dr = THREE.MathUtils.lerp(-0.008, -0.017, k);
        dy = THREE.MathUtils.lerp(-0.018, colH, k);
      } else if (s <= 0.56) {
        const k = (s - 0.44) / 0.12;
        dr = THREE.MathUtils.lerp(-0.017, -0.008, k);
        dy = colH + Math.sin(k * Math.PI) * 0.005;
      } else {
        const k = (s - 0.56) / 0.44;
        dr = THREE.MathUtils.lerp(-0.008, 0.004, k);
        dy = THREE.MathUtils.lerp(colH, -0.016, k);
      }

      const pt = root.clone().addScaledVector(radOut, dr);
      pt.y += dy;
      ringPts.push(pt);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(uFrac, s); // s=0.48..0.52 aligns fine piping at top stand rim!
    }
    gridV.push(ringPts);
  }

  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < profSteps; j++) {
      const a = i * (profSteps + 1) + j;
      const b = (i + 1) * (profSteps + 1) + j;
      const c = (i + 1) * (profSteps + 1) + j + 1;
      const d = i * (profSteps + 1) + j + 1;

      const pa = gridV[i][j];
      const pb = gridV[i + 1][j];
      const pc = gridV[i + 1][j + 1];
      const n = new THREE.Vector3().subVectors(pb, pa).cross(new THREE.Vector3().subVectors(pc, pa));
      const radial = new THREE.Vector3(pa.x, j === 2 || j === 3 ? 0.5 : 0, pa.z);
      const expectOut = j < 2 ? -1 : 1;

      if (n.dot(radial) * expectOut >= 0) {
        indices.push(a, b, c, a, c, d);
      } else {
        indices.push(a, c, b, a, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Projects curved placket flush onto actual subdivided torso front surface */
function buildProjectedPlacket(
  frontTris: TriSample[],
  yBottom: number,
  yTop: number,
  width: number,
  fullLength: boolean
): THREE.BufferGeometry {
  const segX = 12;
  const segY = fullLength ? 44 : 24;
  const thickness = 0.0068;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segY; j++) {
    const v = j / segY;
    const y = THREE.MathUtils.lerp(yBottom, yTop, v);
    const botBevel = fullLength ? Math.min(1, v * 18) : Math.min(1, v * 12);

    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const x = (u - 0.5) * width;
      const hit = projectOntoTorsoFront(frontTris, x, y);
      const sideBevel = Math.pow(Math.sin(u * Math.PI), 0.30);
      const lift = 0.0018 + thickness * sideBevel * botBevel;

      const p = hit.pos.addScaledVector(hit.normal, lift);
      positions.push(p.x, p.y, p.z);
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

/** Projects tailored mitered 3D utility pocket flush onto actual left-chest torso surface */
function buildProjectedLeftChestPocket(
  frontTris: TriSample[],
  xCenter = 0.238,
  yCenter = 0.258
): THREE.BufferGeometry {
  const segX = 16;
  const segY = 18;
  const width = 0.215;
  const height = 0.242;
  const yBottom = yCenter - height * 0.52;
  const yTop = yCenter + height * 0.48;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segY; j++) {
    const pv = j / segY;
    const y = THREE.MathUtils.lerp(yBottom, yTop, pv);
    const miter = pv < 0.14 ? 0.78 + (pv / 0.14) * 0.22 : 1.0;

    for (let i = 0; i <= segX; i++) {
      const pu = i / segX;
      const x = xCenter + (pu - 0.5) * width * miter;
      const hit = projectOntoTorsoFront(frontTris, x, y);

      const sideFade = Math.sin(pu * Math.PI);
      const botFade = Math.min(1, pv * 10);
      const hemLip =
        pv > 0.85 ? Math.sin(((pv - 0.85) / 0.15) * Math.PI) * 0.0025 : 0;
      const lift =
        0.0018 +
        0.0062 * Math.pow(sideFade, 0.26) * Math.pow(botFade, 0.35) +
        hemLip;

      const p = hit.pos.addScaledVector(hit.normal, lift);
      positions.push(p.x, p.y, p.z);
      uvs.push(pu, pv);
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

/** Curved woven neck label tag seated flush inside the back nape inner lining */
function buildWovenNeckTagGeometry(neckVerts: THREE.Vector3[]): THREE.BufferGeometry {
  const { pos: backApex } = sampleNecklineAtAngle(neckVerts, Math.PI);
  const segX = 10;
  const segY = 6;
  const tagW = 0.145;
  const tagH = 0.072;
  const yTop = backApex.y - 0.025;
  const yBot = yTop - tagH;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segY; j++) {
    const v = j / segY;
    const y = THREE.MathUtils.lerp(yBot, yTop, v);
    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const x = (u - 0.5) * tagW;
      // Match inner curvature of back yoke without piercing outside back wall
      const curveZ = backApex.z * 0.90 + x * x * 1.45 + 0.012;
      positions.push(x, y, curveZ);
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
 * Single entry point constructing the entire watertight subdivided garment assembly,
 * collars, zero-gap cuffs, flush plackets, pocket, and button mounts.
 */
export function createUnifiedGarmentSystem(): UnifiedGarmentResult {
  const baseCage = buildBaseGarmentCage();
  const subCage = subdivideQuadMesh(baseCage, 3); // Level-3 Catmull-Clark for silky sculptural folds
  const aoColors = applyClothDrapesAndBakeAO(subCage);

  const { geo: garmentGeo, frontTris, leftSleeveBounds, rightSleeveBounds } =
    buildSubdividedGarmentGeometry(subCage, aoColors);

  const neckVerts = subCage.loops.neck.map((vi) => subCage.verts[vi]);
  const frontCenterNeck = sampleNecklineAtAngle(neckVerts, 0).pos;

  const poloCollarGeo = buildPoloCollarFromNeckLoop(neckVerts, frontTris);
  const standCollarGeo = buildStandCollarFromNeckLoop(neckVerts);

  const leftRibCuffGeo = buildCuffFromLoop(
    subCage.verts,
    subCage.loops.leftCuff,
    1,
    'rib'
  );
  const rightRibCuffGeo = buildCuffFromLoop(
    subCage.verts,
    subCage.loops.rightCuff,
    -1,
    'rib'
  );
  const leftHemCuffGeo = buildCuffFromLoop(
    subCage.verts,
    subCage.loops.leftCuff,
    1,
    'hem'
  );
  const rightHemCuffGeo = buildCuffFromLoop(
    subCage.verts,
    subCage.loops.rightCuff,
    -1,
    'hem'
  );

  // Align slim plackets directly to the front neckline scoop with realistic 1.3 cm buttons
  const poloYTop = frontCenterNeck.y + 0.022;
  const poloYBottom = poloYTop - 0.34;
  const poloButtonYs = [
    poloYTop - 0.055,
    poloYTop - 0.148,
    poloYTop - 0.241,
  ];

  const standYTop = frontCenterNeck.y + 0.022;
  const standYBottom = -0.765;
  const standButtonYs = [
    standYTop - 0.065,
    standYTop - 0.292,
    standYTop - 0.519,
    standYTop - 0.746,
    standYTop - 0.973,
    standYTop - 1.200,
  ];

  const poloPlacketGeo = buildProjectedPlacket(
    frontTris,
    poloYBottom,
    poloYTop,
    0.072,
    false
  );
  const standPlacketGeo = buildProjectedPlacket(
    frontTris,
    standYBottom,
    standYTop,
    0.068,
    true
  );

  const chestXCenter = 0.242;
  const chestYCenter = 0.258;
  const chestPocketGeo = buildProjectedLeftChestPocket(
    frontTris,
    chestXCenter,
    chestYCenter
  );

  const mountButtons = (ys: number[]): ButtonMount[] =>
    ys.map((by) => {
      const hit = projectOntoTorsoFront(frontTris, 0, by);
      const pos = hit.pos.clone().addScaledVector(hit.normal, 0.0102);
      const rotX = -Math.atan2(hit.normal.y, hit.normal.z);
      const rotY = Math.atan2(hit.normal.x, hit.normal.z);
      return { pos, rotX, rotY };
    });

  const poloButtonMounts = mountButtons(poloButtonYs);
  const standButtonMounts = mountButtons(standButtonYs);

  // Compute exact anatomical left-chest UV matching chestXCenter & chestYCenter
  const chestHit = projectOntoTorsoFront(frontTris, chestXCenter, chestYCenter);
  const midChestTheta = Math.atan2(chestHit.pos.x, chestHit.pos.z);
  const midChestU = midChestTheta / (Math.PI * 2) + 0.5;
  const midChestV = THREE.MathUtils.clamp(
    (chestYCenter - TORSO_Y_MIN) / (TORSO_Y_MAX - TORSO_Y_MIN),
    0.05,
    0.95
  );

  const neckTagGeo = buildWovenNeckTagGeometry(neckVerts);

  return {
    garmentGeo,
    poloCollarGeo,
    standCollarGeo,
    leftRibCuffGeo,
    rightRibCuffGeo,
    leftHemCuffGeo,
    rightHemCuffGeo,
    poloPlacketGeo,
    standPlacketGeo,
    chestPocketGeo,
    neckTagGeo,
    poloPlacketMeta: {
      yBottom: poloYBottom,
      yTop: poloYTop,
      buttonYs: poloButtonYs,
    },
    standPlacketMeta: {
      yBottom: standYBottom,
      yTop: standYTop,
      buttonYs: standButtonYs,
    },
    poloButtonMounts,
    standButtonMounts,
    torsoBounds: {
      yMin: TORSO_Y_MIN,
      yMax: TORSO_Y_MAX,
      midChestU,
      midChestCanvasY: 1 - midChestV,
    },
    leftSleeveBounds,
    rightSleeveBounds,
  };
}

/**
 * Generates procedural PBR normal & roughness maps for Cotton Piqué, Heavy Twill, or Dry-Fit fabric.
 */
export function createFabricPBRMaps(fabricType: FabricType): FabricPBRPreset {
  const size = 512;
  const heightField = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (fabricType === 'heavy-twill') {
        const diag = ((x + y) / size) * Math.PI * 2 * 68;
        const counter = ((x - y) / size) * Math.PI * 2 * 38;
        heightField[y * size + x] =
          Math.sin(diag) * 0.72 +
          Math.cos(diag * 2) * 0.20 +
          Math.sin(counter) * 0.14;
      } else if (fabricType === 'dry-fit') {
        const u = (x / size) * 72;
        const v = (y / size) * 72;
        const stagger = Math.floor(v) % 2 === 0 ? 0 : 0.5;
        const fx = u + stagger - Math.floor(u + stagger) - 0.5;
        const fy = v - Math.floor(v) - 0.5;
        const d2 = fx * fx + fy * fy;
        const pore = Math.exp(-d2 * 14) * -0.95;
        const meshRidge =
          Math.cos(fx * Math.PI * 2) * 0.25 + Math.cos(fy * Math.PI * 2) * 0.25;
        heightField[y * size + x] = pore + meshRidge;
      } else {
        const u = (x / size) * 56;
        const v = (y / size) * 56;
        const cellY = v - Math.floor(v);
        const cellX = u - Math.floor(u);
        const stagger = Math.floor(v) % 2 === 0 ? 0 : 0.5;
        const sx = u + stagger - Math.floor(u + stagger);
        const ridge1 = Math.sin(sx * Math.PI) * Math.sin(cellY * Math.PI);
        const ridge2 = Math.cos((cellX - 0.5) * Math.PI * 2) * 0.26;
        const yarnMicro =
          Math.sin(x * 1.45 + y * 0.5) * 0.08 + Math.cos(y * 1.9 - x * 0.35) * 0.06;
        heightField[y * size + x] = ridge1 * 0.84 + ridge2 + yarnMicro;
      }
    }
  }

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  const strength =
    fabricType === 'heavy-twill' ? 1.85 : fabricType === 'dry-fit' ? 1.55 : 2.1;
  const roughBase =
    fabricType === 'heavy-twill' ? 216 : fabricType === 'dry-fit' ? 174 : 232;

  if (nCtx && rCtx) {
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const nd = nImg.data;
    const rd = rImg.data;

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

        const hVal = heightField[y * size + x];
        const roughByte = Math.round(
          Math.min(252, Math.max(138, roughBase - hVal * 26))
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

  const repeatCount =
    fabricType === 'heavy-twill' ? 24 : fabricType === 'dry-fit' ? 26 : 22;

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeatCount, repeatCount);

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatCount, repeatCount);

  if (fabricType === 'heavy-twill') {
    return {
      normalMap,
      roughnessMap,
      roughness: 0.84,
      sheen: 0.48,
      sheenRoughness: 0.60,
      normalScale: 0.56,
    };
  }
  if (fabricType === 'dry-fit') {
    return {
      normalMap,
      roughnessMap,
      roughness: 0.72,
      sheen: 0.76,
      sheenRoughness: 0.45,
      normalScale: 0.46,
    };
  }
  return {
    normalMap,
    roughnessMap,
    roughness: 0.90,
    sheen: 0.70,
    sheenRoughness: 0.68,
    normalScale: 0.65,
  };
}

/** Generates a crisp 512px procedural Ribbed Knit Normal Map for collars & cuffs */
export function createRibKnitNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const ribAngle = (x / size) * Math.PI * 2 * 76;
        const courseAngle = (y / size) * Math.PI * 2 * 38;
        const dx = Math.cos(ribAngle) * 0.72;
        const dy = Math.cos(courseAngle) * 0.16;
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
  tex.repeat.set(8, 2);
  return tex;
}

/** Builds a high-contrast photographic studio softbox IBL environment texture */
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
    addPanel('#FFFDF8', 2.4, [0, 6.5, 1.5], [7.5, 5.5, 1]),
    addPanel('#FFF6EA', 2.8, [5.5, 2.8, 5.2], [4.2, 5.8, 1]),
    addPanel('#E4F0FB', 1.55, [-6.0, 2.0, 3.8], [4.5, 5.4, 1]),
    addPanel('#EEF6FF', 2.2, [-4.2, 3.4, -5.8], [2.4, 5.0, 1]),
    addPanel('#FFF7EE', 1.9, [4.2, 3.4, -5.8], [2.4, 5.0, 1]),
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

/** Builds a realistic 4-hole concaved button group with subtle rim bevel & crossed threads */
export function createDetailedButtonGroup(
  buttonMat: THREE.Material,
  threadMat: THREE.Material
): {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
} {
  const group = new THREE.Group();

  const profile = [
    new THREE.Vector2(0.0, -0.0024),
    new THREE.Vector2(0.0124, -0.0024),
    new THREE.Vector2(0.0132, 0.0),
    new THREE.Vector2(0.0126, 0.0040),
    new THREE.Vector2(0.0102, 0.0045),
    new THREE.Vector2(0.0086, 0.0026),
    new THREE.Vector2(0.0, 0.0022),
  ];
  const buttonGeo = new THREE.LatheGeometry(profile, 24);
  buttonGeo.rotateX(Math.PI / 2);

  const threadGeo = new THREE.CylinderGeometry(0.0010, 0.0010, 0.0075, 6);

  const btnMesh = new THREE.Mesh(buttonGeo, buttonMat);
  group.add(btnMesh);

  const t1 = new THREE.Mesh(threadGeo, threadMat);
  t1.position.set(0, 0, 0.0030);
  t1.rotation.z = Math.PI / 4;
  const t2 = new THREE.Mesh(threadGeo, threadMat);
  t2.position.set(0, 0, 0.0032);
  t2.rotation.z = -Math.PI / 4;
  group.add(t1, t2);

  return { group, geometries: [buttonGeo, threadGeo] };
}

/** Seamless curved Photo Studio Cyclorama backdrop sweep */
export function createStudioCycloramaGeometry(): THREE.BufferGeometry {
  const segX = 28;
  const segT = 22;
  const width = 16.0;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segT; j++) {
    const t = j / segT;
    let z: number;
    let y: number;
    if (t <= 0.52) {
      const k = t / 0.52;
      z = THREE.MathUtils.lerp(3.4, -1.45, k);
      y = -0.96;
    } else if (t <= 0.82) {
      const k = (t - 0.52) / 0.30;
      const a = k * (Math.PI / 2);
      const R = 2.15;
      z = -1.45 - Math.sin(a) * R;
      y = -0.96 + (1 - Math.cos(a)) * R;
    } else {
      const k = (t - 0.82) / 0.18;
      z = -3.6;
      y = 1.19 + k * 2.4;
    }

    for (let i = 0; i <= segX; i++) {
      const u = i / segX - 0.5;
      positions.push(u * width, y, z);
    }
  }

  for (let j = 0; j < segT; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + (segX + 1) + 1;
      const d = a + (segX + 1);
      indices.push(a, d, c, a, c, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Paints knit collar or cuff canvas including optional 1 or 2 woven tipping stripes */
export function paintTrimCanvas(
  canvas: HTMLCanvasElement,
  baseColor: string,
  tippingStyle: TippingStyle,
  tippingColor: string,
  mode: 'collar' | 'cuff',
  garmentStyle: GarmentStyle = 'polo'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let x = 0; x < w; x += 6) {
    ctx.fillRect(x, 0, 2, h);
  }

  if (tippingStyle !== 'none') {
    ctx.fillStyle = tippingColor;
    if (mode === 'collar') {
      if (garmentStyle === 'stand-collar') {
        const sH = Math.max(4, Math.round(h * 0.045));
        if (tippingStyle === 'single') {
          ctx.fillRect(0, Math.round(h * 0.48), w, sH);
        } else {
          ctx.fillRect(0, Math.round(h * 0.45), w, sH);
          ctx.fillRect(0, Math.round(h * 0.53), w, sH);
        }
      } else {
        const yOuter = Math.round(h * 0.075);
        const sH = Math.max(4, Math.round(h * 0.036));
        const gap = Math.max(4, Math.round(h * 0.032));
        if (tippingStyle === 'single') {
          ctx.fillRect(0, yOuter, w, sH + 2);
        } else {
          ctx.fillRect(0, yOuter, w, sH);
          ctx.fillRect(0, yOuter + sH + gap, w, sH);
        }
      }
    } else {
      const yOuter = Math.round(h * 0.72);
      const sH = Math.max(4, Math.round(h * 0.052));
      const gap = Math.max(4, Math.round(h * 0.045));
      if (tippingStyle === 'single') {
        ctx.fillRect(0, yOuter, w, sH + 2);
      } else {
        ctx.fillRect(0, yOuter, w, sH);
        ctx.fillRect(0, yOuter - sH - gap, w, sH);
      }
    }
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/** Paints tailored left-chest patch pocket fabric, perimeter top-stitching, and centered emblem */
export function paintPocketCanvas(
  canvas: HTMLCanvasElement,
  shirtColor: string,
  isLight: boolean,
  logoCanvas: HTMLCanvasElement | null,
  logoWidthCm: number,
  useMultiply: boolean,
  hasPatchShadow: boolean
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = isLight ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.018)';
  for (let x = 0; x < w; x += 6) {
    ctx.fillRect(x, 0, 2, h);
  }

  const edgeGrad = ctx.createLinearGradient(0, 0, 0, h);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0.04)');
  edgeGrad.addColorStop(0.14, 'rgba(0,0,0,0.11)');
  edgeGrad.addColorStop(0.2, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, w, h);

  const stitch = isLight ? 'rgba(20, 30, 44, 0.24)' : 'rgba(255, 255, 255, 0.20)';
  ctx.strokeStyle = stitch;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(14, 10, w - 28, h - 24);
  ctx.beginPath();
  ctx.moveTo(14, h * 0.14);
  ctx.lineTo(w - 14, h * 0.14);
  ctx.stroke();
  ctx.setLineDash([]);

  if (logoCanvas) {
    const POCKET_REAL_CM = 10.8;
    const pxPerCm = w / POCKET_REAL_CM;
    const aspect = logoCanvas.height / Math.max(1, logoCanvas.width);
    const dw = Math.min(w * 0.84, Math.max(24, logoWidthCm * pxPerCm));
    const dh = Math.min(h * 0.72, dw * aspect);
    const clampedW = dh / aspect;
    const cx = w * 0.5;
    const cy = h * 0.54;

    ctx.save();
    if (useMultiply) {
      ctx.globalCompositeOperation = 'multiply';
    } else if (hasPatchShadow) {
      ctx.shadowColor = 'rgba(10, 18, 30, 0.26)';
      ctx.shadowBlur = Math.max(2, clampedW * 0.03);
      ctx.shadowOffsetY = 2;
    }
    ctx.drawImage(logoCanvas, cx - clampedW / 2, cy - dh / 2, clampedW, dh);
    ctx.restore();
  }
}

/** Paints woven brand neck tag canvas */
export function paintWovenNeckTagCanvas(canvas: HTMLCanvasElement): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#141D2E';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(229, 197, 115, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#E5C573';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 46px "Prompt", sans-serif';
  ctx.fillText('62 · RS', w / 2, h * 0.42);

  ctx.fillStyle = '#D8E0EA';
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  ctx.fillText('RAJASIT 62 · L', w / 2, h * 0.74);
}
