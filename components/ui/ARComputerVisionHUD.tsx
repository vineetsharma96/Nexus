"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";
import {
  Camera,
  CameraOff,
  Scan,
  Maximize2,
  Minimize2,
  RotateCcw,
  FlipHorizontal,
  Sparkles,
  Hand,
  ArrowLeftRight,
  Eye,
  Sliders,
} from "lucide-react";

// MediaPipe 21 Hand Landmark skeletal connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm knuckles
];

export const ARComputerVisionHUD: React.FC = () => {
  const isBooted = useWorldStore((state) => state.isBooted);
  const isArMode = useWorldStore((state) => state.isArMode);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const objectScale = useWorldStore((state) => state.objectScale);
  const pinchDistance = useWorldStore((state) => state.pinchDistance);
  const pinchState = useWorldStore((state) => state.pinchState);
  const invertPinch = useWorldStore((state) => state.invertPinch);
  const arFacingMode = useWorldStore((state) => state.arFacingMode);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const currentZone = useWorldStore((state) => state.currentZone);

  const toggleArMode = useWorldStore((state) => state.toggleArMode);
  const toggleCvEnabled = useWorldStore((state) => state.toggleCvEnabled);
  const setObjectScale = useWorldStore((state) => state.setObjectScale);
  const setPinchTelemetry = useWorldStore((state) => state.setPinchTelemetry);
  const toggleInvertPinch = useWorldStore((state) => state.toggleInvertPinch);
  const setArFacingMode = useWorldStore((state) => state.setArFacingMode);

  const arVideoRef = useRef<HTMLVideoElement>(null);
  const hudVideoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedScaleRef = useRef<number>(1.0);

  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "initializing" | "active" | "simulated"
  >("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [simPinchRatio, setSimPinchRatio] = useState<number>(0.45);
  const [detectedHandsCount, setDetectedHandsCount] = useState<number>(0);

  // Compute target 3D object scale from normalized pinch ratio (0.0 = closed pinch, 1.0 = wide spread)
  const applyPinchRatioToScale = useCallback(
    (normalizedRatio: number) => {
      const clampedRatio = Math.max(0, Math.min(1, normalizedRatio));
      const invert = useWorldStore.getState().invertPinch;
      // When invert is false: pinching fingers together (small ratio) -> object gets SMALLER (0.25x)
      // spreading fingers apart (large ratio) -> object gets BIGGER (3.0x)
      // When invert is true: pinching fingers together -> object gets BIGGER (3.0x)
      const effectiveRatio = invert ? 1 - clampedRatio : clampedRatio;

      // Map [0..1] -> [0.25..3.0] with 0.42 around 1.0x
      const targetScale = 0.25 + effectiveRatio * 2.75;
      smoothedScaleRef.current =
        smoothedScaleRef.current * 0.72 + targetScale * 0.28;

      const gestureState: "idle" | "pinching_small" | "pinching_big" =
        effectiveRatio < 0.32
          ? "pinching_small"
          : effectiveRatio > 0.55
          ? "pinching_big"
          : "idle";

      setPinchTelemetry(
        Number(clampedRatio.toFixed(2)),
        gestureState,
        Number(smoothedScaleRef.current.toFixed(2))
      );
    },
    [setPinchTelemetry]
  );

  // Initialize MediaPipe HandLandmarker
  const initHandLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      );
      const handLandmarker = await vision.HandLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        }
      );
      landmarkerRef.current = handLandmarker;
      setModelLoaded(true);
      return handLandmarker;
    } catch (err) {
      console.warn("[NEXUS CV] MediaPipe GPU init fallback to CPU:", err);
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        const handLandmarker = await vision.HandLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            },
            runningMode: "VIDEO",
            numHands: 2,
          }
        );
        landmarkerRef.current = handLandmarker;
        setModelLoaded(true);
        return handLandmarker;
      } catch (cpuErr) {
        console.warn("[NEXUS CV] HandLandmarker unavailable, using interactive CV simulator:", cpuErr);
        return null;
      }
    }
  }, []);

  // Draw simulated or real hand landmarks onto the HUD canvas
  const drawHudOverlay = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      landmarksList: { x: number; y: number; z: number }[][],
      activeRatio: number | null
    ) => {
      ctx.clearRect(0, 0, width, height);

      if (landmarksList.length === 0) {
        // Draw subtle scanning reticle when waiting for hand in frame
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(16, 16, width - 32, height - 32);
        return;
      }

      for (const landmarks of landmarksList) {
        // Draw skeletal bones
        ctx.strokeStyle = "rgba(0, 240, 255, 0.55)";
        ctx.lineWidth = 1.75;
        for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
          const p1 = landmarks[startIdx];
          const p2 = landmarks[endIdx];
          if (!p1 || !p2) continue;
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.stroke();
        }

        // Draw joints
        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          const isPinchTip = i === 4 || i === 8;
          ctx.beginPath();
          ctx.arc(
            pt.x * width,
            pt.y * height,
            isPinchTip ? 6 : 3,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = isPinchTip ? "#f59e0b" : "#00f0ff";
          ctx.fill();
          if (isPinchTip) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Draw active Pinch Vector between Thumb Tip (#4) and Index Tip (#8)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        if (thumbTip && indexTip) {
          const tx = thumbTip.x * width;
          const ty = thumbTip.y * height;
          const ix = indexTip.x * width;
          const iy = indexTip.y * height;
          const midX = (tx + ix) / 2;
          const midY = (ty + iy) / 2;

          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.moveTo(tx, ty);
          ctx.lineTo(ix, iy);
          ctx.strokeStyle =
            activeRatio !== null && activeRatio < 0.32
              ? "#ec4899"
              : activeRatio !== null && activeRatio > 0.55
              ? "#10b981"
              : "#f59e0b";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.setLineDash([]);

          // Midpoint badge showing real-time scale
          ctx.fillStyle = "rgba(3, 7, 18, 0.85)";
          ctx.fillRect(midX - 28, midY - 10, 56, 20);
          ctx.strokeStyle = "#00f0ff";
          ctx.lineWidth = 1;
          ctx.strokeRect(midX - 28, midY - 10, 56, 20);
          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `${useWorldStore.getState().objectScale.toFixed(2)}x`,
            midX,
            midY
          );
        }
      }
    },
    []
  );

  // Start / Stop Camera & CV Loop when isCvEnabled or isArMode changes
  useEffect(() => {
    let isCancelled = false;

    async function startCameraAndVision() {
      if (!isCvEnabled && !isArMode) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setCameraStatus("idle");
        setDetectedHandsCount(0);
        return;
      }

      setCameraStatus("initializing");
      setCameraError(null);

      // Start loading MediaPipe model in parallel
      const landmarkerPromise = initHandLandmarker();

      let mediaStream: MediaStream | null = null;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia
        ) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: arFacingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } else {
          throw new Error("Camera API unavailable in this browser context.");
        }
      } catch (err: any) {
        if (isCancelled) return;
        setCameraStatus("simulated");
        setCameraError(
          "Live camera unavailable or permission declined — Interactive CV Pinch Simulator active."
        );
        applyPinchRatioToScale(simPinchRatio);
        return;
      }

      if (isCancelled) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;

      if (arVideoRef.current) {
        arVideoRef.current.srcObject = mediaStream;
        arVideoRef.current.play().catch(() => {});
      }
      if (hudVideoRef.current) {
        hudVideoRef.current.srcObject = mediaStream;
        hudVideoRef.current.play().catch(() => {});
      }

      setCameraStatus("active");
      await landmarkerPromise;

      let lastVideoTime = -1;

      const detectLoop = () => {
        if (isCancelled) return;

        const videoEl = hudVideoRef.current || arVideoRef.current;
        const canvasEl = overlayCanvasRef.current;
        const landmarker = landmarkerRef.current;

        if (
          videoEl &&
          videoEl.readyState >= 2 &&
          landmarker &&
          videoEl.currentTime !== lastVideoTime
        ) {
          lastVideoTime = videoEl.currentTime;
          try {
            const results = landmarker.detectForVideo(
              videoEl,
              performance.now()
            );
            const hands = results?.landmarks || [];
            setDetectedHandsCount(hands.length);

            let computedRatio: number | null = null;

            if (hands.length >= 1) {
              const primaryHand = hands[0];
              const thumbTip = primaryHand[4];
              const indexTip = primaryHand[8];
              const wrist = primaryHand[0];
              const middleMcp = primaryHand[9];

              if (thumbTip && indexTip && wrist && middleMcp) {
                const rawPinchDist = Math.hypot(
                  thumbTip.x - indexTip.x,
                  thumbTip.y - indexTip.y
                );
                const palmSize = Math.max(
                  0.08,
                  Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y)
                );
                // Normalize pinch distance by palm size (typically 0.15 when closed, 1.15 when spread wide)
                const normalized = (rawPinchDist / palmSize - 0.18) / 0.95;
                computedRatio = Math.max(0, Math.min(1, normalized));
                applyPinchRatioToScale(computedRatio);
              }
            } else {
              useWorldStore
                .getState()
                .setPinchTelemetry(null, "idle", undefined);
            }

            if (canvasEl) {
              const ctx = canvasEl.getContext("2d");
              if (ctx) {
                drawHudOverlay(
                  ctx,
                  canvasEl.width,
                  canvasEl.height,
                  hands,
                  computedRatio
                );
              }
            }
          } catch {
            // Ignore transient frame detection error
          }
        }

        rafRef.current = requestAnimationFrame(detectLoop);
      };

      rafRef.current = requestAnimationFrame(detectLoop);
    }

    startCameraAndVision();

    return () => {
      isCancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [
    isCvEnabled,
    isArMode,
    arFacingMode,
    initHandLandmarker,
    applyPinchRatioToScale,
    drawHudOverlay,
    simPinchRatio,
  ]);

  // Multi-touch 2-finger pinch & keyboard shortcuts (+ / - / V / R)
  useEffect(() => {
    let initialTouchDistance: number | null = null;
    let initialScaleOnTouch = 1.0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDistance = Math.hypot(dx, dy);
        initialScaleOnTouch = useWorldStore.getState().objectScale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistance !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const ratio = currentDist / Math.max(20, initialTouchDistance);
        const invert = useWorldStore.getState().invertPinch;
        const effectiveMultiplier = invert ? 1 / ratio : ratio;
        const nextScale = Math.max(
          0.25,
          Math.min(3.0, initialScaleOnTouch * effectiveMultiplier)
        );
        const state =
          effectiveMultiplier < 0.95
            ? "pinching_small"
            : effectiveMultiplier > 1.05
            ? "pinching_big"
            : "idle";
        useWorldStore
          .getState()
          .setPinchTelemetry(
            Number(Math.min(1, currentDist / 300).toFixed(2)),
            state,
            Number(nextScale.toFixed(2))
          );
      }
    };

    const handleTouchEnd = () => {
      initialTouchDistance = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === "+" || e.key === "=") {
        const next = Math.min(3.0, useWorldStore.getState().objectScale + 0.2);
        useWorldStore.getState().setPinchTelemetry(0.85, "pinching_big", next);
        ProceduralAudio.playHover();
      } else if (e.key === "-" || e.key === "_") {
        const next = Math.max(0.25, useWorldStore.getState().objectScale - 0.2);
        useWorldStore.getState().setPinchTelemetry(0.15, "pinching_small", next);
        ProceduralAudio.playHover();
      } else if (e.key === "0") {
        useWorldStore.getState().setPinchTelemetry(0.45, "idle", 1.0);
        ProceduralAudio.playSelect();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isBooted) return null;

  const targetObjectName = selectedPoi
    ? selectedPoi.name
    : currentZone === "core"
    ? "AI COGNITION CORE"
    : currentZone === "code_city"
    ? "CODE CITY SPIRES"
    : currentZone === "data_ocean"
    ? "DATA OCEAN MANIFOLD"
    : "AI LAB MODULES";

  return (
    <>
      {/* 1. Full-Screen Augmented Reality (AR) Camera Passthrough Layer */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${
          isArMode ? "opacity-100 z-0" : "opacity-0 -z-10"
        }`}
      >
        <video
          ref={arVideoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${
            arFacingMode === "user" ? "scale-x-[-1]" : ""
          }`}
        />

        {/* Fallback Cyber AR Grid Environment if camera permission is declined in AR mode */}
        {isArMode && cameraStatus === "simulated" && (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18) 0%, rgba(3, 7, 18, 0.85) 80%)",
            }}
          />
        )}

        {/* AR Spatial Optical Reticle Overlay */}
        {isArMode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-cyan-400/25 flex items-center justify-center relative">
              <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400 absolute top-6 left-6" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400 absolute top-6 right-6" />
              <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400 absolute bottom-6 left-6" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400 absolute bottom-6 right-6" />
              <div className="absolute -top-6 text-[10px] font-mono text-cyan-300 tracking-widest bg-slate-950/70 px-2.5 py-0.5 rounded border border-cyan-400/40">
                AR SPATIAL ANCHOR LOCKED · {objectScale.toFixed(2)}x
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Floating Quick-Access AR & Computer Vision Control Bar (Top Left below header) */}
      <div className="fixed top-20 left-4 md:left-6 z-30 flex flex-wrap items-center gap-2 font-mono pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleArMode();
          }}
          className={`px-3 py-1.5 rounded text-xs border transition-all flex items-center space-x-2 shadow-lg cursor-pointer ${
            isArMode
              ? "bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] font-bold"
              : "glass-panel text-slate-300 hover:text-white hover:border-emerald-400/50 border-white/10"
          }`}
          title="Toggle Augmented Reality Camera Passthrough"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isArMode ? "AR MODE: ON" : "AR MODE"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleCvEnabled();
          }}
          className={`px-3 py-1.5 rounded text-xs border transition-all flex items-center space-x-2 shadow-lg cursor-pointer ${
            isCvEnabled
              ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.45)] font-bold"
              : "glass-panel text-slate-300 hover:text-white hover:border-cyan-400/50 border-white/10"
          }`}
          title="Toggle Computer Vision Hand Pinch Scaling"
        >
          <Hand className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isCvEnabled ? "CV PINCH: ACTIVE" : "CV PINCH"}</span>
        </button>

        {/* Live Scale Readout & Quick Pinch Buttons */}
        <div className="glass-panel px-2.5 py-1 rounded border border-white/10 flex items-center space-x-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              const next = Math.max(0.25, Number((objectScale - 0.25).toFixed(2)));
              setPinchTelemetry(0.15, "pinching_small", next);
              ProceduralAudio.playHover();
            }}
            className="p-1 rounded hover:bg-white/10 text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
            title="Pinch Object Smaller (-)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-bold text-cyan-300 min-w-[46px] text-center">
            {objectScale.toFixed(2)}x
          </span>

          <button
            type="button"
            onClick={() => {
              const next = Math.min(3.0, Number((objectScale + 0.25).toFixed(2)));
              setPinchTelemetry(0.85, "pinching_big", next);
              ProceduralAudio.playHover();
            }}
            className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Pinch Object Bigger (+)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {Math.abs(objectScale - 1.0) > 0.05 && (
            <button
              type="button"
              onClick={() => {
                smoothedScaleRef.current = 1.0;
                setPinchTelemetry(0.45, "idle", 1.0);
                setSimPinchRatio(0.27);
                ProceduralAudio.playSelect();
              }}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Object Scale to 1.0x"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Computer Vision Hand Tracking & Pinch Inspector Panel */}
      {isCvEnabled && (
        <div className="fixed top-32 left-4 md:left-6 z-30 w-80 max-w-[calc(100vw-2rem)] glass-panel-glow p-4 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-[0_0_35px_rgba(0,240,255,0.2)] pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Scan className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-white tracking-wider text-[11px]">
                CV HAND PINCH TRACKER
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {cameraStatus === "active" && (
                <button
                  type="button"
                  onClick={() =>
                    setArFacingMode(
                      arFacingMode === "user" ? "environment" : "user"
                    )
                  }
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Switch Front/Rear Camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleCvEnabled}
                className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                HIDE
              </button>
            </div>
          </div>

          {/* Live Webcam Feed + 21-Landmark Skeleton Canvas Overlay */}
          <div className="relative w-full h-44 rounded bg-slate-950 border border-cyan-500/30 overflow-hidden mb-3">
            <video
              ref={hudVideoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                arFacingMode === "user" ? "scale-x-[-1]" : ""
              } ${cameraStatus === "active" ? "opacity-85" : "opacity-0"}`}
            />
            <canvas
              ref={overlayCanvasRef}
              width={320}
              height={176}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                arFacingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {/* Status Badges inside Viewport */}
            <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 text-[10px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraStatus === "active"
                    ? "bg-emerald-400 animate-ping"
                    : cameraStatus === "initializing"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-cyan-400"
                }`}
              />
              <span className="text-slate-200">
                {cameraStatus === "active"
                  ? detectedHandsCount > 0
                    ? `HAND LOCKED (${detectedHandsCount})`
                    : "SHOW HAND TO CAMERA"
                  : cameraStatus === "initializing"
                  ? "INITIALIZING OPTICS..."
                  : "SIMULATOR MODE"}
              </span>
            </div>

            {/* Interactive Virtual Hand Pinch Simulator when no physical camera is active */}
            {cameraStatus !== "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-slate-950/90 text-center">
                <div className="flex items-center justify-center space-x-4 mb-2">
                  {/* Animated Virtual Thumb & Index Finger Nodes */}
                  <div className="relative w-40 h-16 bg-slate-900/90 rounded border border-cyan-500/30 flex items-center justify-center">
                    <div
                      className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_#f59e0b] transition-all duration-75"
                      style={{
                        transform: `translateX(${-(10 + simPinchRatio * 48)}px)`,
                      }}
                      title="Landmark #4 (Thumb Tip)"
                    />
                    <div
                      className="h-0.5 bg-gradient-to-r from-amber-400 via-cyan-400 to-amber-400 transition-all duration-75"
                      style={{ width: `${Math.max(8, simPinchRatio * 96)}px` }}
                    />
                    <div
                      className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_#f59e0b] transition-all duration-75"
                      style={{
                        transform: `translateX(${10 + simPinchRatio * 48}px)`,
                      }}
                      title="Landmark #8 (Index Tip)"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight px-2">
                  {cameraError ||
                    "Drag the pinch aperture slider below or show your hand to the webcam."}
                </p>
              </div>
            )}

            {/* Real-Time Gesture Banner at bottom of camera view */}
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 px-2.5 py-1 border-t border-white/10 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 truncate max-w-[140px]">
                TARGET: <strong className="text-cyan-300">{targetObjectName}</strong>
              </span>
              <span
                className={`font-bold ${
                  pinchState === "pinching_big"
                    ? "text-emerald-400"
                    : pinchState === "pinching_small"
                    ? "text-pink-400"
                    : "text-amber-300"
                }`}
              >
                {pinchState === "pinching_big"
                  ? "▲ OBJECT BIGGER"
                  : pinchState === "pinching_small"
                  ? "▼ OBJECT SMALLER"
                  : "● HOLD SCALE"}
              </span>
            </div>
          </div>

          {/* Interactive Pinch Distance Slider (Works anytime to test or fine-tune CV pinch) */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-300 mb-1">
                <span>THUMB (#4) ↔ INDEX (#8) APERTURE</span>
                <span className="text-cyan-300 font-bold">
                  {Math.round((pinchDistance ?? simPinchRatio) * 100)}% →{" "}
                  {objectScale.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={pinchDistance ?? simPinchRatio}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSimPinchRatio(val);
                  applyPinchRatioToScale(val);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>
                  {invertPinch ? "PINCH IN (BIGGER)" : "PINCH IN (SMALLER)"}
                </span>
                <span>1.0x</span>
                <span>
                  {invertPinch ? "SPREAD (SMALLER)" : "SPREAD (BIGGER)"}
                </span>
              </div>
            </div>

            {/* Quick Gesture Action Buttons + Polarity Invert Toggle */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(3.0, Number((objectScale + 0.35).toFixed(2)));
                  smoothedScaleRef.current = next;
                  setSimPinchRatio(invertPinch ? 0.1 : 0.85);
                  setPinchTelemetry(invertPinch ? 0.1 : 0.85, "pinching_big", next);
                  ProceduralAudio.playSelect();
                }}
                className="px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-bold text-[10px] flex items-center justify-center space-x-1 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>PINCH BIGGER (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = Math.max(0.25, Number((objectScale - 0.35).toFixed(2)));
                  smoothedScaleRef.current = next;
                  setSimPinchRatio(invertPinch ? 0.85 : 0.1);
                  setPinchTelemetry(invertPinch ? 0.85 : 0.1, "pinching_small", next);
                  ProceduralAudio.playSelect();
                }}
                className="px-2.5 py-1.5 rounded bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 text-pink-300 font-bold text-[10px] flex items-center justify-center space-x-1 transition-all cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>PINCH SMALLER (-)</span>
              </button>
            </div>

            {/* Gesture Direction Polarity Switch */}
            <button
              type="button"
              onClick={() => {
                toggleInvertPinch();
                ProceduralAudio.playHover();
              }}
              className="w-full py-1.5 px-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] flex items-center justify-between transition-all cursor-pointer"
              title="Swap whether pinching fingers closer makes object bigger or smaller"
            >
              <span className="flex items-center space-x-1.5">
                <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                <span>GESTURE POLARITY:</span>
              </span>
              <span className="text-amber-300 font-semibold">
                {invertPinch ? "CLOSE = BIGGER" : "SPREAD = BIGGER"}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
