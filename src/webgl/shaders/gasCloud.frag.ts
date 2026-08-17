export const gasCloudFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Soft billowing volumetric gas profile
  float core = 1.0 - smoothstep(0.0, 0.20, r);
  float halo = 1.0 - smoothstep(0.05, 0.50, r);
  float shape = core * 0.35 + halo * 0.65;

  vec3 finalColor = vColor;
  float alpha = shape * vAlpha * 0.45;

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
