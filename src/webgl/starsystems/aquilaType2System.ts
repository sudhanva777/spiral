import type { StarSystemConfig } from '../../types/starSystem';
import {
  AQUILA_GALAXY_ID,
  AQUILA_TYPE2_SYSTEM_ID,
  AQUILA_TYPE2_STAR_ID,
  TYPE2_PLANET_ID,
} from '../../worlds/worldRegistry';

// ============================================================================
// AQUILA — TYPE-II STAR SYSTEM
//
// The astronomical-scale representation of the destination that hosts the
// external Type-II world. The Galaxy Explorer owns everything down to orbit;
// the planetary surface, atmosphere detail and the New Hospet megacity live
// in the external Type-II application.
//
// The planet intentionally has NO surfaceExplore / surfaceCivilization:
// the engine only presents it as a legitimate astronomical destination with
// a glowing civilization footprint visible from orbit.
// ============================================================================

export const AQUILA_TYPE2_SYSTEM: StarSystemConfig = {
  id: AQUILA_TYPE2_SYSTEM_ID,
  name: 'Aquila Type-II System',
  designation: 'AQUILA // TYPE-II SYSTEM 01',
  description:
    'A warm gold-white G-type star at the heart of the Aquila galaxy, hosting a single inhabited world — TYPE2-PLANET-001, the astronomical anchor of the external Type-II civilization world of New Hospet. From orbit the planet shows a planetary megacity footprint: golden night lights across the nightside and a dense artificial glow at the terminator. Surface entry hands off to the external Type-II world.',
  galaxyId: AQUILA_GALAXY_ID,
  positionInGalaxy: [4.5, 0.3, -6.2],
  systemRadius: 6.5,
  star: {
    id: AQUILA_TYPE2_STAR_ID,
    name: 'Aquila Type-II Star',
    spectralType: 'G3-V • Warm White-Gold Sun',
    apparentRadius: 0.85,
    coreColor: '#FFFDF2',
    coronaColor: '#FFE9C4',
    glowColor: '#FFD27E',
    flareColor: '#FFF3D6',
    pulseSpeed: 0.85,
    coronaIntensity: 1.7,
    plasmaParticlesCount: 260,
  },
  planets: [
    {
      id: TYPE2_PLANET_ID,
      name: 'New Hospet',
      type: 'earth-like',
      subtitle: 'Type-II Civilization World',
      description:
        'A warm habitable world beneath a thin breathable atmosphere, its nightside lit by the planetary megacity New Hospet. Astronomical representation only — the detailed Type-II world is hosted externally.',
      radius: 0.11,
      orbitRadius: 2.5,
      orbitSpeed: 0.6,
      orbitEccentricity: 0.01,
      orbitInclination: 0.02,
      orbitPhase: 1.3,
      rotationSpeed: 0.22,
      axialTilt: 0.28,
      cloudRotationSpeed: 0.3,
      primaryColor: '#1A4E6E',
      secondaryColor: '#5E8A5C',
      accentColor: '#C8A45C',
      atmosphereColor: '#7EC8F2',
      hasAtmosphere: true,
      atmosphereThickness: 0.026,
      hasClouds: true,
      // Minimal visual identity used ONLY for the orbit-level night lights —
      // no in-engine surface, no civilization simulation (external world).
      cityTheme: {
        name: 'New Hospet',
        ground: '#0C1016',
        street: '#1E2A38',
        park: '#16281E',
        plaza: '#1A2330',
        window: '#FFD9A0',
        glow: '#FFC97A',
        shadow: '#04070B',
        light: '#FFF4E0',
        accent: '#7FE8D8',
      },
      // WORLD BRIDGE: this planet is the astronomical anchor of the external
      // Type-II world registered in the world registry.
      externalWorldId: 'NEW-HOSPET-001',
    },
  ],
};