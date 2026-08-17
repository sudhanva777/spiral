import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NebulaParticles } from './particles/NebulaParticles';
import { StarfieldParticles } from './particles/StarfieldParticles';
import { ForegroundDustParticles } from './particles/ForegroundDustParticles';
import { GalaxyInstance } from './galaxies/GalaxyInstance';
import { UNIVERSE_GALAXIES } from './galaxies/registry';
import { PostProcessingPipeline } from './PostProcessing';
import { getQualityConfigForTier } from './utils/deviceDetection';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { UniverseState } from '../types/universe';

export class GalaxyEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private postProcessing: PostProcessingPipeline;
  private controls: OrbitControls;

  // Universe Galaxy Instances
  private galaxies: Map<string, GalaxyInstance> = new Map();
  private activeGalaxyId = 'galaxy01';

  // Environmental Particle Subsystems
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;
  private foregroundDust: ForegroundDustParticles;

  private qualityTier: QualityTier;
  private particleCount: number;

  // State Management
  private currentState: InteractionState = 'CINEMATIC';
  private stateChangeCallback?: (state: InteractionState) => void;
  private universeStateCallback?: (state: UniverseState) => void;

  // Phase 3: Interactive Gravitational Field State
  private mouse2D = new THREE.Vector2(0, 0);
  private targetMouse2D = new THREE.Vector2(0, 0);
  private worldMouse3D = new THREE.Vector3(0, 0, 0);
  private targetWorldMouse3D = new THREE.Vector3(0, 0, 0);
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
  private pulseDuration = 1.6;
  private pulseElapsed = 0.0;

  // Camera & Navigation Offsets
  private readonly defaultCamOffset = new THREE.Vector3(0, 22, 38);
  private readonly defaultLookOffset = new THREE.Vector3(0, -1.0, 0);
  private readonly coreInspectOffset = new THREE.Vector3(0, 3.8, 8.5);

  private isInspectingCore = false;
  private coreInspectionFactor = 0.0;
  private targetCoreInspection = 0.0;

  // Cinematic Camera Transitions (Navigation & Core Inspection)
  private isTransitioningCamera = false;
  private camTransitionStartPos = new THREE.Vector3();
  private camTransitionTargetPos = new THREE.Vector3();
  private camTransitionStartLook = new THREE.Vector3();
  private camTransitionTargetLook = new THREE.Vector3();
  private camTransitionProgress = 0.0;
  private camTransitionDuration = 1.0;

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
    onStateChange?: (state: InteractionState) => void,
    onUniverseStateChange?: (state: UniverseState) => void
  ) {
    this.container = container;
    this.qualityTier = qualityTier;
    this.statsCallback = onStatsUpdate;
    this.stateChangeCallback = onStateChange;
    this.universeStateCallback = onUniverseStateChange;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    // 2. Camera Setup — Starting position matches default composition
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1400);
    this.camera.position.copy(this.defaultCamOffset);
    this.camera.lookAt(this.defaultLookOffset);

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

    // 4. Universe Galaxies Setup (Galaxy 01 + Galaxy 02 in the same continuous 3D scene)
    UNIVERSE_GALAXIES.forEach((galaxyConfig) => {
      // Allocate particle count per galaxy based on tier
      const galaxyInstance = new GalaxyInstance(galaxyConfig, config.particleCount);
      this.galaxies.set(galaxyConfig.id, galaxyInstance);
      this.scene.add(galaxyInstance.group);
    });

    // 5. Environmental Subsystems (Deep Universe Starfield, Nebula, Foreground Dust)
    this.nebula = new NebulaParticles(config.nebulaCount);
    this.starfield = new StarfieldParticles(config.starCount);
    this.foregroundDust = new ForegroundDustParticles(config.foregroundDustCount);

    this.scene.add(this.starfield.points);
    this.scene.add(this.nebula.points);
    this.scene.add(this.foregroundDust.points);

    // 6. Post-Processing Pipeline
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

    // 7. Interaction Plane in Universe Equator (XZ Plane at active galaxy Y)
    this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 8. OrbitControls — 360° Orbit, Zoom, Pan, Damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultLookOffset);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 500.0;

    this.controls.minPolarAngle = 0.02;
    this.controls.maxPolarAngle = Math.PI - 0.02;

    this.controls.enablePan = true;
    this.controls.panSpeed = 0.7;

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

    // 9. Event Listeners
    this.initEventListeners();

    // 10. Start Loop
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

  private emitUniverseState() {
    if (this.universeStateCallback) {
      const active = this.getActiveGalaxy();
      const dist = active ? Math.round(active.worldPosition.distanceTo(this.camera.position)) : 0;
      this.universeStateCallback({
        activeGalaxyId: this.activeGalaxyId,
        isNavigating: this.isTransitioningCamera,
        distanceToActive: dist,
      });
    }
  }

  public getActiveGalaxy(): GalaxyInstance | undefined {
    return this.galaxies.get(this.activeGalaxyId);
  }

  public getState(): InteractionState {
    return this.currentState;
  }

  public isCoreInspecting(): boolean {
    return this.isInspectingCore;
  }

  public getActiveGalaxyId(): string {
    return this.activeGalaxyId;
  }

  /**
   * Seamless Inter-Galactic Navigation
   * Flies smoothly through deep space from current position to the target galaxy
   */
  public navigateToGalaxy(galaxyId: string) {
    const targetGalaxy = this.galaxies.get(galaxyId);
    if (!targetGalaxy || (this.activeGalaxyId === galaxyId && !this.isInspectingCore && !this.isTransitioningCamera)) {
      return;
    }

    this.activeGalaxyId = galaxyId;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.setState('CORE_TRANSITION');

    // Update interaction plane to active galaxy Y position
    this.interactionPlane.constant = -targetGalaxy.worldPosition.y;

    const targetCamPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultCamOffset);
    const targetLookPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultLookOffset);

    // Dynamic travel duration based on deep space distance
    const flightDist = this.camera.position.distanceTo(targetCamPos);
    const flightDuration = Math.min(Math.max(flightDist * 0.005, 1.2), 2.2);

    this.startCameraTransition(targetCamPos, targetLookPos, flightDuration);
    this.emitUniverseState();
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

    this.galaxies.forEach((g) => g.setPixelRatio(config.dpr));
    this.nebula.setPixelRatio(config.dpr);
    this.starfield.setPixelRatio(config.dpr);
    this.foregroundDust.setPixelRatio(config.dpr);
  }

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

    if (deltaX < 6 && deltaY < 6 && elapsed < 320) {
      this.handleCanvasClick(e.clientX, e.clientY);

      const now = performance.now();
      if (now - this.lastTapTime < 320) {
        this.handleDoubleActionAtScreen(e.clientX, e.clientY);
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    }
  }

  private onDoubleClick(e: MouseEvent) {
    this.handleDoubleActionAtScreen(e.clientX, e.clientY);
  }

  /**
   * Phase 4: Click Disturbance, Energy Wave Pulse, or Distant Galaxy Selection
   */
  private handleCanvasClick(clientX: number, clientY: number) {
    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    // Check if user clicked on any other distant galaxy in the universe
    for (const [id, galaxy] of this.galaxies.entries()) {
      if (id !== this.activeGalaxyId) {
        const distRayToGalaxy = ray.distanceToPoint(galaxy.worldPosition);
        if (distRayToGalaxy < galaxy.boundingRadius * 0.9) {
          // Clicked on distant galaxy: initiate flight towards it!
          this.navigateToGalaxy(id);
          return;
        }
      }
    }

    // Otherwise, generate localized energy wave on the active galaxy plane
    const hitPoint = new THREE.Vector3();
    const activeGalaxy = this.getActiveGalaxy();

    if (activeGalaxy && ray.intersectPlane(this.interactionPlane, hitPoint)) {
      const distFromGalaxyCenter = hitPoint.distanceTo(activeGalaxy.worldPosition);

      this.pulseOrigin.copy(hitPoint);
      this.pulseProgress = 0.0;
      this.pulseElapsed = 0.0;
      this.pulseActive = true;

      if (distFromGalaxyCenter <= activeGalaxy.boundingRadius) {
        this.pulseStrength = 1.0 + (1.0 - Math.min(distFromGalaxyCenter / activeGalaxy.boundingRadius, 1.0)) * 0.4;
        this.pulseDuration = 1.6;
        this.setState('PULSE');
      } else {
        this.pulseStrength = 0.45;
        this.pulseDuration = 1.2;
      }
    }
  }

  /**
   * Phase 5: Double-Click Core Inspection or Galaxy Selection
   */
  private handleDoubleActionAtScreen(clientX: number, clientY: number) {
    if (this.isInspectingCore) {
      this.exitCoreInspection();
      return;
    }

    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    // Check if double-clicked another galaxy
    for (const [id, galaxy] of this.galaxies.entries()) {
      if (id !== this.activeGalaxyId) {
        const distRayToGalaxy = ray.distanceToPoint(galaxy.worldPosition);
        if (distRayToGalaxy < galaxy.boundingRadius) {
          this.navigateToGalaxy(id);
          return;
        }
      }
    }

    // Check if double-clicked active galaxy core
    const activeGalaxy = this.getActiveGalaxy();
    if (!activeGalaxy) return;

    const distToActiveCore = ray.distanceToPoint(activeGalaxy.worldPosition);
    const planeHit = new THREE.Vector3();
    let hitCore = false;

    if (ray.intersectPlane(this.interactionPlane, planeHit)) {
      if (planeHit.distanceTo(activeGalaxy.worldPosition) < 7.5) {
        hitCore = true;
      }
    }

    if (distToActiveCore < 6.5 || hitCore) {
      this.enterCoreInspection();
    }
  }

  public enterCoreInspection() {
    const active = this.getActiveGalaxy();
    if (!active) return;

    this.isInspectingCore = true;
    this.targetCoreInspection = 1.0;
    this.setState('CORE_TRANSITION');

    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(this.coreInspectOffset);
    const targetLook = new THREE.Vector3().copy(active.worldPosition);

    this.startCameraTransition(targetPos, targetLook, 1.2);
  }

  public exitCoreInspection() {
    const active = this.getActiveGalaxy();
    if (!active) return;

    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.setState('CORE_TRANSITION');

    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(this.defaultCamOffset);
    const targetLook = new THREE.Vector3().copy(active.worldPosition).add(this.defaultLookOffset);

    this.startCameraTransition(targetPos, targetLook, 1.2);
  }

  public toggleCoreInspection() {
    if (this.isInspectingCore) {
      this.exitCoreInspection();
    } else {
      this.enterCoreInspection();
    }
  }

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
    const active = this.getActiveGalaxy();
    if (!active) return;

    if (this.isInspectingCore) {
      this.isInspectingCore = false;
      this.targetCoreInspection = 0.0;
    }
    this.setState('RETURNING');
    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(this.defaultCamOffset);
    const targetLook = new THREE.Vector3().copy(active.worldPosition).add(this.defaultLookOffset);
    this.startCameraTransition(targetPos, targetLook, 0.9);
  }

  private onKeyDown(e: KeyboardEvent) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    if (e.key === 'r' || e.key === 'R') {
      this.resetCamera();
    } else if (e.key === 'c' || e.key === 'C') {
      this.toggleCoreInspection();
    } else if (e.key === '1') {
      this.navigateToGalaxy('galaxy01');
    } else if (e.key === '2') {
      this.navigateToGalaxy('galaxy02');
    }
  }

  public setPreset(preset: GalaxyPreset) {
    this.galaxies.forEach((g) => g.applyPreset(preset));
  }

  public setQualityTier(tier: QualityTier) {
    this.qualityTier = tier;
    const config = getQualityConfigForTier(tier);
    this.particleCount = config.particleCount;

    this.renderer.setPixelRatio(config.dpr);
    this.galaxies.forEach((g) => {
      g.setPixelRatio(config.dpr);
      g.rebuild(config.particleCount);
    });

    this.nebula.setPixelRatio(config.dpr);
    this.starfield.setPixelRatio(config.dpr);
    this.foregroundDust.setPixelRatio(config.dpr);

    this.nebula.rebuild(config.nebulaCount);
    this.starfield.rebuild(config.starCount);
    this.foregroundDust.rebuild(config.foregroundDustCount);

    this.postProcessing.setBloomParams(config.bloomStrength, config.bloomRadius);
    this.postProcessing.setEnabled(config.bloomEnabled);
  }

  public getParticleCount(): number {
    return this.particleCount * this.galaxies.size;
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

    // 1. Entrance Progression
    if (!this.isEntranceComplete) {
      this.entranceProgress += delta * 0.45;
      if (this.entranceProgress >= 1.0) {
        this.entranceProgress = 1.0;
        this.isEntranceComplete = true;
        this.setState('EXPLORING');
      }
    }

    // 2. Gravitational Lens Interpolation & Temporal Recovery
    this.mouse2D.lerp(this.targetMouse2D, 0.08);

    if (performance.now() - this.lastMouseMoveTime > 800) {
      this.targetMouseInfluence = 0.08;
    }
    this.mouseInfluence += (this.targetMouseInfluence - this.mouseInfluence) * 0.05;

    this.raycaster.setFromCamera(this.mouse2D, this.camera);
    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.interactionPlane, intersectionPoint)) {
      this.targetWorldMouse3D.copy(intersectionPoint);
    }
    this.worldMouse3D.lerp(this.targetWorldMouse3D, 0.09);

    // 3. Pulse Wavefront Animation
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

    // 4. Core Inspection LOD Factor Interpolation
    this.coreInspectionFactor += (this.targetCoreInspection - this.coreInspectionFactor) * (delta * 3.5);

    // 5. Cinematic Camera Transitions (Navigation between galaxies & Core Inspection)
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += delta / this.camTransitionDuration;
      const t = Math.min(this.camTransitionProgress, 1.0);
      
      // Smooth cubic ease-out curve
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);

      this.camera.position.lerpVectors(this.camTransitionStartPos, this.camTransitionTargetPos, ease);
      this.controls.target.lerpVectors(this.camTransitionStartLook, this.camTransitionTargetLook, ease);

      if (t >= 1.0) {
        this.isTransitioningCamera = false;
        this.setState(this.isInspectingCore ? 'CORE_INSPECTION' : 'EXPLORING');
        this.emitUniverseState();
      }
    }

    // 6. Update OrbitControls
    this.controls.update();

    // 7. Update Scale-Aware LOD and Simulation for all Galaxies
    const effectiveTime = this.prefersReducedMotion ? elapsedTime * 0.2 : elapsedTime;

    this.galaxies.forEach((galaxyInstance, id) => {
      // Update distance LOD relative to current camera position
      galaxyInstance.updateLOD(this.camera.position);

      const isActive = id === this.activeGalaxyId;
      galaxyInstance.update(
        effectiveTime,
        this.worldMouse3D,
        this.entranceProgress,
        isActive ? this.mouseInfluence : 0.0,
        this.pulseOrigin,
        this.pulseProgress,
        isActive ? this.pulseStrength : 0.0,
        isActive ? this.coreInspectionFactor : 0.0
      );
    });

    // 8. Update Environment Subsystems
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);
    this.foregroundDust.update(effectiveTime, this.entranceProgress);

    // 9. Render Post-Processing Pipeline
    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 10. FPS Telemetry Calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.statsCallback) {
        const activeGalaxy = this.getActiveGalaxy();
        const camDist = activeGalaxy
          ? Math.round(this.camera.position.distanceTo(activeGalaxy.worldPosition))
          : Math.round(this.camera.position.length());

        this.statsCallback({
          fps: this.currentFps,
          particleCount: this.getParticleCount(),
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
    this.galaxies.forEach((g) => g.dispose());
    this.galaxies.clear();
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
