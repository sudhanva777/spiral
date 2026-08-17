import * as THREE from 'three';
import { blackHoleVertexShader } from '../../shaders/blackHole.vert';
import { blackHoleFragmentShader } from '../../shaders/blackHole.frag';
import type { BlackHoleConfig } from '../../../types/universe';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
}

function mixRgb(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    c1[0] + (c2[0] - c1[0]) * clampedT,
    c1[1] + (c2[1] - c1[1]) * clampedT,
    c1[2] + (c2[2] - c1[2]) * clampedT,
  ];
}

// Event Horizon Sphere Shader (Pitch Black with Relativistic Horizon Rim)
const HorizonShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uRimColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = 1.0 - abs(dot(normal, viewDir));
      float rim = pow(fresnel, 5.0) * 0.9;
      
      // Pure deep void black inside, subtle glowing rim at tangential photon horizon
      vec3 col = uRimColor * rim;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class BlackHoleSystem {
  public group: THREE.Group;
  public config: BlackHoleConfig;

  // Visual Components
  private horizonMesh: THREE.Mesh;
  private photonRingMesh: THREE.Mesh;
  private particlePoints: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private horizonMaterial: THREE.ShaderMaterial;
  private photonRingMaterial: THREE.ShaderMaterial;

  constructor(config: BlackHoleConfig, particleCount = 4500) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.rotation.set(...config.diskTilt);

    // 1. Event Horizon Sphere (Dark central absorbing object)
    const horizonGeo = new THREE.SphereGeometry(config.eventHorizonRadius, 32, 32);
    const rimRgb = hexToRgb(config.palette.horizonRim);
    this.horizonMaterial = new THREE.ShaderMaterial({
      vertexShader: HorizonShader.vertexShader,
      fragmentShader: HorizonShader.fragmentShader,
      uniforms: {
        uRimColor: { value: new THREE.Vector3(...rimRgb) },
      },
      depthWrite: true,
    });
    this.horizonMesh = new THREE.Mesh(horizonGeo, this.horizonMaterial);
    this.group.add(this.horizonMesh);

    // 2. Relativistic Photon Ring Geometry (Sharp luminous torus bounding the photon sphere)
    const ringGeo = new THREE.TorusGeometry(config.photonRingRadius, 0.045, 16, 64);
    const photonRgb = hexToRgb(config.palette.photonRing);
    this.photonRingMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor * 2.2, 0.95);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Vector3(...photonRgb) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.photonRingMesh = new THREE.Mesh(ringGeo, this.photonRingMaterial);
    this.photonRingMesh.rotation.x = Math.PI * 0.5;
    this.group.add(this.photonRingMesh);

    // 3. Dynamic Accretion & Infall Particle System
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const types = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const rgbInner = hexToRgb(config.palette.accretionInner);
    const rgbMid = hexToRgb(config.palette.accretionMid);
    const rgbOuter = hexToRgb(config.palette.accretionOuter);
    const rgbInfall = hexToRgb(config.palette.infallStream);
    const rgbPhoton = hexToRgb(config.palette.photonRing);

    const innerR = config.accretionInnerRadius;
    const outerR = config.accretionOuterRadius;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const p = Math.random();

      let type = 0.0;
      let r = innerR;
      let size = 1.0;
      let speed = 1.0;
      let col: [number, number, number] = rgbMid;

      if (p < 0.65) {
        // Type 0: Accretion Disk Particles (Differential Keplerian velocity)
        type = 0.0;
        const normR = Math.pow(Math.random(), 1.4);
        r = innerR + normR * (outerR - innerR);
        speed = 0.85 + Math.random() * 0.35;
        size = 0.7 + Math.random() * 0.9;

        if (normR < 0.35) {
          col = mixRgb(rgbPhoton, rgbInner, normR / 0.35);
          size *= 1.25;
        } else if (normR < 0.75) {
          col = mixRgb(rgbInner, rgbMid, (normR - 0.35) / 0.40);
        } else {
          col = mixRgb(rgbMid, rgbOuter, (normR - 0.75) / 0.25);
        }
      } else if (p < 0.88) {
        // Type 1: Infalling Matter Spiral (Curving inward to horizon)
        type = 1.0;
        r = config.eventHorizonRadius + Math.random() * (outerR * 1.3 - config.eventHorizonRadius);
        speed = 1.2 + Math.random() * 0.6;
        size = 0.8 + Math.random() * 0.8;
        col = Math.random() < 0.5 ? rgbInfall : rgbInner;
      } else {
        // Type 2: Photon Ring Relativistic Micro-Sparks
        type = 2.0;
        r = config.photonRingRadius;
        speed = 1.8 + Math.random() * 0.5;
        size = 1.1 + Math.random() * 0.9;
        col = rgbPhoton;
      }

      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      sizes[i] = size;
      speeds[i] = speed;
      radii[i] = r;
      phases[i] = Math.random() * Math.PI * 2.0;
      types[i] = type;

      colors[i3] = col[0];
      colors[i3 + 1] = col[1];
      colors[i3 + 2] = col[2];
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.particleGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.particleGeometry.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: blackHoleVertexShader,
      fragmentShader: blackHoleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: config.rotationSpeed },
        uInfallRate: { value: config.infallRate },
        uHorizonRadius: { value: config.eventHorizonRadius },
        uPhotonRingRadius: { value: config.photonRingRadius },
        uDiskInnerRadius: { value: config.accretionInnerRadius },
        uDiskOuterRadius: { value: config.accretionOuterRadius },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uLODFactor: { value: 1.0 },
      },
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particlePoints.frustumCulled = false;
    this.group.add(this.particlePoints);
  }

  public update(time: number, lodFactor = 1.0) {
    this.particleMaterial.uniforms.uTime.value = time;
    this.particleMaterial.uniforms.uLODFactor.value = lodFactor;

    // Subtle relativistic precession of the photon ring and accretion disk
    this.photonRingMesh.rotation.z = time * 0.15;
  }

  public setPixelRatio(dpr: number) {
    this.particleMaterial.uniforms.uPixelRatio.value = dpr;
  }

  public dispose() {
    this.horizonGeoDispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.horizonMaterial.dispose();
    this.photonRingMaterial.dispose();
    this.group.clear();
  }

  private horizonGeoDispose() {
    this.horizonMesh.geometry.dispose();
    this.photonRingMesh.geometry.dispose();
  }
}
