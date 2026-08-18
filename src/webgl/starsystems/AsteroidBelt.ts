import * as THREE from 'three';
import type { AsteroidBeltConfig } from '../../types/starSystem';

export class AsteroidBelt {
  public group: THREE.Group;
  public instancedMesh: THREE.InstancedMesh;
  public config: AsteroidBeltConfig;

  private orbitRadii: Float32Array;
  private eccentricities: Float32Array;
  private phases: Float32Array;
  private orbitSpeeds: Float32Array;
  private heightOffsets: Float32Array;
  private tumbleAxes: THREE.Vector3[];
  private tumbleSpeeds: Float32Array;
  private scales: Float32Array;

  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();

  constructor(config: AsteroidBeltConfig) {
    this.config = config;
    this.group = new THREE.Group();

    if (config.inclination) {
      this.group.rotation.x = config.inclination;
    }

    const count = config.count;
    this.orbitRadii = new Float32Array(count);
    this.eccentricities = new Float32Array(count);
    this.phases = new Float32Array(count);
    this.orbitSpeeds = new Float32Array(count);
    this.heightOffsets = new Float32Array(count);
    this.tumbleAxes = [];
    this.tumbleSpeeds = new Float32Array(count);
    this.scales = new Float32Array(count);

    // Low-poly irregular asteroid rock geometry
    const baseGeom = new THREE.DodecahedronGeometry(0.016, 0);
    const posAttr = baseGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const distortion = 0.8 + Math.random() * 0.4;
      v.multiplyScalar(distortion);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    baseGeom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    this.instancedMesh = new THREE.InstancedMesh(baseGeom, mat, count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const baseCol = new THREE.Color(config.baseColor);
    const accentCol = new THREE.Color(config.accentColor);
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const r = config.innerRadius + u * (config.outerRadius - config.innerRadius);
      this.orbitRadii[i] = r;
      this.eccentricities[i] = Math.random() * 0.06;
      this.phases[i] = Math.random() * Math.PI * 2.0;

      // Keplerian speed: inner asteroids move faster
      const speedMult = Math.pow(config.innerRadius / r, 1.5);
      this.orbitSpeeds[i] = config.orbitSpeed * speedMult * (0.95 + Math.random() * 0.1);

      this.heightOffsets[i] = (Math.random() - 0.5) * config.height;
      this.tumbleAxes.push(
        new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      );
      this.tumbleSpeeds[i] = 0.5 + Math.random() * 2.5;
      this.scales[i] = 0.6 + Math.random() * 1.8;

      tempCol.lerpColors(baseCol, accentCol, Math.random());
      this.instancedMesh.setColorAt(i, tempCol);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.instancedMesh);
  }

  public update(time: number, cameraDist: number) {
    const isVisible = cameraDist < 45.0;
    this.instancedMesh.visible = isVisible;
    if (!isVisible) return;

    const count = this.config.count;
    for (let i = 0; i < count; i++) {
      const a = this.orbitRadii[i];
      const e = this.eccentricities[i];
      const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
      const c = a * e;

      const angle = this.phases[i] + time * this.orbitSpeeds[i] * 0.4;
      const x = Math.cos(angle) * a - c;
      const z = Math.sin(angle) * b;
      const y = this.heightOffsets[i];

      this.tempPosition.set(x, y, z);
      this.tempQuaternion.setFromAxisAngle(this.tumbleAxes[i], time * this.tumbleSpeeds[i]);
      const s = this.scales[i];
      this.tempScale.set(s, s, s);

      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.instancedMesh.setMatrixAt(i, this.tempMatrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Fade opacity based on proximity
    const mat = this.instancedMesh.material as THREE.MeshStandardMaterial;
    mat.opacity = Math.max(0.2, Math.min(0.9, (40.0 - cameraDist) / 15.0));
  }

  public dispose() {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
  }
}
