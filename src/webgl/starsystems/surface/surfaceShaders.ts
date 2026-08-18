import { glslSimplexNoise } from '../../shaders/glslNoise';

// ============================================================================
// IC 1579 — AURELIA SURFACE EXPERIENCE SHADERS
// Terrain, cloud shell, and sky dome for the flagship ringed oceanic world.
// The sky is derived from IC 1579's actual geometry: the galaxy band's
// orientation is computed from the planet's position inside the galaxy.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. TERRAIN — displaced spherical terrain with baked height map
// ---------------------------------------------------------------------------
export const surfaceTerrainVertexShader = /* glsl */ `
uniform sampler2D uHeightMap;
uniform float uRadius;
uniform float uHeightScale;
uniform float uMapSize;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHeight;
varying float vLatitude;
varying float vCamDist;

void main() {
  vUv = uv;
  vLatitude = position.y / uRadius;

  vec3 n = normalize(normal);
  vec3 t = normalize(cross(n, vec3(0.0, 1.0, 0.0)));
  if (length(t) < 0.001) t = normalize(cross(n, vec3(1.0, 0.0, 0.0)));
  vec3 b = normalize(cross(n, t));

  float texel = 1.0 / uMapSize;
  float hC = texture2D(uHeightMap, uv).r * uHeightScale * uRadius;
  float hU = texture2D(uHeightMap, uv + vec2(texel, 0.0)).r * uHeightScale * uRadius;
  float hD = texture2D(uHeightMap, uv - vec2(texel, 0.0)).r * uHeightScale * uRadius;
  float hR = texture2D(uHeightMap, uv + vec2(0.0, texel)).r * uHeightScale * uRadius;
  float hL = texture2D(uHeightMap, uv - vec2(0.0, texel)).r * uHeightScale * uRadius;

  vec3 displaced = n * (uRadius + hC);
  vec3 du = (hU - hD) * 0.5;
  vec3 dv = (hR - hL) * 0.5;
  vec3 newNormal = normalize(n - t * (du / (texel * uRadius)) - b * (dv / (texel * uRadius)));

  vHeight = hC;
  vNormal = normalize(normalMatrix * newNormal);
  vLocalPos = displaced;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vCamDist = distance(cameraPosition, worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const surfaceTerrainFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform sampler2D uHeightMap;
uniform float uHeightScale;
uniform float uRadius;
uniform vec3 uSunDir;      // local space, normalized (already includes planet spin)
uniform vec3 uUp;
uniform vec3 uZenithCol;
uniform vec3 uHorizonCol;
uniform vec3 uNightCol;
uniform vec3 uSunriseCol;
uniform vec3 uSunCol;
uniform float uTime;
uniform float uSeaLevel;
uniform float uNightFactor;

// Per-planet surface palette (derived from the PlanetConfig colors)
uniform vec3 uOceanShallow;
uniform vec3 uOceanDeep;
uniform vec3 uBeach;
uniform vec3 uForest;
uniform vec3 uDeepForest;
uniform vec3 uRock;
uniform vec3 uSnow;
uniform vec3 uSnowIce;
uniform vec3 uBioCol;
uniform vec3 uFogCol;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec2 vUv;
varying float vHeight;
varying float vLatitude;
varying float vCamDist;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - (modelMatrix * vec4(vLocalPos, 1.0)).xyz);

  float sunElev = dot(N, uSunDir);
  float day = smoothstep(-0.06, 0.16, dot(N, uSunDir));

  // --- Sky color function (must match sky dome for seamless horizon) ---
  vec3 skyCol = mix(uNightCol, uZenithCol, smoothstep(-0.06, 0.22, sunElev));
  skyCol = mix(skyCol, uHorizonCol, pow(1.0 - abs(dot(N, uUp)), 2.2) * 0.9);
  float sunRiseBand = exp(-pow((sunElev - 0.02) / 0.16, 2.0));
  skyCol = mix(skyCol, uSunriseCol, sunRiseBand * 0.85);

  // --- Terrain classification from baked elevation ---
  vec4 heightData = texture2D(uHeightMap, vUv);
  // Normalized elevation: -1 (deep trench) .. +1 (peak)
  float e = vHeight / (uHeightScale * uRadius);
  float detail = heightData.g;
  float bio = heightData.b;

  vec3 col;
  float polar = smoothstep(0.78, 0.92, vLatitude);
  float snowline = 0.62 + 0.30 * vLatitude;

  if (e < uSeaLevel) {
    // Ocean: per-planet deep tones to pale shallows
    float depth = clamp((uSeaLevel - e) / (uSeaLevel + 1.0), 0.0, 1.0);
    vec3 shallow = uOceanShallow;
    vec3 deep = uOceanDeep;
    col = mix(shallow, deep, depth);
    // Sun glint
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 220.0) * day;
    col += vec3(1.0, 0.96, 0.85) * spec * 0.9;
  } else {
    // Land: beach -> forest -> highlands -> mountain rock -> snow
    float landH = clamp((e - uSeaLevel) / (1.0 - uSeaLevel), 0.0, 1.0);
    vec3 beach = uBeach;
    vec3 forest = uForest;
    vec3 deepForest = uDeepForest;
    vec3 rock = uRock;
    vec3 snow = uSnow;
    vec3 snowIce = uSnowIce;

    col = mix(beach, forest, smoothstep(0.0, 0.14, landH));
    col = mix(col, deepForest, smoothstep(0.14, 0.38, landH) * 0.8);
    col = mix(col, rock, smoothstep(0.34, 0.58, landH + detail * 0.12));
    col = mix(col, snow, smoothstep(snowline, snowline + 0.14, landH + detail * 0.2));
    col = mix(col, snowIce, polar);
    // Rock detail texture
    col *= 0.9 + (fbm(vLocalPos * 90.0) * 0.5 + 0.5) * 0.22;
  }

  // --- Lighting ---
  float diffuse = max(dot(N, uSunDir), 0.0);
  float ambient = 0.05 + 0.10 * (1.0 - uNightFactor);
  float light = diffuse * 0.92 + ambient;

  // Night-side bioluminescent patches (planet-tinted alien life)
  float bioGlow = bio * smoothstep(-0.1, 0.05, -sunElev) * 0.85;
  vec3 bioCol = uBioCol;
  col = mix(col, bioCol, bioGlow * (0.55 + 0.45 * sin(uTime * 0.7 + vLatitude * 40.0 + vUv.x * 90.0)));

  col *= light;

  // --- Aerial perspective: blend toward sky by distance ---
  float fogDensity = 0.055;
  float fog = 1.0 - exp(-vCamDist * fogDensity);
  vec3 fogCol = mix(skyCol, uFogCol, clamp(sunElev * 0.6 + 0.2, 0.0, 1.0));
  col = mix(col, fogCol, clamp(fog, 0.0, 0.92));

  // --- Horizon limb glow ---
  float limb = pow(1.0 - abs(dot(N, uUp)), 3.5);
  col += uHorizonCol * limb * (0.25 + 0.5 * day);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// 2. CLOUD SHELL — drifting volumetric cloud layer
// ---------------------------------------------------------------------------
export const surfaceCloudVertexShader = /* glsl */ `
varying vec3 vLocalPos;
varying vec3 vNormal;

void main() {
  vLocalPos = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const surfaceCloudFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform vec3 uSunDir;
uniform vec3 uCloudCol;
uniform float uTime;
uniform float uCamDistFactor; // 1.0 outside shell, 0.0 inside
uniform float uOpacity;

varying vec3 vLocalPos;
varying vec3 vNormal;

void main() {
  vec3 p = vLocalPos * 3.2;
  float n1 = snoise(p + vec3(uTime * 0.02, 0.0, 0.0));
  float n2 = snoise(p * 2.3 - vec3(0.0, uTime * 0.013, 0.0));
  float n3 = snoise(p * 5.2 + vec3(0.0, 0.0, uTime * 0.02));
  float clouds = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
  clouds = smoothstep(0.12, 0.55, clouds);

  // Banded storm systems along latitude
  float bands = 0.65 + 0.35 * sin(vLocalPos.y * 14.0 + snoise(vec3(vLocalPos.y * 6.0, uTime * 0.01, 0.0)) * 1.4);
  clouds *= bands;

  float diffuse = max(dot(normalize(vNormal), uSunDir), 0.0);
  vec3 col = uCloudCol * (0.16 + diffuse * 0.9);

  float alpha = clouds * uOpacity * uCamDistFactor * 0.9;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

// ---------------------------------------------------------------------------
// 3. SKY DOME — atmosphere, sun, rings, galaxy band, moons, satellites
// ---------------------------------------------------------------------------
export const surfaceSkyVertexShader = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const surfaceSkyFragmentShader = /* glsl */ `
uniform vec3 uSunDir;          // local space (includes planet spin)
uniform vec3 uUp;
uniform vec3 uZenithCol;
uniform vec3 uHorizonCol;
uniform vec3 uNightCol;
uniform vec3 uSunriseCol;
uniform vec3 uSunCol;
uniform vec3 uGalaxyCenterDir; // local space
uniform vec3 uGalaxyUp;        // local space
uniform float uGalaxyBandWidth;
uniform vec3 uGalaxyBandCol;
uniform vec3 uGalaxyDustCol;
uniform vec3 uCoreCol;
uniform float uNightFactor;    // 1.0 = deep night
uniform float uTime;
uniform vec3 uRingNormal;      // local space
uniform float uRingInner;
uniform float uRingOuter;
uniform float uRingOpacity;
uniform vec3 uRingColor;
uniform vec3 uRingShadowColor;
uniform vec3 uMoonDirs[3];
uniform vec3 uMoonColors[3];
uniform float uMoonRadii[3];
uniform vec4 uSatNormals[4];   // xyz normal, w speed
uniform float uSatPhases[4];
uniform float uSunSize;

varying vec3 vDir;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float gaussian(float x, float sigma) {
  return exp(-x * x / (2.0 * sigma * sigma));
}

void main() {
  vec3 d = normalize(vDir);
  float el = dot(d, uSunDir);
  float upAmt = max(dot(d, uUp), 0.0);

  // --- Day / night / twilight sky gradient ---
  float day = smoothstep(-0.06, 0.22, el);
  float night = 1.0 - smoothstep(-0.06, 0.02, el);
  float twilight = 1.0 - day;

  vec3 col = mix(uNightCol, uZenithCol, day);
  col = mix(col, uHorizonCol, pow(1.0 - upAmt, 2.4) * 0.92);
  float sunrise = gaussian(el - 0.03, 0.14);
  col = mix(col, uSunriseCol, sunrise * 0.9 * (1.0 - day));

  // --- Sun disc + glow ---
  float sunAng = acos(clamp(el, -1.0, 1.0));
  float sunDisc = smoothstep(uSunSize, uSunSize * 0.55, sunAng);
  float sunGlow = gaussian(sunAng, 0.055) * day;
  col += uSunCol * (sunDisc * 1.6 + sunGlow * 0.55);
  col += uSunriseCol * gaussian(sunAng, 0.09) * (1.0 - day) * 0.6;

  // --- Procedural faint star sparkle (night only) ---
  vec2 cell = vec2(atan(d.z, d.x) * 0.25, asin(clamp(d.y, -1.0, 1.0)));
  float star = step(0.9991, hash12(cell * 830.0));
  col += vec3(star) * 0.55 * night * (0.5 + 0.5 * sin(uTime * 3.0 + star * 60.0));

  // --- IC 1579 galaxy band (derived from planet's position in the galaxy) ---
  float bandAngle = dot(d, uGalaxyUp);
  float band = exp(-bandAngle * bandAngle / (uGalaxyBandWidth * uGalaxyBandWidth));
  float dust = hash13(d * 173.0 + vec3(0.7));
  float lanes = smoothstep(0.32, 0.58, dust);
  float bandCol = band * (0.35 + 0.65 * lanes) * night;
  col += mix(uGalaxyDustCol, uGalaxyBandCol, lanes) * bandCol * 1.15;

  // Galactic core glow toward the center of IC 1579
  float coreAng = acos(clamp(dot(d, uGalaxyCenterDir), -1.0, 1.0));
  float core = gaussian(coreAng, 0.16) * (0.4 + 0.6 * night);
  col += mix(uCoreCol, uGalaxyBandCol, 0.35) * core * 0.85;
  // Supermassive black hole: dark heart + photon-ring-inspired rim
  float bhDisc = smoothstep(0.028, 0.012, coreAng);
  float bhRim = gaussian(coreAng, 0.02);
  col *= 1.0 - bhDisc * 0.9 * (0.5 + 0.5 * night);
  col += uCoreCol * bhRim * 0.9 * (0.3 + 0.7 * night);

  // --- Rings (analytical annulus crossing the sky) ---
  // The ring plane passes through the planet center with normal uRingNormal.
  // For a sky ray d, the plane is crossed at t = 1/dot(d,n) (camera near
  // center compared to the sky dome scale), giving a true perspective arc.
  float ringBand = 0.0;
  float dn = dot(d, uRingNormal);
  if (abs(dn) > 1e-4) {
    float t = 1.0 / dn;
    vec3 ringPoint = d * t;
    // Crossing must lie in front of the camera and above the local horizon
    if (t > 0.0 && dot(ringPoint, uUp) > 0.0) {
      float rWorld = length(ringPoint - uRingNormal * dot(ringPoint, uRingNormal));
      if (rWorld > uRingInner && rWorld < uRingOuter) {
        float u01 = (rWorld - uRingInner) / (uRingOuter - uRingInner);
        // Fine radial bands + a Cassini-style gap
        float fine = 0.5 + 0.5 * sin(u01 * 120.0 + 1.7);
        float cassini = 1.0 - smoothstep(0.52, 0.56, u01) * smoothstep(0.60, 0.56, u01);
        float density = fine * (0.35 + 0.65 * cassini) * (1.0 - 0.65 * u01 * u01);
        float speckle = hash12(vec2(u01 * 900.0, t * 40.0));
        density *= 0.5 + 0.5 * speckle;
        ringBand = density;
      }
    }
  }

  if (ringBand > 0.01) {
    float backlit = step(0.0, dot(d, uSunDir));
    vec3 ringCol = mix(uRingShadowColor, uRingColor, 0.3 + 0.7 * backlit);
    float ringDay = 0.25 + 0.75 * day;
    col += ringCol * ringBand * uRingOpacity * ringDay;
  }

  // --- Moons ---
  for (int i = 0; i < 3; i++) {
    float moonAng = acos(clamp(dot(d, normalize(uMoonDirs[i] + 1e-6)), -1.0, 1.0));
    float moonDisc = smoothstep(uMoonRadii[i], uMoonRadii[i] * 0.7, moonAng);
    col += uMoonColors[i] * moonDisc * 0.95;
    col += uMoonColors[i] * gaussian(moonAng, uMoonRadii[i] * 2.2) * 0.3;
  }

  // --- Orbital traffic: occasional moving glints (stations/satellites) ---
  for (int i = 0; i < 4; i++) {
    vec3 n = uSatNormals[i].xyz;
    float speed = uSatNormals[i].w;
    float theta = uTime * speed + uSatPhases[i];
    vec3 b1 = normalize(cross(n, uUp));
    vec3 b2 = cross(n, b1);
    vec3 satDir = normalize(b1 * cos(theta) + b2 * sin(theta));
    float satAng = acos(clamp(dot(d, satDir), -1.0, 1.0));
    float satGlint = gaussian(satAng, 0.004) * 1.4;
    col += vec3(0.85, 1.0, 0.95) * satGlint * (0.35 + 0.65 * night);
    // Faint motion streak
    vec3 satPrev = normalize(b1 * cos(theta - 0.015) + b2 * sin(theta - 0.015));
    float trail = gaussian(acos(clamp(dot(d, satPrev), -1.0, 1.0)), 0.006);
    col += vec3(0.7, 0.95, 0.85) * trail * 0.25 * (0.35 + 0.65 * night);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// 4. SKY STAR DOME — IC 1579 star population projected onto the sky
// ---------------------------------------------------------------------------
export const surfaceStarVertexShader = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;

uniform float uPixelRatio;
uniform float uTime;
uniform float uNightFactor;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + fract(aPhase * 7.0) * 3.0) + aPhase * 6.2831);
  gl_PointSize = aSize * uPixelRatio * twinkle;
  vAlpha = uNightFactor * (0.4 + 0.6 * twinkle);
}
`;

export const surfaceStarFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float glow = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * glow * 1.6, glow * vAlpha);
}
`;

// ---------------------------------------------------------------------------
// 5. VEGETATION — instanced canopy scatter on land, with wind sway
// ---------------------------------------------------------------------------
export const surfaceVegetationVertexShader = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;

uniform float uPixelRatio;
uniform float uTime;

varying vec3 vColor;
varying float vSway;

void main() {
  vColor = aColor;
  vec3 p = position;
  float sway = sin(uTime * (0.8 + fract(aPhase * 3.7) * 1.4) + aPhase * 6.2831);
  p.x += sway * aSize * 0.25;
  vSway = 0.5 + 0.5 * sway;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (300.0 / max(1.0, -mv.z));
}
`;

export const surfaceVegetationFragmentShader = /* glsl */ `
uniform float uNightFactor;

varying vec3 vColor;
varying float vSway;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.1, d);
  vec3 col = vColor * (0.3 + 0.7 * vSway);
  col *= 1.0 - uNightFactor * 0.88;
  gl_FragColor = vec4(col, a * (0.85 - uNightFactor * 0.5));
}
`;
