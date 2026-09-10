"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";

export const Lighting: React.FC = () => {
  const lightingIntensity = useWorldStore((state) => state.lightingIntensity);
  const colorScheme = useWorldStore((state) => state.colorScheme);

  // Dynamic light tint depending on colorScheme
  const keyColor =
    colorScheme === "amber"
      ? "#f59e0b"
      : colorScheme === "cyber"
      ? "#10b981"
      : "#00f0ff";

  return (
    <>
      {/* Subtle ambient fill to keep shadows deep and cinematic */}
      <ambientLight intensity={0.25 * lightingIntensity} color="#0f172a" />

      {/* Cool directional key light */}
      <directionalLight
        position={[20, 30, 20]}
        intensity={0.8 * lightingIntensity}
        color="#e0f2fe"
      />

      {/* Rim light from behind */}
      <directionalLight
        position={[-20, 10, -20]}
        intensity={0.6 * lightingIntensity}
        color={keyColor}
      />

      {/* Atmospheric Fog */}
      <fog attach="fog" args={["#030712", 20, 90]} />
    </>
  );
};
