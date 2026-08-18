import * as THREE from 'three';

// ============================================================================
// PULSAR — a rapidly rotating neutron star lighthouse inside UNIVERSAL.
//
// - A compact white/blue-white luminous core with a fast periodic pulse.
// - Two opposing emission beams (volumetric-looking cones, not solid
//   cylinders) that sweep around a tilted magnetic axis at extreme speed.
// - A sparse relativistic particle wind orbiting the core.
// - Intensity grows as the visitor approaches; beams remain visible from
//   far away as a strange periodic light source (discovery hook).
// ============================================================================

const beamVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const beamFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uIntensity;
uniform float uPulse;

void main() {
  // Cone opens from the pulsar (vUv.y = 0 at apex).
  float along = 1.0 - vUv.y; // 1 at apex, 0 at rim

  // Radial falloff: strongest on the beam axis, soft at the cone wall.
  float radial = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));

  // Longitudinal fade: bright near the pulsar, faint at the far end.
  float distFade = pow(along, 1.6);

  // Milky volumetric appearance — the beam is a graded luminous cone.
  float alpha = radial * distFade * uIntensity * (0.35 + 0.65 * uPulse);
  alpha = clamp(alpha, 0.0, 0.85);

  vec3 col = mix(vec3(0.62, 0.80, 1.0), vec3(1.0), uPulse * 0.45);
  gl_FragColor = vec4(col * (0.4 + 0.6 * uPulse), alpha);
}
`;

const coreVertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uPixelRatio;
uniform float uPulse;
varying float vPulse;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vPulse = uPulse;
  float size = aSize * (1.0 + 0.35 * uPulse);
  gl_PointSize = size * (6.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 2.0, 220.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const coreFragmentShader = /* glsl */ `
varying float vPulse;
uniform float uIntensity;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;
  float core = exp(-14.0 * r * r);
  float halo = exp(-4.0 * r * r) * 0.35;
  float alpha = (core + halo) * uIntensity * (0.7 + 0.5 * vPulse);
  vec3 col = mix(vec3(0.72, 0.86, 1.0), vec3(1.0, 1.0, 1.0), core + 0.2 * vPulse);
  gl_FragColor = vec4(col, alpha);
}
`;

const windVertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uPixelRatio;
varying float vPhase;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vPhase = aPhase;
  gl_PointSize = aSize * (5.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.5, 24.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const windFragmentShader = /* glsl */ `
varying float vPhase;
uniform float uIntensity;
uniform float uPulse;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;
  float soft = exp(-8.0 * r * r);
  float flicker = 0.55 + 0.45 * sin(vPhase * 40.0);
  gl_FragColor = vec4(vec3(0.62, 0.78, 1.0) * (0.5 + 0.5 * uPulse), soft * uIntensity * flicker * 0.5);
}
`;

export class Pulsar {
  public group: THREE.Group;
  public rotationSpeed = 14.0; // rad/s — visibly extreme

  private beamGroup: THREE.Group;
  private beams: THREE.Mesh[] = [];
  private beamMaterials: THREE.ShaderMaterial[] = [];
  private corePoints: THREE.Points;
  private coreGeometry: THREE.BufferGeometry;
  private coreMaterial: THREE.ShaderMaterial;
  private windPoints: THREE.Points;
  private windGeometry: THREE.BufferGeometry;
  private windMaterial: THREE.ShaderMaterial;
  private windBase: Float32Array;
  private windCount = 0;
  private windRadius = 0;
  private elapsed = 0;

  constructor(radius = 1.0) {
    this.group = new THREE.Group();

    // --- Core: compact luminous neutron-star surface ---
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(9);
    corePos[0] = 0; corePos[1] = 0; corePos[2] = 0;
    corePos[3] = 0.02; corePos[4] = 0; corePos[5] = 0;
    corePos[6] = 0; corePos[7] = 0.02; corePos[8] = 0;
    const coreSizes = new Float32Array([radius * 0.5, radius * 0.12, radius * 0.12]);
    const corePhases = new Float32Array([0, 1.3, 2.6]);
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute('aSize', new THREE.BufferAttribute(coreSizes, 1));
    coreGeo.setAttribute('aPhase', new THREE.BufferAttribute(corePhases, 1));

    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uPulse: { value: 0.0 },
        uIntensity: { value: 1.0 },
      },
    });
    this.corePoints = new THREE.Points(coreGeo, this.coreMaterial);
    this.corePoints.frustumCulled = false;
    this.coreGeometry = coreGeo;
    this.group.add(this.corePoints);

    // --- Two opposing emission beams on a tilted, fast-rotating axis ---
    this.beamGroup = new THREE.Group();
    this.beamGroup.rotation.x = 0.42; // magnetic axis tilt
    const beamLength = radius * 26.0;
    const beamRadius = radius * 2.1;

    for (let i = 0; i < 2; i++) {
      const geo = new THREE.ConeGeometry(beamRadius, beamLength, 24, 1, true);
      const mat = new THREE.ShaderMaterial({
        vertexShader: beamVertexShader,
        fragmentShader: beamFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uIntensity: { value: 1.0 },
          uPulse: { value: 0.0 },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.position.y = i === 0 ? beamLength / 2 : -beamLength / 2;
      mesh.rotation.x = i === 0 ? 0 : Math.PI;
      this.beamGroup.add(mesh);
      this.beams.push(mesh);
      this.beamMaterials.push(mat);
    }
    this.group.add(this.beamGroup);

    // --- Relativistic particle wind: a thin rotating ring ---
    this.windCount = 220;
    this.windRadius = radius * 2.6;
    this.windGeometry = new THREE.BufferGeometry();
    const windPos = new Float32Array(this.windCount * 3);
    const windSizes = new Float32Array(this.windCount);
    const windPhases = new Float32Array(this.windCount);
    this.windBase = new Float32Array(this.windCount * 3);
    for (let i = 0; i < this.windCount; i++) {
      const a = (i / this.windCount) * Math.PI * 2.0;
      const rr = this.windRadius * (0.8 + Math.random() * 0.4);
      const y = (Math.random() - 0.5) * radius * 0.9;
      this.windBase[i * 3] = Math.cos(a) * rr;
      this.windBase[i * 3 + 1] = y;
      this.windBase[i * 3 + 2] = Math.sin(a) * rr;
      windPos[i * 3] = this.windBase[i * 3];
      windPos[i * 3 + 1] = this.windBase[i * 3 + 1];
      windPos[i * 3 + 2] = this.windBase[i * 3 + 2];
      windSizes[i] = 0.35 + Math.random() * 0.5;
      windPhases[i] = Math.random() * Math.PI * 2.0;
    }
    this.windGeometry.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
    this.windGeometry.setAttribute('aSize', new THREE.BufferAttribute(windSizes, 1));
    this.windGeometry.setAttribute('aPhase', new THREE.BufferAttribute(windPhases, 1));
    this.windMaterial = new THREE.ShaderMaterial({
      vertexShader: windVertexShader,
      fragmentShader: windFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 1.0 },
        uPulse: { value: 0.0 },
      },
    });
    this.windPoints = new THREE.Points(this.windGeometry, this.windMaterial);
    this.windPoints.frustumCulled = false;
    this.group.add(this.windPoints);
  }

  public update(_time: number, delta: number) {
    this.elapsed += delta;

    // Extreme rotation — the sweep direction is immediately readable.
    this.beamGroup.rotation.z += this.rotationSpeed * delta;
    this.beamGroup.rotation.y += this.rotationSpeed * 0.35 * delta;

    // Periodic pulse: double flash per rotation, like a lighthouse beam
    // crossing the line of sight twice per revolution.
    const cycle = Math.abs(Math.sin(this.elapsed * this.rotationSpeed * 0.5));
    const pulse = Math.pow(cycle, 5.0);

    this.coreMaterial.uniforms.uPulse.value = pulse;
    this.windMaterial.uniforms.uPulse.value = pulse;
    for (const mat of this.beamMaterials) {
      mat.uniforms.uPulse.value = pulse;
    }

    // Wind particles orbit the core at relativistic-looking speed.
    const windPos = this.windGeometry.attributes.position.array as Float32Array;
    const spin = this.rotationSpeed * 1.6 * delta;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);
    for (let i = 0; i < this.windCount; i++) {
      const x = this.windBase[i * 3];
      const z = this.windBase[i * 3 + 2];
      windPos[i * 3] = x * cos - z * sin;
      windPos[i * 3 + 2] = x * sin + z * cos;
    }
    this.windGeometry.attributes.position.needsUpdate = true;
  }

  public setIntensity(intensity: number) {
    this.coreMaterial.uniforms.uIntensity.value = intensity;
    this.windMaterial.uniforms.uIntensity.value = intensity;
    for (const mat of this.beamMaterials) {
      mat.uniforms.uIntensity.value = intensity;
    }
  }

  public setPixelRatio(dpr: number) {
    this.coreMaterial.uniforms.uPixelRatio.value = dpr;
    this.windMaterial.uniforms.uPixelRatio.value = dpr;
  }

  public getParticleCount(): number {
    return this.coreGeometry.attributes.position.count + this.windCount;
  }

  public dispose() {
    this.coreGeometry.dispose();
    this.coreMaterial.dispose();
    this.windGeometry.dispose();
    this.windMaterial.dispose();
    for (const mesh of this.beams) {
      mesh.geometry.dispose();
    }
    for (const mat of this.beamMaterials) {
      mat.dispose();
    }
  }
}