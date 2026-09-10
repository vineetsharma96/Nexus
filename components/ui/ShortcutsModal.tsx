"use client";

import React, { useState, useEffect } from "react";
import { X, Keyboard, HelpCircle } from "lucide-react";
import Link from "next/link";

const SHORTCUTS = [
  { key: "1", desc: "Jump to Zone 01: The Core" },
  { key: "2", desc: "Jump to Zone 02: Code City" },
  { key: "3", desc: "Jump to Zone 03: Data Ocean" },
  { key: "4", desc: "Jump to Zone 04: AI Lab" },
  { key: "Space", desc: "Inspect current Zone's primary node" },
  { key: "/", desc: "Open AI Cognitive Command Terminal" },
  { key: "M", desc: "Toggle audio synthesis" },
  { key: "Esc", desc: "Close open overlays or clear inspection" },
  { key: "?", desc: "Toggle this Keyboard Shortcuts modal" },
];

export const ShortcutsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "?") {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Help Trigger in bottom HUD */}
      <button
        onClick={() => setIsOpen(true)}
        className="glass-panel p-1.5 rounded border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40 transition-colors pointer-events-auto"
        title="View Keyboard Shortcuts & Accessibility Guide (?)"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md font-mono">
          <div className="relative w-full max-w-md glass-panel-glow p-6 rounded-lg border border-cyan-500/40 text-xs shadow-[0_0_40px_rgba(0,240,255,0.25)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Keyboard className="w-4 h-4" />
                <span className="font-bold tracking-widest text-[11px]">
                  ACCESSIBILITY & KEYBOARD SHORTCUTS
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-2 mb-6">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5"
                >
                  <kbd className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold text-[11px]">
                    {s.key}
                  </kbd>
                  <span className="text-slate-300">{s.desc}</span>
                </div>
              ))}
            </div>

            {/* Skip Immersive Experience Link */}
            <div className="pt-3 border-t border-white/10 flex flex-col space-y-2">
              <Link
                href="/lite"
                className="w-full py-2 rounded bg-white/5 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-center font-bold text-[11px] transition-all"
              >
                SWITCH TO 2D ACCESSIBLE INTERFACE (NEXUS LITE)
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
