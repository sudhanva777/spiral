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

  // Universe Galaxy Instances (16 Distinct Galaxies in Deep Space)
  private galaxies: Map<string, GalaxyInstance> = new Map();
  private activeGalaxyId = 'galaxy01';

  // Hierarchical Star System & Planetary Focus State
  private activeSystemId: string | null = null;
  private activePlanetId: string | null = null;
  private detectedSystemId: string | null = null;
  private detectedSystemName: string | null = null;

  // Environmental Particle Subsystems (Deep Universe Starfield, Local Nebula, Foreground Dust)
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;
  private foregroundDust: ForegroundDustParticles;

  private qualityTier: QualityTier;

  // State Management
  private currentState: InteractionState = 'CINEMATIC';
  private stateChangeCallback?: (state: InteractionState) => void;
  private universeStateCallback?: (state: UniverseState) => void;

  // Interactive Gravitational Field State
  private mouse2D = new THREE.Vector2(0, 0);
  private targetMouse2D = new THREE.Vector2(0, 0);
  private worldMouse3D = new THREE.Vector3(0, 0, 0);
  private targetWorldMouse3D = new THREE.Vector3(0, 0, 0);
  private raycaster = new THREE.Raycaster();
  private interactionPlane: THREE.Plane;
  private mouseInfluence = 0.0;
  private targetMouseInfluence = 0.0;
  private lastMouseMoveTime = 0;

  // Click & Energy Wave Pulse State
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
  private readonly blackHoleInspectOffset = new THREE.Vector3(0, 2.2, 5.8);
  private readonly starSystemCamOffset = new THREE.Vector3(0, 2.4, 5.5);
  private readonly planetCamOffset = new THREE.Vector3(0, 0.28, 0.62);
  private readonly blackHoleSafetyRadius = 3.2;

  private isInspectingCore = false;
  private coreInspectionFactor = 0.0;
  private targetCoreInspection = 0.0;

  // Cinematic Camera Transitions (Navigation, Star System, Planets, Core Inspection)
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

  // Temp vectors for gravitational lensing & projection
  private projectedScreenPos = new THREE.Vector3();
  private screenLensPos = new THREE.Vector2(0.5, 0.5);

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

    // 1. Scene Setup — Pure Deep Space Black
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    // 2. Camera Setup — Starting position matches default composition
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 2000);
    this.camera.position.copy(this.defaultCamOffset);
    this.camera.lookAt(this.defaultLookOffset);

    // 3. Renderer Setup
    const config = getQualityConfigForTier(qualityTier);

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

    // 4. Universe Galaxies Setup (16 Distinct Galaxies in Deep Space)
    UNIVERSE_GALAXIES.forEach((galaxyConfig) => {
      const galaxyInstance = new GalaxyInstance(galaxyConfig, config.particleCount);
      this.galaxies.set(galaxyConfig.id, galaxyInstance);
      this.scene.add(galaxyInstance.group);
    });

    // 5. Environmental Subsystems (Deep Universe Starfield, Local Nebula, Foreground Dust)
    this.nebula = new NebulaParticles(config.nebulaCount);
    this.starfield = new StarfieldParticles(config.starCount);
    this.foregroundDust = new ForegroundDustParticles(config.foregroundDustCount);

    this.scene.add(this.starfield.points);
    this.scene.add(this.nebula.points);
    this.scene.add(this.foregroundDust.points);

    // 6. Post-Processing Pipeline (Bloom, Relativistic Gravitational Lensing, Cosmic Vignette)
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

    // 7. Interaction Plane in Universe Equator
    this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 8. OrbitControls — 360° Orbit, Zoom, Pan, Damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultLookOffset);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.updateControlsScale();

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

    // 10. Start Animation Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private updateControlsScale() {
    if (this.activePlanetId) {
      this.controls.minDistance = 0.08;
      this.controls.maxDistance = 5.0;
      this.controls.zoomSpeed = 0.25;
      this.controls.panSpeed = 0.15;
    } else if (this.activeSystemId) {
      this.controls.minDistance = 0.35;
      this.controls.maxDistance = 45.0;
      this.controls.zoomSpeed = 0.45;
      this.controls.panSpeed = 0.35;
    } else {
      this.controls.minDistance = 2.8;
      this.controls.maxDistance = 600.0;
      this.controls.zoomSpeed = 0.8;
      this.controls.panSpeed = 0.7;
    }
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
      let dist = active ? Math.round(active.worldPosition.distanceTo(this.camera.position)) : 0;

      if (this.activeSystemId && active?.starSystems) {
        const sys = active.starSystems.getSystem(this.activeSystemId);
        if (sys) {
          dist = Math.round(sys.worldPosition.distanceTo(this.camera.position));
        }
      }

      this.universeStateCallback({
        activeGalaxyId: this.activeGalaxyId,
        isNavigating: this.isTransitioningCamera,
        distanceToActive: dist,
        activeBlackHole: !!active?.config.hasBlackHole,
        activeSystemId: this.activeSystemId,
        activePlanetId: this.activePlanetId,
        detectedSystemId: this.detectedSystemId,
        detectedSystemName: this.detectedSystemName,
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
   * Seamless Inter-Galactic Navigation across all 16 galaxies in deep space
   */
  public navigateToGalaxy(galaxyId: string) {
    const targetGalaxy = this.galaxies.get(galaxyId);
    if (!targetGalaxy || (this.activeGalaxyId === galaxyId && !this.isInspectingCore && !this.isTransitioningCamera && !this.activeSystemId)) {
      return;
    }

    this.activeGalaxyId = galaxyId;
    this.activeSystemId = null;
    this.activePlanetId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    this.interactionPlane.constant = -targetGalaxy.worldPosition.y;

    const targetCamPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultCamOffset);
    const targetLookPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultLookOffset);

    const flightDist = this.camera.position.distanceTo(targetCamPos);
    const flightDuration = Math.min(Math.max(flightDist * 0.005, 1.2), 2.4);

    this.startCameraTransition(targetCamPos, targetLookPos, flightDuration);
    this.emitUniverseState();
  }

  /**
   * Smooth dive into a star system inside Galaxy 01
   */
  public enterStarSystem(systemId: string) {
    const galaxy = this.galaxies.get('galaxy01');
    if (!galaxy || !galaxy.starSystems) return;

    const sys = galaxy.starSystems.getSystem(systemId);
    if (!sys) return;

    this.activeGalaxyId = 'galaxy01';
    this.activeSystemId = systemId;
    this.activePlanetId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const targetCamPos = new THREE.Vector3().copy(sys.worldPosition).add(this.starSystemCamOffset);
    const targetLookPos = new THREE.Vector3().copy(sys.worldPosition);

    const flightDist = this.camera.position.distanceTo(targetCamPos);
    const flightDuration = Math.min(Math.max(flightDist * 0.04, 1.0), 1.8);

    this.startCameraTransition(targetCamPos, targetLookPos, flightDuration);
    this.emitUniverseState();
  }

  /**
   * Smooth close-up inspection of an orbiting planet
   */
  public enterPlanet(systemId: string, planetId: string) {
    const galaxy = this.galaxies.get('galaxy01');
    if (!galaxy || !galaxy.starSystems) return;

    const sys = galaxy.starSystems.getSystem(systemId);
    if (!sys) return;

    const planetWorldPos = sys.getPlanetPositionWorld(planetId);
    if (!planetWorldPos) return;

    this.activeGalaxyId = 'galaxy01';
    this.activeSystemId = systemId;
    this.activePlanetId = planetId;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.isInspectingCore = false;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const targetCamPos = new THREE.Vector3().copy(planetWorldPos).add(this.planetCamOffset);
    const targetLookPos = new THREE.Vector3().copy(planetWorldPos);

    this.startCameraTransition(targetCamPos, targetLookPos, 1.2);
    this.emitUniverseState();
  }

  /**
   * Back out from a planetary system or planet to the galaxy view
   */
  public exitStarSystem() {
    if (this.activePlanetId) {
      // Back out to Star System view
      if (this.activeSystemId) {
        this.enterStarSystem(this.activeSystemId);
      } else {
        this.resetCamera();
      }
      return;
    }

    this.activeSystemId = null;
    this.activePlanetId = null;
    this.updateControlsScale();
    this.resetCamera();
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

  private handleCanvasClick(clientX: number, clientY: number) {
    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    // 1. If currently inside a star system, check if user clicked on a planet
    if (this.activeSystemId && this.activeGalaxyId === 'galaxy01') {
      const g01 = this.galaxies.get('galaxy01');
      if (g01?.starSystems) {
        const hitPlanet = g01.starSystems.findIntersectedPlanet(ray, this.activeSystemId);
        if (hitPlanet) {
          this.enterPlanet(this.activeSystemId, hitPlanet.planetId);
          return;
        }
      }
    }

    // 2. If in Galaxy 01, check if user clicked directly on a Star System
    if (this.activeGalaxyId === 'galaxy01' && !this.activeSystemId) {
      const g01 = this.galaxies.get('galaxy01');
      if (g01?.starSystems) {
        const hitSys = g01.starSystems.findIntersectedSystem(ray);
        if (hitSys) {
          this.enterStarSystem(hitSys.config.id);
          return;
        }
      }
    }

    // 3. Check if user clicked on another distant galaxy in the universe
    for (const [id, galaxy] of this.galaxies.entries()) {
      if (id !== this.activeGalaxyId) {
        const distRayToGalaxy = ray.distanceToPoint(galaxy.worldPosition);
        if (distRayToGalaxy < galaxy.boundingRadius * 0.9) {
          this.navigateToGalaxy(id);
          return;
        }
      }
    }

    // 4. Local energy wave pulse on active galaxy
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

  private handleDoubleActionAtScreen(clientX: number, clientY: number) {
    if (this.isInspectingCore) {
      this.exitCoreInspection();
      return;
    }

    if (this.activePlanetId) {
      this.exitStarSystem();
      return;
    }

    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    // Check Star System hit in Galaxy 01
    if (this.activeGalaxyId === 'galaxy01' && !this.activeSystemId) {
      const g01 = this.galaxies.get('galaxy01');
      if (g01?.starSystems) {
        const hitSys = g01.starSystems.findIntersectedSystem(ray);
        if (hitSys) {
          this.enterStarSystem(hitSys.config.id);
          return;
        }
      }
    }

    for (const [id, galaxy] of this.galaxies.entries()) {
      if (id !== this.activeGalaxyId) {
        const distRayToGalaxy = ray.distanceToPoint(galaxy.worldPosition);
        if (distRayToGalaxy < galaxy.boundingRadius) {
          this.navigateToGalaxy(id);
          return;
        }
      }
    }

    const activeGalaxy = this.getActiveGalaxy();
    if (!activeGalaxy) return;

    const distToActiveCore = ray.distanceToPoint(activeGalaxy.worldPosition);
    const planeHit = new THREE.Vector3();
    let hitCore = false;

    if (ray.intersectPlane(this.interactionPlane, planeHit)) {
      if (planeHit.distanceTo(activeGalaxy.worldPosition) < 8.0) {
        hitCore = true;
      }
    }

    if (distToActiveCore < 7.0 || hitCore) {
      this.enterCoreInspection();
    }
  }

  public enterCoreInspection() {
    const active = this.getActiveGalaxy();
    if (!active) return;

    this.isInspectingCore = true;
    this.targetCoreInspection = 1.0;
    this.setState('CORE_TRANSITION');

    const offset = active.config.hasBlackHole ? this.blackHoleInspectOffset : this.coreInspectOffset;
    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(offset);
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
    this.activeSystemId = null;
    this.activePlanetId = null;
    this.updateControlsScale();
    this.setState('RETURNING');
    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(this.defaultCamOffset);
    const targetLook = new THREE.Vector3().copy(active.worldPosition).add(this.defaultLookOffset);
    this.startCameraTransition(targetPos, targetLook, 0.9);
  }

  private onKeyDown(e: KeyboardEvent) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    if (e.key === 'Escape') {
      if (this.activePlanetId || this.activeSystemId) {
        this.exitStarSystem();
      }
    } else if (e.key === 'r' || e.key === 'R') {
      this.resetCamera();
    } else if (e.key === 'c' || e.key === 'C') {
      this.toggleCoreInspection();
    } else if (e.key === '1') {
      this.navigateToGalaxy('galaxy01');
    } else if (e.key === '2') {
      this.navigateToGalaxy('galaxy02');
    } else if (e.key === '3') {
      this.navigateToGalaxy('galaxy03');
    } else if (e.key === '4') {
      this.navigateToGalaxy('galaxy04');
    } else if (e.key === '5') {
      this.navigateToGalaxy('galaxy05');
    } else if (e.key === '6') {
      this.navigateToGalaxy('galaxy06');
    } else if (e.key === '7') {
      this.navigateToGalaxy('galaxy07');
    } else if (e.key === '8') {
      this.navigateToGalaxy('galaxy08');
    } else if (e.key === '9') {
      this.navigateToGalaxy('galaxy09');
    } else if (e.key === '0') {
      this.navigateToGalaxy('galaxy10');
    }
  }

  public setPreset(preset: GalaxyPreset) {
    this.galaxies.forEach((g) => g.applyPreset(preset));
  }

  public setQualityTier(tier: QualityTier) {
    this.qualityTier = tier;
    const config = getQualityConfigForTier(tier);

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
    let total = 0;
    this.galaxies.forEach((g) => {
      if (g.particles.geometry.attributes.position) {
        total += g.particles.geometry.attributes.position.count;
      }
      if (g.blackHole) {
        total += 5000;
      }
      if (g.energyJets) {
        total += 5000;
      }
    });
    total += this.starfield.points.geometry.attributes.position ? this.starfield.points.geometry.attributes.position.count : 0;
    total += this.nebula.points.geometry.attributes.position ? this.nebula.points.geometry.attributes.position.count : 0;
    total += this.foregroundDust.points.geometry.attributes.position ? this.foregroundDust.points.geometry.attributes.position.count : 0;
    return total;
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

    // 5. Cinematic Camera Transitions
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += delta / this.camTransitionDuration;
      const t = Math.min(this.camTransitionProgress, 1.0);
      
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);

      this.camera.position.lerpVectors(this.camTransitionStartPos, this.camTransitionTargetPos, ease);
      this.controls.target.lerpVectors(this.camTransitionStartLook, this.camTransitionTargetLook, ease);

      if (t >= 1.0) {
        this.isTransitioningCamera = false;
        this.setState(this.isInspectingCore ? 'CORE_INSPECTION' : 'EXPLORING');
        this.emitUniverseState();
      }
    } else if (this.activePlanetId && this.activeSystemId) {
      // Dynamic camera tracking for moving planet
      const g01 = this.galaxies.get('galaxy01');
      if (g01?.starSystems) {
        const sys = g01.starSystems.getSystem(this.activeSystemId);
        if (sys) {
          const currentPlanetPos = sys.getPlanetPositionWorld(this.activePlanetId);
          if (currentPlanetPos) {
            const lookOffset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            this.controls.target.copy(currentPlanetPos);
            this.camera.position.copy(currentPlanetPos).add(lookOffset);
          }
        }
      }
    }

    // 6. Camera Gravitational Attraction & Safety Boundary Near Black Hole
    const activeGalaxy = this.getActiveGalaxy();
    if (activeGalaxy && activeGalaxy.config.hasBlackHole && !this.isTransitioningCamera) {
      const distToBH = this.camera.position.distanceTo(activeGalaxy.worldPosition);
      
      if (distToBH < 24.0 && distToBH > this.blackHoleSafetyRadius) {
        const pullDir = new THREE.Vector3().subVectors(activeGalaxy.worldPosition, this.camera.position).normalize();
        const gravityStrength = (1.0 - (distToBH / 24.0)) * 0.015;
        this.camera.position.addScaledVector(pullDir, gravityStrength);
      }

      if (distToBH < this.blackHoleSafetyRadius) {
        const pushDir = new THREE.Vector3().subVectors(this.camera.position, activeGalaxy.worldPosition).normalize();
        this.camera.position.copy(activeGalaxy.worldPosition).addScaledVector(pushDir, this.blackHoleSafetyRadius);
      }
    }

    // 7. Update OrbitControls
    this.controls.update();

    // 8. Update Scale-Aware LOD and Simulation for all Galaxies
    const effectiveTime = this.prefersReducedMotion ? elapsedTime * 0.2 : elapsedTime;

    this.galaxies.forEach((galaxyInstance, id) => {
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
        isActive ? this.coreInspectionFactor : 0.0,
        this.camera
      );
    });

    // 9. Proximity Detection for Star Systems in Galaxy 01
    if (this.activeGalaxyId === 'galaxy01' && !this.activeSystemId && !this.isTransitioningCamera) {
      const g01 = this.galaxies.get('galaxy01');
      if (g01?.starSystems) {
        const closest = g01.starSystems.getClosestSystem(this.camera.position);
        if (closest && closest.distance < 18.0) {
          if (this.detectedSystemId !== closest.system.config.id) {
            this.detectedSystemId = closest.system.config.id;
            this.detectedSystemName = closest.system.config.name;
            this.emitUniverseState();
          }
        } else if (this.detectedSystemId !== null) {
          this.detectedSystemId = null;
          this.detectedSystemName = null;
          this.emitUniverseState();
        }
      }
    }

    // 10. Update Environment Subsystems
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);
    this.foregroundDust.update(effectiveTime, this.entranceProgress);

    // 11. Update Relativistic Gravitational Lensing in Post-Processing
    if (activeGalaxy && activeGalaxy.config.hasBlackHole && activeGalaxy.config.blackHoleConfig) {
      const distToBH = this.camera.position.distanceTo(activeGalaxy.worldPosition);
      
      this.projectedScreenPos.copy(activeGalaxy.worldPosition).project(this.camera);
      const isVisible = this.projectedScreenPos.z < 1.0;

      if (isVisible && distToBH < 65.0) {
        this.screenLensPos.set(
          (this.projectedScreenPos.x + 1.0) * 0.5,
          (this.projectedScreenPos.y + 1.0) * 0.5
        );
        const lensRadius = (activeGalaxy.config.blackHoleConfig.lensingStrength / Math.max(distToBH, 3.0)) * 0.18;
        this.postProcessing.updateLensing(true, this.screenLensPos, lensRadius);
      } else {
        this.postProcessing.updateLensing(false, this.screenLensPos, 0.0);
      }
    } else {
      this.postProcessing.updateLensing(false, this.screenLensPos, 0.0);
    }

    // 12. Render Post-Processing Pipeline
    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 13. FPS & Universe State Telemetry
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      this.emitUniverseState();

      if (this.statsCallback) {
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
