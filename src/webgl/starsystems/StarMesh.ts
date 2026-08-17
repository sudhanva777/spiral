import * as THREE from 'three';
import type { StarConfig } from '../../types/starSystem';
import {
  starCoreVertexShader,
  starCoreFragmentShader,
  starCoronaVertexShader,
  starCoronaFragmentShader,
} from './shaders/starShader';

export class StarMesh {
  public group: THREE.Group;
  public config: StarConfig;

  private coreMesh: THREE.Mesh;
  private coreMaterial: THREE.ShaderMaterial;
  private coronaMesh: THREE.Mesh;
  private coronaMaterial: THREE.ShaderMaterial;
  private plasmaPoints: THREE.Points;
  private plasmaMaterial: THREE.PointsMaterial;

  constructor(config: StarConfig) {
    this.config = config;
    this.group = new THREE.Group();

    // 1. Star Core Sphere
    const radius = config.apparentRadius;
    const coreGeom = new THREE.SphereGeometry(radius, 32, 32);

    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: starCoreVertexShader,
      fragmentShader: starCoreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCoreColor: { value: new THREE.Color(config.coreColor) },
        uCoronaColor: { value: new THREE.Color(config.coronaColor) },
        uGlowColor: { value: new THREE.Color(config.glowColor) },
        uPulseSpeed: { value: config.pulseSpeed },
      },
    });

    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.group.add(this.coreMesh);

    // 2. Coronal Outer Halo (Double-sided plane or billboard)
    const coronaSize = radius * 4.8;
    const coronaGeom = new THREE.PlaneGeometry(coronaSize, coronaSize);

    this.coronaMaterial = new THREE.ShaderMaterial({
      vertexShader: starCoronaVertexShader,
      fragmentShader: starCoronaFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCoronaColor: { value: new THREE.Color(config.coronaColor) },
        uGlowColor: { value: new THREE.Color(config.glowColor) },
        uPulseSpeed: { value: config.pulseSpeed },
        uIntensity: { value: config.coronaIntensity },
      },
    });

    this.coronaMesh = new THREE.Mesh(coronaGeom, this.coronaMaterial);
    this.group.add(this.coronaMesh);

    // 3. Energetic Plasma Particle Flare
    const particleCount = config.plasmaParticlesCount || 240;
    const plasmaGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2.0;
      const phi = (Math.random() - 0.5) * Math.PI;
      const r = radius * (1.05 + Math.random() * 1.6);
      positions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
    }

    plasmaGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.plasmaMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(config.flareColor),
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.plasmaPoints = new THREE.Points(plasmaGeom, this.plasmaMaterial);
    this.group.add(this.plasmaPoints);
  }

  public update(time: number, camera?: THREE.Camera) {
    this.coreMaterial.uniforms.uTime.value = time;
    this.coronaMaterial.uniforms.uTime.value = time;

    // Billboard the corona toward camera if provided
    if (camera) {
      this.coronaMesh.quaternion.copy(camera.quaternion);
    }

    // Plasma particle rotation
    this.plasmaPoints.rotation.y = time * 0.15 * this.config.pulseSpeed;
    this.plasmaPoints.rotation.z = time * 0.08 * this.config.pulseSpeed;
  }

  public dispose() {
    this.coreMesh.geometry.dispose();
    this.coreMaterial.dispose();
    this.coronaMesh.geometry.dispose();
    this.coronaMaterial.dispose();
    this.plasmaPoints.geometry.dispose();
    this.plasmaMaterial.dispose();
  }
}
