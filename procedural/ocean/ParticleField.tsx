"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { DataParticleShader } from "@/shaders/ocean/DataShaderMaterial";
import { OceanState } from "@/types/world";

interface ParticleFieldProps {
  baseCount?: number;
  origin?: [number, number, number];
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  baseCount = 18000,
  origin = [70, -10, 40],
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const oceanState = useWorldStore((state) => state.oceanState);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const qualityTier = useWorldStore((state) => state.qualityTier);

  // Quality adaptive count
  const count = useMemo(() => {
    switch (qualityTier) {
      case "ultra":
        return Math.floor(baseCount * 1.5);
      case "high":
        return baseCount;
      case "medium":
        return Math.floor(baseCount * 0.5);
      case "low":
        return Math.floor(baseCount * 0.25);
      default:
        return baseCount;
    }
  }, [baseCount, qualityTier]);

  // Create custom shader material for soft circular particle discs
  const particleShaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DataParticleShader.uniforms),
      vertexShader: DataParticleShader.vertexShader,
      fragmentShader: DataParticleShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  // Precompute target position buffers for each mathematical state
  const { chaosPositions, wavePositions, latticePositions, spherePositions, currentPositions, colors } =
    useMemo(() => {
      const chaos = new Float32Array(count * 3);
      const wave = new Float32Array(count * 3);
      const lattice = new Float32Array(count * 3);
      const sphere = new Float32Array(count * 3);
      const current = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      const color1 = new THREE.Color("#8b5cf6"); // violet
      const color2 = new THREE.Color("#00f0ff"); // cyan
      const color3 = new THREE.Color("#ec4899"); // magenta

      const side = Math.cbrt(count);
      const spacing = 1.2;
      const phi = Math.PI * (3 - Math.sqrt(5));
      const sphereRadius = 14;

      for (let i = 0; i < count; i++) {
        // CHAOS
        chaos[i * 3] = (Math.random() - 0.5) * 60;
        chaos[i * 3 + 1] = (Math.random() - 0.5) * 30;
        chaos[i * 3 + 2] = (Math.random() - 0.5) * 60;

        // WAVE
        const u = ((i % 150) / 150 - 0.5) * 55;
        const v = (Math.floor(i / 150) / (count / 150) - 0.5) * 55;
        wave[i * 3] = u;
        wave[i * 3 + 1] = 0;
        wave[i * 3 + 2] = v;

        // LATTICE
        const lx = ((i % side) - side / 2) * spacing;
        const ly = ((Math.floor(i / side) % side) - side / 2) * spacing;
        const lz = ((Math.floor(i / (side * side))) - side / 2) * spacing;
        lattice[i * 3] = lx;
        lattice[i * 3 + 1] = ly;
        lattice[i * 3 + 2] = lz;

        // SPHERE
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = phi * i;
        sphere[i * 3] = Math.cos(theta) * r * sphereRadius;
        sphere[i * 3 + 1] = y * sphereRadius;
        sphere[i * 3 + 2] = Math.sin(theta) * r * sphereRadius;

        current[i * 3] = wave[i * 3];
        current[i * 3 + 1] = wave[i * 3 + 1];
        current[i * 3 + 2] = wave[i * 3 + 2];

        const t = i / count;
        const c = t < 0.5 ? color1.clone().lerp(color2, t * 2) : color2.clone().lerp(color3, (t - 0.5) * 2);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }

      return {
        chaosPositions: chaos,
        wavePositions: wave,
        latticePositions: lattice,
        spherePositions: sphere,
        currentPositions: current,
        colors: col,
      };
    }, [count]);

  const activeStateRef = useRef<OceanState>(oceanState);
  const simTimeRef = useRef(0);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);

  useEffect(() => {
    activeStateRef.current = oceanState;
  }, [oceanState]);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    if (!isActivityPaused) {
      simTimeRef.current += delta * environmentSpeed;
    }
    const time = simTimeRef.current;
    const active = activeStateRef.current;

    // Update shader time uniform
    if (particleShaderMaterial) {
      particleShaderMaterial.uniforms.uTime.value = time;
    }

    const lerpSpeed = isActivityPaused ? 0 : Math.min(1.0, delta * 3.5);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;

      if (active === "wave") {
        targetX = wavePositions[idx];
        const u = wavePositions[idx] * 0.12;
        const v = wavePositions[idx + 2] * 0.12;
        targetY =
          Math.sin(u + time * 1.5) * 2.2 +
          Math.cos(v + time * 1.2) * 1.8 +
          Math.sin((u + v) * 0.5 + time) * 1.0;
        targetZ = wavePositions[idx + 2];
      } else if (active === "sphere") {
        targetX = spherePositions[idx];
        targetY = spherePositions[idx + 1];
        targetZ = spherePositions[idx + 2];
      } else if (active === "lattice") {
        targetX = latticePositions[idx];
        targetY = latticePositions[idx + 1];
        targetZ = latticePositions[idx + 2];
      } else {
        targetX = chaosPositions[idx] + Math.sin(time + i) * 0.2;
        targetY = chaosPositions[idx + 1] + Math.cos(time + i) * 0.2;
        targetZ = chaosPositions[idx + 2];
      }

      posArray[idx] += (targetX - posArray[idx]) * lerpSpeed;
      posArray[idx + 1] += (targetY - posArray[idx + 1]) * lerpSpeed;
      posArray[idx + 2] += (targetZ - posArray[idx + 2]) * lerpSpeed;
    }

    posAttr.needsUpdate = true;

    if (active === "sphere" || active === "lattice") {
      pointsRef.current.rotation.y = time * 0.1;
      pointsRef.current.rotation.x = Math.sin(time * 0.05) * 0.05;
    } else {
      pointsRef.current.rotation.set(0, 0, 0);
    }

    const targetScale = useWorldStore.getState().objectScale;
    const nextScale = THREE.MathUtils.lerp(pointsRef.current.scale.x, targetScale, 0.16);
    pointsRef.current.scale.setScalar(nextScale);
  });

  return (
    <group position={origin}>
      <points ref={pointsRef} material={particleShaderMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
      </points>

      {/* Center Point Light in Data Ocean */}
      <pointLight color="#8b5cf6" intensity={3.0} distance={40} decay={2} />
    </group>
  );
};
