import { glslSimplexNoise } from './glslNoise';

export const foregroundDustVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
attribute vec3 aInitialPos;

uniform float uTime;
uniform float uPixelRatio;
uniform float uEntranceProgress;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec3 pos = aInitialPos;

  // Gentle, slow foreground floating drift
  vec3 noiseCoord = vec3(pos.xz * 0.04, uTime * 0.03 + aPhase);
  vec3 curl = curlNoise(noiseCoord) * 3.5;
  pos += curl;

  // Slow ambient drift
  float angle = uTime * 0.008;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  vColor = aColor;
  
  // Fade in with entrance
  vAlpha = 0.35 * smoothstep(0.0, 1.0, uEntranceProgress * 1.5);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Camera depth-attenuated point size (larger when close to camera)
  gl_PointSize = aSize * (150.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 2.0, 45.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
