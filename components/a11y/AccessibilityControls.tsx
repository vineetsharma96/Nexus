"use client";

import React, { useEffect } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { ScreenReaderLive } from "./ScreenReaderLive";
import { EasterEggManager } from "@/engine/easter/EasterEggs";

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export const AccessibilityControls: React.FC = () => {
  const currentZone = useWorldStore((state) => state.currentZone);
  const setZone = useWorldStore((state) => state.setZone);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const toggleTerminal = useWorldStore((state) => state.toggleTerminal);
  const toggleAudio = useWorldStore((state) => state.toggleAudio);
  const setReducedMotion = useWorldStore((state) => state.setReducedMotion);

  // Check system media query for reduced motion safely
  useEffect(() => {
    try {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent | MediaQueryList) => setReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handler as EventListener);
        return () => mediaQuery.removeEventListener("change", handler as EventListener);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(handler);
        return () => (mediaQuery as any).removeListener(handler);
      }
    } catch {
      // Gracefully fall back if matchMedia unsupported on mobile
    }
  }, [setReducedMotion]);

  // Global Keyboard Shortcuts & Easter Eggs
  useEffect(() => {
    let konamiIndex = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // Check Konami Code
      const expectedKey = KONAMI_CODE[konamiIndex];
      if (e.key.toLowerCase() === expectedKey.toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === KONAMI_CODE.length) {
          EasterEggManager.triggerKonami();
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }

      switch (e.key) {
        case "1":
          setZone("core");
          break;
        case "2":
          setZone("code_city");
          break;
        case "3":
          setZone("data_ocean");
          break;
        case "4":
          setZone("ai_lab");
          break;
        case " ":
          e.preventDefault();
          // Inspect current zone primary POI
          const primaryPoi = ZONES_METADATA[currentZone]?.pois[0];
          if (primaryPoi) {
            setSelectedPoi(primaryPoi);
          }
          break;
        case "/":
        case "t":
        case "T":
          e.preventDefault();
          toggleTerminal();
          break;
        case "m":
        case "M":
          toggleAudio();
          break;
        case "Escape":
          useWorldStore.getState().setTerminalOpen(false);
          useWorldStore.getState().setSelectedPoi(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentZone, setZone, setSelectedPoi, toggleTerminal, toggleAudio]);

  return (
    <>
      {/* Skip to Main Interactive Content for Screen Readers */}
      <a
        href="#main-telemetry"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-cyan-950 text-cyan-300 border border-cyan-400 font-mono text-xs rounded"
      >
        Skip 3D Viewport to Navigation Telemetry
      </a>

      {/* Screen Reader Dynamic ARIA Live Region */}
      <ScreenReaderLive />
    </>
  );
};
