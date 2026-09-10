"use client";

import { useEffect, useRef } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZoneId } from "@/types/world";

const ZONE_SEQUENCE: ZoneId[] = ["core", "code_city", "data_ocean", "ai_lab"];

export const useScrollWorld = () => {
  const currentZone = useWorldStore((state) => state.currentZone);
  const setZone = useWorldStore((state) => state.setZone);
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const isTerminalOpen = useWorldStore((state) => state.isTerminalOpen);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);

  const accumulatedDelta = useRef(0);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Don't scroll if terminal is open, tour is active, or modal is inspecting
      if (isTerminalOpen || isTourActive || selectedPoi) return;

      const now = performance.now();
      accumulatedDelta.current += e.deltaY;

      // Threshold to advance zone: 180 delta with at least 800ms between transitions
      if (now - lastScrollTime.current > 800) {
        const currentIndex = ZONE_SEQUENCE.indexOf(currentZone);

        if (accumulatedDelta.current > 160) {
          // Scroll Down / Forward: next zone
          accumulatedDelta.current = 0;
          lastScrollTime.current = now;
          const nextIndex = (currentIndex + 1) % ZONE_SEQUENCE.length;
          setZone(ZONE_SEQUENCE[nextIndex]);
        } else if (accumulatedDelta.current < -160) {
          // Scroll Up / Backward: previous zone
          accumulatedDelta.current = 0;
          lastScrollTime.current = now;
          const prevIndex = (currentIndex - 1 + ZONE_SEQUENCE.length) % ZONE_SEQUENCE.length;
          setZone(ZONE_SEQUENCE[prevIndex]);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentZone, setZone, isTourActive, isTerminalOpen, selectedPoi]);
};
