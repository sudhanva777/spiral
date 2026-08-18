import { glslSimplexNoise } from './glslNoise';

export const blackHoleVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aSpeed;
attribute float aRadius;
attribute float aPhase;
attribute float aType; // 0=Accretion, 1=Infall, 2=PhotonRing, 3=EinsteinWarpedArc, 4=VerticalPlasma, 5=LightRay, 6=LensedStar
attribute vec3 aColor;
attribute vec3 aAux;   // [aux1, aux2, aux3] (e.g. sign, impact parameter, vertical scale)

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
varying float vCustomGlow;

void main() {
  float r = aRadius;
  float angle = aPhase;
  float z = 0.0;
  float doppler = 1.0;
  float customAlpha = 1.0;
  float customGlow = 1.0;

  vec3 localPos = vec3(0.0);

  if (aType < 0.5) {
    // =========================================================================
    // TYPE 0: EQUATORIAL ACCRETION DISK (Differential Keplerian Rotation)
    // =========================================================================
    float omega = (uRotationSpeed * 4.2) / pow(max(r, 0.7), 1.35);
    angle = aPhase + uTime * omega * aSpeed;

    // Relativistic spiral turbulence & plasma density waves
    float turbulence = snoise(vec3(r * 0.9, angle * 1.8, uTime * 0.45)) * 0.18;
    r += turbulence * (r / uDiskOuterRadius);

    // Subtle inward spiral drift
    r -= sin(uTime * 0.3 + aPhase) * 0.04;
    r = max(r, uDiskInnerRadius * 0.95);

    // Flared accretion disk thickness (ultra-thin near horizon, flared outer)
    float diskNorm = clamp((r - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius), 0.0, 1.0);
    z = (snoise(vec3(r * 1.4, angle * 2.2, uTime * 0.35)) * 0.28) * (0.05 + diskNorm * 0.42);

    // Relativistic Doppler beaming (Approaching matter significantly brighter)
    float cosAng = cos(angle);
    doppler = 0.75 + 0.60 * cosAng + 0.20 * cosAng * cosAng;

    localPos = vec3(cos(angle) * r, z, sin(angle) * r);

  } else if (aType < 1.5) {
    // =========================================================================
    // TYPE 1: INFALLING PLUNGING STREAMS (Matter Spiral Past ISCO into Horizon)
    // =========================================================================
    float streamSpan = uDiskOuterRadius * 1.25 - uHorizonRadius;
    float currentInfall = mod(aPhase * streamSpan - uTime * uInfallRate * 3.4 * aSpeed, streamSpan);
    r = uHorizonRadius + currentInfall;

    // Extreme angular acceleration as matter plunges inward
    float infallOmega = (uRotationSpeed * 6.8) / pow(max(r, 0.5), 1.55);
    angle = aPhase * 6.28 + uTime * infallOmega + (uDiskOuterRadius - r) * 1.6;

    float normDist = clamp((r - uHorizonRadius) / streamSpan, 0.0, 1.0);
    z = (snoise(vec3(r * 2.2, angle * 3.5, uTime * 0.6)) * 0.22) * (0.04 + normDist * 0.28);
    
    // Infalling matter fades and gets consumed as it crosses the event horizon
    customAlpha = smoothstep(uHorizonRadius * 1.01, uHorizonRadius * 1.35, r);
    doppler = 0.85 + 0.45 * cos(angle);

    localPos = vec3(cos(angle) * r, z, sin(angle) * r);

  } else if (aType < 2.5) {
    // =========================================================================
    // TYPE 2: PHOTON RING RELATIVISTIC MICRO-SPARKS (Boundary at 1.5 * r_s)
    // =========================================================================
    r = uPhotonRingRadius + (sin(aPhase * 16.0 + uTime * 4.5) * 0.035);
    float photonOmega = uRotationSpeed * 8.5;
    angle = aPhase + uTime * photonOmega;
    z = sin(angle * 6.0 + uTime * 2.0) * 0.025;
    
    // High relativistic beaming on photon ring
    doppler = 1.0 + 0.75 * cos(angle);
    customGlow = 1.6;

    localPos = vec3(cos(angle) * r, z, sin(angle) * r);

  } else if (aType < 3.5) {
    // =========================================================================
    // TYPE 3: EINSTEIN GRAVITATIONALLY WARPED ACCRETION DISK ARC (Interstellar Lensing)
    // The rear of the accretion disk is bent over and under the black hole horizon
    // =========================================================================
    float omega = (uRotationSpeed * 3.8) / pow(max(r, 0.8), 1.35);
    angle = aPhase + uTime * omega * aSpeed;

    // Lift vertically based on angle and Einstein deflection
    float verticalSign = aAux.x > 0.0 ? 1.0 : -1.0;
    float warpHeight = sqrt(max(0.0, r * r - uHorizonRadius * uHorizonRadius * 0.7)) * 0.72;
    float warpMod = 0.55 + 0.45 * abs(sin(angle));
    z = verticalSign * warpHeight * warpMod + (snoise(vec3(r * 1.2, angle * 2.0, uTime * 0.3)) * 0.15);

    // Projected horizontal arc radius
    float warpedR = max(uPhotonRingRadius * 1.05, r * abs(cos(angle)) * 0.85 + uHorizonRadius * 0.4);
    
    float cosAng = cos(angle);
    doppler = 0.8 + 0.55 * cosAng;
    customGlow = 1.35;

    localPos = vec3(cos(angle) * warpedR, z, sin(angle) * warpedR * 0.45);

  } else if (aType < 4.5) {
    // =========================================================================
    // TYPE 4: VERTICAL THERMAL PLASMA & CORONA
    // =========================================================================
    float omega = (uRotationSpeed * 2.6) / pow(max(r, 1.0), 1.2);
    angle = aPhase + uTime * omega * aSpeed;

    float verticalScale = aAux.y; // e.g. -1.0 to 1.0
    float diskNorm = clamp((r - uDiskInnerRadius) / (uDiskOuterRadius - uDiskInnerRadius), 0.0, 1.0);
    z = verticalScale * (0.35 + diskNorm * 1.25) + snoise(vec3(r * 1.1, angle * 1.5, uTime * 0.4)) * 0.3;

    doppler = 0.85 + 0.35 * cos(angle);
    customAlpha = 0.75;

    localPos = vec3(cos(angle) * r, z, sin(angle) * r);

  } else if (aType < 5.5) {
    // =========================================================================
    // TYPE 5: CURVED & CAPTURED LIGHT RAYS
    // Beams of photons passing near the singularity with gravitational deflection
    // =========================================================================
    float impactParam = aRadius; // Impact parameter b
    float isCaptured = aAux.z;   // 1.0 if captured, 0.0 if escaping

    float progress = mod(uTime * aSpeed * 3.5 + aPhase * 25.0, 30.0) - 15.0; // t in [-15, 15]

    if (isCaptured > 0.5) {
      // Captured ray: spirals inward into horizon
      float captureT = clamp((progress + 15.0) / 25.0, 0.0, 1.0);
      float currentR = mix(uDiskOuterRadius * 1.4, uHorizonRadius * 0.85, pow(captureT, 1.4));
      float spiralAng = aPhase * 6.28 + captureT * 18.0;
      
      customAlpha = smoothstep(uHorizonRadius * 0.95, uHorizonRadius * 1.4, currentR);
      localPos = vec3(cos(spiralAng) * currentR, sin(spiralAng * 2.0) * 0.1, sin(spiralAng) * currentR);
    } else {
      // Escaping ray: hyperbolic deflection path
      float rayX = progress;
      float distToCenter = sqrt(rayX * rayX + impactParam * impactParam);
      float deflection = (uPhotonRingRadius * 1.8) / max(distToCenter, uHorizonRadius * 1.1);
      float rayY = impactParam - deflection;
      
      // Rotate ray by initial trajectory angle
      float rayAngle = aAux.y;
      localPos = vec3(
        cos(rayAngle) * rayX - sin(rayAngle) * rayY,
        sin(progress * 0.5) * 0.08,
        sin(rayAngle) * rayX + cos(rayAngle) * rayY
      );
      customAlpha = smoothstep(15.0, 8.0, abs(progress)) * 0.9;
    }

    doppler = 1.1;
    customGlow = 1.4;

  } else {
    // =========================================================================
    // TYPE 6: LENSED BACKGROUND STARS
    // Background stars gravitationally deflected into arcs around event horizon
    // =========================================================================
    vec2 starPlane = vec2(cos(aPhase), sin(aPhase)) * aRadius;
    float dist = length(starPlane);
    
    // Gravitational deflection angle ~ Einstein ring radius squared / dist
    float einsteinRadius = uPhotonRingRadius * 1.35;
    float deflection = (einsteinRadius * einsteinRadius) / max(dist, uHorizonRadius * 1.05);
    vec2 lensedPos = starPlane + normalize(starPlane) * deflection * 0.85;

    // Place on background plane behind black hole
    localPos = vec3(lensedPos.x, aAux.x * 0.2, lensedPos.y);
    doppler = 1.0 + 0.3 * sin(aPhase * 3.0 + uTime);
    customGlow = 1.2;
  }

  vec4 mvPosition = modelViewMatrix * vec4(localPos, 1.0);

  // Depth-dependent particle sizing with relativistic scaling
  float pointSize = aSize * (165.0 / -mvPosition.z) * uPixelRatio * uLODFactor;
  
  if (aType > 1.5 && aType < 2.5) {
    pointSize *= 1.45; // Photon ring particles are luminous and sharp
  } else if (aType > 2.5 && aType < 3.5) {
    pointSize *= 1.25; // Warped disk arc
  } else if (aType > 4.5 && aType < 5.5) {
    pointSize *= 1.15; // Light rays
  }

  gl_PointSize = clamp(pointSize, 1.0, 65.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vAlpha = clamp(uLODFactor * customAlpha, 0.0, 1.0);
  vType = aType;
  vDoppler = doppler;
  vCustomGlow = customGlow;
}
`;
