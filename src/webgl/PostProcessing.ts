import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Subtle Vignette & Cosmic Color Grading Shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.85 },
    uOffset: { value: 1.05 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);
      float dist = length(uv);
      // Soft elliptical cosmic vignette
      float vignette = smoothstep(0.8, 0.2, dist * (uDarkness + 0.2));
      
      // Keep background deep black #020208 without muddy grey tint
      vec3 bg = vec3(0.008, 0.008, 0.031);
      vec3 finalCol = mix(bg, tex.rgb, clamp(vignette, 0.0, 1.0));
      
      gl_FragColor = vec4(finalCol, tex.a);
    }
  `,
};

export class PostProcessingPipeline {
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;
  public renderPass: RenderPass;
  public vignettePass: ShaderPass;
  private enabled = true;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    bloomStrength = 0.85,
    bloomRadius = 0.6,
    bloomThreshold = 0.55
  ) {
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      samples: 4,
    });

    this.composer = new EffectComposer(renderer, renderTarget);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);
  }

  public setSize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  public setBloomParams(strength: number, radius: number, threshold = 0.55) {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public render() {
    this.composer.render();
  }

  public dispose() {
    this.composer.dispose();
  }
}
