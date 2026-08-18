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

export interface MoonConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number; // Angular speed (rad/s) around planet
  orbitEccentricity?: number;
  orbitInclination?: number;
  orbitPhase?: number;
  rotationSpeed: number;
  primaryColor: string;
  secondaryColor: string;
  craterDensity?: number;
  isVolcanic?: boolean;
  isIcy?: boolean;
}

export interface AsteroidBeltConfig {
  id: string;
  name: string;
  innerRadius: number;
  outerRadius: number;
  count: number;
  height: number;
  baseColor: string;
  accentColor: string;
  orbitSpeed: number;
  inclination?: number;
}

// ============================================================================
// IC 1579 DEEP EXPLORATION EXTENSIONS
// ============================================================================

// Dyson-style swarm of orbital energy collectors around a star.
export interface DysonSwarmConfig {
  id: string;
  name: string;
  innerRadius: number;
  outerRadius: number;
  collectorCount: number;
  panelColor: string;
  glowColor: string;
  orbitTilt: [number, number, number];
  rotationSpeed: number;
  thermalGlow: number;
}

// 4D-inspired tesseract projection world (mathematically coherent projections,
// not a literal fourth spatial dimension).
export interface TesseractConfig {
  projectionScale: number;
  color: string;
  secondaryColor: string;
  rotationSpeed: number;
  anomalyStrength: number;
}

export type StarSystemDiscoveryTag =
  | 'flagship'
  | 'dyson'
  | 'tesseract'
  | 'sentinel'
  | 'halo-remnant'
  | 'core-vicinity'
  | null;

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
  moons?: MoonConfig[];
  hasLocalAsteroids?: boolean;
  localAsteroidCount?: number;
  // IC 1579: tesseract-projection anomaly world
  tesseract?: TesseractConfig;
  // IC 1579: flagship world receiving the deepest surface experience
  isFlagship?: boolean;
  // IC 1579: planet supports atmospheric descent / surface exploration
  surfaceExplore?: boolean;
  // GEMINI: surface gravity in m/s² (≈1.62 = Moon-like). Omit → existing
  // free-walk surface behaviour with no jumping.
  surfaceGravity?: number;
  // GEMINI: jump apex height in meters (low-gravity worlds only)
  surfaceJumpHeight?: number;
  // GEMINI: full day/night rotation length in sim-seconds (20 min = 1200)
  surfaceDayLength?: number;
  // GEMINI: scattered vegetation instances (omit → no vegetation, as today)
  surfaceVegetationCount?: number;
  // GEMINI: camera height above terrain in planet radii (0.02 = legacy
  // stylized view; ≈0.0019 = ~1.7 m human eye at GEMINI's scale)
  surfaceCameraHeight?: number;
  // GEMINI: comfortable walk speed in meters/second (legacy worlds keep the
  // fast planet-radii walk)
  surfaceWalkSpeed?: number;
  // GEMINI: render the living civilization — orbit night lights, horizon
  // city glows, and the capital with NPCs, robots and air traffic
  surfaceCivilization?: boolean;
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
  asteroidBelt?: AsteroidBeltConfig;
  // IC 1579: Dyson swarm megastructure orbiting this star
  dysonSwarm?: DysonSwarmConfig;
  // IC 1579: discovery classification surfaced in the HUD
  discoveryTag?: StarSystemDiscoveryTag;
  discoveryTitle?: string;
}

export type StarSystemLOD =
  | 'GALAXY_POINT'
  | 'STAR_PROMINENT'
  | 'STAR_CORONA'
  | 'SYSTEM_ORBITS'
  | 'PLANET_CLOSE'
  | 'MOON_CLOSE'
  | 'SURFACE_CLOSE';

export interface ActiveSystemFocus {
  systemId: string;
  planetId?: string | null;
  moonId?: string | null;
  lod: StarSystemLOD;
}
