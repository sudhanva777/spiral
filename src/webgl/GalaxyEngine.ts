import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GalaxyParticles } from './particles/GalaxyParticles';
import { NebulaParticles } from './particles/NebulaParticles';
import { StarfieldParticles } from './particles/StarfieldParticles';
import { PostProcessingPipeline } from './PostProcessing';
import { getQualityConfigForTier } from './utils/deviceDetection';
import type { GalaxyPreset, QualityTier, SimulationStats } from '../types/simulation';

export class GalaxyEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private postProcessing: PostProcessingPipeline;
  private controls: OrbitControls;

  private galaxy: GalaxyParticles;
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;

  private qualityTier: QualityTier;
  private particleCount: number;

  // Particle Gravitational Interaction State (preserved — independent of camera)
  private mouse2D = new THREE.Vector2(0, 0);
  private targetMouse2D = new THREE.Vector2(0, 0);
  private mouse3D = new THREE.Vector3(0, 0, 0);
  private raycaster = new THREE.Raycaster();
  private interactionPlane: THREE.Plane;

  // Default camera state for reset
  private readonly defaultCameraPos = new THREE.Vector3(0, 22, 38);
  private readonly defaultLookTarget = new THREE.Vector3(0, -1.0, 0);

  // Smooth reset state
  private isResetting = false;
  private resetAlpha = 0;

  // Animation Timing & Entrance
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private entranceProgress = 0.0;
  private isEntranceComplete = false;
  private prefersReducedMotion = false;

  // Performance Telemetry
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;
  private statsCallback?: (stats: SimulationStats) => void;

  constructor(
    container: HTMLElement,
    qualityTier: QualityTier = 'ultra',
    onStatsUpdate?: (stats: SimulationStats) => void
  ) {
    this.container = container;
    this.qualityTier = qualityTier;
    this.statsCallback = onStatsUpdate;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Check reduced motion
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    // 2. Camera Setup — starting position matches original composition exactly
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultLookTarget);

    // 3. Renderer Setup
    const config = getQualityConfigForTier(qualityTier);
    this.particleCount = config.particleCount;

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(config.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    // 4. Particle Subsystems
    this.galaxy = new GalaxyParticles(config.particleCount, 3.2);
    this.nebula = new NebulaParticles(config.nebulaCount);
    this.starfield = new StarfieldParticles(config.starCount);

    this.scene.add(this.starfield.points);
    this.scene.add(this.nebula.points);
    this.scene.add(this.galaxy.points);

    // 5. Post-Processing Pipeline
    this.postProcessing = new PostProcessingPipeline(
      this.renderer,
      this.scene,
      this.camera,
      width,
      height,
      config.bloomStrength,
      config.bloomRadius
    );
    this.postProcessing.setEnabled(config.bloomEnabled);

    // 6. Interaction Plane in Galaxy Equator (XZ Plane at Y=0)
    this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 7. OrbitControls — full 3D exploration with cinematic damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultLookTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    // Zoom — continuous, generous range based on galaxy scale (maxRadius=38)
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 5.0;
    this.controls.maxDistance = 200.0;

    // Full 360° orbit — no angular restrictions
    this.controls.minPolarAngle = 0.05;            // Nearly straight above
    this.controls.maxPolarAngle = Math.PI - 0.05;   // Nearly straight below

    // Pan
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.6;

    // Right-click for pan, left-click for orbit (defaults, but explicit)
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    // Touch: one-finger orbit, two-finger zoom+pan
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Prevent default scroll so the canvas captures wheel for zoom
    this.renderer.domElement.style.touchAction = 'none';

    this.controls.update();

    // 8. Event Listeners (only resize + mousemove for particle interaction)
    this.initEventListeners();

    // 9. Start Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private initEventListeners() {
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    window.addEventListener('resize', this.onWindowResize, { passive: true });

    // Mousemove for particle gravitational well — works independently of OrbitControls
    // OrbitControls uses pointer events on the canvas; this listener on window captures
    // mouse position without conflicting
    window.addEventListener('mousemove', this.onPointerMove, { passive: true });

    // Keyboard shortcut: R for reset camera
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const config = getQualityConfigForTier(this.qualityTier);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(config.dpr);
    this.postProcessing.setSize(width, height);

    this.galaxy.setPixelRatio(config.dpr);
    this.nebula.setPixelRatio(config.dpr);
    this.starfield.setPixelRatio(config.dpr);
  }

  /**
   * Captures mouse position for the particle gravitational well effect.
   * This only updates targetMouse2D — it does NOT control the camera.
   * OrbitControls handles all camera movement via its own pointer listeners on the canvas.
   */
  private onPointerMove(e: MouseEvent) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetMouse2D.set(x, y);
  }

  private onKeyDown(e: KeyboardEvent) {
    // R key resets camera (only if no input element is focused)
    if (e.key === 'r' || e.key === 'R') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      this.resetCamera();
    }
  }

  public setPreset(preset: GalaxyPreset) {
    this.galaxy.applyPreset(preset);
  }

  public setQualityTier(tier: QualityTier) {
    this.qualityTier = tier;
    const config = getQualityConfigForTier(tier);
    this.particleCount = config.particleCount;

    this.renderer.setPixelRatio(config.dpr);
    this.galaxy.setPixelRatio(config.dpr);
    this.nebula.setPixelRatio(config.dpr);
    this.starfield.setPixelRatio(config.dpr);

    this.galaxy.rebuild(config.particleCount);
    this.nebula.rebuild(config.nebulaCount);
    this.starfield.rebuild(config.starCount);

    this.postProcessing.setBloomParams(config.bloomStrength, config.bloomRadius);
    this.postProcessing.setEnabled(config.bloomEnabled);
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public triggerEntrance() {
    this.entranceProgress = 0.0;
    this.isEntranceComplete = false;
  }

  /**
   * Smoothly animates the camera back to its original default position and target.
   * Uses lerp interpolation over ~60 frames for a cinematic return.
   */
  public resetCamera() {
    this.isResetting = true;
    this.resetAlpha = 0;
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Entrance Progression
    if (!this.isEntranceComplete) {
      this.entranceProgress += delta * 0.45;
      if (this.entranceProgress >= 1.0) {
        this.entranceProgress = 1.0;
        this.isEntranceComplete = true;
      }
    }

    // 2. Smooth Mouse Interpolation for particle gravitational well
    this.mouse2D.lerp(this.targetMouse2D, 0.06);

    // 3. Project 2D Mouse onto 3D Interaction Plane for Gravitational Well
    this.raycaster.setFromCamera(this.mouse2D, this.camera);
    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.interactionPlane, intersectionPoint)) {
      this.mouse3D.lerp(intersectionPoint, 0.08);
    }

    // 4. Smooth Camera Reset (when active)
    if (this.isResetting) {
      this.resetAlpha += delta * 1.8; // ~0.55 seconds to complete
      const t = Math.min(this.resetAlpha, 1.0);
      // Smooth ease-out cubic
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);

      this.camera.position.lerp(this.defaultCameraPos, ease * 0.08);
      this.controls.target.lerp(this.defaultLookTarget, ease * 0.08);

      if (t >= 1.0) {
        this.isResetting = false;
        this.resetAlpha = 0;
      }
    }

    // 5. Update OrbitControls (handles damping, camera transform)
    this.controls.update();

    // 6. Update Particle Subsystems
    const effectiveTime = this.prefersReducedMotion ? elapsedTime * 0.2 : elapsedTime;
    this.galaxy.update(effectiveTime, this.mouse3D, this.entranceProgress, 0.6);
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);

    // 7. Render Post-Processing Pipeline
    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 8. FPS Telemetry Calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.statsCallback) {
        const camDist = Math.round(this.camera.position.distanceTo(this.controls.target));
        this.statsCallback({
          fps: this.currentFps,
          particleCount: this.particleCount,
          drawCalls: this.renderer.info.render.calls,
          tier: this.qualityTier,
          mouseNormalized: { x: this.mouse2D.x, y: this.mouse2D.y },
          cameraDistance: camDist,
        });
      }
    }
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('keydown', this.onKeyDown);

    this.controls.dispose();
    this.galaxy.dispose();
    this.nebula.dispose();
    this.starfield.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
