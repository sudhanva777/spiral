import * as THREE from 'three';
import type { DysonSwarmConfig } from '../../types/starSystem';

// Deterministic per-collector hash so the swarm is persistent across frames
function hash3(ix: number, iy: number, iz: number): number {
  let n = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453;
  n = n - Math.floor(n);
  return n;
}

/**
 * IC 1579 — Vardion Dyson-style collector swarm.
 *
 * Renders a slowly turning shell of orbital energy collectors around a star.
 * - FAR LOD: a sparse glow point cloud ("unusual star" appearance).
 * - NEAR LOD: an InstancedMesh of individual collector panels with thermal
 *   emissive variation and a faint central glow.
 * Persistent deterministic placement — the swarm never reshuffles.
 */
export class DysonSwarmSystem {
  public group: THREE.Group;
  public config: DysonSwarmConfig;

  private collectorMesh: THREE.InstancedMesh;
  private collectorMaterial: THREE.MeshStandardMaterial;
  private farPoints: THREE.Points;
  private farMaterial: THREE.PointsMaterial;
  private glowSprite: THREE.Sprite;
  private glowMaterial: THREE.SpriteMaterial;

  private dummy = new THREE.Object3D();
  private currentRotation = 0;

  constructor(config: DysonSwarmConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.rotation.set(...config.orbitTilt);

    const inner = config.innerRadius;
    const outer = config.outerRadius;

    // ------------------------------------------------------------------
    // 1. Collector InstancedMesh (NEAR LOD)
    // ------------------------------------------------------------------
    const panelGeom = new THREE.BoxGeometry(0.03, 0.016, 0.022);
    this.collectorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.panelColor),
      emissive: new THREE.Color(config.glowColor),
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.4,
    });

    this.collectorMesh = new THREE.InstancedMesh(
      panelGeom,
      this.collectorMaterial,
      config.collectorCount
    );
    this.collectorMesh.frustumCulled = false;
    this.collectorMesh.castShadow = false;
    this.collectorMesh.receiveShadow = false;

    const collectorColors = new Float32Array(config.collectorCount * 3);
    const basePanel = new THREE.Color(config.panelColor);
    const glowPanel = new THREE.Color(config.glowColor);

    for (let i = 0; i < config.collectorCount; i++) {
      // Deterministic shell placement with radial density bias toward mid-shell
      const t = hash3(i * 3 + 1, i, 7);
      const rad = inner + Math.pow(t, 0.75) * (outer - inner);
      const theta = hash3(i, i * 5 + 2, 3) * Math.PI * 2.0;
      const phi = Math.acos(2.0 * hash3(i * 7 + 4, i, 9) - 1.0);

      const sway = 0.02 + hash3(i, i, i + 1) * 0.05;
      const x = Math.sin(phi) * Math.cos(theta) * (rad + sway);
      const y = Math.sin(phi) * Math.sin(theta) * (rad + sway) * 0.62; // flattened shell
      const z = Math.cos(phi) * (rad + sway);

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(
        hash3(i, i + 2, i + 3) * Math.PI,
        hash3(i + 1, i, i + 4) * Math.PI,
        hash3(i + 2, i + 1, i) * Math.PI
      );
      this.dummy.scale.setScalar(0.75 + hash3(i, i, i) * 0.6);
      this.dummy.updateMatrix();
      this.collectorMesh.setMatrixAt(i, this.dummy.matrix);

      // Thermal variation: collectors nearer the star glow hotter
      const heat = 1.0 - Math.min((rad - inner) / Math.max(outer - inner, 0.001), 1.0);
      const tint = new THREE.Color().lerpColors(basePanel, glowPanel, heat * 0.85);
      tint.multiplyScalar(0.6 + hash3(i * 3, i * 2, i) * 0.7);
      collectorColors[i * 3] = tint.r;
      collectorColors[i * 3 + 1] = tint.g;
      collectorColors[i * 3 + 2] = tint.b;
    }
    this.collectorMesh.instanceColor = new THREE.InstancedBufferAttribute(collectorColors, 3);
    this.collectorMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.collectorMesh);

    // ------------------------------------------------------------------
    // 2. Far-LOD Glow Point Cloud (reads as an "unusual star")
    // ------------------------------------------------------------------
    const farCount = Math.min(Math.round(config.collectorCount * 0.06), 320);
    const farPositions = new Float32Array(farCount * 3);
    for (let i = 0; i < farCount; i++) {
      const rad = inner * 0.85 + hash3(i, i * 3, 1) * (outer - inner * 0.85);
      const theta = hash3(i * 2, i, 5) * Math.PI * 2.0;
      const phi = Math.acos(2.0 * hash3(i, i * 7, 11) - 1.0);
      farPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * rad;
      farPositions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * rad * 0.62;
      farPositions[i * 3 + 2] = Math.cos(phi) * rad;
    }
    const farGeom = new THREE.BufferGeometry();
    farGeom.setAttribute('position', new THREE.BufferAttribute(farPositions, 3));

    this.farMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(config.glowColor),
      size: 0.045,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.farPoints = new THREE.Points(farGeom, this.farMaterial);
    this.farPoints.frustumCulled = false;
    this.group.add(this.farPoints);

    // ------------------------------------------------------------------
    // 3. Central thermal glow sprite
    // ------------------------------------------------------------------
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(160,255,200,0.9)');
      gradient.addColorStop(0.35, 'rgba(82,229,160,0.4)');
      gradient.addColorStop(1, 'rgba(10,60,40,0.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    this.glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(config.glowColor),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowSprite = new THREE.Sprite(this.glowMaterial);
    this.glowSprite.scale.set(outer * 2.4, outer * 2.4, 1);
    this.group.add(this.glowSprite);
  }

  public update(time: number, distanceToCamera: number) {
    // Slow shell rotation
    this.currentRotation = time * this.config.rotationSpeed * 0.4;
    this.collectorMesh.rotation.y = this.currentRotation;
    this.farPoints.rotation.y = this.currentRotation * 0.7;

    // LOD crossfade: full collectors up close, glow points at distance
    const nearBlend = 1.0 - Math.min(Math.max((distanceToCamera - 6.0) / 14.0, 0.0), 1.0);
    const farBlend = 1.0 - nearBlend;

    this.collectorMesh.visible = nearBlend > 0.01;
    this.farPoints.visible = farBlend > 0.01;

    this.collectorMaterial.emissiveIntensity = 0.3 + nearBlend * 0.35 + Math.sin(time * 0.4) * 0.05;
    this.farMaterial.opacity = farBlend * 0.85;
    this.glowMaterial.opacity = 0.25 + farBlend * 0.45 + Math.sin(time * 0.25) * 0.06;
  }

  public setPixelRatio(dpr: number) {
    this.farMaterial.size = 0.045 * dpr;
  }

  public dispose() {
    this.collectorMesh.geometry.dispose();
    this.collectorMaterial.dispose();
    this.farPoints.geometry.dispose();
    this.farMaterial.dispose();
    this.glowMaterial.map?.dispose();
    this.glowMaterial.dispose();
  }
}
