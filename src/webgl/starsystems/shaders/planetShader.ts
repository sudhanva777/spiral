import { glslSimplexNoise } from '../../shaders/glslNoise';

export const planetSurfaceVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vPosition = position;
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const planetSurfaceFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform int uPlanetType; // 0=earth-like, 1=hot-lava, 2=ice, 3=gas-giant, 4=ringed-giant, 5=ocean, 6=dark-banded, 7=dense-atmosphere, 8=rocky
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uAccentColor;
uniform vec3 uLightPosition; // Star world position

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  float nDotL = max(dot(vWorldNormal, lightDir), 0.0);
  float ambient = 0.12;
  float lighting = nDotL * 0.88 + ambient;

  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 halfVec = normalize(lightDir + viewDir);
  float specular = pow(max(dot(vWorldNormal, halfVec), 0.0), 32.0);

  vec3 pos = vPosition * 4.0;
  vec3 finalColor = uPrimaryColor;

  if (uPlanetType == 0) {
    // -------------------------------------------------------------
    // EARTH-LIKE (Continents, Oceans, Polar Ice Caps, Terrain Bump)
    // -------------------------------------------------------------
    float n1 = snoise(pos * 0.8);
    float n2 = snoise(pos * 2.2);
    float n3 = snoise(pos * 5.0);
    float elevation = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;

    // Polar ice caps (latitudinal threshold)
    float lat = abs(vPosition.y);
    float isPole = smoothstep(0.70, 0.92, lat + snoise(pos * 3.0) * 0.08);

    if (elevation > 0.08) {
      // Land / Continents
      float landElev = (elevation - 0.08) / 0.55;
      vec3 landCol = mix(uSecondaryColor, uAccentColor, clamp(landElev, 0.0, 1.0));
      finalColor = mix(landCol, vec3(0.95, 0.98, 1.0), isPole);
    } else {
      // Oceans / Hydrosphere
      float oceanDepth = clamp(-elevation / 0.45, 0.0, 1.0);
      vec3 oceanCol = mix(uPrimaryColor * 1.25, uPrimaryColor * 0.65, oceanDepth);
      finalColor = mix(oceanCol, vec3(0.95, 0.98, 1.0), isPole);
      // Ocean sun glint
      if (isPole < 0.3) {
        finalColor += vec3(1.0, 0.95, 0.9) * specular * 0.75 * nDotL;
      }
    }

  } else if (uPlanetType == 1) {
    // -------------------------------------------------------------
    // HOT-LAVA (Emissive Lava Veins & Dark Basalt Crust)
    // -------------------------------------------------------------
    float fissure = snoise(pos * 2.0 + vec3(uTime * 0.1, 0.0, 0.0));
    float fissure2 = snoise(pos * 4.5);
    float lavaVein = smoothstep(0.25, 0.45, abs(fissure * 0.7 + fissure2 * 0.3));

    vec3 crust = mix(uPrimaryColor, uSecondaryColor, clamp(snoise(pos * 1.5), 0.0, 1.0));
    vec3 lavaGlow = uAccentColor * (1.5 + sin(uTime * 2.0 + pos.x * 3.0) * 0.3);

    finalColor = mix(lavaGlow, crust, lavaVein);
    // Lava emits light independent of sun angle
    lighting = max(lighting, (1.0 - lavaVein) * 1.2);

  } else if (uPlanetType == 2) {
    // -------------------------------------------------------------
    // ICE WORLD (Crystalline Ice, Cobalt Crevices, Subsurface Glint)
    // -------------------------------------------------------------
    float crack = abs(snoise(pos * 3.5));
    float ridge = smoothstep(0.05, 0.25, crack);
    vec3 ice = mix(uAccentColor, uPrimaryColor, ridge);
    finalColor = mix(ice, uSecondaryColor, smoothstep(0.2, 0.7, snoise(pos * 1.2)));
    finalColor += vec3(0.8, 0.95, 1.0) * specular * 0.45 * nDotL;

  } else if (uPlanetType == 3 || uPlanetType == 4) {
    // -------------------------------------------------------------
    // GAS GIANT / RINGED GIANT (Latitudinal Bands & Great Storms)
    // -------------------------------------------------------------
    float band = sin(vPosition.y * 22.0 + snoise(pos * 0.8) * 3.2);
    float bandNorm = (band + 1.0) * 0.5;
    vec3 gas = mix(uPrimaryColor, uSecondaryColor, bandNorm);
    float storm = smoothstep(0.4, 0.7, snoise(vec3(pos.x * 2.0, pos.y * 6.0, pos.z * 2.0 + uTime * 0.05)));
    finalColor = mix(gas, uAccentColor, storm * 0.65);

  } else if (uPlanetType == 5) {
    // -------------------------------------------------------------
    // PURE OCEAN WORLD (Specular Glint, Deep Pelagic Gradient)
    // -------------------------------------------------------------
    float wave = snoise(pos * 4.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.1;
    finalColor = mix(uPrimaryColor, uSecondaryColor, clamp(wave + 0.5, 0.0, 1.0));
    finalColor += vec3(1.0, 0.98, 0.9) * specular * 0.95 * nDotL;

  } else if (uPlanetType == 6) {
    // -------------------------------------------------------------
    // DARK WORLD (Low-Albedo Obsidian with Glowing Atmospheric Plasma)
    // -------------------------------------------------------------
    float auroral = smoothstep(0.25, 0.65, sin(vPosition.y * 14.0 + snoise(pos * 1.5 + uTime * 0.2) * 2.0));
    vec3 obsidian = mix(uPrimaryColor, uSecondaryColor, snoise(pos * 2.0) * 0.5 + 0.5);
    finalColor = mix(obsidian, uAccentColor * 1.4, auroral * 0.7);

  } else if (uPlanetType == 7) {
    // -------------------------------------------------------------
    // DENSE CHROMATIC ATMOSPHERE (Shifting Gradient Bands)
    // -------------------------------------------------------------
    float chroma = (sin(vPosition.y * 12.0 + snoise(pos * 1.2 + uTime * 0.1) * 2.5) + 1.0) * 0.5;
    finalColor = mix(uPrimaryColor, uSecondaryColor, chroma);
    finalColor = mix(finalColor, uAccentColor, smoothstep(0.4, 0.8, snoise(pos * 2.5)));

  } else {
    // -------------------------------------------------------------
    // ROCKY / CRATERED SILICATE
    // -------------------------------------------------------------
    float crater = abs(snoise(pos * 2.5));
    float detail = snoise(pos * 6.0) * 0.2;
    finalColor = mix(uPrimaryColor, uSecondaryColor, clamp(crater + detail, 0.0, 1.0));
  }

  // Atmospheric limb edge Fresnel tint
  float fresnel = 1.0 - max(dot(normalize(vNormal), normalize(viewDir)), 0.0);
  finalColor += uSecondaryColor * pow(fresnel, 3.5) * 0.35 * lighting;

  gl_FragColor = vec4(finalColor * lighting, 1.0);
}
`;

export const planetCloudVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vPosition = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const planetCloudFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform vec3 uLightPosition;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 pos = vPosition * 3.2;

  // Swirling weather vortices & cloud bands
  float c1 = snoise(pos + vec3(uTime * 0.06, 0.0, 0.0));
  float c2 = snoise(pos * 2.4 - vec3(0.0, uTime * 0.03, 0.0));
  float cloudDensity = smoothstep(0.18, 0.65, c1 * 0.65 + c2 * 0.35);

  if (cloudDensity < 0.02) {
    discard;
  }

  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  float nDotL = max(dot(vWorldNormal, lightDir), 0.0);
  float lighting = nDotL * 0.85 + 0.15;

  vec3 cloudColor = vec3(0.96, 0.98, 1.0) * lighting;
  gl_FragColor = vec4(cloudColor, cloudDensity * 0.88);
}
`;

export const planetAtmosphereVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const planetAtmosphereFragmentShader = /* glsl */ `
uniform vec3 uAtmosphereColor;
uniform vec3 uLightPosition;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);

  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  float sunFactor = max(dot(vNormal, lightDir), 0.0) * 0.8 + 0.2;

  float alpha = pow(fresnel, 3.2) * sunFactor * 0.75;
  gl_FragColor = vec4(uAtmosphereColor, clamp(alpha, 0.0, 1.0));
}
`;

export const planetRingVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const planetRingFragmentShader = /* glsl */ `
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uOpacity;
uniform vec3 uLightPosition;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec2 coord = vUv - vec2(0.5);
  float r = length(coord) * 2.0;

  if (r < 0.45 || r > 1.0) {
    discard;
  }

  // Concentric dust bands with Cassini-like gap division
  float normR = (r - 0.45) / 0.55;
  float division = smoothstep(0.48, 0.53, normR) * (1.0 - smoothstep(0.53, 0.58, normR));
  float density = sin(normR * 65.0) * 0.2 + 0.8;
  density *= (1.0 - division * 0.85);

  vec3 col = mix(uColor1, uColor2, normR);
  float alpha = density * uOpacity * smoothstep(0.45, 0.50, r) * (1.0 - smoothstep(0.95, 1.0, r));

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;
