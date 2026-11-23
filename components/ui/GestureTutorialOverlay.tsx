"use client";

import React, { useState, useEffect } from "react";
import { useWorldStore, ZONE_ORDER } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";
import {
  X,
  Hand,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Camera,
  FlipHorizontal,
} from "lucide-react";

type TutorialStepId = "fist" | "palm" | "swipe" | "pinch";

interface TutorialStep {
  id: TutorialStepId;
  stepNum: string;
  title: string;
  gestureName: string;
  actionBadge: string;
  accentColor: string;
  summary: string;
  tips: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "fist",
    stepNum: "01",
    title: "Closed Hand — Pause Activity",
    gestureName: "CLOSED HAND",
    actionBadge: "PAUSE 3D WORLD",
    accentColor: "#f59e0b",
    summary:
      "Curl all four fingers inward into a closed fist facing the camera. Hold steady for ~0.2 seconds to freeze all 3D procedural animations and particle streams in place.",
    tips: [
      "Curl all 4 fingertips firmly toward the center of your palm.",
      "Works whether your thumb rests across your fingers or beside your index knuckle.",
      "Works reliably in both Front and Rear camera modes.",
    ],
  },
  {
    id: "palm",
    stepNum: "02",
    title: "Open Palm — Resume Activity",
    gestureName: "OPEN PALM",
    actionBadge: "RESUME 3D WORLD",
    accentColor: "#10b981",
    summary:
      "Spread all five fingers wide open facing the camera and hold your hand steady. The simulation immediately restores its speed and continues smoothly.",
    tips: [
      "Extend all 5 digits (Thumb, Index, Middle, Ring, and Pinky) clearly.",
      "Hold your open hand stationary for ~0.2 seconds so it isn't read as a slide.",
      "Check the 5-finger telemetry indicator (T I M R P) all lit in cyan.",
    ],
  },
  {
    id: "swipe",
    stepNum: "03",
    title: "Slide Left / Right — Zone Navigation",
    gestureName: "SLIDE LEFT / RIGHT",
    actionBadge: "NEXT / PREV ZONE",
    accentColor: "#a855f7",
    summary:
      "Keep your hand open (3–4 fingers extended) and slide horizontally Left or Right across the camera frame to warp between Core, City, Ocean, and Lab.",
    tips: [
      "Slide RIGHT to advance: Core → Code City → Data Ocean → AI Lab.",
      "Slide LEFT to return to the previous spatial zone.",
      "A 0.7s cooldown prevents accidental double-warps on a single wave.",
    ],
  },
  {
    id: "pinch",
    stepNum: "04",
    title: "Pinch In / Pinch Out — 3D Scale",
    gestureName: "PINCH IN / OUT",
    actionBadge: "SCALE 3D OBJECT",
    accentColor: "#00f0ff",
    summary:
      "Bring your Thumb and Index finger close together to Pinch In (shrink) or spread them apart to Pinch Out (expand) the active 3D object smoothly.",
    tips: [
      "Touch thumb and index fingertips together to lock into Pinch mode, then spread wide out.",
      "Or keep middle, ring, and pinky fingers curled like calipers to scale cleanly across the full range.",
      "Switching back to Open Palm or Closed Hand locks your chosen scale in place.",
    ],
  },
];

const ZONE_LABELS: Record<string, string> = {
  core: "01 CORE",
  code_city: "02 CITY",
  data_ocean: "03 OCEAN",
  ai_lab: "04 LAB",
};

export const GestureTutorialOverlay: React.FC = () => {
  const isOpen = useWorldStore((state) => state.isGestureTutorialOpen);
  const setGestureTutorialOpen = useWorldStore((state) => state.setGestureTutorialOpen);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const setCvEnabled = useWorldStore((state) => state.setCvEnabled);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);
  const setActivityPaused = useWorldStore((state) => state.setActivityPaused);
  const currentZone = useWorldStore((state) => state.currentZone);
  const cycleZone = useWorldStore((state) => state.cycleZone);
  const objectScale = useWorldStore((state) => state.objectScale);
  const setPinchTelemetry = useWorldStore((state) => state.setPinchTelemetry);
  const cameraFacingMode = useWorldStore((state) => state.cameraFacingMode);
  const toggleCameraFacingMode = useWorldStore((state) => state.toggleCameraFacingMode);

  const [activeIdx, setActiveIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<TutorialStepId, boolean>>({
    fist: false,
    palm: false,
    swipe: false,
    pinch: false,
  });

  // Automatically mark tutorial steps completed when live CV gesture triggers
  useEffect(() => {
    if (!isOpen) return;
    return useWorldStore.subscribe((state, prevState) => {
      if (state.cvGesture === prevState.cvGesture) return;
      const g = state.cvGesture;
      if (g === "fist_pause") {
        setCompletedSteps((prev) => (prev.fist ? prev : { ...prev, fist: true }));
      } else if (g === "palm_resume") {
        setCompletedSteps((prev) => (prev.palm ? prev : { ...prev, palm: true }));
      } else if (g === "swipe_left" || g === "swipe_right") {
        setCompletedSteps((prev) => (prev.swipe ? prev : { ...prev, swipe: true }));
      } else if (g === "pinching_small" || g === "pinching_big") {
        setCompletedSteps((prev) => (prev.pinch ? prev : { ...prev, pinch: true }));
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[activeIdx];
  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  const handlePracticeFist = () => {
    ProceduralAudio.playHover();
    setActivityPaused(true);
    setCompletedSteps((prev) => ({ ...prev, fist: true }));
  };

  const handlePracticePalm = () => {
    ProceduralAudio.playSelect();
    setActivityPaused(false);
    setCompletedSteps((prev) => ({ ...prev, palm: true }));
  };

  const handlePracticeSwipe = (dir: "prev" | "next") => {
    ProceduralAudio.playSelect();
    cycleZone(dir);
    setCompletedSteps((prev) => ({ ...prev, swipe: true }));
  };

  const handlePracticePinch = (dir: "in" | "out") => {
    ProceduralAudio.playHover();
    const next = dir === "in" ? Math.max(0.4, objectScale - 0.35) : Math.min(2.4, objectScale + 0.35);
    setPinchTelemetry(
      dir === "in" ? 0.15 : 0.85,
      dir === "in" ? "pinching_small" : "pinching_big",
      Number(next.toFixed(2))
    );
    setCompletedSteps((prev) => ({ ...prev, pinch: true }));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 font-mono select-none pointer-events-auto">
      <div className="relative w-full max-w-2xl glass-panel-glow rounded-lg border border-cyan-500/40 p-3.5 sm:p-6 flex flex-col max-h-[88dvh] overflow-y-auto shadow-[0_0_50px_rgba(0,240,255,0.2)]">
        {/* Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${((activeIdx + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider truncate">
                INTERACTIVE CV GESTURE TUTORIAL
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                Master hands-free spatial control · {completedCount}/4 Gestures Verified
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                ProceduralAudio.playSelect();
                toggleCameraFacingMode();
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-cyan-300 flex items-center space-x-1 cursor-pointer"
              title="Switch Front or Rear Camera"
            >
              <FlipHorizontal className="w-3 h-3" />
              <span>{cameraFacingMode === "user" ? "FRONT CAM" : "REAR CAM"}</span>
            </button>

            <button
              type="button"
              onClick={() => setGestureTutorialOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Gesture Tutorial"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
          {TUTORIAL_STEPS.map((step, idx) => {
            const isCurrent = idx === activeIdx;
            const isDone = completedSteps[step.id];
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => {
                  ProceduralAudio.playHover();
                  setActiveIdx(idx);
                }}
                className={`p-2 rounded border text-left transition-all cursor-pointer flex items-center justify-between gap-1 ${
                  isCurrent
                    ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                    : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/25"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[9px] text-cyan-400 font-bold">
                    STEP {step.stepNum}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold truncate">
                    {step.gestureName}
                  </div>
                </div>
                {isDone && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Grid: Visual Animated Diagram (Left) + Instructions & Practice (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-stretch">
          {/* Animated SVG Gesture Visualizer */}
          <div className="md:col-span-2 bg-slate-950/90 rounded-lg border border-cyan-500/30 p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[200px]">
            <div className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded bg-black/70 border border-white/10 text-slate-300">
              {currentStep.actionBadge}
            </div>

            {completedSteps[currentStep.id] && (
              <div className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>VERIFIED</span>
              </div>
            )}

            {/* Step 1 SVG: Clenched Fist (Pause) */}
            {currentStep.id === "fist" && (
              <svg className="w-36 h-36" viewBox="0 0 160 160">
                {/* Outer Pause Pulse Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  className="animate-[spin_16s_linear_infinite]"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="48"
                  fill="rgba(245, 158, 11, 0.1)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                {/* Stylized Clenched Fist Landmarks (Curled Knuckles) */}
                <rect
                  x="52"
                  y="68"
                  width="56"
                  height="42"
                  rx="12"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                {/* 4 Curled Finger Segments */}
                {[58, 70, 82, 94].map((x, i) => (
                  <g key={i}>
                    <rect
                      x={x - 4}
                      y="54"
                      width="10"
                      height="22"
                      rx="5"
                      fill="#1e293b"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                    <circle cx={x + 1} cy="65" r="3" fill="#f59e0b" />
                  </g>
                ))}
                {/* Tucked Thumb Across Front */}
                <path
                  d="M 48 82 Q 68 76 86 82"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                {/* Pause Bars Icon in Palm Center */}
                <rect x="73" y="88" width="5" height="14" rx="1" fill="#f59e0b" />
                <rect x="82" y="88" width="5" height="14" rx="1" fill="#f59e0b" />
                <text
                  x="80"
                  y="135"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="10"
                  fontWeight="bold"
                >
                  HOLD FIST → PAUSE
                </text>
              </svg>
            )}

            {/* Step 2 SVG: Open Palm (Resume) */}
            {currentStep.id === "palm" && (
              <svg className="w-36 h-36" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-[spin_16s_linear_infinite]"
                />
                <circle
                  cx="80"
                  cy="84"
                  r="48"
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1.5"
                />
                {/* Palm Base */}
                <rect
                  x="58"
                  y="78"
                  width="44"
                  height="36"
                  rx="10"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                {/* 5 Spread Extended Fingers */}
                <line x1="58" y1="88" x2="36" y2="66" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                <circle cx="36" cy="66" r="4.5" fill="#34d399" />

                <line x1="65" y1="78" x2="56" y2="38" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                <circle cx="56" cy="38" r="4.5" fill="#34d399" />

                <line x1="76" y1="76" x2="76" y2="32" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                <circle cx="76" cy="32" r="4.5" fill="#34d399" />

                <line x1="87" y1="78" x2="94" y2="38" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                <circle cx="94" cy="38" r="4.5" fill="#34d399" />

                <line x1="97" y1="82" x2="112" y2="50" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                <circle cx="112" cy="50" r="4.5" fill="#34d399" />

                {/* Play Triangle inside Palm */}
                <polygon points="75,89 75,105 89,97" fill="#10b981" />
                <text
                  x="80"
                  y="136"
                  textAnchor="middle"
                  fill="#a7f3d0"
                  fontSize="10"
                  fontWeight="bold"
                >
                  5 FINGERS OPEN → RESUME
                </text>
              </svg>
            )}

            {/* Step 3 SVG: Four-Finger Horizontal Swipe (Zone Navigation) */}
            {currentStep.id === "swipe" && (
              <svg className="w-36 h-36" viewBox="0 0 160 160">
                {/* Left & Right Swipe Motion Arrows */}
                <path
                  d="M 42 54 L 18 54 L 26 46 M 18 54 L 26 62"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 118 54 L 142 54 L 134 46 M 142 54 L 134 62"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 4 Extended Parallel Fingers */}
                {[62, 74, 86, 98].map((x, i) => (
                  <g key={i}>
                    <line
                      x1={x}
                      y1="86"
                      x2={x}
                      y2="38"
                      stroke="#a855f7"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                    />
                    <circle cx={x} cy="38" r="4.5" fill="#00f0ff" />
                  </g>
                ))}
                {/* Horizontal Tracking Vector across 4 Fingertips */}
                <line
                  x1="62"
                  y1="38"
                  x2="98"
                  y2="38"
                  stroke="#00f0ff"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
                {/* Palm Base with Tucked Thumb */}
                <rect
                  x="56"
                  y="84"
                  width="48"
                  height="32"
                  rx="9"
                  fill="#0f172a"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                />
                <path
                  d="M 56 98 Q 74 92 86 98"
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <text
                  x="80"
                  y="136"
                  textAnchor="middle"
                  fill="#e9d5ff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  ◄ SLIDE LEFT / RIGHT ►
                </text>
              </svg>
            )}

            {/* Step 4 SVG: Pinch In / Pinch Out (Scale) */}
            {currentStep.id === "pinch" && (
              <svg className="w-36 h-36" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="76"
                  r="54"
                  fill="rgba(0, 240, 255, 0.06)"
                  stroke="#00f0ff"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                {/* Thumb tip & Index tip pinch vector */}
                <line
                  x1="54"
                  y1="62"
                  x2="106"
                  y2="62"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                {/* Thumb */}
                <line
                  x1="64"
                  y1="108"
                  x2="54"
                  y2="62"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="54" cy="62" r="7" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                {/* Index */}
                <line
                  x1="96"
                  y1="108"
                  x2="106"
                  y2="62"
                  stroke="#00f0ff"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="106" cy="62" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                {/* Scale indicator badge */}
                <rect x="60" y="34" width="40" height="18" rx="4" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
                <text x="80" y="46" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                  {objectScale.toFixed(2)}x
                </text>
                <text
                  x="80"
                  y="136"
                  textAnchor="middle"
                  fill="#a5f3fc"
                  fontSize="10"
                  fontWeight="bold"
                >
                  PINCH IN ◄ ► OUT
                </text>
              </svg>
            )}
          </div>

          {/* Right Column: Explanation, Tips & Live Practice Controls */}
          <div className="md:col-span-3 flex flex-col justify-between bg-black/40 rounded-lg border border-white/10 p-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                  GESTURE {currentStep.stepNum} OF 04
                </span>
                <span className="text-[10px] text-slate-400">
                  {isCvEnabled ? "CAMERA TRACKING: ACTIVE" : "CAMERA TRACKING: STANDBY"}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                {currentStep.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {currentStep.summary}
              </p>

              <ul className="space-y-1.5 mb-4">
                {currentStep.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-slate-300 flex items-start space-x-2"
                  >
                    <span className="text-cyan-400 font-bold">·</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive Practice Box */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>INTERACTIVE PRACTICE</span>
                </span>
                {!isCvEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      ProceduralAudio.playSelect();
                      setCvEnabled(true);
                    }}
                    className="text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Enable Live Camera</span>
                  </button>
                )}
              </div>

              {currentStep.id === "fist" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePracticeFist}
                    className="flex-1 py-2 px-3 rounded bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400 text-amber-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>SIMULATE CLENCHED FIST (PAUSE)</span>
                  </button>
                  <div className="px-3 py-2 rounded bg-slate-900 border border-white/10 text-[10px] font-bold text-center shrink-0">
                    {isActivityPaused ? (
                      <span className="text-amber-400">⏸ PAUSED</span>
                    ) : (
                      <span className="text-emerald-400">▶ RUNNING</span>
                    )}
                  </div>
                </div>
              )}

              {currentStep.id === "palm" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePracticePalm}
                    className="flex-1 py-2 px-3 rounded bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400 text-emerald-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>SIMULATE OPEN PALM (RESUME)</span>
                  </button>
                  <div className="px-3 py-2 rounded bg-slate-900 border border-white/10 text-[10px] font-bold text-center shrink-0">
                    {isActivityPaused ? (
                      <span className="text-amber-400">⏸ PAUSED</span>
                    ) : (
                      <span className="text-emerald-400">▶ ACTIVE</span>
                    )}
                  </div>
                </div>
              )}

              {currentStep.id === "swipe" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePracticeSwipe("prev")}
                      className="py-2 px-3 rounded bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400 text-purple-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>SWIPE LEFT (PREV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePracticeSwipe("next")}
                      className="py-2 px-3 rounded bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400 text-purple-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <span>SWIPE RIGHT (NEXT)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {ZONE_ORDER.map((zId) => (
                      <div
                        key={zId}
                        className={`py-1 rounded text-[9px] font-bold text-center border ${
                          currentZone === zId
                            ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                            : "bg-slate-900/70 border-white/5 text-slate-500"
                        }`}
                      >
                        {ZONE_LABELS[zId]}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep.id === "pinch" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePracticePinch("in")}
                    className="flex-1 py-2 px-3 rounded bg-pink-500/20 hover:bg-pink-500/35 border border-pink-400 text-pink-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    ▼ PINCH IN (SHRINK)
                  </button>
                  <div className="px-2.5 py-2 rounded bg-slate-900 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 tabular-nums shrink-0">
                    {objectScale.toFixed(2)}x
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePracticePinch("out")}
                    className="flex-1 py-2 px-3 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400 text-emerald-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    ▲ PINCH OUT (EXPAND)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            type="button"
            disabled={activeIdx === 0}
            onClick={() => {
              ProceduralAudio.playHover();
              setActiveIdx((i) => Math.max(0, i - 1));
            }}
            className="px-3 py-1.5 rounded border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs flex items-center space-x-1 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>PREVIOUS</span>
          </button>

          <div className="text-[10px] text-slate-400 hidden sm:block">
            Perform each gesture on camera or click the simulator buttons to verify
          </div>

          {activeIdx < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                ProceduralAudio.playSelect();
                setActiveIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1));
              }}
              className="px-4 py-1.5 rounded bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer"
            >
              <span>NEXT GESTURE</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                ProceduralAudio.playSelect();
                setGestureTutorialOpen(false);
              }}
              className="px-4 py-1.5 rounded bg-emerald-500/30 hover:bg-emerald-500/40 border border-emerald-400 text-emerald-200 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FINISH TUTORIAL</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
