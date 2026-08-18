import * as THREE from 'three';
import type { MoonConfig } from '../../types/starSystem';
import { glslSimplexNoise } from '../shaders/glslNoise';

const moonVertexShader = /* glsl */ `
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

const moonFragmentShader = /* glsl */ `
${glslSimplexNoise}

uniform float uTime;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uLightPosition;
uniform float uIsVolcanic;
uniform float uIsIcy;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  float nDotL = max(dot(vWorldNormal, lightDir), 0.0);
  float ambient = 0.08;
  float lighting = nDotL * 0.92 + ambient;

  vec3 pos = vPosition * 6.0;
  float crater = abs(snoise(pos * 2.0));
  float micro = snoise(pos * 5.0) * 0.15;
  float surfaceNoise = clamp(crater + micro, 0.0, 1.0);

  vec3 finalColor = mix(uPrimaryColor, uSecondaryColor, surfaceNoise);

  if (uIsVolcanic > 0.5) {
    // Volcanic sulfur and glowing lava vents
    float vent = smoothstep(0.72, 0.88, snoise(pos * 3.5 + vec3(uTime * 0.2, 0.0, 0.0)));
    vec3 lava = vec3(1.0, 0.35, 0.0) * 2.0;
    finalColor = mix(finalColor, lava, vent);
    lighting = max(lighting, vent * 1.5);
  } else if (uIsIcy > 0.5) {
    // Glacial ice cracks & crystalline specular glint
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfVec = normalize(lightDir + viewDir);
    float specular = pow(max(dot(vWorldNormal, halfVec), 0.0), 24.0);
    finalColor += vec3(0.9, 0.96, 1.0) * specular * 0.5 * nDotL;
  }

  gl_FragColor = vec4(finalColor * lighting, 1.0);
}
`;

export class MoonMesh {
  public group: THREE.Group;
  public orbitGroup: THREE.Group;
  public mesh: THREE.Mesh;
  public orbitLine: THREE.Line;
  public config: MoonConfig;

  private material: THREE.ShaderMaterial;
  private orbitGeometry: THREE.BufferGeometry;
  private orbitMaterial: THREE.LineBasicMaterial;

  constructor(config: MoonConfig) {
    this.config = config;

    // Outer Orbit Group (Attached to parent planet, handles orbital inclination)
    this.orbitGroup = new THREE.Group();
    if (config.orbitInclination) {
      this.orbitGroup.rotation.x = config.orbitInclination;
    }

    // Inner Moon Mesh Group
    this.group = new THREE.Group();
    this.orbitGroup.add(this.group);

    // 1. Moon Surface Mesh
    const geom = new THREE.SphereGeometry(config.radius, 24, 24);
    this.material = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPrimaryColor: { value: new THREE.Color(config.primaryColor) },
        uSecondaryColor: { value: new THREE.Color(config.secondaryColor) },
        uLightPosition: { value: new THREE.Vector3(0, 0, 0) },
        uIsVolcanic: { value: config.isVolcanic ? 1.0 : 0.0 },
        uIsIcy: { value: config.isIcy ? 1.0 : 0.0 },
      },
    });

    this.mesh = new THREE.Mesh(geom, this.material);
    this.group.add(this.mesh);

    // 2. Subtle Lunar Orbit Line
    const segments = 64;
    const points: THREE.Vector3[] = [];
    const a = config.orbitRadius;
    const e = config.orbitEccentricity || 0.0;
    const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
    const c = a * e;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2.0;
      points.push(new THREE.Vector3(Math.cos(theta) * a - c, 0, Math.sin(theta) * b));
    }

    this.orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    this.orbitMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x7090b0),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.orbitLine = new THREE.Line(this.orbitGeometry, this.orbitMaterial);
    this.orbitGroup.add(this.orbitLine);
  }

  public update(time: number, starWorldPos: THREE.Vector3) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLightPosition.value.copy(starWorldPos);

    // Keplerian Orbit around Planet
    const a = this.config.orbitRadius;
    const e = this.config.orbitEccentricity || 0.0;
    const b = a * Math.sqrt(Math.max(1.0 - e * e, 0.01));
    const c = a * e;

    const meanAnomaly = (this.config.orbitPhase || 0) + time * this.config.orbitSpeed;
    const posX = Math.cos(meanAnomaly) * a - c;
    const posZ = Math.sin(meanAnomaly) * b;

    this.group.position.set(posX, 0, posZ);

    // Axial Rotation
    this.mesh.rotation.y = time * this.config.rotationSpeed;
  }

  public setOpacity(alpha: number) {
    this.orbitMaterial.opacity = Math.max(0, Math.min(1, alpha)) * 0.15;
  }

  public dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.orbitGeometry.dispose();
    this.orbitMaterial.dispose();
  }
}
