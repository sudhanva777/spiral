import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NebulaParticles } from './particles/NebulaParticles';
import { StarfieldParticles } from './particles/StarfieldParticles';
import { ForegroundDustParticles } from './particles/ForegroundDustParticles';
import { CosmicWeb } from './cosmic/CosmicWeb';
import { CosmicObjectManager } from './cosmic/CosmicObjectManager';
import { getCosmicObjectById } from './cosmic/cosmicObjectRegistry';
import { GalaxyInstance } from './galaxies/GalaxyInstance';
import { UNIVERSE_GALAXIES } from './galaxies/registry';
import { PostProcessingPipeline } from './PostProcessing';
import { SurfaceExperience } from './starsystems/surface/SurfaceExperience';
import { GeminiCivilization } from './starsystems/surface/GeminiCivilization';
import type { CivilInteractable } from './starsystems/surface/GeminiCivilization';
import { getCapitalCityDir } from './starsystems/surface/cityDirs';
import { getQualityConfigForTier, effectivePixelRatio } from './utils/deviceDetection';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { NavigationMode, UniverseState, ScaleLevel } from '../types/universe';
import type { ExternalWorldState, WorldArrivalMode, WorldArrivalState, WorldReturnState } from '../types/world';
import { IDLE_EXTERNAL_WORLD_STATE } from '../types/world';
import {
  AQUILA_GALAXY_ID,
  getWorldManifestByManifestId,
  getWorldManifestByWorldId,
  isArrivalModeSupported,
  logWorldRegistryStatus,
} from '../worlds/worldRegistry';
import { soundSynthesizer } from '../components/SoundSynthesizer';

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

  // Hierarchical Star System, Planetary, & Lunar Focus State
  private activeSystemId: string | null = null;
  private activePlanetId: string | null = null;
  private activeMoonId: string | null = null;
  private detectedSystemId: string | null = null;
  private detectedSystemName: string | null = null;

  // Surface Experience (IC 1579 flagship world deep exploration)
  private isOnSurface = false;
  private surfaceExperience: SurfaceExperience | null = null;
  private surfaceRadius = 0;

  // Simulation Time Scale (1.0 = Normal, 0.25 = Observation Mode, 0.0 = Freeze)
  private timeScale = 1.0;

  // Environmental Particle Subsystems (Deep Universe Starfield, Local Nebula, Foreground Dust)
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;
  private foregroundDust: ForegroundDustParticles;
  private cosmicWeb: CosmicWeb;

  // UNIVERSAL — cosmic phenomena living directly in AETHER space
  private cosmicObjects: CosmicObjectManager;
  private activeCosmicObjectId: string | null = null;
  private detectedCosmicObjectId: string | null = null;
  private detectedCosmicObjectName: string | null = null;
  private cosmicObjectExitContext: {
    pos: THREE.Vector3;
    look: THREE.Vector3;
    saved: boolean;
  } = { pos: new THREE.Vector3(), look: new THREE.Vector3(), saved: false };

  // AETHER ↔ IC 1579 separation state
  private readonly ic1579GalaxyId = 'galaxy17';
  private ic1579ApproachActive = false;
  private camTransitionQueue: Array<{
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
    duration: number;
  }> = [];
  private navigationMode: NavigationMode = 'AETHER';

  // Scene background color — lerped from deep-space blue-black (AETHER)
  // toward dark teal-black as the camera crosses into IC 1579.
  private readonly aetherBackground = new THREE.Color(0x020208);
  private readonly ic1579Background = new THREE.Color(0x031a1c);

  // Environment intensity targets (per navigation mode) & current values
  private envIntensity = { nebula: 0.5, starfield: 0.65, dust: 0.4, web: 0.5 };
  private ic1579Presence = 0.0;

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
  private readonly aetherVantagePos = new THREE.Vector3(0, 48, 150);
  private readonly aetherVantageLook = new THREE.Vector3(0, 0, 0);
  private readonly coreInspectOffset = new THREE.Vector3(0, 3.8, 8.5);
  private readonly blackHoleInspectOffset = new THREE.Vector3(0, 2.2, 5.8);
  private readonly starSystemCamOffset = new THREE.Vector3(0, 2.4, 5.5);
  private readonly planetCamOffset = new THREE.Vector3(0, 0.28, 0.62);
  private readonly moonCamOffset = new THREE.Vector3(0, 0.035, 0.08);
  private readonly blackHoleSafetyRadius = 3.2;

  private isInspectingCore = false;
  private coreInspectionFactor = 0.0;
  private targetCoreInspection = 0.0;

  // Cinematic Camera Transitions
  private isTransitioningCamera = false;
  private camTransitionStartPos = new THREE.Vector3();
  private camTransitionTargetPos = new THREE.Vector3();
  private camTransitionStartLook = new THREE.Vector3();
  private camTransitionTargetLook = new THREE.Vector3();
  private camTransitionProgress = 0.0;
  private camTransitionDuration = 1.0;

  // Double Tap Tracking (Mobile)
  private lastTapTime = 0;

  // Hierarchical deep-exploration state (IC 1579 systems → habitable worlds)
  private detectedPlanetId: string | null = null;
  private detectedPlanetName: string | null = null;
  private surfaceMoveKeys = new Set<string>();

  // GEMINI low-gravity surface physics (1.62 m/s² Moon-like, mapped to
  // planet-radii per second). Zero gravity = existing free-walk worlds.
  private surfaceGravity = 0; // planet-radii / s²
  private surfaceJumpVelocity = 0; // planet-radii / s
  private surfaceVerticalVelocity = 0; // planet-radii / s
  private surfaceAltitude = 0; // planet-radii above the ground

  // GEMINI living world — human-scale camera, meters-based walk, and the
  // capital city civilization (NPCs, robots, traffic, dialogue).
  private civil: GeminiCivilization | null = null;
  private surfaceCivilization = false;
  private humanScale = false;
  private surfaceCameraHeightFraction = 0.02; // planet radii above terrain
  private surfaceWalkSpeed = 0; // scene units / s (0 → legacy planet walk)
  private interactionTarget: CivilInteractable | null = null;
  private dialogueActive = false;

  // AQUILA — external Type-II world handoff state machine. The Galaxy
  // Explorer owns everything down to orbit; the external world owns the
  // surface. This state tracks the transition between the two.
  private externalWorldState: ExternalWorldState = { ...IDLE_EXTERNAL_WORLD_STATE };
  private externalWorldExitContext: {
    pos: THREE.Vector3;
    look: THREE.Vector3;
    saved: boolean;
  } = { pos: new THREE.Vector3(), look: new THREE.Vector3(), saved: false };
  private dialogueIndex = 0;
  private dialogueLines: string[] = [];
  private dialogueTargetId: string | null = null;
  private tmpInteractionDir = new THREE.Vector3();
  private exitContext: {
    pos: THREE.Vector3;
    look: THREE.Vector3;
    saved: boolean;
  } = { pos: new THREE.Vector3(), look: new THREE.Vector3(), saved: false };

  // Surface-walk scratch vectors
  private tmpPlanetPos = new THREE.Vector3();
  private tmpSurfaceDir = new THREE.Vector3();
  private tmpSurfaceRight = new THREE.Vector3();
  private tmpSurfaceMove = new THREE.Vector3();
  private tmpPlanetLocalDir = new THREE.Vector3();
  private tmpClampedPos = new THREE.Vector3();

  // Navigation debug log — records every mode transition once
  private lastLoggedNavMode: NavigationMode | null = null;
  private lastPulsarTickTime = 0;

  // Animation Timing & Entrance
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private entranceProgress = 0.0;
  private isEntranceComplete = false;
  private prefersReducedMotion = false;
  private accumulatedSimulationTime = 0;

  // Performance Telemetry
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;
  private statsCallback?: (stats: SimulationStats) => void;

  // Adaptive Dynamic Resolution — FPS-triggered pixel-ratio scaling with
  // hysteresis (never oscillates, recovers slowly, floors at 65%).
  private resolutionScale = 1.0;
  private fpsEma = 60;
  private lowFpsTimer = 0;
  private highFpsTimer = 0;

  // Responsive resize architecture — container observation catches mobile
  // URL-bar / orientation / split-screen changes that window resize misses.
  private resizeObserver: ResizeObserver | null = null;
  private onOrientationChange: () => void = () => this.onWindowResize();
  private onVisualViewportChange: () => void = () => this.onWindowResize();

  // GEMINI mobile touch input — virtual stick (normalized) + action triggers
  private surfaceStick = new THREE.Vector2(0, 0);

  // Temp vectors for gravitational lensing & projection
  private projectedScreenPos = new THREE.Vector3();
  private screenLensPos = new THREE.Vector2(0.5, 0.5);
  private tmpCamLocal = new THREE.Vector3();

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

    // 2. Camera Setup — AETHER overview vantage: far enough from Aether
    // Prime to read as "the space between galaxies", with IC 1579 visible
    // far in the distance as a small emerald structure.
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    this.camera.position.set(0, 48, 150);
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

    // 5b. AETHER large-scale structure: faint cosmic-web filaments threading
    // between galaxy groups (the only subtle structure in the deep gap).
    this.cosmicWeb = new CosmicWeb(16000);
    this.scene.add(this.cosmicWeb.points);

    // 5c. UNIVERSAL cosmic phenomena — star-forming nebula, ember ridge,
    // molecular pillar region, pulsar and black-hole binary, distributed
    // through the intentional empty regions of AETHER.
    this.cosmicObjects = new CosmicObjectManager(this.qualityTier);
    this.cosmicObjects.setPixelRatio(config.dpr);
    this.cosmicObjects.onMerger = () => this.synthesizerMergerThump();
    this.scene.add(this.cosmicObjects.group);

    // AETHER starts dark and quiet: dim global environment until a galaxy
    // (IC 1579) pulls the camera in, at which point the galaxy's own dense
    // emerald particles own the scene.
    this.nebula.setIntensity(0.5);
    this.starfield.setIntensity(0.65);
    this.foregroundDust.setIntensity(0.4);
    this.cosmicWeb.setIntensity(0.5);

    // 6. Post-Processing Pipeline (Bloom, Relativistic Gravitational Lensing, Cosmic Vignette)
    this.postProcessing = new PostProcessingPipeline(
      this.renderer,
      this.scene,
      this.camera,
      width,
      height,
      config.bloomStrength,
      config.bloomRadius,
      0.7,
      qualityTier === 'low' ? 0 : 4
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

    // 9. Event Listeners — container-level observation catches every viewport
    // change (mobile URL bars, orientation, split-screen, zoom) that the
    // window 'resize' event alone would miss.
    this.initEventListeners();

    // 10. Start Animation Loop
    this.animate = this.animate.bind(this);
    this.animate();

    // Dev-only diagnostics — world registry contract health (Phase 24).
    logWorldRegistryStatus();
  }

  /** Push one effective pixel ratio to every render consumer (renderer,
   *  composer, particle systems, surface, cosmic objects). */
  private applyPixelRatio(pixelRatio: number) {
    this.renderer.setPixelRatio(pixelRatio);
    this.postProcessing.setPixelRatio(pixelRatio);
    this.galaxies.forEach((g) => g.setPixelRatio(pixelRatio));
    this.nebula.setPixelRatio(pixelRatio);
    this.starfield.setPixelRatio(pixelRatio);
    this.foregroundDust.setPixelRatio(pixelRatio);
    this.cosmicWeb.setPixelRatio(pixelRatio);
    this.cosmicObjects.setPixelRatio(pixelRatio);
    this.surfaceExperience?.setPixelRatio(pixelRatio);
  }

  /** Adaptive dynamic-resolution step — floor 0.65, ceiling 1.0, slow recover. */
  private setResolutionScale(scale: number) {
    const next = Math.max(0.65, Math.min(1.0, scale));
    if (Math.abs(next - this.resolutionScale) < 0.001) return;
    this.resolutionScale = next;
    this.applyPixelRatio(effectivePixelRatio(this.qualityTier, this.resolutionScale));
  }

  private updateControlsScale() {
    if (this.activeCosmicObjectId) {
      // UNIVERSAL phenomenon focus — per-object framing ranges
      const cosmicCfg = getCosmicObjectById(this.activeCosmicObjectId);
      this.camera.up.set(0, 1, 0);
      this.controls.enablePan = true;
      this.controls.minDistance = cosmicCfg.controls.minDistance;
      this.controls.maxDistance = cosmicCfg.controls.maxDistance;
      this.controls.zoomSpeed = cosmicCfg.controls.zoomSpeed ?? 0.4;
      this.controls.panSpeed = cosmicCfg.controls.panSpeed ?? 0.3;
      this.camera.near = cosmicCfg.controls.near ?? 0.1;
      this.camera.far = cosmicCfg.controls.far ?? 2000.0;
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.isOnSurface && this.surfaceRadius > 0) {
      this.controls.minDistance = this.surfaceRadius * 1.02;
      this.controls.maxDistance = this.surfaceRadius * 16.0;
      this.controls.zoomSpeed = 0.05;
      this.controls.panSpeed = 0.01;
      this.camera.near = this.surfaceRadius * 0.0004;
      this.camera.far = 120.0;
      this.controls.enablePan = false;
    } else {
      this.camera.up.set(0, 1, 0);
      this.controls.enablePan = true;
      if (this.activeMoonId) {
        this.controls.minDistance = 0.015;
        this.controls.maxDistance = 2.0;
        this.controls.zoomSpeed = 0.08;
        this.controls.panSpeed = 0.04;
        this.camera.near = 0.001;
        this.camera.far = 80.0;
      } else if (this.activePlanetId) {
        this.controls.minDistance = 0.06;
        this.controls.maxDistance = 6.0;
        this.controls.zoomSpeed = 0.18;
        this.controls.panSpeed = 0.10;
        this.camera.near = 0.005;
        this.camera.far = 250.0;
      } else if (this.activeSystemId) {
        this.controls.minDistance = 0.35;
        this.controls.maxDistance = 45.0;
        this.controls.zoomSpeed = 0.45;
        this.controls.panSpeed = 0.35;
        this.camera.near = 0.05;
        this.camera.far = 800.0;
      } else {
        // AETHER / galaxy-object scale
        const active = this.getActiveGalaxy();
        const isIC1579 = active?.config.id === this.ic1579GalaxyId;

        if (isIC1579 && active) {
          const distToIC1579 = this.camera.position.distanceTo(active.worldPosition);

          if (distToIC1579 <= active.boundingRadius) {
            // Inside the galaxy: deep-exploration navigation between its stars.
            // Zoom range is capped so the user stays embedded in the stellar
            // environment instead of drifting back out into AETHER.
            this.controls.minDistance = 2.8;
            this.controls.maxDistance = 240.0;
            this.controls.zoomSpeed = 0.55;
            this.controls.panSpeed = 0.5;
            this.camera.near = 0.1;
            this.camera.far = 2000.0;
          } else {
            // Approaching the distant galaxy: allow broad orbital framing.
            this.controls.minDistance = 2.8;
            this.controls.maxDistance = 520.0;
            this.controls.zoomSpeed = 0.75;
            this.controls.panSpeed = 0.6;
            this.camera.near = 0.1;
            this.camera.far = 2000.0;
          }
        } else {
          this.controls.minDistance = 2.8;
          this.controls.maxDistance = 600.0;
          this.controls.zoomSpeed = 0.8;
          this.controls.panSpeed = 0.7;
          this.camera.near = 0.1;
          this.camera.far = 2000.0;
        }
      }
    }
    this.camera.updateProjectionMatrix();
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
      let detectedBH = false;
      let distBH = 0;

      if (active?.config.hasBlackHole) {
        distBH = active.worldPosition.distanceTo(this.camera.position);
        if (distBH < 36.0 && !this.isTransitioningCamera) {
          detectedBH = true;
        }
      }

      if (this.activeSystemId && active?.starSystems) {
        const sys = active.starSystems.getSystem(this.activeSystemId);
        if (sys) {
          dist = Math.round(sys.worldPosition.distanceTo(this.camera.position));
        }
      }

      if (this.activeCosmicObjectId) {
        const cosmicObj = this.cosmicObjects.getObject(this.activeCosmicObjectId);
        if (cosmicObj) {
          dist = Math.round(cosmicObj.group.position.distanceTo(this.camera.position));
        }
      }

      this.universeStateCallback({
        activeGalaxyId: this.activeGalaxyId,
        isNavigating: this.isTransitioningCamera,
        distanceToActive: dist,
        activeBlackHole: !!active?.config.hasBlackHole,
        detectedBlackHole: detectedBH,
        blackHoleDistance: Math.round(distBH * 10) / 10,
        activeSystemId: this.activeSystemId,
        activePlanetId: this.activePlanetId,
        activeMoonId: this.activeMoonId,
        detectedSystemId: this.detectedSystemId,
        detectedSystemName: this.detectedSystemName,
        detectedPlanetId: this.detectedPlanetId,
        detectedPlanetName: this.detectedPlanetName,
        activeCosmicObjectId: this.activeCosmicObjectId,
        detectedCosmicObjectId: this.detectedCosmicObjectId,
        detectedCosmicObjectName: this.detectedCosmicObjectName,
        cosmicObjectType: this.activeCosmicObjectId ? getCosmicObjectById(this.activeCosmicObjectId).type : null,
        timeScale: this.timeScale,
        scaleLevel: this.getScaleLevel(),
        navigationMode: this.computeNavigationMode(),
        surfaceState: this.getSurfaceState(),
        surfaceInteraction:
          this.isOnSurface && this.civil && this.interactionTarget
            ? {
                id: this.interactionTarget.id,
                name: this.interactionTarget.name,
                title: this.interactionTarget.title,
                prompt: this.interactionTarget.prompt,
                dialogue: this.dialogueLines,
                lineIndex: this.dialogueIndex,
                active: this.dialogueActive,
              }
            : null,
        activeDiscoveryTag: this.getActiveDiscoveryTag(),
        externalWorldState: { ...this.externalWorldState },
      });

      const navMode = this.computeNavigationMode();
      if (navMode !== this.lastLoggedNavMode) {
        console.debug(`[Navigation] ${navMode} (${this.activeSystemId ?? '-'}/${this.activePlanetId ?? '-'}/${this.activeMoonId ?? '-'})`);
        this.lastLoggedNavMode = navMode;
      }
    }
  }

  public setTimeScale(scale: number) {
    this.timeScale = Math.max(0.0, Math.min(3.0, scale));
    this.emitUniverseState();
  }

  public getTimeScale(): number {
    return this.timeScale;
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

  public isSurfaceMode(): boolean {
    return this.isOnSurface;
  }

  public getScaleLevel(): ScaleLevel {
    if (this.isOnSurface) return 'SURFACE';
    if (this.activeMoonId || this.activePlanetId) return 'PLANETARY';
    if (this.activeSystemId) return 'STELLAR';
    if (this.isInspectingCore) return 'GALAXY';
    return 'COSMOS';
  }

  /**
   * AETHER ↔ IC 1579 ↔ AQUILA navigation state.
   * AETHER = the cosmic overview between destinations.
   * IC 1579 = the deep-exploration destination galaxy.
   * AQUILA = the external Type-II destination galaxy (world gateway).
   */
  public computeNavigationMode(): NavigationMode {
    if (this.activeCosmicObjectId) return 'COSMIC_DESTINATION';
    if (this.isOnSurface) return 'IC1579_SURFACE';

    if (this.activeGalaxyId === AQUILA_GALAXY_ID) {
      // AQUILA — the external Type-II destination galaxy. Depth states are
      // its own: galaxy interior → Type-II system → Type-II planet orbit.
      if (this.activeMoonId || this.activePlanetId) return 'AQUILA_PLANET';
      if (this.activeSystemId) return 'AQUILA_SYSTEM';
      return 'AQUILA_GALAXY';
    }

    if (this.activeMoonId || this.activePlanetId) return 'IC1579_PLANET';
    if (this.activeSystemId) return 'IC1579_SYSTEM';

    if (this.activeGalaxyId === this.ic1579GalaxyId) {
      if (this.ic1579ApproachActive || this.camTransitionQueue.length > 0) {
        return 'IC1579_APPROACH';
      }
      const active = this.getActiveGalaxy();
      if (active && this.camera.position.distanceTo(active.worldPosition) > active.boundingRadius) {
        return 'IC1579_GALAXY';
      }
      return 'IC1579_STELLAR';
    }
    return 'AETHER';
  }

  public getNavigationMode(): NavigationMode {
    return this.navigationMode;
  }

  public getSurfaceState() {
    if (!this.isOnSurface || !this.surfaceExperience) return undefined;
    const active = this.getActiveGalaxy();
    let camDistR = 1.0;
    if (this.activeSystemId && active?.starSystems) {
      const sys = active.starSystems.getSystem(this.activeSystemId);
      if (sys && this.activePlanetId) {
        const planet = sys.planets.find((p) => p.config.id === this.activePlanetId);
        if (planet) {
          const camLocal = this.camera.position.clone();
          planet.group.worldToLocal(camLocal);
          camDistR = camLocal.length() / planet.config.radius;
        }
      }
    }
    return {
      isLanded: camDistR < 1.3,
      timeOfDay: this.surfaceExperience.getTimeOfDay(),
      lookingAtSky: this.camera.getWorldDirection(new THREE.Vector3()).y > 0.35,
      altitude: Math.min(Math.max((camDistR - 1.0) / 1.5, 0), 1),
    };
  }

  public getActiveDiscoveryTag() {
    const active = this.getActiveGalaxy();
    if (this.activeSystemId && active?.starSystems) {
      const sys = active.starSystems.getSystem(this.activeSystemId);
      if (sys?.config.discoveryTag) return sys.config.discoveryTag;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Touch input API — normalized actions consumed by the engine so the
  // mobile and desktop control schemes never diverge.
  // ------------------------------------------------------------------

  /** Virtual joystick: normalized x (strafe) / y (forward is -y) in [-1, 1]. */
  public setSurfaceStickInput(x: number, y: number) {
    this.surfaceStick.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  }

  /** Touch equivalent of the Space jump key on low-gravity surfaces. */
  public triggerSurfaceJump() {
    if (
      this.isOnSurface &&
      this.surfaceGravity > 0 &&
      this.surfaceAltitude <= (this.humanScale ? 0.0002 : 0.001) &&
      !this.isTransitioningCamera
    ) {
      this.surfaceVerticalVelocity = this.surfaceJumpVelocity;
    }
  }

  /** Touch equivalent of the E key — advance dialogue or talk to the target. */
  public triggerSurfaceInteract() {
    if (this.isOnSurface && this.civil && this.surfaceCivilization) {
      if (this.dialogueActive) {
        this.advanceDialogue();
      } else if (this.interactionTarget) {
        this.beginDialogue(this.interactionTarget);
      }
    }
  }

  /**
   * Seamless Inter-Galactic Navigation across all 16 galaxies in deep space
   */
  public navigateToGalaxy(galaxyId: string) {
    if (this.isOnSurface) this.exitSurface();
    this.abortActiveHandoff();

    const targetGalaxy = this.galaxies.get(galaxyId);
    if (!targetGalaxy || (this.activeGalaxyId === galaxyId && !this.isInspectingCore && !this.isTransitioningCamera && !this.activeSystemId)) {
      return;
    }

    this.activeGalaxyId = galaxyId;
    this.activeSystemId = null;
    this.activePlanetId = null;
    this.activeMoonId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.detectedPlanetId = null;
    this.detectedPlanetName = null;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.cosmicObjectExitContext.saved = false;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    this.interactionPlane.constant = -targetGalaxy.worldPosition.y;
    this.ic1579ApproachActive = false;
    this.camTransitionQueue = [];

    if (galaxyId === this.ic1579GalaxyId) {
      // IC 1579: staged cinematic approach across the empty gap —
      // distant object view → galactic boundary crossing → stellar interior.
      this.beginIC1579Approach(targetGalaxy);
    } else {
      const targetCamPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultCamOffset);
      const targetLookPos = new THREE.Vector3().copy(targetGalaxy.worldPosition).add(this.defaultLookOffset);

      const flightDist = this.camera.position.distanceTo(targetCamPos);
      const flightDuration = Math.min(Math.max(flightDist * 0.005, 1.2), 2.4);

      this.startCameraTransition(targetCamPos, targetLookPos, flightDuration);
    }

    this.emitUniverseState();
  }

  /**
   * The IC 1579 entry sequence. The user first sees IC 1579 as a distant
   * structure; the galaxy slowly grows; structure, dust and nebulae resolve;
   * the camera crosses the galactic boundary and settles inside the stellar
   * environment. No hard scene change — one continuous flight.
   */
  private beginIC1579Approach(targetGalaxy: GalaxyInstance) {
    const center = targetGalaxy.worldPosition;
    const approachDir = new THREE.Vector3(0.35, 0.3, 1).normalize();

    // Stage 1 — AETHER → distant galaxy object view.
    const stage1Pos = center.clone().addScaledVector(approachDir, 175);
    const stage1Look = center.clone();
    const flightDist = this.camera.position.distanceTo(stage1Pos);
    const flightDuration = Math.min(Math.max(flightDist * 0.006, 1.6), 3.0);

    // Stage 2 — approach: the galaxy grows, spiral structure resolves,
    // dust lanes and nebulae become visible near the galactic boundary.
    const stage2Pos = center.clone().addScaledVector(approachDir, 72);
    const stage2Look = center.clone();

    // Stage 3 — enter: settle inside the dense stellar environment.
    const stage3Pos = center.clone().add(this.defaultCamOffset);
    const stage3Look = center.clone().add(this.defaultLookOffset);

    this.ic1579ApproachActive = true;
    this.startCameraTransition(stage1Pos, stage1Look, flightDuration);
    this.queueCameraTransition(stage2Pos, stage2Look, 3.2);
    this.queueCameraTransition(stage3Pos, stage3Look, 2.6);
  }

  /**
   * Smooth dive into a star system inside the active galaxy
   */
  public enterStarSystem(systemId: string) {
    if (this.isOnSurface) this.exitSurface();
    this.abortActiveHandoff();

    const galaxy = this.getActiveGalaxy();
    if (!galaxy || !galaxy.starSystems) {
      console.error('[Navigation] ENTER SYSTEM failed — active galaxy has no star systems');
      return;
    }

    const sys = galaxy.starSystems.getSystem(systemId);
    if (!sys) {
      console.error('[Navigation] ENTER SYSTEM failed — unknown system id', systemId);
      return;
    }

    // Remember where the user was inside IC 1579 (or the active galaxy) so
    // EXIT SYSTEM returns them to that exact place, not to a new location.
    if (!this.activeSystemId && !this.isOnSurface && !this.isTransitioningCamera) {
      this.exitContext.pos.copy(this.camera.position);
      this.exitContext.look.copy(this.controls.target);
      this.exitContext.saved = true;
    }

    this.activeGalaxyId = galaxy.config.id;
    this.activeSystemId = systemId;
    this.activePlanetId = null;
    this.activeMoonId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.detectedPlanetId = null;
    this.detectedPlanetName = null;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
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
    if (this.isOnSurface) this.exitSurface();
    this.abortActiveHandoff();

    const galaxy = this.getActiveGalaxy();
    if (!galaxy || !galaxy.starSystems) {
      console.error('[Navigation] ENTER PLANET failed — active galaxy has no star systems');
      return;
    }

    const sys = galaxy.starSystems.getSystem(systemId);
    if (!sys) {
      console.error('[Navigation] ENTER PLANET failed — unknown system id', systemId);
      return;
    }

    const planetWorldPos = sys.getPlanetPositionWorld(planetId);
    if (!planetWorldPos) {
      console.error('[Navigation] ENTER PLANET failed — unknown planet id', systemId, planetId);
      return;
    }

    this.activeGalaxyId = galaxy.config.id;
    this.activeSystemId = systemId;
    this.activePlanetId = planetId;
    this.activeMoonId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.detectedPlanetId = null;
    this.detectedPlanetName = null;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.isInspectingCore = false;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const targetCamPos = new THREE.Vector3().copy(planetWorldPos).add(this.planetCamOffset);
    const targetLookPos = new THREE.Vector3().copy(planetWorldPos);

    this.startCameraTransition(targetCamPos, targetLookPos, 1.2);
    this.emitUniverseState();
  }

  /**
   * Smooth close-up inspection of an orbiting moon
   */
  public enterMoon(systemId: string, planetId: string, moonId: string) {
    if (this.isOnSurface) this.exitSurface();

    const galaxy = this.getActiveGalaxy();
    if (!galaxy || !galaxy.starSystems) {
      console.error('[Navigation] ENTER MOON failed — active galaxy has no star systems');
      return;
    }

    const sys = galaxy.starSystems.getSystem(systemId);
    if (!sys) {
      console.error('[Navigation] ENTER MOON failed — unknown system id', systemId);
      return;
    }

    const moonWorldPos = sys.getMoonPositionWorld(planetId, moonId);
    if (!moonWorldPos) {
      console.error('[Navigation] ENTER MOON failed — unknown moon id', systemId, planetId, moonId);
      return;
    }

    this.activeGalaxyId = galaxy.config.id;
    this.activeSystemId = systemId;
    this.activePlanetId = planetId;
    this.activeMoonId = moonId;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.isInspectingCore = false;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const targetCamPos = new THREE.Vector3().copy(moonWorldPos).add(this.moonCamOffset);
    const targetLookPos = new THREE.Vector3().copy(moonWorldPos);

    this.startCameraTransition(targetCamPos, targetLookPos, 1.1);
    this.emitUniverseState();
  }

  /**
   * Back out seamlessly up the hierarchy without separate scenes
   */
  public exitStarSystem() {
    if (this.isOnSurface) {
      this.exitSurface();
      return;
    }

    if (this.activeMoonId) {
      // Back out from Moon to Planet view
      if (this.activeSystemId && this.activePlanetId) {
        this.enterPlanet(this.activeSystemId, this.activePlanetId);
      } else {
        this.resetCamera();
      }
      return;
    }

    if (this.activePlanetId) {
      // Back out from Planet to Star System view
      if (this.activeSystemId) {
        this.enterStarSystem(this.activeSystemId);
      } else {
        this.resetCamera();
      }
      return;
    }

    this.activeSystemId = null;
    this.activePlanetId = null;
    this.activeMoonId = null;
    this.updateControlsScale();

    // EXIT SYSTEM → back to the exact IC 1579 location from which the
    // system was entered. Falls back to the galaxy overview.
    if (this.exitContext.saved) {
      this.startCameraTransition(this.exitContext.pos, this.exitContext.look, 1.4);
      this.exitContext.saved = false;
    } else {
      this.resetCamera();
    }
  }

  /**
   * Enter a Universal-level cosmic phenomenon (nebula, ridge, pillars,
   * pulsar, black-hole binary). Saves the AETHER position from which the
   * visitor approached so EXIT returns them to that exact spot.
   */
  public enterCosmicObject(objectId: string) {
    if (this.isOnSurface) this.exitSurface();
    this.abortActiveHandoff();

    const obj = this.cosmicObjects.getObject(objectId);
    if (!obj) {
      console.error('[Navigation] ENTER COSMIC OBJECT failed — unknown object id', objectId);
      return;
    }

    if (!this.activeCosmicObjectId && !this.isTransitioningCamera) {
      this.cosmicObjectExitContext.pos.copy(this.camera.position);
      this.cosmicObjectExitContext.look.copy(this.controls.target);
      this.cosmicObjectExitContext.saved = true;
    }

    this.activeSystemId = null;
    this.activePlanetId = null;
    this.activeMoonId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.detectedPlanetId = null;
    this.detectedPlanetName = null;
    this.activeCosmicObjectId = objectId;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const cosmicCfg = getCosmicObjectById(objectId);
    const targetPos = new THREE.Vector3()
      .copy(obj.group.position)
      .add(new THREE.Vector3(...cosmicCfg.approachOffset));
    const targetLook = new THREE.Vector3().copy(obj.group.position);

    const flightDist = this.camera.position.distanceTo(targetPos);
    const flightDuration = Math.min(Math.max(flightDist * 0.02, 1.2), 2.6);

    this.startCameraTransition(targetPos, targetLook, flightDuration);
    this.emitUniverseState();
  }

  /**
   * Exit a cosmic phenomenon back to the AETHER position from which it
   * was approached — or to the AETHER vantage if no context was saved.
   */
  public exitCosmicObject() {
    if (!this.activeCosmicObjectId) return;

    const objectName = getCosmicObjectById(this.activeCosmicObjectId).name;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.updateControlsScale();
    this.setState('RETURNING');

    if (this.cosmicObjectExitContext.saved) {
      this.startCameraTransition(this.cosmicObjectExitContext.pos, this.cosmicObjectExitContext.look, 1.4);
      this.cosmicObjectExitContext.saved = false;
    } else {
      this.startCameraTransition(this.aetherVantagePos, this.aetherVantageLook, 2.0);
    }
    console.debug(`[Navigation] EXIT ${objectName.toUpperCase()} → AETHER`);
    this.emitUniverseState();
  }

  private synthesizerMergerThump() {
    soundSynthesizer.mergerThump();
  }

  private synthesizerPulsarTick() {
    soundSynthesizer.pulsarTick();
  }

  private beginDialogue(target: CivilInteractable) {
    this.dialogueActive = true;
    this.dialogueIndex = 0;
    this.dialogueLines = target.dialogue;
    this.dialogueTargetId = target.id;
    this.civil?.setInteractionFocus(target.id);
    this.emitUniverseState();
  }

  private advanceDialogue() {
    if (!this.dialogueActive) return;
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueLines.length) {
      this.closeDialogue();
      return;
    }
    this.emitUniverseState();
  }

  private closeDialogue() {
    this.dialogueActive = false;
    this.dialogueIndex = 0;
    this.dialogueLines = [];
    this.dialogueTargetId = null;
    this.civil?.setInteractionFocus(null);
    this.emitUniverseState();
  }

  /**
   * Direct cinematic entry to a habitable planet's surface: fly to the
   * planet, then descend through its atmosphere to the surface.
   */
  public enterPlanetSurface(systemId: string, planetId: string) {
    // Rapid-click guard: a second click while the descent is in flight
    // must not tear down and rebuild the surface scene.
    if (this.isOnSurface) return;
    this.enterPlanet(systemId, planetId);
    this.descendToSurface();
  }

  /**
   * Continuous descent to the surface of a surface-explorable planet
   * (Aurelia in IC 1579). The night sky continues to show the same galaxy.
   */
  public descendToSurface() {
    if (this.isOnSurface || !this.activeSystemId || !this.activePlanetId) return;

    const galaxy = this.getActiveGalaxy();
    if (!galaxy?.starSystems) return;
    const sys = galaxy.starSystems.getSystem(this.activeSystemId);
    if (!sys) return;
    const planet = sys.planets.find((p) => p.config.id === this.activePlanetId);
    if (!planet || !planet.config.surfaceExplore) return;

    this.isOnSurface = true;
    this.surfaceRadius = planet.config.radius;
    // GEMINI-style moon gravity: PlanetConfig.surfaceGravity (m/s²) mapped
    // through the human-scale unit (UM = radius × 0.0011) into planet-radii
    // units, so jumps reach exactly the configured apex height in meters.
    const g = planet.config.surfaceGravity ?? 0;
    if (g > 0) {
      this.surfaceGravity = g * 0.0011; // radii / s² (1.62 m/s² → floaty hops)
      const jumpH = (planet.config.surfaceJumpHeight ?? 1.2) * 0.0011; // radii
      this.surfaceJumpVelocity = Math.sqrt(2.0 * this.surfaceGravity * jumpH);
    } else {
      this.surfaceGravity = 0;
      this.surfaceJumpVelocity = 0;
    }
    this.surfaceVerticalVelocity = 0;
    this.surfaceAltitude = 0;

    // GEMINI living world: human-scale walk, low camera, civilization
    this.surfaceCivilization = !!planet.config.surfaceCivilization;
    this.humanScale = this.surfaceCivilization || !!planet.config.surfaceCameraHeight;
    this.surfaceCameraHeightFraction = planet.config.surfaceCameraHeight ?? 0.02;
    this.surfaceWalkSpeed = this.humanScale
      ? (planet.config.surfaceWalkSpeed ?? 1.4) * planet.config.radius * 0.0011
      : 0;
    this.dialogueActive = false;
    this.dialogueIndex = 0;
    this.dialogueLines = [];
    this.dialogueTargetId = null;
    this.interactionTarget = null;

    this.setState('CORE_TRANSITION');

    // Lazily build the surface experience (height-map bake happens once)
    if (!this.surfaceExperience) {
      this.surfaceExperience = new SurfaceExperience(
        planet.config,
        planet.group,
        galaxy.group,
        planet.moons
      );
      this.surfaceExperience.setPixelRatio(getQualityConfigForTier(this.qualityTier).dpr);
    }
    this.surfaceExperience.setActive(true);

    // GEMINI civilization — built once with the surface experience group
    if (this.surfaceCivilization && !this.civil && this.surfaceExperience) {
      this.civil = new GeminiCivilization(planet.config, this.surfaceExperience.group, (dir) =>
        this.surfaceExperience!.sampleTerrainRadiusAt(
          dir,
          this.surfaceExperience!.getTerrainScale()
        )
      );
      soundSynthesizer.cityAmbience(0.7);
    }

    // Hide everything the surface sky replaces
    galaxy.particles.points.visible = false;
    if (galaxy.energyJets) galaxy.energyJets.points.visible = false;
    this.nebula.points.visible = false;
    this.starfield.points.visible = false;
    this.foregroundDust.points.visible = false;
    sys.setSurfaceMode(true);
    planet.setSurfaceMode(true);

    this.updateControlsScale();

    // Dive from current orbit down to just above the cloud deck. On GEMINI
    // the descent is retargeted toward the capital so the first thing the
    // visitor sees is the city rising over the curve of the world.
    const planetPos = new THREE.Vector3();
    planet.group.getWorldPosition(planetPos);
    let landDir = new THREE.Vector3().copy(this.camera.position).sub(planetPos);
    if (landDir.lengthSq() < 0.0001) landDir.set(0, 0.25, 1);
    landDir.normalize();
    if (this.surfaceCivilization) {
      landDir.copy(getCapitalCityDir(planet.config)).transformDirection(planet.axialGroup.matrixWorld);
    }
    const targetPos = planetPos.clone().addScaledVector(landDir, planet.config.radius * 1.12);
    this.startCameraTransition(targetPos, planetPos, 3.4);
    this.emitUniverseState();
  }

  public exitSurface() {
    if (!this.isOnSurface) return;

    this.isOnSurface = false;
    this.surfaceRadius = 0;
    this.surfaceGravity = 0;
    this.surfaceJumpVelocity = 0;
    this.surfaceVerticalVelocity = 0;
    this.surfaceAltitude = 0;
    this.surfaceCivilization = false;
    this.humanScale = false;
    this.surfaceCameraHeightFraction = 0.02;
    this.surfaceWalkSpeed = 0;
    this.interactionTarget = null;
    this.dialogueActive = false;
    this.dialogueIndex = 0;
    this.dialogueLines = [];
    this.dialogueTargetId = null;
    if (this.civil) {
      this.civil.dispose();
      this.civil = null;
    }
    soundSynthesizer.cityAmbience(0);
    if (this.surfaceExperience) this.surfaceExperience.setActive(false);

    const galaxy = this.getActiveGalaxy();
    if (galaxy) {
      galaxy.particles.points.visible = true;
      if (galaxy.energyJets) galaxy.energyJets.points.visible = true;
    }
    this.nebula.points.visible = true;
    this.starfield.points.visible = true;
    this.foregroundDust.points.visible = true;

    if (galaxy?.starSystems && this.activeSystemId) {
      const sys = galaxy.starSystems.getSystem(this.activeSystemId);
      if (sys) {
        sys.setSurfaceMode(false);
        if (this.activePlanetId) {
          const planet = sys.planets.find((p) => p.config.id === this.activePlanetId);
          planet?.setSurfaceMode(false);
        }
      }
    }

    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    const planetWorldPos = new THREE.Vector3();
    if (galaxy?.starSystems && this.activeSystemId && this.activePlanetId) {
      const sys = galaxy.starSystems.getSystem(this.activeSystemId);
      const p = sys?.getPlanetPositionWorld(this.activePlanetId);
      if (p) planetWorldPos.copy(p);
    }
    const targetPos = planetWorldPos.clone().add(this.planetCamOffset);
    this.startCameraTransition(targetPos, planetWorldPos, 1.6);
    this.emitUniverseState();
  }

  // ------------------------------------------------------------------
  // AQUILA — EXTERNAL WORLD HANDOFF
  //
  // The world boundary: the Galaxy Explorer owns orbital/astronomical
  // scale. When the player enters New Hospet, the player is handed off
  // to the external Type-II world with a full arrival state. The return
  // journey hands the player back to orbit above TYPE2-PLANET-001.
  // ------------------------------------------------------------------

  private setExternalWorldState(patch: Partial<ExternalWorldState>) {
    this.externalWorldState = { ...this.externalWorldState, ...patch };
    this.emitUniverseState();
  }

  private resetExternalWorldState() {
    this.externalWorldState = { ...IDLE_EXTERNAL_WORLD_STATE };
    this.externalWorldExitContext.saved = false;
  }

  /**
   * Player selected ENTER NEW HOSPET at the destination boundary.
   * Validates the manifest + current astronomical context, saves the
   * orbit position (for the return journey) and enters the preparing
   * phase. The HUD renders the cinematic transition overlay.
   */
  public beginWorldHandoff(worldId: string, arrivalMode: WorldArrivalMode = 'orbit') {
    if (this.isOnSurface) this.exitSurface();

    const manifest = getWorldManifestByWorldId(worldId);
    if (!manifest) {
      console.error('[WORLD HANDOFF] unknown world id', worldId);
      this.setExternalWorldState({
        status: 'error',
        worldId,
        manifestId: null,
        arrivalMode: null,
        message: 'Destination metadata is missing. (Configuration error.)',
      });
      return;
    }

    if (!isArrivalModeSupported(manifest, arrivalMode)) {
      this.setExternalWorldState({
        status: 'error',
        worldId: manifest.worldId,
        manifestId: manifest.manifestId,
        arrivalMode,
        message: `${manifest.displayName} does not support ${arrivalMode.toUpperCase()} arrival.`,
      });
      return;
    }

    // The player must be at the destination boundary: orbiting the planet
    // of the manifest inside the manifest's galaxy/system.
    const atBoundary =
      this.activeGalaxyId === manifest.galaxyId &&
      this.activeSystemId === manifest.starSystemId &&
      this.activePlanetId === manifest.planetId;

    if (!atBoundary) {
      this.setExternalWorldState({
        status: 'error',
        worldId: manifest.worldId,
        manifestId: manifest.manifestId,
        arrivalMode,
        message: 'Destination out of range — approach the planet first.',
      });
      return;
    }

    // Remember the orbit so the return journey restores the player to the
    // exact astronomical location from which they entered.
    if (!this.externalWorldExitContext.saved) {
      this.externalWorldExitContext.pos.copy(this.camera.position);
      this.externalWorldExitContext.look.copy(this.controls.target);
      this.externalWorldExitContext.saved = true;
    }

    this.setState('CORE_TRANSITION');
    this.setExternalWorldState({
      status: 'preparing',
      worldId: manifest.worldId,
      manifestId: manifest.manifestId,
      arrivalMode,
    });
  }

  /**
   * Full arrival state handed to the external world — WHO arrived, FROM
   * WHERE, IN WHAT STATE, HOW THEY SHOULD ARRIVE.
   */
  public getWorldArrivalState(): WorldArrivalState | null {
    const manifest =
      (this.externalWorldState.manifestId && getWorldManifestByWorldId(this.externalWorldState.worldId ?? '')) ?? null;
    if (!manifest || !this.externalWorldState.arrivalMode) return null;

    const pos = this.camera.position;
    const look = this.controls.target;

    return {
      worldId: manifest.worldId,
      manifestId: manifest.manifestId,
      galaxyId: manifest.galaxyId,
      starSystemId: manifest.starSystemId,
      planetId: manifest.planetId,
      arrivalMode: this.externalWorldState.arrivalMode,
      spacecraftState: {
        position: [pos.x, pos.y, pos.z],
        lookAt: [look.x, look.y, look.z],
        speed: this.timeScale,
      },
      playerState: {
        position: [pos.x, pos.y, pos.z],
        rotation: [this.camera.rotation.x, this.camera.rotation.y, this.camera.rotation.z],
      },
      universeTime: this.accumulatedSimulationTime,
      sourceWorld: 'GALAXY_EXPLORER',
      returnTarget: manifest.returnTarget,
      returnUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '',
    };
  }

  /** Called by the UI once the external world tab was opened successfully. */
  public confirmWorldHandoff() {
    this.setExternalWorldState({ status: 'entered' });
  }

  /** User chose to stay / the world could not be launched. */
  public cancelWorldHandoff() {
    if (this.externalWorldState.status === 'idle') return;
    this.resetExternalWorldState();
    this.setState('EXPLORING');
    this.emitUniverseState();
  }

  /** External world endpoint missing or launch failed — never crash. */
  public setWorldHandoffError(message: string) {
    this.setExternalWorldState({
      status: 'error',
      message,
    });
  }

  /**
   * RETURN JOURNEY — the external world posts a return state back to the
   * Galaxy Explorer (window.opener.postMessage). The player is restored to
   * orbit above TYPE2-PLANET-001 inside AQUILA-TYPE2-SYSTEM.
   */
  public restoreFromWorld(returnState: WorldReturnState) {
    const manifest =
      getWorldManifestByWorldId(returnState.worldId) ??
      (returnState.manifestId ? getWorldManifestByManifestId(returnState.manifestId) : undefined);

    if (!manifest) {
      console.warn('[WORLD HANDOFF] return from unknown world ignored', returnState);
      return;
    }

    if (this.isOnSurface) this.exitSurface();

    this.activeGalaxyId = manifest.galaxyId;
    this.activeSystemId = manifest.starSystemId;
    this.activePlanetId = manifest.planetId;
    this.activeMoonId = null;
    this.detectedSystemId = null;
    this.detectedSystemName = null;
    this.detectedPlanetId = null;
    this.detectedPlanetName = null;
    this.activeCosmicObjectId = null;
    this.detectedCosmicObjectId = null;
    this.detectedCosmicObjectName = null;
    this.isInspectingCore = false;
    this.targetCoreInspection = 0.0;
    this.ic1579ApproachActive = false;
    this.camTransitionQueue = [];
    this.updateControlsScale();
    this.setState('CORE_TRANSITION');

    // Restore to the saved orbit, or fall back to a fresh orbit framing
    // of the Type-II planet.
    if (this.externalWorldExitContext.saved) {
      this.startCameraTransition(
        this.externalWorldExitContext.pos,
        this.externalWorldExitContext.look,
        2.2
      );
    } else {
      const galaxy = this.getActiveGalaxy();
      const sys = galaxy?.starSystems?.getSystem(manifest.starSystemId);
      const planetPos = sys?.getPlanetPositionWorld(manifest.planetId);
      const fallbackPos = planetPos ? planetPos.clone().add(this.planetCamOffset) : new THREE.Vector3(0, 30, 60);
      const fallbackLook = planetPos ?? new THREE.Vector3();
      this.startCameraTransition(fallbackPos, fallbackLook, 2.2);
    }
    this.externalWorldExitContext.saved = false;

    this.setExternalWorldState({
      status: 'returning',
      worldId: manifest.worldId,
      manifestId: manifest.manifestId,
      arrivalMode: returnState.arrivalMode ?? 'orbit',
    });
  }

  /** Called by the engine when the player navigates away mid-handoff. */
  private abortActiveHandoff() {
    if (this.externalWorldState.status !== 'idle' && this.externalWorldState.status !== 'returning') {
      this.resetExternalWorldState();
    }
  }

  private initEventListeners() {
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    window.addEventListener('resize', this.onWindowResize, { passive: true });
    window.addEventListener('orientationchange', this.onOrientationChange, { passive: true });
    window.addEventListener('mousemove', this.onPointerMove, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
      this.resizeObserver.observe(this.container);
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onVisualViewportChange);
      window.visualViewport.addEventListener('scroll', this.onVisualViewportChange);
    }

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

    this.renderer.setSize(width, height);
    this.applyPixelRatio(effectivePixelRatio(this.qualityTier, this.resolutionScale));
    this.postProcessing.setSize(width, height);
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

    // Long-press on the GEMINI surface = contextual interaction (touch
    // equivalent of the E key). Never fires for drags or taps.
    if (elapsed > 450 && deltaX < 12 && deltaY < 12 && this.isOnSurface) {
      this.triggerSurfaceInteract();
      return;
    }

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
    if (this.isOnSurface) return;

    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    const activeGalaxy = this.getActiveGalaxy();

    // 1. If currently inside a Planet, check if user clicked on one of its orbiting moons
    if (this.activePlanetId && this.activeSystemId && activeGalaxy?.starSystems) {
      const sys = activeGalaxy.starSystems.getSystem(this.activeSystemId);
      if (sys) {
        const hitMoon = sys.findIntersectedMoon(ray, this.activePlanetId);
        if (hitMoon) {
          this.enterMoon(this.activeSystemId, this.activePlanetId, hitMoon.moonId);
          return;
        }
      }
    }

    // 2. If currently inside a Star System, check if user clicked on a planet
    if (this.activeSystemId && activeGalaxy?.starSystems) {
      const hitPlanet = activeGalaxy.starSystems.findIntersectedPlanet(ray, this.activeSystemId);
      if (hitPlanet) {
        this.enterPlanet(this.activeSystemId, hitPlanet.planetId);
        return;
      }
    }

    // 3. If inside the active galaxy, check if user clicked directly on a Star System
    if (activeGalaxy?.starSystems && !this.activeSystemId) {
      const hitSys = activeGalaxy.starSystems.findIntersectedSystem(ray);
      if (hitSys) {
        this.enterStarSystem(hitSys.config.id);
        return;
      }
    }

    // 3b. UNIVERSAL phenomena — a direct click on a cosmic object approaches it
    if (!this.activeCosmicObjectId && !this.activeSystemId) {
      const hitCosmic = this.cosmicObjects.getHit(ray);
      if (hitCosmic) {
        this.enterCosmicObject(hitCosmic.id);
        return;
      }
    }

    // 4. Check if user clicked on another distant galaxy in the universe
    for (const [id, galaxy] of this.galaxies.entries()) {
      if (id !== this.activeGalaxyId) {
        const distRayToGalaxy = ray.distanceToPoint(galaxy.worldPosition);
        if (distRayToGalaxy < galaxy.boundingRadius * 0.9) {
          this.navigateToGalaxy(id);
          return;
        }
      }
    }

    // 5. Local energy wave pulse on active galaxy
    const hitPoint = new THREE.Vector3();

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
    if (this.isOnSurface) {
      this.exitSurface();
      return;
    }

    if (this.isInspectingCore) {
      this.exitCoreInspection();
      return;
    }

    if (this.activeMoonId || this.activePlanetId) {
      this.exitStarSystem();
      return;
    }

    const normX = (clientX / window.innerWidth) * 2 - 1;
    const normY = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ray = this.raycaster.ray;

    // Check Star System hit in the active galaxy
    const activeGalaxy = this.getActiveGalaxy();
    if (activeGalaxy?.starSystems && !this.activeSystemId) {
      const hitSys = activeGalaxy.starSystems.findIntersectedSystem(ray);
      if (hitSys) {
        this.enterStarSystem(hitSys.config.id);
        return;
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
    // A direct transition supersedes any chained (approach) flight.
    this.camTransitionQueue = [];
    this.isTransitioningCamera = true;
    this.camTransitionStartPos.copy(this.camera.position);
    this.camTransitionTargetPos.copy(targetPos);
    this.camTransitionStartLook.copy(this.controls.target);
    this.camTransitionTargetLook.copy(targetLook);
    this.camTransitionProgress = 0.0;
    this.camTransitionDuration = duration;
  }

  private queueCameraTransition(targetPos: THREE.Vector3, targetLook: THREE.Vector3, duration: number) {
    this.camTransitionQueue.push({
      targetPos: targetPos.clone(),
      targetLook: targetLook.clone(),
      duration,
    });
  }

  private beginNextQueuedTransition() {
    const next = this.camTransitionQueue.shift();
    if (!next) {
      this.ic1579ApproachActive = false;
      return;
    }
    this.isTransitioningCamera = true;
    this.camTransitionStartPos.copy(this.camera.position);
    this.camTransitionTargetPos.copy(next.targetPos);
    this.camTransitionStartLook.copy(this.controls.target);
    this.camTransitionTargetLook.copy(next.targetLook);
    this.camTransitionProgress = 0.0;
    this.camTransitionDuration = next.duration;
  }

  public resetCamera() {
    if (this.activeCosmicObjectId) {
      this.exitCosmicObject();
      return;
    }

    const active = this.getActiveGalaxy();
    if (!active) return;

    if (this.isInspectingCore) {
      this.isInspectingCore = false;
      this.targetCoreInspection = 0.0;
    }
    this.activeSystemId = null;
    this.activePlanetId = null;
    this.activeMoonId = null;
    this.updateControlsScale();
    this.setState('RETURNING');

    if (active.config.id === this.ic1579GalaxyId) {
      // Reverse of the entry sequence: leave the galaxy, then return to
      // the AETHER vantage. The user watches IC 1579 recede into a distant
      // structure and the empty cosmic space reopen around them.
      const center = active.worldPosition;
      const approachDir = new THREE.Vector3(0.35, 0.3, 1).normalize();
      const dist = this.camera.position.distanceTo(center);

      this.ic1579ApproachActive = true;

      if (dist > 175) {
        // Already outside the galaxy — fly straight back to AETHER.
        this.startCameraTransition(this.aetherVantagePos, this.aetherVantageLook, 2.4);
      } else {
        const leavePos = center.clone().addScaledVector(approachDir, 175);
        const leaveLook = center.clone();
        const flightDist = this.camera.position.distanceTo(leavePos);
        const flightDuration = Math.min(Math.max(flightDist * 0.005, 1.2), 2.4);
        this.startCameraTransition(leavePos, leaveLook, flightDuration);
        this.queueCameraTransition(this.aetherVantagePos, this.aetherVantageLook, 3.0);
      }
      return;
    }

    const targetPos = new THREE.Vector3().copy(active.worldPosition).add(this.defaultCamOffset);
    const targetLook = new THREE.Vector3().copy(active.worldPosition).add(this.defaultLookOffset);
    this.startCameraTransition(targetPos, targetLook, 0.9);
  }

  private onKeyDown(e: KeyboardEvent) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    const moveKey = e.key.toLowerCase();
    if (
      moveKey === 'w' || moveKey === 'a' || moveKey === 's' || moveKey === 'd' ||
      moveKey === 'arrowup' || moveKey === 'arrowdown' ||
      moveKey === 'arrowleft' || moveKey === 'arrowright'
    ) {
      this.surfaceMoveKeys.add(moveKey);
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape') {
      if (this.externalWorldState.status === 'preparing' || this.externalWorldState.status === 'launching' || this.externalWorldState.status === 'error') {
        this.cancelWorldHandoff();
      } else if (this.isOnSurface && this.dialogueActive) {
        this.closeDialogue();
      } else if (this.isOnSurface) {
        this.exitSurface();
      } else if (this.activeMoonId || this.activePlanetId || this.activeSystemId) {
        this.exitStarSystem();
      } else if (this.activeCosmicObjectId) {
        this.exitCosmicObject();
      }
    } else if (e.key === 'e' || e.key === 'E') {
      if (this.isOnSurface && this.civil && this.surfaceCivilization) {
        e.preventDefault();
        if (this.dialogueActive) {
          this.advanceDialogue();
        } else if (this.interactionTarget) {
          this.beginDialogue(this.interactionTarget);
        }
      }
    } else if (e.key === 'r' || e.key === 'R') {
      if (this.isOnSurface) {
        this.exitSurface();
      } else {
        this.resetCamera();
      }
    } else if (e.key === 'c' || e.key === 'C') {
      if (!this.isOnSurface) {
        this.toggleCoreInspection();
      }
    } else if (e.key === ' ' || e.code === 'Space') {
      if (this.isOnSurface && this.surfaceGravity > 0 && this.surfaceAltitude <= (this.humanScale ? 0.0002 : 0.001) && !this.isTransitioningCamera) {
        // Low-gravity leap (GEMINI) — Space doubles as the jump key while
        // standing on a moon-gravity world.
        e.preventDefault();
        this.surfaceVerticalVelocity = this.surfaceJumpVelocity;
      } else {
        // Toggle observation slow-motion
        this.setTimeScale(this.timeScale === 1.0 ? 0.25 : 1.0);
      }
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

  private onKeyUp(e: KeyboardEvent) {
    this.surfaceMoveKeys.delete(e.key.toLowerCase());
  }

  public setPreset(preset: GalaxyPreset) {
    this.galaxies.forEach((g) => g.applyPreset(preset));
  }

  public setQualityTier(tier: QualityTier) {
    this.qualityTier = tier;
    this.resolutionScale = 1.0;
    this.lowFpsTimer = 0;
    this.highFpsTimer = 0;
    const config = getQualityConfigForTier(tier);

    this.applyPixelRatio(effectivePixelRatio(tier, 1.0));
    this.galaxies.forEach((g) => {
      g.setPixelRatio(config.dpr);
      g.rebuild(config.particleCount);
    });

    this.nebula.setPixelRatio(config.dpr);
    this.starfield.setPixelRatio(config.dpr);
    this.foregroundDust.setPixelRatio(config.dpr);
    this.cosmicWeb.setPixelRatio(config.dpr);

    this.nebula.rebuild(config.nebulaCount);
    this.starfield.rebuild(config.starCount);
    this.foregroundDust.rebuild(config.foregroundDustCount);

    this.cosmicObjects.setQualityTier(tier);
    this.cosmicObjects.setPixelRatio(config.dpr);

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
    total += this.cosmicWeb.points.geometry.attributes.position ? this.cosmicWeb.points.geometry.attributes.position.count : 0;
    total += this.cosmicObjects.getParticleCount();
    if (this.civil) total += this.civil.getParticleCount();
    return total;
  }

  public triggerEntrance() {
    this.entranceProgress = 0.0;
    this.isEntranceComplete = false;
    this.setState('CINEMATIC');
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const rawDelta = Math.min(this.clock.getDelta(), 0.1);
    const simDelta = rawDelta * this.timeScale;
    this.accumulatedSimulationTime += simDelta;
    const elapsedTime = this.accumulatedSimulationTime;

    // 1. Entrance Progression
    if (!this.isEntranceComplete) {
      this.entranceProgress += rawDelta * 0.45;
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
      this.pulseElapsed += rawDelta;
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
    this.coreInspectionFactor += (this.targetCoreInspection - this.coreInspectionFactor) * (rawDelta * 3.5);

    // 5. Cinematic Camera Transitions & Dynamic Tracking
    if (this.isTransitioningCamera) {
      this.camTransitionProgress += rawDelta / this.camTransitionDuration;
      const t = Math.min(this.camTransitionProgress, 1.0);
      const ease = 1.0 - Math.pow(1.0 - t, 3.0);

      this.camera.position.lerpVectors(this.camTransitionStartPos, this.camTransitionTargetPos, ease);
      this.controls.target.lerpVectors(this.camTransitionStartLook, this.camTransitionTargetLook, ease);

      if (t >= 1.0) {
        if (this.camTransitionQueue.length > 0) {
          this.beginNextQueuedTransition();
        } else {
          this.isTransitioningCamera = false;
          this.ic1579ApproachActive = false;

          // Returned from IC 1579 to the AETHER vantage — the cosmic
          // overview re-anchors on Aether Prime.
          if (
            this.activeGalaxyId === this.ic1579GalaxyId &&
            this.camera.position.distanceTo(this.aetherVantagePos) < 30
          ) {
            this.activeGalaxyId = 'galaxy01';
            this.updateControlsScale();
          }

          // WORLD RETURN — the spacecraft settled back in orbit above the
          // Type-II planet; the handoff overlay resolves to the live HUD.
          if (this.externalWorldState.status === 'returning') {
            this.resetExternalWorldState();
          }

          this.setState(this.isInspectingCore ? 'CORE_INSPECTION' : 'EXPLORING');
          this.emitUniverseState();
        }
      }
    } else if (this.isOnSurface && this.activePlanetId && this.activeSystemId) {
      // Surface mode: keep the camera glued to the planet's position
      const surfaceGalaxy = this.getActiveGalaxy();
      if (surfaceGalaxy?.starSystems) {
        const sys = surfaceGalaxy.starSystems.getSystem(this.activeSystemId);
        if (sys) {
          const currentPlanetPos = sys.getPlanetPositionWorld(this.activePlanetId);
          if (currentPlanetPos) {
            const lookOffset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            this.controls.target.copy(currentPlanetPos);
            this.camera.position.copy(currentPlanetPos).add(lookOffset);
          }
        }
      }
    } else if (this.activeMoonId && this.activePlanetId && this.activeSystemId) {
      // Dynamic camera tracking for moving moon
      const trackingGalaxy = this.getActiveGalaxy();
      if (trackingGalaxy?.starSystems) {
        const sys = trackingGalaxy.starSystems.getSystem(this.activeSystemId);
        if (sys) {
          const currentMoonPos = sys.getMoonPositionWorld(this.activePlanetId, this.activeMoonId);
          if (currentMoonPos) {
            const lookOffset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            this.controls.target.copy(currentMoonPos);
            this.camera.position.copy(currentMoonPos).add(lookOffset);
          }
        }
      }
    } else if (this.activePlanetId && this.activeSystemId) {
      // Dynamic camera tracking for moving planet
      const trackingGalaxy = this.getActiveGalaxy();
      if (trackingGalaxy?.starSystems) {
        const sys = trackingGalaxy.starSystems.getSystem(this.activeSystemId);
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

    // 6. Camera Gravitational Attraction, Frame Dragging & Safety Boundary Near Black Hole
    const activeGalaxy = this.getActiveGalaxy();
    if (activeGalaxy && activeGalaxy.config.hasBlackHole && !this.isTransitioningCamera && !this.isOnSurface) {
      const distToBH = this.camera.position.distanceTo(activeGalaxy.worldPosition);
      
      if (distToBH < 32.0 && distToBH > this.blackHoleSafetyRadius) {
        const pullDir = new THREE.Vector3().subVectors(activeGalaxy.worldPosition, this.camera.position).normalize();
        const normDist = 1.0 - (distToBH / 32.0);
        const gravityStrength = Math.pow(normDist, 1.6) * 0.024;
        
        // Tangential orbital frame-dragging (spacetime swirl during close fly-bys)
        const tangentDir = new THREE.Vector3().crossVectors(pullDir, this.camera.up).normalize();
        const rotSpeed = activeGalaxy.config.blackHoleConfig?.rotationSpeed || 2.0;
        const dragStrength = Math.pow(normDist, 2.0) * 0.009 * (rotSpeed / 2.0);

        this.camera.position.addScaledVector(pullDir, gravityStrength);
        this.camera.position.addScaledVector(tangentDir, dragStrength);
      }

      if (distToBH < this.blackHoleSafetyRadius) {
        const pushDir = new THREE.Vector3().subVectors(this.camera.position, activeGalaxy.worldPosition).normalize();
        this.camera.position.copy(activeGalaxy.worldPosition).addScaledVector(pushDir, this.blackHoleSafetyRadius);
      }
    }

    // 6c. Surface free-camera walk — the visitor moves across the world.
    if (this.isOnSurface && this.surfaceExperience && this.surfaceRadius > 0 && !this.isTransitioningCamera) {
      const walkGalaxy = this.getActiveGalaxy();
      const walkSys = walkGalaxy?.starSystems?.getSystem(this.activeSystemId || '');
      const walkPlanet = walkSys?.planets.find((p) => p.config.id === this.activePlanetId);
      if (walkPlanet) {
        walkPlanet.group.getWorldPosition(this.tmpPlanetPos);
        const upDir = this.tmpSurfaceDir.copy(this.camera.position).sub(this.tmpPlanetPos).normalize();
        this.camera.up.copy(upDir);

        if (this.surfaceMoveKeys.size > 0 || this.surfaceStick.lengthSq() > 0.01) {
          const fwd = this.camera.getWorldDirection(this.tmpPlanetLocalDir);
          fwd.addScaledVector(upDir, -fwd.dot(upDir));
          if (fwd.lengthSq() < 0.0001) fwd.set(0, 0, -1);
          fwd.normalize();
          const right = this.tmpSurfaceRight.crossVectors(upDir, fwd);
          const move = this.tmpSurfaceMove.set(0, 0, 0);
          if (this.surfaceMoveKeys.has('w') || this.surfaceMoveKeys.has('arrowup')) move.add(fwd);
          if (this.surfaceMoveKeys.has('s') || this.surfaceMoveKeys.has('arrowdown')) move.sub(fwd);
          if (this.surfaceMoveKeys.has('d') || this.surfaceMoveKeys.has('arrowright')) move.add(right);
          if (this.surfaceMoveKeys.has('a') || this.surfaceMoveKeys.has('arrowleft')) move.sub(right);
          if (this.surfaceStick.lengthSq() > 0.01) {
            move.addScaledVector(fwd, -this.surfaceStick.y);
            move.addScaledVector(right, this.surfaceStick.x);
          }
          if (move.lengthSq() > 0) {
            // Human-scale worlds walk in meters per second; legacy worlds
            // keep the fast planet-radii stroll.
            const walkSpeed = this.humanScale && this.surfaceWalkSpeed > 0
              ? this.surfaceWalkSpeed
              : this.surfaceRadius * 1.5;
            move.normalize().multiplyScalar(walkSpeed * rawDelta);
            this.controls.target.add(move);
          }
        }
      }
    }

    // 7. Update OrbitControls
    this.controls.update();

    // 7a. Surface terrain-following clamp — never walk through mountains.
    if (this.isOnSurface && this.surfaceExperience && this.surfaceRadius > 0) {
      const clampGalaxy = this.getActiveGalaxy();
      const clampSys = clampGalaxy?.starSystems?.getSystem(this.activeSystemId || '');
      const clampPlanet = clampSys?.planets.find((p) => p.config.id === this.activePlanetId);
      if (clampPlanet) {
        clampPlanet.group.getWorldPosition(this.tmpPlanetPos);
        const camLocal = this.tmpCamLocal.copy(this.camera.position).sub(this.tmpPlanetPos);
        const dist = camLocal.length();
        const dir = camLocal.normalize();
        this.tmpPlanetLocalDir.copy(dir);
        this.surfaceExperience.group.worldToLocal(this.tmpPlanetLocalDir);
        const terrainR = this.surfaceExperience.sampleTerrainRadiusAt(
          this.tmpPlanetLocalDir,
          this.surfaceExperience.getTerrainScale()
        );
        const minDist = Math.max(
          terrainR + this.surfaceRadius * this.surfaceCameraHeightFraction,
          this.humanScale ? 0 : this.surfaceRadius * 1.02
        );
        if (dist < minDist) {
          this.tmpClampedPos.copy(this.tmpPlanetPos).addScaledVector(dir, minDist);
          this.controls.target.add(this.tmpClampedPos.clone().sub(this.camera.position));
          this.camera.position.copy(this.tmpClampedPos);
        }
      }
    }

    // 7b. GEMINI low-gravity jump physics — moon gravity (≈1.62 m/s²):
    // the visitor leaves the ground, floats, and settles back slowly.
    if (this.isOnSurface && this.surfaceGravity > 0 && this.surfaceExperience && this.surfaceRadius > 0) {
      const gravGalaxy = this.getActiveGalaxy();
      const gravSys = gravGalaxy?.starSystems?.getSystem(this.activeSystemId || '');
      const gravPlanet = gravSys?.planets.find((p) => p.config.id === this.activePlanetId);
      if (gravPlanet) {
        gravPlanet.group.getWorldPosition(this.tmpPlanetPos);
        const upDir = this.tmpSurfaceDir.copy(this.camera.position).sub(this.tmpPlanetPos).normalize();
        this.surfaceVerticalVelocity -= this.surfaceGravity * rawDelta;
        this.surfaceAltitude += this.surfaceVerticalVelocity * rawDelta;
        if (this.surfaceAltitude <= 0.0 && this.surfaceVerticalVelocity <= 0.0) {
          this.surfaceAltitude = 0.0;
          this.surfaceVerticalVelocity = 0.0;
        }
        if (this.surfaceAltitude > 0.0) {
          const lift = this.tmpClampedPos.copy(upDir).multiplyScalar(this.surfaceAltitude * this.surfaceRadius);
          this.controls.target.add(lift);
          this.camera.position.add(lift);
        }
      }
    }

    // 7c. AETHER ↔ IC 1579 separation dynamics
    const ic1579Galaxy = this.galaxies.get(this.ic1579GalaxyId);
    const distToIC1579 = ic1579Galaxy
      ? this.camera.position.distanceTo(ic1579Galaxy.worldPosition)
      : Infinity;
    const targetPresence = 1.0 - THREE.MathUtils.smoothstep(260.0, 80.0, distToIC1579);
    this.ic1579Presence += (targetPresence - this.ic1579Presence) * 0.04;

    // Gradual color transition: deep blue-black (AETHER) → dark teal-black
    // (inside IC 1579). Not a filter — a subtle environmental shift.
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background
        .copy(this.aetherBackground)
        .lerp(this.ic1579Background, this.ic1579Presence);
    }

    // Proximity-driven density: from AETHER, IC 1579 reads as a faint
    // distant structure; crossing its boundary swells it to full density.
    if (ic1579Galaxy) {
      ic1579Galaxy.particles.setIntensity(0.3 + 0.7 * this.ic1579Presence);
    }

    // Environment dimming per navigation mode — the galaxy owns the scene
    // once the camera is inside, while AETHER stays dark and quiet.
    const navMode = this.computeNavigationMode();
    this.navigationMode = navMode;
    let envTarget: { nebula: number; starfield: number; dust: number; web: number };
    switch (navMode) {
      case 'IC1579_APPROACH':
        envTarget = { nebula: 0.35, starfield: 0.55, dust: 0.3, web: 0.45 };
        break;
      case 'IC1579_GALAXY':
        envTarget = { nebula: 0.3, starfield: 0.5, dust: 0.25, web: 0.4 };
        break;
      case 'IC1579_STELLAR':
        envTarget = { nebula: 0.22, starfield: 0.4, dust: 0.2, web: 0.3 };
        break;
      case 'IC1579_SYSTEM':
        envTarget = { nebula: 0.16, starfield: 0.3, dust: 0.14, web: 0.22 };
        break;
      case 'IC1579_PLANET':
      case 'IC1579_SURFACE':
        envTarget = { nebula: 0.12, starfield: 0.2, dust: 0.1, web: 0.15 };
        break;
      case 'AETHER':
      default:
        envTarget = { nebula: 0.5, starfield: 0.65, dust: 0.4, web: 0.5 };
        break;
    }
    this.envIntensity.nebula += (envTarget.nebula - this.envIntensity.nebula) * 0.05;
    this.envIntensity.starfield += (envTarget.starfield - this.envIntensity.starfield) * 0.05;
    this.envIntensity.dust += (envTarget.dust - this.envIntensity.dust) * 0.05;
    this.envIntensity.web += (envTarget.web - this.envIntensity.web) * 0.05;
    this.nebula.setIntensity(this.envIntensity.nebula);
    this.starfield.setIntensity(this.envIntensity.starfield);
    this.foregroundDust.setIntensity(this.envIntensity.dust);
    this.cosmicWeb.setIntensity(this.envIntensity.web);

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

    // 9. Surface Experience Per-Frame Updates (Aurelia deep exploration)
    if (this.isOnSurface && this.surfaceExperience && this.activeSystemId && this.activePlanetId) {
      const surfaceGalaxy = this.getActiveGalaxy();
      const surfaceSys = surfaceGalaxy?.starSystems?.getSystem(this.activeSystemId);
      const surfacePlanet = surfaceSys?.planets.find((p) => p.config.id === this.activePlanetId);
      if (surfaceSys && surfacePlanet) {
        const starWorldPos = surfaceSys.starMesh.group.getWorldPosition(new THREE.Vector3());
        this.surfaceExperience.update(effectiveTime, this.camera, starWorldPos);

        // Crossfade the procedural planet shell out as we drop below the clouds
        const camLocal = this.tmpCamLocal.copy(this.camera.position);
        surfacePlanet.group.worldToLocal(camLocal);
        const camDistR = camLocal.length() / surfacePlanet.config.radius;
        surfacePlanet.setSurfaceBlend(camDistR);

        // Terrain rises out of the shell as we approach (masks the swap)
        const terrainFade = THREE.MathUtils.smoothstep(2.2, 1.15, camDistR);
        this.surfaceExperience.setTerrainScale(0.78 + 0.22 * terrainFade);

        // GEMINI living world: animate the city, keep the visitor out of
        // building footprints, and raycast the nearest interactable.
        if (this.civil) {
          this.civil.update(
            effectiveTime,
            rawDelta,
            this.surfaceExperience.getNightFactor(),
            this.camera
          );
          this.civil.worldToCity(this.camera.position, this.tmpPlanetLocalDir);
          this.civil.collidePlayer(this.tmpPlanetLocalDir);
          this.civil.cityToWorld(this.tmpPlanetLocalDir, this.tmpClampedPos);
          this.controls.target.add(this.tmpClampedPos.clone().sub(this.camera.position));
          this.camera.position.copy(this.tmpClampedPos);

          if (this.dialogueActive && this.dialogueTargetId) {
            this.interactionTarget = this.civil.getInteractable(this.dialogueTargetId);
          } else {
            this.tmpInteractionDir.copy(this.camera.getWorldDirection(this.tmpInteractionDir));
            this.interactionTarget = this.civil.raycast(
              this.camera.position,
              this.tmpInteractionDir,
              3.2
            );
          }
        }
      }
    }

    // 10. Proximity Detection for Star Systems in the active galaxy
    if (!this.activeSystemId && !this.isOnSurface && !this.isTransitioningCamera) {
      const proxGalaxy = this.getActiveGalaxy();
      if (proxGalaxy?.starSystems) {
        const closest = proxGalaxy.starSystems.getClosestSystem(this.camera.position);
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

    // 10b. Proximity Detection for Habitable Worlds inside the active system
    // (surface-explorable worlds AND external-world destination planets)
    if (this.activeSystemId && !this.activePlanetId && !this.isOnSurface && !this.isTransitioningCamera) {
      const proxGalaxy = this.getActiveGalaxy();
      const proxSys = proxGalaxy?.starSystems?.getSystem(this.activeSystemId);
      if (proxGalaxy?.starSystems && proxSys) {
        let closestPlanetId: string | null = null;
        let closestPlanetName: string | null = null;
        let closestDist = Infinity;
        const pPos = new THREE.Vector3();
        for (const planet of proxSys.planets) {
          if (!planet.config.surfaceExplore && !planet.config.externalWorldId) continue;
          planet.group.getWorldPosition(pPos);
          const dist = this.camera.position.distanceTo(pPos);
          const detectRadius = Math.max(planet.config.radius * 18.0, 0.7);
          if (dist < detectRadius && dist < closestDist) {
            closestDist = dist;
            closestPlanetId = planet.config.id;
            closestPlanetName = planet.config.name;
          }
        }
        if (closestPlanetId && this.detectedPlanetId !== closestPlanetId) {
          this.detectedPlanetId = closestPlanetId;
          this.detectedPlanetName = closestPlanetName;
          this.emitUniverseState();
        } else if (!closestPlanetId && this.detectedPlanetId !== null) {
          this.detectedPlanetId = null;
          this.detectedPlanetName = null;
          this.emitUniverseState();
        }
      }
    }

    // 10c. Proximity Detection for UNIVERSAL cosmic phenomena
    if (
      !this.activeCosmicObjectId &&
      !this.activeSystemId &&
      !this.activePlanetId &&
      !this.activeMoonId &&
      !this.isOnSurface &&
      !this.isTransitioningCamera
    ) {
      const closestCosmic = this.cosmicObjects.getClosestDetected(this.camera.position);
      if (closestCosmic && this.detectedCosmicObjectId !== closestCosmic.config.id) {
        this.detectedCosmicObjectId = closestCosmic.config.id;
        this.detectedCosmicObjectName = closestCosmic.config.name;
        this.emitUniverseState();
      } else if (!closestCosmic && this.detectedCosmicObjectId !== null) {
        this.detectedCosmicObjectId = null;
        this.detectedCosmicObjectName = null;
        this.emitUniverseState();
      }
    }

    // 10. Update Environment Subsystems
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);
    this.foregroundDust.update(effectiveTime, this.entranceProgress);
    this.cosmicWeb.update(effectiveTime, 1.0);

    // 10d. UNIVERSAL phenomena — continuous events (merger cycle, pulsar
    // sweep) + distance-based LOD intensities.
    this.cosmicObjects.update(effectiveTime, rawDelta, this.camera.position);

    // Subtle proximity audio: the pulsar ticks when observed up close.
    if (this.activeCosmicObjectId === 'pulsar-x9') {
      const pulsar = this.cosmicObjects.getObject('pulsar-x9');
      if (pulsar && this.camera.position.distanceTo(pulsar.group.position) < 26.0) {
        const now = performance.now();
        if (now - this.lastPulsarTickTime > 420) {
          this.lastPulsarTickTime = now;
          this.synthesizerPulsarTick();
        }
      }
    }

    // 11. Update Relativistic Gravitational Lensing in Post-Processing
    if (activeGalaxy && activeGalaxy.config.hasBlackHole && activeGalaxy.config.blackHoleConfig) {
      const distToBH = this.camera.position.distanceTo(activeGalaxy.worldPosition);
      
      this.projectedScreenPos.copy(activeGalaxy.worldPosition).project(this.camera);
      const isVisible = this.projectedScreenPos.z < 1.0;

      if (isVisible && distToBH < 72.0) {
        this.screenLensPos.set(
          (this.projectedScreenPos.x + 1.0) * 0.5,
          (this.projectedScreenPos.y + 1.0) * 0.5
        );
        const lensRadius = (activeGalaxy.config.blackHoleConfig.lensingStrength / Math.max(distToBH, 2.5)) * 0.22;
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

      // Adaptive dynamic resolution — sustained low FPS steps the internal
      // pixel ratio down (floored at 0.65); sustained headroom recovers it
      // slowly. Hysteresis prevents quality oscillation.
      this.fpsEma = this.fpsEma * 0.7 + this.currentFps * 0.3;
      if (this.fpsEma < 30 && !this.isTransitioningCamera) {
        this.lowFpsTimer += 0.5;
        this.highFpsTimer = 0;
        if (this.lowFpsTimer >= 2.0) {
          this.lowFpsTimer = 0;
          this.setResolutionScale(this.resolutionScale - 0.1);
        }
      } else {
        this.lowFpsTimer = 0;
      }
      if (this.fpsEma > 55 && this.resolutionScale < 1.0) {
        this.highFpsTimer += 0.5;
        if (this.highFpsTimer >= 5.0) {
          this.highFpsTimer = 0;
          this.setResolutionScale(this.resolutionScale + 0.05);
        }
      } else {
        this.highFpsTimer = 0;
      }

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
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onVisualViewportChange);
      window.visualViewport.removeEventListener('scroll', this.onVisualViewportChange);
    }

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('dblclick', this.onDoubleClick);

    this.controls.dispose();
    this.galaxies.forEach((g) => g.dispose());
    this.galaxies.clear();
    this.surfaceExperience?.dispose();
    this.surfaceExperience = null;
    this.civil?.dispose();
    this.civil = null;
    this.nebula.dispose();
    this.starfield.dispose();
    this.foregroundDust.dispose();
    this.cosmicWeb.dispose();
    this.cosmicObjects.dispose();
    this.postProcessing.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
