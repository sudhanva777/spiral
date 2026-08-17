export const filamentFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDensity;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Soft Gaussian filament profile with diffuse ethereal halo
  float core = 1.0 - smoothstep(0.0, 0.25, r);
  float halo = 1.0 - smoothstep(0.10, 0.50, r);
  float shape = core * 0.45 + halo * 0.55;

  vec3 finalColor = vColor;
  if (vDensity > 0.7) {
    // Dense spine highlight
    finalColor += vec3(0.15, 0.20, 0.30) * core;
  }

  float alpha = shape * vAlpha * 0.75;
  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
