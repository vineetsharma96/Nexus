import * as THREE from "three";

/**
 * Custom GLSL Shader for the Warp Portals
 * Features:
 * - Polar logarithmic spiral accretion disc
 * - Relativistic swirling energy glow
 * - Dynamic color uniform
 */
export const PortalShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#00f0ff") },
    uSpeed: { value: 2.0 },
    uSwirlStrength: { value: 4.0 },
  },

  vertexShader: `
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    precision highp float;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    uniform float uSwirlStrength;

    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Centered UV: [-1, 1]
      vec2 p = vUv * 2.0 - 1.0;
      float r = length(p);
      float theta = atan(p.y, p.x + 0.00001);

      // Logarithmic spiral twist
      float spiral = theta + r * uSwirlStrength - uTime * uSpeed;

      // Event horizon outer ring glow
      float ring = sin(spiral * 4.0) * 0.5 + 0.5;
      float edgeFade = smoothstep(1.0, 0.4, r) * smoothstep(0.1, 0.4, r);

      // Core black hole void
      float coreHole = smoothstep(0.15, 0.25, r);

      vec3 color = uColor * (ring * 1.5 + 0.5) * coreHole;
      float alpha = edgeFade * (0.4 + 0.6 * ring);

      gl_FragColor = vec4(color, alpha);
    }
  `,
};
