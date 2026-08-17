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

export function detectQualityTier(): QualityConfig {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const isHighEnd = !isMobile && hardwareConcurrency >= 8;

  if (isMobile) {
    return {
      tier: 'low',
      particleCount: 65000,
      nebulaCount: 1500,
      starCount: 4000,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      bloomEnabled: true,
      bloomRadius: 0.30,
      bloomStrength: 0.40,
    };
  }

  if (isHighEnd) {
    return {
      tier: 'ultra',
      particleCount: 260000,
      nebulaCount: 4000,
      starCount: 15000,
      dpr: Math.min(window.devicePixelRatio || 1, 2.0),
      bloomEnabled: true,
      bloomRadius: 0.40,
      bloomStrength: 0.55,
    };
  }

  return {
    tier: 'high',
    particleCount: 160000,
    nebulaCount: 2800,
    starCount: 10000,
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
        particleCount: 300000,
        nebulaCount: 4500,
        starCount: 16000,
        dpr: Math.min(window.devicePixelRatio || 1, 2.0),
        bloomEnabled: true,
        bloomRadius: 0.40,
        bloomStrength: 0.55,
      };
    case 'high':
      return {
        tier: 'high',
        particleCount: 180000,
        nebulaCount: 3000,
        starCount: 12000,
        dpr: Math.min(window.devicePixelRatio || 1, 1.75),
        bloomEnabled: true,
        bloomRadius: 0.45,
        bloomStrength: 0.60,
      };
    case 'medium':
      return {
        tier: 'medium',
        particleCount: 100000,
        nebulaCount: 2000,
        starCount: 8000,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        bloomEnabled: true,
        bloomRadius: 0.35,
        bloomStrength: 0.45,
      };
    case 'low':
      return {
        tier: 'low',
        particleCount: 50000,
        nebulaCount: 1200,
        starCount: 4000,
        dpr: Math.min(window.devicePixelRatio || 1, 1.25),
        bloomEnabled: false,
        bloomRadius: 0.30,
        bloomStrength: 0.35,
      };
  }
}
