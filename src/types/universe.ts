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

export interface GalaxyMorphology {
  type: 'barred-spiral' | 'flocculent-ring' | 'grand-design' | 'elliptical';
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
}

export interface GalaxyConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  speed: number;
  turbulence: number;
  palette: GalaxyPalette;
  morphology: GalaxyMorphology;
}

export interface UniverseState {
  activeGalaxyId: string;
  isNavigating: boolean;
  distanceToActive: number;
}
