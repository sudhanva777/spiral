import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GalaxyParticles } from './particles/GalaxyParticles';
import { NebulaParticles } from './particles/NebulaParticles';
import { StarfieldParticles } from './particles/StarfieldParticles';
import { ForegroundDustParticles } from './particles/ForegroundDustParticles';
import { PostProcessingPipeline } from './PostProcessing';
import { getQualityConfigForTier } from './utils/deviceDetection';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';

export class GalaxyEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private postProcessing: PostProcessingPipeline;
  private controls: OrbitControls;

  // Particle Subsystems (Multi-Layer Depth & Parallax)
  private galaxy: GalaxyParticles;
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;
  private foregroundDust: ForegroundDustParticles;

  private qualityTier: QualityTier;
  private particleCount: number;

  // State Management
  private currentState: InteractionState = 'CINEMATIC';
  private stateChangeCallback?: (state: InteractionState) => void;

  // Phase 3: Interactive Gravitational Field State
  private mouse2D = new THREE.Vector2(0, 0);
  private targetMouse2D = new THREE.Vector2(0, 0);
  private mouse3D = new THREE.Vector3(0, 0, 0);
  private targetMouse3D = new THREE.Vector3(0, 0, 0);
  private raycaster = new THREE.Raycaster();
  private interactionPlane: THREE.Plane;
  private mouseInfluence = 0.0;
  private targetMouseInfluence = 0.0;
  private lastMouseMoveTime = 0;

  // Phase 4: Click & Energy Wave Pulse State
  private pointerDownPos = new THREE.Vector2(0, 0);
  private pointerDownTime = 0;
  private pulseOrigin = new THREE.Vector3(0, 0, 0);
  private pulseProgress = 0.0;
  private pulseStrength = 0.0;
  private pulseActive = false;
  private pulseDuration = 1.6; // seconds
  private pulseElapsed = 0.0;

  // Phase 5 & Camera Transition State
  private readonly defaultCameraPos = new THREE.Vector3(0, 22, 38);
  private readonly defaultLookTarget = new THREE.Vector3(0, -1.0, 0);
  private readonly coreInspectionPos = new THREE.Vector3(0, 3.8, 8.5);
  private readonly coreLookTarget = new THREE.Vector3(0, 0, 0);

  private isInspectingCore = false;
  private coreInspectionFactor = 0.0; // 0.0 (normal) to 1.0 (inspection)
  private targetCoreInspection = 0.0;

  // Cinematic Camera Transitions
  private isTransitioningCamera = false;
  private camTransitionStartPos = new THREE.Vector3();
  private camTransitionTargetPos = new THREE.Vector3();
  private camTransitionStartLook = new THREE.Vector3();
  private camTransitionTargetLook = new THREE.Vector3();
  private camTransitionProgress = 0.0;
  private camTransitionDuration = 1.0; // seconds

  // Double Tap Tracking (Mobile)
  private lastTapTime = 0;

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
    onStatsUpdate?: (stats: SimulationStats) => void,
    onStateChange?: (state: InteractionState) => void
  ) {
    this.container = container;
    this.qualityTier = qualityTier;
    this.statsCallback = onStatsUpdate;
    this.stateChangeCallback = onStateChange;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    // 2. Camera Setup — Starting position matches default composition
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

    // 4. Particle Subsystems (Multi-Layer Depth & Parallax)
    this.galaxy = new GalaxyParticles(config.particleCount, 3.2);
    this.nebula = new NebulaParticles(config.nebulaCount);
    this.starfield = new StarfieldParticles(config.starCount);
    this.foregroundDust = new ForegroundDustParticles(config.foregroundDustCount);

    this.scene.add(this.starfield.points);
    this.scene.add(this.nebula.points);
    this.scene.add(this.galaxy.points);
    this.scene.add(this.foregroundDust.points);

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

    // 7. OrbitControls — 360° Orbit, Zoom, Pan, Damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultLookTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    // Continuous zoom range
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 180.0;

    // Full 360° rotation (allow looking from directly above and below)
    this.controls.minPolarAngle = 0.02;
    this.controls.maxPolarAngle = Math.PI - 0.02;

    // Panning
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.6;

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.renderer.domElement.style.touchAction = 'none';
    this.controls.update();

    // 8. Event Listeners
    this.initEventListeners();

    // 9. Start Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setState(newState: InteractionState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      if (this.stateChangeCallback) {
        this.stateChangeCallback(newState);
      }
    }
  }

  public getState(): InteractionState {
    return this.currentState;
  }

  public isCoreInspecting(): boolean {
    return this.isInspectingCore;
  }

  private initEventListeners() {
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    window.addEventListener('resize', this.onWindowResize, { passive: true });
    window.addEventListener('mousemove', this.onPointerMove, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    canvas.addEventListener('pointerup', this.onPointerUp, { passive: true });
    canvas.addEventListener('dblclick', this.onDoubleClick);
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
    this.foregroundDust.setPixelRatio(config.dpr);
  }

  /**
   * Captures mouse position for the gravitational lens well
   */
  private onPointerMove(e: MouseEvent) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetMouse2D.set(x, y);

    this.targetMouseInfluence = 0.65;
    this.lastMouseMoveTime = performance.now();

    if (this.currentState === 'EXPLORING' && !this.pulseActive && !this.isTransitioningCamera) {
      this.setState('GRAVITY_INTERACTION');
    }
  }

  private onPointerDown(e: PointerEvent) {
    this.pointerDownPos.set(e.clientX, e.clientY);
    this.pointerDownTime = performance.now();
  }

  private onPointerUp(e: PointerEvent) {
    const deltaX = Math.abs(e.clientX - this.pointerDownPos.x);
    const deltaY = Math.abs(e.clientY - this.pointerDownPos.y);
    const elapsed = performance.now() - this.pointerDownTime;

    // Check if this was a clean click / tap (not a camera orbit drag)
    if (deltaX < 5 && deltaY < 5 && elapsed < 320) {
      this.handleCanvasClick(e.clientX, e.clientY);

      // Handle mobile double tap
      const now = performance.now();
      if (now - this.lastTapTime < 320) {
        this.handleCoreToggleAtScreen(e.clientX, e.clientY);
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    }
  }

  private onDoubleClick(e: MouseEvent) {
    this.handleCoreToggleAtScreen(e.clientX, e.clientY);
  }

  /**
   * Phase 4: Click Disturbance & Energy Wave Pulse
   */
  private handleCanvasClick(clientX: number, clientY: number) {
    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const hitPoint = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(this.interactionPlane, hitPoint)) {
      const distFromCenter = hitPoint.length();

      this.pulseOrigin.copy(hitPoint);
      this.pulseProgress = 0.0;
      this.pulseElapsed = 0.0;
      this.pulseActive = true;

      if (distFromCenter <= 38.0) {
        // Direct click on galaxy: Powerful radiant energy pulse
        this.pulseStrength = 1.0 + (1.0 - Math.min(distFromCenter / 38.0, 1.0)) * 0.4;
        this.pulseDuration = 1.6;
        this.setState('PULSE');
      } else {
        // Click on empty space: Localized gravitational disturbance
        this.pulseStrength = 0.45;
        this.pulseDuration = 1.2;
      }
    }
  }

  /**
   * Phase 5: Core Detection & Inspection Mode Toggle
   */
  private handleCoreToggleAtScreen(clientX: number, clientY: number) {
    if (this.isInspectingCore) {
      // Exit Core Inspection Mode -> Return smoothly to orbital exploration
      this.exitCoreInspection();
      return;
    }

    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    
    // Spatial Ray-to-Point distance test against core nucleus (0, 0, 0)
    const ray = this.raycaster.ray;
    const distToCoreCenter = ray.distanceToPoint(new THREE.Vector3(0, 0, 0));

    // Also check intersection on plane
    const planeHit = new THREE.Vector3();
    let hitCore = false;

    if (ray.intersectPlane(this.interactionPlane, planeHit)) {
      if (planeHit.length() < 7.5) {
        hitCore = true;
      }
    }

    if (distToCoreCenter < 6.5 || hitCore) {
      // Double click directly on or near the core: enter inspection mode
      this.enterCoreInspection();
    }
  }

  /**
   * Enters Core Inspection Mode with smooth cinematic transition
   */
  public enterCoreInspection() {
    this.isInspectingCore = true;
    this.targetCoreInspection = 1.0;
    this.setState('CORE_TRANSITION');

    this.startCameraTransition(this.coreInspectionPos, this.coreLookTarget, 1.2);
  }

  /**
   * Exits Core Inspection Mode smoothly returning to exploration view
   */
  public exitCoreInspection() {
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.setState('CORE_TRANSITION');

    this.startCameraTransition(this.defaultCameraPos, this.defaultLookTarget, 1.2);
  }

  public toggleCoreInspection() {
    if (this.isInspectingCore) {
      this.exitCoreInspection();
    } else {
      this.enterCoreInspection();
    }
  }

  /**
   * Smoothly interpolates the camera to a target position and lookAt target
   */
  private startCameraTransition(targetPos: THREE.Vector3, targetLook: THREE.Vector3, duration = 1.0) {
    this.isTransitioningCamera = true;
    this.camTransitionStartPos.copy(this.camera.position);
    this.camTransitionTargetPos.copy(targetPos);
    this.camTransitionStartLook.copy(this.controls.target);
    this.camTransitionTargetLook.copy(targetLook);
    this.camTransitionProgress = 0.0;
    this.camTransitionDuration = duration;
  }

  public resetCamera() {
    if (this.isInspectingCore) {
      this.isInspectingCore = false;
      this.targetCoreInspection = 0.0;
    }
    this.setState('RETURNING');
    this.startCameraTransition(this.defaultCameraPos, this.defaultLookTarget, 0.9);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'r' || e.key === 'R') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      this.resetCamera();
    } else if (e.key === 'c' || e.key === 'C') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      this.toggleCoreInspection();
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
    this.foregroundDust.setPixelRatio(config.dpr);

    this.galaxy.rebuild(config.particleCount);
    this.nebula.rebuild(config.nebulaCount);
    this.starfield.rebuild(config.starCount);
    this.foregroundDust.rebuild(config.foregroundDustCount);

    this.postProcessing.setBloomParams(config.bloomStrength, config.bloomRadius);
    this.postProcessing.setEnabled(config.bloomEnabled);
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public triggerEntrance() {
    this.entranceProgress = 0.0;
    this.isEntranceComplete = false;
    this.setState('CINEMATIC');
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Cinematic Entrance Progression
    if (!this.isEntranceComplete) {
      this.entranceProgress += delta * 0.45;
      if (this.entranceProgress >= 1.0) {
        this.entranceProgress = 1.0;
        this.isEntranceComplete = true;
        this.setState('EXPLORING');
      }
    }

    // 2. Phase 3: Interactive Gravitational Lens Interpolation & Temporal Recovery
    this.mouse2D.lerp(this.targetMouse2D, 0.08);

    // Fade out mouse influence if stationary for > 800ms (temporal recovery)
    if (performance.now() - this.lastMouseMoveTime > 800) {
      this.targetMouseInfluence = 0.08;
    }
    this.mouseInfluence += (this.targetMouseInfluence - this.mouseInfluence) * 0.05;

    // Project 2D Mouse to 3D Gravitational Well Plane
    this.raycaster.setFromCamera(this.mouse2D, this.camera);
    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.interactionPlane, intersectionPoint)) {
      this.targetMouse3D.copy(intersectionPoint);
    }
    this.mouse3D.lerp(this.targetMouse3D, 0.09);

    // 3. Phase 4: Energy Wave Pulse Progress Animation
    if (this.pulseActive) {
      this.pulseElapsed += delta;
      this.pulseProgress = Math.min(this.pulseElapsed / this.pulseDuration, 1.0);
      if (this.pulseProgress >= 1.0) {
        this.pulseActive = false;
        this.pulseProgress = 0.0;
        this.pulseStrength = 0.0;
        if (this.currentState === 'PULSE') {
          this.setState(this.isInspectingCore ? 'CORE_INSPECTION' : 'EXPLORING');
        }
      }
    }

    // 4. Phase 5: Smooth Core Inspection LOD Factor Interpolation
    this.coreInspectionFactor += (this.targetCoreInspection - this.coreInspectionFactor) * (delta * 3.5);

    // 5. Cinematic Camera Transitions (Easing into core / resetting view)
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += delta / this.camTransitionDuration;
      const t = Math.min(this.camTransitionProgress, 1.0);
      
      // Smooth cubic ease-out
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);

      this.camera.position.lerpVectors(this.camTransitionStartPos, this.camTransitionTargetPos, ease);
      this.controls.target.lerpVectors(this.camTransitionStartLook, this.camTransitionTargetLook, ease);

      if (t >= 1.0) {
        this.isTransitioningCamera = false;
        this.setState(this.isInspectingCore ? 'CORE_INSPECTION' : 'EXPLORING');
      }
    }

    // 6. Update OrbitControls (handles damping, user rotation, pan, zoom)
    this.controls.update();

    // 7. Update Particle Subsystems with all interaction telemetry
    const effectiveTime = this.prefersReducedMotion ? elapsedTime * 0.2 : elapsedTime;
    this.galaxy.update(
      effectiveTime,
      this.mouse3D,
      this.entranceProgress,
      this.mouseInfluence,
      this.pulseOrigin,
      this.pulseProgress,
      this.pulseStrength,
      this.coreInspectionFactor
    );
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);
    this.foregroundDust.update(effectiveTime, this.entranceProgress);

    // 8. Render Post-Processing Pipeline
    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 9. FPS Telemetry Calculation
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

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('dblclick', this.onDoubleClick);

    this.controls.dispose();
    this.galaxy.dispose();
    this.nebula.dispose();
    this.starfield.dispose();
    this.foregroundDust.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
