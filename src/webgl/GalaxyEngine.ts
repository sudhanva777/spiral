import * as THREE from 'three';
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

  private galaxy: GalaxyParticles;
  private nebula: NebulaParticles;
  private starfield: StarfieldParticles;

  private qualityTier: QualityTier;
  private particleCount: number;

  // Interaction State
  private mouse2D = new THREE.Vector2(0, 0);
  private targetMouse2D = new THREE.Vector2(0, 0);
  private mouse3D = new THREE.Vector3(0, 0, 0);
  private raycaster = new THREE.Raycaster();
  private interactionPlane: THREE.Plane;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Camera Orbit & Parallax
  private cameraBasePos = new THREE.Vector3(0, 22, 38);
  private cameraTargetPos = new THREE.Vector3(0, 22, 38);
  private cameraLookTarget = new THREE.Vector3(0, -1.0, 0);
  private orbitAngleX = 0;
  private orbitAngleY = 0;
  private targetOrbitX = 0;
  private targetOrbitY = 0;
  private zoomDistance = 44.0;
  private targetZoomDistance = 44.0;

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

    // 2. Camera Setup (Perspective, slightly tilted above and to the side)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraLookTarget);

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

    // 7. Event Listeners
    this.initEventListeners();

    // 8. Start Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private initEventListeners() {
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    window.addEventListener('resize', this.onWindowResize, { passive: true });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mousedown', this.onMouseDown, { passive: true });
    window.addEventListener('mouseup', this.onMouseUp, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: false });

    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
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

  private onMouseMove(e: MouseEvent) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetMouse2D.set(x, y);

    if (this.isMouseDown) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.targetOrbitX += deltaX * 0.005;
      this.targetOrbitY = Math.max(-0.6, Math.min(0.6, this.targetOrbitY + deltaY * 0.005));
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseDown(e: MouseEvent) {
    // Only track left click for rotation
    if (e.button === 0) {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp() {
    this.isMouseDown = false;
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.02;
    this.targetZoomDistance = Math.max(18.0, Math.min(75.0, this.targetZoomDistance + zoomDelta));
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isMouseDown = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      const x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      const y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      this.targetMouse2D.set(x, y);
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && this.isMouseDown) {
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;
      this.targetOrbitX += deltaX * 0.006;
      this.targetOrbitY = Math.max(-0.6, Math.min(0.6, this.targetOrbitY + deltaY * 0.006));
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd() {
    this.isMouseDown = false;
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

    // 2. Smooth Mouse Interpolation (Lerp & Damping)
    this.mouse2D.lerp(this.targetMouse2D, 0.06);

    // 3. Project 2D Mouse onto 3D Interaction Plane for Gravitational Well
    this.raycaster.setFromCamera(this.mouse2D, this.camera);
    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.interactionPlane, intersectionPoint)) {
      this.mouse3D.lerp(intersectionPoint, 0.08);
    }

    // 4. Smooth Camera Orbit, Drift & Parallax
    this.orbitAngleX += (this.targetOrbitX - this.orbitAngleX) * 0.05;
    this.orbitAngleY += (this.targetOrbitY - this.orbitAngleY) * 0.05;
    this.zoomDistance += (this.targetZoomDistance - this.zoomDistance) * 0.06;

    // Ultra-slow ambient camera drift
    const driftAngle = elapsedTime * 0.04;
    const parallaxX = this.mouse2D.x * 3.5;
    const parallaxY = this.mouse2D.y * 2.2;

    const currentRadius = this.zoomDistance;
    const elevation = 16.0 + this.orbitAngleY * 18.0 + parallaxY;
    const horizontalAngle = driftAngle + this.orbitAngleX + parallaxX * 0.15;

    this.cameraTargetPos.set(
      Math.sin(horizontalAngle) * currentRadius,
      Math.max(4.0, elevation),
      Math.cos(horizontalAngle) * currentRadius
    );

    this.camera.position.lerp(this.cameraTargetPos, 0.05);
    this.camera.lookAt(this.cameraLookTarget);

    // 5. Update Particle Subsystems
    const effectiveTime = this.prefersReducedMotion ? elapsedTime * 0.2 : elapsedTime;
    this.galaxy.update(effectiveTime, this.mouse3D, this.entranceProgress, 0.6);
    this.nebula.update(effectiveTime, this.entranceProgress);
    this.starfield.update(effectiveTime, this.entranceProgress);

    // 6. Render Post-Processing Pipeline
    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 7. FPS Telemetry Calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.statsCallback) {
        this.statsCallback({
          fps: this.currentFps,
          particleCount: this.particleCount,
          drawCalls: this.renderer.info.render.calls,
          tier: this.qualityTier,
          mouseNormalized: { x: this.mouse2D.x, y: this.mouse2D.y },
          cameraDistance: Math.round(this.zoomDistance),
        });
      }
    }
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

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
