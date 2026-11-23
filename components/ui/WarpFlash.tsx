"use client";

import React, { useEffect, useState } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

export const WarpFlash: React.FC = () => {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useWorldStore.subscribe((state, prevState) => {
      if (
        !state.isBooted ||
        state.isReducedMotion ||
        state.currentZone === prevState.currentZone ||
        !state.previousZone
      ) {
        return;
      }

      setIsFlashing(true);
      ProceduralAudio.playPortalWarp();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsFlashing(false);
      }, 600);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!isFlashing) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-500 ease-out flex items-center justify-center">
      {/* High-energy central flash */}
      <div className="absolute inset-0 bg-cyan-400/20 mix-blend-screen animate-pulse" />

      {/* Radial warp streak */}
      <div className="w-[800px] h-[800px] rounded-full border-4 border-cyan-400/40 animate-ping opacity-60" />

      {/* Peripheral Vignette Flare */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 240, 255, 0.25) 100%)",
        }}
      />
    </div>
  );
};
