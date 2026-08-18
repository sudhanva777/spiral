import * as THREE from 'three';
import { GalaxyParticles } from '../particles/GalaxyParticles';
import { EnergyJetSystem } from './effects/EnergyJetSystem';
import { BlackHoleSystem } from './effects/BlackHoleSystem';
import { StarSystemManager } from '../starsystems/StarSystemManager';
import type { GalaxyConfig } from '../../types/universe';
import type { GalaxyPreset } from '../../types/simulation';

function getParticleCountForGalaxy(config: GalaxyConfig, totalUniverseParticles: number): number {
  switch (config.id) {
    case 'galaxy06':
      // Galaxy 06 (Aetheris): Monumental centerpiece with highest particle density
      return Math.round(totalUniverseParticles * 0.26);
    case 'galaxy05':
      // Galaxy 05 (Red Veil): Dense energetic starburst galaxy
      return Math.round(totalUniverseParticles * 0.18);
    case 'galaxy04':
      // Galaxy 04 (Eclipse): High-contrast dense golden storm
      return Math.round(totalUniverseParticles * 0.18);
    case 'galaxy03':
      // Galaxy 03 (Verdant): Deep multi-layered emerald ecosystem
      return Math.round(totalUniverseParticles * 0.18);
    case 'galaxy02':
      // Galaxy 02 (Ignis Vesper): Flocculent ring
      return Math.round(totalUniverseParticles * 0.14);
    case 'galaxy01':
    default:
      // Galaxy 01 (Aether Prime): Baseline reference quality preserved
      return Math.round(totalUniverseParticles * 0.14);
  }
}

export class GalaxyInstance {
  public config: GalaxyConfig;
  public group: THREE.Group;
  public particles: GalaxyParticles;
  public energyJets?: EnergyJetSystem;
  public blackHole?: BlackHoleSystem;
  public starSystems?: StarSystemManager;
  public worldPosition: THREE.Vector3;
  public boundingRadius = 45.0;
  public currentDistanceToCamera = 0;
  public currentLOD = 1.0;

  // Local interaction vector buffers
  private localMouse3D = new THREE.Vector3();
  private localPulseOrigin = new THREE.Vector3();

  constructor(config: GalaxyConfig, totalUniverseParticles: number) {
    this.config = config;
    this.group = new THREE.Group();
    this.worldPosition = new THREE.Vector3(...config.position);
    this.group.position.copy(this.worldPosition);
    this.group.rotation.set(...config.rotation);
    this.group.scale.setScalar(config.scale);
    this.boundingRadius = (config.boundingRadius || 45.0) * config.scale;

    // Allocated particle density for this specific galaxy
    const count = getParticleCountForGalaxy(config, totalUniverseParticles);
    this.particles = new GalaxyParticles(count, config);
    this.group.add(this.particles.points);

    // Modular Living Supermassive Black Hole System (Galaxies 02-16)
    if (config.hasBlackHole && config.blackHoleConfig) {
      const bhParticles = Math.min(Math.max(Math.round(count * 0.08), 5500), 9500);
      this.blackHole = new BlackHoleSystem(config.blackHoleConfig, bhParticles);
      this.group.add(this.blackHole.group);
    }

    // Modular special effect (e.g. Relativistic Energy Jets for Galaxy 06)
    if (config.specialEffect === 'energy-jets') {
      const jetParticles = Math.min(Math.round(count * 0.045), 6000);
      this.energyJets = new EnergyJetSystem(jetParticles);
      this.group.add(this.energyJets.points);
    }

    // Hierarchical Planetary Star Systems (Phase 1: Galaxy 01 / Prime Galaxy)
    if (config.id === 'galaxy01') {
      this.starSystems = new StarSystemManager();
      this.group.add(this.starSystems.group);
    }
  }

  public update(
    time: number,
    worldMouse3D: THREE.Vector3,
    entranceProgress: number,
    mouseInfluence: number,
    worldPulseOrigin?: THREE.Vector3,
    pulseProgress = 0.0,
    pulseStrength = 0.0,
    coreInspection = 0.0,
    camera?: THREE.Camera
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

    if (this.blackHole) {
      const bhLOD = this.currentDistanceToCamera < 45.0 ? 1.0 : this.currentLOD;
      this.blackHole.update(time, bhLOD);
    }

    if (this.energyJets) {
      this.energyJets.update(time, this.currentLOD);
    }

    if (this.starSystems && camera) {
      this.starSystems.update(time, camera);
    }
  }

  public updateLOD(cameraPosition: THREE.Vector3) {
    this.currentDistanceToCamera = this.worldPosition.distanceTo(cameraPosition);

    // Dynamic Scale-Aware LOD curve
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
    if (this.blackHole) {
      this.blackHole.setPixelRatio(dpr);
    }
    if (this.energyJets) {
      this.energyJets.setPixelRatio(dpr);
    }
  }

  public applyPreset(preset: GalaxyPreset) {
    this.particles.applyPreset(preset);
  }

  public rebuild(totalUniverseParticles: number) {
    this.group.remove(this.particles.points);
    this.particles.dispose();

    const count = getParticleCountForGalaxy(this.config, totalUniverseParticles);
    this.particles = new GalaxyParticles(count, this.config);
    this.group.add(this.particles.points);
  }

  public dispose() {
    this.particles.dispose();
    if (this.blackHole) {
      this.blackHole.dispose();
    }
    if (this.energyJets) {
      this.energyJets.dispose();
    }
    if (this.starSystems) {
      this.starSystems.dispose();
    }
  }
}
