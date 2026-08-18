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
      float rim = pow(fresnel, 6.0) * 0.85;
      
      // Absolute pitch black core inside, razor-thin luminous grazing horizon rim
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

  constructor(config: BlackHoleConfig, particleCount = 8500) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.rotation.set(...config.diskTilt);

    // 1. Event Horizon Sphere (Dark central absorbing singularity)
    const horizonGeo = new THREE.SphereGeometry(config.eventHorizonRadius, 48, 48);
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
    this.horizonMesh.renderOrder = 0;
    this.group.add(this.horizonMesh);

    // 2. Relativistic Photon Ring Geometry (Sharp luminous torus bounding the photon sphere at 1.5 * r_s)
    const ringGeo = new THREE.TorusGeometry(config.photonRingRadius, 0.038, 20, 80);
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
          gl_FragColor = vec4(uColor * 2.8, 0.98);
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

    // 3. Dynamic Accretion & Infall Particle System (7 Specialized Particle Groups)
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const types = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const aux = new Float32Array(particleCount * 3);

    const rgbInner = hexToRgb(config.palette.accretionInner);
    const rgbMid = hexToRgb(config.palette.accretionMid);
    const rgbOuter = hexToRgb(config.palette.accretionOuter);
    const rgbInfall = hexToRgb(config.palette.infallStream);
    const rgbPhoton = hexToRgb(config.palette.photonRing);

    const innerR = config.accretionInnerRadius;
    const outerR = config.accretionOuterRadius;
    const rH = config.eventHorizonRadius;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const p = Math.random();

      let type = 0.0;
      let r = innerR;
      let size = 1.0;
      let speed = 1.0;
      let col: [number, number, number] = rgbMid;
      let aux1 = 0.0;
      let aux2 = 0.0;
      let aux3 = 0.0;

      if (p < 0.40) {
        // =====================================================================
        // TYPE 0: Equatorial Accretion Disk (Differential Keplerian velocity)
        // =====================================================================
        type = 0.0;
        const normR = Math.pow(Math.random(), 1.35);
        r = innerR + normR * (outerR - innerR);
        speed = 0.85 + Math.random() * 0.35;
        size = 0.75 + Math.random() * 0.95;

        if (normR < 0.30) {
          col = mixRgb(rgbPhoton, rgbInner, normR / 0.30);
          size *= 1.3;
        } else if (normR < 0.70) {
          col = mixRgb(rgbInner, rgbMid, (normR - 0.30) / 0.40);
        } else {
          col = mixRgb(rgbMid, rgbOuter, (normR - 0.70) / 0.30);
        }
      } else if (p < 0.62) {
        // =====================================================================
        // TYPE 3: Gravitationally Warped Disk Arc (Interstellar Einstein Lensing)
        // Light from back of accretion disk lensed over top and bottom
        // =====================================================================
        type = 3.0;
        const normR = Math.pow(Math.random(), 1.2);
        r = innerR + normR * (outerR - innerR);
        speed = 0.9 + Math.random() * 0.3;
        size = 0.8 + Math.random() * 0.9;
        aux1 = Math.random() < 0.5 ? 1.0 : -1.0; // Top vs bottom arc

        if (normR < 0.4) {
          col = mixRgb(rgbPhoton, rgbInner, normR / 0.4);
          size *= 1.25;
        } else {
          col = mixRgb(rgbInner, rgbMid, (normR - 0.4) / 0.6);
        }
      } else if (p < 0.76) {
        // =====================================================================
        // TYPE 4: Vertical Thermal Corona & High-Energy Plasma
        // =====================================================================
        type = 4.0;
        const normR = Math.random();
        r = innerR + normR * (outerR * 1.15 - innerR);
        speed = 0.7 + Math.random() * 0.4;
        size = 1.1 + Math.random() * 1.3;
        aux2 = (Math.random() * 2.0 - 1.0); // Vertical expansion
        col = mixRgb(rgbMid, rgbOuter, normR);
      } else if (p < 0.86) {
        // =====================================================================
        // TYPE 1: Infalling Matter Plunge Streams (Past ISCO into Horizon)
        // =====================================================================
        type = 1.0;
        r = rH + Math.random() * (outerR * 1.25 - rH);
        speed = 1.25 + Math.random() * 0.65;
        size = 0.85 + Math.random() * 0.85;
        col = Math.random() < 0.55 ? rgbInfall : rgbInner;
      } else if (p < 0.94) {
        // =====================================================================
        // TYPE 5: Curved & Captured Passing Light Rays
        // =====================================================================
        type = 5.0;
        const impact = rH * 0.6 + Math.random() * (outerR * 1.4);
        r = impact;
        speed = 1.1 + Math.random() * 0.8;
        size = 0.8 + Math.random() * 0.8;
        aux2 = Math.random() * Math.PI * 2.0; // Ray trajectory angle
        aux3 = impact < rH * 1.45 ? 1.0 : 0.0; // 1.0 = Captured into horizon, 0.0 = Escaping deflected
        col = aux3 > 0.5 ? rgbInfall : rgbPhoton;
      } else if (p < 0.98) {
        // =====================================================================
        // TYPE 2: Photon Ring Relativistic Sparks
        // =====================================================================
        type = 2.0;
        r = config.photonRingRadius;
        speed = 1.85 + Math.random() * 0.5;
        size = 1.2 + Math.random() * 1.0;
        col = rgbPhoton;
      } else {
        // =====================================================================
        // TYPE 6: Lensed Background Stars
        // =====================================================================
        type = 6.0;
        r = config.photonRingRadius * 1.1 + Math.random() * (outerR * 1.6);
        speed = 0.2 + Math.random() * 0.2;
        size = 0.9 + Math.random() * 0.8;
        aux1 = (Math.random() * 2.0 - 1.0) * 0.5;
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

      aux[i3] = aux1;
      aux[i3 + 1] = aux2;
      aux[i3 + 2] = aux3;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.particleGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.particleGeometry.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aAux', new THREE.BufferAttribute(aux, 3));

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

    // Subtle relativistic frame dragging precession of the photon ring
    this.photonRingMesh.rotation.z = time * 0.18;
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
