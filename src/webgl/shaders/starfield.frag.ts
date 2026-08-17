export const starfieldFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Crisp stellar point with soft micro-glow
  float glow = exp(-18.0 * r * r);
  gl_FragColor = vec4(vColor, glow * vAlpha);
}
`;
