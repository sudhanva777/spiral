import * as THREE from 'three';
import { generateGalaxyParticles, type ParticleAttributes } from '../utils/galaxyMath';
import { galaxyVertexShader } from '../shaders/galaxy.vert';
import { galaxyFragmentShader } from '../shaders/galaxy.frag';
import type { GalaxyPreset } from '../../types/simulation';
import type { GalaxyConfig } from '../../types/universe';
import { GALAXY_01_CONFIG } from '../galaxies/registry';

export class GalaxyParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  public config: GalaxyConfig;

  constructor(particleCount: number, config: GalaxyConfig = GALAXY_01_CONFIG) {
    this.config = config;
    this.geometry = new THREE.BufferGeometry();

    const data: ParticleAttributes = generateGalaxyParticles(particleCount, config);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 1));
    this.geometry.setAttribute('aRandomness', new THREE.BufferAttribute(data.randomness, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aBranch', new THREE.BufferAttribute(data.branches, 1));
    this.geometry.setAttribute('aDistance', new THREE.BufferAttribute(data.distances, 1));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(data.layers, 1));
    this.geometry.setAttribute('aCoreType', new THREE.BufferAttribute(data.coreTypes, 1));
    this.geometry.setAttribute('aLuminosity', new THREE.BufferAttribute(data.luminosities, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: config.speed },
        uSizeMultiplier: { value: 1.15 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTurbulence: { value: config.turbulence },
        uSpiralTightness: { value: config.morphology.spiralTightness },
        uEntranceProgress: { value: 0.0 },
        uMousePos3D: { value: new THREE.Vector3(0, 0, 0) },
        uMouseInfluence: { value: 0.0 },
        uTilt: { value: 0.0 },
        uCoreGlowSize: { value: 1.0 },
        uIntensity: { value: 1.0 },
        uCoreFalloff: { value: config.morphology.type === 'flocculent-ring' ? 5.2 : 6.5 },
        uLODFactor: { value: 1.0 },
        // Phase 4: Energy Wave Pulse Uniforms
        uPulseOrigin: { value: new THREE.Vector3(0, 0, 0) },
        uPulseProgress: { value: 0.0 },
        uPulseStrength: { value: 0.0 },
        // Phase 5: Core Inspection LOD Uniform
        uCoreInspection: { value: 0.0 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(
    time: number,
    mousePos3D: THREE.Vector3,
    entranceProgress: number,
    mouseInfluence = 0.5,
    pulseOrigin?: THREE.Vector3,
    pulseProgress = 0.0,
    pulseStrength = 0.0,
    coreInspection = 0.0
  ) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uMousePos3D.value.copy(mousePos3D);
    this.material.uniforms.uEntranceProgress.value = entranceProgress;
    this.material.uniforms.uMouseInfluence.value = mouseInfluence;

    if (pulseOrigin) {
      this.material.uniforms.uPulseOrigin.value.copy(pulseOrigin);
    }
    this.material.uniforms.uPulseProgress.value = pulseProgress;
    this.material.uniforms.uPulseStrength.value = pulseStrength;
    this.material.uniforms.uCoreInspection.value = coreInspection;
  }

  public setLODFactor(lod: number) {
    this.material.uniforms.uLODFactor.value = lod;
  }

  public applyPreset(preset: GalaxyPreset) {
    this.material.uniforms.uSpeed.value = preset.speed;
    this.material.uniforms.uTurbulence.value = preset.turbulence;
    this.material.uniforms.uCoreGlowSize.value = preset.coreGlowSize;
    this.material.uniforms.uSpiralTightness.value = preset.spiralTightness;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public rebuild(count: number, config: GalaxyConfig = this.config) {
    this.config = config;
    this.geometry.dispose();

    this.geometry = new THREE.BufferGeometry();
    const data = generateGalaxyParticles(count, config);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 1));
    this.geometry.setAttribute('aRandomness', new THREE.BufferAttribute(data.randomness, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aBranch', new THREE.BufferAttribute(data.branches, 1));
    this.geometry.setAttribute('aDistance', new THREE.BufferAttribute(data.distances, 1));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(data.layers, 1));
    this.geometry.setAttribute('aCoreType', new THREE.BufferAttribute(data.coreTypes, 1));
    this.geometry.setAttribute('aLuminosity', new THREE.BufferAttribute(data.luminosities, 1));

    this.material.uniforms.uSpeed.value = config.speed;
    this.material.uniforms.uTurbulence.value = config.turbulence;
    this.material.uniforms.uSpiralTightness.value = config.morphology.spiralTightness;
    this.material.uniforms.uCoreFalloff.value = config.morphology.type === 'flocculent-ring' ? 5.2 : 6.5;

    this.points.geometry = this.geometry;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
