import * as THREE from 'three';
import type { CivilTheme, PlanetConfig } from '../../../types/starSystem';
import { getCapitalCityDir } from './cityDirs';

// ============================================================================
// GEMINI LIVING WORLD — capital city "Emeria" and the civilization around it.
//
// Everything is instanced/pooled so the whole scene renders as a handful of
// draw calls:
//   - ~160 building instances (shared box geometry + canvas window texture)
//   - 26 blocky NPCs (6 shared InstancedMeshes for body parts, 3 face maps)
//   - delivery drones / maintenance bots / security patrol (instanced)
//   - air-traffic lane pods (instanced, animated matrices)
//   - The Tether space elevator, spaceport with launching shuttles,
//     light-sail masts, plaza fountain, street lamps and ground mist.
//
// Internal units are METERS; the frame converts to scene units via
// UM = planet.radius * 0.0011 (1.73 m eye height at GEMINI scale).
// ============================================================================

export type CivilInteractKind = 'npc' | 'robot' | 'structure';

export interface CivilInteractable {
  kind: CivilInteractKind;
  id: string;
  name: string;
  title: string;
  prompt: string; // HUD action label: TALK / INSPECT
  dialogue: string[];
  position: THREE.Vector3; // world space
}

interface NpcSim {
  pos: THREE.Vector3; // meters, frame-local (x, y, z)
  dir: THREE.Vector3;
  speed: number;
  state: 'IDLE' | 'WALKING' | 'TALKING' | 'WORKING';
  walkPhase: number;
  idleTimer: number;
  waypoints: THREE.Vector3[];
  wpIndex: number;
  face: number;
  persona: number;
  bobSeed: number;
}

interface RobotSim {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  waypoints: THREE.Vector3[];
  wpIndex: number;
  kind: 'drone' | 'maintenance' | 'security';
  walkPhase: number;
}

// Deterministic RNG so the city is identical every session
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERSONAS: { name: string; title: string; lines: string[] }[] = [
  {
    name: 'Sena Meridian',
    title: 'Night Market Cart',
    lines: [
      'Jade tea, fresh-pressed from the Yavine groves. Warmth for the long GEMINI night.',
      'The Tether brings the rings down to us, you know. Four passages a day.',
      'Drink up, traveler. Ring-light tea beats anything they brew in orbit.',
    ],
  },
  {
    name: 'Voss Kaelin',
    title: 'Tether Attendant',
    lines: [
      'Climb aboard the day-cab — two hours to the station, one look at the whole galaxy.',
      'Emeria sleeps when the green sun sets. The Beacons keep her breathing.',
      'They say the ring station hums the same note as the Black Heart. I say it hums back.',
    ],
  },
  {
    name: 'Dr. Ilyra Vex',
    title: 'Astrophysicist',
    lines: [
      'You want the truth? The sky is not a sky. It IS the galaxy. We are inside IC 1579.',
      'That band of light at night — our home spiral. Every star you see is a neighbor.',
      'The Black Heart at its center keeps our orbits honest. We watch it from here. Safe. For now.',
    ],
  },
  {
    name: 'Maren Oska',
    title: 'Harbor Master',
    lines: [
      'Port Veridian runs on ring-sails and patience. The moons rule the tides here.',
      "Obsyra's ash keeps the deep docks dark. Good for quiet trade, bad for tourists.",
      'Every ship that leaves this world takes a little of its green with it.',
    ],
  },
  {
    name: 'Jot',
    title: 'Delivery Drone',
    lines: [
      'Package for 42 Veridian Lane: beeswax, jade filament, one very confused pet.',
      'I have mapped every roof in Emeria. Yours is the first that is not a roof.',
      'Hover charges are municipal. Walkers pay extra.',
    ],
  },
  {
    name: 'Wren Halcyon',
    title: 'Grounds Keeper',
    lines: [
      "The park grass drinks the sun's green like it owes it money.",
      "Frost on the plaza at dawn — that's Yavine's cold breath. She does that.",
      'The bioluminescent beds only sing after midnight. Come back later.',
    ],
  },
  {
    name: 'Ember Arel',
    title: 'Beacon Keeper',
    lines: [
      'When the sun dips, I light the flare. Every city on the night side answers back.',
      'Count the lights on the horizon, traveler. That is GEMINI, alive.',
      'Five cities, one world, one sky. The Beacons keep us all on the same clock.',
    ],
  },
  {
    name: 'Telos Ryn',
    title: 'Ring-Sail Pilot',
    lines: [
      'The rings make the best air. I surf them at dawn, before the traffic wakes.',
      'Two more runs and I trade the sails for a Tether post. Quieter up there, they say.',
      'Watch the sky near sunset — that is me, cutting the shadow line.',
    ],
  },
  {
    name: 'Aya Vellum',
    title: 'Fountain Technician',
    lines: [
      'The fountain hums the sun\u2019s frequency. The fish sing back.',
      'Do not drink the fountain water. The fish are territorial.',
      'The pump core is jade-plated. It has not needed me in a decade. I check anyway.',
    ],
  },
  {
    name: 'Oren Yavine',
    title: 'Ring-Dock Inspector',
    lines: [
      'I walk the tether seam every shift. The cable sings when the cars pass.',
      'Three hundred and ten years, not one strand failed. We take that personally.',
      'The station above? It reads the whole galaxy like a tide chart.',
    ],
  },
];

const STRUCTURE_DIALOGUES: { id: string; name: string; title: string; lines: string[] }[] = [
  {
    id: 'tether-base',
    name: 'The Tether',
    title: 'Emeria Space Elevator',
    lines: [
      'A carbon-jade cable rising past the clouds to the ring station. Cars climb it around the clock.',
      'The base mooring hums with the station\u2019s heartbeat. Four day-cabs pass overhead per day.',
    ],
  },
  {
    id: 'spaceport',
    name: 'Gemini Spaceport',
    title: 'Port Veridian Route',
    lines: [
      'Pad lights blink the evening sequence: two green, one amber. Shuttles ride the launch rail.',
      'Orbital freight leaves every hour. The Tether handles people; the shuttles handle everything else.',
    ],
  },
  {
    id: 'fountain',
    name: 'The Singing Fountain',
    title: 'Emeria Central Plaza',
    lines: [
      'Water arcs in time with the sun\u2019s light curve. The fish swim the melody.',
      'The plaza is the city\u2019s clock — everyone meets here when the Beacons light.',
    ],
  },
];

const BLOCK_PITCH = 40; // meters, block + street
const BLOCK_HALF = 16; // meters, block footprint half-size
const CITY_HALF = 160; // meters, city half-extent
const GRID = 8; // blocks per side
const STREET_Y = 0.25; // meters above terrain for walkers

function makePersona(npcCount: number, personaCount: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < npcCount; i++) out.push(i % personaCount);
  return out;
}

// Theme colors: when a planet declares a CivilTheme (AERTHELGARD: New
// Hospet), the whole city rebuilds in its palette, personas and structures.
// With no theme the classic GEMINI emerald Emeria is used unchanged.
type ThemeStr = { name: string; title: string; lines: string[] };
type StructureDef = { id: string; name: string; title: string; lines: string[] };

export class GeminiCivilization {
  public frame: THREE.Group;
  public cityLocalDir: THREE.Vector3;

  private readonly R: number;
  private readonly UM: number;
  private readonly parent: THREE.Group;
  private readonly sampleTerrain: (dir: THREE.Vector3) => number;
  private readonly theme?: CivilTheme;
  private readonly personas: ThemeStr[];
  private readonly structures: StructureDef[];
  private readonly themeHue: number;
  private readonly npcHue: number;

  private axisX = new THREE.Vector3(1, 0, 0);
  private axisZ = new THREE.Vector3(0, 0, 1);
  private frameOrigin = new THREE.Vector3();

  private groundMesh!: THREE.Mesh;
  private groundMat!: THREE.MeshBasicMaterial;

  private buildingMesh!: THREE.InstancedMesh;
  private windowTexture!: THREE.CanvasTexture;
  private buildingMat!: THREE.MeshLambertMaterial;
  private buildingFootprints: { cx: number; cz: number; rx: number; rz: number; h: number }[] = [];

  private lampMesh!: THREE.InstancedMesh;
  private lampGlow!: THREE.InstancedMesh;
  private lampMat!: THREE.MeshBasicMaterial;
  private lampGlowMat!: THREE.MeshBasicMaterial;
  private lampTransforms: { x: number; z: number }[] = [];

  private sailMesh!: THREE.InstancedMesh;
  private sailMat!: THREE.MeshBasicMaterial;

  private npcParts: THREE.InstancedMesh[] = []; // head(3), torso, armL, armR, legL, legR
  private npcSims: NpcSim[] = [];
  private npcHeadMat: THREE.MeshBasicMaterial[] = [];
  private npcPartMat!: THREE.MeshLambertMaterial;

  private robotMeshes: THREE.InstancedMesh[] = [];
  private robotSims: RobotSim[] = [];

  private podMesh!: THREE.InstancedMesh;
  private podGlow!: THREE.InstancedMesh;
  private podMat!: THREE.MeshBasicMaterial;
  private podSims: { origin: THREE.Vector3; radius: number; speed: number; phase: number }[] = [];

  private tether!: THREE.Group;
  private tetherPod!: THREE.Mesh;
  private tetherPodMat!: THREE.MeshBasicMaterial;

  private shuttle!: THREE.Group;
  private shuttleState: 'parked' | 'launch' | 'climb' = 'parked';
  private shuttleTimer = 8;
  private parkedShuttles: THREE.Group[] = [];

  private mistSprites: THREE.Sprite[] = [];
  private mistTex!: THREE.CanvasTexture;
  private light: THREE.DirectionalLight;

  private time = 0;
  private disposed = false;

  // interaction bookkeeping
  private npcWorldPos = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();
  private tmp4 = new THREE.Vector3();

  public constructor(
    config: PlanetConfig,
    parent: THREE.Group,
    sampleTerrain: (dir: THREE.Vector3) => number
  ) {
    this.R = config.radius;
    this.UM = this.R * 0.0011;
    this.parent = parent;
    this.sampleTerrain = sampleTerrain;
    this.theme = config.cityTheme;
    this.personas = config.cityTheme?.personas ?? PERSONAS;
    this.structures = config.cityTheme?.structures ?? STRUCTURE_DIALOGUES;
    const themeGlow = new THREE.Color(config.cityTheme?.glow ?? '#CFFFE0');
    const themeHsl = { h: 0, s: 0, l: 0 };
    themeGlow.getHSL(themeHsl);
    this.themeHue = config.cityTheme ? themeHsl.h : 0.32;
    this.npcHue = config.cityTheme ? themeHsl.h : 0.3;
    this.cityLocalDir = getCapitalCityDir(config).clone().normalize();

    this.frame = new THREE.Group();
    this.frame.name = config.cityTheme ? `Civilization-${config.cityTheme.name}` : 'GeminiCivilization-Emeria';
    this.frame.position.copy(this.cityLocalDir).multiplyScalar(this.R * 1.004);
    this.frame.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.cityLocalDir);
    this.frameOrigin.copy(this.frame.position);
    this.axisX.set(1, 0, 0).applyQuaternion(this.frame.quaternion);
    this.axisZ.set(0, 0, 1).applyQuaternion(this.frame.quaternion);

    // Stylized sun — matches the sky shader's day/night cycle so the city
    // darkens as the sun sets (emissive windows take over at night).
    this.light = new THREE.DirectionalLight(new THREE.Color(config.cityTheme?.light ?? '#eafff0'), 1);
    this.light.position.copy(this.cityLocalDir).multiplyScalar(2.5);
    this.frame.add(this.light);

    this.buildWindowTexture();
    this.buildGround();
    this.buildBuildings();
    this.buildSails();
    this.buildNpcs();
    this.buildRobots();
    this.buildTrafficPods();
    this.buildTether();
    this.buildSpaceport();
    this.buildMist();

    this.parent.add(this.frame);
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  /** Frame-local ground height (meters) above the frame origin at (x,z). */
  private groundYAt(x: number, z: number): number {
    this.tmp3.copy(this.frameOrigin);
    this.tmp4.copy(this.axisX).multiplyScalar(x * this.UM);
    this.tmp3.add(this.tmp4);
    this.tmp4.copy(this.axisZ).multiplyScalar(z * this.UM);
    this.tmp3.add(this.tmp4).normalize();
    return (this.sampleTerrain(this.tmp3) - this.R * 1.004) / this.UM;
  }

  // ---------------------------------------------------------------------
  // City plan canvas — streets, blocks, plaza, parks
  // ---------------------------------------------------------------------
  private buildWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pxPerM = 512 / (CITY_HALF * 2);
    const t = this.theme;

    ctx.fillStyle = t?.ground ?? '#10140F';
    ctx.fillRect(0, 0, 512, 512);

    // streets (lighter asphalt)
    ctx.fillStyle = t?.street ?? '#2A3229';
    for (let i = 0; i <= GRID; i++) {
      const p = Math.round(((i - GRID / 2) * BLOCK_PITCH + CITY_HALF) * pxPerM);
      ctx.fillRect(p - 3, 0, 6, 512);
      ctx.fillRect(0, p - 3, 512, 6);
    }
    // blocks (dark ground)
    ctx.fillStyle = t?.ground ?? '#191E18';
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        if (i >= 3 && i <= 4 && j >= 3 && j <= 4) continue; // central plaza
        const x0 = Math.round(((i - GRID / 2) * BLOCK_PITCH + CITY_HALF + 4) * pxPerM);
        const y0 = Math.round(((j - GRID / 2) * BLOCK_PITCH + CITY_HALF + 4) * pxPerM);
        const s = Math.round((BLOCK_HALF - 4) * 2 * pxPerM);
        ctx.fillRect(x0, y0, s, s);
      }
    }
    // park patches
    ctx.fillStyle = t?.park ?? '#142A17';
    for (let k = 0; k < 14; k++) {
      const x = Math.round(Math.random() * 512);
      const y = Math.round(Math.random() * 512);
      const s = 8 + Math.round(Math.random() * 26);
      ctx.fillRect(x, y, s, s);
    }
    // central plaza
    const cx = 256;
    const cy = 256;
    ctx.fillStyle = t?.plaza ?? '#232C24';
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t?.street ?? '#39443A';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = t?.ground ?? '#1B241C';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    // tether mooring ring (north plaza edge)
    ctx.strokeStyle = t?.street ?? '#4A5A4C';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 70, 12, 0, Math.PI * 2);
    ctx.stroke();

    this.windowTexture = new THREE.CanvasTexture(canvas);
    this.windowTexture.wrapS = THREE.RepeatWrapping;
    this.windowTexture.wrapT = THREE.RepeatWrapping;
  }

  private buildGround() {
    const size = CITY_HALF * 2 + 40; // a little apron beyond the grid
    const segs = 48;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      this.tmp.copy(this.frameOrigin);
      this.tmp2.copy(this.axisX).multiplyScalar(x * this.UM);
      this.tmp.add(this.tmp2);
      this.tmp2.copy(this.axisZ).multiplyScalar(z * this.UM);
      this.tmp.add(this.tmp2).normalize();
      const groundU = this.sampleTerrain(this.tmp) + this.UM * 0.35;
      pos.setXYZ(i, x * this.UM, groundU - this.R * 1.004, z * this.UM);
    }
    geo.computeVertexNormals();
    this.groundMat = new THREE.MeshBasicMaterial({
      map: this.windowTexture,
      color: 0xffffff,
    });
    this.groundMesh = new THREE.Mesh(geo, this.groundMat);
    this.groundMesh.renderOrder = 1;
    this.frame.add(this.groundMesh);
  }

  private buildBuildings() {
    const rng = mulberry32(20120);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const maxBuildings = 200;
    this.buildingMat = new THREE.MeshLambertMaterial({
      map: this.windowTexture,
      emissive: new THREE.Color(this.theme?.window ?? '#ffffff'),
      emissiveMap: this.windowTexture,
      emissiveIntensity: 0.12,
    });
    this.buildingMesh = new THREE.InstancedMesh(boxGeo, this.buildingMat, maxBuildings);
    this.buildingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.buildingMesh.frustumCulled = false;

    const m = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const sc = new THREE.Matrix4();
    const tr = new THREE.Matrix4();
    const col = new THREE.Color();
    let placed = 0;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        if (i >= 3 && i <= 4 && j >= 3 && j <= 4) continue; // plaza
        if (i === 5 && j === 3) continue; // tether mooring block
        if (i === 1 && j === 1) continue; // spaceport block
        const cx = (i - GRID / 2) * BLOCK_PITCH;
        const cz = (j - GRID / 2) * BLOCK_PITCH;
        const count = rng() < 0.55 ? 2 : 1;
        for (let k = 0; k < count && placed < maxBuildings; k++) {
          const sw = Math.min(7 + rng() * 8, BLOCK_HALF - 5);
          const sd = Math.min(7 + rng() * 8, BLOCK_HALF - 5);
          const bx = cx + (rng() - 0.5) * (BLOCK_HALF * 2 - sw * 2) * 0.8;
          const bz = cz + (rng() - 0.5) * (BLOCK_HALF * 2 - sd * 2) * 0.8;
          const h = 10 + rng() * rng() * 42;
          const gy = this.groundYAt(bx, bz) + 0.35 + h / 2;
          const yaw = Math.floor(rng() * 2) * (Math.PI / 2);
          tr.makeTranslation(bx * this.UM, gy * this.UM, bz * this.UM);
          rot.makeRotationY(yaw);
          sc.makeScale(sw, h, sd);
          m.copy(tr).multiply(rot).multiply(sc);
          this.buildingMesh.setMatrixAt(placed, m);
          const lum = 0.45 + rng() * 0.4;
          col.setHSL(this.themeHue + rng() * 0.08, 0.12 + rng() * 0.2, lum);
          this.buildingMesh.setColorAt(placed, col);
          this.buildingFootprints.push({ cx: bx, cz: bz, rx: sw / 2, rz: sd / 2, h });
          placed++;
        }
      }
    }
    this.buildingMesh.count = placed;
    this.buildingMesh.instanceMatrix.needsUpdate = true;
    if (this.buildingMesh.instanceColor) this.buildingMesh.instanceColor.needsUpdate = true;
    this.frame.add(this.buildingMesh);

    // street lamps along the main avenues
    const lampCount = 72;
    this.lampMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.03, 0.05, 2.6, 4),
      new THREE.MeshBasicMaterial({ color: 0x9aa89c }),
      lampCount
    );
    this.lampGlow = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.theme?.glow ?? '#ffe8b0'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      lampCount
    );
    const lm = new THREE.Matrix4();
    let lIdx = 0;
    const laneXs = [-96, -48, 0, 48, 96];
    for (let k = 0; k < laneXs.length && lIdx < lampCount; k++) {
      const laneX = laneXs[k];
      for (let z = -160; z <= 160 && lIdx < lampCount; z += 16) {
        const gy = this.groundYAt(laneX, z) + 1.3;
        lm.makeTranslation(laneX * this.UM, gy * this.UM, z * this.UM);
        this.lampMesh.setMatrixAt(lIdx, lm);
        this.lampGlow.setMatrixAt(lIdx, lm);
        this.lampTransforms.push({ x: laneX, z });
        lIdx++;
      }
    }
    this.lampMesh.count = lIdx;
    this.lampGlow.count = lIdx;
    this.lampMesh.instanceMatrix.needsUpdate = true;
    this.lampGlow.instanceMatrix.needsUpdate = true;
    this.frame.add(this.lampMesh, this.lampGlow);
  }

  private buildSails() {
    const count = 8;
    this.sailMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.accent ?? '#d8ffea'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.ConeGeometry(4.5, 14, 4);
    geo.rotateZ(Math.PI / 2);
    this.sailMesh = new THREE.InstancedMesh(geo, this.sailMat, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const x = Math.cos(ang) * 150;
      const z = Math.sin(ang) * 150;
      const gy = this.groundYAt(x, z) + 28;
      m.makeTranslation(x * this.UM, gy * this.UM, z * this.UM);
      this.sailMesh.setMatrixAt(i, m);
    }
    this.sailMesh.instanceMatrix.needsUpdate = true;
    this.frame.add(this.sailMesh);
  }

  // ---------------------------------------------------------------------
  // NPCs — blocky voxel people, pooled across 9 shared InstancedMeshes
  // ---------------------------------------------------------------------
  private buildNpcs() {
    const rng = mulberry32(7741);
    const npcCount = 26;
    const personas = makePersona(npcCount, this.personas.length);

    const headGeo = new THREE.BoxGeometry(0.34, 0.3, 0.3);
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.55, 0.24);
    const armGeo = new THREE.BoxGeometry(0.11, 0.5, 0.11);
    const legGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);

    this.npcPartMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let f = 0; f < 3; f++) {
      const faceTex = this.makeFaceTexture(f);
      const mat = new THREE.MeshBasicMaterial({ map: faceTex });
      this.npcHeadMat.push(mat);
      this.npcParts.push(new THREE.InstancedMesh(headGeo, mat, npcCount));
    }
    for (const g of [torsoGeo, armGeo, armGeo, legGeo, legGeo]) {
      const mesh = new THREE.InstancedMesh(g, this.npcPartMat, npcCount);
      this.npcParts.push(mesh);
    }
    for (const p of this.npcParts) {
      p.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      p.frustumCulled = false;
      this.frame.add(p);
    }

    // Lane generators (meters)
    const lanes: THREE.Vector3[][] = [];
    const straight = (z0: number, z1: number, x: number, invert: boolean) => {
      const pts: THREE.Vector3[] = [];
      const n = 5;
      for (let i = 0; i <= n; i++) {
        pts.push(new THREE.Vector3(x, STREET_Y, z0 + ((z1 - z0) * i) / n));
      }
      return invert ? pts.reverse() : pts;
    };
    lanes.push(straight(-150, 150, 0, false));
    lanes.push(straight(150, -150, 0, true));
    lanes.push(straight(-150, 150, 32, false));
    lanes.push(straight(150, -150, -32, true));
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ring.push(new THREE.Vector3(Math.cos(a) * 64, STREET_Y, Math.sin(a) * 64));
    }
    lanes.push(ring);
    const plaza: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      plaza.push(new THREE.Vector3(Math.cos(a) * 14, STREET_Y, Math.sin(a) * 14));
    }
    lanes.push(plaza);

    for (let i = 0; i < npcCount; i++) {
      const lane = lanes[i % lanes.length];
      const sim: NpcSim = {
        pos: lane[0].clone(),
        dir: new THREE.Vector3(0, 0, 1),
        speed: 0.6 + rng() * 0.9,
        state: 'IDLE',
        walkPhase: rng() * Math.PI * 2,
        idleTimer: rng() * 3,
        waypoints: lane,
        wpIndex: 0,
        face: i % 3,
        persona: personas[i],
        bobSeed: rng() * 10,
      };
      this.npcSims.push(sim);
      // instance colors for tunic/pants/skin
      const tunic = new THREE.Color().setHSL(this.npcHue + rng() * 0.16, 0.35 + rng() * 0.3, 0.4 + rng() * 0.25);
      const pants = new THREE.Color().setHSL(this.npcHue - 0.02 + rng() * 0.1, 0.25, 0.22 + rng() * 0.15);
      const skin = new THREE.Color().setHSL(0.08 + rng() * 0.03, 0.45 + rng() * 0.2, 0.62 + rng() * 0.14);
      const torso = this.npcParts[3];
      const armL = this.npcParts[4];
      const armR = this.npcParts[5];
      const legL = this.npcParts[6];
      const legR = this.npcParts[7];
      torso.setColorAt(i, tunic);
      armL.setColorAt(i, skin);
      armR.setColorAt(i, skin);
      legL.setColorAt(i, pants);
      legR.setColorAt(i, pants);
    }
    this.npcParts.forEach((p) => {
      if (p.instanceColor) p.instanceColor.needsUpdate = true;
    });
  }

  private makeFaceTexture(style: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const skin = ['#E8C49A', '#D9A878', '#C8D8AE'][style];
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#2A2220';
    ctx.fillRect(6, 12, 4, 5);
    ctx.fillRect(22, 12, 4, 5);
    ctx.fillStyle = '#5A4A3A';
    ctx.fillRect(8, 22, 16, 3);
    if (style === 2) {
      ctx.fillStyle = '#2E7D4E';
      ctx.fillRect(0, 0, 32, 6);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // ---------------------------------------------------------------------
  // Robots — drones, maintenance crawlers, security patrol
  // ---------------------------------------------------------------------
  private buildRobots() {
    const droneCount = 8;
    const maintenanceCount = 4;
    const securityCount = 2;

    // drones: hovering globes + beacon glows
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), bodyMat, droneCount);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 4), glowMat, droneCount);
    const m = new THREE.Matrix4();
    for (let i = 0; i < droneCount; i++) {
      const a = (i / droneCount) * Math.PI * 2;
      const r = 40 + (i % 3) * 45;
      const sim: RobotSim = {
        pos: new THREE.Vector3(Math.cos(a) * r, 22 + (i % 4) * 14, Math.sin(a) * r),
        dir: new THREE.Vector3(1, 0, 0),
        speed: 2.5 + (i % 3) * 1.4,
        waypoints: [],
        wpIndex: 0,
        kind: 'drone',
        walkPhase: a,
      };
      this.robotSims.push(sim);
      body.setColorAt(i, new THREE.Color(this.theme?.accent ?? '#9fe8c4'));
    }
    body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    body.frustumCulled = false;
    glow.frustumCulled = false;
    body.setMatrixAt(0, m);
    glow.setMatrixAt(0, m);
    this.robotMeshes.push(body, glow);

    // maintenance crawlers (boxes with wheels implied)
    const crawlerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const crawler = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.18, 0.5), crawlerMat, maintenanceCount);
    const cGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffd080,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cGlow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 4), cGlowMat, maintenanceCount);
    crawler.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crawler.frustumCulled = false;
    cGlow.frustumCulled = false;
    for (let i = 0; i < maintenanceCount; i++) {
      const laneIdx = i % 3;
      const start = new THREE.Vector3(-150 + i * 40, 0.3, [-96, 32, 96][laneIdx]);
      const end = new THREE.Vector3(150 - i * 30, 0.3, [-96, 32, 96][laneIdx]);
      this.robotSims.push({
        pos: start.clone(),
        dir: new THREE.Vector3(1, 0, 0),
        speed: 0.45 + i * 0.15,
        waypoints: [start, end],
        wpIndex: 0,
        kind: 'maintenance',
        walkPhase: i * 2,
      });
      crawler.setColorAt(i, new THREE.Color(0x8a8a90));
    }
    this.robotMeshes.push(crawler, cGlow);

    // security patrol
    const secMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sec = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), secMat, securityCount);
    const secGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff5040,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const secGlow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), secGlowMat, securityCount);
    sec.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    secGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sec.frustumCulled = false;
    secGlow.frustumCulled = false;
    const patrol: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      patrol.push(new THREE.Vector3(Math.cos(a) * 56, 0.3, Math.sin(a) * 56));
    }
    const secPatrol2: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      secPatrol2.push(new THREE.Vector3(96 + Math.cos(a) * 14, 0.3, 96 + Math.sin(a) * 14));
    }
    for (let i = 0; i < securityCount; i++) {
      const wp = i === 0 ? patrol : secPatrol2;
      this.robotSims.push({
        pos: wp[0].clone(),
        dir: new THREE.Vector3(1, 0, 0),
        speed: 1.1,
        waypoints: wp,
        wpIndex: 0,
        kind: 'security',
        walkPhase: 0,
      });
      sec.setColorAt(i, new THREE.Color(0x30363a));
    }
    this.robotMeshes.push(sec, secGlow);
    this.robotMeshes.forEach((r) => {
      if (r.instanceColor) r.instanceColor.needsUpdate = true;
    });
  }

  // ---------------------------------------------------------------------
  // Air traffic — lane-based instanced pods
  // ---------------------------------------------------------------------
  private buildTrafficPods() {
    const podsPerLane = 14;
    const laneDefs = [
      { radius: 70, alt: 30, speed: 9 },
      { radius: 120, alt: 55, speed: 6.5 },
      { radius: 180, alt: 90, speed: 4.5 },
    ];
    this.podMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.accent ?? '#c8ffe0'),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const geo = new THREE.BoxGeometry(2.2, 0.5, 0.5);
    this.podMesh = new THREE.InstancedMesh(geo, this.podMat, podsPerLane * laneDefs.length);
    this.podGlow = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1.0, 6, 4),
      this.podMat,
      podsPerLane * laneDefs.length
    );
    this.podMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.podGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.podMesh.frustumCulled = false;
    this.podGlow.frustumCulled = false;
    const m = new THREE.Matrix4();
    let idx = 0;
    for (let l = 0; l < laneDefs.length; l++) {
      for (let i = 0; i < podsPerLane; i++) {
        const phase = (i / podsPerLane) * Math.PI * 2;
        this.podSims.push({
          origin: new THREE.Vector3(0, laneDefs[l].alt, 0),
          radius: laneDefs[l].radius,
          speed: laneDefs[l].speed,
          phase,
        });
        this.podMesh.setMatrixAt(idx, m);
        this.podGlow.setMatrixAt(idx, m);
        idx++;
      }
    }
    this.podMesh.count = idx;
    this.podGlow.count = idx;
    this.frame.add(this.podMesh, this.podGlow);
  }

  // ---------------------------------------------------------------------
  // The Tether — space elevator rising past the clouds
  // ---------------------------------------------------------------------
  private buildTether() {
    this.tether = new THREE.Group();
    const anchorX = 96;
    const anchorZ = 96;
    const baseY = this.groundYAt(anchorX, anchorZ);
    const tetherLen = 3.1; // scene units — straight up into space
    const colGeo = new THREE.CylinderGeometry(0.0016, 0.0045, tetherLen, 6, 1, true);
    const colMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.theme?.street ?? '#3a4a40'), side: THREE.DoubleSide });
    const column = new THREE.Mesh(colGeo, colMat);
    const stripGeo = new THREE.CylinderGeometry(0.0006, 0.0016, tetherLen, 4, 1, true);
    const stripMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.accent ?? '#d8ffea'),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    column.position.y = baseY * this.UM + tetherLen / 2;
    strip.position.y = baseY * this.UM + tetherLen / 2;
    this.tether.add(column, strip);

    // station at the top
    const station = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    station.position.y = baseY * this.UM + tetherLen + 0.011;
    this.tether.add(station);

    // ascending day-cab
    this.tetherPodMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.glow ?? '#ffe8b0'),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.tetherPod = new THREE.Mesh(new THREE.BoxGeometry(0.0026, 0.004, 0.0026), this.tetherPodMat);
    this.tether.add(this.tetherPod);

    // mooring ring at the base
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.006, 0.0009, 6, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(this.theme?.street ?? '#5a6a5c'), side: THREE.DoubleSide })
    );
    ring.position.y = baseY * this.UM;
    ring.rotation.x = Math.PI / 2;
    this.tether.add(ring);
    this.tether.position.set(anchorX * this.UM, 0, anchorZ * this.UM);
    this.frame.add(this.tether);
  }

  // ---------------------------------------------------------------------
  // Spaceport — pads, parked shuttles, launching traffic
  // ---------------------------------------------------------------------
  private buildSpaceport() {
    const padMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.theme?.street ?? '#2a3229') });
    const padRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.accent ?? '#9fe8c4'),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pads = [
      { x: -140, z: -140 },
      { x: -116, z: -140 },
      { x: -140, z: -116 },
    ];
    const padGeo = new THREE.CylinderGeometry(9, 9, 0.15, 20);
    const ringGeo = new THREE.TorusGeometry(8.5, 0.5, 6, 24);
    for (const p of pads) {
      const gy = this.groundYAt(p.x, p.z) + 0.2;
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(p.x * this.UM, gy * this.UM, p.z * this.UM);
      this.frame.add(pad);
      const ring = new THREE.Mesh(ringGeo, padRingMat);
      ring.position.copy(pad.position).addScaledVector(new THREE.Vector3(0, 1, 0), 0.2 * this.UM);
      ring.rotation.x = Math.PI / 2;
      this.frame.add(ring);
      if (pads.indexOf(p) < 2) {
        const shuttle = this.makeShuttle();
        shuttle.position.copy(pad.position).addScaledVector(new THREE.Vector3(0, 1, 0), 1.4 * this.UM);
        shuttle.rotation.y = Math.PI / 2;
        this.parkedShuttles.push(shuttle);
        this.frame.add(shuttle);
      }
    }
    this.shuttle = this.makeShuttle();
    this.shuttle.visible = false;
    this.frame.add(this.shuttle);
  }

  private shuttleGlowMat!: THREE.MeshBasicMaterial;
  private makeShuttle(): THREE.Group {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xd8e8de })
    );
    hull.position.x = 0;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 2.6),
      new THREE.MeshLambertMaterial({ color: 0x9ab8aa })
    );
    wing.position.y = -0.32;
    if (!this.shuttleGlowMat) {
      this.shuttleGlowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.theme?.accent ?? '#b8ffe0'),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), this.shuttleGlowMat);
    glow.position.y = -0.6;
    g.add(hull, wing, glow);
    g.scale.setScalar(this.UM);
    return g;
  }

  // ---------------------------------------------------------------------
  // Ground mist + plaza fountain
  // ---------------------------------------------------------------------
  private buildMist() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const mistCol = new THREE.Color(this.theme?.accent ?? '#BEEBD2');
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, `rgba(${Math.round(mistCol.r * 255)},${Math.round(mistCol.g * 255)},${Math.round(mistCol.b * 255)},0.55)`);
      grad.addColorStop(1, `rgba(${Math.round(mistCol.r * 255)},${Math.round(mistCol.g * 255)},${Math.round(mistCol.b * 255)},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    this.mistTex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: this.mistTex,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spots = [
      { x: 0, z: 0, s: 34 },
      { x: 60, z: 40, s: 30 },
      { x: -70, z: -30, s: 26 },
      { x: 96, z: 96, s: 22 },
      { x: -110, z: 80, s: 24 },
    ];
    for (const s of spots) {
      const gy = this.groundYAt(s.x, s.z) + 0.8;
      const spr = new THREE.Sprite(mat);
      spr.position.set(s.x * this.UM, gy * this.UM, s.z * this.UM);
      spr.scale.setScalar(s.s * this.UM);
      this.mistSprites.push(spr);
      this.frame.add(spr);
    }
    // fountain
    const fMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.theme?.accent ?? '#9fe8c4'),
      transparent: true,
      opacity: 0.6,
    });
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 1.6, 12), fMat);
    const gy = this.groundYAt(0, 0) + 0.8;
    fountain.position.set(0, gy * this.UM, 0);
    this.frame.add(fountain);
  }

  // ---------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------
  public update(time: number, dt: number, nightFactor: number, camera: THREE.Camera) {
    if (this.disposed) return;
    this.time = time;
    this.frame.updateWorldMatrix(true, false);

    // Sun light follows the day/night cycle
    const day = 1.0 - nightFactor;
    this.light.intensity = 0.12 + day * 1.15;

    // Building windows: dim by day, lit by night
    this.buildingMat.emissiveIntensity = 0.1 + nightFactor * 1.05;
    this.lampGlowMat.opacity = 0.18 + nightFactor * 0.8;
    this.lampMat.color.setScalar(0.5 + day * 0.5);
    this.groundMat.color.setScalar(0.45 + day * 0.62);

    // camera in frame-local space (meters)
    this.tmp.copy(camera.position);
    this.frame.worldToLocal(this.tmp);
    const camMeters = this.tmp.clone().multiplyScalar(1 / this.UM);

    this.updateNpcs(dt, camMeters);
    this.updateRobots(dt, nightFactor);
    this.updatePods(time);
    this.updateTether(time);
    this.updateShuttle(dt, nightFactor);
    this.updateMist(time);
  }

  private updateNpcs(dt: number, camMeters: THREE.Vector3) {
    const torso = this.npcParts[3];
    const armL = this.npcParts[4];
    const armR = this.npcParts[5];
    const legL = this.npcParts[6];
    const legR = this.npcParts[7];
    const m = new THREE.Matrix4();
    const ry = new THREE.Matrix4();
    const ty = new THREE.Matrix4();
    const rx = new THREE.Matrix4();
    const sx = new THREE.Matrix4().makeScale(this.UM, this.UM, this.UM);

    for (let i = 0; i < this.npcSims.length; i++) {
      const npc = this.npcSims[i];
      const head = this.npcParts[npc.face];

      // waypoint steering
      if (npc.state === 'WALKING') {
        const wp = npc.waypoints[npc.wpIndex];
        const dx = wp.x - npc.pos.x;
        const dz = wp.z - npc.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.4) {
          npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
          if (Math.random() < 0.3) {
            npc.state = 'IDLE';
            npc.idleTimer = 1 + Math.random() * 4;
          }
        } else {
          const step = Math.min(npc.speed * dt, dist);
          npc.pos.x += (dx / dist) * step;
          npc.pos.z += (dz / dist) * step;
          npc.dir.set(dx / dist, 0, dz / dist);
          npc.walkPhase += dt * npc.speed * 2.6;
        }
      } else if (npc.state === 'IDLE') {
        npc.idleTimer -= dt;
        if (npc.idleTimer <= 0) npc.state = 'WALKING';
      } else if (npc.state === 'WORKING') {
        npc.walkPhase += dt * 1.4;
      }

      // look at the player when close
      const pdx = camMeters.x - npc.pos.x;
      const pdz = camMeters.z - npc.pos.z;
      const pdist = Math.sqrt(pdx * pdx + pdz * pdz);
      if (pdist < 5) {
        npc.dir.set(pdx / (pdist || 1), 0, pdz / (pdist || 1)).normalize();
        if (npc.state === 'WALKING' && pdist < 2.2) npc.state = 'IDLE';
      }

      // gentle bob
      const bob = npc.state === 'WALKING' ? Math.sin(npc.walkPhase) * 0.02 : Math.sin(this.time * 1.6 + npc.bobSeed) * 0.008;
      const yaw = Math.atan2(npc.dir.x, npc.dir.z);
      const gy = this.groundYAt(npc.pos.x, npc.pos.z) + 0.05;
      const headY = gy + 1.48;
      const swing = npc.state === 'WALKING' ? Math.sin(npc.walkPhase) * 0.55 : 0;

      // head (face toward player / walk dir)
      ry.makeRotationY(yaw);
      ty.makeTranslation(npc.pos.x * this.UM, headY * this.UM, npc.pos.z * this.UM);
      m.copy(ty).multiply(ry).multiply(sx);
      head.setMatrixAt(i, m);

      const writePart = (mesh: THREE.InstancedMesh, offY: number, swingX: number) => {
        ry.makeRotationY(yaw);
        ty.makeTranslation(npc.pos.x * this.UM, (gy + offY + bob) * this.UM, npc.pos.z * this.UM);
        rx.makeRotationX(swingX);
        m.copy(ty).multiply(ry).multiply(rx).multiply(sx);
        mesh.setMatrixAt(i, m);
      };
      writePart(torso, 0.55, 0);
      writePart(armL, 1.05, -swing);
      writePart(armR, 1.05, swing);
      writePart(legL, 0.26, swing);
      writePart(legR, 0.26, -swing);
    }
    for (const p of this.npcParts) {
      p.instanceMatrix.needsUpdate = true;
    }
  }

  private updateRobots(dt: number, nightFactor: number) {
    const m = new THREE.Matrix4();
    const ry = new THREE.Matrix4();
    const ty = new THREE.Matrix4();
    const sx = new THREE.Matrix4().makeScale(this.UM, this.UM, this.UM);

    for (let i = 0; i < this.robotSims.length; i++) {
      const r = this.robotSims[i];
      if (r.waypoints.length > 0) {
        const wp = r.waypoints[r.wpIndex];
        const dx = wp.x - r.pos.x;
        const dz = wp.z - r.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.5) {
          r.wpIndex = (r.wpIndex + 1) % r.waypoints.length;
        } else {
          const step = Math.min(r.speed * dt, dist);
          r.pos.x += (dx / dist) * step;
          r.pos.z += (dz / dist) * step;
          r.dir.set(dx / dist, 0, dz / dist);
          r.walkPhase += dt * r.speed;
        }
      } else {
        // free orbiter (drone lanes)
        r.walkPhase += dt * r.speed * 0.35;
        r.pos.x = Math.cos(r.walkPhase) * r.pos.x;
        r.pos.z = Math.sin(r.walkPhase) * r.pos.z;
      }
    }

    // drones: spherical sweep
    const droneSims = this.robotSims.filter((r) => r.kind === 'drone');
    const droneMesh = this.robotMeshes[0];
    const droneGlow = this.robotMeshes[1];
    for (let i = 0; i < droneSims.length; i++) {
      const d = droneSims[i];
      d.walkPhase += dt * d.speed * 0.012;
      const rad = 40 + (i % 3) * 45;
      const alt = 22 + (i % 4) * 14;
      d.pos.set(Math.cos(d.walkPhase) * rad, alt + Math.sin(this.time * 1.1 + i) * 0.4, Math.sin(d.walkPhase) * rad);
      const yaw = Math.atan2(-Math.sin(d.walkPhase), Math.cos(d.walkPhase));
      ry.makeRotationY(yaw);
      ty.makeTranslation(d.pos.x * this.UM, d.pos.y * this.UM, d.pos.z * this.UM);
      m.copy(ty).multiply(ry).multiply(sx);
      droneMesh.setMatrixAt(i, m);
      droneGlow.setMatrixAt(i, m);
    }
    droneMesh.instanceMatrix.needsUpdate = true;
    droneGlow.instanceMatrix.needsUpdate = true;
    (droneGlow.material as THREE.MeshBasicMaterial).opacity = 0.25 + nightFactor * 0.6;

    // maintenance crawlers + security
    const crawlerSims = this.robotSims.filter((r) => r.kind === 'maintenance');
    const crawler = this.robotMeshes[2];
    const cGlow = this.robotMeshes[3];
    const secSims = this.robotSims.filter((r) => r.kind === 'security');
    const sec = this.robotMeshes[4];
    const secGlow = this.robotMeshes[5];

    const writeBot = (mesh: THREE.InstancedMesh, r: RobotSim, lift: number, wobble: number) => {
      const yaw = Math.atan2(r.dir.x, r.dir.z);
      const gy = this.groundYAt(r.pos.x, r.pos.z) + lift + Math.sin(this.time * 2.4 + wobble) * 0.008;
      ry.makeRotationY(yaw);
      ty.makeTranslation(r.pos.x * this.UM, gy * this.UM, r.pos.z * this.UM);
      m.copy(ty).multiply(ry).multiply(sx);
      mesh.setMatrixAt(mesh === crawler ? crawlerSims.indexOf(r) : secSims.indexOf(r), m);
    };
    for (let i = 0; i < crawlerSims.length; i++) {
      writeBot(crawler, crawlerSims[i], 0.3, i);
    }
    for (let i = 0; i < secSims.length; i++) {
      writeBot(sec, secSims[i], 0.3, i * 1.7);
    }
    crawler.instanceMatrix.needsUpdate = true;
    sec.instanceMatrix.needsUpdate = true;
    cGlow.instanceMatrix.needsUpdate = true;
    secGlow.instanceMatrix.needsUpdate = true;
    (cGlow.material as THREE.MeshBasicMaterial).opacity = 0.3 + nightFactor * 0.45;
    (secGlow.material as THREE.MeshBasicMaterial).opacity = 0.4 + nightFactor * 0.5;
  }

  private updatePods(time: number) {
    const m = new THREE.Matrix4();
    const ty = new THREE.Matrix4();
    const ry = new THREE.Matrix4();
    for (let i = 0; i < this.podSims.length; i++) {
      const p = this.podSims[i];
      const a = p.phase + time * p.speed * 0.05;
      const x = Math.cos(a) * p.radius;
      const z = Math.sin(a) * p.radius;
      const yaw = Math.atan2(Math.sin(a), Math.cos(a));
      ty.makeTranslation(x * this.UM, p.origin.y * this.UM, z * this.UM);
      ry.makeRotationY(yaw + Math.PI / 2);
      m.copy(ty).multiply(ry);
      this.podMesh.setMatrixAt(i, m);
      this.podGlow.setMatrixAt(i, m);
    }
    this.podMesh.instanceMatrix.needsUpdate = true;
    this.podGlow.instanceMatrix.needsUpdate = true;
  }

  private updateTether(time: number) {
    const baseY = this.groundYAt(96, 96);
    const up = 0.3 + ((Math.sin(time * 0.16) * 0.5 + 0.5) * 2.0);
    this.tetherPod.position.y = baseY * this.UM + up;
  }

  private updateShuttle(dt: number, nightFactor: number) {
    this.shuttleTimer -= dt;
    if (this.shuttleState === 'parked' && this.shuttleTimer <= 0) {
      this.shuttleState = 'launch';
      this.shuttle.visible = true;
      if (this.parkedShuttles[0]) {
        this.shuttle.position.copy(this.parkedShuttles[0].position);
      } else {
        this.shuttle.position.set(-140 * this.UM, this.groundYAt(-140, -140) * this.UM, -140 * this.UM);
      }
      this.shuttle.rotation.y = Math.PI / 2;
      this.shuttleProgress = 0;
    } else if (this.shuttleState === 'launch') {
      this.shuttleProgress += dt / 7;
      if (this.shuttleProgress >= 1) {
        this.shuttleState = 'climb';
        this.shuttleProgress = 0;
      }
    } else if (this.shuttleState === 'climb') {
      this.shuttleProgress += dt / 3;
      if (this.shuttleProgress >= 1) {
        this.shuttleState = 'parked';
        this.shuttle.visible = false;
        this.shuttleTimer = 12 + Math.random() * 6;
      }
    }
    if (this.shuttleState !== 'parked') {
      const t = this.shuttleProgress;
      const alt = t * 2.6;
      this.shuttle.position.y += alt;
      this.shuttle.position.x += t * 0.02;
      this.shuttle.rotation.x = t * 0.7;
    }
    this.shuttleGlowMat.opacity = 0.5 + nightFactor * 0.5;
  }
  private shuttleProgress = 0;

  private updateMist(time: number) {
    for (let i = 0; i < this.mistSprites.length; i++) {
      const s = this.mistSprites[i];
      s.position.y += Math.sin(time * 0.5 + i * 1.7) * 0.35 * this.UM;
    }
  }

  // ---------------------------------------------------------------------
  // Interaction — walkable interactables (NPCs, robots, structures)
  // ---------------------------------------------------------------------
  private buildInteractables(): CivilInteractable[] {
    const out: CivilInteractable[] = [];

    for (let i = 0; i < this.npcSims.length; i++) {
      const npc = this.npcSims[i];
      this.npcWorldPos.set(
        npc.pos.x * this.UM,
        (this.groundYAt(npc.pos.x, npc.pos.z) + 1.0) * this.UM,
        npc.pos.z * this.UM
      );
      this.frame.localToWorld(this.npcWorldPos);
      const persona = this.personas[npc.persona % this.personas.length];
      out.push({
        kind: 'npc',
        id: `npc-${i}`,
        name: persona.name,
        title: persona.title,
        prompt: 'TALK',
        dialogue: persona.lines,
        position: this.npcWorldPos.clone(),
      });
    }

    const dronePersona =
      this.personas.find((p) => p.title === 'Delivery Drone') ??
      this.personas[Math.min(4, this.personas.length - 1)];
    const securityPersona = this.personas.find((p) => p.title === 'Security Patrol Unit');
    const robotLines = {
      drone: {
        name: dronePersona?.name ?? 'Jot',
        title: 'Delivery Drone',
        lines: dronePersona?.lines ?? PERSONAS[4].lines,
      },
      security: {
        name: securityPersona?.name ?? 'KR-77',
        title: 'Security Patrol Unit',
        lines: securityPersona?.lines ?? [
          'Patrol complete. Perimeter calm. Continue your evening, citizen.',
          'My sensors read one anomaly: you. Welcome to Emeria.',
        ],
      },
    };
    for (const r of this.robotSims) {
      const def = robotLines[r.kind as 'drone' | 'security'];
      if (!def) continue;
      this.npcWorldPos.set(
        r.pos.x * this.UM,
        (this.groundYAt(r.pos.x, r.pos.z) + 0.6) * this.UM,
        r.pos.z * this.UM
      );
      this.frame.localToWorld(this.npcWorldPos);
      out.push({
        kind: 'robot',
        id: `robot-${r.kind}`,
        name: def.name,
        title: def.title,
        prompt: 'TALK',
        dialogue: def.lines,
        position: this.npcWorldPos.clone(),
      });
    }

    const structures: { x: number; z: number; def: StructureDef }[] = [
      { x: 96, z: 96, def: this.structures[0] },
      { x: -140, z: -140, def: this.structures[1] },
      { x: 0, z: 0, def: this.structures[2] },
    ];
    for (const s of structures) {
      this.npcWorldPos.set(
        s.x * this.UM,
        (this.groundYAt(s.x, s.z) + 1.0) * this.UM,
        s.z * this.UM
      );
      this.frame.localToWorld(this.npcWorldPos);
      out.push({
        kind: 'structure',
        id: s.def.id,
        name: s.def.name,
        title: s.def.title,
        prompt: 'INSPECT',
        dialogue: s.def.lines,
        position: this.npcWorldPos.clone(),
      });
    }

    return out;
  }

  public getInteractable(id: string): CivilInteractable | null {
    return this.buildInteractables().find((i) => i.id === id) ?? null;
  }

  public raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDistM: number): CivilInteractable | null {
    let best: CivilInteractable | null = null;
    let bestDist = maxDistM;
    const interactables = this.buildInteractables();
    for (const item of interactables) {
      this.tmp.copy(item.position).sub(origin);
      const along = this.tmp.dot(dir);
      if (along < 0 || along > bestDist) continue;
      this.tmp2.copy(dir).multiplyScalar(along);
      this.tmp3.copy(item.position).sub(origin).sub(this.tmp2);
      const radiusM = item.kind === 'structure' ? 8 : item.kind === 'robot' ? 0.5 : 0.42;
      if (this.tmp3.length() < radiusM) {
        bestDist = along;
        best = item;
      }
    }
    return best;
  }

  /** Push a player position (frame-local x/z meters) out of building footprints. */
  public collidePlayer(localPos: THREE.Vector3): void {
    const r = 0.5;
    for (let i = 0; i < this.buildingFootprints.length; i++) {
      const b = this.buildingFootprints[i];
      const dx = Math.abs(localPos.x - b.cx);
      const dz = Math.abs(localPos.z - b.cz);
      if (dx < b.rx + r && dz < b.rz + r) {
        const ox = b.rx + r - dx;
        const oz = b.rz + r - dz;
        if (ox < oz) localPos.x += localPos.x < b.cx ? -ox : ox;
        else localPos.z += localPos.z < b.cz ? -oz : oz;
      }
    }
  }

  public worldToCity(world: THREE.Vector3, out: THREE.Vector3): void {
    this.frame.updateWorldMatrix(true, false);
    this.frame.worldToLocal(out.copy(world));
    out.multiplyScalar(1 / this.UM);
  }

  public cityToWorld(city: THREE.Vector3, out: THREE.Vector3): void {
    this.frame.updateWorldMatrix(true, false);
    out.set(city.x * this.UM, city.y * this.UM, city.z * this.UM);
    this.frame.localToWorld(out);
  }

  /** Freeze / release an NPC so they stand still and face the player. */
  public setInteractionFocus(id: string | null) {
    for (let i = 0; i < this.npcSims.length; i++) {
      const npc = this.npcSims[i];
      if (id === `npc-${i}`) {
        if (npc.state !== 'TALKING') {
          npc.state = 'TALKING';
          npc.idleTimer = 999;
        }
      } else if (npc.state === 'TALKING') {
        npc.state = 'IDLE';
        npc.idleTimer = 0;
      }
    }
  }

  public getParticleCount(): number {
    return (
      this.buildingMesh.count +
      this.npcSims.length * 8 +
      this.robotSims.length +
      this.podSims.length * 2 +
      this.lampMesh.count * 2 +
      16
    );
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.frame.parent?.remove(this.frame);
    const geoms: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    this.frame.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) geoms.push(m.geometry);
      if (m.material) {
        const arr = Array.isArray(m.material) ? m.material : [m.material];
        mats.push(...arr);
      }
    });
    for (const g of geoms) g.dispose();
    for (const mt of mats) mt.dispose();
    this.windowTexture.dispose();
    this.mistTex.dispose();
    this.npcHeadMat.forEach((mt) => mt.map?.dispose());
    this.light.dispose();
  }
}
