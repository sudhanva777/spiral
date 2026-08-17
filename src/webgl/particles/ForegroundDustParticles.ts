import * as THREE from 'three';
import { generateForegroundDustParticles } from '../utils/galaxyMath';
import { foregroundDustVertexShader } from '../shaders/foregroundDust.vert';
import { foregroundDustFragmentShader } from '../shaders/foregroundDust.frag';

export class ForegroundDustParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(count: number) {
    this.geometry = new THREE.BufferGeometry();
    const data = generateForegroundDustParticles(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: foregroundDustVertexShader,
      fragmentShader: foregroundDustFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uEntranceProgress: { value: 0.0 },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, entranceProgress: number) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uEntranceProgress.value = entranceProgress;
  }

  public setPixelRatio(dpr: number) {
    this.material.uniforms.uPixelRatio.value = dpr;
  }

  public rebuild(count: number) {
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    const data = generateForegroundDustParticles(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(data.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));

    this.points.geometry = this.geometry;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
