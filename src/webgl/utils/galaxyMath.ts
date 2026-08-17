// Procedural Galaxy Generation Mathematics

export interface ParticleAttributes {
  positions: Float32Array;
  sizes: Float32Array;
  scales: Float32Array;
  randomness: Float32Array;
  phases: Float32Array;
  branches: Float32Array;
  distances: Float32Array;
  layers: Float32Array;
  coreTypes: Float32Array;
}

// Pseudo-random Gaussian / Normal distribution generator
function randomGaussian(mean = 0, stdev = 1): number {
  const u1 = 1.0 - Math.random();
  const u2 = 1.0 - Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdev * randStdNormal;
}

// Simple 2D hash noise for filament gap placement (CPU-side)
function hashNoise2D(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  n = n - Math.floor(n);
  return n;
}

export function generateGalaxyParticles(
  count: number,
  spiralTightness = 3.2
): ParticleAttributes {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const scales = new Float32Array(count);
  const randomness = new Float32Array(count);
  const phases = new Float32Array(count);
  const branches = new Float32Array(count);
  const distances = new Float32Array(count);
  const layers = new Float32Array(count);
  const coreTypes = new Float32Array(count);

  const numArms = 2;
  const maxRadius = 38.0;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const p = Math.random();
    let layer = 1;
    let radius = 0;
    let branch = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    let size = 1.0;
    let coreType = -1.0; // -1 = not a core particle

    if (p < 0.22) {
      // -------------------------------------------------------------
      // LAYER 0: Dense Galactic Core (22% of particles)
      // Sub-classified into 4 populations for multi-scale detail
      // -------------------------------------------------------------
      layer = 0;
      branch = 2.0; // Core indicator

      const subType = Math.random();

      if (subType < 0.75) {
        // ----- MICRO DUST (75% of core) -----
        // Extremely fine particles — the bulk of visible core structure
        coreType = 0.0;

        // Biased distribution: concentrate in 0.10R–0.45R band
        // Use a mix of distributions to avoid dead-center clustering
        const rRand = Math.random();
        if (rRand < 0.15) {
          // Some particles at very center (tiny hot region)
          radius = Math.pow(Math.random(), 3.0) * 1.5;
        } else if (rRand < 0.80) {
          // Bulk in the inner-middle band
          radius = 0.8 + Math.pow(Math.random(), 1.4) * 4.5;
        } else {
          // Transition zone toward arms
          radius = 3.5 + Math.pow(Math.random(), 1.1) * 3.0;
        }

        const angle = Math.random() * Math.PI * 2.0;
        const vSpread = 0.2 + radius * 0.12;
        y = randomGaussian(0, vSpread);
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;

        // Smaller sizes closer to center — creates fine detail
        const distFactor = Math.min(radius / 5.5, 1.0);
        size = 0.25 + distFactor * 0.45 + Math.random() * 0.3;

      } else if (subType < 0.90) {
        // ----- SMALL LUMINOUS (15% of core) -----
        // Slightly brighter, moderate-sized particles providing glow structure
        coreType = 1.0;

        radius = Math.pow(Math.random(), 1.8) * 5.5;
        const angle = Math.random() * Math.PI * 2.0;
        const vSpread = 0.3 + radius * 0.14;
        y = randomGaussian(0, vSpread);
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;

        const distFactor = Math.min(radius / 5.5, 1.0);
        size = 0.5 + distFactor * 0.5 + Math.random() * 0.4;

      } else if (subType < 0.97) {
        // ----- FILAMENT PARTICLES (7% of core) -----
        // Placed along nested spiral curves with turbulence for organic filaments
        coreType = 2.0;

        // Pick one of several nested filament spirals (different tightness values)
        const filamentArm = Math.floor(Math.random() * 5); // 5 nested filaments
        const armTightness = 1.8 + filamentArm * 0.9; // Varying curvature
        const armPhaseOffset = filamentArm * (Math.PI * 2.0 / 5.0) + filamentArm * 0.3;

        // Distribute along the filament with some radial variation
        radius = 0.5 + Math.pow(Math.random(), 1.3) * 5.0;
        const spiralAngle = armPhaseOffset + Math.log(radius * 0.5 + 1.0) * armTightness;

        // Add controlled turbulence — not perfect mathematical circles
        const turbulence = randomGaussian(0, 0.15 + radius * 0.04);
        const totalAngle = spiralAngle + turbulence;

        x = Math.cos(totalAngle) * radius;
        z = Math.sin(totalAngle) * radius * 0.92;

        // Thin vertical spread for filaments
        y = randomGaussian(0, 0.15 + radius * 0.06);

        // Some filaments are broken — skip occasional segments via noise
        const gapNoise = hashNoise2D(radius * 3.7, filamentArm * 11.3);
        if (gapNoise < 0.20) {
          // Push broken segment particles slightly off-filament
          x += randomGaussian(0, 0.4);
          z += randomGaussian(0, 0.4);
        }

        size = 0.35 + Math.random() * 0.45;

      } else {
        // ----- ENERGY KNOTS (3% of core) -----
        // Tiny irregular bright clusters at noise-determined positions
        coreType = 3.0;

        // Position at noise-irregular locations (not evenly distributed)
        const knotAngle = Math.random() * Math.PI * 2.0;
        const knotBase = 0.8 + Math.pow(Math.random(), 1.5) * 4.0;

        // Noise-based displacement to break regularity
        const noiseX = hashNoise2D(knotAngle * 7.0, knotBase * 3.0) - 0.5;
        const noiseZ = hashNoise2D(knotBase * 5.0, knotAngle * 11.0) - 0.5;
        radius = knotBase + noiseX * 1.2;

        x = Math.cos(knotAngle) * radius + noiseX * 0.8;
        z = Math.sin(knotAngle) * radius * 0.92 + noiseZ * 0.8;
        y = randomGaussian(0, 0.2 + radius * 0.08);

        // Knots are slightly larger and brighter than dust
        size = 0.7 + Math.random() * 0.8;
      }

    } else if (p < 0.78) {
      // -------------------------------------------------------------
      // LAYER 1 & 2: Spiral Arms & Accretion Vortex (56% of particles)
      // -------------------------------------------------------------
      const isInner = p < 0.52;
      layer = isInner ? 1 : 2;

      // Radial distribution from core outwards
      const rMin = 2.5;
      const rMax = isInner ? 22.0 : maxRadius;
      radius = rMin + Math.pow(Math.random(), 1.2) * (rMax - rMin);

      // Choose arm (0 = Warm Magenta/Pink arm, 1 = Electric Blue arm)
      // Add slight asymmetric weighting (one arm slightly longer and denser)
      const armIndex = Math.random() < 0.52 ? 0 : 1;
      branch = armIndex;

      // Logarithmic spiral angle calculation
      const armOffset = (armIndex * Math.PI * 2.0) / numArms;
      // Asymmetric curvature modulation
      const curvature = spiralTightness * (armIndex === 0 ? 1.05 : 0.95);
      const spiralAngle = Math.log(radius * 0.4 + 1.0) * curvature;
      
      // Dispersion and organic spread away from central arm spine
      const dispersion = Math.pow(radius / maxRadius, 0.8) * (isInner ? 1.2 : 2.6);
      const randAngle = randomGaussian(0, 0.28 * dispersion);
      const totalAngle = armOffset + spiralAngle + randAngle;

      // Elliptical shape deformation
      const ellipX = 1.12;
      const ellipZ = 0.88;
      x = Math.cos(totalAngle) * radius * ellipX;
      z = Math.sin(totalAngle) * radius * ellipZ;

      // Vertical thickness flaring with radius
      const verticalThickness = 0.4 + (radius / maxRadius) * 2.2;
      y = randomGaussian(0, verticalThickness * 0.4);

      size = 0.8 + Math.random() * 1.4;
    } else if (p < 0.90) {
      // -------------------------------------------------------------
      // LAYER 3: Energy Streams & Curved Magnetic Plasma (12% of particles)
      // -------------------------------------------------------------
      layer = 3;
      radius = 4.0 + Math.random() * (maxRadius * 0.85);
      const streamIndex = Math.random() < 0.5 ? 0 : 1;
      branch = streamIndex;

      // Arcing trajectory
      const arcAngle = (streamIndex * Math.PI) + (radius * 0.12) + randomGaussian(0, 0.4);
      x = Math.cos(arcAngle) * radius * 1.05;
      z = Math.sin(arcAngle) * radius * 0.95;

      // Stream vertical arc
      y = Math.sin(radius * 0.25) * 2.5 + randomGaussian(0, 0.8);
      size = 1.0 + Math.random() * 1.6;
    } else {
      // -------------------------------------------------------------
      // LAYER 4: Outer Atmospheric Dust & Halo (10% of particles)
      // -------------------------------------------------------------
      layer = 4;
      radius = 8.0 + Math.random() * (maxRadius * 1.35);
      const angle = Math.random() * Math.PI * 2.0;

      x = Math.cos(angle) * radius * 1.1;
      z = Math.sin(angle) * radius * 0.9;
      y = randomGaussian(0, 2.5 + (radius / maxRadius) * 3.5);

      branch = 3.0; // Halo indicator
      size = 0.5 + Math.random() * 0.7;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    sizes[i] = size;
    scales[i] = 0.5 + Math.random() * 0.9;
    randomness[i] = Math.random();
    phases[i] = Math.random() * Math.PI * 2.0;
    branches[i] = branch;
    distances[i] = Math.min(radius / maxRadius, 1.0);
    layers[i] = layer;
    coreTypes[i] = coreType;
  }

  return {
    positions,
    sizes,
    scales,
    randomness,
    phases,
    branches,
    distances,
    layers,
    coreTypes,
  };
}

export function generateNebulaParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Palette presets for nebula clouds (Dark Violet, Magenta, Electric Blue)
  const nebulaColors = [
    [0.15, 0.07, 0.24], // Deep violet
    [0.45, 0.15, 0.65], // Rich purple
    [0.75, 0.25, 0.85], // Magenta
    [0.18, 0.35, 0.85], // Electric blue
    [0.08, 0.20, 0.55], // Deep ocean blue
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 6.0 + Math.pow(Math.random(), 1.1) * 36.0;
    const angle = Math.random() * Math.PI * 2.0;

    positions[i3] = Math.cos(angle) * radius * 1.15;
    positions[i3 + 1] = randomGaussian(0, 3.5);
    positions[i3 + 2] = Math.sin(angle) * radius * 0.85;

    sizes[i] = 25.0 + Math.random() * 45.0;
    phases[i] = Math.random() * Math.PI * 2.0;

    const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
    colors[i3] = col[0];
    colors[i3 + 1] = col[1];
    colors[i3 + 2] = col[2];
  }

  return { positions, sizes, phases, colors };
}

export function generateStarfieldParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkleSpeeds = new Float32Array(count);
  const twinklePhases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const starTints = [
    [1.0, 1.0, 1.0],       // Pure white
    [0.85, 0.90, 1.0],     // White-blue
    [0.70, 0.80, 1.0],     // Ice blue
    [1.0, 0.90, 0.80],     // Soft warm yellow-white
    [0.95, 0.80, 1.0],     // Faint violet-white
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Distribute on deep spherical shell
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 80.0 + Math.random() * 120.0;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.6 + Math.random() * 1.4;
    twinkleSpeeds[i] = 0.5 + Math.random() * 2.5;
    twinklePhases[i] = Math.random() * Math.PI * 2.0;

    const tint = starTints[Math.floor(Math.random() * starTints.length)];
    colors[i3] = tint[0];
    colors[i3 + 1] = tint[1];
    colors[i3 + 2] = tint[2];
  }

  return { positions, sizes, twinkleSpeeds, twinklePhases, colors };
}
