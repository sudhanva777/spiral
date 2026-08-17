import { glslSimplexNoise } from './glslNoise';

export const blackHoleVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aSpeed;
attribute float aRadius;
attribute float aPhase;
attribute float aType; // 0 = Accretion Disk, 1 = Infall Stream, 2 = Photon Ring
attribute vec3 aColor;

uniform float uTime;
uniform float uRotationSpeed;
uniform float uInfallRate;
uniform float uHorizonRadius;
uniform float uPhotonRingRadius;
uniform float uDiskInnerRadius;
uniform float uDiskOuterRadius;
uniform float uPixelRatio;
uniform float uLODFactor;

varying vec3 vColor;
varying float vAlpha;
varying float vType;
varying float vDoppler;

void main() {
  float r = aRadius;
  float angle = aPhase;
  float z = 0.0;
  float doppler = 1.0;

  if (aType < 0.5) {
    // -------------------------------------------------------------
    // TYPE 0: ACCRETION DISK (Differential Keplerian Rotation)
    // Angular velocity omega ~ 1.0 / (r ^ 1.5)
    // -------------------------------------------------------------
    float omega = (uRotationSpeed * 3.5) / pow(max(r, 0.8), 1.35);
    angle = aPhase + uTime * omega * aSpeed;

    // Relativistic spiral turbulence & plasma density waves
    float turbulence = snoise(vec3(r * 0.8, angle * 1.5, uTime * 0.4)) * 0.15;
    r += turbulence * (r / uDiskOuterRadius);

    // Flared accretion disk thickness (thin near horizon, thicker outer)
    float diskNorm = clamp((r - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius), 0.0, 1.0);
    z = (snoise(vec3(r * 1.2, angle * 2.0, uTime * 0.3)) * 0.35) * (0.1 + diskNorm * 0.45);

    // Relativistic Doppler beaming factor (approaching side brighter)
    doppler = 0.8 + 0.45 * cos(angle);

  } else if (aType < 1.5) {
    // -------------------------------------------------------------
    // TYPE 1: INFALLING MATTER STREAM (Inward Gravitational Capture)
    // -------------------------------------------------------------
    float streamSpan = uDiskOuterRadius * 1.3 - uHorizonRadius;
    float currentInfall = mod(aPhase * streamSpan - uTime * uInfallRate * 2.2 * aSpeed, streamSpan);
    r = uHorizonRadius + currentInfall;

    // Accelerate rotation as matter plunges towards horizon
    float infallOmega = (uRotationSpeed * 5.0) / pow(max(r, 0.6), 1.5);
    angle = aPhase * 6.28 + uTime * infallOmega + (uDiskOuterRadius - r) * 1.2;

    float normDist = clamp((r - uHorizonRadius) / streamSpan, 0.0, 1.0);
    z = (snoise(vec3(r * 2.0, angle * 3.0, uTime * 0.5)) * 0.25) * (0.05 + normDist * 0.3);
    doppler = 0.85 + 0.4 * cos(angle);

  } else {
    // -------------------------------------------------------------
    // TYPE 2: PHOTON RING (Relativistic Boundary at 1.5 * r_s)
    // Ultra-compact, intense orbital velocity
    // -------------------------------------------------------------
    r = uPhotonRingRadius + (sin(aPhase * 12.0 + uTime * 3.0) * 0.04);
    float photonOmega = uRotationSpeed * 7.5;
    angle = aPhase + uTime * photonOmega;
    z = (sin(angle * 4.0 + uTime) * 0.03);
    doppler = 1.0 + 0.6 * cos(angle); // High Doppler asymmetry on photon ring
  }

  // Position in local disk plane
  float posX = cos(angle) * r;
  float posY = z;
  float posZ = sin(angle) * r;

  vec4 mvPosition = modelViewMatrix * vec4(posX, posY, posZ, 1.0);

  // Depth-dependent particle sizing with relativistic scaling
  float pointSize = aSize * (155.0 / -mvPosition.z) * uPixelRatio * uLODFactor;
  if (aType > 1.5) {
    pointSize *= 1.3; // Photon ring particles are luminous and sharp
  }

  gl_PointSize = clamp(pointSize, 1.0, 50.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vAlpha = clamp(uLODFactor, 0.2, 1.0);
  vType = aType;
  vDoppler = doppler;
}
`;
