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

// Varyings to Fragment Shader
varying vec3 vColor;
varying float vAlpha;
varying float vDistance;
varying float vBranch;
varying float vNoise;
varying float vDepth;
varying float vLayer;

// Palette definitions in linear RGB
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

  // 5. Compute Dynamic Color Spectrum
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
    // Luminous Galactic Core (White-Blue with Warm Peach Halo)
    float coreBlend = normDist * 5.0;
    col = mix(cWhiteBlue, mix(cWarmPeach, cElectricViolet, clamp(sin(pos.x + uTime) * 0.5 + 0.5, 0.0, 1.0)), coreBlend);
  } else {
    // Outer Dust / Halo
    col = mix(cDarkViolet, cPurple, aRandomness);
  }

  // Add subtle energetic noise pulses
  col += vec3(max(0.0, nVal)) * 0.25;

  vColor = col;
  vAlpha = (0.35 + aRandomness * 0.65) * entranceDelay;
  if (aLayer == 0.0) vAlpha *= 1.35; // Core particles are denser and brighter
  if (aLayer == 4.0) vAlpha *= 0.45; // Outer dust is dimmer

  vDistance = normDist;
  vBranch = aBranch;
  vNoise = nVal;
  vLayer = aLayer;

  // View Transformation & Size Attenuation
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Depth-aware particle sizing with high-DPI scaling
  float baseSize = aSize * aScale * uSizeMultiplier;
  if (aLayer == 0.0) baseSize *= 1.4; // Core highlight sizing
  if (aLayer == 4.0) baseSize *= 0.7; // Outer dust micro size

  // Perspective point size attenuation
  gl_PointSize = baseSize * (160.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.0, 120.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
