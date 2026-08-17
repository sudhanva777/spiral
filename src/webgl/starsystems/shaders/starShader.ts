import { glslSimplexNoise } from '../../shaders/glslNoise';

export const starCoreVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const starCoreFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform vec3 uCoreColor;
uniform vec3 uCoronaColor;
uniform vec3 uGlowColor;
uniform float uPulseSpeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float nDotV = max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);

  // Dynamic surface solar granulations
  float noiseVal = snoise(vPosition * 3.5 + vec3(0.0, uTime * uPulseSpeed * 0.4, 0.0));
  float noiseVal2 = snoise(vPosition * 8.0 - vec3(uTime * uPulseSpeed * 0.6, 0.0, 0.0));
  float granulation = noiseVal * 0.65 + noiseVal2 * 0.35;

  // Thermal limb darkening / solar center peak
  float centerIntensity = pow(nDotV, 0.6) * (1.0 + granulation * 0.18);
  vec3 col = mix(uCoronaColor, uCoreColor, centerIntensity);
  col = mix(col, vec3(1.0), pow(nDotV, 2.2) * 0.75);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const starCoronaVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const starCoronaFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform vec3 uCoronaColor;
uniform vec3 uGlowColor;
uniform float uPulseSpeed;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec2 coord = vUv - vec2(0.5);
  float dist = length(coord) * 2.0;

  if (dist > 1.0) {
    discard;
  }

  // Coronal filament turbulence
  float angle = atan(coord.y, coord.x);
  float noise1 = snoise(vec3(cos(angle * 6.0), sin(angle * 6.0), uTime * uPulseSpeed * 0.5) * 1.5);
  float noise2 = snoise(vec3(coord * 4.0, uTime * uPulseSpeed * 0.3));
  float filament = (noise1 * 0.6 + noise2 * 0.4) * 0.25;

  float r = dist + filament;
  float alpha = pow(max(1.0 - r, 0.0), 2.2) * uIntensity;

  vec3 col = mix(uCoronaColor, uGlowColor, smoothstep(0.0, 0.9, dist));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;
