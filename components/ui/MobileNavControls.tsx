"use client";

import React, { useEffect, useState } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZoneId } from "@/types/world";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export const MobileNavControls: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const currentZone = useWorldStore((state) => state.currentZone);
  const setZone = useWorldStore((state) => state.setZone);
  const resetWorld = useWorldStore((state) => state.resetWorld);
  const isBooted = useWorldStore((state) => state.isBooted);
  const isTerminalOpen = useWorldStore((state) => state.isTerminalOpen);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const isSandboxOpen = useWorldStore((state) => state.isSandboxOpen);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (
    !isMobile ||
    !isBooted ||
    isTerminalOpen ||
    selectedPoi ||
    isTourActive ||
    isCvEnabled ||
    isSandboxOpen
  ) {
    return null;
  }

  const ZONE_CYCLE: ZoneId[] = ["core", "code_city", "data_ocean", "ai_lab"];

  const handleNext = () => {
    const idx = ZONE_CYCLE.indexOf(currentZone);
    setZone(ZONE_CYCLE[(idx + 1) % ZONE_CYCLE.length]);
  };

  const handlePrev = () => {
    const idx = ZONE_CYCLE.indexOf(currentZone);
    setZone(ZONE_CYCLE[(idx - 1 + ZONE_CYCLE.length) % ZONE_CYCLE.length]);
  };

  return (
    <div className="fixed bottom-14 right-2.5 z-20 flex flex-col items-center space-y-1.5 font-mono pointer-events-auto select-none">
      {/* Step Next Zone */}
      <button
        type="button"
        onClick={handleNext}
        className="w-10 h-10 rounded-full glass-panel-glow border border-cyan-400/50 flex items-center justify-center text-cyan-300 active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
        title="Next Zone"
        aria-label="Next Zone"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Step Prev Zone */}
      <button
        type="button"
        onClick={handlePrev}
        className="w-10 h-10 rounded-full glass-panel border border-white/20 flex items-center justify-center text-slate-300 active:scale-95"
        title="Previous Zone"
        aria-label="Previous Zone"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Quick Reset to Core */}
      <button
        type="button"
        onClick={resetWorld}
        className="w-8 h-8 rounded-full glass-panel border border-white/10 flex items-center justify-center text-slate-400 active:scale-95 text-[10px]"
        title="Reset to Core"
        aria-label="Reset to Core"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
