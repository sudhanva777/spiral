import * as THREE from 'three';
import type { PlanetConfig } from '../../../types/starSystem';

// Canonical GEMINI city directions, expressed in planet model space
// (axialGroup / axialTilt space — the same space the planet surface shader
// samples). The surface civilization module and both shader layers
// (orbit night lights, horizon glows) read from this single source.
export const GEMINI_CITY_DIRS: THREE.Vector3[] = [
  new THREE.Vector3(0.55, 0.18, 0.82).normalize(),   // 0 EMERIA — capital
  new THREE.Vector3(0.82, -0.22, -0.5).normalize(),  // 1 Port Veridian
  new THREE.Vector3(-0.65, 0.3, 0.7).normalize(),    // 2 Ridgefall
  new THREE.Vector3(-0.35, -0.55, -0.75).normalize(),// 3 Halcyon
  new THREE.Vector3(0.1, -0.6, 0.8).normalize(),     // 4 Emberfell
];

export const EMERIA_CITY_INDEX = 0;

// ---------------------------------------------------------------------------
// Config-driven city accessors. Planets may declare their own city directions
// and capital index (AERTHELGARD: New Hospet); when omitted, the classic
// GEMINI layout is used so every layer stays in sync from one source.
// ---------------------------------------------------------------------------

export function getCityDirsForPlanet(config: PlanetConfig): THREE.Vector3[] {
  if (config.cityDirs && config.cityDirs.length > 0) {
    return config.cityDirs.map((d) => new THREE.Vector3(d[0], d[1], d[2]).normalize());
  }
  return GEMINI_CITY_DIRS;
}

export function getCapitalCityIndex(config: PlanetConfig): number {
  return config.cityCapitalIndex ?? EMERIA_CITY_INDEX;
}

export function getCapitalCityDir(config: PlanetConfig): THREE.Vector3 {
  return getCityDirsForPlanet(config)[getCapitalCityIndex(config)];
}
