"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { X, Sparkles, Cpu, Compass } from "lucide-react";

export const InspectModal: React.FC = () => {
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const isSandboxOpen = useWorldStore((state) => state.isSandboxOpen);

  if (!selectedPoi) return null;

  // Smart horizontal placement on tablet/desktop so InspectModal never overlaps open CV (left) or Sandbox (right) panels
  const desktopPositionClass =
    isCvEnabled && isSandboxOpen
      ? "sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-96"
      : isCvEnabled
      ? "sm:left-auto sm:right-4 md:right-6 sm:w-96"
      : "sm:left-4 md:left-6 sm:right-auto sm:w-96";

  return (
    <div
      className={`fixed bottom-14 sm:bottom-16 left-2.5 right-2.5 ${desktopPositionClass} z-30 max-h-[36dvh] sm:max-h-[54dvh] overflow-y-auto glass-panel-glow p-3.5 sm:p-5 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-[0_0_30px_rgba(0,240,255,0.2)] pointer-events-auto`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
        <div className="flex items-center space-x-2 min-w-0">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold text-white uppercase tracking-wider truncate">
            {selectedPoi.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedPoi(null)}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-slate-300 mb-3 leading-relaxed">
        {selectedPoi.description}
      </p>

      {/* Specs Grid */}
      <div className="space-y-1.5 bg-black/40 p-2.5 rounded border border-white/5">
        <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5">
          <Cpu className="w-3 h-3 shrink-0" />
          <span>PROCEDURAL SPECIFICATIONS</span>
        </div>
        {Object.entries(selectedPoi.specs).map(([key, value]) => (
          <div key={key} className="flex justify-between text-[11px] gap-2">
            <span className="text-slate-500">{key}:</span>
            <span className="text-slate-200 font-semibold text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Spatial Coordinates Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
          POS: [{selectedPoi.coordinates.join(", ")}]
        </span>
        <span className="text-emerald-400 font-semibold">SYNCHRONIZED</span>
      </div>
    </div>
  );
};
