export const energyJetFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vProgress;
varying float vLayer;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Intense relativistic energy point falloff
  float core = 1.0 - smoothstep(0.0, 0.22, r);
  float halo = 1.0 - smoothstep(0.05, 0.50, r);
  float shape = core * 0.85 + halo * 0.15;

  // Add specular core brilliance for innermost beam particles
  vec3 finalColor = vColor;
  if (vLayer < 0.5) {
    finalColor += vec3(0.35, 0.45, 0.6) * pow(core, 2.0);
  }

  float alpha = shape * vAlpha;
  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
