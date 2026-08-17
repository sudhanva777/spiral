import type { GalaxyConfig, GalaxyPalette, GalaxyMorphology, BlackHoleConfig } from '../../types/universe';

// ============================================================================
// GALAXY 01 — AETHER PRIME (Reference Quality Baseline — No Black Hole)
// ============================================================================
export const GALAXY_01_PALETTE: GalaxyPalette = {
  core: '#FFF8FF',
  coreHalo: '#A8F0FF',
  inner: '#22B3E0',
  deep: '#0B5394',
  armsPrimary: '#FF75C8',
  armsSecondary: '#D75CFF',
  armsTertiary: '#8B55FF',
  dust: '#0F6B4F',
  dustSecondary: '#1E9080',
  starFormation: '#FF7B30',
  starFormationWarm: '#FFB347',
  ambientStars: ['#FFFFFF', '#7EC8E3', '#FF6B6B'],
};

export const GALAXY_01_MORPHOLOGY: GalaxyMorphology = {
  type: 'barred-spiral',
  armCount: 2,
  asymmetry: 0.2,
  barStrength: 0.8,
  ringStrength: 0.0,
  diskFlattening: 0.65,
  coreDensity: 1.0,
  dustDensity: 0.8,
  verticalThickness: 1.0,
  starFormationDensity: 1.0,
  spiralTightness: 3.2,
};

export const GALAXY_01_CONFIG: GalaxyConfig = {
  id: 'galaxy01',
  name: 'Aether Prime',
  subtitle: 'Barred Spiral • Accretion Vortex',
  description: 'Grand-design barred spiral with cyan-blue relativistic ion streams and emerald outer dust halo.',
  type: 'barred-spiral',
  position: [0, 0, 0],
  rotation: [0.08, 0, 0],
  scale: 1.0,
  speed: 0.28,
  turbulence: 0.8,
  boundingRadius: 42.0,
  hasBlackHole: false, // Preserved baseline reference
  palette: GALAXY_01_PALETTE,
  morphology: GALAXY_01_MORPHOLOGY,
};

// ============================================================================
// GALAXY 02 — IGNIS VESPER (Flocculent Ringed Spiral + Supermassive Black Hole)
// ============================================================================
export const GALAXY_02_PALETTE: GalaxyPalette = {
  core: '#FFF4D6',
  coreHalo: '#FFD27A',
  inner: '#FFB84D',
  deep: '#C45A17',
  armsPrimary: '#D946EF',
  armsSecondary: '#8B5CF6',
  armsTertiary: '#4C1D95',
  dust: '#7F1D1D',
  dustSecondary: '#581C1C',
  starFormation: '#FF5E78',
  starFormationWarm: '#FFD166',
  ambientStars: ['#FFF4D6', '#D8B4FE', '#FFB4A2'],
};

export const GALAXY_02_MORPHOLOGY: GalaxyMorphology = {
  type: 'flocculent-ring',
  armCount: 3,
  asymmetry: 0.65,
  barStrength: 0.0,
  ringStrength: 0.7,
  diskFlattening: 0.55,
  coreDensity: 0.8,
  dustDensity: 1.1,
  verticalThickness: 1.35,
  starFormationDensity: 1.25,
  spiralTightness: 3.6,
};

export const GALAXY_02_BLACK_HOLE: BlackHoleConfig = {
  eventHorizonRadius: 0.95,
  photonRingRadius: 1.45,
  accretionInnerRadius: 1.6,
  accretionOuterRadius: 7.5,
  diskTilt: [0.35, 0.15, -0.2],
  rotationSpeed: 1.8,
  infallRate: 1.2,
  turbulence: 0.9,
  lensingStrength: 1.0,
  palette: {
    horizonRim: '#FFD27A',
    photonRing: '#FFF4D6',
    accretionInner: '#FFB84D',
    accretionMid: '#C45A17',
    accretionOuter: '#7F1D1D',
    infallStream: '#FF5E78',
  },
};

export const GALAXY_02_CONFIG: GalaxyConfig = {
  id: 'galaxy02',
  name: 'Ignis Vesper',
  subtitle: 'Flocculent Ring • Golden Singularity',
  description: 'Asymmetric ringed flocculent spiral hosting a supermassive black hole with warm golden accretion disk and deep burgundy dust.',
  type: 'flocculent-ring',
  position: [185, -15, 210],
  rotation: [-0.25, 0.45, 0.15],
  scale: 1.05,
  speed: 0.32,
  turbulence: 0.95,
  boundingRadius: 45.0,
  hasBlackHole: true,
  blackHoleConfig: GALAXY_02_BLACK_HOLE,
  palette: GALAXY_02_PALETTE,
  morphology: GALAXY_02_MORPHOLOGY,
};

// ============================================================================
// GALAXY 03 — VERDANT (Emerald Deep + Teal Supermassive Black Hole)
// ============================================================================
export const GALAXY_03_PALETTE: GalaxyPalette = {
  core: '#F5FFF8',
  coreHalo: '#D8FFE8',
  inner: '#8FFFC1',
  deep: '#28C7A5',
  armsPrimary: '#0FA66B',
  armsSecondary: '#075C3D',
  armsTertiary: '#063B2A',
  dust: '#04281C',
  dustSecondary: '#0E4E38',
  starFormation: '#A7FF5A',
  starFormationWarm: '#E7FFB0',
  ambientStars: ['#D8FFE8', '#8FFFC1', '#55FFD0'],
};

export const GALAXY_03_MORPHOLOGY: GalaxyMorphology = {
  type: 'emerald-multi-arm',
  armCount: 3,
  asymmetry: 0.45,
  barStrength: 0.2,
  ringStrength: 0.3,
  diskFlattening: 0.45,
  coreDensity: 1.1,
  dustDensity: 1.3,
  verticalThickness: 1.6,
  starFormationDensity: 1.4,
  spiralTightness: 3.8,
};

export const GALAXY_03_BLACK_HOLE: BlackHoleConfig = {
  eventHorizonRadius: 1.05,
  photonRingRadius: 1.55,
  accretionInnerRadius: 1.7,
  accretionOuterRadius: 8.2,
  diskTilt: [-0.2, 0.3, 0.1],
  rotationSpeed: 2.1,
  infallRate: 1.35,
  turbulence: 0.85,
  lensingStrength: 1.1,
  palette: {
    horizonRim: '#D8FFE8',
    photonRing: '#F5FFF8',
    accretionInner: '#8FFFC1',
    accretionMid: '#28C7A5',
    accretionOuter: '#075C3D',
    infallStream: '#A7FF5A',
  },
};

export const GALAXY_03_CONFIG: GalaxyConfig = {
  id: 'galaxy03',
  name: 'Verdant',
  subtitle: 'Emerald Deep • Teal Singularity',
  description: 'Deep volumetric emerald spiral with 3 major arms, layered dark green dust, and a living teal supermassive black hole.',
  type: 'emerald-multi-arm',
  position: [-135, 18, -80],
  rotation: [0.18, -0.35, -0.12],
  scale: 1.1,
  speed: 0.26,
  turbulence: 0.85,
  boundingRadius: 46.0,
  hasBlackHole: true,
  blackHoleConfig: GALAXY_03_BLACK_HOLE,
  palette: GALAXY_03_PALETTE,
  morphology: GALAXY_03_MORPHOLOGY,
};

// ============================================================================
// GALAXY 04 — ECLIPSE (Golden Eclipse + High-Contrast Black Hole)
// ============================================================================
export const GALAXY_04_PALETTE: GalaxyPalette = {
  core: '#FFF4C2',
  coreHalo: '#FFD966',
  inner: '#F2C94C',
  deep: '#C69214',
  armsPrimary: '#FF9F1C',
  armsSecondary: '#76500B',
  armsTertiary: '#3A2108',
  dust: '#020202',
  dustSecondary: '#140C04',
  starFormation: '#FFD966',
  starFormationWarm: '#FFAE33',
  ambientStars: ['#FFF4C2', '#F2C94C', '#FF9F1C'],
};

export const GALAXY_04_MORPHOLOGY: GalaxyMorphology = {
  type: 'golden-dark-barred',
  armCount: 2,
  asymmetry: 0.55,
  barStrength: 1.1,
  ringStrength: 0.0,
  diskFlattening: 0.6,
  coreDensity: 1.3,
  dustDensity: 1.25,
  verticalThickness: 1.2,
  starFormationDensity: 1.1,
  spiralTightness: 3.0,
  darkLaneStrength: 1.4,
  voidStrength: 0.8,
};

export const GALAXY_04_BLACK_HOLE: BlackHoleConfig = {
  eventHorizonRadius: 1.15,
  photonRingRadius: 1.65,
  accretionInnerRadius: 1.8,
  accretionOuterRadius: 9.0,
  diskTilt: [0.4, -0.25, 0.3],
  rotationSpeed: 2.4,
  infallRate: 1.5,
  turbulence: 1.0,
  lensingStrength: 1.2,
  palette: {
    horizonRim: '#FFD966',
    photonRing: '#FFF4C2',
    accretionInner: '#F2C94C',
    accretionMid: '#C69214',
    accretionOuter: '#3A2108',
    infallStream: '#FFAE33',
  },
};

export const GALAXY_04_CONFIG: GalaxyConfig = {
  id: 'galaxy04',
  name: 'Eclipse',
  subtitle: 'Golden Eclipse • Relativistic Horizon',
  description: 'Ancient thick barred spiral featuring an elongated golden bar, high-contrast black dust voids, and an intense amber supermassive black hole.',
  type: 'golden-dark-barred',
  position: [-45, 42, -210],
  rotation: [0.35, 0.2, -0.4],
  scale: 1.15,
  speed: 0.34,
  turbulence: 0.9,
  boundingRadius: 48.0,
  hasBlackHole: true,
  blackHoleConfig: GALAXY_04_BLACK_HOLE,
  palette: GALAXY_04_PALETTE,
  morphology: GALAXY_04_MORPHOLOGY,
};

// ============================================================================
// GALAXY 05 — RED VEIL (Death Red + Violent Crimson Singularity)
// ============================================================================
export const GALAXY_05_PALETTE: GalaxyPalette = {
  core: '#FFF1DC',
  coreHalo: '#FF9E2C',
  inner: '#FF6B1A',
  deep: '#FF304F',
  armsPrimary: '#D71932',
  armsSecondary: '#9E1020',
  armsTertiary: '#56000D',
  dust: '#260006',
  dustSecondary: '#090000',
  starFormation: '#FF304F',
  starFormationWarm: '#FF6B1A',
  ambientStars: ['#FFF1DC', '#FF6B1A', '#FF304F'],
};

export const GALAXY_05_MORPHOLOGY: GalaxyMorphology = {
  type: 'turbulent-crimson',
  armCount: 3,
  asymmetry: 0.75,
  barStrength: 0.3,
  ringStrength: 0.2,
  diskFlattening: 0.5,
  coreDensity: 1.2,
  dustDensity: 1.35,
  verticalThickness: 1.45,
  starFormationDensity: 1.5,
  spiralTightness: 3.5,
};

export const GALAXY_05_BLACK_HOLE: BlackHoleConfig = {
  eventHorizonRadius: 1.10,
  photonRingRadius: 1.60,
  accretionInnerRadius: 1.75,
  accretionOuterRadius: 8.5,
  diskTilt: [-0.35, -0.15, 0.45],
  rotationSpeed: 2.6,
  infallRate: 1.6,
  turbulence: 1.25,
  lensingStrength: 1.25,
  palette: {
    horizonRim: '#FF9E2C',
    photonRing: '#FFF1DC',
    accretionInner: '#FF6B1A',
    accretionMid: '#FF304F',
    accretionOuter: '#56000D',
    infallStream: '#FF304F',
  },
};

export const GALAXY_05_CONFIG: GalaxyConfig = {
  id: 'galaxy05',
  name: 'Red Veil',
  subtitle: 'Violent Crimson • Plasma Singularity',
  description: 'Dynamically unstable dark crimson galaxy with 2 dominant arms and a violently active red/orange supermassive black hole.',
  type: 'turbulent-crimson',
  position: [95, -25, 90],
  rotation: [-0.3, -0.15, 0.25],
  scale: 1.1,
  speed: 0.38,
  turbulence: 1.15,
  boundingRadius: 47.0,
  hasBlackHole: true,
  blackHoleConfig: GALAXY_05_BLACK_HOLE,
  palette: GALAXY_05_PALETTE,
  morphology: GALAXY_05_MORPHOLOGY,
};

// ============================================================================
// GALAXY 06 — AETHERIS (Celestial Forge — Largest Centerpiece Supermassive Black Hole)
// ============================================================================
export const GALAXY_06_PALETTE: GalaxyPalette = {
  core: '#FFFFFF',
  coreHalo: '#FFF4E6',
  inner: '#B8F5FF',
  deep: '#00D9FF',
  armsPrimary: '#1687FF',
  armsSecondary: '#0B4DFF',
  armsTertiary: '#04142E',
  dust: '#020817',
  dustSecondary: '#0B234A',
  starFormation: '#FF6B1A',
  starFormationWarm: '#FF9A3D',
  ambientStars: ['#FFFFFF', '#B8F5FF', '#FF9A3D', '#FFC857'],
};

export const GALAXY_06_MORPHOLOGY: GalaxyMorphology = {
  type: 'massive-energy-spiral',
  armCount: 4,
  asymmetry: 0.3,
  barStrength: 0.5,
  ringStrength: 0.4,
  diskFlattening: 0.7,
  coreDensity: 1.5,
  dustDensity: 1.2,
  verticalThickness: 1.8,
  starFormationDensity: 1.4,
  spiralTightness: 3.4,
};

export const GALAXY_06_BLACK_HOLE: BlackHoleConfig = {
  eventHorizonRadius: 1.45,
  photonRingRadius: 2.10,
  accretionInnerRadius: 2.3,
  accretionOuterRadius: 12.5,
  diskTilt: [0.15, 0.2, -0.08],
  rotationSpeed: 2.2,
  infallRate: 1.4,
  turbulence: 0.95,
  lensingStrength: 1.4,
  palette: {
    horizonRim: '#B8F5FF',
    photonRing: '#FFFFFF',
    accretionInner: '#00D9FF',
    accretionMid: '#1687FF',
    accretionOuter: '#FF6B1A',
    infallStream: '#FF9A3D',
  },
};

export const GALAXY_06_CONFIG: GalaxyConfig = {
  id: 'galaxy06',
  name: 'Aetheris',
  subtitle: 'Celestial Forge • Supermassive Singularity',
  description: 'The monumental visual centerpiece of the universe — an enormous 4-arm celestial spiral with a central supermassive black hole powering dual relativistic energy beams.',
  type: 'massive-energy-spiral',
  position: [165, 28, -120],
  rotation: [0.12, 0.28, -0.05],
  scale: 1.38,
  speed: 0.30,
  turbulence: 0.88,
  boundingRadius: 62.0,
  specialEffect: 'energy-jets',
  hasBlackHole: true,
  blackHoleConfig: GALAXY_06_BLACK_HOLE,
  palette: GALAXY_06_PALETTE,
  morphology: GALAXY_06_MORPHOLOGY,
};

// ============================================================================
// UNIVERSE REGISTRY — ALL 6 GALAXIES
// ============================================================================
export const UNIVERSE_GALAXIES: GalaxyConfig[] = [
  GALAXY_01_CONFIG,
  GALAXY_02_CONFIG,
  GALAXY_03_CONFIG,
  GALAXY_04_CONFIG,
  GALAXY_05_CONFIG,
  GALAXY_06_CONFIG,
];

export function getGalaxyConfigById(id: string): GalaxyConfig {
  const found = UNIVERSE_GALAXIES.find((g) => g.id === id);
  return found || GALAXY_01_CONFIG;
}
