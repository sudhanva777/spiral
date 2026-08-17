import * as THREE from 'three';
import { GalaxyParticles } from '../particles/GalaxyParticles';
import type { GalaxyConfig } from '../../types/universe';
import type { GalaxyPreset } from '../../types/simulation';

export class GalaxyInstance {
  public config: GalaxyConfig;
  public group: THREE.Group;
  public particles: GalaxyParticles;
  public worldPosition: THREE.Vector3;
  public boundingRadius = 45.0;
  public currentDistanceToCamera = 0;
  public currentLOD = 1.0;

  // Local interaction vector buffers
  private localMouse3D = new THREE.Vector3();
  private localPulseOrigin = new THREE.Vector3();

  constructor(config: GalaxyConfig, particleCount: number) {
    this.config = config;
    this.group = new THREE.Group();
    this.worldPosition = new THREE.Vector3(...config.position);
    this.group.position.copy(this.worldPosition);
    this.group.rotation.set(...config.rotation);
    this.group.scale.setScalar(config.scale);

    this.particles = new GalaxyParticles(particleCount, config);
    this.group.add(this.particles.points);
  }

  public update(
    time: number,
    worldMouse3D: THREE.Vector3,
    entranceProgress: number,
    mouseInfluence: number,
    worldPulseOrigin?: THREE.Vector3,
    pulseProgress = 0.0,
    pulseStrength = 0.0,
    coreInspection = 0.0
  ) {
    // Transform world mouse coordinate into galaxy local coordinate space
    this.localMouse3D.copy(worldMouse3D);
    this.group.worldToLocal(this.localMouse3D);

    // Transform pulse origin into local space if provided
    if (worldPulseOrigin) {
      this.localPulseOrigin.copy(worldPulseOrigin);
      this.group.worldToLocal(this.localPulseOrigin);
    }

    this.particles.update(
      time,
      this.localMouse3D,
      entranceProgress,
      mouseInfluence,
      worldPulseOrigin ? this.localPulseOrigin : undefined,
      pulseProgress,
      pulseStrength,
      coreInspection
    );
  }

  public updateLOD(cameraPosition: THREE.Vector3) {
    this.currentDistanceToCamera = this.worldPosition.distanceTo(cameraPosition);

    // Dynamic Scale-Aware LOD curve
    // Distance < 90 AU: Full LOD (1.0)
    // Distance 90 - 280 AU: Smooth LOD transition (1.0 -> 0.4)
    // Distance > 280 AU: Distant LOD (0.35)
    if (this.currentDistanceToCamera < 90) {
      this.currentLOD = 1.0;
    } else if (this.currentDistanceToCamera < 280) {
      this.currentLOD = 1.0 - ((this.currentDistanceToCamera - 90) / 190) * 0.65;
    } else {
      this.currentLOD = 0.35;
    }

    this.particles.setLODFactor(this.currentLOD);
  }

  public setPixelRatio(dpr: number) {
    this.particles.setPixelRatio(dpr);
  }

  public applyPreset(preset: GalaxyPreset) {
    this.particles.applyPreset(preset);
  }

  public rebuild(count: number) {
    this.particles.rebuild(count, this.config);
  }

  public dispose() {
    this.particles.dispose();
    this.group.clear();
  }
}
