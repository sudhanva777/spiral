import type { StarSystemConfig, CivilTheme } from '../../types/starSystem';

// ============================================================================
// AERTHELGARD — THE LIVING TYPE-I PLANET OF THE SIRAN GALAXY
//
// The Aerthelgard system rides close to the supermassive black hole at the
// core of IC 1579 (the Siran Galaxy), far inside the inner galactic region
// where the core's light dominates the night sky. Its flagship world,
// Aerthelgard, is a habitable rocky super-planet wrapped in golden-teal
// continents, drifting cloud decks and a breathable oxygen-rich atmosphere,
// orbited by an irregular golden moon — Auriel.
//
// New Hospet, the Type-I capital, is one of five city directions on the
// world. At night the sky above the city belongs to the Siran Galaxy: the
// black hole crosses the sky as the planet turns, Auriel runs its phases,
// and the core band of IC 1579 arches overhead.
// ============================================================================

export const AERTHELGARD_SYSTEM_ID = 'siran-aerthelgard';
export const AERTHELGARD_PLANET_ID = 'aerthelgard';
export const AURIEL_MOON_ID = 'auriel';
export const NEW_HOSPET_CITY_INDEX = 0;

// ----------------------------------------------------------------------------
// NEW HOSPET — Type-I civilization theme (golden engineering, teal night)
// ----------------------------------------------------------------------------
export const NEW_HOSPET_THEME: CivilTheme = {
  name: 'New Hospet',
  ground: '#141A22',
  street: '#2C3A4A',
  park: '#1E3A2E',
  plaza: '#26323E',
  window: '#FFD9A0',
  glow: '#FFC97A',
  shadow: '#05090E',
  light: '#FFF4E0',
  accent: '#7FE8D8',
  personas: [
    {
      name: 'Ilyan Sarto',
      title: 'Spaceport Control',
      lines: [
        'Pad three is yours whenever you want it. The vector up is clean tonight — the black hole is on the far side of the sky.',
        'Two shuttles an hour to the ring station. People up, ore down, and the Tether hums between.',
        'We launched the first orbital elevator from this pad four hundred years ago. Same concrete. Same dream.',
      ],
    },
    {
      name: 'Dr. Marisol Vance',
      title: 'Siran Observatory',
      lines: [
        'That glow over the towers is not a cloud — it is the core of our galaxy. The black hole feeds on stars.',
        'Auriel is a captured body. It tumbles, it drags our tides, and its gold is older than the city.',
        'Every night we chart the hole\u2019s wander across the sky. It never moves. We are the ones moving. That is the whole trick.',
      ],
    },
    {
      name: 'Tavin Krell',
      title: 'Maglev Conductor',
      lines: [
        'Last train to the coastal district leaves in four minutes. The line runs on the city\u2019s fusion grid.',
        'Forty meters under the plaza there is a second city — pipes, power, data. The trains never stop down there.',
        'New Hospet is seven districts, one river, and a thousand roofs. I know every one of them from above.',
      ],
    },
    {
      name: 'Aria Solenne',
      title: 'Orbital Architect',
      lines: [
        'We did not build down first. We built up, then sideways, then down. The city is a cube now, mostly.',
        'The towers drink sunlight at noon and pour it back out as light at night. Ask the grid engineers.',
        'One day the city will climb the Tether and meet the ring station. We are already halfway there.',
      ],
    },
    {
      name: 'K-77',
      title: 'Security Patrol Unit',
      lines: [
        'Sector clear. Pedestrian traffic nominal. The golden moon rises in two hours — expect rooftop congestion.',
        'My sensors read one anomaly: you. Welcome to New Hospet, visitor.',
      ],
    },
    {
      name: 'Wren Halcyon',
      title: 'Hydro Station Worker',
      lines: [
        'Every drop that falls on this district is counted. We route it, clean it, and give it back to the river.',
        'The river under the city bridges feeds the coastal farms. You cannot build a world on a desert, traveler.',
      ],
    },
    {
      name: 'Oren Vex',
      title: 'Fusion Grid Technician',
      lines: [
        'Four reactors under the city, one on the orbital ring. When the sun sets, the grid wakes up.',
        'This console reads the whole planetary grid — every city, every train, every lamp. One world, one power line.',
        'The black hole watches us from the sky. We return the favour with our own light.',
      ],
    },
    {
      name: 'Mara Nel',
      title: 'Air-Taxi Pilot',
      lines: [
        'Corridor seven is mine. Towers, bridges, rooftop pads — I could fly it blind.',
        'Flying cars follow lanes like trains follow rails. The sky is a road, traveler. It always was.',
      ],
    },
    {
      name: 'Jot',
      title: 'Delivery Drone',
      lines: [
        'Package for 77 Solar Plaza: two fusion cells and one very patient cat.',
        'I have mapped every roof in New Hospet. Yours is the first that is not a roof.',
      ],
    },
    {
      name: 'Sena Ivo',
      title: 'Night Market Vendor',
      lines: [
        'Golden tea, brewed under the golden moon. Best served when the black hole is high.',
        'Everything here runs on the city grid. The tea, the lights, even my credit terminal. Type-I life, traveler.',
      ],
    },
  ],
  structures: [
    {
      id: 'tether-base',
      name: 'The Hospet Tether',
      title: 'New Hospet Space Elevator',
      lines: [
        'A carbon-gold cable rising past the clouds to the orbital ring station. Cars climb it around the clock.',
        'The base mooring hums with the station\u2019s heartbeat. Five day-cabs pass overhead per hour.',
      ],
    },
    {
      id: 'spaceport',
      name: 'Hospet Central Spaceport',
      title: 'Planet ↔ Orbit Route',
      lines: [
        'Pad lights blink the evening sequence: two gold, one teal. Shuttles ride the launch rail.',
        'Orbital freight leaves every hour. The Tether handles people; the shuttles handle everything else.',
      ],
    },
    {
      id: 'fountain',
      name: 'The Solar Fountain',
      title: 'New Hospet Central Plaza',
      lines: [
        'Water arcs in time with the sun\u2019s light curve, fed by the city\u2019s hydro grid.',
        'The plaza is the city\u2019s clock — everyone meets here when the night lights ignite.',
      ],
    },
  ],
};

// ----------------------------------------------------------------------------
// THE AERTHELGARD SYSTEM
// ----------------------------------------------------------------------------
export const AERTHELGARD_SYSTEM: StarSystemConfig = {
  id: AERTHELGARD_SYSTEM_ID,
  name: 'Aerthelgard',
  designation: 'IC 1579 // SIRAN CORE SYSTEM 12',
  description:
    'A warm pale-gold G-type star hugging the inner region of the Siran Galaxy, its light falling on the habitable super-planet Aerthelgard. So close to the galactic core that the supermassive black hole looms in the night sky, watched by the Type-I civilization of New Hospet beneath its irregular golden moon.',
  galaxyId: 'galaxy17',
  positionInGalaxy: [10.5, 0.4, 10.5],
  systemRadius: 8.0,
  discoveryTag: 'aerthelgard',
  discoveryTitle: 'AERTHELGARD // THE SIRAN CORE WORLD',
  star: {
    id: 'star-aerthel',
    name: 'Sol Aerthel',
    spectralType: 'G2-V • Warm Golden Sun',
    apparentRadius: 0.9,
    coreColor: '#FFFDF4',
    coronaColor: '#FFE4A0',
    glowColor: '#FFC15E',
    flareColor: '#FFE9B8',
    pulseSpeed: 0.9,
    coronaIntensity: 1.8,
    plasmaParticlesCount: 300,
  },
  planets: [
    {
      id: 'aerthel-p1',
      name: 'Ashkhet',
      type: 'rocky',
      subtitle: 'Sun-Baked Iron World',
      description:
        'A scorched iron world circling close to Sol Aerthel, its crater floors filled with golden dust blown by the solar wind.',
      radius: 0.046,
      orbitRadius: 1.5,
      orbitSpeed: 1.4,
      orbitEccentricity: 0.06,
      orbitInclination: 0.03,
      orbitPhase: 0.5,
      rotationSpeed: 0.32,
      axialTilt: 0.05,
      primaryColor: '#6E5A3E',
      secondaryColor: '#3A2E1E',
      accentColor: '#C8A86E',
      hasAtmosphere: false,
    },
    {
      id: AERTHELGARD_PLANET_ID,
      name: 'Aerthelgard',
      type: 'earth-like',
      subtitle: 'Habitable Super-Planet • Type-I World',
      description:
        'Aerthelgard — the living super-planet of the Siran Galaxy. Golden-teal continents, deep teal oceans, mountain chains and drifting cloud decks under a warm sun. Five city directions cluster around the capital New Hospet, a Type-I megacity of towers, maglev lines, flying corridors and orbital infrastructure. Its night sky is the Siran Galaxy itself: the black hole, the star band, and the golden irregular moon Auriel.',
      radius: 0.135,
      orbitRadius: 2.6,
      orbitSpeed: 0.55,
      orbitEccentricity: 0.012,
      orbitInclination: 0.02,
      orbitPhase: 1.9,
      rotationSpeed: 0.2,
      axialTilt: 0.3,
      cloudRotationSpeed: 0.27,
      primaryColor: '#0E5E7A',
      secondaryColor: '#C9A45C',
      accentColor: '#E8D9A0',
      atmosphereColor: '#7EC8F2',
      hasAtmosphere: true,
      atmosphereThickness: 0.028,
      hasClouds: true,
      moons: [
        {
          id: AURIEL_MOON_ID,
          name: 'Auriel',
          subtitle: 'Irregular Golden Moon',
          description:
            'Aerthelgard\'s captured golden satellite — a lumpy, potato-shaped body of ancient metal-rich rock, its gold born of reflected sunlight. It tumbles on a slow tilted orbit, running through new, crescent, quarter, gibbous and full as the planet turns beneath it.',
          radius: 0.034,
          orbitRadius: 0.62,
          orbitSpeed: 1.3,
          orbitEccentricity: 0.07,
          orbitInclination: 0.09,
          orbitPhase: 2.1,
          rotationSpeed: 0.42,
          primaryColor: '#F0D9A0',
          secondaryColor: '#A67C2E',
          craterDensity: 0.9,
          irregular: true,
          golden: true,
        },
        {
          id: 'nyres',
          name: 'Nyres',
          subtitle: 'Dark Captured Companion',
          description:
            'A small dark captive body threading a distant inclined orbit beyond Auriel — a faint shadow against the galaxy band.',
          radius: 0.009,
          orbitRadius: 1.02,
          orbitSpeed: 0.55,
          orbitEccentricity: 0.14,
          orbitInclination: 0.26,
          orbitPhase: 4.4,
          rotationSpeed: 0.6,
          primaryColor: '#2E2A22',
          secondaryColor: '#14120E',
          irregular: true,
        },
      ],
      surfaceExplore: true,
      surfaceGravity: 8.4,
      surfaceJumpHeight: 0.5,
      surfaceDayLength: 1800,
      surfaceVegetationCount: 3200,
      surfaceCameraHeight: 0.0019,
      surfaceWalkSpeed: 1.5,
      surfaceCivilization: true,
      cityDirs: [
        [0.62, 0.16, 0.76], // 0 NEW HOSPET — capital
        [0.78, -0.28, -0.55], // 1 Auriel Bay
        [-0.6, 0.32, 0.72], // 2 Ridgefall East
        [-0.4, -0.5, -0.76], // 3 Solhaven
        [0.14, -0.62, 0.77], // 4 Kestrel Reach
      ],
      cityCapitalIndex: NEW_HOSPET_CITY_INDEX,
      cityTheme: NEW_HOSPET_THEME,
      hasLocalAsteroids: true,
      localAsteroidCount: 150,
    },
    {
      id: 'aerthel-p3',
      name: 'Ruvani',
      type: 'gas-giant',
      subtitle: 'Amber Banded Giant',
      description:
        'A great amber-and-gold gas giant streaked with pale cream storms, its rings of fine dust catching the warm light of Sol Aerthel.',
      radius: 0.19,
      orbitRadius: 4.4,
      orbitSpeed: 0.36,
      orbitEccentricity: 0.02,
      orbitInclination: 0.03,
      orbitPhase: 3.6,
      rotationSpeed: 0.48,
      axialTilt: 0.2,
      cloudRotationSpeed: 0.5,
      primaryColor: '#B0803E',
      secondaryColor: '#F0DCA0',
      accentColor: '#6E4A1E',
      atmosphereColor: '#FFE4B0',
      hasAtmosphere: true,
      atmosphereThickness: 0.045,
      hasClouds: true,
      moons: [
        {
          id: 'ruvani-m1',
          name: 'Sera',
          subtitle: 'Pale Gold Moon',
          description: 'A bright moon gliding through the giant\'s faint ring plane.',
          radius: 0.021,
          orbitRadius: 0.55,
          orbitSpeed: 1.5,
          orbitEccentricity: 0.02,
          orbitInclination: 0.04,
          orbitPhase: 1.2,
          rotationSpeed: 0.3,
          primaryColor: '#F0E0B8',
          secondaryColor: '#9A8050',
        },
        {
          id: 'ruvani-m2',
          name: 'Mok',
          subtitle: 'Cinder Captive',
          description: 'A dark volcanic moonlet on a tilted path around the giant.',
          radius: 0.012,
          orbitRadius: 0.85,
          orbitSpeed: 0.9,
          orbitEccentricity: 0.1,
          orbitInclination: 0.2,
          orbitPhase: 5.2,
          rotationSpeed: 0.5,
          primaryColor: '#3E2E1E',
          secondaryColor: '#1E140A',
          isVolcanic: true,
        },
      ],
    },
    {
      id: 'aerthel-p4',
      name: 'Osmere',
      type: 'ice',
      subtitle: 'Outer Frost Sentinel',
      description:
        'A distant frozen world at the edge of the system, its ice glowing faint gold under the distant sun and the galactic core.',
      radius: 0.07,
      orbitRadius: 6.6,
      orbitSpeed: 0.26,
      orbitEccentricity: 0.05,
      orbitInclination: 0.06,
      orbitPhase: 0.9,
      rotationSpeed: 0.28,
      axialTilt: 0.2,
      primaryColor: '#A8BCC8',
      secondaryColor: '#E8F0F0',
      accentColor: '#5A7480',
      atmosphereColor: '#C0D8E0',
      hasAtmosphere: true,
      atmosphereThickness: 0.012,
    },
  ],
};