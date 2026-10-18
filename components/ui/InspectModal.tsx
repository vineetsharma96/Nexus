"use client";

import React from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { X, Sparkles, Cpu, Layers, ShieldCheck, Compass } from "lucide-react";

export const InspectModal: React.FC = () => {
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const setSelectedPoi = useWorldStore((state) => state.setSelectedPoi);

  if (!selectedPoi) return null;

  return (
    <div className="fixed bottom-20 left-4 md:left-6 z-30 w-[calc(100vw-2rem)] max-w-sm glass-panel-glow p-5 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-[0_0_30px_rgba(0,240,255,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            {selectedPoi.name}
          </span>
        </div>
        <button
          onClick={() => setSelectedPoi(null)}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-slate-300 mb-4 leading-relaxed">
        {selectedPoi.description}
      </p>

      {/* Specs Grid */}
      <div className="space-y-2 bg-black/40 p-3 rounded border border-white/5">
        <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1.5">
          <Cpu className="w-3 h-3" />
          <span>PROCEDURAL SPECIFICATIONS</span>
        </div>
        {Object.entries(selectedPoi.specs).map(([key, value]) => (
          <div key={key} className="flex justify-between text-[11px]">
            <span className="text-slate-500">{key}:</span>
            <span className="text-slate-200 font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Spatial Coordinates Footer */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-cyan-400" />
          POS: [{selectedPoi.coordinates.join(", ")}]
        </span>
        <span className="text-emerald-400 font-semibold">SYNCHRONIZED</span>
      </div>
    </div>
  );
};
