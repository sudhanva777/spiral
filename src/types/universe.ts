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

export type GalaxyGroupId = 'groupA' | 'groupB' | 'groupC' | 'groupD';

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
    | 'elliptical';
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
}

export interface UniverseState {
  activeGalaxyId: string;
  isNavigating: boolean;
  distanceToActive: number;
  activeBlackHole?: boolean;
  activeSystemId?: string | null;
  activePlanetId?: string | null;
  detectedSystemId?: string | null;
  detectedSystemName?: string | null;
}
