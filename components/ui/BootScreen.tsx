"use client";

import React, { useEffect, useState, useRef } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";
import { Cpu, Terminal, Sparkles, Orbit, ShieldCheck } from "lucide-react";

interface BootStage {
  label: string;
  subtext: string;
  weight: number; // cumulative target percentage
  icon: React.ReactNode;
}

const BOOT_STAGES: BootStage[] = [
  {
    label: "INITIALIZING NEXUS RUNTIME",
    subtext: "Binding WebGL2 context & React Three Fiber pipeline...",
    weight: 20,
    icon: <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />,
  },
  {
    label: "CALIBRATING PROCEDURAL ALGORITHMS",
    subtext: "Seeding Mulberry32 PRNG & generating building facets...",
    weight: 45,
    icon: <Terminal className="w-5 h-5 text-emerald-400 animate-pulse" />,
  },
  {
    label: "SYNTHESIZING MATHEMATICAL FIELDS",
    subtext: "Buffering 40,000 harmonic particle vectors in GPU memory...",
    weight: 70,
    icon: <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />,
  },
  {
    label: "COMPILING GLSL SHADER KERNELS",
    subtext: "Linking simplex noise, Fresnel dispersion, and event-horizon warp...",
    weight: 90,
    icon: <Orbit className="w-5 h-5 text-amber-400 animate-pulse" />,
  },
  {
    label: "CONNECTING AI COGNITIVE INTERFACE",
    subtext: "Establishing provider bridge and command dispatch pipeline...",
    weight: 100,
    icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
  },
];

export const BootScreen: React.FC = () => {
  const isBooted = useWorldStore((state) => state.isBooted);
  const setBooted = useWorldStore((state) => state.setBooted);
  const setBootProgress = useWorldStore((state) => state.setBootProgress);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const hasStartedRef = useRef(false);

  // Global mobile error catcher
  useEffect(() => {
    const errorHandler = (e: ErrorEvent) => {
      setRuntimeError(e.message || "Client script exception");
    };
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      setRuntimeError(String(e.reason?.message || e.reason) || "Unhandled async rejection");
    };
    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  const handleImmediateStart = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    useWorldStore.getState().setBooted(true);
    setBooted(true);
    setIsFadingOut(true);
    try {
      ProceduralAudio.playBoot();
    } catch {}
  };

  useEffect(() => {
    if (isBooted || hasStartedRef.current) return;
    hasStartedRef.current = true;

    let localProgress = 0;
    const interval = setInterval(() => {
      localProgress += Math.floor(Math.random() * 8) + 6;
      if (localProgress >= 100) {
        localProgress = 100;
        clearInterval(interval);
        setProgress(100);
        setBootProgress(100, "SYSTEM ONLINE — WELCOME TO NEXUS");
        try {
          ProceduralAudio.playBoot();
        } catch {}
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            useWorldStore.getState().setBooted(true);
            setBooted(true);
          }, 300);
        }, 150);
      } else {
        setProgress(localProgress);
        const stage = BOOT_STAGES.findIndex((s) => localProgress <= s.weight);
        if (stage !== -1) {
          setCurrentStageIndex(stage);
          setBootProgress(localProgress, BOOT_STAGES[stage].label);
        }
      }
    }, 30);

    // Fail-safe: Auto-launch after 1.5s max so it never hangs
    const failSafeTimer = setTimeout(() => {
      if (!useWorldStore.getState().isBooted) {
        useWorldStore.getState().setBooted(true);
        setBooted(true);
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(failSafeTimer);
    };
  }, [isBooted, setBooted, setBootProgress]);

  if (isBooted) return null;

  const currentStage = BOOT_STAGES[currentStageIndex] || BOOT_STAGES[BOOT_STAGES.length - 1];

  return (
    <div
      onClick={handleImmediateStart}
      onTouchEnd={handleImmediateStart}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] transition-opacity duration-500 cursor-pointer ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

      {/* Decorative Radial Ambient Glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Main Terminal Container */}
      <div
        onClick={handleImmediateStart}
        className="relative z-10 w-full max-w-xl mx-4 p-6 md:p-8 glass-panel corner-bracket border border-cyan-500/30 cursor-pointer"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs tracking-widest text-cyan-400 font-bold">
              NEXUS SYSTEM v2.4 // BOOT SEQUENCE
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400 tracking-wider">
            AUTH_LEVEL: PROVISIONAL
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-wider text-white font-mono flex items-center gap-3">
            <span>NEXUS</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-normal">
              SPATIAL INTERFACE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono tracking-wide">
            An interface between humans, intelligence, and digital space.
          </p>
        </div>

        {/* Dynamic Progress Metric */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              {currentStage.icon}
              <span className="text-cyan-300 font-semibold">{currentStage.label}</span>
            </div>
            <span className="text-white font-bold text-sm tracking-wider">{progress}%</span>
          </div>

          {/* Progress Bar with segmented styling */}
          <div className="w-full h-2.5 bg-slate-900/90 rounded-full overflow-hidden border border-cyan-500/20 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-100 relative shadow-[0_0_12px_rgba(0,240,255,0.6)]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-400 h-5 truncate">
            {"> "}
            {currentStage.subtext}
          </p>

          {/* Prominent High-Contrast Mobile Launch Button */}
          <button
            type="button"
            onClick={handleImmediateStart}
            onTouchEnd={handleImmediateStart}
            className="w-full mt-2 py-3 px-4 rounded bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-200 text-slate-950 font-mono font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_16px_rgba(0,240,255,0.8)] flex items-center justify-center gap-2 cursor-pointer z-50 pointer-events-auto select-none"
          >
            <span>LAUNCH SPATIAL INTERFACE</span>
            <span>&rarr;</span>
          </button>

          {/* Fallback Subtext & Lite Mode link */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
            <span>Touch screen or tap button to launch</span>
            <a
              href="/lite"
              onClick={(e) => e.stopPropagation()}
              className="text-cyan-400 hover:underline tracking-wider"
            >
              Switch to 2D Mode &rarr;
            </a>
          </div>

          {/* Diagnostic error report if client exception occurred */}
          {runtimeError && (
            <div className="mt-3 p-2 rounded bg-red-950/80 border border-red-500/50 text-[10px] font-mono text-red-300">
              <div className="font-bold text-red-200 mb-0.5">CLIENT DIAGNOSTIC:</div>
              <div className="truncate">{runtimeError}</div>
              <div className="mt-1">
                <a href="/lite" className="underline font-bold text-cyan-300">Click to open NEXUS Lite (2D)</a>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostics Footer Bar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div>GEOMETRY: 100% PROCEDURAL</div>
          <div>MODELS: ZERO EXTERNAL ASSETS</div>
          <div>PROVIDER: GEMINI / HYBRID</div>
        </div>
      </div>
    </div>
  );
};
