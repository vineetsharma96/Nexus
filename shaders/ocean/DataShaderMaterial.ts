import * as THREE from "three";

/**
 * Custom GLSL Shader for Data Ocean Particles
 * Features:
 * - Anti-aliased circular disc attenuation
 * - Dynamic size scaling with distance
 * - Additive chromatic glow
 */
export const DataParticleShader = {
  uniforms: {
    uTime: { value: 0 },
    uPointSize: { value: 24.0 },
    uSpeed: { value: 1.0 },
  },

  vertexShader: `
    precision highp float;
    uniform float uTime;
    uniform float uPointSize;

    attribute vec3 color;
    varying vec3 vColor;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      // Safe distance attenuation without division by zero or negative size
      float distZ = max(0.5, -mvPosition.z);
      gl_PointSize = clamp(uPointSize * (30.0 / distZ), 1.0, 64.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    precision highp float;
    varying vec3 vColor;

    void main() {
      // Convert point to soft anti-aliased circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);

      if (dist > 0.5) {
        discard;
      }

      // Soft glow falloff
      float strength = 1.0 - smoothstep(0.0, 0.5, dist);
      strength = pow(strength, 1.8);

      gl_FragColor = vec4(vColor * 1.4, strength * 0.9);
    }
  `,
};
