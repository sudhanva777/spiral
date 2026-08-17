export type PlanetType =
  | 'earth-like'
  | 'hot-lava'
  | 'ice'
  | 'gas-giant'
  | 'ringed-giant'
  | 'ocean'
  | 'dark-banded'
  | 'dense-atmosphere'
  | 'rocky';

export interface RingConfig {
  innerRadius: number;
  outerRadius: number;
  color1: string;
  color2: string;
  opacity: number;
}

export interface PlanetConfig {
  id: string;
  name: string;
  type: PlanetType;
  subtitle: string;
  description: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number; // Angular speed (rad/s), inner faster than outer
  orbitEccentricity?: number; // 0 = circular, > 0 = elliptical
  orbitInclination?: number; // Tilt of orbit plane in radians
  orbitPhase?: number; // Starting phase angle
  rotationSpeed: number; // Axial rotation speed
  axialTilt: number; // Axial tilt in radians
  cloudRotationSpeed?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  atmosphereColor?: string;
  hasAtmosphere?: boolean;
  atmosphereThickness?: number;
  hasClouds?: boolean;
  rings?: RingConfig;
}

export interface StarConfig {
  id: string;
  name: string;
  spectralType: string;
  apparentRadius: number;
  coreColor: string;
  coronaColor: string;
  glowColor: string;
  flareColor: string;
  pulseSpeed: number;
  coronaIntensity: number;
  plasmaParticlesCount?: number;
}

export interface StarSystemConfig {
  id: string;
  name: string;
  designation: string;
  description: string;
  galaxyId: string;
  positionInGalaxy: [number, number, number]; // Embedded within spiral arm / starfield
  star: StarConfig;
  planets: PlanetConfig[];
  systemRadius: number;
}

export type StarSystemLOD = 'GALAXY_POINT' | 'STAR_PROMINENT' | 'STAR_CORONA' | 'SYSTEM_ORBITS' | 'PLANET_CLOSE';

export interface ActiveSystemFocus {
  systemId: string;
  planetId?: string | null;
  lod: StarSystemLOD;
}
