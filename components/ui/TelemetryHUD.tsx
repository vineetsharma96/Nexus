"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { ZoneId, QualityTier } from "@/types/world";
import {
  Compass,
  Terminal,
  Volume2,
  VolumeX,
  Play,
  Square,
  Activity,
  Maximize2,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ShortcutsModal } from "./ShortcutsModal";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";

export const TelemetryHUD: React.FC = () => {
  const isBooted = useWorldStore((state) => state.isBooted);
  const currentZone = useWorldStore((state) => state.currentZone);
  const setZone = useWorldStore((state) => state.setZone);
  const qualityTier = useWorldStore((state) => state.qualityTier);
  const setQualityTier = useWorldStore((state) => state.setQualityTier);
  const fps = useWorldStore((state) => state.fps);
  const isAudioMuted = useWorldStore((state) => state.isAudioMuted);
  const toggleAudio = useWorldStore((state) => state.toggleAudio);
  const isTerminalOpen = useWorldStore((state) => state.isTerminalOpen);
  const toggleTerminal = useWorldStore((state) => state.toggleTerminal);
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const startTour = useWorldStore((state) => state.startTour);
  const endTour = useWorldStore((state) => state.endTour);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);

  if (!isBooted) return null;

  const activeZoneMeta = ZONES_METADATA[currentZone];
  const zones: { id: ZoneId; label: string; shortLabel: string; num: string }[] = [
    { id: "core", label: "THE CORE", shortLabel: "CORE", num: "01" },
    { id: "code_city", label: "CODE CITY", shortLabel: "CITY", num: "02" },
    { id: "data_ocean", label: "DATA OCEAN", shortLabel: "OCEAN", num: "03" },
    { id: "ai_lab", label: "AI LAB", shortLabel: "LAB", num: "04" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 select-none font-mono">
      {/* Top Group: Header + Mobile Zone Bar */}
      <div className="flex flex-col gap-1.5 sm:gap-2 w-full">
        {/* Top Telemetry Header */}
        <header className="flex items-center justify-between w-full gap-2 h-10 sm:h-11">
          {/* Left: Brand & Zone Title */}
          <div className="flex items-center min-w-0 pointer-events-auto">
            <div className="glass-panel px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-l-2 border-cyan-400 rounded-r flex items-center space-x-2 sm:space-x-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-white tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                  <span>NEXUS</span>
                  <span className="hidden sm:inline text-[10px] text-cyan-400 font-normal border border-cyan-400/30 px-1 rounded">
                    SYS.ONLINE
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-normal truncate max-w-[125px] sm:max-w-[200px]">
                  {activeZoneMeta.name}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Zone Jump Chips (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1.5 glass-panel p-1 rounded-full border border-white/10 pointer-events-auto shrink-0">
            {zones.map((z) => {
              const isActive = currentZone === z.id;
              return (
                <button
                  type="button"
                  key={z.id}
                  onClick={() => setZone(z.id)}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.3)] font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="text-[9px] opacity-60">{z.num}</span>
                  <span>{z.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Quick Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 pointer-events-auto shrink-0">
            {/* AI Tour Guide Button */}
            <button
              type="button"
              onClick={isTourActive ? endTour : startTour}
              className={`px-2.5 sm:px-3 py-1.5 text-xs rounded border transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                isTourActive
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 border-white/10"
              }`}
              title="Start Cinematic AI Tour Guide"
            >
              {isTourActive ? (
                <>
                  <Square className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">END TOUR</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="hidden sm:inline">AI TOUR</span>
                </>
              )}
            </button>

            {/* AI Terminal Toggle */}
            <button
              type="button"
              onClick={toggleTerminal}
              className={`px-2.5 sm:px-3 py-1.5 text-xs rounded border transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                isTerminalOpen
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.4)] font-semibold"
                  : "glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 border-white/10"
              }`}
              title="Open AI Command Terminal"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">COMMAND</span>
            </button>

            {/* Audio Synthesizer Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isAudioMuted;
                toggleAudio();
                ProceduralAudio.toggleAmbient(nextMuted);
                if (!nextMuted) ProceduralAudio.playSelect();
              }}
              className="glass-panel p-1.5 sm:p-2 text-slate-300 hover:text-white hover:border-cyan-500/40 border border-white/10 rounded transition-all cursor-pointer shrink-0"
              title={isAudioMuted ? "Unmute Ambient Synthesis" : "Mute Ambient Synthesis"}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Zone Selector Bar (Docked directly below header, fixed 34px height) */}
        <nav className="lg:hidden grid grid-cols-4 gap-1 glass-panel p-1 rounded border border-white/10 pointer-events-auto w-full h-[34px]">
          {zones.map((z) => {
            const isActive = currentZone === z.id;
            return (
              <button
                type="button"
                key={z.id}
                onClick={() => setZone(z.id)}
                className={`px-1 text-[10px] rounded transition-all flex items-center justify-center space-x-1 truncate cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(0,240,255,0.25)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="opacity-60 text-[9px]">{z.num}</span>
                <span className="sm:hidden">{z.shortLabel}</span>
                <span className="hidden sm:inline">{z.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry Footer (Single compact row on mobile & desktop) */}
      <footer className="flex items-center justify-between gap-2 w-full">
        {/* Left: Spatial Coordinates & Target Telemetry */}
        <div className="glass-panel px-2.5 sm:px-4 py-1.5 sm:py-2 border-b-2 border-cyan-400 rounded flex items-center space-x-2 sm:space-x-4 pointer-events-auto text-[10px] sm:text-xs min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-cyan-300 font-semibold whitespace-nowrap">
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
            <span className="sm:hidden">
              {activeZoneMeta.coordinates[0].toFixed(0)},{activeZoneMeta.coordinates[1].toFixed(0)},{activeZoneMeta.coordinates[2].toFixed(0)}
            </span>
            <span className="hidden sm:inline">
              X: {activeZoneMeta.coordinates[0].toFixed(0)} | Y:{" "}
              {activeZoneMeta.coordinates[1].toFixed(0)} | Z:{" "}
              {activeZoneMeta.coordinates[2].toFixed(0)}
            </span>
          </div>
          {selectedPoi && (
            <div className="hidden md:flex items-center space-x-2 text-amber-300 pl-3 border-l border-white/10 truncate">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">LOCK: {selectedPoi.name}</span>
            </div>
          )}
        </div>

        {/* Center: Keyboard Quick Hints (Desktop) */}
        <div className="hidden xl:flex items-center space-x-3 text-[10px] text-slate-500 glass-panel px-3 py-1.5 rounded border border-white/5">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">1-4</kbd> Zones
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">Space</kbd> Inspect
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">/</kbd> Terminal
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">M</kbd> Audio
          </span>
        </div>

        {/* Right: Quality Tier & FPS & NEXUS Lite Link */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 pointer-events-auto shrink-0">
          <div className="glass-panel px-2 sm:px-3 py-1.5 rounded border border-white/10 text-[10px] sm:text-[11px] flex items-center space-x-1.5 sm:space-x-2 text-slate-300">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
            <span>{fps}<span className="hidden xs:inline"> FPS</span></span>
            <span className="text-slate-600">|</span>
            <select
              value={qualityTier}
              onChange={(e) => setQualityTier(e.target.value as QualityTier)}
              className="bg-transparent text-cyan-300 font-semibold uppercase focus:outline-none cursor-pointer text-[10px] sm:text-[11px]"
              aria-label="Graphics Quality Tier"
            >
              <option value="ultra" className="bg-slate-900 text-white">ULTRA</option>
              <option value="high" className="bg-slate-900 text-white">HIGH</option>
              <option value="medium" className="bg-slate-900 text-white">MED</option>
              <option value="low" className="bg-slate-900 text-white">LOW</option>
            </select>
          </div>

          <Link
            href="/lite"
            className="glass-panel px-2 sm:px-2.5 py-1.5 rounded border border-white/10 text-[10px] text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40 transition-colors whitespace-nowrap"
            title="Switch to Accessible 2D NEXUS Lite"
          >
            <span className="sm:hidden">2D</span>
            <span className="hidden sm:inline">LITE MODE</span>
          </Link>

          <ShortcutsModal />
        </div>
      </footer>
    </div>
  );
};
