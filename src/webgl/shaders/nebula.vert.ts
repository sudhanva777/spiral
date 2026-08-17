import { glslSimplexNoise } from './glslNoise';

export const nebulaVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
attribute vec3 aInitialPos;

uniform float uTime;
uniform float uPixelRatio;
uniform float uEntranceProgress;
uniform float uTurbulence;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec3 pos = aInitialPos;
  
  // Large scale slow billowing cloud drift
  vec3 noiseVec = vec3(pos.xz * 0.03, uTime * 0.04 + aPhase);
  vec3 curl = curlNoise(noiseVec) * 6.0 * uTurbulence;
  pos += curl;

  // Slow global cosmic rotation
  float angle = uTime * 0.015;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  // Entrance reveal
  pos *= smoothstep(0.0, 1.0, uEntranceProgress * 1.2);

  vColor = aColor;
  vAlpha = 0.12 * smoothstep(0.0, 1.0, uEntranceProgress);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Billowing soft nebula size
  gl_PointSize = aSize * (280.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 10.0, 450.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
