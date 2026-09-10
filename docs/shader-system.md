# NEXUS Custom GLSL Shader System

To create bespoke futuristic visuals without third-party textures or materials, NEXUS implements three custom GLSL shaders running directly on the GPU.

---

## 1. AI Core Energy Shader (`shaders/core/CoreShaderMaterial.ts`)

The AI Core shell uses a custom vertex and fragment shader with 3D simplex noise displacement and physical Fresnel rim lighting.

### Vertex Shader Highlights:
- Calculates normal and view vector in camera space:
  ```glsl
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vViewDirection = normalize(cameraPosition - worldPos.xyz);
  ```
- Displaces vertices along their normals based on dynamic time-varying 3D simplex noise:
  ```glsl
  float displacement = snoise(position * 0.4 + vec3(uTime * 0.3)) * 0.15 * uIntensity;
  vec3 newPosition = position + normal * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  ```

### Fragment Shader Highlights:
- Computes physical Fresnel factor for an ethereal outer rim glow:
  ```glsl
  float fresnel = dot(vNormal, vViewDirection);
  fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
  fresnel = pow(fresnel, 2.5);
  vec3 finalColor = mix(uCoreColor, uGlowColor, fresnel * uIntensity);
  gl_FragColor = vec4(finalColor, fresnel * 0.85);
  ```

---

## 2. Relativistic Warp Portal Shader (`shaders/portal/PortalShaderMaterial.ts`)

Warp portals feature an accretion disk event-horizon vortex with polar coordinate spiraling:

### Polar Coordinate Transformation:
```glsl
vec2 uv = vUv - 0.5;
float r = length(uv) * 2.0;
float theta = atan(uv.y, uv.x);
```

### Relativistic Spiral Distortion:
```glsl
float spiral = sin(theta * 6.0 + r * 12.0 - uTime * uSpeed) * 0.5 + 0.5;
float ring = sin(r * 25.0 - uTime * uSpeed * 1.5) * 0.5 + 0.5;
float edgeFade = smoothstep(1.0, 0.7, r) * smoothstep(0.0, 0.25, r);
float alpha = (spiral * 0.6 + ring * 0.4) * edgeFade;
gl_FragColor = vec4(uColor * (1.2 + spiral * 0.8), alpha);
```

This creates an intense spinning singularity effect that speeds up when hovered.

---

## 3. Data Ocean Particle Shader (`shaders/ocean/DataShaderMaterial.ts`)

Standard Three.js points render square pixels. NEXUS uses a custom point fragment shader to render mathematically anti-aliased circular disks with distance-attenuated transparency:

```glsl
// gl_PointCoord ranges from (0,0) to (1,1) within the point quad
vec2 coord = gl_PointCoord - vec2(0.5);
float dist = length(coord);
if (dist > 0.5) {
  discard;
}

// Anti-aliased circular rim
float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
gl_FragColor = vec4(vColor, alpha);
```
