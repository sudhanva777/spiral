export const foregroundDustFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Soft out-of-focus bokeh circle falloff
  float softBokeh = smoothstep(0.5, 0.05, r);
  float innerGlow = exp(-8.0 * r * r);

  float shape = mix(softBokeh, innerGlow, 0.35);

  // Depth attenuation: smoothly fade if too close to camera plane (prevents clipping artifacts)
  float nearFade = smoothstep(4.0, 10.0, vDepth);
  float farFade = smoothstep(90.0, 45.0, vDepth);
  float depthFade = nearFade * farFade;

  float finalAlpha = shape * vAlpha * depthFade * 0.45;

  gl_FragColor = vec4(vColor, clamp(finalAlpha, 0.0, 1.0));
}
`;
