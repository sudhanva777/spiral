import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GalaxyEngine } from '../webgl/GalaxyEngine';
import { MinimalHUD, GALAXY_PRESETS } from './MinimalHUD';
import { WebGLFallback } from './WebGLFallback';
import { isWebGLAvailable, detectQualityTier } from '../webgl/utils/deviceDetection';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { UniverseState } from '../types/universe';

export const CanvasContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GalaxyEngine | null>(null);

  const [hasWebGL, setHasWebGL] = useState(true);
  const [currentPreset, setCurrentPreset] = useState<GalaxyPreset>(GALAXY_PRESETS[0]);
  const [stats, setStats] = useState<SimulationStats>({
    fps: 60,
    particleCount: 250000,
    drawCalls: 4,
    tier: 'ultra',
    mouseNormalized: { x: 0, y: 0 },
    cameraDistance: 44,
  });

  const [interactionState, setInteractionState] = useState<InteractionState>('CINEMATIC');
  const [universeState, setUniverseState] = useState<UniverseState>({
    activeGalaxyId: 'galaxy01',
    isNavigating: false,
    distanceToActive: 44,
  });

  const handleStatsUpdate = useCallback((newStats: SimulationStats) => {
    setStats(newStats);
  }, []);

  const handleStateChange = useCallback((newState: InteractionState) => {
    setInteractionState(newState);
  }, []);

  const handleUniverseStateChange = useCallback((newUniverseState: UniverseState) => {
    setUniverseState(newUniverseState);
  }, []);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
      return;
    }

    if (!containerRef.current) return;

    const initialTier = detectQualityTier().tier;
    const engine = new GalaxyEngine(
      containerRef.current,
      initialTier,
      handleStatsUpdate,
      handleStateChange,
      handleUniverseStateChange
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleStatsUpdate, handleStateChange, handleUniverseStateChange]);

  const handleSelectPreset = (preset: GalaxyPreset) => {
    setCurrentPreset(preset);
    if (engineRef.current) {
      engineRef.current.setPreset(preset);
    }
  };

  const handleSelectQuality = (tier: QualityTier) => {
    if (engineRef.current) {
      engineRef.current.setQualityTier(tier);
    }
  };

  const handleResetCamera = () => {
    if (engineRef.current) {
      engineRef.current.resetCamera();
    }
  };

  const handleToggleCoreInspection = () => {
    if (engineRef.current) {
      engineRef.current.toggleCoreInspection();
    }
  };

  const handleSelectGalaxy = (galaxyId: string) => {
    if (engineRef.current) {
      engineRef.current.navigateToGalaxy(galaxyId);
    }
  };

  const handleSelectStarSystem = (systemId: string) => {
    if (engineRef.current) {
      engineRef.current.enterStarSystem(systemId);
    }
  };

  const handleSelectPlanet = (systemId: string, planetId: string) => {
    if (engineRef.current) {
      engineRef.current.enterPlanet(systemId, planetId);
    }
  };

  const handleSelectMoon = (systemId: string, planetId: string, moonId: string) => {
    if (engineRef.current) {
      engineRef.current.enterMoon(systemId, planetId, moonId);
    }
  };

  const handleExitStarSystem = () => {
    if (engineRef.current) {
      engineRef.current.exitStarSystem();
    }
  };

  const handleSetTimeScale = (scale: number) => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(scale);
    }
  };

  if (!hasWebGL) {
    return <WebGLFallback />;
  }

  return (
    <div className="simulation-root">
      {/* 3D WebGL Canvas Layer */}
      <div ref={containerRef} className="webgl-canvas-viewport" />

      {/* Cinematic Sci-Fi HUD Overlay */}
      <MinimalHUD
        stats={stats}
        currentPreset={currentPreset}
        interactionState={interactionState}
        universeState={universeState}
        onSelectPreset={handleSelectPreset}
        onSelectQuality={handleSelectQuality}
        onResetCamera={handleResetCamera}
        onToggleCoreInspection={handleToggleCoreInspection}
        onSelectGalaxy={handleSelectGalaxy}
        onSelectStarSystem={handleSelectStarSystem}
        onSelectPlanet={handleSelectPlanet}
        onSelectMoon={handleSelectMoon}
        onExitStarSystem={handleExitStarSystem}
        onSetTimeScale={handleSetTimeScale}
      />
    </div>
  );
};
