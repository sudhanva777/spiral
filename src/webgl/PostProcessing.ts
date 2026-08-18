import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Composite Chromatic Gravitational Lensing, Vignette & Deep Cosmic Grading Shader
const CosmicCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.85 },
    uOffset: { value: 1.05 },
    // Gravitational Lensing Uniforms
    uLensActive: { value: 0.0 },
    uLensPos: { value: new THREE.Vector2(0.5, 0.5) },
    uLensRadius: { value: 0.05 },
    uAspectRatio: { value: 1.0 },
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
    uniform float uLensActive;
    uniform vec2 uLensPos;
    uniform float uLensRadius;
    uniform float uAspectRatio;
    varying vec2 vUv;

    void main() {
      vec2 sampleUv = vUv;
      vec3 finalTexRgb = vec3(0.0);
      float finalAlpha = 1.0;

      // Relativistic Gravitational Lensing Warp (Light bending around Event Horizon)
      if (uLensActive > 0.01) {
        vec2 delta = (vUv - uLensPos) * vec2(uAspectRatio, 1.0);
        float dist = length(delta);
        float rEin = uLensRadius;

        if (dist > 0.0001 && dist < rEin * 5.0) {
          // Gravitational deflection angle ~ Einstein ring radius squared / dist
          float deflection = (rEin * rEin) / max(dist, rEin * 0.40);
          float warpStrength = smoothstep(rEin * 5.0, rEin * 0.35, dist) * uLensActive;
          vec2 normDir = normalize(delta) * vec2(1.0 / uAspectRatio, 1.0);

          // Chromatic Dispersion (Red, Green, Blue bend with subtle relativistic wavelength variations)
          vec2 shiftR = normDir * deflection * 0.88 * warpStrength;
          vec2 shiftG = normDir * deflection * 0.85 * warpStrength;
          vec2 shiftB = normDir * deflection * 0.82 * warpStrength;

          vec4 texR = texture2D(tDiffuse, vUv - shiftR);
          vec4 texG = texture2D(tDiffuse, vUv - shiftG);
          vec4 texB = texture2D(tDiffuse, vUv - shiftB);

          finalTexRgb = vec3(texR.r, texG.g, texB.b);
          finalAlpha = (texR.a + texG.a + texB.a) * 0.3333;

          // Shadow capture inside event horizon boundary
          if (dist < rEin * 0.55) {
            float shadowFade = smoothstep(rEin * 0.25, rEin * 0.55, dist);
            finalTexRgb *= shadowFade;
          }
        } else {
          vec4 tex = texture2D(tDiffuse, vUv);
          finalTexRgb = tex.rgb;
          finalAlpha = tex.a;
        }
      } else {
        vec4 tex = texture2D(tDiffuse, vUv);
        finalTexRgb = tex.rgb;
        finalAlpha = tex.a;
      }

      vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);
      float dist = length(uv);

      // Soft elliptical cosmic vignette
      float vignette = smoothstep(0.8, 0.2, dist * (uDarkness + 0.2));
      
      // Deep space black #020208
      vec3 bg = vec3(0.008, 0.008, 0.031);
      vec3 finalCol = mix(bg, finalTexRgb, clamp(vignette, 0.0, 1.0));
      
      gl_FragColor = vec4(finalCol, finalAlpha);
    }
  `,
};

export class PostProcessingPipeline {
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;
  public renderPass: RenderPass;
  public compositePass: ShaderPass;
  private enabled = true;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    bloomStrength = 0.55,
    bloomRadius = 0.40,
    bloomThreshold = 0.70
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

    this.compositePass = new ShaderPass(CosmicCompositeShader);
    this.compositePass.uniforms.uAspectRatio.value = width / height;
    this.composer.addPass(this.compositePass);
  }

  public setSize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
    this.compositePass.uniforms.uAspectRatio.value = width / height;
  }

  public setBloomParams(strength: number, radius: number, threshold = 0.55) {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  public updateLensing(active: boolean, screenPos: THREE.Vector2, radius: number) {
    this.compositePass.uniforms.uLensActive.value = active ? 1.0 : 0.0;
    this.compositePass.uniforms.uLensPos.value.copy(screenPos);
    this.compositePass.uniforms.uLensRadius.value = radius;
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
