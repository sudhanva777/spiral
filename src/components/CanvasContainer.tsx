import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GalaxyEngine } from '../webgl/GalaxyEngine';
import { MinimalHUD, GALAXY_PRESETS } from './MinimalHUD';
import { WebGLFallback } from './WebGLFallback';
import { isWebGLAvailable, detectQualityTier } from '../webgl/utils/deviceDetection';
import { soundSynthesizer } from './SoundSynthesizer';
import type { GalaxyPreset, InteractionState, QualityTier, SimulationStats } from '../types/simulation';
import type { UniverseState } from '../types/universe';
import type { WorldArrivalMode } from '../types/world';
import {
  buildWorldHandoffUrl,
  isWorldReturnMessage,
  isValidReturnOrigin,
} from '../worlds/worldConfig';

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
    cameraDistance: 158,
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

  // Mobile audio policy: the AudioContext may only start inside a user
  // gesture. The first interaction anywhere unlocks it so the ambient drone
  // (and city ambience) can play without a second tap.
  useEffect(() => {
    const unlock = () => soundSynthesizer.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
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

  const handleDescendToSurface = () => {
    if (engineRef.current) {
      engineRef.current.descendToSurface();
    }
  };

  const handleEnterPlanetSurface = (systemId: string, planetId: string) => {
    if (engineRef.current) {
      engineRef.current.enterPlanetSurface(systemId, planetId);
    }
  };

  const handleExitSurface = () => {
    if (engineRef.current) {
      engineRef.current.exitSurface();
    }
  };

  const handleEnterCosmicObject = (objectId: string) => {
    if (engineRef.current) {
      engineRef.current.enterCosmicObject(objectId);
    }
  };

  const handleExitCosmicObject = () => {
    if (engineRef.current) {
      engineRef.current.exitCosmicObject();
    }
  };

  const handleSurfaceStickInput = (x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.setSurfaceStickInput(x, y);
    }
  };

  const handleSurfaceJump = () => {
    if (engineRef.current) {
      engineRef.current.triggerSurfaceJump();
    }
  };

  const handleSurfaceInteract = () => {
    if (engineRef.current) {
      engineRef.current.triggerSurfaceInteract();
    }
  };

  // ------------------------------------------------------------------
  // EXTERNAL WORLD HANDOFF — Galaxy Explorer → Type-II world
  // ------------------------------------------------------------------
  const handoffLaunchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (handoffLaunchTimerRef.current !== null) {
        window.clearTimeout(handoffLaunchTimerRef.current);
      }
    };
  }, []);

  const handleEnterExternalWorld = useCallback((worldId: string, arrivalMode: WorldArrivalMode) => {
    const engine = engineRef.current;
    if (!engine) return;

    // 1. Build the arrival state and resolve the endpoint BEFORE any
    //    delay — window.open must stay inside the user gesture so
    //    pop-up blockers do not swallow the launch.
    engine.beginWorldHandoff(worldId, arrivalMode);
    const arrival = engine.getWorldArrivalState();
    if (!arrival) {
      engine.setWorldHandoffError('Arrival state could not be built.');
      return;
    }

    const worldUrl = buildWorldHandoffUrl(arrival);
    if (!worldUrl) {
      engine.setWorldHandoffError('New Hospet world is not currently connected.');
      return;
    }

    // 2. Launch in a new tab WITHOUT noopener — the external world keeps
    //    window.opener so it can post the return message back to the
    //    Galaxy Explorer. This tab stays alive for the return journey.
    let opened: Window | null = null;
    try {
      opened = window.open(worldUrl, '_blank');
    } catch {
      opened = null;
    }

    if (!opened) {
      engine.setWorldHandoffError('Could not open the New Hospet world. Allow pop-ups for this site and try again.');
      return;
    }

    // 3. The cinematic preparing beat plays while the external world
    //    boots in the background tab; then the state resolves to
    //    'entered' and the explorer waits for the return signal.
    if (handoffLaunchTimerRef.current !== null) {
      window.clearTimeout(handoffLaunchTimerRef.current);
    }
    handoffLaunchTimerRef.current = window.setTimeout(() => {
      engine.confirmWorldHandoff();
    }, 1600);
  }, []);

  const handleCancelWorldHandoff = useCallback(() => {
    if (handoffLaunchTimerRef.current !== null) {
      window.clearTimeout(handoffLaunchTimerRef.current);
      handoffLaunchTimerRef.current = null;
    }
    engineRef.current?.cancelWorldHandoff();
  }, []);

  // ------------------------------------------------------------------
  // EXTERNAL WORLD RETURN HANDSHAKE — Type-II world → Galaxy Explorer
  //
  // The external world posts a return message to window.opener. Origin is
  // validated against the configured Type-II endpoint before the engine
  // restores the player to orbit.
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleWorldReturn = (event: MessageEvent) => {
      if (!isWorldReturnMessage(event.data)) return;
      if (!isValidReturnOrigin(event.origin)) {
        console.warn('[WORLD RETURN] ignored return message from unexpected origin', event.origin);
        return;
      }
      const engine = engineRef.current;
      if (!engine) return;
      engine.restoreFromWorld(event.data);
    };
    window.addEventListener('message', handleWorldReturn);
    return () => {
      window.removeEventListener('message', handleWorldReturn);
    };
  }, []);

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
        onDescendToSurface={handleDescendToSurface}
        onEnterPlanetSurface={handleEnterPlanetSurface}
        onExitSurface={handleExitSurface}
        onEnterCosmicObject={handleEnterCosmicObject}
        onExitCosmicObject={handleExitCosmicObject}
        onSurfaceStickInput={handleSurfaceStickInput}
        onSurfaceJump={handleSurfaceJump}
        onSurfaceInteract={handleSurfaceInteract}
        onEnterExternalWorld={handleEnterExternalWorld}
        onCancelWorldHandoff={handleCancelWorldHandoff}
      />
    </div>
  );
};
