import { glslSimplexNoise } from './glslNoise';

export const energyJetVertexShader = /* glsl */ `
${glslSimplexNoise}

attribute float aSize;
attribute float aSpeed;
attribute float aRadius;
attribute float aPhase;
attribute float aAxis;       // +1.0 for upward jet, -1.0 for downward jet
attribute float aLayer;      // 0 = core beam, 1 = inner plasma sheath, 2 = outer stream, 3 = micro sparks
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uLODFactor;

varying vec3 vColor;
varying float vAlpha;
varying float vProgress;
varying float vLayer;

void main() {
  // Continuous outward propagation along central Y-axis (height: 0.0 to 52.0)
  float maxJetHeight = 52.0;
  float currentY = mod(uTime * aSpeed * 12.0 + aPhase * maxJetHeight, maxJetHeight);
  float progress = currentY / maxJetHeight; // 0.0 at core, 1.0 at jet apex

  // Relativistic collimation: beam is tight near core, slightly flares at tip
  float beamRadius = aRadius * (0.35 + progress * progress * 1.8);
  
  // Spiral helical twist around Y-axis
  float spiralAngle = aPhase * 6.28 + (currentY * 0.18) * aAxis + uTime * (aSpeed * 0.8);
  
  // Coherent procedural turbulence along the beam
  vec3 noiseCoord = vec3(beamRadius * 0.2, currentY * 0.08, uTime * 0.15);
  vec3 curl = curlNoise(noiseCoord) * (0.4 + progress * 1.2);

  float posX = cos(spiralAngle) * beamRadius + curl.x;
  float posZ = sin(spiralAngle) * beamRadius + curl.z;
  float posY = currentY * aAxis + curl.y * 0.5;

  vec3 pos = vec3(posX, posY, posZ);

  // Sizing: Core beam is compact, outer streams are slightly softer
  float baseSize = aSize * (1.2 - progress * 0.4);
  if (aLayer < 0.5) {
    baseSize *= 1.4; // Core beam is bright and prominent
  }

  // Fade out smoothly near jet tips and softly fade in at core nozzle
  float alphaFade = smoothstep(0.0, 0.08, progress) * smoothstep(1.0, 0.75, progress);

  vColor = aColor;
  vAlpha = alphaFade * (0.5 + 0.5 * (1.0 - progress));
  vProgress = progress;
  vLayer = aLayer;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  gl_PointSize = baseSize * (170.0 / -mvPosition.z) * uPixelRatio * uLODFactor;
  gl_PointSize = clamp(gl_PointSize, 1.0, 60.0 * uPixelRatio);

  gl_Position = projectionMatrix * mvPosition;
}
`;
