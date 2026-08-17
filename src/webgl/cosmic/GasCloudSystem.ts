import * as THREE from 'three';
import { gasCloudVertexShader } from '../shaders/gasCloud.vert';
import { gasCloudFragmentShader } from '../shaders/gasCloud.frag';
import { COSMIC_GROUPS } from '../galaxies/registry';

function randomGaussian(mean = 0, stdev = 1): number {
  const u1 = 1.0 - Math.random();
  const u2 = 1.0 - Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdev * randStdNormal;
}

export class GasCloudSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  constructor(particleCount = 8000) {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const groupColors = [
      [0.08, 0.45, 0.35], // Group A: Emerald / Teal gas
      [0.55, 0.15, 0.35], // Group B: Magenta / Crimson gas
      [0.55, 0.40, 0.10], // Group C: Amber / Bronze gas
      [0.10, 0.35, 0.65], // Group D: Cyan / Electric Blue gas
    ];

    const countPerGroup = Math.floor(particleCount / COSMIC_GROUPS.length);

    let idx = 0;
    for (let g = 0; g < COSMIC_GROUPS.length; g++) {
      const center = new THREE.Vector3(...COSMIC_GROUPS[g].center);
      const baseCol = groupColors[g];

      for (let p = 0; p < countPerGroup; p++) {
        const i3 = idx * 3;
        const radius = 20.0 + Math.pow(Math.random(), 0.8) * 85.0;
        const theta = Math.random() * Math.PI * 2.0;
        const phi = (Math.random() - 0.5) * Math.PI;

        const posX = center.x + radius * Math.cos(phi) * Math.cos(theta) + randomGaussian(0, 10);
        const posY = center.y + radius * Math.sin(phi) * 0.5 + randomGaussian(0, 8);
        const posZ = center.z + radius * Math.cos(phi) * Math.sin(theta) + randomGaussian(0, 10);

        positions[i3] = posX;
        positions[i3 + 1] = posY;
        positions[i3 + 2] = posZ;

        sizes[idx] = 18.0 + Math.random() * 38.0;
        phases[idx] = Math.random() * Math.PI * 2.0;

        const colVar = (Math.random() - 0.5) * 0.15;
        colors[i3] = Math.max(0, baseCol[0] + colVar);
        colors[i3 + 1] = Math.max(0, baseCol[1] + colVar);
        colors[i3 + 2] = Math.max(0, baseCol[2] + colVar);

        idx++;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: gasCloudVertexShader,
      fragmentShader: gasCloudFragmentShader,
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
