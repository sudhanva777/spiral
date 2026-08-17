export const blackHoleFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vType;
varying float vDoppler;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Intense relativistic core profile with soft halo
  float core = 1.0 - smoothstep(0.0, 0.20, r);
  float halo = 1.0 - smoothstep(0.10, 0.50, r);
  float shape = core * 0.75 + halo * 0.25;

  vec3 finalColor = vColor * vDoppler;

  // Add specular core highlight for photon ring and inner accretion plasma
  if (vType > 1.5) {
    finalColor += vec3(0.5, 0.5, 0.6) * pow(core, 2.0);
  } else if (vType < 0.5) {
    finalColor += vec3(0.2, 0.2, 0.25) * core;
  }

  float alpha = shape * vAlpha;
  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
