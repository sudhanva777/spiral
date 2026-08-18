import * as THREE from 'three';
import { molecularCloudVertexShader } from '../shaders/molecularCloud.vert';
import { molecularCloudFragmentShader } from '../shaders/molecularCloud.frag';
import { fbm3, randomUnitVector } from '../utils/noiseField';

// ============================================================================
// COSMIC REGION — a large procedural gas region inside UNIVERSAL.
//
// One component, three visual languages, all rendered as GPU billboards:
//   - STAR-FORMING NEBULA   (additive pink/magenta/purple glow + dark dust)
//   - COSMIC RIDGE          (additive orange/amber/crimson ridge + dark dust)
//   - MOLECULAR PILLARS     (dark teal/brown dust columns + faint red edges)
//
// Density fields are sculpted on the CPU (blob lobes, carved cavities,
// column axes) and rendered by a shared shader pair with two blend modes:
// additive ionized gas vs. dark obscuring dust. A sparse embedded-star
// layer adds young stellar knots where ionized gas is densest.
// ============================================================================

export interface CosmicRegionLayerConfig {
  count: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
  sizeMin: number;
  sizeMax: number;
  alphaMin: number;
  alphaMax: number;
  mode: 'gas' | 'dust';
  turbulence: number;
}

export interface CosmicRegionConfig {
  radius: number;
  seed: number;
  cavityCount: number;
  cavityStrength: number;
  columnCount?: number;
  columnWidth?: number;
  layers: CosmicRegionLayerConfig[];
  starCount: number;
}

interface RegionLayer {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
}

class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}

function generateRegionParticles(
  cfg: CosmicRegionConfig,
  layer: CosmicRegionLayerConfig,
  rng: SeededRandom
): { positions: Float32Array; sizes: Float32Array; phases: Float32Array; densities: Float32Array; colors: Float32Array } {
  const R = cfg.radius;
  const positions = new Float32Array(layer.count * 3);
  const sizes = new Float32Array(layer.count);
  const phases = new Float32Array(layer.count);
  const densities = new Float32Array(layer.count);
  const colors = new Float32Array(layer.count * 3);

  // Cavity centers — carved holes where stellar winds cleared material.
  const cavities: Array<{ x: number; y: number; z: number; r: number }> = [];
  for (let c = 0; c < cfg.cavityCount; c++) {
    const dir = { x: 0, y: 0, z: 0 };
    randomUnitVector(dir);
    const dist = R * (0.25 + rng.next() * 0.6);
    cavities.push({
      x: dir.x * dist,
      y: dir.y * dist,
      z: dir.z * dist,
      r: R * (0.12 + rng.next() * 0.18),
    });
  }

  // Column axes — dark molecular pillars rise along these directions.
  const columns: Array<{ x: number; y: number; z: number }> = [];
  const columnCount = cfg.columnCount ?? 0;
  for (let c = 0; c < columnCount; c++) {
    const dir = { x: 0, y: 0, z: 0 };
    randomUnitVector(dir);
    columns.push(dir);
  }
  const columnWidth = cfg.columnWidth ?? 0.18;

  let accepted = 0;
  let attempts = 0;
  const maxAttempts = layer.count * 60;

  while (accepted < layer.count && attempts < maxAttempts) {
    attempts++;

    // Spawn within a soft-edged sphere
    const dir = { x: 0, y: 0, z: 0 };
    randomUnitVector(dir);
    const r = Math.pow(rng.next(), 0.62) * R;
    const px = dir.x * r;
    const py = dir.y * r * 0.75; // slight vertical squish for cloud layers
    const pz = dir.z * r;

    const normR = r / R;
    const radialFalloff = 1.0 - normR * normR;

    // Sculpt the density field
    let field = fbm3(px * (1.6 / R) + cfg.seed, py * (1.6 / R) + cfg.seed * 2.0, pz * (1.6 / R), 3);
    field = field * 0.5 + 0.5;

    for (let c = 0; c < cavities.length; c++) {
      const cav = cavities[c];
      const dx = px - cav.x;
      const dy = py - cav.y;
      const dz = pz - cav.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / cav.r;
      field -= cfg.cavityStrength * Math.exp(-d * d * 2.5);
    }

    if (columns.length > 0) {
      let colField = 0.0;
      for (let c = 0; c < columns.length; c++) {
        const ax = columns[c];
        const cross = (py * ax.z - pz * ax.y) * (py * ax.z - pz * ax.y) +
          (pz * ax.x - px * ax.z) * (pz * ax.x - px * ax.z) +
          (px * ax.y - py * ax.x) * (px * ax.y - py * ax.x);
        const distToAxis = Math.sqrt(cross) / R;
        colField += Math.exp(-(distToAxis * distToAxis) / (columnWidth * columnWidth));
      }
      field *= 0.35 + 1.6 * Math.min(colField, 1.0);
    }

    field = Math.max(0.0, Math.min(1.0, field));
    const threshold = layer.mode === 'dust' ? 0.42 : 0.5;
    if (field < threshold) continue;

    // Acceptance probability grows with density — dense regions fill in.
    const p = field * radialFalloff;
    if (rng.next() > p) continue;

    const i3 = accepted * 3;
    positions[i3] = px;
    positions[i3 + 1] = py;
    positions[i3 + 2] = pz;

    const density = layer.alphaMin + (layer.alphaMax - layer.alphaMin) * (0.35 + 0.65 * field);
    densities[accepted] = density;
    phases[accepted] = rng.next() * Math.PI * 2.0;
    sizes[accepted] = layer.sizeMin + (layer.sizeMax - layer.sizeMin) * (0.3 + 0.7 * rng.next());

    // Color gradient — denser material leans toward the deep color.
    const mixT = Math.min(1.0, Math.max(0.0, field));
    colors[i3] = layer.colorA[0] + (layer.colorB[0] - layer.colorA[0]) * mixT;
    colors[i3 + 1] = layer.colorA[1] + (layer.colorB[1] - layer.colorA[1]) * mixT;
    colors[i3 + 2] = layer.colorA[2] + (layer.colorB[2] - layer.colorA[2]) * mixT;

    accepted++;
  }

  return { positions, sizes, phases, densities, colors };
}

function generateStarKnots(count: number, R: number, seed: number): { positions: Float32Array; sizes: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const rng = new SeededRandom(seed * 7 + 13);

  for (let i = 0; i < count; i++) {
    const dir = { x: 0, y: 0, z: 0 };
    randomUnitVector(dir);
    const r = Math.pow(rng.next(), 0.7) * R * 0.8;
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
    sizes[i] = 0.6 + rng.next() * 1.8;
    const warm = rng.next() < 0.5;
    colors[i * 3] = warm ? 1.0 : 0.72 + rng.next() * 0.28;
    colors[i * 3 + 1] = warm ? 0.82 : 0.82 + rng.next() * 0.18;
    colors[i * 3 + 2] = warm ? 0.62 : 1.0;
  }
  return { positions, sizes, colors };
}

export class CosmicRegion {
  public group: THREE.Group;
  private layers: RegionLayer[] = [];
  private stars: THREE.Points | null = null;
  private starsGeometry: THREE.BufferGeometry | null = null;
  private starsMaterial: THREE.ShaderMaterial | null = null;

  constructor(config: CosmicRegionConfig) {
    this.group = new THREE.Group();
    const rng = new SeededRandom(config.seed);

    for (const layer of config.layers) {
      const data = generateRegionParticles(config, layer, rng);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
      geometry.setAttribute('aDensity', new THREE.BufferAttribute(data.densities, 1));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

      const material = new THREE.ShaderMaterial({
        vertexShader: molecularCloudVertexShader,
        fragmentShader: molecularCloudFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: layer.mode === 'dust' ? THREE.NormalBlending : THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uTurbulence: { value: layer.turbulence },
          uRegionScale: { value: config.radius },
          uIntensity: { value: 1.0 },
          uMode: { value: layer.mode === 'dust' ? 1.0 : 0.0 },
        },
      });

      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      this.group.add(points);
      this.layers.push({ points, geometry, material });
    }

    if (config.starCount > 0) {
      const data = generateStarKnots(config.starCount, config.radius, config.seed);
      this.starsGeometry = new THREE.BufferGeometry();
      this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      this.starsGeometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
      this.starsGeometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

      this.starsMaterial = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute vec3 aColor;
          uniform float uPixelRatio;
          uniform float uRegionScale;
          varying vec3 vColor;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vColor = aColor;
            gl_PointSize = aSize * (uRegionScale * 0.08 / -mvPosition.z) * uPixelRatio;
            gl_PointSize = clamp(gl_PointSize, 2.0, 40.0 * uPixelRatio);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uIntensity;
          varying vec3 vColor;
          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float r = length(coord);
            if (r > 0.5) discard;
            float soft = exp(-6.0 * r * r);
            float cross = pow(max(0.0, 1.0 - abs(coord.x) * 6.0), 3.0) * pow(max(0.0, 1.0 - abs(coord.y) * 2.2), 2.0);
            cross += pow(max(0.0, 1.0 - abs(coord.y) * 6.0), 3.0) * pow(max(0.0, 1.0 - abs(coord.x) * 2.2), 2.0);
            gl_FragColor = vec4(vColor, (soft * 0.8 + cross * 0.5) * uIntensity);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uRegionScale: { value: config.radius },
          uIntensity: { value: 1.0 },
        },
      });

      this.stars = new THREE.Points(this.starsGeometry, this.starsMaterial);
      this.stars.frustumCulled = false;
      this.group.add(this.stars);
    }
  }

  public update(time: number) {
    for (const layer of this.layers) {
      layer.material.uniforms.uTime.value = time;
    }
  }

  public setIntensity(intensity: number) {
    for (const layer of this.layers) {
      layer.material.uniforms.uIntensity.value = intensity;
    }
    if (this.starsMaterial) this.starsMaterial.uniforms.uIntensity.value = intensity;
  }

  public setPixelRatio(dpr: number) {
    for (const layer of this.layers) {
      layer.material.uniforms.uPixelRatio.value = dpr;
    }
    if (this.starsMaterial) this.starsMaterial.uniforms.uPixelRatio.value = dpr;
  }

  public getParticleCount(): number {
    let total = 0;
    for (const layer of this.layers) total += layer.points.geometry.attributes.position.count;
    if (this.stars) total += this.stars.geometry.attributes.position.count;
    return total;
  }

  public dispose() {
    for (const layer of this.layers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
    this.layers = [];
    if (this.starsGeometry) this.starsGeometry.dispose();
    if (this.starsMaterial) this.starsMaterial.dispose();
    this.starsGeometry = null;
    this.starsMaterial = null;
    this.stars = null;
  }
}