import * as THREE from 'three';
import type { TesseractConfig } from '../../types/starSystem';

// ============================================================================
// IC 1579 — XENORA: TESSERACT-PROJECTION WORLD
//
// A mathematically coherent 4D-to-3D projection: a hypercube rotating in two
// orthogonal planes (XY and ZW), projected through a 4D perspective camera
// so vertices fold through the sky. Edge emissivity varies with 4D depth and
// vertex parity so the structure reads differently from every angle.
// No claim of literal 4D space — only higher-dimensional *projection math*.
// ============================================================================

const TESSERACT_VERT_SHADER = /* glsl */ `
attribute vec4 aPos4;
attribute float aEdgeId;

uniform float uTime;
uniform float uRotationXY;
uniform float uRotationZW;
uniform float uProjDist;
uniform float uOpacity;

varying float vDepth;
varying float vParity;

void rotate2D(inout float a, inout float b, float ang) {
  float c = cos(ang);
  float s = sin(ang);
  float ta = a;
  a = ta * c - b * s;
  b = ta * s + b * c;
}

void main() {
  vec4 p = aPos4;

  // Double rotation: one plane of 4D space rotates while another rotates too.
  // This is what makes the projection "turn inside out" continuously.
  rotate2D(p.x, p.y, uRotationXY);
  rotate2D(p.z, p.w, uRotationZW);

  // 4D perspective projection toward the 3D hyperplane (drop w axis).
  float persp = uProjDist / (uProjDist - p.w);
  vec3 p3 = p.xyz * persp;

  vDepth = p.w;
  vParity = aEdgeId;

  vec4 mv = modelViewMatrix * vec4(p3, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 6.0;
}
`;

const TESSERACT_FRAG_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uSecondaryColor;
uniform float uOpacity;
uniform float uAnomalyStrength;
uniform float uTime;

varying float vDepth;
varying float vParity;

void main() {
  // Edge color: emerald base, shifting violet with 4D depth (the "subtle
  // violet" identity accent of IC 1579).
  float violetMix = 0.5 + 0.5 * sin(vDepth * 3.0 + vParity * 1.7 + uTime * 0.4);
  vec3 col = mix(uColor, uSecondaryColor, violetMix * uAnomalyStrength);

  // Fade edges that fold farthest into the 4th axis.
  float fade = 1.0 - clamp(abs(vDepth) * 0.42, 0.0, 0.75);
  float pulse = 0.75 + 0.25 * sin(uTime * 1.3 + vParity * 2.0);

  gl_FragColor = vec4(col * (0.4 + fade * 0.6) * pulse, fade * uOpacity);
}
`;

const TESSERACT_VERTEX_GLOW_VERT = /* glsl */ `
attribute vec4 aPos4;
uniform float uRotationXY;
uniform float uRotationZW;
uniform float uProjDist;

void rotate2D(inout float a, inout float b, float ang) {
  float c = cos(ang);
  float s = sin(ang);
  float ta = a;
  a = ta * c - b * s;
  b = ta * s + b * c;
}

void main() {
  vec4 p = aPos4;
  rotate2D(p.x, p.y, uRotationXY);
  rotate2D(p.z, p.w, uRotationZW);
  float persp = uProjDist / (uProjDist - p.w);
  vec3 p3 = p.xyz * persp;
  vec4 mv = modelViewMatrix * vec4(p3, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 8.0;
}
`;

const TESSERACT_VERTEX_GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float glow = smoothstep(0.5, 0.0, d);
  float pulse = 0.8 + 0.2 * sin(uTime * 2.0);
  gl_FragColor = vec4(uColor * glow * 1.4, glow * uOpacity * pulse);
}
`;

function buildHypercube(): { positions4: Float32Array; edgeIndices: number[] } {
  // 16 vertices of the unit hypercube in 4D
  const verts: number[] = [];
  for (let i = 0; i < 16; i++) {
    verts.push(
      ((i >> 0) & 1) === 0 ? -1 : 1,
      ((i >> 1) & 1) === 0 ? -1 : 1,
      ((i >> 2) & 1) === 0 ? -1 : 1,
      ((i >> 3) & 1) === 0 ? -1 : 1
    );
  }

  // 32 edges: vertices differing in exactly one bit
  const edges: number[] = [];
  for (let a = 0; a < 16; a++) {
    for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit);
      if (b > a) {
        edges.push(a, b);
      }
    }
  }
  return { positions4: new Float32Array(verts), edgeIndices: edges };
}

export class TesseractProjection {
  public group: THREE.Group;
  public config: TesseractConfig;

  private edgeLines: THREE.LineSegments;
  private edgeMaterial: THREE.ShaderMaterial;
  private vertexPoints: THREE.Points;
  private vertexMaterial: THREE.ShaderMaterial;
  private anomalyGlow: THREE.Sprite;
  private glowMaterial: THREE.SpriteMaterial;

  constructor(config: TesseractConfig, planetRadius: number) {
    this.config = config;
    this.group = new THREE.Group();

    const { positions4, edgeIndices } = buildHypercube();

    const scale = config.projectionScale;

    // ------------------------------------------------------------------
    // 1. Projected hypercube edges
    // ------------------------------------------------------------------
    const edgeGeom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions4, 4);
    edgeGeom.setAttribute('aPos4', posAttr);

    const indices = new Uint16Array(edgeIndices);
    edgeGeom.setIndex(new THREE.BufferAttribute(indices, 1));

    const edgeIds = new Float32Array(edgeIndices.length);
    for (let i = 0; i < edgeIndices.length; i++) {
      edgeIds[i] = (edgeIndices[i] >> (i % 4)) & 1;
    }
    edgeGeom.setAttribute('aEdgeId', new THREE.BufferAttribute(edgeIds, 1));

    this.edgeMaterial = new THREE.ShaderMaterial({
      vertexShader: TESSERACT_VERT_SHADER,
      fragmentShader: TESSERACT_FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uRotationXY: { value: 0 },
        uRotationZW: { value: 0 },
        uProjDist: { value: 2.4 },
        uOpacity: { value: 0.0 },
        uColor: { value: new THREE.Color(config.color) },
        uSecondaryColor: { value: new THREE.Color(config.secondaryColor) },
        uAnomalyStrength: { value: config.anomalyStrength },
      },
    });

    this.edgeLines = new THREE.LineSegments(edgeGeom, this.edgeMaterial);
    this.edgeLines.scale.setScalar(planetRadius * scale * 1.35);
    this.edgeLines.frustumCulled = false;
    this.group.add(this.edgeLines);

    // ------------------------------------------------------------------
    // 2. Vertex glow points (same 4D projection)
    // ------------------------------------------------------------------
    const vertexGeom = new THREE.BufferGeometry();
    vertexGeom.setAttribute('aPos4', new THREE.BufferAttribute(positions4.slice(), 4));
    this.vertexMaterial = new THREE.ShaderMaterial({
      vertexShader: TESSERACT_VERTEX_GLOW_VERT,
      fragmentShader: TESSERACT_VERTEX_GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uRotationXY: { value: 0 },
        uRotationZW: { value: 0 },
        uProjDist: { value: 2.4 },
        uOpacity: { value: 0.0 },
        uColor: { value: new THREE.Color(config.color) },
        uTime: { value: 0 },
      },
    });
    this.vertexPoints = new THREE.Points(vertexGeom, this.vertexMaterial);
    this.vertexPoints.scale.setScalar(planetRadius * scale * 1.35);
    this.vertexPoints.frustumCulled = false;
    this.group.add(this.vertexPoints);

    // ------------------------------------------------------------------
    // 3. Anomaly glow halo (subtle violet-tinged emerald wash)
    // ------------------------------------------------------------------
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(143,255,193,0.55)');
      gradient.addColorStop(0.5, 'rgba(139,92,246,0.18)');
      gradient.addColorStop(1, 'rgba(10,20,30,0.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    this.glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.anomalyGlow = new THREE.Sprite(this.glowMaterial);
    this.anomalyGlow.scale.setScalar(planetRadius * scale * 3.4);
    this.group.add(this.anomalyGlow);
  }

  public update(time: number, distanceToCamera: number) {
    const angle = time * this.config.rotationSpeed;

    // Double rotation in two orthogonal 4D planes
    this.edgeMaterial.uniforms.uRotationXY.value = angle;
    this.edgeMaterial.uniforms.uRotationZW.value = angle * 0.77 + 0.6;
    this.vertexMaterial.uniforms.uRotationXY.value = angle;
    this.vertexMaterial.uniforms.uRotationZW.value = angle * 0.77 + 0.6;
    this.edgeMaterial.uniforms.uTime.value = time;
    this.vertexMaterial.uniforms.uTime.value = time;

    // The structure resolves as the observer approaches
    const reveal = 1.0 - Math.min(Math.max((distanceToCamera - 1.6) / 4.4, 0.0), 1.0);
    const opacity = reveal * reveal;
    this.edgeMaterial.uniforms.uOpacity.value = opacity;
    this.vertexMaterial.uniforms.uOpacity.value = opacity;
    this.glowMaterial.opacity = 0.28 * reveal + Math.sin(time * 0.7) * 0.06;
  }

  public dispose() {
    this.edgeLines.geometry.dispose();
    this.edgeMaterial.dispose();
    this.vertexPoints.geometry.dispose();
    this.vertexMaterial.dispose();
    this.glowMaterial.map?.dispose();
    this.glowMaterial.dispose();
  }
}
