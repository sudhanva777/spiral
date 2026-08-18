import * as THREE from 'three';
import { generateStarfieldParticles } from '../utils/galaxyMath';
import { starfieldVertexShader } from '../shaders/starfield.vert';
import { starfieldFragmentShader } from '../shaders/starfield.frag';

export class StarfieldParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(count: number) {
    this.geometry = new THREE.BufferGeometry();
    const data = generateStarfieldParticles(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(data.twinkleSpeeds, 1));
    this.geometry.setAttribute('aTwinklePhase', new THREE.BufferAttribute(data.twinklePhases, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: starfieldVertexShader,
      fragmentShader: starfieldFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uEntranceProgress: { value: 0.0 },
        uIntensity: { value: 0.7 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, entranceProgress: number) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uEntranceProgress.value = entranceProgress;
  }

  public setIntensity(intensity: number) {
    this.material.uniforms.uIntensity.value = intensity;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public rebuild(count: number) {
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    const data = generateStarfieldParticles(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(data.twinkleSpeeds, 1));
    this.geometry.setAttribute('aTwinklePhase', new THREE.BufferAttribute(data.twinklePhases, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

    this.points.geometry = this.geometry;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
