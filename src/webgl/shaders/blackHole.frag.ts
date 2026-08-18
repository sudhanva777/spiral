export const blackHoleFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vType;
varying float vDoppler;
varying float vCustomGlow;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord);

  if (r > 0.5) {
    discard;
  }

  float core = 1.0 - smoothstep(0.0, 0.18, r);
  float mid = 1.0 - smoothstep(0.08, 0.38, r);
  float halo = 1.0 - smoothstep(0.20, 0.50, r);

  float shape = core * 0.65 + mid * 0.25 + halo * 0.10;

  // Tailor shape profile based on particle type
  if (vType > 1.5 && vType < 2.5) {
    // Photon ring: ultra-sharp intense laser core
    shape = pow(1.0 - smoothstep(0.0, 0.35, r), 1.8);
  } else if (vType > 3.5 && vType < 4.5) {
    // Vertical plasma corona: soft volumetric thermal cloud
    shape = pow(1.0 - smoothstep(0.0, 0.50, r), 1.3);
  } else if (vType > 4.5 && vType < 5.5) {
    // Light rays: streak profile
    shape = (1.0 - smoothstep(0.0, 0.22, r)) * 0.8 + halo * 0.2;
  }

  // Base relativistic Doppler modulated color
  vec3 finalColor = vColor * vDoppler * vCustomGlow;

  // Relativistic Doppler spectral temperature shift
  if (vDoppler > 1.1) {
    // Approaching: blueshift / extreme temperature white-blue boost
    float blueShift = clamp((vDoppler - 1.1) * 0.9, 0.0, 1.2);
    finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), blueShift * 0.45);
    finalColor += vec3(0.25, 0.40, 0.75) * blueShift * core;
  } else if (vDoppler < 0.9) {
    // Receding: redshift / cooler amber-red
    float redShift = clamp((0.9 - vDoppler) * 1.2, 0.0, 0.8);
    finalColor = mix(finalColor, finalColor * vec3(1.15, 0.55, 0.35), redShift);
  }

  // Specular core highlights
  if (vType > 1.5 && vType < 2.5) {
    finalColor += vec3(0.7, 0.75, 0.95) * pow(core, 2.0);
  } else if (vType > 2.5 && vType < 3.5) {
    finalColor += vec3(0.4, 0.35, 0.25) * core;
  } else if (vType < 0.5) {
    finalColor += vec3(0.3, 0.25, 0.2) * core;
  }

  float alpha = shape * vAlpha;
  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;
