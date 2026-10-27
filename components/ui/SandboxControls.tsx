"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { OceanState, QualityTier, ColorScheme } from "@/types/world";
import {
  Sliders,
  X,
  Sparkles,
  Sun,
  Gauge,
  Cpu,
  Palette,
  RotateCcw,
  Zap,
} from "lucide-react";

export const SandboxControls: React.FC = () => {
  const isOpen = useWorldStore((state) => state.isSandboxOpen);
  const toggleSandbox = useWorldStore((state) => state.toggleSandbox);
  const setSandboxOpen = useWorldStore((state) => state.setSandboxOpen);

  const oceanState = useWorldStore((state) => state.oceanState);
  const setOceanState = useWorldStore((state) => state.setOceanState);
  const environmentSpeed = useWorldStore((state) => state.environmentSpeed);
  const lightingIntensity = useWorldStore((state) => state.lightingIntensity);
  const colorScheme = useWorldStore((state) => state.colorScheme);
  const qualityTier = useWorldStore((state) => state.qualityTier);
  const setQualityTier = useWorldStore((state) => state.setQualityTier);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const isBooted = useWorldStore((state) => state.isBooted);

  if (!isBooted) return null;

  return (
    <>
      {/* Floating Toggle Button (Right-aligned, non-overlapping with left AR/CV strip) */}
      <button
        type="button"
        onClick={toggleSandbox}
        className={`fixed top-[94px] sm:top-[110px] lg:top-[76px] right-2.5 sm:right-4 md:right-6 z-30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-mono border transition-all flex items-center space-x-1.5 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
          isOpen
            ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold"
            : "glass-panel text-slate-300 hover:text-white hover:border-cyan-400/40 border-white/10"
        }`}
        title="Toggle Experimental Simulation Sandbox"
      >
        <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
        <span>SANDBOX</span>
      </button>

      {/* Slide-out Control Drawer */}
      {isOpen && (
        <div
          className={`fixed top-[132px] sm:top-[150px] lg:top-[116px] left-2.5 right-2.5 sm:left-auto sm:right-4 md:right-6 z-30 sm:w-80 ${
            selectedPoi
              ? "max-h-[38dvh] sm:max-h-[calc(100dvh-180px)]"
              : "max-h-[calc(100dvh-190px)]"
          } overflow-y-auto glass-panel-glow p-3.5 sm:p-5 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-[0_0_40px_rgba(0,240,255,0.2)] pointer-events-auto`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Zap className="w-4 h-4 shrink-0" />
              <span className="font-bold tracking-widest text-[11px]">
                EXPERIMENTAL SANDBOX
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSandboxOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Data Ocean Topology */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>DATA OCEAN TOPOLOGY</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["wave", "sphere", "lattice", "chaos"] as OceanState[]).map((state) => (
                  <button
                    type="button"
                    key={state}
                    onClick={() => setOceanState(state)}
                    className={`px-2.5 py-1.5 rounded uppercase text-[10px] font-bold border transition-all cursor-pointer ${
                      oceanState === state
                        ? "bg-purple-500/30 text-purple-300 border-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                        : "bg-black/40 text-slate-400 hover:text-white border-white/5"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Simulation Speed */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>SIMULATION SPEED</span>
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {environmentSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={environmentSpeed || 1.0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  useWorldStore.setState({
                    environmentSpeed: val,
                    savedEnvironmentSpeed: val,
                    isActivityPaused: false,
                  });
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* 3. Global Lighting Intensity */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>LIGHTING INTENSITY</span>
                </span>
                <span className="text-amber-300 font-bold tabular-nums">
                  {lightingIntensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={lightingIntensity}
                onChange={(e) =>
                  useWorldStore.setState({ lightingIntensity: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* 4. Color Scheme Theme */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                <Palette className="w-3 h-3 text-emerald-400" />
                <span>ATMOSPHERE COLOR PALETTE</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "default", label: "CYAN VOID" },
                  { id: "cyber", label: "CYBER EMERALD" },
                  { id: "amber", label: "NEO AMBER" },
                  { id: "monochrome", label: "GRAPHITE" },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() =>
                      useWorldStore.setState({ colorScheme: c.id as ColorScheme })
                    }
                    className={`px-2 py-1.5 rounded uppercase text-[9px] font-bold border transition-all cursor-pointer ${
                      colorScheme === c.id
                        ? "bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        : "bg-black/40 text-slate-400 hover:text-white border-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Quality Tier Preset */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-2">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>PERFORMANCE QUALITY TIER</span>
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(["low", "medium", "high", "ultra"] as QualityTier[]).map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => setQualityTier(tier)}
                    className={`py-1 rounded uppercase text-[9px] font-bold border transition-all cursor-pointer ${
                      qualityTier === tier
                        ? "bg-cyan-500/30 text-cyan-300 border-cyan-400"
                        : "bg-black/40 text-slate-400 hover:text-white border-white/5"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Defaults Button */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() =>
                  useWorldStore.setState({
                    environmentSpeed: 1.0,
                    savedEnvironmentSpeed: 1.0,
                    isActivityPaused: false,
                    lightingIntensity: 1.0,
                    colorScheme: "default",
                    oceanState: "wave",
                  })
                }
                className="w-full py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET SIMULATION DEFAULTS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
