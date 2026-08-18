import * as THREE from 'three';

// ============================================================================
// BLACK HOLE BINARY — a continuous catastrophic merger inside UNIVERSAL.
//
// Phase state machine (looping):
//   INSPIRAL → bodies orbit a shared barycenter; separation shrinks and
//              orbital velocity accelerates (omega ∝ s^-1.5).
//   MERGE    → the pair collapses into the barycenter with a flash.
//   RINGDOWN → one final black hole + expanding gravitational-wave ripples.
//   COOLDOWN → quiescent single black hole, then the cycle restarts.
//
// Each body: dark event-horizon sphere, a rotating accretion glow ring,
// a white-hot photon ring, and a soft lensing halo. No solid spheres
// overlapping — the merger produces a single larger black hole.
// ============================================================================

const haloVertexShader = /* glsl */ `
attribute float aSize;
uniform float uPixelRatio;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (6.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 2.0, 500.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const haloFragmentShader = /* glsl */ `
uniform float uIntensity;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;
  // Dark lensing silhouette with a hot photon-ring annulus.
  float disc = smoothstep(0.34, 0.32, r) * 0.95;
  float ring = exp(-pow((r - 0.365) * 22.0, 2.0));
  float halo = exp(-4.5 * r * r) * 0.30;
  float alpha = (disc + ring * 1.4 + halo) * uIntensity;
  vec3 col = mix(vec3(0.0), vec3(1.0, 0.96, 0.88), clamp(ring * 1.6 + halo * 0.6, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}
`;

const accretionVertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uPixelRatio;
varying float vPhase;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vPhase = aPhase;
  gl_PointSize = aSize * (5.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.5, 42.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const accretionFragmentShader = /* glsl */ `
varying float vPhase;
uniform float uIntensity;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;
  float soft = exp(-9.0 * r * r);
  float flicker = 0.6 + 0.4 * sin(vPhase * 30.0);
  vec3 col = mix(vec3(1.0, 0.45, 0.15), vec3(0.85, 0.12, 0.05), flicker);
  gl_FragColor = vec4(col, soft * uIntensity * flicker * 0.6);
}
`;

const rippleVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const rippleFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uPhase;
uniform float uEnvelope;
void main() {
  vec2 d = vUv - vec2(0.5);
  float rr = length(d) * 2.0;
  // Expanding concentric spacetime ripples, strongest at the wavefront.
  float wave = sin(rr * 46.0 - uPhase * 10.0);
  float front = exp(-pow((rr - fract(uPhase * 0.55)) * 6.0, 2.0));
  float alpha = (0.5 + 0.5 * wave) * front * uEnvelope;
  alpha = clamp(alpha * 0.35, 0.0, 0.45);
  vec3 col = mix(vec3(0.45, 0.55, 1.0), vec3(1.0, 0.95, 0.85), 0.35 + 0.35 * wave);
  gl_FragColor = vec4(col, alpha);
}
`;

const flashFragmentShader = /* glsl */ `
uniform float uIntensity;
void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;
  float core = exp(-10.0 * r * r);
  float halo = exp(-3.0 * r * r) * 0.4;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), (core + halo) * uIntensity);
}
`;

interface Body {
  group: THREE.Group;
  radius: number;
  accretionPoints: THREE.Points;
  accretionGeo: THREE.BufferGeometry;
  accretionMat: THREE.ShaderMaterial;
  accretionBase: Float32Array;
  accretionCount: number;
  accretionTilt: THREE.Euler;
  haloPoints: THREE.Points;
  haloMat: THREE.ShaderMaterial;
  spin: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  t: number;
  life: number;
  startScale: number;
  endScale: number;
}

type BinaryPhase = 'INSPIRAL' | 'MERGE' | 'RINGDOWN' | 'COOLDOWN';

export class BlackHoleBinary {
  public group: THREE.Group;
  public onMerger?: () => void;

  private phase: BinaryPhase = 'INSPIRAL';
  private phaseTime = 0;
  private cycleSeed: number;

  // Inspiral state
  private s0 = 12.0;
  private minSep = 2.2;
  private separation = 12.0;
  private angle = 0.0;
  private omegaBase = 26.0;
  private inspiralDuration = 26.0;

  private bodyA: Body;
  private bodyB: Body;
  private finalGroup: THREE.Group;
  private finalHaloMat: THREE.ShaderMaterial;
  private finalFlashMat: THREE.ShaderMaterial | null = null;
  private finalFlashPoints: THREE.Points | null = null;
  private flashTime = 0;

  private ripples: Ripple[] = [];
  private rippleGeo: THREE.BufferGeometry;
  private rippleTimer = 0;

  private readonly orbitDir = new THREE.Vector3(1, 0, 0);

  constructor(scale = 1.0) {
    this.group = new THREE.Group();
    this.cycleSeed = Math.random() * 1000;

    this.bodyA = this.createBody(0.95 * scale, 1.6 * scale, new THREE.Euler(0.5, 0.2, 0.15));
    this.bodyB = this.createBody(0.72 * scale, 1.25 * scale, new THREE.Euler(-0.35, 0.4, -0.2));
    this.group.add(this.bodyA.group, this.bodyB.group);

    // Final merged black hole — the product of the collision.
    this.finalGroup = new THREE.Group();
    const finalCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.45 * scale, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    finalCore.frustumCulled = false;
    this.finalGroup.add(finalCore);

    const finalHaloGeo = new THREE.BufferGeometry();
    const haloPos = new Float32Array([0, 0, 0]);
    const haloSize = new Float32Array([7.2 * scale]);
    finalHaloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    finalHaloGeo.setAttribute('aSize', new THREE.BufferAttribute(haloSize, 1));
    this.finalHaloMat = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 0.0 },
      },
    });
    const finalHalo = new THREE.Points(finalHaloGeo, this.finalHaloMat);
    finalHalo.frustumCulled = false;
    this.finalGroup.add(finalHalo);

    // Merger flash — one short powerful burst, then silence.
    const flashGeo = new THREE.BufferGeometry();
    flashGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    flashGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([26.0 * scale]), 1));
    this.finalFlashMat = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: flashFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 0.0 },
      },
    });
    this.finalFlashPoints = new THREE.Points(flashGeo, this.finalFlashMat);
    this.finalFlashPoints.frustumCulled = false;
    this.finalGroup.add(this.finalFlashPoints);

    this.finalGroup.visible = false;
    this.group.add(this.finalGroup);

    // Gravitational-wave ripple rings on the orbital plane.
    this.rippleGeo = new THREE.RingGeometry(0.92, 1.0, 96);
    this.rippleGeo.rotateX(-Math.PI / 2);
  }

  private createBody(radius: number, haloSize: number, tilt: THREE.Euler): Body {
    const group = new THREE.Group();

    // Dark event horizon
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    core.frustumCulled = false;
    group.add(core);

    // Accretion glow ring
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2.0;
      const rr = radius * (1.25 + Math.random() * 0.85);
      base[i * 3] = Math.cos(a) * rr;
      base[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.28;
      base[i * 3 + 2] = Math.sin(a) * rr;
      positions[i * 3] = base[i * 3];
      positions[i * 3 + 1] = base[i * 3 + 1];
      positions[i * 3 + 2] = base[i * 3 + 2];
      sizes[i] = 0.5 + Math.random() * 0.9;
      phases[i] = Math.random() * Math.PI * 2.0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: accretionVertexShader,
      fragmentShader: accretionFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 1.0 },
      },
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.rotation.copy(tilt);
    group.add(points);

    // Photon-ring halo
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    haloGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([haloSize]), 1));
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uIntensity: { value: 1.0 },
      },
    });
    const haloPoints = new THREE.Points(haloGeo, haloMat);
    haloPoints.frustumCulled = false;
    group.add(haloPoints);

    return {
      group,
      radius,
      accretionPoints: points,
      accretionGeo: geo,
      accretionMat: mat,
      accretionBase: base,
      accretionCount: count,
      accretionTilt: tilt,
      haloPoints,
      haloMat,
      spin: 1.4 + Math.random() * 1.2,
    };
  }

  public update(_time: number, delta: number) {
    this.phaseTime += delta;

    if (this.phase === 'INSPIRAL') {
      const t = Math.min(this.phaseTime / this.inspiralDuration, 1.0);
      const ease = t * t * (3.0 - 2.0 * t);
      this.separation = this.s0 + (this.minSep - this.s0) * ease;

      // Kepler-inspired: orbital angular velocity climbs as separation shrinks.
      const omega = this.omegaBase / Math.pow(this.separation, 1.5);
      this.angle += omega * delta;

      const s = this.separation;
      this.orbitDir.set(Math.cos(this.angle), 0, Math.sin(this.angle));
      this.bodyA.group.position.copy(this.orbitDir).multiplyScalar(s * 0.5);
      this.bodyB.group.position.copy(this.orbitDir).multiplyScalar(-s * 0.5);

      if (this.separation <= this.minSep + 0.01) {
        this.phase = 'MERGE';
        this.phaseTime = 0;
      }
    } else if (this.phase === 'MERGE') {
      // Collapse the pair into the barycenter.
      const t = Math.min(this.phaseTime / 1.4, 1.0);
      const ease = t * t * (3.0 - 2.0 * t);
      this.bodyA.group.position.multiplyScalar(1.0 - ease);
      this.bodyB.group.position.multiplyScalar(1.0 - ease);

      if (t >= 1.0) {
        this.phase = 'RINGDOWN';
        this.phaseTime = 0;
        this.flashTime = 0;
        this.bodyA.group.visible = false;
        this.bodyB.group.visible = false;
        this.finalGroup.visible = true;
        if (this.onMerger) this.onMerger();
      }
    } else if (this.phase === 'RINGDOWN') {
      // Bright flash decays over ~1s, then the final black hole settles.
      this.flashTime += delta;
      const flash = Math.max(0.0, 1.0 - this.flashTime / 1.1);
      this.finalFlashMat!.uniforms.uIntensity.value = flash * 1.6;

      // Gravitational-wave ripples pulse outward.
      this.rippleTimer += delta;
      if (this.rippleTimer > 1.15 && this.ripples.length < 5) {
        this.rippleTimer = 0;
        this.spawnRipple();
      }
      this.updateRipples(delta);

      if (this.phaseTime > 9.0) {
        this.phase = 'COOLDOWN';
        this.phaseTime = 0;
      }
    } else {
      // COOLDOWN — the merged black hole rests; the cycle restarts.
      this.finalFlashMat!.uniforms.uIntensity.value = 0.0;
      this.updateRipples(delta);
      if (this.phaseTime > 7.0) {
        this.resetCycle();
      }
    }

    // Individual body spin: accretion material rotates around each hole.
    this.updateBody(this.bodyA, delta);
    this.updateBody(this.bodyB, delta);
  }

  private updateBody(body: Body, delta: number) {
    const spin = body.spin * delta;
    body.accretionPoints.rotation.z += spin;
    const acc = body.accretionGeo.attributes.position.array as Float32Array;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);
    for (let i = 0; i < body.accretionCount; i++) {
      const x = body.accretionBase[i * 3];
      const z = body.accretionBase[i * 3 + 2];
      acc[i * 3] = x * cos - z * sin;
      acc[i * 3 + 2] = x * sin + z * cos;
    }
    body.accretionGeo.attributes.position.needsUpdate = true;
  }

  private spawnRipple() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: rippleVertexShader,
      fragmentShader: rippleFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPhase: { value: 0.0 },
        uEnvelope: { value: 0.0 },
      },
    });
    const mesh = new THREE.Mesh(this.rippleGeo, mat);
    mesh.frustumCulled = false;
    mesh.position.set(0, 0, 0);
    this.group.add(mesh);
    this.ripples.push({ mesh, mat, t: 0, life: 7.0, startScale: 3.0, endScale: 52.0 });
  }

  private updateRipples(delta: number) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += delta;
      const p = Math.min(r.t / r.life, 1.0);
      const scale = r.startScale + (r.endScale - r.startScale) * p;
      r.mesh.scale.set(scale, 1, scale);
      r.mat.uniforms.uPhase.value = p * 3.0;
      // Fade in quickly, then dissolve as the wavefront passes.
      const env = Math.min(1.0, p * 5.0) * Math.max(0.0, 1.0 - p * p * 1.6);
      r.mat.uniforms.uEnvelope.value = env;
      if (p >= 1.0) {
        this.group.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mat.dispose();
        this.ripples.splice(i, 1);
      }
    }
  }

  private resetCycle() {
    this.phase = 'INSPIRAL';
    this.phaseTime = 0;
    this.cycleSeed = Math.random() * 1000;
    this.s0 = 11.0 + (this.cycleSeed % 3.0);
    this.minSep = 2.0 + (this.cycleSeed % 0.6);
    this.inspiralDuration = 24.0 + (this.cycleSeed % 8.0);
    this.omegaBase = 24.0 + (this.cycleSeed % 6.0);
    this.separation = this.s0;
    this.angle = 0;
    this.bodyA.group.visible = true;
    this.bodyB.group.visible = true;
    this.finalGroup.visible = false;
    this.finalFlashMat!.uniforms.uIntensity.value = 0.0;
    this.ripples.forEach((r) => {
      this.group.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mat.dispose();
    });
    this.ripples = [];
    this.rippleTimer = 0;
  }

  public setIntensity(intensity: number) {
    this.bodyA.haloMat.uniforms.uIntensity.value = intensity;
    this.bodyB.haloMat.uniforms.uIntensity.value = intensity;
    this.bodyA.accretionMat.uniforms.uIntensity.value = intensity;
    this.bodyB.accretionMat.uniforms.uIntensity.value = intensity;
    this.finalHaloMat.uniforms.uIntensity.value = intensity;
  }

  public setPixelRatio(dpr: number) {
    this.bodyA.haloMat.uniforms.uPixelRatio.value = dpr;
    this.bodyB.haloMat.uniforms.uPixelRatio.value = dpr;
    this.bodyA.accretionMat.uniforms.uPixelRatio.value = dpr;
    this.bodyB.accretionMat.uniforms.uPixelRatio.value = dpr;
    this.finalHaloMat.uniforms.uPixelRatio.value = dpr;
    if (this.finalFlashMat) this.finalFlashMat.uniforms.uPixelRatio.value = dpr;
  }

  public getParticleCount(): number {
    return this.bodyA.accretionCount + this.bodyB.accretionCount + 4;
  }

  public dispose() {
    this.bodyA.accretionGeo.dispose();
    this.bodyA.accretionMat.dispose();
    this.bodyA.haloPoints.geometry.dispose();
    this.bodyA.haloMat.dispose();
    this.bodyB.accretionGeo.dispose();
    this.bodyB.accretionMat.dispose();
    this.bodyB.haloPoints.geometry.dispose();
    this.bodyB.haloMat.dispose();
    this.finalGroup.children.forEach((child) => {
      if (child instanceof THREE.Points || child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
    });
    this.rippleGeo.dispose();
    this.ripples.forEach((r) => {
      r.mesh.geometry.dispose();
      r.mat.dispose();
    });
    this.ripples = [];
  }
}