import { glslSimplexNoise } from './glslNoise';

export const galaxyFragmentShader = /* glsl */ `
${glslSimplexNoise}

varying vec3 vColor;
varying float vAlpha;
varying float vDistance;
varying float vBranch;
varying float vNoise;
varying float vDepth;
varying float vLayer;
varying float vCoreType;
varying float vAngular;
varying float vPulseFactor;
varying float vCoreInspection;

uniform float uCoreGlowSize;
uniform float uIntensity;
uniform float uCoreFalloff;
uniform float uTime;

void main() {
  // Compute radial distance from particle center (gl_PointCoord is 0.0 to 1.0)
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  // Soft circular discard
  if (r > 0.5) {
    discard;
  }

  // ---------------------------------------------------------------
  // SHARPER PARTICLE SHAPE
  // Bright particle center + small soft halo = individual readability
  // In Core Inspection Mode, sharpen particles even further for micro-clarity
  // ---------------------------------------------------------------
  float coreSmoothRadius = mix(0.28, 0.22, vCoreInspection);
  float particleCore = 1.0 - smoothstep(0.0, coreSmoothRadius, r);
  float particleHalo = 1.0 - smoothstep(0.08, 0.50, r);
  float shapeAlpha = particleCore * 0.82 + particleHalo * 0.18;

  vec3 finalColor = vColor;

  // ---------------------------------------------------------------
  // CORE PARTICLE RENDERING (Layer 0)
  // ---------------------------------------------------------------
  if (vLayer < 0.5) {
    // Distance from galactic center (0.0 = center, 1.0 = outer galaxy)
    float coreRadial = clamp(vDistance * 7.2, 0.0, 1.0); // Re-normalize for core region

    // ---------------------------------------------------------------
    // RADIAL LIGHT FALLOFF — exponential, steep near center, soft farther
    // ---------------------------------------------------------------
    float radialGlow = exp(-coreRadial * uCoreFalloff);

    // ---------------------------------------------------------------
    // DARK GAP MODULATION
    // Creates filament/gap pattern: bright → dark → bright → dark
    // Uses angular position + radial distance for organic structure
    // ---------------------------------------------------------------
    float gapFreq1 = snoise(vec3(vAngular * 4.5 + uTime * 0.02, coreRadial * 10.0, 0.5));
    float gapFreq2 = snoise(vec3(vAngular * 8.0 - uTime * 0.015, coreRadial * 18.0, 1.7));
    float gapFreq3 = snoise(vec3(vAngular * 2.0 + 3.0, coreRadial * 6.0, uTime * 0.01));
    float gapNoise = gapFreq1 * 0.5 + gapFreq2 * 0.3 + gapFreq3 * 0.2;

    // Dark gaps: regions where noise is negative become darker
    float gapMask = smoothstep(0.05, 0.25, coreRadial) * smoothstep(0.95, 0.6, coreRadial);
    float darkGap = 1.0 - gapMask * smoothstep(-0.05, 0.35, -gapNoise) * 0.55;

    // ---------------------------------------------------------------
    // EMISSIVE CONTROL — controlled white highlight at particle center
    // ---------------------------------------------------------------
    float emissiveStrength = pow(particleCore, 2.5) * 0.30 * radialGlow;

    // Very center: slight warm-white emissive tint
    vec3 emissiveTint = mix(
      vec3(1.0, 0.96, 0.98),  // Warm white
      vec3(0.92, 0.95, 1.0),  // Cool blue-white
      coreRadial
    );
    finalColor += emissiveTint * emissiveStrength;

    // Apply radial brightness falloff (to color, not alpha — preserves structure)
    float brightnessMod = mix(radialGlow, 1.0, 0.35); // Never fully dark
    finalColor *= brightnessMod;

    // Apply dark gaps
    finalColor *= darkGap;

    // ---------------------------------------------------------------
    // PER-TYPE ADJUSTMENTS
    // ---------------------------------------------------------------
    if (vCoreType > 2.5) {
      // Energy knots: slightly brighter and warmer tint
      finalColor += vec3(0.12, 0.06, 0.08) * radialGlow * particleCore;
    } else if (vCoreType > 1.5) {
      // Filament particles: slightly sharper rendering
      shapeAlpha = particleCore * 0.88 + particleHalo * 0.12;
    }

    // Phase 5: Core Inspection micro-particle boost
    if (vCoreInspection > 0.01) {
      // Enhance contrast and reveal subtle micro-dust structures
      float microLOD = pow(particleCore, 2.0) * (0.15 * vCoreInspection);
      finalColor += vec3(0.1, 0.08, 0.15) * microLOD;
    }

  } else {
    // ---------------------------------------------------------------
    // NON-CORE PARTICLES — arm / stream specular highlights
    // ---------------------------------------------------------------
    float specular = pow(particleCore, 3.0) * 0.5;
    finalColor += vec3(1.0, 0.95, 0.9) * specular;
  }

  // ---------------------------------------------------------------
  // PHASE 4: CLICK ENERGY WAVE PHOTONIC FLASH
  // Adds a luminous crest along the propagating wavefront
  // ---------------------------------------------------------------
  if (vPulseFactor > 0.001) {
    vec3 pulseCrest = mix(vec3(0.4, 0.6, 1.0), vec3(1.0, 0.8, 0.95), sin(vDistance * 6.28) * 0.5 + 0.5);
    finalColor += pulseCrest * (vPulseFactor * 1.5 * particleCore);
  }

  // ---------------------------------------------------------------
  // PHASE 2: PHYSICAL DEPTH PERCEPTION & ATMOSPHERIC PERSPECTIVE FOG
  // Near particles slightly brighter, far particles gently fade into cosmic depth
  // ---------------------------------------------------------------
  float depthBrightness = clamp(1.0 + (35.0 - vDepth) * 0.006, 0.72, 1.25);
  finalColor *= depthBrightness;

  // Subtle atmospheric perspective depth fog towards deep space
  float fogFactor = smoothstep(25.0, 85.0, vDepth);
  vec3 cosmicBackground = vec3(0.008, 0.008, 0.031);
  finalColor = mix(finalColor, cosmicBackground, fogFactor * 0.35);

  // ---------------------------------------------------------------
  // FINAL ALPHA COMPOSITION
  // ---------------------------------------------------------------
  float alpha = shapeAlpha * vAlpha * uIntensity;

  // Depth atmospheric attenuation
  alpha *= clamp(1.2 - vDepth * 0.010, 0.25, 1.0);

  // Core depth modulation: particles farther from camera slightly dimmer
  if (vLayer < 0.5) {
    float depthFade = clamp(1.0 - (vDepth - 30.0) * 0.008, 0.7, 1.0);
    alpha *= depthFade;
  }

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
