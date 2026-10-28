"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "@/engine/store/useWorldStore";

interface CoreParticlesProps {
  count?: number;
  radius?: number;
}

export const CoreParticles: React.FC<CoreParticlesProps> = ({
  count = 1500,
  radius = 5.5,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const simTimeRef = useRef(0);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);
  const qualityTier = useWorldStore((state) => state.qualityTier);

  // Adjust count dynamically based on quality tier
  const effectiveCount = useMemo(() => {
    switch (qualityTier) {
      case "ultra":
        return count * 1.5;
      case "high":
        return count;
      case "medium":
        return count * 0.5;
      case "low":
        return count * 0.25;
      default:
        return count;
    }
  }, [count, qualityTier]);

  const { positions, colors, randomOffsets } = useMemo(() => {
    const pos = new Float32Array(effectiveCount * 3);
    const col = new Float32Array(effectiveCount * 3);
    const offsets = new Float32Array(effectiveCount);

    const baseColor1 = new THREE.Color("#00f0ff");
    const baseColor2 = new THREE.Color("#3b82f6");
    const baseColor3 = new THREE.Color("#8b5cf6");
    const tempColor = new THREE.Color();

    for (let i = 0; i < effectiveCount; i++) {
      // Spherical distribution with slight radial variance
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.8 + Math.random() * 0.6);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Interpolate colors between cyan, blue, and purple
      const cRand = Math.random();
      const c =
        cRand < 0.5
          ? tempColor.copy(baseColor1).lerp(baseColor2, cRand * 2)
          : tempColor.copy(baseColor2).lerp(baseColor3, (cRand - 0.5) * 2);

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      offsets[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, colors: col, randomOffsets: offsets };
  }, [effectiveCount, radius]);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    if (!isActivityPaused) {
      simTimeRef.current += delta * environmentSpeed;
    }
    const time = simTimeRef.current;

    // Slow orbital rotation
    pointsRef.current.rotation.y = time * 0.15;
    pointsRef.current.rotation.x = Math.sin(time * 0.08) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
