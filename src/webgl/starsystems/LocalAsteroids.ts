import * as THREE from 'three';

export class LocalAsteroids {
  public group: THREE.Group;
  public instancedMesh: THREE.InstancedMesh;

  private radii: Float32Array;
  private speeds: Float32Array;
  private phases: Float32Array;
  private inclinations: Float32Array;
  private tumbleAxes: THREE.Vector3[];
  private tumbleSpeeds: Float32Array;
  private scales: Float32Array;
  private count: number;

  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempQuaternion = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();

  constructor(planetRadius: number, count = 100) {
    this.count = count;
    this.group = new THREE.Group();

    this.radii = new Float32Array(count);
    this.speeds = new Float32Array(count);
    this.phases = new Float32Array(count);
    this.inclinations = new Float32Array(count);
    this.tumbleAxes = [];
    this.tumbleSpeeds = new Float32Array(count);
    this.scales = new Float32Array(count);

    const baseGeom = new THREE.DodecahedronGeometry(0.004, 0);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.05,
      color: 0x887766,
      transparent: true,
      opacity: 0.85,
    });

    this.instancedMesh = new THREE.InstancedMesh(baseGeom, mat, count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < count; i++) {
      const minR = planetRadius * 1.8;
      const maxR = planetRadius * 4.5;
      this.radii[i] = minR + Math.random() * (maxR - minR);
      this.speeds[i] = (1.5 + Math.random() * 2.5) * (Math.random() < 0.2 ? -1 : 1);
      this.phases[i] = Math.random() * Math.PI * 2.0;
      this.inclinations[i] = (Math.random() - 0.5) * 0.4;

      this.tumbleAxes.push(
        new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
      );
      this.tumbleSpeeds[i] = 1.0 + Math.random() * 4.0;
      this.scales[i] = 0.5 + Math.random() * 1.5;
    }

    this.group.add(this.instancedMesh);
  }

  public update(time: number, isClose: boolean) {
    this.instancedMesh.visible = isClose;
    if (!isClose) return;

    for (let i = 0; i < this.count; i++) {
      const r = this.radii[i];
      const angle = this.phases[i] + time * this.speeds[i] * 0.5;
      const inc = this.inclinations[i];

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = Math.sin(angle) * r * inc;

      this.tempPosition.set(x, y, z);
      this.tempQuaternion.setFromAxisAngle(this.tumbleAxes[i], time * this.tumbleSpeeds[i]);
      const s = this.scales[i];
      this.tempScale.set(s, s, s);

      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.instancedMesh.setMatrixAt(i, this.tempMatrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
  }
}
