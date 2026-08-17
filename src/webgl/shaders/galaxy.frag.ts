export const galaxyFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDistance;
varying float vBranch;
varying float vNoise;
varying float vDepth;
varying float vLayer;

uniform float uCoreGlowSize;
uniform float uIntensity;

void main() {
  // Compute radial distance from particle center (gl_PointCoord is 0.0 to 1.0)
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  // Soft circular discard
  if (r > 0.5) {
    discard;
  }

  // Gaussian-style soft glowing falloff
  // Inner core is ultra-bright and soft, outer edges taper smoothly to transparent
  float coreGlow = exp(-28.0 * r * r);
  float outerHalo = exp(-6.0 * r * r);
  float shapeAlpha = mix(outerHalo, coreGlow, 0.4);

  // Core brightness boost
  vec3 finalColor = vColor;
  if (vLayer == 0.0) {
    finalColor += vec3(0.3, 0.25, 0.4) * coreGlow;
  }

  // Energy field specular highlights
  finalColor += vec3(1.0, 0.95, 0.9) * pow(coreGlow, 3.0) * 0.8;

  // Modulate alpha based on shape and layer intensity
  float alpha = shapeAlpha * vAlpha * uIntensity;

  // Add subtle depth atmospheric attenuation
  alpha *= clamp(1.2 - vDepth * 0.012, 0.2, 1.0);

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
