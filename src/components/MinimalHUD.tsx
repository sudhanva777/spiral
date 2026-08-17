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
  onExitStarSystem?: () => void;
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
  onExitStarSystem,
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

  const isPrimeGalaxy = universeState.activeGalaxyId === 'galaxy01';
  const showDetectedPrompt =
    universeState.detectedSystemId &&
    universeState.detectedSystemId !== dismissedPromptSystemId &&
    !universeState.activeSystemId &&
    !universeState.isNavigating;

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
              {activePlanet
                ? `${activePlanet.name.toUpperCase()} • ${activePlanet.subtitle.toUpperCase()}`
                : activeSystem
                ? `${activeSystem.name.toUpperCase()} • ${activeSystem.star.spectralType.toUpperCase()}`
                : `${activeGalaxy.name.toUpperCase()} • ${activeGalaxy.subtitle.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* Dynamic Breadcrumb Bar */}
        <div className="universe-breadcrumb-bar pointer-events-auto">
          <button
            onClick={() => onResetCamera && onResetCamera()}
            className="breadcrumb-node"
            title="Reset Camera to Galaxy View"
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
              <span className="breadcrumb-leaf text-cyan-300 animate-pulse">
                {activePlanet.name.toUpperCase()}
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

          {activePlanet && (
            <div className="telemetry-chip active-planet-chip">
              <Globe2 className="chip-icon text-cyan-300 animate-pulse" />
              <span className="chip-label text-cyan-300">
                {activePlanet.type.toUpperCase()} WORLD
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
          {activeSystem && onExitStarSystem && (
            <button
              onClick={onExitStarSystem}
              className="hud-btn active"
              title="Exit to Galaxy View (ESC / R)"
              aria-label="Exit System"
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
            title="Universe Architecture & Star Systems Guide"
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

      {/* Star System Planetary Orbit Explorer Drawer */}
      {activeSystem ? (
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
            <h3>AETHER Planetary Star System Architecture</h3>
            <button onClick={() => setShowInfo(false)} className="close-btn">×</button>
          </div>
          <div className="modal-body">
            <p>
              <strong>Hierarchical Cosmic Depth:</strong> Embedded inside the spiral arms of Aether Prime are 4 distinct, fully simulated planetary star systems with Keplerian elliptical orbits, axial planet rotations, swirling cloud layers, and atmospheric scattering.
            </p>
            <p>
              <strong>Star System 01 (Blue Star):</strong> Luminous electric-blue star with 5 orbiting worlds, including <em>Oasis Prime</em> (an Earth-like oceanic biosphere analog).
            </p>
            <p>
              <strong>Star System 02 (Massive Star):</strong> Colossal hypergiant commanding 10 planets: 3 extreme lava worlds, 2 speculative Earth-like candidates (<em>Gaia Nova</em> & <em>Aegis</em>), golden ringed giant <em>Chronos</em>, and deep ocean world <em>Thalassa</em>.
            </p>
            <p>
              <strong>Star System 03 (Violet Star):</strong> White-hot core with magenta-violet coronal halo anchoring 6 diverse planetary worlds.
            </p>
            <p>
              <strong>Star System 04 (Twin-Earth Sun):</strong> Golden solar analog harboring 7 planets, including twin Earth-analogs (<em>Terra Nova</em> and <em>Avalon</em>).
            </p>
            <div className="modal-interaction-guide">
              <h4>Navigation & Deep Zoom Controls</h4>
              <ul>
                <li><span>Zoom deeply into Prime Galaxy</span> Progressively discover star systems and planets</li>
                <li><span>Click Star / SYS Pill</span> Smoothly dive into the Star System ($d \approx 4-6$ AU)</li>
                <li><span>Click Planet / Planet Pill</span> Inspect planet up close with rotating clouds and atmosphere ($d \approx 0.5$ AU)</li>
                <li><span>Left-Click Drag</span> 360° Orbit around star or planet</li>
                <li><span>Right-Click Drag</span> Pan camera</li>
                <li><span>Escape / Back Arrow / R</span> Seamlessly back out from planet to star, and star to galaxy</li>
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
            {activePlanet
              ? `INSPECTING ${activePlanet.name.toUpperCase()} • DRAG — ORBIT • SCROLL — ZOOM • ESC / BACK — EXIT WORLD`
              : activeSystem
              ? `STAR SYSTEM // ${activeSystem.name.toUpperCase()} • CLICK PLANETS TO DIVE IN • ESC / BACK — EXIT TO GALAXY`
              : 'ZOOM INTO PRIME GALAXY TO DISCOVER 4 STAR SYSTEMS • PILLS [01–16] — TRAVEL UNIVERSE • R — RESET'}
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
