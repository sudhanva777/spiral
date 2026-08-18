// Procedural Galaxy Generation Mathematics — Universal 16-Galaxy Volumetric Engine
import type { GalaxyConfig } from '../../types/universe';
import { GALAXY_01_CONFIG } from '../galaxies/registry';

export interface ParticleAttributes {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  scales: Float32Array;
  randomness: Float32Array;
  phases: Float32Array;
  branches: Float32Array;
  distances: Float32Array;
  layers: Float32Array;
  coreTypes: Float32Array;
  luminosities: Float32Array;
}

function randomGaussian(mean = 0, stdev = 1): number {
  const u1 = 1.0 - Math.random();
  const u2 = 1.0 - Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdev * randStdNormal;
}

function hashNoise2D(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  n = n - Math.floor(n);
  return n;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
}

function mixRgb(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    c1[0] + (c2[0] - c1[0]) * clampedT,
    c1[1] + (c2[1] - c1[1]) * clampedT,
    c1[2] + (c2[2] - c1[2]) * clampedT,
  ];
}

/**
 * Multi-tier particle population hierarchy generator:
 * 70% micro-dust (dim, granular scale texture)
 * 20% normal main-sequence stars
 * 7% bright stars & dense clusters
 * 2% very bright star-forming knots
 * 1% exceptionally luminous supergiants & core objects
 */
function getHierarchicalParticleProfile(): { size: number; luminosity: number; isCluster: boolean } {
  const rand = Math.random();
  if (rand < 0.70) {
    return {
      size: 0.35 + Math.random() * 0.35,
      luminosity: 0.35 + Math.random() * 0.30,
      isCluster: false,
    };
  } else if (rand < 0.90) {
    return {
      size: 0.85 + Math.random() * 0.45,
      luminosity: 0.80 + Math.random() * 0.45,
      isCluster: false,
    };
  } else if (rand < 0.97) {
    return {
      size: 1.45 + Math.random() * 0.65,
      luminosity: 1.65 + Math.random() * 0.75,
      isCluster: true,
    };
  } else if (rand < 0.99) {
    return {
      size: 2.20 + Math.random() * 0.85,
      luminosity: 2.80 + Math.random() * 1.10,
      isCluster: true,
    };
  } else {
    return {
      size: 3.20 + Math.random() * 1.20,
      luminosity: 4.50 + Math.random() * 2.00,
      isCluster: true,
    };
  }
}

/**
 * Universal procedural galaxy generator producing rich, dense, volumetric galactic structures for all 16 galaxies.
 */
export function generateGalaxyParticles(
  count: number,
  configOrTightness: GalaxyConfig | number = GALAXY_01_CONFIG
): ParticleAttributes {
  const config: GalaxyConfig =
    typeof configOrTightness === 'number'
      ? GALAXY_01_CONFIG
      : configOrTightness;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const scales = new Float32Array(count);
  const randomness = new Float32Array(count);
  const phases = new Float32Array(count);
  const branches = new Float32Array(count);
  const distances = new Float32Array(count);
  const layers = new Float32Array(count);
  const coreTypes = new Float32Array(count);
  const luminosities = new Float32Array(count);

  const morphologyType = config.morphology.type;
  const numArms = config.morphology.armCount || 2;
  const spiralTightness = config.morphology.spiralTightness || 3.2;
  const isLarge = config.id === 'galaxy06' || config.id === 'galaxy16' || config.id === 'galaxy17';
  const maxRadius = isLarge ? 54.0 : 40.0;
  const vThicknessMult = config.morphology.verticalThickness || 1.0;
  const palette = config.palette;

  // Linear RGB Palette
  const rgbCore = hexToRgb(palette.core);
  const rgbCoreHalo = hexToRgb(palette.coreHalo);
  const rgbInner = hexToRgb(palette.inner);
  const rgbDeep = hexToRgb(palette.deep);
  const rgbArm1 = hexToRgb(palette.armsPrimary);
  const rgbArm2 = hexToRgb(palette.armsSecondary);
  const rgbArm3 = hexToRgb(palette.armsTertiary);
  const rgbDust = hexToRgb(palette.dust);
  const rgbDust2 = hexToRgb(palette.dustSecondary);
  const rgbStarForm = hexToRgb(palette.starFormation);
  const rgbStarFormWarm = hexToRgb(palette.starFormationWarm);
  const rgbWhite = hexToRgb('#FFFFFF');

  // Predefined Starburst Cluster Anchors per Galaxy (16-32 organic cluster centers along arms)
  const clusterCount = isLarge ? 32 : 20;
  const clusterAngles = new Float32Array(clusterCount);
  const clusterRadii = new Float32Array(clusterCount);
  for (let c = 0; c < clusterCount; c++) {
    const cArm = c % numArms;
    const cRad = 5.5 + Math.pow((c + 0.5) / clusterCount, 0.9) * (maxRadius * 0.85 - 5.5);
    const cSpiral = Math.log(cRad * 0.35 + 1.0) * spiralTightness;
    clusterRadii[c] = cRad;
    clusterAngles[c] = (cArm * Math.PI * 2.0) / numArms + cSpiral + (hashNoise2D(c * 3.7, cRad * 1.3) - 0.5) * 0.35;
  }

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const p = Math.random();
    const profile = getHierarchicalParticleProfile();

    let layer = 1;
    let radius = 0;
    let branch = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    let size = profile.size;
    let luminosity = profile.luminosity;
    let coreType = -1.0;
    let col: [number, number, number] = rgbDeep;

    if (morphologyType === 'barred-spiral') {
      // =======================================================================
      // BARRED-SPIRAL (Galaxies 01 Aether Prime, 07 Aethelgard, 14 Glacies)
      // =======================================================================
      if (p < 0.24) {
        layer = 0;
        branch = 2.0;
        const subType = Math.random();
        if (subType < 0.75) {
          coreType = 0.0;
          radius = Math.random() < 0.15 ? Math.pow(Math.random(), 3.0) * 1.5 : 0.8 + Math.pow(Math.random(), 1.4) * 4.5;
          size = 0.25 + (radius / 5.5) * 0.45 + Math.random() * 0.3;
        } else if (subType < 0.90) {
          coreType = 1.0;
          radius = Math.pow(Math.random(), 1.8) * 5.5;
          size = 0.5 + (radius / 5.5) * 0.5 + Math.random() * 0.4;
        } else {
          coreType = 2.0;
          radius = 0.5 + Math.pow(Math.random(), 1.3) * 5.0;
          size = 0.35 + Math.random() * 0.45;
        }
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;
        y = randomGaussian(0, (0.2 + radius * 0.12) * vThicknessMult);

        const coreNorm = Math.min(radius / 5.5, 1.0);
        if (coreNorm < 0.06) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm / 0.06);
        else if (coreNorm < 0.18) col = mixRgb(rgbCoreHalo, rgbStarFormWarm, (coreNorm - 0.06) / 0.12);
        else if (coreNorm < 0.35) col = mixRgb(rgbStarFormWarm, rgbArm1, (coreNorm - 0.18) / 0.17);
        else if (coreNorm < 0.65) col = mixRgb(rgbArm1, rgbArm2, (coreNorm - 0.35) / 0.30);
        else col = mixRgb(rgbArm2, rgbArm3, (coreNorm - 0.65) / 0.35);

      } else if (p < 0.78) {
        const isInner = p < 0.52;
        layer = isInner ? 1 : 2;
        radius = 2.5 + Math.pow(Math.random(), 1.2) * (isInner ? 19.5 : maxRadius - 2.5);
        const armIndex = Math.random() < 0.52 ? 0 : 1;
        branch = armIndex;
        const armOffset = (armIndex * Math.PI * 2.0) / numArms;
        const spiralAngle = Math.log(radius * 0.4 + 1.0) * spiralTightness;
        const randAngle = randomGaussian(0, 0.28 * Math.pow(radius / maxRadius, 0.8));
        const totalAngle = armOffset + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.12;
        z = Math.sin(totalAngle) * radius * 0.88;
        y = randomGaussian(0, (0.4 + (radius / maxRadius) * 2.2) * 0.4 * vThicknessMult);

        const normDist = Math.min(radius / maxRadius, 1.0);
        if (armIndex === 0) {
          if (normDist < 0.25) col = mixRgb(rgbStarFormWarm, rgbArm1, normDist * 4.0);
          else if (normDist < 0.55) col = mixRgb(rgbArm1, rgbArm2, (normDist - 0.25) * 3.33);
          else if (normDist < 0.80) col = mixRgb(rgbArm2, rgbArm3, (normDist - 0.55) * 4.0);
          else col = mixRgb(rgbArm3, rgbDeep, (normDist - 0.80) * 5.0);
        } else {
          if (normDist < 0.25) col = mixRgb(rgbCoreHalo, rgbInner, normDist * 4.0);
          else if (normDist < 0.55) col = mixRgb(rgbInner, rgbDeep, (normDist - 0.25) * 3.33);
          else col = mixRgb(rgbDeep, rgbDust2, (normDist - 0.55) * 2.22);
        }

      } else if (p < 0.90) {
        layer = 3;
        radius = 4.0 + Math.random() * (maxRadius * 0.85);
        const arcAngle = (Math.random() < 0.5 ? 0 : Math.PI) + radius * 0.12 + randomGaussian(0, 0.4);
        x = Math.cos(arcAngle) * radius * 1.05;
        z = Math.sin(arcAngle) * radius * 0.95;
        y = (Math.sin(radius * 0.25) * 2.5 + randomGaussian(0, 0.8)) * vThicknessMult;
        col = Math.random() < 0.5 ? rgbStarForm : rgbStarFormWarm;
      } else {
        layer = 4;
        radius = 8.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.1;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 2.5 + (radius / maxRadius) * 3.5) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'flocculent-ring' || morphologyType === 'ring-spiral') {
      // =======================================================================
      // RINGED & FLOCCULENT SPIRALS (Galaxies 02 Ignis Vesper, 08 Aquila, 13 Solaris)
      // =======================================================================
      if (p < 0.20) {
        layer = 0;
        branch = 2.0;
        radius = 0.4 + Math.pow(Math.random(), 1.5) * 4.8;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.95;
        y = randomGaussian(0, (0.35 + radius * 0.18) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.8, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm / 0.15);
        else if (coreNorm < 0.45) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.15) / 0.30);
        else col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.45) / 0.55);

      } else if (p < 0.50) {
        // High-Density Ring Stream
        layer = 1;
        branch = 0.5;
        const ringBase = 6.0 + Math.pow(Math.random(), 1.1) * 9.0;
        const ringAngle = Math.random() * Math.PI * 2.0;
        radius = ringBase + (hashNoise2D(ringBase * 4.2, p * 17.3) - 0.5) * 3.5 + Math.sin(ringAngle * 3.0) * 0.4;
        x = Math.cos(ringAngle) * radius * 1.05;
        z = Math.sin(ringAngle) * radius * 0.95;
        y = randomGaussian(0, (0.6 + Math.pow(radius / maxRadius, 1.2) * 3.8) * vThicknessMult);
        col = mixRgb(rgbInner, rgbArm1, Math.min((radius - 5.5) / 9.0, 1.0));

      } else if (p < 0.82) {
        layer = 2;
        const armPick = Math.random();
        const armIndex = armPick < 0.55 ? 0 : armPick < 0.80 ? 1 : 2;
        branch = armIndex;
        radius = 7.5 + Math.pow(Math.random(), 1.15) * (maxRadius * (armIndex === 0 ? 1.15 : 0.88) - 7.5);
        const spiralAngle = Math.log(radius * 0.35 + 1.0) * spiralTightness;
        const randAngle = randomGaussian(0, 0.22 + (radius / maxRadius) * 0.45);
        const totalAngle = (armIndex * Math.PI * 2.0) / numArms + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.08;
        z = Math.sin(totalAngle) * radius * 0.92;
        const flaredThickness = 0.65 + Math.pow(radius / maxRadius, 1.6) * 4.2;
        y = randomGaussian(0, flaredThickness * 0.5 * vThicknessMult);

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.4) col = mixRgb(rgbArm1, rgbArm2, armNorm * 2.5);
        else if (armNorm < 0.8) col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.4) * 2.5);
        else col = mixRgb(rgbArm3, rgbDust, (armNorm - 0.8) * 5.0);

      } else if (p < 0.92) {
        layer = 3;
        radius = 5.0 + Math.random() * (maxRadius * 0.85);
        const nurseryAngle = Math.random() * Math.PI * 2.0;
        x = Math.cos(nurseryAngle) * radius;
        z = Math.sin(nurseryAngle) * radius * 0.92;
        y = randomGaussian(0, 1.0 + (radius / maxRadius) * 2.8) * vThicknessMult;
        col = Math.random() < 0.6 ? rgbStarForm : rgbStarFormWarm;
      } else {
        layer = 4;
        radius = 9.0 + Math.random() * (maxRadius * 1.4);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.15;
        z = Math.sin(angle) * radius * 0.88;
        y = randomGaussian(0, 3.8 + (radius / maxRadius) * 5.2) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'dense-elliptical') {
      // =======================================================================
      // DENSE ELLIPTICAL SPIRAL (Galaxy 10 Chrono Forge)
      // =======================================================================
      if (p < 0.32) {
        // Massive dense elliptical core
        layer = 0;
        branch = 2.0;
        radius = Math.pow(Math.random(), 1.6) * 5.5;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.25;
        z = Math.sin(angle) * radius * 0.85;
        y = randomGaussian(0, (0.5 + radius * 0.22) * vThicknessMult);

        const coreNorm = Math.min(radius / 5.5, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbWhite, rgbCore, coreNorm / 0.15);
        else if (coreNorm < 0.5) col = mixRgb(rgbCore, rgbCoreHalo, (coreNorm - 0.15) / 0.35);
        else col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.5) / 0.5);
        luminosity *= 1.4;

      } else if (p < 0.80) {
        // Dense elliptical layers with heavy dust lanes
        layer = 1;
        radius = 4.5 + Math.pow(Math.random(), 1.15) * (maxRadius - 4.5);
        const angle = Math.random() * Math.PI * 2.0 + Math.log(radius * 0.3 + 1.0) * spiralTightness;
        x = Math.cos(angle) * radius * 1.22;
        z = Math.sin(angle) * radius * 0.82;
        y = randomGaussian(0, (0.8 + (radius / maxRadius) * 3.5) * vThicknessMult);

        const normDist = Math.min(radius / maxRadius, 1.0);
        if (normDist < 0.35) col = mixRgb(rgbInner, rgbArm1, normDist / 0.35);
        else if (normDist < 0.70) col = mixRgb(rgbArm1, rgbArm2, (normDist - 0.35) / 0.35);
        else col = mixRgb(rgbArm2, rgbArm3, (normDist - 0.70) / 0.30);

      } else {
        layer = 4;
        radius = 6.0 + Math.random() * (maxRadius * 1.3);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.2;
        z = Math.sin(angle) * radius * 0.8;
        y = randomGaussian(0, 4.0 + (radius / maxRadius) * 5.0) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'thin-spiral') {
      // =======================================================================
      // THIN SPIRAL (Galaxy 11 Celestia)
      // =======================================================================
      if (p < 0.28) {
        // Dense prominent silver-blue bulge
        layer = 0;
        branch = 2.0;
        radius = Math.pow(Math.random(), 2.0) * 4.2;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        y = randomGaussian(0, (0.45 + radius * 0.25) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.2, 1.0);
        if (coreNorm < 0.15) col = rgbWhite;
        else if (coreNorm < 0.5) col = mixRgb(rgbWhite, rgbCoreHalo, (coreNorm - 0.15) / 0.35);
        else col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.5) / 0.5);

      } else if (p < 0.75) {
        // Thin, sharp dual spiral streams
        layer = 1;
        const armIndex = Math.random() < 0.5 ? 0 : 1;
        branch = armIndex;
        radius = 3.5 + Math.pow(Math.random(), 1.1) * (maxRadius - 3.5);
        const armOffset = (armIndex * Math.PI * 2.0) / 2.0;
        const spiralAngle = Math.log(radius * 0.35 + 1.0) * spiralTightness;
        const totalAngle = armOffset + spiralAngle + randomGaussian(0, 0.14);

        x = Math.cos(totalAngle) * radius * 1.05;
        z = Math.sin(totalAngle) * radius * 0.95;
        y = randomGaussian(0, (0.35 + (radius / maxRadius) * 1.8) * vThicknessMult);

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.3) col = mixRgb(rgbInner, rgbArm1, armNorm / 0.3);
        else if (armNorm < 0.7) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.3) / 0.4);
        else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.7) / 0.3);

      } else {
        layer = 4;
        radius = 8.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        y = randomGaussian(0, 3.5) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'flocculent-asymmetric' || morphologyType === 'asymmetric-broken') {
      // =======================================================================
      // ASYMMETRIC & BROKEN SPIRALS (Galaxies 09 Siren, 15 Nether)
      // =======================================================================
      if (p < 0.20) {
        layer = 0;
        branch = 2.0;
        radius = Math.pow(Math.random(), 1.6) * 4.6;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;
        y = randomGaussian(0, (0.4 + radius * 0.2) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.6, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbWhite, rgbCore, coreNorm / 0.15);
        else if (coreNorm < 0.5) col = mixRgb(rgbCore, rgbCoreHalo, (coreNorm - 0.15) / 0.35);
        else col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.5) / 0.5);

      } else if (p < 0.76) {
        layer = 1;
        const armPick = Math.random();
        const armIndex = armPick < 0.55 ? 0 : armPick < 0.85 ? 1 : 2;
        branch = armIndex;

        const isDisrupted = armIndex === 2;
        radius = 3.8 + Math.pow(Math.random(), 1.15) * (maxRadius * (isDisrupted ? 1.25 : 0.95) - 3.8);

        const armOffset = (armIndex * Math.PI * 2.0) / 2.4;
        const spiralAngle = Math.log(radius * 0.34 + 1.0) * spiralTightness;
        const chaoticNoise = randomGaussian(0, 0.38 + (radius / maxRadius) * 0.55);
        const totalAngle = armOffset + spiralAngle + chaoticNoise;

        x = Math.cos(totalAngle) * radius * 1.14;
        z = Math.sin(totalAngle) * radius * 0.86;
        y = randomGaussian(0, (0.8 + Math.pow(radius / maxRadius, 1.4) * 4.5) * vThicknessMult);

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.3) col = mixRgb(rgbDeep, rgbArm1, armNorm / 0.3);
        else if (armNorm < 0.65) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.3) / 0.35);
        else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.65) / 0.35);

      } else if (p < 0.90) {
        layer = 3;
        radius = 4.0 + Math.random() * (maxRadius * 0.85);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 1.8) * vThicknessMult;
        col = Math.random() < 0.6 ? rgbStarForm : rgbStarFormWarm;
      } else {
        layer = 4;
        radius = 7.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.15;
        z = Math.sin(angle) * radius * 0.85;
        y = randomGaussian(0, 4.5) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'emerald-multi-arm' || morphologyType === 'multi-arm-grand' || morphologyType === 'ic1579-emerald-spiral') {
      // =======================================================================
      // MULTI-ARM GRAND SPIRALS (Galaxies 03 Verdant, 12 Viridis, 16 Aurelia)
      // + IC 1579 — Emerald Deep-Spiral (living ecosystem galaxy)
      // =======================================================================
      const isIC1579 = config.id === 'galaxy17';
      if (p < 0.25) {
        layer = 0;
        branch = 2.0;
        const coreDistP = Math.random();
        radius = coreDistP < 0.4 ? Math.pow(Math.random(), 2.2) * 1.8 : 0.6 + Math.pow(Math.random(), 1.4) * 4.6;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.94;
        y = randomGaussian(0, (0.35 + radius * 0.24) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.6, 1.0);
        if (coreNorm < 0.12) {
          col = mixRgb(rgbWhite, rgbCore, coreNorm / 0.12);
          luminosity *= 1.8;
          size *= 1.25;
        } else if (coreNorm < 0.35) {
          col = mixRgb(rgbCore, rgbCoreHalo, (coreNorm - 0.12) / 0.23);
          luminosity *= 1.4;
        } else if (coreNorm < 0.65) {
          col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.35) / 0.30);
        } else {
          col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.65) / 0.35);
        }

      } else if (p < (isIC1579 ? 0.80 : 0.77)) {
        layer = p < 0.48 ? 1 : 2;
        const armPick = Math.random();
        const armIndex = Math.floor(armPick * numArms);
        branch = armIndex;

        radius = 2.8 + Math.pow(Math.random(), 1.18) * (maxRadius - 2.8);
        const armOffset = (armIndex * Math.PI * 2.0) / numArms;
        const spiralAngle = Math.log(radius * 0.38 + 1.0) * (spiralTightness * (1.0 + armIndex * 0.05));
        const armWidth = 0.24 * (1.0 + Math.pow(radius / maxRadius, 0.7) * 1.6);
        const randAngle = randomGaussian(0, armWidth);
        const totalAngle = armOffset + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.06;
        z = Math.sin(totalAngle) * radius * 0.94;
        
        const depthEnvelope = 0.75 + Math.pow(radius / maxRadius, 1.5) * 4.6;
        y = randomGaussian(0, depthEnvelope * 0.5 * vThicknessMult);

        let nearestClusterDist = 999.0;
        for (let c = 0; c < clusterCount; c++) {
          const dR = radius - clusterRadii[c];
          const dA = Math.sin(totalAngle - clusterAngles[c]) * radius;
          const cDist = Math.sqrt(dR * dR + dA * dA);
          if (cDist < nearestClusterDist) nearestClusterDist = cDist;
        }

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (nearestClusterDist < (isIC1579 ? 2.8 : 2.2)) {
          col = mixRgb(rgbStarForm, rgbStarFormWarm, Math.random());
          luminosity *= 2.2;
          size *= 1.4;
          layer = 3;
        } else if (profile.isCluster) {
          col = mixRgb(rgbCoreHalo, rgbInner, Math.random());
          luminosity *= 1.6;
        } else {
          if (armNorm < 0.28) col = mixRgb(rgbInner, rgbDeep, armNorm / 0.28);
          else if (armNorm < 0.62) col = mixRgb(rgbDeep, rgbArm1, (armNorm - 0.28) / 0.34);
          else if (armNorm < 0.85) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.62) / 0.23);
          else col = mixRgb(rgbArm2, rgbDust, (armNorm - 0.85) / 0.15);
        }

      } else if (p < (isIC1579 ? 0.91 : 0.88)) {
        layer = 3;
        radius = 4.0 + Math.random() * (maxRadius * 0.85);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;
        y = randomGaussian(0, 1.2 + (radius / maxRadius) * 3.2) * vThicknessMult;
        col = Math.random() < 0.6 ? rgbStarForm : rgbStarFormWarm;
        luminosity *= 1.8;
      } else {
        layer = 4;
        radius = 5.5 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.1;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 3.8 + (radius / maxRadius) * 5.5) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
        luminosity *= 0.5;
      }

    } else {
      // =======================================================================
      // MASSIVE CELESTIAL FORGE (Galaxy 06 Aetheris — Monumental Centerpiece)
      // =======================================================================
      if (p < 0.28) {
        layer = 0;
        branch = 2.0;
        const coreP = Math.random();
        radius = coreP < 0.5 ? Math.pow(Math.random(), 2.2) * 2.2 : 0.6 + Math.pow(Math.random(), 1.4) * 6.8;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.95;
        y = randomGaussian(0, (0.45 + radius * 0.20) * vThicknessMult);

        const coreNorm = Math.min(radius / 6.8, 1.0);
        if (coreNorm < 0.10) {
          col = config.id === 'galaxy06' ? rgbWhite : rgbCore;
          luminosity *= 2.0;
          size *= 1.3;
        } else if (coreNorm < 0.35) {
          col = mixRgb(config.id === 'galaxy06' ? rgbWhite : rgbCore, rgbCoreHalo, (coreNorm - 0.10) / 0.25);
          luminosity *= 1.6;
        } else if (coreNorm < 0.65) {
          col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.35) / 0.30);
          luminosity *= 1.3;
        } else {
          col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.65) / 0.35);
        }

      } else if (p < 0.78) {
        layer = p < 0.52 ? 1 : 2;
        const armIndex = Math.floor(Math.random() * 4);
        branch = armIndex;

        radius = 3.0 + Math.pow(Math.random(), 1.18) * (maxRadius - 3.0);
        const armOffset = (armIndex * Math.PI * 2.0) / 4.0;
        const spiralAngle = Math.log(radius * 0.32 + 1.0) * spiralTightness;
        const armSpread = 0.22 * (1.0 + Math.pow(radius / maxRadius, 0.8) * 1.8);
        const randAngle = randomGaussian(0, armSpread);
        const totalAngle = armOffset + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.08;
        z = Math.sin(totalAngle) * radius * 0.92;
        
        const aetherisThickness = 0.8 + Math.pow(radius / maxRadius, 1.5) * 5.4;
        y = randomGaussian(0, aetherisThickness * 0.5 * vThicknessMult);

        let nearestClusterDist = 999.0;
        for (let c = 0; c < clusterCount; c++) {
          const dR = radius - clusterRadii[c];
          const dA = Math.sin(totalAngle - clusterAngles[c]) * radius;
          const cDist = Math.sqrt(dR * dR + dA * dA);
          if (cDist < nearestClusterDist) nearestClusterDist = cDist;
        }

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (nearestClusterDist < 2.5) {
          col = mixRgb(rgbStarFormWarm, rgbStarForm, Math.random());
          luminosity *= 2.3;
          size *= 1.45;
          layer = 3;
        } else if (profile.isCluster) {
          col = mixRgb(rgbInner, rgbWhite, Math.random() * 0.6);
          luminosity *= 1.7;
        } else {
          if (armNorm < 0.24) col = mixRgb(rgbInner, rgbDeep, armNorm / 0.24);
          else if (armNorm < 0.54) col = mixRgb(rgbDeep, rgbArm1, (armNorm - 0.24) / 0.30);
          else if (armNorm < 0.80) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.54) / 0.26);
          else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.80) / 0.20);
        }

      } else if (p < 0.90) {
        layer = 3;
        radius = 4.5 + Math.random() * (maxRadius * 0.88);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.05;
        z = Math.sin(angle) * radius * 0.95;
        y = (Math.sin(radius * 0.2) * 3.5 + randomGaussian(0, 1.6)) * vThicknessMult;
        col = Math.random() < 0.55 ? rgbStarForm : rgbStarFormWarm;
        luminosity *= 2.0;
      } else {
        layer = 4;
        radius = 8.0 + Math.random() * (maxRadius * 1.38);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.12;
        z = Math.sin(angle) * radius * 0.88;
        y = randomGaussian(0, 4.8 + (radius / maxRadius) * 6.5) * vThicknessMult;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
        luminosity *= 0.5;
      }
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    colors[i3] = col[0];
    colors[i3 + 1] = col[1];
    colors[i3 + 2] = col[2];

    sizes[i] = size;
    scales[i] = 0.5 + Math.random() * 0.9;
    randomness[i] = Math.random();
    phases[i] = Math.random() * Math.PI * 2.0;
    branches[i] = branch;
    distances[i] = Math.min(radius / maxRadius, 1.0);
    layers[i] = layer;
    coreTypes[i] = coreType;
    luminosities[i] = luminosity;
  }

  return {
    positions,
    colors,
    sizes,
    scales,
    randomness,
    phases,
    branches,
    distances,
    layers,
    coreTypes,
    luminosities,
  };
}

export function generateNebulaParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // AETHER environment identity: faint, cold, deep-blue cosmic gas.
  // The bright purple/magenta tones are removed so the deep space between
  // galaxies reads dark and quiet, while IC 1579's emerald interior owns
  // the saturated color.
  const nebulaColors = [
    [0.020, 0.035, 0.085],
    [0.035, 0.055, 0.125],
    [0.015, 0.028, 0.070],
    [0.040, 0.060, 0.110],
    [0.012, 0.030, 0.090],
    [0.028, 0.050, 0.070],
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 8.0 + Math.pow(Math.random(), 1.1) * 45.0;
    const angle = Math.random() * Math.PI * 2.0;

    positions[i3] = Math.cos(angle) * radius * 1.15;
    positions[i3 + 1] = randomGaussian(0, 4.2);
    positions[i3 + 2] = Math.sin(angle) * radius * 0.85;

    sizes[i] = 25.0 + Math.random() * 50.0;
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

  // Sparse AETHER starfield: mostly cool white-blue tints at moderate
  // brightness so deep space stays dark and quiet (IC 1579 supplies the
  // dense, saturated stellar environment when approached).
  const starTints = [
    [0.85, 0.88, 1.0],
    [0.70, 0.78, 1.0],
    [0.60, 0.72, 0.95],
    [0.92, 0.88, 0.82],
    [0.80, 0.78, 1.0],
    [0.78, 0.92, 0.88],
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 260.0 + Math.random() * 450.0;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.6 + Math.random() * 1.5;
    twinkleSpeeds[i] = 0.5 + Math.random() * 2.5;
    twinklePhases[i] = Math.random() * Math.PI * 2.0;

    const tint = starTints[Math.floor(Math.random() * starTints.length)];
    colors[i3] = tint[0];
    colors[i3 + 1] = tint[1];
    colors[i3 + 2] = tint[2];
  }

  return { positions, sizes, twinkleSpeeds, twinklePhases, colors };
}

export function generateForegroundDustParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Faint interstellar haze — barely-there cool tint. The gap between
  // AETHER and IC 1579 is intentionally empty, so only the faintest
  // foreground dust is permitted.
  const dustTints = [
    [0.30, 0.35, 0.45],
    [0.28, 0.40, 0.50],
    [0.38, 0.36, 0.30],
    [0.25, 0.42, 0.38],
    [0.24, 0.28, 0.40],
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 15.0 + Math.pow(Math.random(), 0.7) * 120.0;
    const theta = Math.random() * Math.PI * 2.0;
    const phi = (Math.random() - 0.5) * Math.PI * 0.85;

    positions[i3] = radius * Math.cos(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * 0.6 + randomGaussian(0, 6.0);
    positions[i3 + 2] = radius * Math.cos(phi) * Math.sin(theta);

    sizes[i] = 1.2 + Math.random() * 2.2;
    phases[i] = Math.random() * Math.PI * 2.0;

    const tint = dustTints[Math.floor(Math.random() * dustTints.length)];
    colors[i3] = tint[0];
    colors[i3 + 1] = tint[1];
    colors[i3 + 2] = tint[2];
  }

  return { positions, sizes, phases, colors };
}
