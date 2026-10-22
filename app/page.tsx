"use client";

import React from "react";
import dynamic from "next/dynamic";
import { BootScreen } from "@/components/ui/BootScreen";
import { TelemetryHUD } from "@/components/ui/TelemetryHUD";
import { Terminal } from "@/components/ui/Terminal";
import { InspectModal } from "@/components/ui/InspectModal";
import { TourOverlay } from "@/components/ui/TourOverlay";
import { SandboxControls } from "@/components/ui/SandboxControls";
import { MobileNavControls } from "@/components/ui/MobileNavControls";
import { WarpFlash } from "@/components/ui/WarpFlash";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ARComputerVisionHUD } from "@/components/ui/ARComputerVisionHUD";
import { AccessibilityControls } from "@/components/a11y/AccessibilityControls";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { useScrollWorld } from "@/hooks/useScrollWorld";

// Dynamically import Canvas with SSR disabled to ensure pure client-side WebGL lifecycle
const NexusCanvas = dynamic(() => import("@/components/canvas/NexusCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#030712]">
      <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
    </div>
  ),
});

export default function NexusExperience() {
  const isBooted = useWorldStore((state) => state.isBooted);
  const currentZone = useWorldStore((state) => state.currentZone);
  const colorScheme = useWorldStore((state) => state.colorScheme);
  const isArMode = useWorldStore((state) => state.isArMode);
  const activeZoneMeta = ZONES_METADATA[currentZone];

  // Dynamic ambient glow depending on colorScheme or zone
  const ambientColor =
    colorScheme === "amber"
      ? "#f59e0b"
      : colorScheme === "cyber"
      ? "#10b981"
      : colorScheme === "monochrome"
      ? "#64748b"
      : activeZoneMeta.color;

  // Enable scroll-driven movement across zones
  useScrollWorld();

  return (
    <main
      className={`relative w-full h-[100dvh] overflow-hidden text-slate-100 ${
        isArMode ? "bg-transparent" : "bg-[#030712]"
      }`}
    >
      {/* Background Matrix & Tech Grid Shell */}
      <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none z-10" />
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none z-10" />

      {/* Dynamic Zone Ambient Light Glow */}
      {!isArMode && (
        <div
          className="absolute inset-0 transition-colors duration-1000 pointer-events-none opacity-25"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${ambientColor}33 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Primary 3D WebGL Canvas Layer */}
      <div id="nexus-canvas-container" className="absolute inset-0 z-10">
        <NexusCanvas />
      </div>

      {/* AR Camera Passthrough & Computer Vision Hand Pinch Tracking HUD */}
      <ARComputerVisionHUD />

      {/* Futuristic Custom Cursor Reticle (Desktop) */}
      <CustomCursor />

      {/* Touch-friendly Quick Nav Controls (Mobile) */}
      <MobileNavControls />

      {/* Cinematic Warp Distortion Streak on Zone Shift */}
      <WarpFlash />

      {/* Interactive Overlays & HUD */}
      <AccessibilityControls />
      <TelemetryHUD />
      <InspectModal />
      <TourOverlay />
      <SandboxControls />
      <Terminal />

      {/* System Boot Calibrator */}
      <BootScreen />
    </main>
  );
}
