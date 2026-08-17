import { glslSimplexNoise } from './glslNoise';

export const galaxyVertexShader = /* glsl */ `
${glslSimplexNoise}

// Custom Attributes
attribute float aSize;
attribute float aScale;
attribute float aRandomness;
attribute float aPhase;
attribute float aBranch;     // 0.0 = warm magenta/pink branch, 1.0 = electric blue branch, 2.0 = core, 3.0 = halo/dust
attribute float aDistance;   // Normalized distance from center (0.0 to 1.0)
attribute float aLayer;      // 0 = core, 1 = inner arm, 2 = outer arm, 3 = energy stream, 4 = dust
attribute float aCoreType;   // -1 = non-core, 0 = micro dust, 1 = small luminous, 2 = filament, 3 = energy knot
attribute vec3 aInitialPos;

// Uniforms
uniform float uTime;
uniform float uSpeed;
uniform float uSizeMultiplier;
uniform float uPixelRatio;
uniform float uTurbulence;
uniform float uSpiralTightness;
uniform float uEntranceProgress;  // 0.0 to 1.0 for cinematic reveal
uniform vec3 uMousePos3D;        // Smooth 3D mouse coordinate in world space
uniform float uMouseInfluence;   // Dynamic gravitational pull strength
uniform float uTilt;             // Galaxy tilt parameter
uniform float uCoreFalloff;      // Radial light falloff steepness

// Varyings to Fragment Shader
varying vec3 vColor;
varying float vAlpha;
varying float vDistance;
varying float vBranch;
varying float vNoise;
varying float vDepth;
varying float vLayer;
varying float vCoreType;
varying float vAngular;     // Angular position for filament/gap patterns

// Palette definitions in linear RGB — outer galaxy & arms
const vec3 cDarkViolet    = vec3(0.149, 0.067, 0.239); // #26113D
const vec3 cPurple        = vec3(0.388, 0.239, 0.620); // #633D9E
const vec3 cElectricViolet= vec3(0.545, 0.333, 1.000); // #8B55FF
const vec3 cMagenta       = vec3(0.843, 0.361, 1.000); // #D75CFF
const vec3 cPink          = vec3(1.000, 0.459, 0.784); // #FF75C8
const vec3 cSoftRose      = vec3(1.000, 0.643, 0.843); // #FFA4D7
const vec3 cWarmPeach     = vec3(1.000, 0.773, 0.549); // #FFC58C

const vec3 cElectricBlue  = vec3(0.224, 0.420, 1.000); // #396BFF
const vec3 cBrightBlue    = vec3(0.369, 0.549, 1.000); // #5E8CFF
const vec3 cIceBlue       = vec3(0.616, 0.722, 1.000); // #9DB8FF
const vec3 cWhiteBlue     = vec3(0.863, 0.902, 1.000); // #DCE6FF

// Core-specific refined palette — warm→cool gradient
const vec3 cCoreWhite     = vec3(1.000, 0.973, 1.000); // #FFF8FF
const vec3 cCoreBlueWht   = vec3(0.918, 0.953, 1.000); // #EAF3FF
const vec3 cCorePeach     = vec3(1.000, 0.839, 0.910); // #FFD6E8
const vec3 cCorePink      = vec3(1.000, 0.753, 0.835); // #FFC0D5
const vec3 cCoreMagenta   = vec3(1.000, 0.561, 0.784); // #FF8FC8
const vec3 cCoreViolet    = vec3(0.914, 0.471, 0.816); // #E978D0
const vec3 cCoreDeepVio   = vec3(0.722, 0.365, 0.922); // #B85DEB
const vec3 cCorePurple    = vec3(0.569, 0.310, 0.878); // #914FE0

void main() {
  vec3 pos = aInitialPos;
  float dist = length(pos.xz);
  float normDist = clamp(dist / 40.0, 0.0, 1.0);
  
  // 1. Galactic Differential Rotation
  // Closer particles orbit slightly faster (realistic accretion/galaxy velocity curve)
  float orbitalVelocity = uSpeed * (1.8 / (sqrt(dist * 0.4 + 1.2) + 0.3));
  float currentAngle = uTime * orbitalVelocity;
  
  // Apply 2D rotation matrix in XZ plane
  float cosA = cos(currentAngle);
  float sinA = sin(currentAngle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  // 2. Multi-Frequency Fluid / Simplex Turbulence
  vec3 noiseCoord = vec3(pos.xz * 0.08, uTime * 0.12 + aPhase);
  vec3 curl = curlNoise(noiseCoord) * (1.5 + normDist * 3.0) * uTurbulence;
  
  // Vertical oscillation & breathing
  float verticalWave = sin(uTime * 0.4 + dist * 0.5 + aPhase * 6.28) * (0.3 + normDist * 0.8);
  pos.y += verticalWave + curl.y * 1.2;
  pos.xz += curl.xz * (0.8 + normDist * 0.5);

  // 3. Gravitational Mouse Attraction Well (Smooth 3D distortion)
  vec3 diffToMouse = uMousePos3D - pos;
  float distToMouse = length(diffToMouse);
  if (distToMouse > 0.001) {
    float pull = (1.0 / (distToMouse * distToMouse * 0.15 + 1.0)) * uMouseInfluence * 2.5;
    // Spiral twist around the mouse cursor
    vec3 tangent = cross(normalize(diffToMouse), vec3(0.0, 1.0, 0.0));
    pos += normalize(diffToMouse) * pull * 1.2 + tangent * pull * 0.6;
  }

  // 4. Cinematic Entrance Materialization (Expand outward & spin in)
  float entranceDelay = smoothstep(0.0, 1.0, uEntranceProgress * 1.4 - normDist * 0.5);
  pos *= clamp(entranceDelay, 0.001, 1.0);

  // 5. Compute angular position for filament/gap patterns in fragment shader
  float angularPos = atan(pos.z, pos.x);

  // 6. Compute Dynamic Color Spectrum
  vec3 col = cDarkViolet;
  float nVal = snoise(vec3(pos.xz * 0.05, uTime * 0.08));

  if (aBranch < 0.8) {
    // Warm Magenta / Pink / Peach Arm
    if (normDist < 0.25) {
      col = mix(cWarmPeach, cSoftRose, normDist * 4.0);
    } else if (normDist < 0.55) {
      col = mix(cSoftRose, cPink, (normDist - 0.25) * 3.33);
    } else if (normDist < 0.8) {
      col = mix(cPink, cMagenta, (normDist - 0.55) * 4.0);
    } else {
      col = mix(cMagenta, cPurple, (normDist - 0.8) * 5.0);
    }
  } else if (aBranch < 1.8) {
    // Electric Blue / Ice Blue Stream
    if (normDist < 0.25) {
      col = mix(cWhiteBlue, cIceBlue, normDist * 4.0);
    } else if (normDist < 0.55) {
      col = mix(cIceBlue, cBrightBlue, (normDist - 0.25) * 3.33);
    } else if (normDist < 0.8) {
      col = mix(cBrightBlue, cElectricBlue, (normDist - 0.55) * 4.0);
    } else {
      col = mix(cElectricBlue, cDarkViolet, (normDist - 0.8) * 5.0);
    }
  } else if (aBranch < 2.5) {
    // ---------------------------------------------------------------
    // Luminous Galactic Core — 6-stop warm→cool gradient
    // Tiny white center → blue-white → peach → pink → magenta → violet
    // ---------------------------------------------------------------
    float coreNormDist = clamp(dist / 5.5, 0.0, 1.0); // Normalize to core radius

    if (coreNormDist < 0.06) {
      // Central white point — extremely small
      col = mix(cCoreWhite, cCoreBlueWht, coreNormDist / 0.06);
    } else if (coreNormDist < 0.15) {
      // Inner transition: blue-white → warm peach
      col = mix(cCoreBlueWht, cCorePeach, (coreNormDist - 0.06) / 0.09);
    } else if (coreNormDist < 0.30) {
      // Warm peach → pink
      col = mix(cCorePeach, cCorePink, (coreNormDist - 0.15) / 0.15);
    } else if (coreNormDist < 0.50) {
      // Pink → magenta
      col = mix(cCorePink, cCoreMagenta, (coreNormDist - 0.30) / 0.20);
    } else if (coreNormDist < 0.75) {
      // Magenta → violet
      col = mix(cCoreMagenta, cCoreViolet, (coreNormDist - 0.50) / 0.25);
    } else {
      // Violet → deep violet / purple (transition into arms)
      col = mix(cCoreViolet, cCoreDeepVio, clamp((coreNormDist - 0.75) / 0.25, 0.0, 1.0));
    }

    // Slight color variation based on noise to break uniformity
    float coreNoiseVar = snoise(vec3(pos.xz * 0.15, uTime * 0.05 + aPhase)) * 0.08;
    col += vec3(coreNoiseVar * 0.5, coreNoiseVar * 0.3, coreNoiseVar);

  } else {
    // Outer Dust / Halo
    col = mix(cDarkViolet, cPurple, aRandomness);
  }

  // Add subtle energetic noise pulses
  col += vec3(max(0.0, nVal)) * 0.25;

  vColor = col;

  // Core alpha: gentle distance-based boost instead of flat 1.35
  vAlpha = (0.35 + aRandomness * 0.65) * entranceDelay;
  if (aLayer == 0.0) {
    // Controlled brightness: brighter near center, fading outward
    float coreNorm = clamp(dist / 5.5, 0.0, 1.0);
    float coreBrightBoost = 1.0 + 0.25 * (1.0 - coreNorm);

    // Energy knots get a brightness bump
    if (aCoreType == 3.0) coreBrightBoost += 0.3;
    // Filaments slightly brighter than dust
    if (aCoreType == 2.0) coreBrightBoost += 0.1;

    vAlpha *= coreBrightBoost;
  }
  if (aLayer == 4.0) vAlpha *= 0.45; // Outer dust is dimmer

  vDistance = normDist;
  vBranch = aBranch;
  vNoise = nVal;
  vLayer = aLayer;
  vCoreType = aCoreType;
  vAngular = angularPos;

  // View Transformation & Size Attenuation
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Depth-aware particle sizing with high-DPI scaling
  float baseSize = aSize * aScale * uSizeMultiplier;

  if (aLayer == 0.0) {
    // Core particles: distance-dependent sizing (smaller near center = finer detail)
    float coreNorm = clamp(dist / 5.5, 0.0, 1.0);
    float coreSizeMod = 0.6 + coreNorm * 0.6; // 0.6x at center, 1.2x at core edge

    // Sub-type sizing adjustments
    if (aCoreType == 0.0) coreSizeMod *= 0.8;  // Micro dust: smallest
    if (aCoreType == 2.0) coreSizeMod *= 0.85; // Filaments: thin
    if (aCoreType == 3.0) coreSizeMod *= 1.1;  // Energy knots: slightly larger

    baseSize *= coreSizeMod;
  }
  if (aLayer == 4.0) baseSize *= 0.7; // Outer dust micro size

  // 3D depth modulation for core particles: closer to camera = slightly larger/brighter
  if (aLayer == 0.0) {
    float depthBias = clamp(1.0 + pos.y * 0.04, 0.85, 1.15);
    baseSize *= depthBias;
  }

  // Perspective point size attenuation
  gl_PointSize = baseSize * (160.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.0, 120.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
