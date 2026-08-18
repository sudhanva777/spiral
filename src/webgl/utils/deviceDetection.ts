import type { QualityConfig, QualityTier } from '../../types/simulation';

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/** True when the primary input is a coarse touch pointer (phones/tablets). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

/** True when the device is small-screen (mobile-first composition). */
export function isSmallScreen(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 820;
}

/** Effective device-pixel-ratio: hardware DPR capped per quality tier, then
 *  multiplied by a dynamic resolution scale (0.65–1.0) for adaptive quality. */
export function effectivePixelRatio(tier: QualityTier, resolutionScale = 1.0): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
  const cap = getQualityConfigForTier(tier).dpr;
  return Math.min(dpr, cap) * Math.max(0.65, Math.min(1.0, resolutionScale));
}

export function detectQualityTier(): QualityConfig {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const isHighEnd = !isMobile && hardwareConcurrency >= 8;

  if (isMobile) {
    return {
      tier: 'low',
      particleCount: 100000,
      nebulaCount: 1200,
      starCount: 4500,
      foregroundDustCount: 600,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      bloomEnabled: true,
      bloomRadius: 0.30,
      bloomStrength: 0.40,
    };
  }

  if (isHighEnd) {
    return {
      tier: 'ultra',
      particleCount: 750000,
      nebulaCount: 3800,
      starCount: 15000,
      foregroundDustCount: 2500,
      dpr: Math.min(window.devicePixelRatio || 1, 2.0),
      bloomEnabled: true,
      bloomRadius: 0.40,
      bloomStrength: 0.55,
    };
  }

  return {
    tier: 'high',
    particleCount: 500000,
    nebulaCount: 3000,
    starCount: 12000,
    foregroundDustCount: 1800,
    dpr: Math.min(window.devicePixelRatio || 1, 1.75),
    bloomEnabled: true,
    bloomRadius: 0.45,
    bloomStrength: 0.60,
  };
}

export function getQualityConfigForTier(tier: QualityTier): QualityConfig {
  switch (tier) {
    case 'ultra':
      return {
        tier: 'ultra',
        particleCount: 750000,
        nebulaCount: 3800,
        starCount: 15000,
        foregroundDustCount: 2500,
        dpr: Math.min(window.devicePixelRatio || 1, 2.0),
        bloomEnabled: true,
        bloomRadius: 0.40,
        bloomStrength: 0.55,
      };
    case 'high':
      return {
        tier: 'high',
        particleCount: 500000,
        nebulaCount: 3000,
        starCount: 12000,
        foregroundDustCount: 1800,
        dpr: Math.min(window.devicePixelRatio || 1, 1.75),
        bloomEnabled: true,
        bloomRadius: 0.45,
        bloomStrength: 0.60,
      };
    case 'medium':
      return {
        tier: 'medium',
        particleCount: 250000,
        nebulaCount: 2000,
        starCount: 8000,
        foregroundDustCount: 1200,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        bloomEnabled: true,
        bloomRadius: 0.35,
        bloomStrength: 0.45,
      };
    case 'low':
      return {
        tier: 'low',
        particleCount: 100000,
        nebulaCount: 1200,
        starCount: 4500,
        foregroundDustCount: 600,
        dpr: Math.min(window.devicePixelRatio || 1, 1.25),
        bloomEnabled: false,
        bloomRadius: 0.30,
        bloomStrength: 0.35,
      };
  }
}
