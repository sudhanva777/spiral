import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  Activity,
  Compass,
  Info,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Crosshair,
  Globe2,
  Sun,
  Radio,
  ArrowLeft,
  Moon,
  Disc,
  Play,
  Pause,
} from 'lucide-react';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { UniverseState } from '../types/universe';
import { UNIVERSE_GALAXIES, getGalaxyConfigById } from '../webgl/galaxies/registry';
import { PRIME_GALAXY_STAR_SYSTEMS, getStarSystemById } from '../webgl/starsystems/starSystemRegistry';
import { soundSynthesizer } from './SoundSynthesizer';

export const GALAXY_PRESETS: GalaxyPreset[] = [
  {
    id: 'hypernova',
    name: 'Hypernova Core',
    subtitle: 'High-Energy Accretion Vortex',
    description: 'Energetic peach-magenta plasma stream with dense Keplerian nucleus.',
    speed: 0.32,
    spiralTightness: 3.4,
    turbulence: 0.85,
    coreDensity: 1.2,
    colorScheme: 'hypernova',
    coreGlowSize: 1.2,
    gravityStrength: 0.7,
    tiltAngle: 0.15,
  },
  {
    id: 'andromeda',
    name: 'Andromeda Spiral',
    subtitle: 'Dual-Arm Grand Design',
    description: 'Symmetric dual-arm stellar stream transitioning from white-blue to soft violet.',
    speed: 0.24,
    spiralTightness: 2.9,
    turbulence: 0.65,
    coreDensity: 1.0,
    colorScheme: 'andromeda',
    coreGlowSize: 1.0,
    gravityStrength: 0.5,
    tiltAngle: 0.08,
  },
  {
    id: 'electricBlue',
    name: 'Cygnus Pulsar',
    subtitle: 'Relativistic Plasma Jet',
    description: 'High-velocity electric blue ion streams with intense magnetic turbulence.',
    speed: 0.40,
    spiralTightness: 4.2,
    turbulence: 1.1,
    coreDensity: 1.3,
    colorScheme: 'electricBlue',
    coreGlowSize: 1.35,
    gravityStrength: 0.85,
    tiltAngle: 0.22,
  },
  {
    id: 'cosmicRose',
    name: 'Rosette Nebula',
    subtitle: 'Volumetric Star-Forming Cloud',
    description: 'Soft rose & magenta billowing clouds with diffuse stellar nurseries.',
    speed: 0.18,
    spiralTightness: 2.4,
    turbulence: 0.95,
    coreDensity: 0.85,
    colorScheme: 'cosmicRose',
    coreGlowSize: 0.9,
    gravityStrength: 0.4,
    tiltAngle: 0.05,
  },
  {
    id: 'deepNebula',
    name: 'Abyssal Void',
    subtitle: 'Quiescent Dark Matter Halo',
    description: 'Serene, slow-drifting deep violet particles with subtle stellar twinkling.',
    speed: 0.12,
    spiralTightness: 2.1,
    turbulence: 0.45,
    coreDensity: 0.7,
    colorScheme: 'deepNebula',
    coreGlowSize: 0.75,
    gravityStrength: 0.3,
    tiltAngle: 0.0,
  },
];

interface MinimalHUDProps {
  stats: SimulationStats;
  currentPreset: GalaxyPreset;
  interactionState?: InteractionState;
  universeState?: UniverseState;
  onSelectPreset: (preset: GalaxyPreset) => void;
  onSelectQuality: (tier: QualityTier) => void;
  onResetCamera?: () => void;
  onToggleCoreInspection?: () => void;
  onSelectGalaxy?: (galaxyId: string) => void;
  onSelectStarSystem?: (systemId: string) => void;
  onSelectPlanet?: (systemId: string, planetId: string) => void;
  onSelectMoon?: (systemId: string, planetId: string, moonId: string) => void;
  onExitStarSystem?: () => void;
  onSetTimeScale?: (scale: number) => void;
}

export const MinimalHUD: React.FC<MinimalHUDProps> = ({
  stats,
  currentPreset,
  interactionState = 'EXPLORING',
  universeState = {
    activeGalaxyId: 'galaxy01',
    isNavigating: false,
    distanceToActive: 44,
  },
  onSelectPreset,
  onSelectQuality,
  onResetCamera,
  onToggleCoreInspection,
  onSelectGalaxy,
  onSelectStarSystem,
  onSelectPlanet,
  onSelectMoon,
  onExitStarSystem,
  onSetTimeScale,
}) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dismissedPromptSystemId, setDismissedPromptSystemId] = useState<string | null>(null);

  const isCoreInspecting = interactionState === 'CORE_INSPECTION' || interactionState === 'CORE_TRANSITION';
  const activeGalaxy = getGalaxyConfigById(universeState.activeGalaxyId);

  const activeSystem = universeState.activeSystemId
    ? getStarSystemById(universeState.activeSystemId)
    : undefined;

  const activePlanet =
    activeSystem && universeState.activePlanetId
      ? activeSystem.planets.find((p) => p.id === universeState.activePlanetId)
      : undefined;

  const activeMoon =
    activePlanet && universeState.activeMoonId && activePlanet.moons
      ? activePlanet.moons.find((m) => m.id === universeState.activeMoonId)
      : undefined;

  const isPrimeGalaxy = universeState.activeGalaxyId === 'galaxy01';
  const showDetectedPrompt =
    universeState.detectedSystemId &&
    universeState.detectedSystemId !== dismissedPromptSystemId &&
    !universeState.activeSystemId &&
    !universeState.isNavigating;

  const timeScale = universeState.timeScale !== undefined ? universeState.timeScale : 1.0;

  const handleToggleAudio = () => {
    const playing = soundSynthesizer.toggle();
    setIsAudioPlaying(playing);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const cycleTimeScale = () => {
    if (!onSetTimeScale) return;
    if (timeScale === 1.0) {
      onSetTimeScale(0.25); // Observation mode
    } else if (timeScale === 0.25) {
      onSetTimeScale(0.0); // Freeze mode
    } else {
      onSetTimeScale(1.0); // Normal speed
    }
  };

  return (
    <div className="hud-overlay pointer-events-none select-none">
      {/* Top Header Bar */}
      <header className="hud-header">
        <div className="hud-brand pointer-events-auto">
          <div className="brand-symbol">
            <span className="brand-dot" />
            <span className="brand-ring" />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">A E T H E R // D E E P &nbsp; S P A C E</h1>
            <span className="brand-sub">
              {activeMoon
                ? `${activeMoon.name.toUpperCase()} • ${activeMoon.subtitle.toUpperCase()}`
                : activePlanet
                ? `${activePlanet.name.toUpperCase()} • ${activePlanet.subtitle.toUpperCase()}`
                : activeSystem
                ? `${activeSystem.name.toUpperCase()} • ${activeSystem.star.spectralType.toUpperCase()}`
                : `${activeGalaxy.name.toUpperCase()} • ${activeGalaxy.subtitle.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* Dynamic 5-Tier Breadcrumb Bar */}
        <div className="universe-breadcrumb-bar pointer-events-auto">
          <button
            onClick={() => onResetCamera && onResetCamera()}
            className="breadcrumb-node"
            title="Reset Camera to Universe / Galaxy View"
          >
            <span>DEEP SPACE</span>
          </button>
          <span className="breadcrumb-separator">&gt;</span>
          <button
            onClick={() => {
              if (activeSystem && onExitStarSystem) {
                onExitStarSystem();
              }
            }}
            className="breadcrumb-node"
            title="Focus Galaxy"
          >
            <span>{activeGalaxy.name.toUpperCase()}</span>
          </button>

          {activeSystem && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <button
                onClick={() => {
                  if (activePlanet && onSelectStarSystem && activeSystem) {
                    onSelectStarSystem(activeSystem.id);
                  }
                }}
                className={`breadcrumb-node ${!activePlanet ? 'breadcrumb-leaf' : ''}`}
                title="Focus Star System"
              >
                <Sun className="w-3.5 h-3.5 mr-1 text-amber-400" />
                <span>{activeSystem.name.toUpperCase()}</span>
              </button>
            </>
          )}

          {activePlanet && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <button
                onClick={() => {
                  if (activeMoon && onSelectPlanet && activeSystem) {
                    onSelectPlanet(activeSystem.id, activePlanet.id);
                  }
                }}
                className={`breadcrumb-node ${!activeMoon ? 'breadcrumb-leaf text-cyan-300' : ''}`}
                title="Focus Planet"
              >
                <Globe2 className="w-3.5 h-3.5 mr-1 text-cyan-300" />
                <span>{activePlanet.name.toUpperCase()}</span>
              </button>
            </>
          )}

          {activeMoon && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-leaf text-amber-300 animate-pulse">
                <Moon className="w-3.5 h-3.5 mr-1 text-amber-300 inline" />
                {activeMoon.name.toUpperCase()}
              </span>
            </>
          )}

          {isCoreInspecting && !activeSystem && (
            <>
              <span className="breadcrumb-separator">&gt;</span>
              <span className="breadcrumb-singularity animate-pulse">
                {activeGalaxy.hasBlackHole ? 'EVENT HORIZON' : 'STELLAR CORE'}
              </span>
            </>
          )}
        </div>

        {/* Telemetry Chips */}
        <div className="hud-telemetry pointer-events-auto">
          <div className="telemetry-chip">
            <Activity className="chip-icon text-purple-400" />
            <span className="chip-label">FPS</span>
            <span className="chip-val">{stats.fps}</span>
          </div>

          <div className="telemetry-chip">
            <Sparkles className="chip-icon text-pink-400" />
            <span className="chip-label">PARTICLES</span>
            <span className="chip-val">{(stats.particleCount / 1000).toFixed(0)}K</span>
          </div>

          <div className="telemetry-chip hidden-mobile">
            <Compass className="chip-icon text-blue-400" />
            <span className="chip-label">RANGE</span>
            <span className="chip-val">{stats.cameraDistance} AU</span>
          </div>

          {activeMoon && (
            <div className="telemetry-chip active-moon-chip">
              <Moon className="chip-icon text-amber-300 animate-pulse" />
              <span className="chip-label text-amber-300">
                LUNAR PROXIMITY // {activeMoon.name.toUpperCase()}
              </span>
            </div>
          )}

          {activePlanet && !activeMoon && (
            <div className="telemetry-chip active-planet-chip">
              <Globe2 className="chip-icon text-cyan-300 animate-pulse" />
              <span className="chip-label text-cyan-300">
                {activePlanet.type.toUpperCase()} WORLD
              </span>
            </div>
          )}

          {activeSystem?.asteroidBelt && !activePlanet && (
            <div className="telemetry-chip active-belt-chip hidden-mobile">
              <Disc className="chip-icon text-amber-400 animate-spin" />
              <span className="chip-label text-amber-300">
                ASTEROID BELT ACTIVE
              </span>
            </div>
          )}

          {universeState.detectedBlackHole && !activeSystem && (
            <div className="telemetry-chip active-bh-chip animate-pulse">
              <Crosshair className="chip-icon text-rose-400" />
              <span className="chip-label text-rose-300">
                SUPERMASSIVE BLACK HOLE // GRAV FIELD: HIGH
              </span>
            </div>
          )}

          {isCoreInspecting && !activeSystem && (
            <div className="telemetry-chip active-core-chip">
              <Crosshair className="chip-icon text-pink-300 animate-pulse" />
              <span className="chip-label text-pink-300">
                {activeGalaxy.hasBlackHole ? 'EVENT HORIZON // LENSING' : 'CORE INSPECTION'}
              </span>
            </div>
          )}

          {universeState.isNavigating && (
            <div className="telemetry-chip active-warp-chip">
              <span className="chip-label text-blue-300 animate-pulse">WARPING THROUGH SPACE</span>
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="hud-actions pointer-events-auto">
          {/* Observation Mode / Time Scale Switcher */}
          <button
            onClick={cycleTimeScale}
            className={`hud-btn ${timeScale < 1.0 ? 'active ring-1 ring-amber-400' : ''}`}
            title={`Orbital Simulation Speed: ${timeScale === 1.0 ? 'Normal (1.0x)' : timeScale === 0.25 ? 'Observation (0.25x)' : 'Frozen (0.0x)'} (SPACE)`}
            aria-label="Time Scale"
          >
            {timeScale === 0.0 ? (
              <Pause className="w-4 h-4 text-rose-400" />
            ) : timeScale === 0.25 ? (
              <span className="text-[0.62rem] font-bold text-amber-300">0.25x</span>
            ) : (
              <Play className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {(activeMoon || activePlanet || activeSystem) && onExitStarSystem && (
            <button
              onClick={onExitStarSystem}
              className="hud-btn active"
              title="Exit to Parent Level (ESC / Back)"
              aria-label="Exit Level"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-300" />
            </button>
          )}

          {onToggleCoreInspection && !activeSystem && (
            <button
              onClick={onToggleCoreInspection}
              className={`hud-btn ${isCoreInspecting ? 'active ring-1 ring-pink-400' : ''}`}
              title={isCoreInspecting ? "Exit Core Inspection (C)" : "Inspect Core Up Close (C / Double Click)"}
              aria-label="Core Inspection"
            >
              <Crosshair className={`w-4 h-4 ${isCoreInspecting ? 'text-pink-300' : ''}`} />
            </button>
          )}

          {onResetCamera && (
            <button
              onClick={onResetCamera}
              className="hud-btn"
              title="Reset Camera View (R)"
              aria-label="Reset Camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`hud-btn ${showInfo ? 'active' : ''}`}
            title="Universe Architecture, Moons & Asteroids Guide"
            aria-label="Simulation Architecture"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleAudio}
            className={`hud-btn ${isAudioPlaying ? 'active' : ''}`}
            title={isAudioPlaying ? 'Mute Deep-Space Ambient Synthesizer' : 'Play Deep-Space Ambient Synthesizer'}
            aria-label="Toggle Sound"
          >
            {isAudioPlaying ? <Volume2 className="w-4 h-4 text-purple-300" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="hud-btn hidden-mobile"
            title="Toggle Fullscreen"
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Cinematic Star System Proximity Prompt */}
      {showDetectedPrompt && (
        <div className="star-system-prompt-banner pointer-events-auto animate-fade-in">
          <div className="prompt-content">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse mr-2.5" />
            <div className="prompt-text">
              <span className="prompt-title">STAR SYSTEM DETECTED</span>
              <span className="prompt-sub">{universeState.detectedSystemName || 'Approaching Stellar System'}</span>
            </div>
            <div className="prompt-actions">
              <button
                onClick={() => {
                  if (universeState.detectedSystemId && onSelectStarSystem) {
                    onSelectStarSystem(universeState.detectedSystemId);
                  }
                }}
                className="prompt-btn-enter"
              >
                ENTER SYSTEM
              </button>
              <button
                onClick={() => setDismissedPromptSystemId(universeState.detectedSystemId || null)}
                className="prompt-btn-skip"
              >
                CONTINUE FLYING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Level Explorer Drawer */}
      {activePlanet && activePlanet.moons && activePlanet.moons.length > 0 ? (
        /* Planet & Moon Explorer */
        <nav className="cosmic-navigator-bar pointer-events-auto">
          <div className="system-navigator-header">
            <span className="system-title-tag text-cyan-300">
              <Globe2 className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
              {activePlanet.name} • {activePlanet.moons.length} NATURAL SATELLITE{activePlanet.moons.length > 1 ? 'S' : ''}
            </span>
            <button
              onClick={() => onSelectPlanet && activeSystem && onSelectPlanet(activeSystem.id, activePlanet.id)}
              className="system-overview-btn"
            >
              PLANET OVERVIEW
            </button>
          </div>

          <div className="galaxy-pills-scroll">
            {activePlanet.moons.map((moon, idx) => {
              const isMoonActive = moon.id === universeState.activeMoonId;
              return (
                <button
                  key={moon.id}
                  onClick={() => onSelectMoon && activeSystem && onSelectMoon(activeSystem.id, activePlanet.id, moon.id)}
                  className={`galaxy-nav-pill moon-pill ${isMoonActive ? 'active' : ''}`}
                  title={`${moon.name} (${moon.subtitle})`}
                >
                  <Moon className={`w-3.5 h-3.5 mr-1.5 ${isMoonActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span className="galaxy-nav-num">M{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="galaxy-nav-name">{moon.name}</span>
                </button>
              );
            })}

            <div className="divider-vertical" />

            <button
              onClick={() => onSelectStarSystem && activeSystem && onSelectStarSystem(activeSystem.id)}
              className="galaxy-nav-pill"
            >
              <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span className="galaxy-nav-name">RETURN TO STAR SYSTEM</span>
            </button>
          </div>
        </nav>
      ) : activeSystem ? (
        /* Star System Planetary Orbit Explorer Drawer */
        <nav className="cosmic-navigator-bar pointer-events-auto">
          <div className="system-navigator-header">
            <span className="system-title-tag">
              <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              {activeSystem.name} ({activeSystem.planets.length} ORBITING WORLDS)
            </span>
            <button
              onClick={() => onSelectStarSystem && onSelectStarSystem(activeSystem.id)}
              className="system-overview-btn"
            >
              FULL SYSTEM VIEW
            </button>
          </div>

          <div className="galaxy-pills-scroll">
            {activeSystem.planets.map((planet, idx) => {
              const isPlanetActive = planet.id === universeState.activePlanetId;
              const isEarthLike = planet.type === 'earth-like';
              const moonCount = planet.moons ? planet.moons.length : 0;
              return (
                <button
                  key={planet.id}
                  onClick={() => onSelectPlanet && onSelectPlanet(activeSystem.id, planet.id)}
                  className={`galaxy-nav-pill planet-pill ${isPlanetActive ? 'active' : ''} ${isEarthLike ? 'earth-like-pill' : ''}`}
                  title={`${planet.name} (${planet.subtitle})`}
                >
                  <Globe2 className={`w-3.5 h-3.5 mr-1.5 ${isPlanetActive ? 'text-cyan-300' : isEarthLike ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="galaxy-nav-num">{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="galaxy-nav-name">{planet.name}</span>
                  {isEarthLike && <span className="earth-tag">EARTH-ANALOG</span>}
                  {moonCount > 0 && <span className="moon-count-tag">{moonCount}M</span>}
                </button>
              );
            })}
          </div>
        </nav>
      ) : isPrimeGalaxy ? (
        /* Prime Galaxy Star System Quick-Focus Bar */
        <nav className="cosmic-navigator-bar pointer-events-auto">
          <div className="system-navigator-header">
            <span className="system-title-tag text-purple-300">
              <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              PRIME GALAXY STELLAR SYSTEMS (4 SYSTEMS DISCOVERABLE)
            </span>
          </div>

          <div className="galaxy-pills-scroll">
            {PRIME_GALAXY_STAR_SYSTEMS.map((sys, idx) => (
              <button
                key={sys.id}
                onClick={() => onSelectStarSystem && onSelectStarSystem(sys.id)}
                className="galaxy-nav-pill star-system-pill"
                title={`Dive into ${sys.name} (${sys.planets.length} Planets)`}
              >
                <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                <span className="galaxy-nav-num">SYS-{(idx + 1).toString().padStart(2, '0')}</span>
                <span className="galaxy-nav-name">{sys.name.split(' ')[0]}</span>
                <span className="planet-count-tag">{sys.planets.length} WORLDS</span>
              </button>
            ))}

            <div className="divider-vertical" />

            {UNIVERSE_GALAXIES.map((galaxy, idx) => {
              const isActive = galaxy.id === universeState.activeGalaxyId;
              return (
                <button
                  key={galaxy.id}
                  onClick={() => onSelectGalaxy && onSelectGalaxy(galaxy.id)}
                  className={`galaxy-nav-pill ${isActive ? 'active' : ''}`}
                  title={`Travel to ${galaxy.name} (${idx + 1})`}
                >
                  <Globe2 className={`w-3.5 h-3.5 mr-1.5 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                  <span className="galaxy-nav-num">{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="galaxy-nav-name">{galaxy.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : (
        /* Regular Universe Galaxy Navigator */
        <nav className="cosmic-navigator-bar pointer-events-auto">
          <div className="galaxy-pills-scroll">
            {UNIVERSE_GALAXIES.map((galaxy, idx) => {
              const isActive = galaxy.id === universeState.activeGalaxyId;
              return (
                <button
                  key={galaxy.id}
                  onClick={() => onSelectGalaxy && onSelectGalaxy(galaxy.id)}
                  className={`galaxy-nav-pill ${isActive ? 'active' : ''}`}
                  title={`Travel to ${galaxy.name} (${idx + 1})`}
                >
                  <Globe2 className={`w-3.5 h-3.5 mr-1.5 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                  <span className="galaxy-nav-num">{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className="galaxy-nav-name">{galaxy.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Info Modal / Drawer */}
      {showInfo && (
        <div className="hud-info-modal pointer-events-auto">
          <div className="modal-header">
            <h3>AETHER Planetary, Moon & Asteroid Exploration Guide</h3>
            <button onClick={() => setShowInfo(false)} className="close-btn">×</button>
          </div>
          <div className="modal-body">
            <p>
              <strong>Complete Hierarchy:</strong> Seamless, single-canvas exploration across all cosmic scales:
              <br />
              <code>UNIVERSE &gt; GALAXY &gt; STAR SYSTEM &gt; STAR &gt; PLANET &gt; MOON &gt; ASTEROIDS &gt; LOCAL SPACE</code>
            </p>
            <p>
              <strong>Moon Subsystem:</strong> Major planetary worlds feature orbiting natural satellites with Keplerian velocities, independent axial rotations, and directional solar illumination.
            </p>
            <p>
              <strong>Asteroid Belts & Trojans:</strong> GPU-instanced asteroid belts and local planetary debris fields orbiting stars and planets with tumbling kinematics and progressive proximity detail.
            </p>
            <p>
              <strong>Observation Mode:</strong> Press <kbd>SPACE</kbd> or click the Speed button to slow the orbital simulation to 0.25x for detailed orbital inspection.
            </p>
            <div className="modal-interaction-guide">
              <h4>Multi-Scale Navigation Controls</h4>
              <ul>
                <li><span>Click Star / SYS Pill</span> Dive into Star System ($d \approx 4-6$ AU)</li>
                <li><span>Click Planet / Planet Pill</span> Dive into Planet ($d \approx 0.5$ AU)</li>
                <li><span>Click Moon / Moon Pill</span> Dive into Moon ($d \approx 0.05$ AU)</li>
                <li><span>Left-Click Drag</span> 360° Orbit around current object</li>
                <li><span>Right-Click Drag</span> Pan camera</li>
                <li><span>Escape / Back Button</span> Ascend smoothly to parent scale</li>
                <li><span>Space</span> Toggle 0.25x Observation Slow-Motion</li>
                <li><span>R</span> Reset to Galaxy Overview</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Preset Switcher & Controls */}
      <footer className="hud-footer">
        <div className="interaction-hint pointer-events-auto">
          <div className="pulse-dot" />
          <span>
            {activeMoon
              ? `INSPECTING ${activeMoon.name.toUpperCase()} (MOON OF ${activePlanet?.name.toUpperCase()}) • DRAG — ORBIT • ESC / BACK — EXIT MOON`
              : activePlanet
              ? `INSPECTING ${activePlanet.name.toUpperCase()} • CLICK MOONS TO DIVE IN • ESC / BACK — EXIT WORLD`
              : activeSystem
              ? `STAR SYSTEM // ${activeSystem.name.toUpperCase()} • CLICK PLANETS TO DIVE IN • ESC / BACK — EXIT TO GALAXY`
              : universeState.detectedBlackHole
              ? `SUPERMASSIVE BLACK HOLE FIELD • GRAVITATIONAL LENSING & WARPED ACCRETION ARCS • C / DOUBLE-CLICK — INSPECT CORE`
              : 'ZOOM INTO PRIME GALAXY FOR STAR SYSTEMS OR TRAVEL TO GALAXIES [02–16] FOR SUPERMASSIVE BLACK HOLES'}
          </span>
        </div>

        <div className="preset-bar pointer-events-auto">
          <div className="preset-tabs">
            {GALAXY_PRESETS.map((preset) => {
              const isActive = preset.id === currentPreset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`preset-pill ${isActive ? 'active' : ''}`}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-badge">{preset.subtitle.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Quality Tier Selector */}
          <div className="quality-dropdown-wrapper">
            <button
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
              className="quality-toggle-btn"
              title="GPU Particle Density Tier"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              <span className="uppercase text-xs tracking-wider">{stats.tier}</span>
              {isControlsExpanded ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronUp className="w-3 h-3 ml-1" />}
            </button>

            {isControlsExpanded && (
              <div className="quality-menu">
                {(['ultra', 'high', 'medium', 'low'] as QualityTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => {
                      onSelectQuality(tier);
                      setIsControlsExpanded(false);
                    }}
                    className={`quality-item ${stats.tier === tier ? 'active' : ''}`}
                  >
                    <span className="tier-label uppercase">{tier}</span>
                    <span className="tier-count">
                      {tier === 'ultra' ? '750K+' : tier === 'high' ? '500K' : tier === 'medium' ? '250K' : '100K'} pts
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
