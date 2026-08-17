import type { GalaxyConfig, GalaxyPalette, GalaxyMorphology } from '../../types/universe';

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
  palette: GALAXY_01_PALETTE,
  morphology: GALAXY_01_MORPHOLOGY,
};

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
  position: [240, 35, -300], // Deep space position (approx 385 AU distance from Galaxy 01)
  rotation: [-0.25, 0.45, 0.15],
  scale: 1.05,
  speed: 0.32,
  turbulence: 0.95,
  palette: GALAXY_02_PALETTE,
  morphology: GALAXY_02_MORPHOLOGY,
};

export const UNIVERSE_GALAXIES: GalaxyConfig[] = [
  GALAXY_01_CONFIG,
  GALAXY_02_CONFIG,
];

export function getGalaxyConfigById(id: string): GalaxyConfig {
  const found = UNIVERSE_GALAXIES.find((g) => g.id === id);
  return found || GALAXY_01_CONFIG;
}
