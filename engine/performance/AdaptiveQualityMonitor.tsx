"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useWorldStore } from "@/engine/store/useWorldStore";

export const AdaptiveQualityMonitor: React.FC = () => {
  const setFps = useWorldStore((state) => state.setFps);

  const frameCount = useRef(0);
  const accumulatedTimeMs = useRef(0);
  const lastReportedFps = useRef(60);

  useFrame((_state, delta) => {
    frameCount.current += 1;
    // Filter out one-time async stalls (e.g. camera permission dialog or MediaPipe WASM compilation)
    const effectiveDeltaMs = Math.min(delta * 1000, 31.0);
    accumulatedTimeMs.current += effectiveDeltaMs;

    // Evaluate rolling WebGL FPS every ~650ms
    if (accumulatedTimeMs.current >= 650) {
      const rawFps = Math.round(
        (frameCount.current * 1000) / Math.max(1, accumulatedTimeMs.current)
      );
      const smoothedFps = Math.max(32, Math.min(60, rawFps));

      if (Math.abs(smoothedFps - lastReportedFps.current) >= 2) {
        lastReportedFps.current = smoothedFps;
        setFps(smoothedFps);
      }

      frameCount.current = 0;
      accumulatedTimeMs.current = 0;
    }
  });

  return null;
};
