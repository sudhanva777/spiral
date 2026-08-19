import type { WorldArrivalState, WorldReturnState } from '../types/world';
import {
  AQUILA_TYPE2_SYSTEM_ID,
  AQUILA_TYPE2_STAR_ID,
  AQUILA_GALAXY_ID,
  NEW_HOSPET_WORLD_ID,
  TYPE2_NEWHOSPET_MANIFEST_ID,
  TYPE2_PLANET_ID,
} from './worldRegistry';

// ============================================================================
// EXTERNAL WORLD CONFIGURATION — the ONLY place the Type-II world endpoint
// is resolved. Never hardcode the destination URL anywhere else.
//
// The URL comes from the environment (VITE_TYPE2_WORLD_URL). When absent,
// the Galaxy Explorer stays fully functional and the destination reports
// "not currently connected".
// ============================================================================

export const TYPE2_WORLD_URL_ENV_KEY = 'VITE_TYPE2_WORLD_URL';

/** Resolve the public Type-II world endpoint (no secrets, public config only). */
export function getType2WorldUrl(): string | null {
  const raw = import.meta.env.VITE_TYPE2_WORLD_URL as string | undefined;
  if (!raw || raw.trim() === '') return null;
  return raw.trim().replace(/\/+$/, '');
}

/** Origin of the external world, used to validate return messages. */
export function getType2WorldOrigin(): string | null {
  const url = getType2WorldUrl();
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// HANDOFF URL — carries the arrival state to the external world
// ----------------------------------------------------------------------------
export function buildWorldHandoffUrl(arrival: WorldArrivalState): string | null {
  const base = getType2WorldUrl();
  if (!base) return null;

  const params = new URLSearchParams({
    world: arrival.worldId,
    manifest: arrival.manifestId,
    galaxy: arrival.galaxyId,
    system: arrival.starSystemId,
    planet: arrival.planetId,
    arrival: arrival.arrivalMode,
    source: arrival.sourceWorld,
    returnTo: arrival.returnTarget,
    universeTime: String(arrival.universeTime),
  });

  const pos = arrival.spacecraftState.position;
  const look = arrival.spacecraftState.lookAt;
  params.set('spos', pos.map((v) => v.toFixed(3)).join(','));
  params.set('slook', look.map((v) => v.toFixed(3)).join(','));
  params.set('sspeed', String(arrival.spacecraftState.speed));
  params.set('returnUrl', arrival.returnUrl);

  return `${base}?${params.toString()}`;
}

// ----------------------------------------------------------------------------
// RETURN HANDSHAKE — the external world posts a return message to its
// opener (window.opener.postMessage). The Galaxy Explorer validates the
// origin and world id before restoring the player.
// ----------------------------------------------------------------------------
export const WORLD_RETURN_MESSAGE_TYPE = 'universe-world-return';

export function isWorldReturnMessage(data: unknown): data is WorldReturnState {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Partial<WorldReturnState>;
  return (
    msg.type === WORLD_RETURN_MESSAGE_TYPE &&
    typeof msg.worldId === 'string' &&
    (msg.arrivalMode === 'orbit' ||
      msg.arrivalMode === 'spaceport' ||
      msg.arrivalMode === 'surface' ||
      msg.arrivalMode === 'city')
  );
}

export function isValidReturnOrigin(eventOrigin: string): boolean {
  const worldOrigin = getType2WorldOrigin();
  if (!worldOrigin) {
    // No external endpoint configured — nothing could legitimately return.
    return false;
  }
  return eventOrigin === worldOrigin;
}

// ----------------------------------------------------------------------------
// REFERENCE ARRIVAL STATE — built by the engine when the player enters the
// destination boundary (see GalaxyEngine.beginWorldHandoff).
// ----------------------------------------------------------------------------
export interface DefaultHandoffIdentity {
  worldId: typeof NEW_HOSPET_WORLD_ID;
  manifestId: typeof TYPE2_NEWHOSPET_MANIFEST_ID;
  galaxyId: typeof AQUILA_GALAXY_ID;
  starSystemId: typeof AQUILA_TYPE2_SYSTEM_ID;
  starId: typeof AQUILA_TYPE2_STAR_ID;
  planetId: typeof TYPE2_PLANET_ID;
}

export const NEW_HOSPET_IDENTITY: DefaultHandoffIdentity = {
  worldId: NEW_HOSPET_WORLD_ID,
  manifestId: TYPE2_NEWHOSPET_MANIFEST_ID,
  galaxyId: AQUILA_GALAXY_ID,
  starSystemId: AQUILA_TYPE2_SYSTEM_ID,
  starId: AQUILA_TYPE2_STAR_ID,
  planetId: TYPE2_PLANET_ID,
};