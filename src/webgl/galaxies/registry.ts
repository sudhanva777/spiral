import type { GalaxyConfig, GalaxyPalette, GalaxyMorphology } from '../../types/universe';

// ============================================================================
// GALAXY 01 — AETHER PRIME (Barred Spiral)
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
  palette: GALAXY_01_PALETTE,
  morphology: GALAXY_01_MORPHOLOGY,
};

// ============================================================================
// GALAXY 02 — IGNIS VESPER (Flocculent Ringed Spiral)
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

export const GALAXY_02_CONFIG: GalaxyConfig = {
  id: 'galaxy02',
  name: 'Ignis Vesper',
  subtitle: 'Flocculent Ring • Crimson Nursery',
  description: 'Asymmetric ringed flocculent spiral featuring warm golden nucleus, vivid magenta arms, and deep burgundy dust.',
  type: 'flocculent-ring',
  position: [185, -15, 210],
  rotation: [-0.25, 0.45, 0.15],
  scale: 1.05,
  speed: 0.32,
  turbulence: 0.95,
  boundingRadius: 45.0,
  palette: GALAXY_02_PALETTE,
  morphology: GALAXY_02_MORPHOLOGY,
};

// ============================================================================
// GALAXY 03 — VERDANT (Emerald Deep)
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
  verticalThickness: 1.6, // Deep multi-layered 3D depth profile
  starFormationDensity: 1.4,
  spiralTightness: 3.8,
};

export const GALAXY_03_CONFIG: GalaxyConfig = {
  id: 'galaxy03',
  name: 'Verdant',
  subtitle: 'Emerald Deep • Molecular Nursery',
  description: 'Deep volumetric emerald spiral with 3 major arms, layered dark green dust belts, and luminous lime-green starburst clusters.',
  type: 'emerald-multi-arm',
  position: [-135, 18, -80],
  rotation: [0.18, -0.35, -0.12],
  scale: 1.1,
  speed: 0.26,
  turbulence: 0.85,
  boundingRadius: 46.0,
  palette: GALAXY_03_PALETTE,
  morphology: GALAXY_03_MORPHOLOGY,
};

// ============================================================================
// GALAXY 04 — ECLIPSE (Golden Eclipse)
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
  barStrength: 1.1, // Massive prominent golden bar
  ringStrength: 0.0,
  diskFlattening: 0.6,
  coreDensity: 1.3,
  dustDensity: 1.25,
  verticalThickness: 1.2,
  starFormationDensity: 1.1,
  spiralTightness: 3.0,
  darkLaneStrength: 1.4, // Dark dust belts with high contrast
  voidStrength: 0.8,
};

export const GALAXY_04_CONFIG: GalaxyConfig = {
  id: 'galaxy04',
  name: 'Eclipse',
  subtitle: 'Golden Eclipse • Relativistic Bar',
  description: 'Ancient thick barred spiral characterized by an elongated golden central bar, high-contrast black dust lanes, and amber star streams.',
  type: 'golden-dark-barred',
  position: [-45, 42, -210],
  rotation: [0.35, 0.2, -0.4],
  scale: 1.15,
  speed: 0.34,
  turbulence: 0.9,
  boundingRadius: 48.0,
  palette: GALAXY_04_PALETTE,
  morphology: GALAXY_04_MORPHOLOGY,
};

// ============================================================================
// GALAXY 05 — RED VEIL (Death Red)
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
  asymmetry: 0.75, // High asymmetry
  barStrength: 0.3,
  ringStrength: 0.2,
  diskFlattening: 0.5,
  coreDensity: 1.2,
  dustDensity: 1.35,
  verticalThickness: 1.45,
  starFormationDensity: 1.5, // Violent star-forming hotspots
  spiralTightness: 3.5,
};

export const GALAXY_05_CONFIG: GalaxyConfig = {
  id: 'galaxy05',
  name: 'Red Veil',
  subtitle: 'Violent Crimson • Plasma Tempest',
  description: 'Dynamically unstable dark crimson galaxy with 2 dominant arms, fragmented outer jets, and dense white-hot starburst cavities.',
  type: 'turbulent-crimson',
  position: [95, -25, 90],
  rotation: [-0.3, -0.15, 0.25],
  scale: 1.1,
  speed: 0.38,
  turbulence: 1.15,
  boundingRadius: 47.0,
  palette: GALAXY_05_PALETTE,
  morphology: GALAXY_05_MORPHOLOGY,
};

// ============================================================================
// GALAXY 06 — AETHERIS (Celestial Forge — Largest Centerpiece)
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
  armCount: 4, // 4 grand design spiral arms + secondary branches
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

export const GALAXY_06_CONFIG: GalaxyConfig = {
  id: 'galaxy06',
  name: 'Aetheris',
  subtitle: 'Celestial Forge • Relativistic Jets',
  description: 'The monumental visual centerpiece of the universe — an enormous 4-arm celestial spiral featuring continuous opposing relativistic energy beams.',
  type: 'massive-energy-spiral',
  position: [165, 28, -120],
  rotation: [0.12, 0.28, -0.05],
  scale: 1.38, // Significantly larger visual scale
  speed: 0.30,
  turbulence: 0.88,
  boundingRadius: 62.0,
  specialEffect: 'energy-jets',
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
