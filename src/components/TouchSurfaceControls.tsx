import React, { useCallback, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, LogOut } from 'lucide-react';
import type { SurfaceInteraction } from '../types/universe';

interface TouchSurfaceControlsProps {
  engine: {
    setSurfaceStickInput: (x: number, y: number) => void;
    triggerSurfaceJump: () => void;
    triggerSurfaceInteract: () => void;
  };
  interaction: SurfaceInteraction | null;
  canJump: boolean;
  onExitSurface: () => void;
}

/**
 * Mobile-only GEMINI surface controls.
 *
 * LEFT  — virtual joystick (movement; captured so it never orbits the camera)
 * RIGHT — the canvas itself: one-finger drag looks around, pinch zooms
 * BOTTOM-RIGHT — contextual action cluster: TALK / NEXT / CLOSE, JUMP, EXIT
 */
export const TouchSurfaceControls: React.FC<TouchSurfaceControlsProps> = ({
  engine,
  interaction,
  canJump,
  onExitSurface,
}) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });

  const resetStick = useCallback(() => {
    pointerIdRef.current = null;
    engine.setSurfaceStickInput(0, 0);
    setStickOffset({ x: 0, y: 0 });
  }, [engine]);

  const handleStickDown = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== null) return;
      pointerIdRef.current = e.pointerId;
      originRef.current = { x: e.clientX, y: e.clientY };
      try {
        zoneRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Pointer may already be captured elsewhere — the zone still tracks
        // move/up via the element's own event stream.
      }
      engine.setSurfaceStickInput(0, 0);
    },
    [engine]
  );

  const handleStickMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      const base = baseRef.current;
      if (!base) return;
      const radius = base.clientWidth / 2;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const clamped = len > radius ? radius / len : 1;
      const nx = dx * clamped;
      const ny = dy * clamped;
      setStickOffset({ x: nx, y: ny });
      engine.setSurfaceStickInput(nx / radius, ny / radius);
    },
    [engine]
  );

  const handleStickUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      zoneRef.current?.releasePointerCapture(e.pointerId);
      resetStick();
    },
    [resetStick]
  );

  const dialogueActive = !!interaction?.active;
  const actionLabel = dialogueActive
    ? interaction && interaction.lineIndex >= interaction.dialogue.length - 1
      ? 'CLOSE'
      : 'NEXT'
    : interaction
    ? interaction.prompt
    : null;

  return (
    <div className="touch-surface-controls">
      <div
        ref={zoneRef}
        className="touch-stick-zone"
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickUp}
        onPointerCancel={handleStickUp}
      >
        <div ref={baseRef} className="touch-stick-base">
          <div
            ref={knobRef}
            className="touch-stick-knob"
            style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }}
          />
        </div>
        <span className="touch-stick-label">MOVE</span>
      </div>

      <div className="touch-action-cluster">
        {actionLabel && (
          <button
            className="touch-action-btn primary"
            onClick={engine.triggerSurfaceInteract}
            aria-label={actionLabel}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {actionLabel}
          </button>
        )}

        {canJump && (
          <button
            className="touch-jump-btn"
            onClick={engine.triggerSurfaceJump}
            aria-label="Jump"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        <button className="touch-action-btn exit" onClick={onExitSurface} aria-label="Exit surface">
          <LogOut className="w-4 h-4 mr-2" />
          EXIT
        </button>
      </div>
    </div>
  );
};

export default TouchSurfaceControls;