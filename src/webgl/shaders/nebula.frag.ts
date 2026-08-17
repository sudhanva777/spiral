export const nebulaFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

uniform float uIntensity;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  // Extremely soft, ethereal atmospheric falloff for background nebula dust
  float softAlpha = exp(-10.0 * r * r);
  
  // Soft edge tapering
  softAlpha *= smoothstep(0.5, 0.1, r);

  float alpha = softAlpha * vAlpha * uIntensity;
  alpha *= clamp(1.2 - vDepth * 0.008, 0.1, 1.0);

  gl_FragColor = vec4(vColor, alpha);
}
`;
