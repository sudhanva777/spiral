import * as THREE from 'three';
import type { StarSystemConfig, StarSystemLOD, PlanetConfig } from '../../types/starSystem';
import { StarMesh } from './StarMesh';
import { PlanetMesh } from './PlanetMesh';
import { OrbitLine } from './OrbitLine';

export class StarSystemInstance {
  public config: StarSystemConfig;
  public group: THREE.Group;
  public starMesh: StarMesh;
  public planets: PlanetMesh[] = [];
  public orbitLines: OrbitLine[] = [];
  public planetOrbitGroups: THREE.Group[] = [];

  public currentLOD: StarSystemLOD = 'GALAXY_POINT';
  public currentDistanceToCamera = 999.0;
  public worldPosition = new THREE.Vector3();
  private starWorldPosition = new THREE.Vector3();

  // Raycasting helper sphere for easy clicking/selecting from galaxy view
  public hitSphere: THREE.Mesh;

  constructor(config: StarSystemConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.set(...config.positionInGalaxy);

    // 1. Star
    this.starMesh = new StarMesh(config.star);
    this.group.add(this.starMesh.group);

    // 2. Planets & Orbits
    config.planets.forEach((planetConfig) => {
      // Orbit Line
      const orbitLine = new OrbitLine(planetConfig);
      this.orbitLines.push(orbitLine);
      this.group.add(orbitLine.line);

      // Planet Orbit Holder Group (Handles inclination and orbital rotation)
      const orbitGroup = new THREE.Group();
      if (planetConfig.orbitInclination) {
        orbitGroup.rotation.x = planetConfig.orbitInclination;
      }
      this.group.add(orbitGroup);
      this.planetOrbitGroups.push(orbitGroup);

      // Planet Mesh
      const planetMesh = new PlanetMesh(planetConfig);
      this.planets.push(planetMesh);
      orbitGroup.add(planetMesh.group);
    });

    // 3. Selection Hit Sphere (Invisible, used for raycasting from distance)
    const hitRadius = Math.max(config.star.apparentRadius * 2.5, 1.8);
    const hitGeom = new THREE.SphereGeometry(hitRadius, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitSphere = new THREE.Mesh(hitGeom, hitMat);
    this.hitSphere.userData = { isStarSystem: true, systemId: config.id };
    this.group.add(this.hitSphere);
  }

  public update(time: number, camera: THREE.Camera) {
    this.group.getWorldPosition(this.worldPosition);
    this.starMesh.group.getWorldPosition(this.starWorldPosition);
    this.currentDistanceToCamera = this.worldPosition.distanceTo(camera.position);

    // Dynamic LOD Evaluation
    if (this.currentDistanceToCamera > 55.0) {
      this.currentLOD = 'GALAXY_POINT';
    } else if (this.currentDistanceToCamera > 22.0) {
      this.currentLOD = 'STAR_PROMINENT';
    } else if (this.currentDistanceToCamera > 8.0) {
      this.currentLOD = 'STAR_CORONA';
    } else if (this.currentDistanceToCamera > 2.0) {
      this.currentLOD = 'SYSTEM_ORBITS';
    } else {
      this.currentLOD = 'PLANET_CLOSE';
    }

    const showPlanets = this.currentDistanceToCamera < 40.0;
    const orbitAlpha = Math.max(0, Math.min(1, (30.0 - this.currentDistanceToCamera) / 18.0)) * 0.18;

    // Update Star
    this.starMesh.update(time, camera);

    // Update Planets & Orbits
    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      const pConfig = planet.config;
      const orbitLine = this.orbitLines[i];

      orbitLine.setOpacity(orbitAlpha);
      orbitLine.line.visible = showPlanets;
      planet.group.visible = showPlanets;

      if (showPlanets) {
        // Keplerian Orbital Equation
        const a = pConfig.orbitRadius;
        const e = pConfig.orbitEccentricity || 0.0;
        const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
        const c = a * e;

        const meanAnomaly = (pConfig.orbitPhase || 0) + time * pConfig.orbitSpeed * 0.45;
        const posX = Math.cos(meanAnomaly) * a - c;
        const posZ = Math.sin(meanAnomaly) * b;

        planet.group.position.set(posX, 0, posZ);
        planet.update(time, this.starWorldPosition);
      }
    }
  }

  public getPlanetPositionWorld(planetId: string): THREE.Vector3 | null {
    const idx = this.planets.findIndex((p) => p.config.id === planetId);
    if (idx === -1) return null;
    const target = new THREE.Vector3();
    this.planets[idx].group.getWorldPosition(target);
    return target;
  }

  public getPlanetConfig(planetId: string): PlanetConfig | undefined {
    const planet = this.planets.find((p) => p.config.id === planetId);
    return planet ? planet.config : undefined;
  }

  public dispose() {
    this.starMesh.dispose();
    this.planets.forEach((p) => p.dispose());
    this.orbitLines.forEach((o) => o.dispose());
    this.hitSphere.geometry.dispose();
    (this.hitSphere.material as THREE.Material).dispose();
  }
}
