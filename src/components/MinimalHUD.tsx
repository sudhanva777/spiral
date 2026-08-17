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
  Globe2
} from 'lucide-react';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { UniverseState } from '../types/universe';
import { UNIVERSE_GALAXIES } from '../webgl/galaxies/registry';
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
}

export const MinimalHUD: React.FC<MinimalHUDProps> = ({
  stats,
  currentPreset,
  interactionState = 'EXPLORING',
  universeState = { activeGalaxyId: 'galaxy01', isNavigating: false, distanceToActive: 44 },
  onSelectPreset,
  onSelectQuality,
  onResetCamera,
  onToggleCoreInspection,
  onSelectGalaxy,
}) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const isCoreInspecting = interactionState === 'CORE_INSPECTION' || interactionState === 'CORE_TRANSITION';
  const activeGalaxy = UNIVERSE_GALAXIES.find((g) => g.id === universeState.activeGalaxyId) || UNIVERSE_GALAXIES[0];

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
            <h1 className="brand-title">A E T H E R // U N I V E R S E</h1>
            <span className="brand-sub">{activeGalaxy.name.toUpperCase()} • CONTINUOUS 3D MULTI-GALAXY ENGINE</span>
          </div>
        </div>

        {/* Universe Celestial Navigator / Breadcrumbs */}
        <div className="universe-selector-bar pointer-events-auto">
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
                <span className="galaxy-nav-num">0{idx + 1}</span>
                <span className="galaxy-nav-name">{galaxy.name}</span>
              </button>
            );
          })}
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
            <span className="chip-label">UNIVERSE PARTICLES</span>
            <span className="chip-val">{(stats.particleCount / 1000).toFixed(0)}K</span>
          </div>

          <div className="telemetry-chip hidden-mobile">
            <Compass className="chip-icon text-blue-400" />
            <span className="chip-label">RANGE</span>
            <span className="chip-val">{stats.cameraDistance} AU</span>
          </div>

          {isCoreInspecting && (
            <div className="telemetry-chip active-core-chip">
              <Crosshair className="chip-icon text-pink-300 animate-pulse" />
              <span className="chip-label text-pink-300">CORE INSPECTION</span>
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
          {onToggleCoreInspection && (
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
            title="Universe Architecture & Exploration Guide"
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

      {/* Info Modal / Drawer */}
      {showInfo && (
        <div className="hud-info-modal pointer-events-auto">
          <div className="modal-header">
            <h3>AETHER Universe Architecture</h3>
            <button onClick={() => setShowInfo(false)} className="close-btn">×</button>
          </div>
          <div className="modal-body">
            <p>
              <strong>Continuous 3D Universe:</strong> Multiple unique procedural galaxies co-existing in the same seamless Three.js coordinate space with real-time scale-aware distance LOD.
            </p>
            <p>
              <strong>Galaxy 01 (Aether Prime):</strong> Barred spiral morphology with electric cyan/ice-blue relativistic streams, warm amber arms, and emerald outer dust.
            </p>
            <p>
              <strong>Galaxy 02 (Ignis Vesper):</strong> Asymmetric flocculent ring morphology with warm golden nucleus (#FFF4D6), vivid magenta/violet plasma arms, and deep burgundy cosmic dust (#7F1D1D).
            </p>
            <p>
              <strong>Scale-Aware Distance LOD:</strong> Distant celestial objects dynamically optimize particle size and density, locking performance at 60 FPS.
            </p>
            <div className="modal-interaction-guide">
              <h4>Universe Navigation & Controls</h4>
              <ul>
                <li><span>Pill [01] / [02]</span> Travel to Galaxy 01 / Galaxy 02</li>
                <li><span>Keys 1 / 2</span> Quick shortcut to fly to Galaxy 01 / 02</li>
                <li><span>Left-Click Drag</span> 360° Orbit around active galaxy</li>
                <li><span>Right-Click Drag</span> Pan camera across deep space</li>
                <li><span>Scroll / Pinch</span> Continuous zoom (3.5 to 500 AU)</li>
                <li><span>Click Galaxy</span> Propagating energy wave pulse</li>
                <li><span>Double-Click Core</span> Toggle close Core Inspection mode (or C key)</li>
                <li><span>R Key / Reset</span> Return to active galaxy default view</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Preset Switcher & Controls */}
      <footer className="hud-footer">
        {/* Interaction Hint Badge */}
        <div className="interaction-hint pointer-events-auto">
          <div className="pulse-dot" />
          <span>DRAG — ORBIT • SCROLL — ZOOM • CLICK [01 / 02] — TRAVEL DEEP SPACE • DBL-CLICK CORE — INSPECT • R — RESET</span>
        </div>

        {/* Floating Preset Selector Drawer */}
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
                      {tier === 'ultra' ? '300K' : tier === 'high' ? '180K' : tier === 'medium' ? '100K' : '50K'} pts
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
