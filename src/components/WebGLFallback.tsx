import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const WebGLFallback: React.FC = () => {
  return (
    <div className="webgl-fallback-container">
      <div className="fallback-cosmic-glow" />
      <div className="fallback-card">
        <div className="fallback-icon">
          <AlertTriangle className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="fallback-title">WebGL Accelerator Required</h2>
        <p className="fallback-desc">
          Your browser or graphics hardware does not currently support hardware-accelerated WebGL.
          Please enable hardware acceleration in your browser settings to experience the deep-space particle simulation.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="fallback-button"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Initialization
        </button>
      </div>
    </div>
  );
};
