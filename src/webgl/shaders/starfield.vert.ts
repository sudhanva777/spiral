export const starfieldVertexShader = /* glsl */ `
attribute float aSize;
attribute float aTwinkleSpeed;
attribute float aTwinklePhase;
attribute vec3 aColor;
attribute vec3 aInitialPos;

uniform float uTime;
uniform float uPixelRatio;
uniform float uEntranceProgress;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = aInitialPos;

  // Ultra-slow cosmic drift
  float angle = uTime * 0.003;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xz = rot * pos.xz;

  // Smooth sinusoidal twinkling
  float twinkle = sin(uTime * aTwinkleSpeed + aTwinklePhase) * 0.5 + 0.5;
  vAlpha = (0.2 + twinkle * 0.7) * smoothstep(0.0, 1.0, uEntranceProgress * 2.0);
  vColor = aColor;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (120.0 / -mvPosition.z) * uPixelRatio;
  gl_PointSize = clamp(gl_PointSize, 1.0, 15.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
