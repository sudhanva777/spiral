import * as THREE from 'three';
import type { PlanetConfig } from '../../types/starSystem';

export class OrbitLine {
  public line: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;

  constructor(config: PlanetConfig) {
    const segments = 128;
    const points: THREE.Vector3[] = [];

    const a = config.orbitRadius; // Semi-major axis
    const e = config.orbitEccentricity || 0.0;
    const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01)); // Semi-minor axis
    const c = a * e; // Focus offset

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2.0;
      const x = Math.cos(theta) * a - c; // Offset so star sits at one focal point
      const z = Math.sin(theta) * b;
      points.push(new THREE.Vector3(x, 0, z));
    }

    this.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x5588bb),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });

    this.line = new THREE.Line(this.geometry, this.material);

    // Apply orbital inclination if configured
    if (config.orbitInclination) {
      this.line.rotation.x = config.orbitInclination;
    }
  }

  public setOpacity(opacity: number) {
    this.material.opacity = Math.max(0, Math.min(1, opacity));
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
