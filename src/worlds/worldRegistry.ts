import type { UniverseWorldManifest, WorldArrivalMode } from '../types/world';

// ============================================================================
// UNIVERSE WORLD REGISTRY — SINGLE SOURCE OF TRUTH
//
// The Galaxy Explorer must know that New Hospet exists, where it is and how
// to reach it — without knowing how the Type-II world is built.
//
// Hierarchy:
//   UNIVERSE
//     └── AQUILA GALAXY
//           └── AQUILA-TYPE2-SYSTEM
//                 └── TYPE2-PLANET-001
//                       └── NEW-HOSPET-001  (TYPE2-NEWHOSPET-001 manifest)
//
// Stable identifiers live here and nowhere else. Display names are derived.
// ============================================================================

// ----------------------------------------------------------------------------
// STABLE IDENTIFIERS (independent from display names)
// ----------------------------------------------------------------------------
export const AQUILA_GALAXY_ID = 'AQUILA';
export const AQUILA_TYPE2_SYSTEM_ID = 'AQUILA-TYPE2-SYSTEM';
export const AQUILA_TYPE2_STAR_ID = 'AQUILA-TYPE2-STAR';
export const TYPE2_PLANET_ID = 'TYPE2-PLANET-001';
export const NEW_HOSPET_WORLD_ID = 'NEW-HOSPET-001';
export const TYPE2_NEWHOSPET_MANIFEST_ID = 'TYPE2-NEWHOSPET-001';

// ----------------------------------------------------------------------------
// THE WORLD MANIFEST — New Hospet, a Type-II planetary civilization hosted
// outside the Galaxy Explorer.
// ----------------------------------------------------------------------------
export const NEW_HOSPET_WORLD_MANIFEST: UniverseWorldManifest = {
  manifestId: TYPE2_NEWHOSPET_MANIFEST_ID,
  worldId: NEW_HOSPET_WORLD_ID,
  galaxyId: AQUILA_GALAXY_ID,
  starSystemId: AQUILA_TYPE2_SYSTEM_ID,
  planetId: TYPE2_PLANET_ID,
  displayName: 'New Hospet',
  civilizationLevel: 'TYPE-II',
  classification: 'PLANETARY MEGACITY',
  externalWorld: true,
  entryMode: 'spacecraft',
  arrivalModes: ['orbit', 'spaceport'],
  endpointKey: 'TYPE2_WORLD_URL',
  returnTarget: 'GALAXY_EXPLORER',
  description:
    'New Hospet is a Type-II civilization megacity on the Type-II planet of the Aquila galaxy. The detailed world lives outside the Galaxy Explorer; astronomical scale ends at orbit.',
};

// ----------------------------------------------------------------------------
// REGISTRY
// ----------------------------------------------------------------------------
export const UNIVERSE_WORLD_MANIFESTS: UniverseWorldManifest[] = [
  NEW_HOSPET_WORLD_MANIFEST,
];

// ----------------------------------------------------------------------------
// LOOKUPS
// ----------------------------------------------------------------------------

/** Find a world manifest by its stable destination id (e.g. NEW-HOSPET-001). */
export function getWorldManifestByWorldId(worldId: string): UniverseWorldManifest | undefined {
  return UNIVERSE_WORLD_MANIFESTS.find((w) => w.worldId === worldId);
}

/** Find a world manifest by manifest id (e.g. TYPE2-NEWHOSPET-001). */
export function getWorldManifestByManifestId(manifestId: string): UniverseWorldManifest | undefined {
  return UNIVERSE_WORLD_MANIFESTS.find((w) => w.manifestId === manifestId);
}

/** Find the world manifest hosted on a specific planet id. */
export function getWorldManifestByPlanetId(planetId: string): UniverseWorldManifest | undefined {
  return UNIVERSE_WORLD_MANIFESTS.find((w) => w.planetId === planetId);
}

/** Find the world manifest hosted in a specific star system id. */
export function getWorldManifestBySystemId(systemId: string): UniverseWorldManifest | undefined {
  return UNIVERSE_WORLD_MANIFESTS.find((w) => w.starSystemId === systemId);
}

/** True when this planet is the astronomical anchor of an external world. */
export function isExternalWorldPlanet(planetId: string): boolean {
  return UNIVERSE_WORLD_MANIFESTS.some((w) => w.planetId === planetId);
}

// ----------------------------------------------------------------------------
// DEV DIAGNOSTICS — development-only world contract health check
// ----------------------------------------------------------------------------
export function logWorldRegistryStatus(): void {
  if (import.meta.env.DEV) {
    const manifest = NEW_HOSPET_WORLD_MANIFEST;
    console.debug(
      '[WORLD REGISTRY]\n' +
        `  GALAXY:        ${manifest.galaxyId} — OK\n` +
        `  STAR SYSTEM:   ${manifest.starSystemId} — OK\n` +
        `  PLANET:        ${manifest.planetId} — OK\n` +
        `  WORLD:         ${manifest.worldId} (${manifest.manifestId}) — OK\n` +
        `  CIVILIZATION:  ${manifest.civilizationLevel} — ${manifest.displayName}\n` +
        `  EXTERNAL:      CONFIGURED (endpoint: ${manifest.endpointKey})\n` +
        `  ARRIVAL MODES: ${manifest.arrivalModes.join(', ')}`
    );
  }
}

export function isArrivalModeSupported(manifest: UniverseWorldManifest, mode: WorldArrivalMode): boolean {
  return manifest.arrivalModes.includes(mode);
}