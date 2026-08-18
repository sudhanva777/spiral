import * as THREE from 'three';
import type { PlanetConfig } from '../../../types/starSystem';
import type { GalaxyConfig } from '../../../types/universe';
import { MoonMesh } from '../MoonMesh';
import { generateGalaxyParticles } from '../../utils/galaxyMath';
import { IC1579_CONFIG } from '../../galaxies/registry';
import { GEMINI_CITY_DIRS } from './cityDirs';
import {
  surfaceTerrainVertexShader,
  surfaceTerrainFragmentShader,
  surfaceCloudVertexShader,
  surfaceCloudFragmentShader,
  surfaceSkyVertexShader,
  surfaceSkyFragmentShader,
  surfaceStarVertexShader,
  surfaceStarFragmentShader,
  surfaceVegetationVertexShader,
  surfaceVegetationFragmentShader,
} from './surfaceShaders';

// ============================================================================
// JS 3D Simplex noise (deterministic CPU bake — mirrors the GLSL notion)
// ============================================================================
const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];
const perm = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

function simplex3(xin: number, yin: number, zin: number): number {
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);
  const t = (i + j + k) * G3;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const z0 = zin - (k - t);

  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0) {
    t0 *= t0;
    n0 = t0 * t0 * dot3(grad3[perm[ii + perm[jj + perm[kk]]] % 12], x0, y0, z0);
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0) {
    t1 *= t1;
    n1 = t1 * t1 * dot3(grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12], x1, y1, z1);
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0) {
    t2 *= t2;
    n2 = t2 * t2 * dot3(grad3[perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12], x2, y2, z2);
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0) {
    t3 *= t3;
    n3 = t3 * t3 * dot3(grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12], x3, y3, z3);
  }
  return 32.0 * (n0 + n1 + n2 + n3);
}

function fbm3(x: number, y: number, z: number, octaves: number): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * simplex3(x * freq, y * freq, z * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return v;
}

const HEIGHT_MAP_W = 768;
const HEIGHT_MAP_H = 384;

// ============================================================================
// PLANETARY SURFACE EXPERIENCE
//
// Continuous descent: orbit -> cloud deck -> surface -> night sky.
// The sky dome derives its galaxy band from the planet's actual position
// inside IC 1579 — the night sky IS the galaxy.
//
// The surface palette (oceans, land, rock, snow, bioluminescence, haze) is
// derived per-planet from the PlanetConfig colors, so every habitable world
// keeps the IC 1579 emerald/teal language but reads as its own place.
// ============================================================================
export class SurfaceExperience {
  public group: THREE.Group;
  public radius: number;

  private terrainMesh: THREE.Mesh;
  private terrainMaterial: THREE.ShaderMaterial;
  private cloudMesh: THREE.Mesh;
  private cloudMaterial: THREE.ShaderMaterial;
  private skyDomeMesh: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private bandPoints: THREE.Points;
  private bandMaterial: THREE.ShaderMaterial;
  private starPoints: THREE.Points;
  private starMaterial: THREE.ShaderMaterial;
  private heightTexture: THREE.DataTexture;
  private terrainScale = 0.8;

  // Galaxy band particle data (generated once from the IC 1579 population)
  private bandDirs: Float32Array;
  private bandPositions: Float32Array;

  private starDirs: Float32Array;
  private starColors: Float32Array;
  private starSizes: Float32Array;
  private starPhases: Float32Array;
  private starPositions: Float32Array;

  private readonly heightScale = 0.035;
  private readonly seaLevel = -0.16;
  private readonly domeRadius: number;

  // GEMINI-style worlds can override the default ~26 s day with a full
  // day/night cycle (e.g. 1200 s = 20 real minutes at 1x time scale).
  private readonly dayLength: number;

  // Optional scattered vegetation (instanced canopy points on land)
  private vegPoints: THREE.Points | null = null;
  private vegGeometry: THREE.BufferGeometry | null = null;
  private vegMaterial: THREE.ShaderMaterial | null = null;

  // Per-frame scratch
  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private tmpV3 = new THREE.Vector3();
  private galaxyUpLocal = new THREE.Vector3(0, 1, 0);
  private galaxyCenterLocal = new THREE.Vector3(0, 0, -1);
  private basisX = new THREE.Vector3(1, 0, 0);
  private basisY = new THREE.Vector3(0, 1, 0);
  private basisZ = new THREE.Vector3(0, 0, 1);
  private spin = 0;
  private active = false;
  private galaxyRef: THREE.Group | null = null;
  private moons: MoonMesh[] = [];

  public constructor(
    config: PlanetConfig,
    planetGroup: THREE.Group,
    galaxyGroup: THREE.Group,
    moons: MoonMesh[]
  ) {
    const R = config.radius;
    this.radius = R;
    this.domeRadius = R * 55.0;
    this.dayLength = config.surfaceDayLength ?? (Math.PI * 2.0) / 0.24;
    this.galaxyRef = galaxyGroup;
    this.moons = moons;
    this.group = new THREE.Group();
    this.group.name = `SurfaceExperience-${config.id}`;
    // Align the surface experience with the planet's axial tilt so that the
    // terrain poles and the ring plane in the night sky match the orbit view.
    this.group.rotation.z = config.axialTilt || 0;

    // ------------------------------------------------------------------
    // 0. Per-planet surface palette — derived from the PlanetConfig colors
    // ------------------------------------------------------------------
    const primary = new THREE.Color(config.primaryColor || '#0A4A5A');
    const secondary = new THREE.Color(config.secondaryColor || '#1E6B4E');
    const accent = new THREE.Color(config.accentColor || '#9BE8C8');
    const atmosphere = new THREE.Color(config.atmosphereColor || '#5EEAD4');
    const white = new THREE.Color('#E8F4EE');

    const oceanShallow = atmosphere.clone();
    const oceanDeep = primary.clone().multiplyScalar(0.6);
    const beach = accent.clone().lerp(new THREE.Color('#E8D9A8'), 0.55);
    const forest = secondary.clone();
    const deepForest = secondary.clone().multiplyScalar(0.55);
    const rock = accent.clone().lerp(new THREE.Color('#6B6F6B'), 0.75);
    const snow = white.clone().lerp(accent, 0.12);
    const snowIce = white.clone().lerp(accent, 0.22);
    const bioCol = accent.clone().lerp(new THREE.Color('#3EE0B8'), 0.4);
    const fogCol = atmosphere.clone().multiplyScalar(0.75);
    const zenithCol = atmosphere.clone().multiplyScalar(0.5);
    const horizonCol = atmosphere.clone().multiplyScalar(0.85);

    // ------------------------------------------------------------------
    // 1. Bake the planet height map (elevation / detail / bioluminescence)
    // ------------------------------------------------------------------
    const data = new Uint8Array(HEIGHT_MAP_W * HEIGHT_MAP_H * 4);
    for (let y = 0; y < HEIGHT_MAP_H; y++) {
      for (let x = 0; x < HEIGHT_MAP_W; x++) {
        const u = x / HEIGHT_MAP_W;
        const v = y / HEIGHT_MAP_H;
        const theta = u * Math.PI * 2.0;
        const phi = (v - 0.5) * Math.PI;
        const px = Math.cos(phi) * Math.cos(theta);
        const py = Math.sin(phi);
        const pz = Math.cos(phi) * Math.sin(theta);

        // Continent-scale + mid-scale terrain
        const continents = fbm3(px * 1.4, py * 1.4, pz * 1.4, 4) * 0.6;
        const mountains = fbm3(px * 3.5, py * 3.5, pz * 3.5, 3) * 0.3;
        const ridges = Math.pow(Math.abs(simplex3(px * 4.2, py * 4.2, pz * 4.2)), 1.6) * 0.35;
        const small = fbm3(px * 8.0, py * 8.0, pz * 8.0, 2) * 0.12;

        let height = continents + mountains + ridges * 0.6 + small;
        height = Math.max(-1.0, Math.min(1.0, height));

        const detail = Math.max(0.0, Math.min(1.0, (mountains * 0.5 + ridges) * 0.8 + 0.3));

        // Bioluminescent patches in sheltered lowlands
        const bioNoise = fbm3(px * 2.2 + 5.0, py * 2.2, pz * 2.2, 2);
        const bio = height < 0.15 ? Math.max(0.0, bioNoise) : Math.max(0.0, bioNoise) * 0.25;

        const idx = (y * HEIGHT_MAP_W + x) * 4;
        data[idx] = Math.round((height * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round(detail * 255);
        data[idx + 2] = Math.round(bio * 255);
        data[idx + 3] = 255;
      }
    }
    this.heightTexture = new THREE.DataTexture(
      data,
      HEIGHT_MAP_W,
      HEIGHT_MAP_H,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    this.heightTexture.magFilter = THREE.LinearFilter;
    this.heightTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.heightTexture.generateMipmaps = true;
    this.heightTexture.wrapS = THREE.RepeatWrapping;
    this.heightTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.heightTexture.needsUpdate = true;

    // ------------------------------------------------------------------
    // 2. Terrain sphere (displaced by the height map in the vertex shader)
    // ------------------------------------------------------------------
    const baseRadius = R * 1.004;
    const terrainGeom = new THREE.SphereGeometry(baseRadius, 192, 128);
    this.terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceTerrainVertexShader,
      fragmentShader: surfaceTerrainFragmentShader,
      uniforms: {
        uHeightMap: { value: this.heightTexture },
        uRadius: { value: baseRadius },
        uHeightScale: { value: this.heightScale },
        uMapSize: { value: HEIGHT_MAP_W },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uZenithCol: { value: zenithCol },
        uHorizonCol: { value: horizonCol },
        uNightCol: { value: new THREE.Color(0.006, 0.013, 0.011) },
        uSunriseCol: { value: new THREE.Color(0.92, 0.68, 0.38) },
        uSunCol: { value: new THREE.Color(1.0, 0.98, 0.86) },
        uTime: { value: 0 },
        uSeaLevel: { value: this.seaLevel },
        uNightFactor: { value: 1.0 },
        uOceanShallow: { value: oceanShallow },
        uOceanDeep: { value: oceanDeep },
        uBeach: { value: beach },
        uForest: { value: forest },
        uDeepForest: { value: deepForest },
        uRock: { value: rock },
        uSnow: { value: snow },
        uSnowIce: { value: snowIce },
        uBioCol: { value: bioCol },
        uFogCol: { value: fogCol },
      },
    });
    this.terrainMesh = new THREE.Mesh(terrainGeom, this.terrainMaterial);
    this.terrainMesh.frustumCulled = false;
    this.group.add(this.terrainMesh);

    // ------------------------------------------------------------------
    // 3. Cloud shell (DoubleSide so it reads both from above and below)
    // ------------------------------------------------------------------
    const cloudGeom = new THREE.SphereGeometry(R * 1.028, 64, 40);
    this.cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceCloudVertexShader,
      fragmentShader: surfaceCloudFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uCloudCol: { value: atmosphere.clone().lerp(white, 0.5) },
        uTime: { value: 0 },
        uCamDistFactor: { value: 1.0 },
        uOpacity: { value: 0.85 },
      },
    });
    this.cloudMesh = new THREE.Mesh(cloudGeom, this.cloudMaterial);
    this.cloudMesh.frustumCulled = false;
    this.group.add(this.cloudMesh);

    // ------------------------------------------------------------------
    // 4. Sky dome (atmosphere, sun, rings, galaxy band, satellites)
    // ------------------------------------------------------------------
    const skyGeom = new THREE.SphereGeometry(this.domeRadius, 48, 32);
    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceSkyVertexShader,
      fragmentShader: surfaceSkyFragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uZenithCol: { value: zenithCol },
        uHorizonCol: { value: horizonCol },
        uNightCol: { value: new THREE.Color(0.006, 0.013, 0.011) },
        uSunriseCol: { value: new THREE.Color(0.92, 0.68, 0.38) },
        uSunCol: { value: new THREE.Color(1.0, 0.98, 0.86) },
        uGalaxyCenterDir: { value: new THREE.Vector3(0, 0, -1) },
        uGalaxyUp: { value: new THREE.Vector3(0, 1, 0) },
        uGalaxyBandWidth: { value: 0.17 },
        uGalaxyBandCol: { value: new THREE.Color(0.28, 0.92, 0.6) },
        uGalaxyDustCol: { value: new THREE.Color(0.008, 0.05, 0.04) },
        uCoreCol: { value: new THREE.Color(0.42, 1.0, 0.72) },
        uNightFactor: { value: 1.0 },
        uTime: { value: 0 },
        uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
        uRingInner: { value: (config.rings ? config.rings.innerRadius : 0.2) * R },
        uRingOuter: { value: (config.rings ? config.rings.outerRadius : 0.4) * R },
        uRingOpacity: { value: config.rings ? config.rings.opacity : 0.8 },
        uRingColor: { value: new THREE.Color(0.78, 0.98, 0.9) },
        uRingShadowColor: { value: new THREE.Color(0.1, 0.26, 0.22) },
        uMoonDirs: {
          value: [
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1, 0),
          ],
        },
        uMoonColors: {
          value: [
            new THREE.Color(0.7, 0.95, 0.85),
            new THREE.Color(0.9, 0.98, 0.95),
            new THREE.Color(0.5, 0.6, 0.55),
          ],
        },
        uMoonRadii: { value: [0.02, 0.014, 0.01] },
        uSatNormals: {
          value: [
            new THREE.Vector4(0.2, 0.6, 0.77, 0.6),
            new THREE.Vector4(-0.5, 0.3, 0.81, 0.9),
            new THREE.Vector4(0.8, -0.2, 0.55, 0.45),
            new THREE.Vector4(-0.3, -0.7, 0.65, 0.75),
          ],
        },
        uSatPhases: { value: [0.2, 1.7, 3.1, 4.6] },
        uSunSize: { value: 0.24 },
        uCityCivil: { value: config.surfaceCivilization ? 1 : 0 },
        uCityDirs: {
          value: config.surfaceCivilization
            ? GEMINI_CITY_DIRS.map((d) => d.clone())
            : [
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 0),
              ],
        },
        uCityCol: { value: new THREE.Color(0.88, 1.0, 0.94) },
        uCityShadow: { value: new THREE.Color(0.004, 0.011, 0.008) },
        uCamPosSky: { value: new THREE.Vector3(0, R, 0) },
        uPlanetR: { value: R },
      },
    });
    this.skyDomeMesh = new THREE.Mesh(skyGeom, this.skyMaterial);
    this.skyDomeMesh.frustumCulled = false;
    this.group.add(this.skyDomeMesh);

    // ------------------------------------------------------------------
    // 5. Galaxy band particle dome — IC 1579's actual star population
    // ------------------------------------------------------------------
    const bandCount = 5000;
    const bandData = generateGalaxyParticles(bandCount, IC1579_CONFIG as GalaxyConfig);
    this.bandDirs = bandData.positions;
    this.bandPositions = new Float32Array(bandCount * 3);

    const bandGeom = new THREE.BufferGeometry();
    bandGeom.setAttribute('position', new THREE.BufferAttribute(this.bandPositions, 3));
    bandGeom.setAttribute('aColor', new THREE.BufferAttribute(bandData.colors, 3));
    bandGeom.setAttribute('aSize', new THREE.BufferAttribute(bandData.sizes, 1));
    bandGeom.setAttribute('aPhase', new THREE.BufferAttribute(bandData.phases, 1));

    this.bandMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceStarVertexShader,
      fragmentShader: surfaceStarFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTime: { value: 0 },
        uNightFactor: { value: 1.0 },
      },
    });
    this.bandPoints = new THREE.Points(bandGeom, this.bandMaterial);
    this.bandPoints.frustumCulled = false;
    this.group.add(this.bandPoints);

    // ------------------------------------------------------------------
    // 6. Ambient starfield dome (spherical IC 1579 population)
    // ------------------------------------------------------------------
    const starCount = 2200;
    this.starDirs = new Float32Array(starCount * 3);
    this.starColors = new Float32Array(starCount * 3);
    this.starSizes = new Float32Array(starCount);
    this.starPhases = new Float32Array(starCount);
    this.starPositions = new Float32Array(starCount * 3);

    const tints = [
      [1.0, 1.0, 1.0],
      [0.78, 0.98, 0.9],
      [0.55, 0.9, 0.75],
      [0.9, 0.95, 1.0],
      [1.0, 0.9, 0.78],
    ];

    for (let i = 0; i < starCount; i++) {
      // Stars scattered through the galaxy volume around the planet
      const r = 6 + Math.pow(Math.random(), 0.6) * 42;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * (1.5 + (r / 42) * 4.0);
      const xy = Math.sqrt(Math.max(r * r - y * y, 0.001));
      this.starDirs[i * 3] = Math.cos(theta) * xy;
      this.starDirs[i * 3 + 1] = y;
      this.starDirs[i * 3 + 2] = Math.sin(theta) * xy;

      const tint = tints[Math.floor(Math.random() * tints.length)];
      this.starColors[i * 3] = tint[0];
      this.starColors[i * 3 + 1] = tint[1];
      this.starColors[i * 3 + 2] = tint[2];
      this.starSizes[i] = 0.8 + Math.random() * 2.2;
      this.starPhases[i] = Math.random() * Math.PI * 2;
    }

    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    starGeom.setAttribute('aColor', new THREE.BufferAttribute(this.starColors, 3));
    starGeom.setAttribute('aSize', new THREE.BufferAttribute(this.starSizes, 1));
    starGeom.setAttribute('aPhase', new THREE.BufferAttribute(this.starPhases, 1));

    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceStarVertexShader,
      fragmentShader: surfaceStarFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTime: { value: 0 },
        uNightFactor: { value: 1.0 },
      },
    });
    this.starPoints = new THREE.Points(starGeom, this.starMaterial);
    this.starPoints.frustumCulled = false;
    this.group.add(this.starPoints);

    // ------------------------------------------------------------------
    // 7. Vegetation — instanced canopy scatter on land (GEMINI worlds)
    // ------------------------------------------------------------------
    this.buildVegetation(config.surfaceVegetationCount ?? 0, forest, deepForest, bioCol);

    this.group.visible = false;
    planetGroup.add(this.group);
  }

  /**
   * Scatter vegetation points across land regions of the baked height map.
   * Placement is CPU-side and deterministic per bake (random seed).
   */
  private buildVegetation(
    count: number,
    forest: THREE.Color,
    deepForest: THREE.Color,
    bioCol: THREE.Color
  ) {
    if (count <= 0) return;
    const R = this.radius;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const dir = new THREE.Vector3();

    let accepted = 0;
    let attempts = 0;
    while (accepted < count && attempts < count * 8) {
      attempts++;
      const u = Math.random() * 2.0 - 1.0;
      const theta = Math.random() * Math.PI * 2.0;
      const rxy = Math.sqrt(1.0 - u * u);
      dir.set(rxy * Math.cos(theta), u, rxy * Math.sin(theta));

      // Only land: sea level sits at normalized height 0.42 in the baked map.
      if (this.sampleHeightNorm(dir) < 0.44) continue;

      const terrainR = this.sampleTerrainRadiusAt(dir, 1.0);
      const scale = 0.9 + Math.random() * 0.45;
      const placeR = terrainR + R * 0.004 * scale;
      positions[accepted * 3] = dir.x * placeR;
      positions[accepted * 3 + 1] = dir.y * placeR;
      positions[accepted * 3 + 2] = dir.z * placeR;
      sizes[accepted] = R * (0.05 + 0.05 * Math.random()) * scale;
      phases[accepted] = Math.random() * Math.PI * 2.0;

      const roll = Math.random();
      const base = roll < 0.4 ? forest : roll < 0.75 ? deepForest : bioCol;
      const lum = 0.75 + Math.random() * 0.35;
      colors[accepted * 3] = base.r * lum;
      colors[accepted * 3 + 1] = base.g * lum;
      colors[accepted * 3 + 2] = base.b * lum;
      accepted++;
    }
    if (accepted === 0) return;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setDrawRange(0, accepted);

    const mat = new THREE.ShaderMaterial({
      vertexShader: surfaceVegetationVertexShader,
      fragmentShader: surfaceVegetationFragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTime: { value: 0 },
        uNightFactor: { value: 1.0 },
      },
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.group.add(points);
    this.vegPoints = points;
    this.vegGeometry = geo;
    this.vegMaterial = mat;
  }

  private sampleHeightNorm(dir: THREE.Vector3): number {
    const phi = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const theta = Math.atan2(dir.z, dir.x);
    let u = theta / (Math.PI * 2.0);
    if (u < 0) u += 1.0;
    const v = phi / Math.PI + 0.5;
    const x = Math.min(HEIGHT_MAP_W - 1, Math.max(0, Math.floor(u * HEIGHT_MAP_W)));
    const y = Math.min(HEIGHT_MAP_H - 1, Math.max(0, Math.floor(v * HEIGHT_MAP_H)));
    const data = this.heightTexture.image.data as Uint8Array;
    return data[(y * HEIGHT_MAP_W + x) * 4] / 255;
  }

  public setActive(active: boolean) {
    this.active = active;
    this.group.visible = active;
  }

  public isActive(): boolean {
    return this.active;
  }

  public setTerrainScale(scale: number) {
    this.terrainScale = scale;
    this.terrainMesh.scale.setScalar(scale);
    this.cloudMesh.scale.setScalar(scale);
  }

  public getTerrainScale(): number {
    return this.terrainScale;
  }

  /**
   * CPU-side sample of the displaced terrain radius at a direction given in
   * surface-local space (same UV mapping as the height-map bake). Used by the
   * engine to keep the surface camera above the terrain while walking.
   */
  public sampleTerrainRadiusAt(localDir: THREE.Vector3, terrainScale: number): number {
    const phi = Math.asin(THREE.MathUtils.clamp(localDir.y, -1, 1));
    const theta = Math.atan2(localDir.z, localDir.x);
    let u = theta / (Math.PI * 2.0);
    if (u < 0) u += 1.0;
    const v = phi / Math.PI + 0.5;

    const x = Math.min(HEIGHT_MAP_W - 1, Math.max(0, Math.floor(u * HEIGHT_MAP_W)));
    const y = Math.min(HEIGHT_MAP_H - 1, Math.max(0, Math.floor(v * HEIGHT_MAP_H)));
    const data = this.heightTexture.image.data as Uint8Array;
    const r = data[(y * HEIGHT_MAP_W + x) * 4] / 255;

    const base = this.radius * 1.004;
    return base * (1.0 + r * this.heightScale) * terrainScale;
  }

  public setPixelRatio(dpr: number) {
    this.bandMaterial.uniforms.uPixelRatio.value = dpr;
    this.starMaterial.uniforms.uPixelRatio.value = dpr;
    if (this.vegMaterial) {
      this.vegMaterial.uniforms.uPixelRatio.value = dpr;
    }
  }

  private rotateSpin(v: THREE.Vector3): THREE.Vector3 {
    const s = Math.sin(this.spin);
    const c = Math.cos(this.spin);
    const x = v.x * c + v.z * s;
    const z = -v.x * s + v.z * c;
    v.x = x;
    v.z = z;
    return v;
  }

  public update(time: number, camera: THREE.Camera, starWorldPos: THREE.Vector3) {
    if (!this.active) return;

    const R = this.radius;

    // --- Planet spin angle (drives the day/night cycle) ---
    // Default worlds keep the original fast cycle; GEMINI-style worlds can
    // configure a full day (surfaceDayLength seconds for one rotation).
    this.spin = (time / this.dayLength) * Math.PI * 2.0;

    // --- Camera distance from planet center (in planet radii) ---
    this.tmpV.copy(camera.position);
    this.group.parent?.worldToLocal(this.tmpV);
    const camDist = this.tmpV.length();
    const camDistR = camDist / R;

    // --- Sun direction in sky-local space (spin applied) ---
    this.tmpV.copy(starWorldPos);
    this.group.worldToLocal(this.tmpV);
    this.rotateSpin(this.tmpV);
    const sunDir = this.tmpV.normalize();

    // --- Galaxy orientation in sky-local space ---
    if (this.galaxyRef) {
      this.tmpV2.copy(this.galaxyRef.up);
      this.tmpV3.copy(this.galaxyRef.position);
      // Galaxy up in world space
      this.tmpV2.applyQuaternion(this.galaxyRef.quaternion);
      this.tmpV3.add(this.tmpV2);
      this.tmpV2.sub(this.galaxyRef.position);
      this.tmpV2.normalize();
      // world -> sky local -> spin
      this.group.worldToLocal(this.tmpV2);
      this.rotateSpin(this.tmpV2);
      this.galaxyUpLocal.copy(this.tmpV2).normalize();

      // Direction from planet to galaxy center
      this.tmpV2.copy(this.galaxyRef.position);
      this.tmpV3.copy(camera.position);
      this.tmpV2.sub(this.tmpV3).normalize();
      this.group.worldToLocal(this.tmpV2);
      this.rotateSpin(this.tmpV2);
      this.galaxyCenterLocal.copy(this.tmpV2).normalize();
    }

    // --- Build basis: X = to center, Y = disk up, Z = cross ---
    this.basisX.copy(this.galaxyCenterLocal).normalize();
    this.basisY.copy(this.galaxyUpLocal).normalize();
    this.basisZ.crossVectors(this.basisX, this.basisY).normalize();
    if (this.basisZ.lengthSq() < 0.01) {
      this.basisZ.set(0, 0, 1);
    }

    // --- Sun elevation & day/night factors ---
    const sunElev = sunDir.y;
    const dayFactor = THREE.MathUtils.smoothstep(sunElev, -0.06, 0.22);
    const nightFactor = 1.0 - dayFactor;

    // --- Sky uniforms ---
    this.skyMaterial.uniforms.uSunDir.value.copy(sunDir);
    this.skyMaterial.uniforms.uGalaxyCenterDir.value.copy(this.galaxyCenterLocal);
    this.skyMaterial.uniforms.uGalaxyUp.value.copy(this.galaxyUpLocal);
    this.skyMaterial.uniforms.uNightFactor.value = nightFactor;
    this.skyMaterial.uniforms.uTime.value = time;
    this.skyMaterial.uniforms.uCamPosSky.value.copy(this.tmpV);

    this.terrainMaterial.uniforms.uSunDir.value.copy(sunDir);
    this.terrainMaterial.uniforms.uNightFactor.value = nightFactor;
    this.terrainMaterial.uniforms.uTime.value = time;

    this.cloudMaterial.uniforms.uSunDir.value.copy(sunDir);
    this.cloudMaterial.uniforms.uTime.value = time;

    this.bandMaterial.uniforms.uTime.value = time;
    this.bandMaterial.uniforms.uNightFactor.value = nightFactor;
    this.starMaterial.uniforms.uTime.value = time;
    this.starMaterial.uniforms.uNightFactor.value = nightFactor;
    if (this.vegMaterial) {
      this.vegMaterial.uniforms.uTime.value = time;
      this.vegMaterial.uniforms.uNightFactor.value = nightFactor;
    }

    // --- Rebuild galaxy band particle positions (planet-orbit parallax) ---
    // Planet center position in galaxy-local space (not the camera — the sky
    // must track the planet even if the camera drifts slightly).
    this.tmpV3.set(0, 0, 0);
    if (this.group.parent) {
      this.group.parent.getWorldPosition(this.tmpV3);
    }
    const planetPosGalaxy = this.tmpV3;
    if (this.galaxyRef) {
      this.galaxyRef.worldToLocal(planetPosGalaxy);
    }

    for (let i = 0; i < this.bandDirs.length / 3; i++) {
      const dx = this.bandDirs[i * 3] - planetPosGalaxy.x;
      const dy = this.bandDirs[i * 3 + 1] - planetPosGalaxy.y;
      const dz = this.bandDirs[i * 3 + 2] - planetPosGalaxy.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      // Project through the galaxy -> sky basis
      const sx = this.basisX.x * (dx / len) + this.basisY.x * (dy / len) + this.basisZ.x * (dz / len);
      const sy = this.basisX.y * (dx / len) + this.basisY.y * (dy / len) + this.basisZ.y * (dz / len);
      const sz = this.basisX.z * (dx / len) + this.basisY.z * (dy / len) + this.basisZ.z * (dz / len);
      this.bandPositions[i * 3] = sx * this.domeRadius * 0.9995;
      this.bandPositions[i * 3 + 1] = sy * this.domeRadius * 0.9995;
      this.bandPositions[i * 3 + 2] = sz * this.domeRadius * 0.9995;
    }
    (this.bandPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    for (let i = 0; i < this.starDirs.length / 3; i++) {
      const dx = this.starDirs[i * 3] - planetPosGalaxy.x;
      const dy = this.starDirs[i * 3 + 1] - planetPosGalaxy.y;
      const dz = this.starDirs[i * 3 + 2] - planetPosGalaxy.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const sx = this.basisX.x * (dx / len) + this.basisY.x * (dy / len) + this.basisZ.x * (dz / len);
      const sy = this.basisX.y * (dx / len) + this.basisY.y * (dy / len) + this.basisZ.y * (dz / len);
      const sz = this.basisX.z * (dx / len) + this.basisY.z * (dy / len) + this.basisZ.z * (dz / len);
      this.starPositions[i * 3] = sx * this.domeRadius * 0.9995;
      this.starPositions[i * 3 + 1] = sy * this.domeRadius * 0.9995;
      this.starPositions[i * 3 + 2] = sz * this.domeRadius * 0.9995;
    }
    (this.starPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // --- Moon halo directions (actual orbiting moons) ---
    const moonDirs = this.skyMaterial.uniforms.uMoonDirs.value as unknown as THREE.Vector3[];
    const moonRadii = this.skyMaterial.uniforms.uMoonRadii.value as number[];
    for (let i = 0; i < this.moons.length && i < 3; i++) {
      const moon = this.moons[i];
      this.tmpV.setFromMatrixPosition(moon.group.matrixWorld);
      this.tmpV2.copy(this.tmpV);
      this.group.worldToLocal(this.tmpV2);
      this.rotateSpin(this.tmpV2);
      const dist = this.tmpV.distanceTo(camera.position);
      if (dist > 0.001) {
        moonDirs[i].copy(this.tmpV2).normalize();
        const sphere = (moon.group.children[0] as THREE.Mesh | undefined)?.geometry.boundingSphere;
        const moonRadius = sphere ? sphere.radius : 0.01;
        moonRadii[i] = Math.max((moonRadius / dist) * 0.6, 0.004);
      }
    }

    // --- Cloud shell visibility: full from orbit, fades as we pass through ---
    const distToShell = camDistR - 1.028;
    const camDistFactor = THREE.MathUtils.smoothstep(0.035, 0.001, distToShell);
    this.cloudMaterial.uniforms.uCamDistFactor.value = camDistFactor;
  }

  public getTimeOfDay(): number {
    // Sun azimuth -> time of day (0.0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset)
    const az = Math.atan2(
      this.skyMaterial.uniforms.uSunDir.value.x,
      this.skyMaterial.uniforms.uSunDir.value.z
    );
    return ((az + Math.PI) / (Math.PI * 2.0) + 0.25) % 1.0;
  }

  public getSunElevation(): number {
    return this.skyMaterial.uniforms.uSunDir.value.y;
  }

  public getNightFactor(): number {
    return this.skyMaterial.uniforms.uNightFactor.value;
  }

  public dispose() {
    this.terrainMesh.geometry.dispose();
    this.terrainMaterial.dispose();
    this.cloudMesh.geometry.dispose();
    this.cloudMaterial.dispose();
    this.skyDomeMesh.geometry.dispose();
    this.skyMaterial.dispose();
    this.bandPoints.geometry.dispose();
    this.bandMaterial.dispose();
    this.starPoints.geometry.dispose();
    this.starMaterial.dispose();
    if (this.vegPoints && this.vegGeometry && this.vegMaterial) {
      this.vegPoints.geometry.dispose();
      this.vegMaterial.dispose();
      this.vegGeometry = null;
      this.vegMaterial = null;
      this.vegPoints = null;
    }
    this.heightTexture.dispose();
  }
}
