import * as THREE from 'three';
import type { CosmicObjectConfig } from '../../types/universe';
import type { QualityTier } from '../../types/simulation';
import { COSMIC_OBJECTS } from './cosmicObjectRegistry';
import { CosmicRegion } from './CosmicRegion';
import { Pulsar } from '../phenomena/Pulsar';
import { BlackHoleBinary } from '../phenomena/BlackHoleBinary';

// ============================================================================
// COSMIC OBJECT MANAGER
//
// Owns every Universal-level phenomenon: star-forming nebula, cosmic ridge,
// molecular pillar region, pulsar and black-hole binary. Handles per-object
// distance-based LOD intensity, quality-tier scaling, raycast hit testing
// and proximity detection for the discovery system.
// ============================================================================

export interface CosmicObject {
  group: THREE.Group;
  update(time: number, delta: number, camPos: THREE.Vector3): void;
  setIntensity(intensity: number): void;
  setPixelRatio(dpr: number): void;
  getParticleCount(): number;
  dispose(): void;
}

interface CosmicObjectEntry {
  config: CosmicObjectConfig;
  object: CosmicObject;
}

const TIER_FACTOR: Record<QualityTier, number> = {
  ultra: 1.0,
  high: 0.72,
  medium: 0.45,
  low: 0.26,
};

export class CosmicObjectManager {
  public group: THREE.Group;
  public onMerger?: () => void;

  private objects = new Map<string, CosmicObjectEntry>();
  private tierFactor: number;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(tier: QualityTier) {
    this.group = new THREE.Group();
    this.tierFactor = TIER_FACTOR[tier];
    this.rebuild();
  }

  private scaled(count: number): number {
    return Math.max(60, Math.round(count * this.tierFactor));
  }

  private rebuild() {
    for (const entry of this.objects.values()) entry.object.dispose();
    this.objects.clear();

    // --- ROSALINE NEBULA — pink/magenta/purple star-forming nursery ---
    const nebula = new CosmicRegion({
      radius: 90,
      seed: 11.7,
      cavityCount: 7,
      cavityStrength: 0.85,
      layers: [
        {
          count: this.scaled(8000),
          colorA: [0.95, 0.32, 0.55],
          colorB: [0.42, 0.12, 0.72],
          sizeMin: 7,
          sizeMax: 30,
          alphaMin: 0.06,
          alphaMax: 0.4,
          mode: 'gas',
          turbulence: 0.9,
        },
        {
          count: this.scaled(5000),
          colorA: [0.55, 0.38, 0.95],
          colorB: [0.22, 0.16, 0.7],
          sizeMin: 6,
          sizeMax: 24,
          alphaMin: 0.05,
          alphaMax: 0.3,
          mode: 'gas',
          turbulence: 0.75,
        },
        {
          count: this.scaled(4200),
          colorA: [0.05, 0.018, 0.03],
          colorB: [0.03, 0.01, 0.025],
          sizeMin: 8,
          sizeMax: 26,
          alphaMin: 0.35,
          alphaMax: 0.85,
          mode: 'dust',
          turbulence: 0.5,
        },
      ],
      starCount: this.scaled(380),
    });
    nebula.group.position.set(...COSMIC_OBJECTS[0].position);
    this.register(COSMIC_OBJECTS[0], nebula.group, nebula);

    // --- THE EMBER RIDGE — orange/amber/crimson molecular ridge ---
    const ridge = new CosmicRegion({
      radius: 130,
      seed: 47.3,
      cavityCount: 8,
      cavityStrength: 0.9,
      columnCount: 2,
      columnWidth: 0.14,
      layers: [
        {
          count: this.scaled(9000),
          colorA: [1.0, 0.48, 0.12],
          colorB: [0.78, 0.14, 0.07],
          sizeMin: 8,
          sizeMax: 34,
          alphaMin: 0.05,
          alphaMax: 0.38,
          mode: 'gas',
          turbulence: 0.85,
        },
        {
          count: this.scaled(5200),
          colorA: [0.98, 0.76, 0.35],
          colorB: [0.58, 0.24, 0.1],
          sizeMin: 6,
          sizeMax: 26,
          alphaMin: 0.04,
          alphaMax: 0.28,
          mode: 'gas',
          turbulence: 0.7,
        },
        {
          count: this.scaled(4600),
          colorA: [0.06, 0.024, 0.018],
          colorB: [0.045, 0.016, 0.012],
          sizeMin: 9,
          sizeMax: 30,
          alphaMin: 0.35,
          alphaMax: 0.85,
          mode: 'dust',
          turbulence: 0.5,
        },
      ],
      starCount: this.scaled(260),
    });
    ridge.group.position.set(...COSMIC_OBJECTS[1].position);
    this.register(COSMIC_OBJECTS[1], ridge.group, ridge);

    // --- PILLAR VEIL — dark molecular columns with faint red edges ---
    const pillars = new CosmicRegion({
      radius: 65,
      seed: 83.9,
      cavityCount: 3,
      cavityStrength: 0.6,
      columnCount: 5,
      columnWidth: 0.15,
      layers: [
        {
          count: this.scaled(3400),
          colorA: [0.5, 0.1, 0.12],
          colorB: [0.85, 0.2, 0.18],
          sizeMin: 5,
          sizeMax: 18,
          alphaMin: 0.05,
          alphaMax: 0.3,
          mode: 'gas',
          turbulence: 0.55,
        },
        {
          count: this.scaled(4200),
          colorA: [0.05, 0.045, 0.06],
          colorB: [0.02, 0.03, 0.05],
          sizeMin: 6,
          sizeMax: 20,
          alphaMin: 0.4,
          alphaMax: 0.9,
          mode: 'dust',
          turbulence: 0.4,
        },
        {
          count: this.scaled(3000),
          colorA: [0.035, 0.06, 0.055],
          colorB: [0.02, 0.04, 0.04],
          sizeMin: 5,
          sizeMax: 16,
          alphaMin: 0.3,
          alphaMax: 0.7,
          mode: 'dust',
          turbulence: 0.45,
        },
      ],
      starCount: this.scaled(120),
    });
    pillars.group.position.set(...COSMIC_OBJECTS[2].position);
    this.register(COSMIC_OBJECTS[2], pillars.group, pillars);

    // --- PULSAR X-9 — rotating neutron star lighthouse ---
    const pulsar = new Pulsar(1.0);
    pulsar.group.position.set(...COSMIC_OBJECTS[3].position);
    this.register(COSMIC_OBJECTS[3], pulsar.group, pulsar);

    // --- BINARY COLLISION — merging black-hole pair ---
    const merger = new BlackHoleBinary(1.0);
    merger.onMerger = () => {
      if (this.onMerger) this.onMerger();
    };
    merger.group.position.set(...COSMIC_OBJECTS[4].position);
    this.register(COSMIC_OBJECTS[4], merger.group, merger);
  }

  private register(config: CosmicObjectConfig, group: THREE.Group, impl: CosmicObject) {
    group.position.set(...config.position);
    this.group.add(group);
    this.objects.set(config.id, { config, object: impl });
    impl.setPixelRatio(this.dpr);
  }

  public update(time: number, delta: number, camPos: THREE.Vector3) {
    for (const entry of this.objects.values()) {
      const { config, object } = entry;
      object.update(time, delta, camPos);

      // Distance-based LOD: far objects stay faint (discoverable), dense
      // detail only resolves near the camera.
      const dist = camPos.distanceTo(object.group.position);
      const fade = THREE.MathUtils.clamp(1.45 - dist / (config.boundingRadius * 3.0), 0.1, 1.0);
      object.setIntensity(fade);
    }
  }

  public getObject(id: string): CosmicObject | undefined {
    return this.objects.get(id)?.object;
  }

  public getClosestDetected(camPos: THREE.Vector3): { config: CosmicObjectConfig; distance: number } | null {
    let closest: CosmicObjectConfig | null = null;
    let closestDist = Infinity;
    for (const entry of this.objects.values()) {
      const { config, object } = entry;
      const dist = camPos.distanceTo(object.group.position);
      if (dist < config.detectionRadius && dist < closestDist) {
        closest = config;
        closestDist = dist;
      }
    }
    return closest ? { config: closest, distance: closestDist } : null;
  }

  public getHit(ray: THREE.Ray): CosmicObjectConfig | null {
    let closest: CosmicObjectConfig | null = null;
    let closestDist = Infinity;
    for (const entry of this.objects.values()) {
      const { config, object } = entry;
      const dist = ray.distanceToPoint(object.group.position);
      const hitRadius = config.boundingRadius * 0.85;
      if (dist < hitRadius && dist < closestDist) {
        closest = config;
        closestDist = dist;
      }
    }
    return closest;
  }

  public setQualityTier(tier: QualityTier) {
    this.tierFactor = TIER_FACTOR[tier];
    this.rebuild();
  }

  public setPixelRatio(dpr: number) {
    this.dpr = dpr;
    for (const entry of this.objects.values()) {
      entry.object.setPixelRatio(dpr);
    }
  }

  public getParticleCount(): number {
    let total = 0;
    for (const entry of this.objects.values()) {
      total += entry.object.getParticleCount();
    }
    return total;
  }

  public dispose() {
    for (const entry of this.objects.values()) entry.object.dispose();
    this.objects.clear();
  }
}