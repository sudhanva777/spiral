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
varying float vLuminosity;
varying float vAngular;
varying float vPulseFactor;
varying float vCoreInspection;

uniform float uCoreGlowSize;
uniform float uIntensity;
uniform float uCoreFalloff;
uniform float uTime;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // ---------------------------------------------------------------
  // SHARPER PARTICLE SHAPE PROFILE
  // Bright particle core + soft subtle halo = individual star readability
  // ---------------------------------------------------------------
  float coreSmoothRadius = mix(0.26, 0.20, vCoreInspection);
  float particleCore = 1.0 - smoothstep(0.0, coreSmoothRadius, r);
  float particleHalo = 1.0 - smoothstep(0.06, 0.50, r);
  float shapeAlpha = particleCore * 0.84 + particleHalo * 0.16;

  vec3 finalColor = vColor;

  // ---------------------------------------------------------------
  // 1. CORE PARTICLE RENDERING (Layer 0)
  // ---------------------------------------------------------------
  if (vLayer < 0.5) {
    float coreRadial = clamp(vDistance * 7.5, 0.0, 1.0);
    float radialGlow = exp(-coreRadial * uCoreFalloff);

    // Dark Gap Modulation
    float gapFreq1 = snoise(vec3(vAngular * 4.5 + uTime * 0.02, coreRadial * 10.0, 0.5));
    float gapFreq2 = snoise(vec3(vAngular * 8.0 - uTime * 0.015, coreRadial * 18.0, 1.7));
    float gapNoise = gapFreq1 * 0.6 + gapFreq2 * 0.4;

    float gapMask = smoothstep(0.05, 0.25, coreRadial) * smoothstep(0.95, 0.6, coreRadial);
    float darkGap = 1.0 - gapMask * smoothstep(-0.05, 0.35, -gapNoise) * 0.55;

    // Emissive White-Hot Highlight at Center
    float emissiveStrength = pow(particleCore, 2.2) * 0.45 * radialGlow;
    vec3 emissiveTint = mix(
      vec3(1.0, 0.98, 0.95),  // Warm white nucleus
      vec3(0.92, 0.95, 1.0),  // Cool white-blue
      coreRadial
    );
    finalColor += emissiveTint * emissiveStrength;

    // Apply radial brightness modulation and dark gaps
    float brightnessMod = mix(radialGlow, 1.0, 0.35);
    finalColor *= brightnessMod * darkGap;

    // Core inspection micro-clarity boost
    if (vCoreInspection > 0.01) {
      float microLOD = pow(particleCore, 2.0) * (0.20 * vCoreInspection);
      finalColor += vec3(0.12, 0.10, 0.16) * microLOD;
    }

  } else {
    // ---------------------------------------------------------------
    // 2. NON-CORE PARTICLES (Luminosity Hierarchy & Selective Bloom)
    // ---------------------------------------------------------------
    if (vLuminosity > 2.0) {
      // Starburst Knots & Supergiants: High-intensity white core + vivid color halo
      float superSpecular = pow(particleCore, 2.5) * 0.85;
      finalColor += vec3(1.0, 0.98, 0.95) * superSpecular;
      finalColor *= 1.25;
    } else if (vLuminosity > 1.2) {
      // Bright Stars & Clusters: Crisp specular highlight
      float specular = pow(particleCore, 3.0) * 0.45;
      finalColor += vec3(1.0, 0.96, 0.92) * specular;
      finalColor *= 1.10;
    } else if (vLuminosity < 0.6) {
      // Micro-Dust: Preserve rich saturated color without adding white glaze
      shapeAlpha = particleCore * 0.70 + particleHalo * 0.30;
      finalColor *= 0.90;
    }
  }

  // ---------------------------------------------------------------
  // 3. CLICK ENERGY WAVE PHOTONIC FLASH
  // ---------------------------------------------------------------
  if (vPulseFactor > 0.001) {
    vec3 pulseCrest = mix(vec3(0.4, 0.6, 1.0), vec3(1.0, 0.8, 0.95), sin(vDistance * 6.28) * 0.5 + 0.5);
    finalColor += pulseCrest * (vPulseFactor * 1.5 * particleCore);
  }

  // ---------------------------------------------------------------
  // 4. PHYSICAL DEPTH PERCEPTION & ATMOSPHERIC PERSPECTIVE FOG
  // ---------------------------------------------------------------
  float depthBrightness = clamp(1.0 + (35.0 - vDepth) * 0.006, 0.72, 1.25);
  finalColor *= depthBrightness;

  float fogFactor = smoothstep(25.0, 90.0, vDepth);
  vec3 cosmicBackground = vec3(0.008, 0.008, 0.031);
  finalColor = mix(finalColor, cosmicBackground, fogFactor * 0.35);

  // ---------------------------------------------------------------
  // 5. FINAL ALPHA COMPOSITION
  // ---------------------------------------------------------------
  float alpha = shapeAlpha * vAlpha * uIntensity;
  alpha *= clamp(1.2 - vDepth * 0.010, 0.25, 1.0);

  if (vLayer < 0.5) {
    float depthFade = clamp(1.0 - (vDepth - 30.0) * 0.008, 0.7, 1.0);
    alpha *= depthFade;
  }

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
