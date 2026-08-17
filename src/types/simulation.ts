export type QualityTier = 'ultra' | 'high' | 'medium' | 'low';

export type InteractionState =
  | 'CINEMATIC'
  | 'EXPLORING'
  | 'GRAVITY_INTERACTION'
  | 'PULSE'
  | 'CORE_TRANSITION'
  | 'CORE_INSPECTION'
  | 'RETURNING';

export interface QualityConfig {
  tier: QualityTier;
  particleCount: number;
  nebulaCount: number;
  starCount: number;
  foregroundDustCount: number;
  dpr: number;
  bloomEnabled: boolean;
  bloomRadius: number;
  bloomStrength: number;
}

export interface GalaxyPreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  speed: number;
  spiralTightness: number;
  turbulence: number;
  coreDensity: number;
  colorScheme: 'hypernova' | 'andromeda' | 'electricBlue' | 'cosmicRose' | 'deepNebula';
  coreGlowSize: number;
  gravityStrength: number;
  tiltAngle: number;
}

export interface SimulationStats {
  fps: number;
  particleCount: number;
  drawCalls: number;
  tier: QualityTier;
  mouseNormalized: { x: number; y: number };
  cameraDistance: number;
}

export interface AudioState {
  isPlaying: boolean;
  volume: number;
}
