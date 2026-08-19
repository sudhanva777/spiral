// ============================================================================
// EXTERNAL WORLD CONTRACT — GALAXY EXPLORER ↔ TYPE-II WORLD BRIDGE
//
// The Galaxy Explorer owns astronomical scale. The Type-II world owns
// planetary/surface scale. This contract is the ONLY thing both sides share:
// stable identifiers, arrival modes, the handoff state and the return state.
//
// ----------------------------------------------------------------------------
// CONTROL CONTRACT (Phase 14) — SAME CONTROL LANGUAGE, TWO WORLDS
//
// Both projects use the same semantic control language. Keyboard keys may
// differ where an established control system already exists — the SEMANTIC
// meaning is what must stay identical:
//
//   PLAYER (surface scale — Type-II world owns the mapping)
//     Move:      WASD / virtual stick       → move
//     Look:      mouse drag / right stick   → look
//     Jump:      Space / action button      → jump (where gravity allows)
//     Sprint:    Shift                      → sprint
//     Interact:  E                          → interact / talk / use
//
//   SPACECRAFT (astronomical scale — Galaxy Explorer owns the mapping)
//     Look/orbit: mouse drag + scroll       → rotate / dolly (OrbitControls)
//     Throttle:   Scroll                    → distance to destination
//     Time scale: Space                     → simulation rate
//     Surface flight: WASD / arrows         → walk, E → interact
//
// The Galaxy Explorer's established mapping (drag = orbit, scroll = zoom,
// Space = observation time-scale / jump, E = interact, ESC = ascend,
// R = reset) is the preserved baseline; the Type-II world reuses the same
// semantic meaning for WASD / mouse / Space / Shift / E.
// ============================================================================

// ----------------------------------------------------------------------------
// ARRIVAL MODES — how the player should appear inside the external world.
// The first integration ships ORBIT (and SPACEPORT when the Type-II world
// supports it). Never claim a mode the external world does not implement.
// ----------------------------------------------------------------------------
export type WorldArrivalMode =
  | 'orbit'
  | 'spaceport'
  | 'surface'
  | 'city';

// ----------------------------------------------------------------------------
// UNIVERSE WORLD MANIFEST — one entry per external world, registered in the
// world registry (the single source of truth). Display names are separate
// from stable identifiers.
// ----------------------------------------------------------------------------
export interface UniverseWorldManifest {
  /** Stable manifest id, e.g. TYPE2-NEWHOSPET-001 */
  manifestId: string;
  /** Stable civilization destination id, e.g. NEW-HOSPET-001 */
  worldId: string;
  /** Stable galaxy id, e.g. AQUILA */
  galaxyId: string;
  /** Stable star-system id, e.g. AQUILA-TYPE2-SYSTEM */
  starSystemId: string;
  /** Stable planet id, e.g. TYPE2-PLANET-001 */
  planetId: string;
  /** Display name, e.g. "New Hospet" */
  displayName: string;
  /** Civilization classification, e.g. "TYPE-II" */
  civilizationLevel: string;
  /** Short classification shown in the HUD, e.g. "PLANETARY MEGACITY" */
  classification: string;
  /** World is hosted outside the Galaxy Explorer */
  externalWorld: true;
  /** How the player enters: spacecraft entry */
  entryMode: 'spacecraft';
  /** Arrival modes the external world currently supports */
  arrivalModes: WorldArrivalMode[];
  /** External endpoint configuration key (resolved by worldConfig) */
  endpointKey: string;
  /** Where the player returns to */
  returnTarget: 'GALAXY_EXPLORER';
  /** Short description for destination cards / prompts */
  description: string;
}

// ----------------------------------------------------------------------------
// HANDOFF STATE — what the Galaxy Explorer tells the external world:
// WHO arrived, FROM WHERE, IN WHAT STATE, HOW THEY SHOULD ARRIVE.
// ----------------------------------------------------------------------------
export interface WorldArrivalState {
  worldId: string;
  manifestId: string;
  galaxyId: string;
  starSystemId: string;
  planetId: string;
  arrivalMode: WorldArrivalMode;
  /** The spacecraft IS the engine camera in this project */
  spacecraftState: {
    position: [number, number, number];
    lookAt: [number, number, number];
    speed: number;
  };
  playerState: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  universeTime: number;
  sourceWorld: 'GALAXY_EXPLORER';
  returnTarget: 'GALAXY_EXPLORER';
  /** Origin the external world should return the player to */
  returnUrl: string;
}

// ----------------------------------------------------------------------------
// RETURN STATE — posted by the external world (window.opener) when the
// player leaves New Hospet and comes back to space.
// ----------------------------------------------------------------------------
export interface WorldReturnState {
  type: 'universe-world-return';
  worldId: string;
  manifestId?: string;
  arrivalMode: WorldArrivalMode;
  galaxyId?: string;
  starSystemId?: string;
  planetId?: string;
}

// ----------------------------------------------------------------------------
// EXTERNAL WORLD STATUS — surfaced to the HUD so the transition overlay can
// render (preparing → launching → entered / error).
// ----------------------------------------------------------------------------
export type ExternalWorldStatus =
  | 'idle'
  | 'preparing'
  | 'launching'
  | 'entered'
  | 'returning'
  | 'error';

export interface ExternalWorldState {
  worldId: string | null;
  manifestId: string | null;
  status: ExternalWorldStatus;
  arrivalMode: WorldArrivalMode | null;
  /** User-facing message for error / not-connected states */
  message?: string;
}

export const IDLE_EXTERNAL_WORLD_STATE: ExternalWorldState = {
  worldId: null,
  manifestId: null,
  status: 'idle',
  arrivalMode: null,
};