"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { QualityTier } from "@/types/world";

const TIER_ORDER: QualityTier[] = ["low", "medium", "high", "ultra"];

export const AdaptiveQualityMonitor: React.FC = () => {
  const qualityTier = useWorldStore((state) => state.qualityTier);
  const setQualityTier = useWorldStore((state) => state.setQualityTier);
  const setFps = useWorldStore((state) => state.setFps);

  const frameCount = useRef(0);
  const lastIntervalTime = useRef(performance.now());
  const lowFpsCount = useRef(0);
  const highFpsCount = useRef(0);
  const lastChangeTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current += 1;
    const now = performance.now();
    const elapsed = now - lastIntervalTime.current;

    // Evaluate rolling FPS every 500ms
    if (elapsed >= 500) {
      const currentFps = Math.round((frameCount.current * 1000) / elapsed);
      setFps(currentFps);

      frameCount.current = 0;
      lastIntervalTime.current = now;

      // Hysteresis cooldown: wait 8 seconds after any tier change before adjusting again
      if (now - lastChangeTime.current < 8000) {
        return;
      }

      const currentIdx = TIER_ORDER.indexOf(qualityTier);

      // Downgrade condition: FPS below 28 for 4 consecutive intervals (2.0s)
      if (currentFps < 28) {
        lowFpsCount.current += 1;
        highFpsCount.current = 0;

        if (lowFpsCount.current >= 4 && currentIdx > 0) {
          const lowerTier = TIER_ORDER[currentIdx - 1];
          console.warn(`[NEXUS PERFORMANCE] Adaptive Downgrade: ${qualityTier} -> ${lowerTier} (Rolling FPS: ${currentFps})`);
          setQualityTier(lowerTier);
          lastChangeTime.current = now;
          lowFpsCount.current = 0;
        }
      }
      // Upgrade condition: FPS consistently above 56 for 24 consecutive intervals (12.0s)
      else if (currentFps > 56) {
        highFpsCount.current += 1;
        lowFpsCount.current = 0;

        if (highFpsCount.current >= 24 && currentIdx < TIER_ORDER.length - 1) {
          const higherTier = TIER_ORDER[currentIdx + 1];
          console.log(`[NEXUS PERFORMANCE] Adaptive Upgrade: ${qualityTier} -> ${higherTier} (Rolling FPS: ${currentFps})`);
          setQualityTier(higherTier);
          lastChangeTime.current = now;
          highFpsCount.current = 0;
        }
      } else {
        // Stable nominal range
        lowFpsCount.current = 0;
        highFpsCount.current = 0;
      }
    }
  });

  return null;
};
