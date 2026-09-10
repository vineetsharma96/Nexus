"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ZONES_METADATA } from "@/procedural/worldData";
import { ZoneId } from "@/types/world";
import {
  Compass,
  ArrowLeft,
  Cpu,
  Layers,
  Sparkles,
  Bot,
  Database,
  ExternalLink,
} from "lucide-react";

export default function NexusLitePage() {
  const [activeZone, setActiveZone] = useState<ZoneId>("core");
  const currentMeta = ZONES_METADATA[activeZone];

  const zones: { id: ZoneId; label: string; num: string }[] = [
    { id: "core", label: "THE CORE", num: "01" },
    { id: "code_city", label: "CODE CITY", num: "02" },
    { id: "data_ocean", label: "DATA OCEAN", num: "03" },
    { id: "ai_lab", label: "AI LAB", num: "04" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-mono p-6 md:p-12 relative overflow-y-auto">
      {/* Matrix background grid */}
      <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              ACCESSIBLE INTERFACE
            </span>
            <span className="text-xs text-slate-500">2D ENGINE ACTIVE</span>
          </div>
          <h1 className="text-3xl font-black tracking-wider text-white flex items-center gap-3">
            <span>NEXUS LITE</span>
            <span className="text-xs text-slate-400 font-normal">
              // NO WEBGL REQUIREMENT
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            An interface between humans, intelligence, and digital space.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded glass-panel-glow text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/20 transition-all self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ENTER 3D IMMERSIVE SPACE</span>
        </Link>
      </header>

      {/* Zone Navigation Pills */}
      <nav className="relative z-10 flex flex-wrap gap-2 my-8">
        {zones.map((z) => (
          <button
            type="button"
            key={z.id}
            onClick={() => setActiveZone(z.id)}
            onTouchEnd={() => setActiveZone(z.id)}
            className={`px-4 py-2.5 text-xs rounded border transition-all flex items-center space-x-2 cursor-pointer ${
              activeZone === z.id
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.3)] font-bold"
                : "glass-panel text-slate-400 hover:text-white border-white/10"
            }`}
          >
            <span className="text-slate-500">{z.num}</span>
            <span>{z.label}</span>
          </button>
        ))}
      </nav>

      {/* Active Zone Detail Card */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Left Column: Zone Overview */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-lg border border-white/10">
          <div className="flex items-center space-x-3 text-cyan-400 mb-2">
            <Compass className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              COORDINATES: [{currentMeta.coordinates.join(", ")}]
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{currentMeta.name}</h2>
          <h3 className="text-sm text-cyan-300 font-semibold mb-4">{currentMeta.tagline}</h3>
          <p className="text-slate-300 leading-relaxed text-sm mb-8">
            {currentMeta.description}
          </p>

          {/* Interactive SVG Diagram representing the Zone Concept */}
          <div className="w-full h-48 bg-black/40 rounded border border-cyan-500/20 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            {activeZone === "core" && (
              <svg className="w-40 h-40 animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="24" fill="none" stroke="#00f0ff" strokeWidth="2" />
                <circle cx="50" cy="50" r="10" fill="#00f0ff" opacity="0.8" />
              </svg>
            )}
            {activeZone === "code_city" && (
              <div className="flex items-end space-x-3 h-32 w-full justify-center">
                <div className="w-8 h-24 bg-emerald-500/40 border border-emerald-400 rounded-t" />
                <div className="w-12 h-32 bg-emerald-500/60 border border-emerald-400 rounded-t" />
                <div className="w-10 h-20 bg-emerald-500/30 border border-emerald-400 rounded-t" />
                <div className="w-14 h-28 bg-emerald-500/50 border border-emerald-400 rounded-t" />
              </div>
            )}
            {activeZone === "data_ocean" && (
              <div className="grid grid-cols-8 gap-3">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"
                    style={{ animationDelay: `${(i % 5) * 200}ms` }}
                  />
                ))}
              </div>
            )}
            {activeZone === "ai_lab" && (
              <div className="flex items-center space-x-4">
                {["PERCEIVE", "REASON", "PLAN", "ACT", "OBSERVE"].map((step, idx) => (
                  <div
                    key={step}
                    className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400 text-[10px] text-amber-300 font-bold"
                  >
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Points of Interest */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>POINTS OF INTEREST</span>
          </h3>

          {currentMeta.pois.map((poi) => (
            <div
              key={poi.id}
              className="glass-panel p-5 rounded-lg border border-white/10 hover:border-cyan-500/40 transition-all"
            >
              <h4 className="text-sm font-bold text-cyan-300 mb-1">{poi.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {poi.description}
              </p>
              <div className="space-y-1 bg-black/40 p-2.5 rounded border border-white/5 text-[10px]">
                {Object.entries(poi.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}:</span>
                    <span className="text-slate-300 font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>NEXUS LITE // ACCESSIBILITY COMPLIANT ARCHITECTURE</div>
        <div>STRICT 0-EXTERNAL-ASSETS SPECIFICATION</div>
      </footer>
    </div>
  );
}
