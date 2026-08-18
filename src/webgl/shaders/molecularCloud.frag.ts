export const molecularCloudFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

uniform float uIntensity;
uniform float uMode; // 0 = additive glow gas, 1 = dark obscuring dust

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);
  if (r > 0.5) discard;

  // Soft gaussian falloff — no hard sprite edges.
  float soft = exp(-7.0 * r * r);
  soft *= smoothstep(0.5, 0.08, r);

  // Fine-grained interior structure: faint noise filaments inside each sprite.
  float n = fract(sin(dot(gl_PointCoord * 12.0, vec2(12.9898, 78.233))) * 43758.5453);

  if (uMode > 0.5) {
    // Dark dust: obscures rather than emits. Normal blending, low alpha.
    float alpha = soft * vAlpha * (0.35 + 0.65 * n) * uIntensity;
    alpha = clamp(alpha, 0.0, 0.55);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
  } else {
    // Ionized gas: additive emission with density falloff.
    float alpha = soft * vAlpha * uIntensity;
    alpha *= clamp(1.25 - vDepth * 0.0022, 0.15, 1.0);
    vec3 col = vColor * (0.75 + 0.5 * n);
    gl_FragColor = vec4(col, alpha);
  }
}
`;