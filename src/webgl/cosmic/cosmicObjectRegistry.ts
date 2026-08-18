import type { CosmicObjectConfig } from '../../types/universe';

// ============================================================================
// UNIVERSAL COSMIC OBJECTS REGISTRY
//
// Every entry is a large-scale phenomenon placed directly inside AETHER
// space — far from the galaxy groups, in the intentionally empty regions
// of UNIVERSAL. They share the common CosmicObjectConfig architecture so
// the existing interaction/navigation systems can treat them uniformly.
// ============================================================================

export const COSMIC_OBJECTS: CosmicObjectConfig[] = [
  {
    id: 'nebula-rosaline',
    name: 'Rosaline Nebula',
    subtitle: 'Star-Forming Nursery',
    description:
      'A vast active stellar nursery — UV radiation from young massive stars ionizes surrounding hydrogen into crimson, pink and magenta emission regions, while dark branching dust lanes trace dense molecular material.',
    type: 'NEBULA',
    position: [-330, -20, 240],
    boundingRadius: 90,
    detectionRadius: 230,
    approachOffset: [0, 45, 110],
    controls: { minDistance: 30, maxDistance: 320, zoomSpeed: 0.4, panSpeed: 0.3 },
  },
  {
    id: 'ember-ridge',
    name: 'The Ember Ridge',
    subtitle: 'Active Molecular-Cloud Ridge',
    description:
      'An enormous star-forming molecular ridge glowing orange-red across a dark basin. Stellar winds have carved luminous cavities into its cold gas, leaving sweeping boundaries and embedded star clusters.',
    type: 'COSMIC_RIDGE',
    position: [230, 120, -380],
    boundingRadius: 130,
    detectionRadius: 280,
    approachOffset: [0, 70, 150],
    controls: { minDistance: 45, maxDistance: 420, zoomSpeed: 0.4, panSpeed: 0.3 },
  },
  {
    id: 'pillar-veil',
    name: 'Pillar Veil',
    subtitle: 'Giant Molecular Pillar Region',
    description:
      'Enormous dark dust and gas columns rising against a field of faint ionized red emission — illuminated edges, dense molecular cores, and rare embedded protostellar knots.',
    type: 'MOLECULAR_CLOUD',
    position: [-520, -50, 190],
    boundingRadius: 65,
    detectionRadius: 150,
    approachOffset: [0, 28, 78],
    controls: { minDistance: 14, maxDistance: 230, zoomSpeed: 0.4, panSpeed: 0.3 },
  },
  {
    id: 'pulsar-x9',
    name: 'Pulsar X-9',
    subtitle: 'Rapidly Rotating Neutron Star',
    description:
      'A compact neutron star spinning at extreme velocity, sweeping two opposing radiation beams across UNIVERSAL. Its periodic flash is visible from a great distance.',
    type: 'PULSAR',
    position: [400, 80, 320],
    boundingRadius: 14,
    detectionRadius: 75,
    approachOffset: [0, 5, 17],
    controls: { minDistance: 3.5, maxDistance: 70, zoomSpeed: 0.08, panSpeed: 0.02, near: 0.01, far: 400 },
  },
  {
    id: 'binary-collision',
    name: 'Binary Collision',
    subtitle: 'Merging Black-Hole Pair',
    description:
      'Two black holes locked in a dying orbit — inspiraling faster and faster until they merge into a single black hole, radiating gravitational waves across the surrounding void.',
    type: 'BLACK_HOLE_BINARY',
    position: [480, -60, -320],
    boundingRadius: 45,
    detectionRadius: 120,
    approachOffset: [0, 26, 75],
    controls: { minDistance: 20, maxDistance: 280, zoomSpeed: 0.4, panSpeed: 0.3 },
  },
];

export function getCosmicObjectById(id: string): CosmicObjectConfig {
  const found = COSMIC_OBJECTS.find((o) => o.id === id);
  return found || COSMIC_OBJECTS[0];
}