import * as THREE from 'three';
import { generateGalaxyParticles, type ParticleAttributes } from '../utils/galaxyMath';
import { galaxyVertexShader } from '../shaders/galaxy.vert';
import { galaxyFragmentShader } from '../shaders/galaxy.frag';
import type { GalaxyPreset } from '../../types/simulation';

export class GalaxyParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(particleCount: number, spiralTightness = 3.2) {
    this.geometry = new THREE.BufferGeometry();

    const data: ParticleAttributes = generateGalaxyParticles(particleCount, spiralTightness);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 1));
    this.geometry.setAttribute('aRandomness', new THREE.BufferAttribute(data.randomness, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aBranch', new THREE.BufferAttribute(data.branches, 1));
    this.geometry.setAttribute('aDistance', new THREE.BufferAttribute(data.distances, 1));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(data.layers, 1));
    this.geometry.setAttribute('aCoreType', new THREE.BufferAttribute(data.coreTypes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.28 },
        uSizeMultiplier: { value: 1.15 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uTurbulence: { value: 0.8 },
        uSpiralTightness: { value: spiralTightness },
        uEntranceProgress: { value: 0.0 },
        uMousePos3D: { value: new THREE.Vector3(0, 0, 0) },
        uMouseInfluence: { value: 0.5 },
        uTilt: { value: 0.0 },
        uCoreGlowSize: { value: 1.0 },
        uIntensity: { value: 1.0 },
        uCoreFalloff: { value: 6.5 },
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

  public applyPreset(preset: GalaxyPreset) {
    this.material.uniforms.uSpeed.value = preset.speed;
    this.material.uniforms.uTurbulence.value = preset.turbulence;
    this.material.uniforms.uCoreGlowSize.value = preset.coreGlowSize;
    this.material.uniforms.uSpiralTightness.value = preset.spiralTightness;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public rebuild(count: number, spiralTightness = 3.2) {
    this.geometry.dispose();

    this.geometry = new THREE.BufferGeometry();
    const data = generateGalaxyParticles(count, spiralTightness);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(data.scales, 1));
    this.geometry.setAttribute('aRandomness', new THREE.BufferAttribute(data.randomness, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aBranch', new THREE.BufferAttribute(data.branches, 1));
    this.geometry.setAttribute('aDistance', new THREE.BufferAttribute(data.distances, 1));
    this.geometry.setAttribute('aLayer', new THREE.BufferAttribute(data.layers, 1));
    this.geometry.setAttribute('aCoreType', new THREE.BufferAttribute(data.coreTypes, 1));

    this.points.geometry = this.geometry;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
