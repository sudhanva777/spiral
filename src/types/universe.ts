export interface GalaxyPalette {
  core: string;
  coreHalo: string;
  inner: string;
  deep: string;
  armsPrimary: string;
  armsSecondary: string;
  armsTertiary: string;
  dust: string;
  dustSecondary: string;
  starFormation: string;
  starFormationWarm: string;
  ambientStars: string[];
}

export interface BlackHolePalette {
  horizonRim: string;
  photonRing: string;
  accretionInner: string;
  accretionMid: string;
  accretionOuter: string;
  infallStream: string;
}

export interface BlackHoleConfig {
  eventHorizonRadius: number;
  photonRingRadius: number;
  accretionInnerRadius: number;
  accretionOuterRadius: number;
  diskTilt: [number, number, number];
  rotationSpeed: number;
  infallRate: number;
  turbulence: number;
  lensingStrength: number;
  palette: BlackHolePalette;
}

export type GalaxyGroupId = 'groupA' | 'groupB' | 'groupC' | 'groupD' | 'groupE';

export interface GalaxyGroupInfo {
  id: GalaxyGroupId;
  name: string;
  designation: string;
  center: [number, number, number];
  description: string;
  galaxyIds: string[];
}

export interface GalaxyMorphology {
  type:
    | 'barred-spiral'
    | 'flocculent-ring'
    | 'emerald-multi-arm'
    | 'golden-dark-barred'
    | 'turbulent-crimson'
    | 'massive-energy-spiral'
    | 'ring-spiral'
    | 'flocculent-asymmetric'
    | 'dense-elliptical'
    | 'thin-spiral'
    | 'asymmetric-broken'
    | 'multi-arm-grand'
    | 'grand-design'
    | 'elliptical'
    | 'ic1579-emerald-spiral';
  armCount: number;
  asymmetry: number;
  barStrength: number;
  ringStrength: number;
  diskFlattening: number;
  coreDensity: number;
  dustDensity: number;
  verticalThickness?: number;
  starFormationDensity?: number;
  spiralTightness: number;
  darkLaneStrength?: number;
  voidStrength?: number;
}

export interface GalaxyConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  type: string;
  groupId: GalaxyGroupId;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
  turbulence: number;
  boundingRadius?: number;
  specialEffect?: 'energy-jets' | null;
  hasBlackHole?: boolean;
  blackHoleConfig?: BlackHoleConfig;
  palette: GalaxyPalette;
  morphology: GalaxyMorphology;
  isSpecialGalaxy?: boolean; // IC 1579 designation
}

export type ScaleLevel =
  | 'COSMOS'
  | 'GALAXY'
  | 'STELLAR'
  | 'PLANETARY'
  | 'ATMOSPHERE'
  | 'SURFACE'
  | 'NIGHT_SKY';

/**
 * Explicit navigation state separating the AETHER cosmic overview
 * from IC 1579 (the destination galaxy) and every depth inside it.
 * AETHER = the space between destinations. IC 1579 = the destination.
 */
export type NavigationMode =
  | 'AETHER' // Deep-space overview between galaxies
  | 'IC1579_APPROACH' // Cinematic flight toward the distant galaxy
  | 'IC1579_GALAXY' // Outside IC 1579, seeing it as an object
  | 'IC1579_STELLAR' // Inside the galaxy, between its stars
  | 'IC1579_SYSTEM' // Inside a star system within IC 1579
  | 'IC1579_PLANET' // Orbiting a planet/moon within IC 1579
  | 'IC1579_SURFACE'; // Landed on a surface, night sky = IC 1579

export interface SurfaceState {
  isLanded: boolean;
  timeOfDay: number; // 0.0 to 1.0 (0=Midnight, 0.25=Sunrise, 0.5=Noon, 0.75=Sunset)
  lookingAtSky: boolean;
  altitude: number; // 0.0 (ground) to 1.0 (upper atmosphere)
}

export interface UniverseState {
  activeGalaxyId: string;
  isNavigating: boolean;
  distanceToActive: number;
  activeBlackHole?: boolean;
  detectedBlackHole?: boolean;
  blackHoleDistance?: number;
  activeSystemId?: string | null;
  activePlanetId?: string | null;
  activeMoonId?: string | null;
  detectedSystemId?: string | null;
  detectedSystemName?: string | null;
  timeScale?: number;
  scaleLevel?: ScaleLevel;
  navigationMode?: NavigationMode;
  surfaceState?: SurfaceState;
  discoveredFeatures?: string[];
  activeDiscoveryTag?: string | null;
}
