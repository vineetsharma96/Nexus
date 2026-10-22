"use client";

import React, { useEffect, useState, useRef } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { TOUR_STEPS } from "@/engine/tour/tourSequence";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Bot,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";

export const TourOverlay: React.FC = () => {
  const isTourActive = useWorldStore((state) => state.isTourActive);
  const isTourPaused = useWorldStore((state) => state.isTourPaused);
  const toggleTourPause = useWorldStore((state) => state.toggleTourPause);
  const tourCurrentStep = useWorldStore((state) => state.tourCurrentStep);
  const nextTourStep = useWorldStore((state) => state.nextTourStep);
  const prevTourStep = useWorldStore((state) => state.prevTourStep);
  const goToTourStep = useWorldStore((state) => state.goToTourStep);
  const endTour = useWorldStore((state) => state.endTour);
  const setZone = useWorldStore((state) => state.setZone);
  const setOceanState = useWorldStore((state) => state.setOceanState);
  const isAudioMuted = useWorldStore((state) => state.isAudioMuted);

  const [timerProgress, setTimerProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = TOUR_STEPS[tourCurrentStep] || TOUR_STEPS[0];

  // Synchronize zone & environmental effects when step changes
  useEffect(() => {
    if (!isTourActive) return;

    const step = TOUR_STEPS[tourCurrentStep];
    if (step) {
      setZone(step.zone);
      if (step.oceanState) {
        setOceanState(step.oceanState);
      }

      // Optional text-to-speech narration if not muted
      if (typeof window !== "undefined" && "speechSynthesis" in window && !isAudioMuted) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(step.narration);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [tourCurrentStep, isTourActive, setZone, setOceanState, isAudioMuted]);

  // Auto-advance timer logic
  useEffect(() => {
    if (!isTourActive || isTourPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimerProgress(0);
    const durationMs = (currentStepData.durationSeconds || 9) * 1000;
    const intervalMs = 100;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += intervalMs;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setTimerProgress(pct);

      if (elapsed >= durationMs) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (tourCurrentStep < TOUR_STEPS.length - 1) {
          nextTourStep();
        } else {
          endTour();
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tourCurrentStep, isTourActive, isTourPaused, currentStepData, nextTourStep, endTour]);

  if (!isTourActive) return null;

  return (
    <div className="fixed bottom-14 sm:bottom-16 left-2.5 right-2.5 sm:left-1/2 sm:-translate-x-1/2 z-30 sm:w-full sm:max-w-lg sm:px-4 pointer-events-auto font-mono select-none">
      <div className="glass-panel-glow p-3.5 sm:p-4 rounded-lg border border-amber-500/40 text-xs shadow-[0_0_40px_rgba(245,158,11,0.25)] relative overflow-hidden max-h-[38dvh] sm:max-h-[45dvh] overflow-y-auto">
        {/* Top Auto-Advance Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 pt-1">
          <div className="flex items-center space-x-2 text-amber-400">
            <Bot className="w-4 h-4 animate-bounce" />
            <span className="font-bold tracking-widest text-[11px]">
              AI TOUR GUIDE // {tourCurrentStep + 1} OF {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Play / Pause Toggle */}
            <button
              onClick={toggleTourPause}
              className="p-1 rounded text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isTourPaused ? "Resume Tour Auto-advance" : "Pause Tour Auto-advance"}
            >
              {isTourPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* Exit Tour */}
            <button
              onClick={endTour}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              title="Exit Guided Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Title & Subtitle */}
        <div className="mb-2">
          <div className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>{currentStepData.subtitle}</span>
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">{currentStepData.title}</h3>
        </div>

        {/* Narration Text */}
        <p className="text-slate-200 leading-relaxed mb-4 text-xs">
          {currentStepData.narration}
        </p>

        {/* Bottom Step Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            onClick={prevTourStep}
            disabled={tourCurrentStep === 0}
            className="px-3 py-1.5 rounded border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>PREV</span>
          </button>

          {/* Interactive Step Dots */}
          <div className="flex items-center space-x-2">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToTourStep(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === tourCurrentStep
                    ? "w-6 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
                title={`Jump to step ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={tourCurrentStep === TOUR_STEPS.length - 1 ? endTour : nextTourStep}
            className="px-4 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 flex items-center space-x-1 font-semibold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)]"
          >
            <span>{tourCurrentStep === TOUR_STEPS.length - 1 ? "FINISH" : "NEXT"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
