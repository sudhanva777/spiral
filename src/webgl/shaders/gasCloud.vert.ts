import { glslSimplexNoise } from './glslNoise';

export const gasCloudVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uLODFactor;

varying vec3 vColor;
varying float vAlpha;
varying float vDepth;

void main() {
  vec3 pos = position;

  // Gentle fluid gas expansion & breathing
  vec3 noiseCoord = vec3(pos * 0.02 + vec3(uTime * 0.03, 0.0, aPhase));
  vec3 curl = curlNoise(noiseCoord) * 4.2;
  pos += curl;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  float pointSize = aSize * (150.0 / max(vDepth, 5.0)) * uPixelRatio;
  gl_PointSize = clamp(pointSize, 2.0, 95.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vAlpha = clamp(uLODFactor, 0.15, 0.85);
}
`;
