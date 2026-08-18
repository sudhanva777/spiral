import { glslSimplexNoise } from './glslNoise';

export const molecularCloudVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
attribute float aDensity;

uniform float uTime;
uniform float uPixelRatio;
uniform float uTurbulence;
uniform float uRegionScale;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec3 pos = position;

  // Slow organic drift — dense knots stay put, diffuse gas billows.
  vec3 noiseVec = vec3(pos * 0.045 / uRegionScale, uTime * 0.035 + aPhase);
  vec3 curl = curlNoise(noiseVec) * (1.4 + 2.6 * (1.0 - aDensity)) * uTurbulence;
  pos += curl;

  // Gentle large-scale rotation around the region axis
  float angle = uTime * 0.012;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  vColor = aColor;
  vAlpha = aDensity;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Region-scale sprite sizes — gas billows large, dust grains small.
  float sizeScale = mix(1.0, 0.55, aDensity);
  gl_PointSize = aSize * sizeScale * (uRegionScale / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 2.0, 900.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;