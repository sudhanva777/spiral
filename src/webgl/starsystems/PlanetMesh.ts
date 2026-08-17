import * as THREE from 'three';
import type { PlanetConfig, PlanetType } from '../../types/starSystem';
import {
  planetSurfaceVertexShader,
  planetSurfaceFragmentShader,
  planetCloudVertexShader,
  planetCloudFragmentShader,
  planetAtmosphereVertexShader,
  planetAtmosphereFragmentShader,
  planetRingVertexShader,
  planetRingFragmentShader,
} from './shaders/planetShader';

function getPlanetTypeIndex(type: PlanetType): number {
  switch (type) {
    case 'earth-like': return 0;
    case 'hot-lava': return 1;
    case 'ice': return 2;
    case 'gas-giant': return 3;
    case 'ringed-giant': return 4;
    case 'ocean': return 5;
    case 'dark-banded': return 6;
    case 'dense-atmosphere': return 7;
    case 'rocky':
    default:
      return 8;
  }
}

export class PlanetMesh {
  public group: THREE.Group;
  public config: PlanetConfig;
  public axialGroup: THREE.Group;

  private surfaceMesh: THREE.Mesh;
  private surfaceMaterial: THREE.ShaderMaterial;

  private cloudMesh?: THREE.Mesh;
  private cloudMaterial?: THREE.ShaderMaterial;

  private atmosphereMesh?: THREE.Mesh;
  private atmosphereMaterial?: THREE.ShaderMaterial;

  private ringMesh?: THREE.Mesh;
  private ringMaterial?: THREE.ShaderMaterial;

  constructor(config: PlanetConfig) {
    this.config = config;
    this.group = new THREE.Group();

    // Axial Tilt Wrapper
    this.axialGroup = new THREE.Group();
    this.axialGroup.rotation.z = config.axialTilt || 0.0;
    this.group.add(this.axialGroup);

    const radius = config.radius;
    const typeIdx = getPlanetTypeIndex(config.type);

    // 1. Planetary Surface
    const surfaceGeom = new THREE.SphereGeometry(radius, 32, 32);
    this.surfaceMaterial = new THREE.ShaderMaterial({
      vertexShader: planetSurfaceVertexShader,
      fragmentShader: planetSurfaceFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPlanetType: { value: typeIdx },
        uPrimaryColor: { value: new THREE.Color(config.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(config.secondaryColor) },
        uAccentColor: { value: new THREE.Color(config.accentColor || config.secondaryColor) },
        uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
      },
    });

    this.surfaceMesh = new THREE.Mesh(surfaceGeom, this.surfaceMaterial);
    this.axialGroup.add(this.surfaceMesh);

    // 2. Swirling Cloud Layer
    if (config.hasClouds) {
      const cloudGeom = new THREE.SphereGeometry(radius * 1.025, 32, 32);
      this.cloudMaterial = new THREE.ShaderMaterial({
        vertexShader: planetCloudVertexShader,
        fragmentShader: planetCloudFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
        },
      });

      this.cloudMesh = new THREE.Mesh(cloudGeom, this.cloudMaterial);
      this.axialGroup.add(this.cloudMesh);
    }

    // 3. Atmospheric Scattering Halo
    if (config.hasAtmosphere && config.atmosphereColor) {
      const atmoGeom = new THREE.SphereGeometry(radius * (1.0 + (config.atmosphereThickness || 0.02) * 5.0), 32, 32);
      this.atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: planetAtmosphereVertexShader,
        fragmentShader: planetAtmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uAtmosphereColor: { value: new THREE.Color(config.atmosphereColor) },
          uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
        },
      });

      this.atmosphereMesh = new THREE.Mesh(atmoGeom, this.atmosphereMaterial);
      this.axialGroup.add(this.atmosphereMesh);
    }

    // 4. Planetary Rings
    if (config.rings) {
      const ringGeom = new THREE.PlaneGeometry(config.rings.outerRadius * 2.2, config.rings.outerRadius * 2.2);
      this.ringMaterial = new THREE.ShaderMaterial({
        vertexShader: planetRingVertexShader,
        fragmentShader: planetRingFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        uniforms: {
          uColor1: { value: new THREE.Color(config.rings.color1) },
          uColor2: { value: new THREE.Color(config.rings.color2) },
          uOpacity: { value: config.rings.opacity },
          uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
        },
      });

      this.ringMesh = new THREE.Mesh(ringGeom, this.ringMaterial);
      this.ringMesh.rotation.x = Math.PI * 0.5; // Align to equatorial plane of planet
      this.axialGroup.add(this.ringMesh);
    }
  }

  public update(time: number, starWorldPos: THREE.Vector3) {
    this.surfaceMaterial.uniforms.uTime.value = time;
    this.surfaceMaterial.uniforms.uLightPosition.value.copy(starWorldPos);

    // Axial rotation of surface
    this.surfaceMesh.rotation.y = time * this.config.rotationSpeed;

    // Independent rotation of clouds
    if (this.cloudMesh && this.cloudMaterial) {
      this.cloudMaterial.uniforms.uTime.value = time;
      this.cloudMaterial.uniforms.uLightPosition.value.copy(starWorldPos);
      this.cloudMesh.rotation.y = time * (this.config.cloudRotationSpeed || this.config.rotationSpeed * 1.3);
    }

    // Atmosphere halo update
    if (this.atmosphereMaterial) {
      this.atmosphereMaterial.uniforms.uLightPosition.value.copy(starWorldPos);
    }

    // Rings update
    if (this.ringMaterial) {
      this.ringMaterial.uniforms.uLightPosition.value.copy(starWorldPos);
    }
  }

  public dispose() {
    this.surfaceMesh.geometry.dispose();
    this.surfaceMaterial.dispose();

    if (this.cloudMesh && this.cloudMaterial) {
      this.cloudMesh.geometry.dispose();
      this.cloudMaterial.dispose();
    }

    if (this.atmosphereMesh && this.atmosphereMaterial) {
      this.atmosphereMesh.geometry.dispose();
      this.atmosphereMaterial.dispose();
    }

    if (this.ringMesh && this.ringMaterial) {
      this.ringMesh.geometry.dispose();
      this.ringMaterial.dispose();
    }
  }
}
