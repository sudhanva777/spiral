// Procedural Galaxy Generation Mathematics — Multi-Galaxy Universe Engine
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
 * Universal procedural galaxy generator supporting all 6 unique morphologies.
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

  const morphologyType = config.morphology.type;
  const numArms = config.morphology.armCount || 2;
  const spiralTightness = config.morphology.spiralTightness || 3.2;
  const isLarge = config.id === 'galaxy06';
  const maxRadius = isLarge ? 52.0 : 38.0;
  const vThicknessMult = config.morphology.verticalThickness || 1.0;
  const palette = config.palette;

  // Pre-parse palette colors to linear RGB
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
    let coreType = -1.0;
    let col: [number, number, number] = rgbDeep;

    if (morphologyType === 'barred-spiral') {
      // =======================================================================
      // GALAXY 01: BARRED-SPIRAL (Aether Prime)
      // =======================================================================
      if (p < 0.22) {
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
        size = 0.8 + Math.random() * 1.4;

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
        size = 1.0 + Math.random() * 1.6;
        col = Math.random() < 0.5 ? rgbStarForm : rgbStarFormWarm;
      } else {
        layer = 4;
        radius = 8.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.1;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 2.5 + (radius / maxRadius) * 3.5) * vThicknessMult;
        branch = 3.0;
        size = 0.5 + Math.random() * 0.7;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'flocculent-ring') {
      // =======================================================================
      // GALAXY 02: FLOCCULENT-RING (Ignis Vesper)
      // =======================================================================
      if (p < 0.18) {
        layer = 0;
        branch = 2.0;
        radius = 0.4 + Math.pow(Math.random(), 1.5) * 4.8;
        size = 0.3 + Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.95;
        y = randomGaussian(0, (0.25 + radius * 0.15) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.8, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm / 0.15);
        else if (coreNorm < 0.45) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.15) / 0.30);
        else col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.45) / 0.55);

      } else if (p < 0.48) {
        layer = 1;
        branch = 0.5;
        const ringBase = 6.0 + Math.pow(Math.random(), 1.1) * 8.5;
        const ringAngle = Math.random() * Math.PI * 2.0;
        radius = ringBase + (hashNoise2D(ringBase * 4.2, p * 17.3) - 0.5) * 3.2 + Math.sin(ringAngle * 3.0) * 0.35;
        x = Math.cos(ringAngle) * radius * 1.05;
        z = Math.sin(ringAngle) * radius * 0.95;
        y = randomGaussian(0, (0.45 + (radius / maxRadius) * 2.8) * vThicknessMult);
        size = 0.65 + Math.random() * 1.1;
        col = mixRgb(rgbInner, rgbArm1, Math.min((radius - 5.5) / 9.0, 1.0));

      } else if (p < 0.80) {
        layer = 2;
        const armPick = Math.random();
        const armIndex = armPick < 0.55 ? 0 : armPick < 0.80 ? 1 : 2;
        branch = armIndex;
        radius = 8.0 + Math.pow(Math.random(), 1.15) * (maxRadius * (armIndex === 0 ? 1.15 : 0.85) - 8.0);
        const spiralAngle = Math.log(radius * 0.35 + 1.0) * spiralTightness;
        const randAngle = randomGaussian(0, 0.22 + (radius / maxRadius) * 0.45);
        const totalAngle = (armIndex * Math.PI * 2.0) / 3.0 + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.08;
        z = Math.sin(totalAngle) * radius * 0.92;
        y = randomGaussian(0, (0.5 + (radius / maxRadius) * 3.2) * 0.5 * vThicknessMult);
        size = 0.75 + Math.random() * 1.3;

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
        y = randomGaussian(0, 0.8 + (radius / maxRadius) * 2.0) * vThicknessMult;
        size = 0.9 + Math.random() * 1.5;
        col = Math.random() < 0.6 ? rgbStarForm : rgbStarFormWarm;
      } else {
        layer = 4;
        radius = 9.0 + Math.random() * (maxRadius * 1.4);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.15;
        z = Math.sin(angle) * radius * 0.88;
        y = randomGaussian(0, 3.2 + (radius / maxRadius) * 4.5) * vThicknessMult;
        size = 0.45 + Math.random() * 0.75;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'emerald-multi-arm') {
      // =======================================================================
      // GALAXY 03: EMERALD MULTI-ARM (Verdant)
      // 3 major spiral arms + 1 fragmented outer arm, deep emerald dust lanes, dense disk
      // =======================================================================
      if (p < 0.20) {
        layer = 0; // Dense luminous white/mint core
        branch = 2.0;
        radius = 0.3 + Math.pow(Math.random(), 1.7) * 4.5;
        size = 0.3 + Math.random() * 0.6;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.94;
        y = randomGaussian(0, (0.3 + radius * 0.18) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.5, 1.0);
        if (coreNorm < 0.2) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm * 5.0);
        else if (coreNorm < 0.6) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.2) * 2.5);
        else col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.6) * 2.5);

      } else if (p < 0.75) {
        // 3 major arms + 1 fragmented arm (4 branches total)
        layer = p < 0.48 ? 1 : 2;
        const armPick = Math.random();
        const armIndex = armPick < 0.32 ? 0 : armPick < 0.62 ? 1 : armPick < 0.85 ? 2 : 3;
        branch = armIndex;

        const isFragmented = armIndex === 3;
        const rMax = isFragmented ? maxRadius * 1.15 : maxRadius * 0.95;
        radius = 3.0 + Math.pow(Math.random(), 1.25) * (rMax - 3.0);

        const armOffset = (armIndex * Math.PI * 2.0) / 3.0 + (isFragmented ? 0.8 : 0.0);
        const spiralAngle = Math.log(radius * 0.38 + 1.0) * (spiralTightness * (1.0 + armIndex * 0.08));
        const turbulence = randomGaussian(0, 0.22 + (radius / maxRadius) * 0.35);
        const totalAngle = armOffset + spiralAngle + turbulence;

        x = Math.cos(totalAngle) * radius * 1.06;
        z = Math.sin(totalAngle) * radius * 0.94;
        // Pronounced 3D depth profile
        y = randomGaussian(0, (0.6 + (radius / maxRadius) * 3.8) * 0.45 * vThicknessMult);
        size = 0.75 + Math.random() * 1.3;

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.3) col = mixRgb(rgbInner, rgbDeep, armNorm * 3.33);
        else if (armNorm < 0.65) col = mixRgb(rgbDeep, rgbArm1, (armNorm - 0.3) * 2.85);
        else if (armNorm < 0.85) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.65) * 5.0);
        else col = mixRgb(rgbArm2, rgbDust, (armNorm - 0.85) * 6.66);

      } else if (p < 0.88) {
        // High-density lime/mint starburst knots
        layer = 3;
        radius = 4.5 + Math.random() * (maxRadius * 0.8);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.92;
        y = randomGaussian(0, 1.0 + (radius / maxRadius) * 2.5) * vThicknessMult;
        size = 1.1 + Math.random() * 1.4;
        col = Math.random() < 0.55 ? rgbStarForm : rgbStarFormWarm;
      } else {
        // Deep emerald & forest green dust lanes
        layer = 4;
        radius = 6.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.1;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 3.5 + (radius / maxRadius) * 5.0) * vThicknessMult;
        size = 0.5 + Math.random() * 0.8;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'golden-dark-barred') {
      // =======================================================================
      // GALAXY 04: GOLDEN ECLIPSE (Eclipse)
      // Thick elongated bar, massive luminous core, dark dust voids, amber star streams
      // =======================================================================
      if (p < 0.25) {
        // Massive luminous golden core
        layer = 0;
        branch = 2.0;
        radius = 0.2 + Math.pow(Math.random(), 1.6) * 5.0;
        size = 0.35 + Math.random() * 0.7;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, (0.35 + radius * 0.15) * vThicknessMult);

        const coreNorm = Math.min(radius / 5.0, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm / 0.15);
        else if (coreNorm < 0.5) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.15) / 0.35);
        else col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.5) / 0.5);

      } else if (p < 0.76) {
        // Elongated golden bar + 2 asymmetric arms with dark dust lane crossing
        layer = p < 0.52 ? 1 : 2;
        const isBar = Math.random() < 0.35;
        const armIndex = Math.random() < 0.6 ? 0 : 1;
        branch = armIndex;

        if (isBar) {
          // Elongated Bar along X-axis
          const barLength = 16.0;
          x = (Math.random() - 0.5) * 2.0 * barLength;
          z = randomGaussian(0, 1.8);
          radius = Math.sqrt(x * x + z * z);
          y = randomGaussian(0, 0.8 * vThicknessMult);
          size = 0.8 + Math.random() * 1.2;
          col = mixRgb(rgbInner, rgbArm1, Math.min(Math.abs(x) / barLength, 1.0));
        } else {
          // Asymmetric Arms
          radius = 5.0 + Math.pow(Math.random(), 1.2) * (maxRadius - 5.0);
          const spiralAngle = Math.log(radius * 0.32 + 1.0) * spiralTightness;
          const armOffset = (armIndex * Math.PI * 2.0) / 2.0;
          const totalAngle = armOffset + spiralAngle + randomGaussian(0, 0.25);

          x = Math.cos(totalAngle) * radius * 1.15;
          z = Math.sin(totalAngle) * radius * 0.85;
          y = randomGaussian(0, (0.4 + (radius / maxRadius) * 2.4) * vThicknessMult);
          size = 0.75 + Math.random() * 1.3;

          const armNorm = Math.min(radius / maxRadius, 1.0);
          if (armNorm < 0.3) col = mixRgb(rgbInner, rgbArm1, armNorm * 3.33);
          else if (armNorm < 0.7) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.3) * 2.5);
          else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.7) * 3.33);
        }

        // Dark dust lane crossing belts (visual voids creating parallax)
        const darkBeltNoise = hashNoise2D(x * 0.15, z * 0.15);
        if (darkBeltNoise > 0.68) {
          col = mixRgb(col, rgbDust, 0.85); // High contrast dark silhouette
          size *= 0.6;
        }

      } else if (p < 0.88) {
        // Amber stellar nurseries
        layer = 3;
        radius = 4.0 + Math.random() * (maxRadius * 0.8);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 1.2) * vThicknessMult;
        size = 0.9 + Math.random() * 1.4;
        col = Math.random() < 0.5 ? rgbStarForm : rgbStarFormWarm;
      } else {
        // Deep bronze & black dust
        layer = 4;
        radius = 7.0 + Math.random() * (maxRadius * 1.3);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.1;
        z = Math.sin(angle) * radius * 0.9;
        y = randomGaussian(0, 3.0 + (radius / maxRadius) * 4.0) * vThicknessMult;
        size = 0.45 + Math.random() * 0.75;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else if (morphologyType === 'turbulent-crimson') {
      // =======================================================================
      // GALAXY 05: TURBULENT CRIMSON (Red Veil — Death Red)
      // Dynamically active, violent starburst cavities, fragmented arms, blood red
      // =======================================================================
      if (p < 0.18) {
        layer = 0;
        branch = 2.0;
        radius = 0.3 + Math.pow(Math.random(), 1.5) * 4.4;
        size = 0.35 + Math.random() * 0.6;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.95;
        y = randomGaussian(0, (0.3 + radius * 0.2) * vThicknessMult);

        const coreNorm = Math.min(radius / 4.4, 1.0);
        if (coreNorm < 0.2) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm * 5.0);
        else if (coreNorm < 0.6) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.2) * 2.5);
        else col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.6) * 2.5);

      } else if (p < 0.74) {
        // 2 dominant arms + 1 fragmented chaotic outer arm
        layer = p < 0.46 ? 1 : 2;
        const armPick = Math.random();
        const armIndex = armPick < 0.48 ? 0 : armPick < 0.82 ? 1 : 2;
        branch = armIndex;

        const isFragmented = armIndex === 2;
        radius = 4.0 + Math.pow(Math.random(), 1.15) * (maxRadius * (isFragmented ? 1.25 : 1.0) - 4.0);

        const armOffset = (armIndex * Math.PI * 2.0) / 2.2;
        const spiralAngle = Math.log(radius * 0.34 + 1.0) * spiralTightness;
        const violentTurbulence = randomGaussian(0, 0.35 + (radius / maxRadius) * 0.55);
        const totalAngle = armOffset + spiralAngle + violentTurbulence;

        x = Math.cos(totalAngle) * radius * 1.12;
        z = Math.sin(totalAngle) * radius * 0.88;
        y = randomGaussian(0, (0.7 + (radius / maxRadius) * 4.0) * 0.5 * vThicknessMult);
        size = 0.8 + Math.random() * 1.5;

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.3) col = mixRgb(rgbDeep, rgbArm1, armNorm * 3.33);
        else if (armNorm < 0.65) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.3) * 2.85);
        else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.65) * 2.85);

      } else if (p < 0.90) {
        // Concentrated violent starburst knots (white-hot/orange/crimson cavities)
        layer = 3;
        radius = 4.0 + Math.random() * (maxRadius * 0.85);
        const angle = Math.random() * Math.PI * 2.0;
        const knotClump = (hashNoise2D(angle * 5.0, radius * 2.5) - 0.5) * 2.0;
        x = Math.cos(angle) * radius + knotClump;
        z = Math.sin(angle) * radius * 0.9 + knotClump;
        y = randomGaussian(0, 1.4 + (radius / maxRadius) * 2.5) * vThicknessMult;
        size = 1.2 + Math.random() * 1.6;
        col = Math.random() < 0.6 ? rgbStarForm : rgbStarFormWarm;
      } else {
        // Dark crimson & near-black outer dust
        layer = 4;
        radius = 7.0 + Math.random() * (maxRadius * 1.4);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.15;
        z = Math.sin(angle) * radius * 0.85;
        y = randomGaussian(0, 3.8 + (radius / maxRadius) * 5.0) * vThicknessMult;
        size = 0.5 + Math.random() * 0.8;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
      }

    } else {
      // =======================================================================
      // GALAXY 06: MASSIVE CELESTIAL FORGE (Aetheris — Largest Centerpiece)
      // 4 grand design spiral arms, central bar, H II regions, massive scale (radius 52.0)
      // =======================================================================
      if (p < 0.24) {
        // Grand white/ice-blue central core
        layer = 0;
        branch = 2.0;
        radius = 0.2 + Math.pow(Math.random(), 1.6) * 6.5;
        size = 0.4 + Math.random() * 0.8;
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius * 0.95;
        y = randomGaussian(0, (0.4 + radius * 0.16) * vThicknessMult);

        const coreNorm = Math.min(radius / 6.5, 1.0);
        if (coreNorm < 0.15) col = mixRgb(rgbCore, rgbCoreHalo, coreNorm / 0.15);
        else if (coreNorm < 0.45) col = mixRgb(rgbCoreHalo, rgbInner, (coreNorm - 0.15) / 0.30);
        else if (coreNorm < 0.75) col = mixRgb(rgbInner, rgbDeep, (coreNorm - 0.45) / 0.30);
        else col = mixRgb(rgbDeep, rgbArm1, (coreNorm - 0.75) / 0.25);

      } else if (p < 0.78) {
        // 4 major spiral arms + secondary branches
        layer = p < 0.52 ? 1 : 2;
        const armIndex = Math.floor(Math.random() * 4);
        branch = armIndex;

        radius = 3.5 + Math.pow(Math.random(), 1.2) * (maxRadius - 3.5);
        const armOffset = (armIndex * Math.PI * 2.0) / 4.0;
        const spiralAngle = Math.log(radius * 0.32 + 1.0) * spiralTightness;
        const dispersion = Math.pow(radius / maxRadius, 0.8) * 1.8;
        const randAngle = randomGaussian(0, 0.22 * dispersion);
        const totalAngle = armOffset + spiralAngle + randAngle;

        x = Math.cos(totalAngle) * radius * 1.08;
        z = Math.sin(totalAngle) * radius * 0.92;
        y = randomGaussian(0, (0.5 + (radius / maxRadius) * 4.2) * 0.45 * vThicknessMult);
        size = 0.85 + Math.random() * 1.5;

        const armNorm = Math.min(radius / maxRadius, 1.0);
        if (armNorm < 0.25) col = mixRgb(rgbInner, rgbDeep, armNorm * 4.0);
        else if (armNorm < 0.55) col = mixRgb(rgbDeep, rgbArm1, (armNorm - 0.25) * 3.33);
        else if (armNorm < 0.80) col = mixRgb(rgbArm1, rgbArm2, (armNorm - 0.55) * 4.0);
        else col = mixRgb(rgbArm2, rgbArm3, (armNorm - 0.80) * 5.0);

      } else if (p < 0.90) {
        // Luminous orange/amber H II star-forming regions & plasma knots
        layer = 3;
        radius = 5.0 + Math.random() * (maxRadius * 0.85);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.05;
        z = Math.sin(angle) * radius * 0.95;
        y = (Math.sin(radius * 0.2) * 3.0 + randomGaussian(0, 1.2)) * vThicknessMult;
        size = 1.1 + Math.random() * 1.6;
        col = Math.random() < 0.55 ? rgbStarForm : rgbStarFormWarm;
      } else {
        // Deep blue & dark dust lanes
        layer = 4;
        radius = 9.0 + Math.random() * (maxRadius * 1.35);
        const angle = Math.random() * Math.PI * 2.0;
        x = Math.cos(angle) * radius * 1.12;
        z = Math.sin(angle) * radius * 0.88;
        y = randomGaussian(0, 3.8 + (radius / maxRadius) * 5.5) * vThicknessMult;
        size = 0.5 + Math.random() * 0.8;
        col = mixRgb(rgbDust, rgbDust2, Math.random());
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
  };
}

export function generateNebulaParticles(count: number) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const nebulaColors = [
    [0.15, 0.07, 0.24], // Deep violet
    [0.45, 0.15, 0.65], // Rich purple
    [0.75, 0.25, 0.85], // Magenta
    [0.18, 0.35, 0.85], // Electric blue
    [0.08, 0.20, 0.55], // Deep ocean blue
    [0.05, 0.25, 0.18], // Emerald nebula cloud
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

  const starTints = [
    [1.0, 1.0, 1.0],       // Pure white
    [0.85, 0.90, 1.0],     // White-blue
    [0.70, 0.80, 1.0],     // Ice blue
    [1.0, 0.90, 0.80],     // Soft warm yellow-white
    [0.95, 0.80, 1.0],     // Faint violet-white
    [0.85, 1.0, 0.88],     // Mint-white
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Distribute on deep universe spherical shell (radius 220 to 550)
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 220.0 + Math.random() * 360.0;

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

  const dustTints = [
    [0.85, 0.70, 0.95], // Faint violet rose
    [0.70, 0.85, 1.00], // Soft ice blue
    [1.00, 0.85, 0.75], // Pale warm peach
    [0.75, 1.00, 0.85], // Faint mint green
    [0.60, 0.50, 0.90], // Deep lavender
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 15.0 + Math.pow(Math.random(), 0.7) * 95.0;
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
