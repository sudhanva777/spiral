import { glslSimplexNoise } from './glslNoise';

export const filamentVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aPhase;
attribute float aDensity;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uLODFactor;

varying vec3 vColor;
varying float vAlpha;
varying float vDensity;

void main() {
  vec3 pos = position;

  // Subtle organic cosmic drift & fluid filament turbulence
  vec3 noiseCoord = vec3(pos * 0.015 + vec3(0.0, uTime * 0.04, aPhase));
  vec3 curl = curlNoise(noiseCoord) * 3.5;
  pos += curl * (0.4 + aDensity * 0.6);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float distToCam = -mvPosition.z;

  // Macro scale sizing: visible from deep space, soft when near
  float pointSize = aSize * (140.0 / max(distToCam, 10.0)) * uPixelRatio;
  gl_PointSize = clamp(pointSize, 1.0, 45.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vDensity = aDensity;

  // Distance fade: high visibility at macro cosmic zoom, subtle background at micro
  float macroFade = smoothstep(40.0, 160.0, distToCam);
  vAlpha = clamp(macroFade * (0.35 + aDensity * 0.65) * uLODFactor, 0.05, 0.85);
}
`;
