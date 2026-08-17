import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GalaxyEngine } from '../webgl/GalaxyEngine';
import { MinimalHUD, GALAXY_PRESETS } from './MinimalHUD';
import { WebGLFallback } from './WebGLFallback';
import { isWebGLAvailable, detectQualityTier } from '../webgl/utils/deviceDetection';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';

export const CanvasContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GalaxyEngine | null>(null);

  const [hasWebGL, setHasWebGL] = useState(true);
  const [currentPreset, setCurrentPreset] = useState<GalaxyPreset>(GALAXY_PRESETS[0]);
  const [stats, setStats] = useState<SimulationStats>({
    fps: 60,
    particleCount: 250000,
    drawCalls: 3,
    tier: 'ultra',
    mouseNormalized: { x: 0, y: 0 },
    cameraDistance: 44,
  });

  const [interactionState, setInteractionState] = useState<InteractionState>('CINEMATIC');

  const handleStatsUpdate = useCallback((newStats: SimulationStats) => {
    setStats(newStats);
  }, []);

  const handleStateChange = useCallback((newState: InteractionState) => {
    setInteractionState(newState);
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
      handleStateChange
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleStatsUpdate, handleStateChange]);

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
        onSelectPreset={handleSelectPreset}
        onSelectQuality={handleSelectQuality}
        onResetCamera={handleResetCamera}
        onToggleCoreInspection={handleToggleCoreInspection}
      />
    </div>
  );
};
