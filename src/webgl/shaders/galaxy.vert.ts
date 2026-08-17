import { glslSimplexNoise } from './glslNoise';

export const galaxyVertexShader = /* glsl */ `
${glslSimplexNoise}

// Custom Attributes
attribute vec3 aColor;       // Per-particle linear RGB computed from galaxy palette & morphology
attribute float aSize;
attribute float aScale;
attribute float aRandomness;
attribute float aPhase;
attribute float aBranch;     // Arm / branch index
attribute float aDistance;   // Normalized distance from center (0.0 to 1.0)
attribute float aLayer;      // 0 = core, 1 = inner arm/ring, 2 = outer arm, 3 = energy stream/nursery, 4 = dust
attribute float aCoreType;   // -1 = non-core, 0 = micro dust, 1 = small luminous, 2 = filament, 3 = energy knot
attribute float aLuminosity; // Population luminosity hierarchy (0.35 = micro dust, 1.0 = normal, 4.5+ = supergiant)
attribute vec3 aInitialPos;

// Uniforms
uniform float uTime;
uniform float uSpeed;
uniform float uSizeMultiplier;
uniform float uPixelRatio;
uniform float uTurbulence;
uniform float uSpiralTightness;
uniform float uEntranceProgress;  // 0.0 to 1.0 for cinematic reveal
uniform vec3 uMousePos3D;        // Smooth 3D mouse coordinate in galaxy local space
uniform float uMouseInfluence;   // Dynamic gravitational pull strength
uniform float uTilt;             // Galaxy tilt parameter
uniform float uCoreFalloff;      // Radial light falloff steepness
uniform float uLODFactor;        // 1.0 (close full LOD) to 0.35 (distant representation)

// Click Energy Pulse & Core Inspection
uniform vec3 uPulseOrigin;       // 3D origin of the expanding energy wave in local space
uniform float uPulseProgress;    // 0.0 to 1.0 expansion progress
uniform float uPulseStrength;    // Amplitude of the wave
uniform float uCoreInspection;   // 0.0 (normal) to 1.0 (close-up inspection mode)

// Varyings to Fragment Shader
varying vec3 vColor;
varying float vAlpha;
varying float vDistance;
varying float vBranch;
varying float vNoise;
varying float vDepth;
varying float vLayer;
varying float vCoreType;
varying float vLuminosity;
varying float vAngular;          // Angular position for filament/gap patterns
varying float vPulseFactor;      // Luminous wavefront flash intensity
varying float vCoreInspection;   // LOD factor for fragment shader

void main() {
  vec3 pos = aInitialPos;
  float dist = length(pos.xz);
  float normDist = clamp(dist / 42.0, 0.0, 1.0);
  
  // 1. Galactic Differential Rotation
  float orbitalVelocity = uSpeed * (1.8 / (sqrt(dist * 0.4 + 1.2) + 0.3));
  float currentAngle = uTime * orbitalVelocity;
  
  float cosA = cos(currentAngle);
  float sinA = sin(currentAngle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  // 2. Multi-Frequency Fluid / Simplex Turbulence
  vec3 noiseCoord = vec3(pos.xz * 0.08, uTime * 0.12 + aPhase);
  vec3 curl = curlNoise(noiseCoord) * (1.5 + normDist * 3.0) * uTurbulence;
  
  float verticalWave = sin(uTime * 0.4 + dist * 0.5 + aPhase * 6.28) * (0.3 + normDist * 0.8);
  pos.y += verticalWave + curl.y * 1.2;
  pos.xz += curl.xz * (0.8 + normDist * 0.5);

  // 3. Interactive Gravitational Lensing & Relativistic Frame Dragging
  vec3 diffToMouse = uMousePos3D - pos;
  float distToMouse = length(diffToMouse);
  if (distToMouse > 0.001) {
    float gravityFalloff = smoothstep(18.0, 0.0, distToMouse);
    float pull = gravityFalloff * gravityFalloff * uMouseInfluence * 2.8;
    vec3 tangent = cross(normalize(diffToMouse + vec3(0.0001, 0.0, 0.0)), vec3(0.0, 1.0, 0.0));
    pos += normalize(diffToMouse) * (pull * 1.25) + tangent * (pull * 0.75);
    pos.y += sin(distToMouse * 0.6 - uTime * 2.5) * (gravityFalloff * uMouseInfluence * 0.5);
  }

  // 4. Click Energy Wave Pulse
  float pulseWaveRadius = uPulseProgress * 44.0;
  float distToPulse = length(pos - uPulseOrigin);
  float pulseDistDiff = abs(distToPulse - pulseWaveRadius);
  float pulseWaveFactor = smoothstep(3.5, 0.0, pulseDistDiff) * (1.0 - uPulseProgress) * uPulseStrength;
  
  if (pulseWaveFactor > 0.001) {
    vec3 pulseDir = distToPulse > 0.01 ? normalize(pos - uPulseOrigin) : vec3(0.0, 1.0, 0.0);
    pos += pulseDir * (pulseWaveFactor * 1.6);
    pos.y += sin(pulseDistDiff * 1.8) * (pulseWaveFactor * 1.2);
  }

  // 5. Cinematic Entrance Materialization
  float entranceDelay = smoothstep(0.0, 1.0, uEntranceProgress * 1.4 - normDist * 0.5);
  pos *= clamp(entranceDelay, 0.001, 1.0);

  // 6. Angular position for filament/gap modulation
  float angularPos = atan(pos.z, pos.x);

  // 7. Base Color from configuration attribute + subtle noise pulses
  vec3 col = aColor;
  float nVal = snoise(vec3(pos.xz * 0.05, uTime * 0.08));
  col += vec3(max(0.0, nVal)) * 0.16;

  vColor = col;

  // Alpha computation scaled by particle population luminosity
  float lumFactor = clamp(aLuminosity, 0.3, 3.0);
  vAlpha = (0.35 + aRandomness * 0.65) * entranceDelay * (0.65 + lumFactor * 0.35);
  
  if (aLayer == 0.0) {
    float coreNorm = clamp(dist / 5.5, 0.0, 1.0);
    float coreBrightBoost = 1.0 + 0.35 * (1.0 - coreNorm);
    if (aCoreType == 3.0) coreBrightBoost += 0.4;
    vAlpha *= coreBrightBoost;
  }
  if (aLayer == 4.0) vAlpha *= 0.50;

  vDistance = normDist;
  vBranch = aBranch;
  vNoise = nVal;
  vLayer = aLayer;
  vCoreType = aCoreType;
  vLuminosity = aLuminosity;
  vAngular = angularPos;
  vPulseFactor = pulseWaveFactor;
  vCoreInspection = uCoreInspection;

  // View Transformation & Hierarchical Size Attenuation
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  float baseSize = aSize * aScale * uSizeMultiplier;
  
  // Apply Luminosity Hierarchy to Point Size (dim micro-particles stay compact, bright stars expand)
  baseSize *= clamp(aLuminosity * 0.65 + 0.35, 0.4, 2.8);

  if (aLayer == 0.0) {
    float coreNorm = clamp(dist / 5.5, 0.0, 1.0);
    float coreSizeMod = 0.65 + coreNorm * 0.55;
    float inspectionSizeMod = mix(1.0, 0.75, uCoreInspection);
    baseSize *= coreSizeMod * inspectionSizeMod;
  }
  if (aLayer == 4.0) baseSize *= 0.75;

  // Depth-based sizing curve
  float depthSizeMod = clamp(1.0 + (35.0 - vDepth) * 0.007, 0.75, 1.30);
  baseSize *= depthSizeMod;

  // Scale-Aware LOD Point Size Scaling
  baseSize *= mix(0.75, 1.0, uLODFactor);

  // Perspective point size attenuation
  gl_PointSize = baseSize * (165.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.0, 130.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
