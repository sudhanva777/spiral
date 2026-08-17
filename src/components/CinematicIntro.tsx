import React, { useEffect, useState } from 'react';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const phaseTexts = [
    'INITIALIZING QUANTUM VACUUM...',
    'RESOLVING STELLAR COORDINATES...',
    'SYNTHESIZING NEBULA MATRICES...',
    'IGNITING GALACTIC ACCRETION CORE...',
    'CALCULATING GRAVITATIONAL TENSORS...',
    'ESTABLISHING GLSL PARTICLE PIPELINE...',
  ];

  useEffect(() => {
    const startTime = performance.now();
    const duration = 2400; // 2.4s cinematic reveal

    const updateInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      const currentPhaseIndex = Math.min(
        phaseTexts.length - 1,
        Math.floor((pct / 100) * phaseTexts.length)
      );
      setPhase(currentPhaseIndex);

      if (pct >= 100) {
        clearInterval(updateInterval);
        setTimeout(onComplete, 400);
      }
    }, 40);

    return () => clearInterval(updateInterval);
  }, [onComplete]);

  return (
    <div className={`cinematic-intro-overlay ${progress >= 100 ? 'fade-out' : ''}`}>
      <div className="intro-content">
        <div className="intro-core-glow" />
        <div className="intro-loader-ring">
          <div
            className="intro-loader-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="intro-text-wrapper">
          <span className="intro-status">{phaseTexts[phase]}</span>
          <span className="intro-percentage">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
