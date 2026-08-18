import * as THREE from 'three';
import { filamentVertexShader } from '../shaders/filament.vert';
import { filamentFragmentShader } from '../shaders/filament.frag';
import { COSMIC_GROUPS } from '../galaxies/registry';

function randomGaussian(mean = 0, stdev = 1): number {
  const u1 = 1.0 - Math.random();
  const u2 = 1.0 - Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdev * randStdNormal;
}

export class CosmicWeb {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(particleCount = 18000) {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const densities = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    // Group Centers
    const pA = new THREE.Vector3(...COSMIC_GROUPS[0].center);
    const pB = new THREE.Vector3(...COSMIC_GROUPS[1].center);
    const pC = new THREE.Vector3(...COSMIC_GROUPS[2].center);
    const pD = new THREE.Vector3(...COSMIC_GROUPS[3].center);
    const pE = new THREE.Vector3(...COSMIC_GROUPS[4].center);

    // Filament Arcs Connecting the Cosmic Web
    const filaments = [
      { start: pA, end: pB, mid: new THREE.Vector3(60, -35, 80), col1: [0.15, 0.45, 0.95], col2: [0.85, 0.35, 0.75] },
      { start: pA, end: pC, mid: new THREE.Vector3(-95, 25, -145), col1: [0.25, 0.85, 0.65], col2: [0.95, 0.65, 0.15] },
      { start: pB, end: pD, mid: new THREE.Vector3(220, 10, 15), col1: [0.85, 0.35, 0.75], col2: [0.15, 0.85, 0.95] },
      { start: pC, end: pD, mid: new THREE.Vector3(80, 55, -220), col1: [0.95, 0.65, 0.15], col2: [0.15, 0.85, 0.95] },
      { start: pA, end: pD, mid: new THREE.Vector3(85, 12, -75), col1: [0.15, 0.45, 0.95], col2: [0.95, 0.85, 0.35] },
      { start: pB, end: pC, mid: new THREE.Vector3(45, 20, -40), col1: [0.85, 0.25, 0.45], col2: [0.45, 0.25, 0.85] },
      // Faint emerald-cyan filament arcing from the Local Cluster toward IC 1579 —
      // the only large-scale structure along the intentional empty gap.
      { start: pA, end: pE, mid: new THREE.Vector3(-165, 30, -85), col1: [0.10, 0.55, 0.55], col2: [0.15, 0.75, 0.65] },
    ];

    const particlesPerFilament = Math.floor(particleCount / filaments.length);

    let idx = 0;
    for (let f = 0; f < filaments.length; f++) {
      const fil = filaments[f];
      const curve = new THREE.QuadraticBezierCurve3(fil.start, fil.mid, fil.end);

      for (let p = 0; p < particlesPerFilament; p++) {
        const i3 = idx * 3;
        const t = Math.random();
        const basePoint = curve.getPoint(t);

        // Density gradient: dense luminous core spine + outer diffuse sheath
        const isSpine = Math.random() < 0.45;
        const dispersionRadius = isSpine ? 3.5 + Math.random() * 6.0 : 8.0 + Math.random() * 22.0;

        const normal = new THREE.Vector3(randomGaussian(0, 1), randomGaussian(0, 1), randomGaussian(0, 1)).normalize();
        basePoint.addScaledVector(normal, dispersionRadius);

        positions[i3] = basePoint.x;
        positions[i3 + 1] = basePoint.y;
        positions[i3 + 2] = basePoint.z;

        sizes[idx] = isSpine ? 1.4 + Math.random() * 1.6 : 0.8 + Math.random() * 1.2;
        phases[idx] = Math.random() * Math.PI * 2.0;
        densities[idx] = isSpine ? 0.85 + Math.random() * 0.15 : 0.25 + Math.random() * 0.4;

        // Ethereal gradient along filament
        const colR = fil.col1[0] + (fil.col2[0] - fil.col1[0]) * t;
        const colG = fil.col1[1] + (fil.col2[1] - fil.col1[1]) * t;
        const colB = fil.col1[2] + (fil.col2[2] - fil.col1[2]) * t;

        colors[i3] = colR;
        colors[i3 + 1] = colG;
        colors[i3 + 2] = colB;

        idx++;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aDensity', new THREE.BufferAttribute(densities, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: filamentVertexShader,
      fragmentShader: filamentFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uLODFactor: { value: 1.0 },
        uIntensity: { value: 0.5 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, lodFactor = 1.0) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLODFactor.value = lodFactor;
  }

  public setIntensity(intensity: number) {
    this.material.uniforms.uIntensity.value = intensity;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
