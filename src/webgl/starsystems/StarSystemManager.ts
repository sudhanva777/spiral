import * as THREE from 'three';
import type { StarSystemConfig } from '../../types/starSystem';
import { PRIME_GALAXY_STAR_SYSTEMS } from './starSystemRegistry';
import { StarSystemInstance } from './StarSystemInstance';

export class StarSystemManager {
  public group: THREE.Group;
  public systems: Map<string, StarSystemInstance> = new Map();

  constructor(systemConfigs: StarSystemConfig[] = PRIME_GALAXY_STAR_SYSTEMS) {
    this.group = new THREE.Group();

    systemConfigs.forEach((config) => {
      const instance = new StarSystemInstance(config);
      this.systems.set(config.id, instance);
      this.group.add(instance.group);
    });
  }

  public update(time: number, camera: THREE.Camera) {
    this.systems.forEach((system) => {
      system.update(time, camera);
    });
  }

  public getSystem(systemId: string): StarSystemInstance | undefined {
    return this.systems.get(systemId);
  }

  public getClosestSystem(cameraPosition: THREE.Vector3): { system: StarSystemInstance; distance: number } | null {
    let closest: StarSystemInstance | null = null;
    let minDistance = Infinity;

    this.systems.forEach((sys) => {
      const dist = sys.worldPosition.distanceTo(cameraPosition);
      if (dist < minDistance) {
        minDistance = dist;
        closest = sys;
      }
    });

    return closest ? { system: closest, distance: minDistance } : null;
  }

  public findIntersectedSystem(ray: THREE.Ray): StarSystemInstance | null {
    for (const sys of this.systems.values()) {
      const dist = ray.distanceToPoint(sys.worldPosition);
      if (dist < Math.max(sys.config.star.apparentRadius * 2.2, 1.5)) {
        return sys;
      }
    }
    return null;
  }

  public findIntersectedPlanet(
    ray: THREE.Ray,
    systemId: string
  ): { planetId: string; distance: number } | null {
    const sys = this.systems.get(systemId);
    if (!sys) return null;

    let closestPlanetId: string | null = null;
    let closestDist = Infinity;

    const pPos = new THREE.Vector3();
    for (const planet of sys.planets) {
      planet.group.getWorldPosition(pPos);
      const dist = ray.distanceToPoint(pPos);
      const hitRadius = Math.max(planet.config.radius * 2.5, 0.25);
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        closestPlanetId = planet.config.id;
      }
    }

    return closestPlanetId ? { planetId: closestPlanetId, distance: closestDist } : null;
  }

  public dispose() {
    this.systems.forEach((sys) => sys.dispose());
    this.systems.clear();
  }
}
