import * as THREE from 'three';
import type { MoonConfig } from '../../types/starSystem';
import { glslSimplexNoise } from '../shaders/glslNoise';

// ---------------------------------------------------------------------------
// Deterministic 3D value noise — CPU bake for irregular (potato-like) moons.
// Mirrors a fixed seed so every visitor sees the same captured body.
// ---------------------------------------------------------------------------
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);
  const w = zf * zf * (3.0 - 2.0 * zf);
  const n000 = hash3(xi, yi, zi);
  const n100 = hash3(xi + 1, yi, zi);
  const n010 = hash3(xi, yi + 1, zi);
  const n110 = hash3(xi + 1, yi + 1, zi);
  const n001 = hash3(xi, yi, zi + 1);
  const n101 = hash3(xi + 1, yi, zi + 1);
  const n011 = hash3(xi, yi + 1, zi + 1);
  const n111 = hash3(xi + 1, yi + 1, zi + 1);
  return (
    n000 * (1 - u) * (1 - v) * (1 - w) +
    n100 * u * (1 - v) * (1 - w) +
    n010 * (1 - u) * v * (1 - w) +
    n110 * u * v * (1 - w) +
    n001 * (1 - u) * (1 - v) * w +
    n101 * u * (1 - v) * w +
    n011 * (1 - u) * v * w +
    n111 * u * v * w
  );
}

function potatoFbm(x: number, y: number, z: number): number {
  let v = 0;
  let amp = 0.55;
  let freq = 1.4;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise3(x * freq, y * freq, z * freq);
    freq *= 2.1;
    amp *= 0.5;
  }
  return v;
}

const moonVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vPosition = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const moonFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uLightPosition;
uniform float uIsVolcanic;
uniform float uIsIcy;
uniform float uIsGolden;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  float nDotL = max(dot(vWorldNormal, lightDir), 0.0);
  float ambient = 0.08;
  float lighting = nDotL * 0.92 + ambient;

  vec3 pos = vPosition * 6.0;
  float crater = abs(snoise(pos * 2.0));
  float micro = snoise(pos * 5.0) * 0.15;
  float surfaceNoise = clamp(crater + micro, 0.0, 1.0);

  vec3 finalColor = mix(uPrimaryColor, uSecondaryColor, surfaceNoise);

  if (uIsGolden > 0.5) {
    // Golden captured body: metallic warm albedo lit by the star, a crisp
    // specular sheen, and only a faint warm emissive contribution — never
    // a neon glow.
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfVec = normalize(lightDir + viewDir);
    float specular = pow(max(dot(vWorldNormal, halfVec), 0.0), 46.0);
    vec3 goldSheen = vec3(1.0, 0.86, 0.55);
    finalColor += goldSheen * specular * (0.45 + 0.55 * nDotL) * 0.85;
    finalColor += vec3(0.32, 0.22, 0.07) * 0.16 * nDotL;
    // soft warm rim where the star grazes the lumpy limb
    float limb = pow(1.0 - max(dot(vWorldNormal, lightDir), 0.0), 2.2);
    finalColor += vec3(0.9, 0.7, 0.35) * limb * 0.12 * nDotL;
  } else if (uIsVolcanic > 0.5) {
    // Volcanic sulfur and glowing lava vents
    float vent = smoothstep(0.72, 0.88, snoise(pos * 3.5 + vec3(uTime * 0.2, 0.0, 0.0)));
    vec3 lava = vec3(1.0, 0.35, 0.0) * 2.0;
    finalColor = mix(finalColor, lava, vent);
    lighting = max(lighting, vent * 1.5);
  } else if (uIsIcy > 0.5) {
    // Glacial ice cracks & crystalline specular glint
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfVec = normalize(lightDir + viewDir);
    float specular = pow(max(dot(vWorldNormal, halfVec), 0.0), 24.0);
    finalColor += vec3(0.9, 0.96, 1.0) * specular * 0.5 * nDotL;
  }

  gl_FragColor = vec4(finalColor * lighting, 1.0);
}
`;

export class MoonMesh {
  public group: THREE.Group;
  public orbitGroup: THREE.Group;
  public mesh: THREE.Mesh;
  public orbitLine: THREE.Line;
  public config: MoonConfig;

  private material: THREE.ShaderMaterial;
  private orbitGeometry: THREE.BufferGeometry;
  private orbitMaterial: THREE.LineBasicMaterial;

  constructor(config: MoonConfig) {
    this.config = config;

    // Outer Orbit Group (Attached to parent planet, handles orbital inclination)
    this.orbitGroup = new THREE.Group();
    if (config.orbitInclination) {
      this.orbitGroup.rotation.x = config.orbitInclination;
    }

    // Inner Moon Mesh Group
    this.group = new THREE.Group();
    this.orbitGroup.add(this.group);

    // 1. Moon Surface Mesh
    const geom = new THREE.SphereGeometry(config.radius, 24, 24);

    // Irregular captured body: displace the sphere into a lumpy potato on the
    // CPU with deterministic value noise (same body for every visitor).
    if (config.irregular) {
      const positionAttr = geom.attributes.position as THREE.BufferAttribute;
      const positions = positionAttr.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const nx = x / len;
        const ny = y / len;
        const nz = z / len;
        const fbm = potatoFbm(nx * 2.1, ny * 2.1, nz * 2.1);
        const stretch = 1.0 + (fbm - 0.35) * 0.42;
        positions[i] = nx * config.radius * stretch;
        positions[i + 1] = ny * config.radius * stretch;
        positions[i + 2] = nz * config.radius * stretch;
      }
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPrimaryColor: { value: new THREE.Color(config.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(config.secondaryColor) },
        uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
        uIsVolcanic: { value: config.isVolcanic ? 1.0 : 0.0 },
        uIsIcy: { value: config.isIcy ? 1.0 : 0.0 },
        uIsGolden: { value: config.golden ? 1.0 : 0.0 },
      },
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.group.add(this.mesh);

    // 2. Subtle Lunar Orbit Line
    const segments = 64;
    const points: THREE.Vector3[] = [];
    const a = config.orbitRadius;
    const e = config.orbitEccentricity || 0.0;
    const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
    const c = a * e;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2.0;
      points.push(new THREE.Vector3(Math.cos(theta) * a - c, 0, Math.sin(theta) * b));
    }

    this.orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    this.orbitMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x7090b0),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.orbitLine = new THREE.Line(this.orbitGeometry, this.orbitMaterial);
    this.orbitGroup.add(this.orbitLine);
  }

  public update(time: number, starWorldPos: THREE.Vector3) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLightPosition.value.copy(starWorldPos);

    // Keplerian Orbit around Planet
    const a = this.config.orbitRadius;
    const e = this.config.orbitEccentricity || 0.0;
    const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
    const c = a * e;

    const meanAnomaly = (this.config.orbitPhase || 0) + time * this.config.orbitSpeed;
    const posX = Math.cos(meanAnomaly) * a - c;
    const posZ = Math.sin(meanAnomaly) * b;

    this.group.position.set(posX, 0, posZ);

    // Axial Rotation
    this.mesh.rotation.y = time * this.config.rotationSpeed;
  }

  public setOpacity(alpha: number) {
    this.orbitMaterial.opacity = Math.max(0, Math.min(1, alpha)) * 0.15;
  }

  public dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.orbitGeometry.dispose();
    this.orbitMaterial.dispose();
  }
}
