import * as THREE from 'three';
import { energyJetVertexShader } from '../../shaders/energyJet.vert';
import { energyJetFragmentShader } from '../../shaders/energyJet.frag';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
}

export class EnergyJetSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(particleCount = 5000) {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const axes = new Float32Array(particleCount);
    const layers = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    // Jet Palette: White-hot core -> Electric Cyan -> Deep Blue -> Warm Amber accents
    const colWhite = hexToRgb('#FFFFFF');
    const colIce = hexToRgb('#B8F5FF');
    const colCyan = hexToRgb('#00D9FF');
    const colBlue = hexToRgb('#1687FF');
    const colAmber = hexToRgb('#FF9A3D');
    const colOrange = hexToRgb('#FF6B1A');

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // 50% upward (+1), 50% downward (-1)
      const axis = i % 2 === 0 ? 1.0 : -1.0;
      const p = Math.random();

      let layer = 0;
      let radius = 0.5;
      let speed = 1.8;
      let size = 1.0;
      let col = colWhite;

      if (p < 0.28) {
        // Layer 0: Core Relativistic Beam (Fastest, tightest, white-hot)
        layer = 0;
        radius = 0.15 + Math.pow(Math.random(), 2.0) * 0.75;
        speed = 1.6 + Math.random() * 0.9;
        size = 1.4 + Math.random() * 1.0;
        col = Math.random() < 0.6 ? colWhite : colIce;
      } else if (p < 0.62) {
        // Layer 1: Inner Helical Plasma Sheath (Cyan / Electric Blue)
        layer = 1;
        radius = 0.6 + Math.pow(Math.random(), 1.4) * 2.2;
        speed = 1.2 + Math.random() * 0.6;
        size = 1.0 + Math.random() * 0.8;
        col = Math.random() < 0.5 ? colCyan : colBlue;
      } else if (p < 0.86) {
        // Layer 2: Outer Flaring Particle Streams (Amber / Orange accents)
        layer = 2;
        radius = 1.8 + Math.pow(Math.random(), 1.2) * 3.8;
        speed = 0.85 + Math.random() * 0.5;
        size = 0.8 + Math.random() * 0.7;
        col = Math.random() < 0.5 ? colAmber : colOrange;
      } else {
        // Layer 3: Micro Relativistic Sparks & Halo
        layer = 3;
        radius = 2.5 + Math.random() * 5.0;
        speed = 0.6 + Math.random() * 0.4;
        size = 0.5 + Math.random() * 0.5;
        col = colIce;
      }

      // Initial positions start near center
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      sizes[i] = size;
      speeds[i] = speed;
      radii[i] = radius;
      phases[i] = Math.random();
      axes[i] = axis;
      layers[i] = layer;

      colors[i3] = col[0];
      colors[i3 + 1] = col[1];
      colors[i3 + 2] = col[2];
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aAxis', new THREE.BufferAttribute(axes, 1));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: energyJetVertexShader,
      fragmentShader: energyJetFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uLODFactor: { value: 1.0 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, lodFactor = 1.0) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLODFactor.value = lodFactor;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
