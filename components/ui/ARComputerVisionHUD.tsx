"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWorldStore, ZONE_ORDER } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";
import {
  Scan,
  Maximize2,
  Minimize2,
  RotateCcw,
  FlipHorizontal,
  Hand,
  ArrowLeftRight,
  Eye,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Camera,
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

const ZONE_SHORT_NAMES: Record<string, string> = {
  core: "CORE",
  code_city: "CITY",
  data_ocean: "OCEAN",
  ai_lab: "LAB",
};

export const ARComputerVisionHUD: React.FC = () => {
  const isBooted = useWorldStore((state) => state.isBooted);
  const isArMode = useWorldStore((state) => state.isArMode);
  const isCvEnabled = useWorldStore((state) => state.isCvEnabled);
  const objectScale = useWorldStore((state) => state.objectScale);
  const pinchDistance = useWorldStore((state) => state.pinchDistance);
  const pinchState = useWorldStore((state) => state.pinchState);
  const cvGesture = useWorldStore((state) => state.cvGesture);
  const isActivityPaused = useWorldStore((state) => state.isActivityPaused);
  const invertPinch = useWorldStore((state) => state.invertPinch);
  const arFacingMode = useWorldStore((state) => state.arFacingMode);
  const selectedPoi = useWorldStore((state) => state.selectedPoi);
  const currentZone = useWorldStore((state) => state.currentZone);

  const toggleArMode = useWorldStore((state) => state.toggleArMode);
  const toggleCvEnabled = useWorldStore((state) => state.toggleCvEnabled);
  const setPinchTelemetry = useWorldStore((state) => state.setPinchTelemetry);
  const setActivityPaused = useWorldStore((state) => state.setActivityPaused);
  const cycleZone = useWorldStore((state) => state.cycleZone);
  const setZone = useWorldStore((state) => state.setZone);
  const toggleInvertPinch = useWorldStore((state) => state.toggleInvertPinch);
  const setArFacingMode = useWorldStore((state) => state.setArFacingMode);
  const toggleArFacingMode = useWorldStore((state) => state.toggleArFacingMode);

  const arVideoRef = useRef<HTMLVideoElement>(null);
  const hudVideoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedScaleRef = useRef<number>(1.0);

  // Multi-gesture tracking refs
  const fistHoldFramesRef = useRef<number>(0);
  const palmHoldFramesRef = useRef<number>(0);
  const swipeHistoryRef = useRef<{ x: number; t: number }[]>([]);
  const lastZoneSwipeTimeRef = useRef<number>(0);
  const gestureBannerRef = useRef<{ label: string; color: string; until: number } | null>(null);

  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "initializing" | "active" | "simulated"
  >("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [simPinchRatio, setSimPinchRatio] = useState<number>(0.45);
  const [detectedHandsCount, setDetectedHandsCount] = useState<number>(0);
  const [lastGestureLabel, setLastGestureLabel] = useState<string>("READY");

  // Compute target 3D object scale from normalized pinch ratio (0.0 = closed pinch, 1.0 = wide spread)
  const applyPinchRatioToScale = useCallback(
    (normalizedRatio: number) => {
      const clampedRatio = Math.max(0, Math.min(1, normalizedRatio));
      const invert = useWorldStore.getState().invertPinch;
      const effectiveRatio = invert ? 1 - clampedRatio : clampedRatio;

      // Map [0..1] -> [0.25..3.0]
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

  // Trigger Clenched Fist -> Pause Activity
  const triggerFistPause = useCallback(() => {
    const wasPaused = useWorldStore.getState().isActivityPaused;
    setActivityPaused(true);
    setLastGestureLabel("CLENCHED FIST · PAUSED");
    gestureBannerRef.current = {
      label: "✊ CLENCHED FIST: ACTIVITY PAUSED",
      color: "#f59e0b",
      until: performance.now() + 1800,
    };
    if (!wasPaused) {
      ProceduralAudio.playHover();
    }
  }, [setActivityPaused]);

  // Trigger Open Palm -> Resume Activity
  const triggerPalmResume = useCallback(() => {
    const wasPaused = useWorldStore.getState().isActivityPaused;
    setActivityPaused(false);
    setLastGestureLabel("OPEN PALM · RESUMED");
    gestureBannerRef.current = {
      label: "🖐 OPEN PALM: ACTIVITY RESUMED",
      color: "#10b981",
      until: performance.now() + 1800,
    };
    if (wasPaused) {
      ProceduralAudio.playSelect();
    }
  }, [setActivityPaused]);

  // Trigger 4-Finger Horizontal Swipe -> Next / Prev Zone (core, city, ocean, lab)
  const triggerFourFingerSwipe = useCallback(
    (direction: "next" | "prev") => {
      cycleZone(direction);
      const nextZone = useWorldStore.getState().currentZone;
      const zoneName = ZONE_SHORT_NAMES[nextZone] || nextZone.toUpperCase();
      const label =
        direction === "next"
          ? `4-FINGER RIGHT → ${zoneName}`
          : `4-FINGER LEFT ← ${zoneName}`;
      setLastGestureLabel(label);
      gestureBannerRef.current = {
        label:
          direction === "next"
            ? `🖖 4-FINGER RIGHT ► ${zoneName}`
            : `◄ 4-FINGER LEFT 🖖 ${zoneName}`,
        color: "#a855f7",
        until: performance.now() + 1800,
      };
      ProceduralAudio.playSelect();
    },
    [cycleZone]
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
        return handLandmarker;
      } catch (cpuErr) {
        console.warn(
          "[NEXUS CV] HandLandmarker unavailable, using interactive CV simulator:",
          cpuErr
        );
        return null;
      }
    }
  }, []);

  // Draw hand landmarks and active gesture overlays onto the HUD canvas
  const drawHudOverlay = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      landmarksList: { x: number; y: number; z: number }[][],
      activeRatio: number | null,
      detectedMode: "pinch" | "fist" | "palm" | "four_finger"
    ) => {
      ctx.clearRect(0, 0, width, height);

      if (landmarksList.length === 0) {
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(16, 16, width - 32, height - 32);
        return;
      }

      const boneColor =
        detectedMode === "fist"
          ? "rgba(245, 158, 11, 0.75)"
          : detectedMode === "palm"
          ? "rgba(16, 185, 129, 0.75)"
          : detectedMode === "four_finger"
          ? "rgba(168, 85, 247, 0.8)"
          : "rgba(0, 240, 255, 0.55)";

      for (const landmarks of landmarksList) {
        // Draw skeletal bones
        ctx.strokeStyle = boneColor;
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
          const isFourFingerTip = i === 8 || i === 12 || i === 16 || i === 20;
          ctx.beginPath();
          ctx.arc(
            pt.x * width,
            pt.y * height,
            isPinchTip || (detectedMode === "four_finger" && isFourFingerTip)
              ? 5.5
              : 3,
            0,
            Math.PI * 2
          );
          ctx.fillStyle =
            detectedMode === "fist"
              ? "#f59e0b"
              : detectedMode === "palm"
              ? "#10b981"
              : detectedMode === "four_finger" && isFourFingerTip
              ? "#a855f7"
              : isPinchTip
              ? "#f59e0b"
              : "#00f0ff";
          ctx.fill();
        }

        // Draw 4-finger tracking bar when 4 fingers are raised
        if (detectedMode === "four_finger") {
          const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
          if (tips.every(Boolean)) {
            ctx.beginPath();
            ctx.strokeStyle = "#a855f7";
            ctx.lineWidth = 2.5;
            ctx.moveTo(tips[0].x * width, tips[0].y * height);
            for (let k = 1; k < tips.length; k++) {
              ctx.lineTo(tips[k].x * width, tips[k].y * height);
            }
            ctx.stroke();
          }
        }

        // Draw Pinch Vector when in pinch mode
        if (detectedMode === "pinch") {
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
      }
    },
    []
  );

  // Start / Stop Camera & CV Loop when isCvEnabled, isArMode, or arFacingMode changes
  useEffect(() => {
    let isCancelled = false;

    async function startCameraAndVision() {
      // Stop any existing stream first so mobile devices release camera hardware cleanly when switching Front/Rear
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!isCvEnabled && !isArMode) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setCameraStatus("idle");
        setDetectedHandsCount(0);
        return;
      }

      setCameraStatus("initializing");
      setCameraError(null);

      const landmarkerPromise = initHandLandmarker();

      let mediaStream: MediaStream | null = null;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia
        ) {
          try {
            // Try exact facingMode first for reliable Front/Rear switch on mobile
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { exact: arFacingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch {
            // Fallback to ideal facingMode for desktop single-webcam systems
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: arFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          }
        } else {
          throw new Error("Camera API unavailable in this browser context.");
        }
      } catch {
        if (isCancelled) return;
        setCameraStatus("simulated");
        setCameraError(
          "Live camera unavailable or permission declined — Interactive CV Gesture Simulator active."
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
            const now = performance.now();
            const results = landmarker.detectForVideo(videoEl, now);
            const hands = results?.landmarks || [];
            setDetectedHandsCount(hands.length);

            let computedRatio: number | null = null;
            let currentMode: "pinch" | "fist" | "palm" | "four_finger" = "pinch";

            if (hands.length >= 1) {
              const h = hands[0];
              const wrist = h[0];
              const thumbTip = h[4];
              const indexMcp = h[5];
              const indexPip = h[6];
              const indexTip = h[8];
              const middleMcp = h[9];
              const middlePip = h[10];
              const middleTip = h[12];
              const ringMcp = h[13];
              const ringPip = h[14];
              const ringTip = h[16];
              const pinkyMcp = h[17];
              const pinkyPip = h[18];
              const pinkyTip = h[20];

              if (wrist && thumbTip && indexTip && middleMcp && pinkyMcp) {
                const palmSize = Math.max(
                  0.08,
                  Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y)
                );

                // Check finger extension vs curl for Index, Middle, Ring, Pinky
                const isFingerExtended = (
                  tip: { x: number; y: number },
                  pip: { x: number; y: number },
                  mcp: { x: number; y: number }
                ) => {
                  const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                  const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
                  const dMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
                  return dTip > dPip * 1.07 && dTip > dMcp * 1.3;
                };

                const isFingerCurled = (
                  tip: { x: number; y: number },
                  pip: { x: number; y: number },
                  mcp: { x: number; y: number }
                ) => {
                  const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                  const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
                  const dTipMcp = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
                  return dTip < dPip * 1.05 || dTipMcp < palmSize * 0.78;
                };

                const idxExt = isFingerExtended(indexTip, indexPip, indexMcp);
                const midExt = isFingerExtended(middleTip, middlePip, middleMcp);
                const rngExt = isFingerExtended(ringTip, ringPip, ringMcp);
                const pnkExt = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

                const idxCurl = isFingerCurled(indexTip, indexPip, indexMcp);
                const midCurl = isFingerCurled(middleTip, middlePip, middleMcp);
                const rngCurl = isFingerCurled(ringTip, ringPip, ringMcp);
                const pnkCurl = isFingerCurled(pinkyTip, pinkyPip, pinkyMcp);

                const fourExtended = idxExt && midExt && rngExt && pnkExt;
                const fourCurled = idxCurl && midCurl && rngCurl && pnkCurl;

                const thumbToPinkyMcp = Math.hypot(
                  thumbTip.x - pinkyMcp.x,
                  thumbTip.y - pinkyMcp.y
                );
                const thumbToIndexMcp = Math.hypot(
                  thumbTip.x - indexMcp.x,
                  thumbTip.y - indexMcp.y
                );
                const thumbExtended =
                  thumbToPinkyMcp > palmSize * 1.05 &&
                  thumbToIndexMcp > palmSize * 0.55;
                const thumbTucked = thumbToIndexMcp < palmSize * 0.68;

                // 1. Check Four-Finger Horizontal Swipe (Left / Right)
                if (fourExtended) {
                  const rawCentroidX =
                    (indexTip.x + middleTip.x + ringTip.x + pinkyTip.x) / 4;
                  // Normalize screen X so moving hand right on screen is always +deltaX
                  const screenX =
                    useWorldStore.getState().arFacingMode === "user"
                      ? 1 - rawCentroidX
                      : rawCentroidX;

                  swipeHistoryRef.current.push({ x: screenX, t: now });
                  swipeHistoryRef.current = swipeHistoryRef.current.filter(
                    (pt) => now - pt.t <= 360
                  );

                  const oldest = swipeHistoryRef.current[0];
                  const deltaX = oldest ? screenX - oldest.x : 0;

                  if (
                    Math.abs(deltaX) > 0.13 &&
                    now - lastZoneSwipeTimeRef.current > 950
                  ) {
                    currentMode = "four_finger";
                    lastZoneSwipeTimeRef.current = now;
                    swipeHistoryRef.current = [];
                    fistHoldFramesRef.current = 0;
                    palmHoldFramesRef.current = 0;
                    triggerFourFingerSwipe(deltaX > 0 ? "next" : "prev");
                  } else if (Math.abs(deltaX) > 0.05) {
                    currentMode = "four_finger";
                  } else if (thumbExtended) {
                    // 2. Stationary Open Palm -> Resume Activity
                    currentMode = "palm";
                    palmHoldFramesRef.current += 1;
                    fistHoldFramesRef.current = 0;
                    if (palmHoldFramesRef.current === 3) {
                      triggerPalmResume();
                    }
                  } else {
                    currentMode = "four_finger";
                  }
                } else if (fourCurled && thumbTucked) {
                  // 3. Clenched Fist -> Pause Activity
                  currentMode = "fist";
                  fistHoldFramesRef.current += 1;
                  palmHoldFramesRef.current = 0;
                  swipeHistoryRef.current = [];
                  if (fistHoldFramesRef.current === 3) {
                    triggerFistPause();
                  }
                } else {
                  // 4. Thumb + Index Pinch Scaling
                  currentMode = "pinch";
                  fistHoldFramesRef.current = 0;
                  palmHoldFramesRef.current = 0;
                  swipeHistoryRef.current = [];

                  const rawPinchDist = Math.hypot(
                    thumbTip.x - indexTip.x,
                    thumbTip.y - indexTip.y
                  );
                  const normalized = (rawPinchDist / palmSize - 0.18) / 0.95;
                  computedRatio = Math.max(0, Math.min(1, normalized));
                  applyPinchRatioToScale(computedRatio);
                }
              }
            } else {
              fistHoldFramesRef.current = 0;
              palmHoldFramesRef.current = 0;
              swipeHistoryRef.current = [];
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
                  computedRatio,
                  currentMode
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
    triggerFistPause,
    triggerPalmResume,
    triggerFourFingerSwipe,
  ]);

  // Multi-touch 2-finger pinch & keyboard shortcuts
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
            <div className="w-64 h-64 sm:w-88 sm:h-88 rounded-full border border-cyan-400/25 flex items-center justify-center relative">
              <div className="w-4 h-4 border-t-2 border-l-2 border-cyan-400 absolute top-5 left-5" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400 absolute top-5 right-5" />
              <div className="w-4 h-4 border-b-2 border-l-2 border-cyan-400 absolute bottom-5 left-5" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-cyan-400 absolute bottom-5 right-5" />
              <div className="absolute -top-7 text-[10px] font-mono text-cyan-300 tracking-widest bg-slate-950/80 px-2.5 py-0.5 rounded border border-cyan-400/40 whitespace-nowrap">
                AR ANCHOR · {arFacingMode === "user" ? "FRONT CAM" : "REAR CAM"} · {objectScale.toFixed(2)}x
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Non-Overlapping AR & Computer Vision Control Strip (Left-bounded before Sandbox button) */}
      <div className="fixed top-[94px] sm:top-[110px] lg:top-[76px] left-2.5 sm:left-4 md:left-6 right-[96px] sm:right-[132px] z-30 flex items-center gap-1 sm:gap-1.5 font-mono pointer-events-auto overflow-x-auto no-scrollbar">
        {/* Toggle AR Mode */}
        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleArMode();
          }}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs border transition-all flex items-center space-x-1 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            isArMode
              ? "bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)] font-bold"
              : "glass-panel text-slate-300 hover:text-white hover:border-emerald-400/50 border-white/10"
          }`}
          title="Toggle Augmented Reality Camera Passthrough"
        >
          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
          <span className="sm:hidden">{isArMode ? "AR:ON" : "AR"}</span>
          <span className="hidden sm:inline">{isArMode ? "AR MODE: ON" : "AR MODE"}</span>
        </button>

        {/* Dedicated Front / Rear Camera Switcher in AR Bar */}
        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleArFacingMode();
          }}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs border transition-all flex items-center space-x-1 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            isArMode || isCvEnabled
              ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/60 font-semibold"
              : "glass-panel text-slate-300 hover:text-white hover:border-cyan-400/40 border-white/10"
          }`}
          title="Switch between Front (Selfie) and Rear (Environment) Camera"
          aria-label="Switch Camera Front or Rear"
        >
          <FlipHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
          <span className="sm:hidden">
            {arFacingMode === "user" ? "FRONT" : "REAR"}
          </span>
          <span className="hidden sm:inline">
            CAM: {arFacingMode === "user" ? "FRONT" : "REAR"}
          </span>
        </button>

        {/* Toggle Computer Vision Hand & Gesture Tracking */}
        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleCvEnabled();
          }}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs border transition-all flex items-center space-x-1 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            isCvEnabled
              ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.45)] font-bold"
              : "glass-panel text-slate-300 hover:text-white hover:border-cyan-400/50 border-white/10"
          }`}
          title="Toggle Computer Vision Hand Gestures (Fist Pause, Open Palm Resume, 4-Finger Swipe, Pinch Scale)"
        >
          <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
          <span className="sm:hidden">{isCvEnabled ? "CV:ON" : "CV"}</span>
          <span className="hidden sm:inline">
            {isCvEnabled ? "CV GESTURES: ON" : "CV GESTURES"}
          </span>
        </button>

        {/* Activity Pause / Resume Status Button (Fist = Pause, Open Palm = Resume) */}
        <button
          type="button"
          onClick={() => {
            if (isActivityPaused) {
              triggerPalmResume();
            } else {
              triggerFistPause();
            }
          }}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs border transition-all flex items-center space-x-1 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            isActivityPaused
              ? "bg-amber-500/30 text-amber-200 border-amber-400 font-bold"
              : "glass-panel text-slate-300 hover:text-white border-white/10"
          }`}
          title={
            isActivityPaused
              ? "Activity Paused (Show Open Palm or Click to Resume)"
              : "Activity Running (Show Clenched Fist or Click to Pause)"
          }
        >
          {isActivityPaused ? (
            <>
              <Play className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden md:inline">PAUSED (PALM TO RESUME)</span>
              <span className="md:hidden">PAUSED</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">LIVE</span>
            </>
          )}
        </button>

        {/* Compact Scale Readout & Quick Pinch Buttons */}
        <div className="hidden sm:flex glass-panel px-2 py-0.5 sm:py-1 rounded border border-white/10 items-center space-x-1 text-[10px] sm:text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = Math.max(0.25, Number((objectScale - 0.25).toFixed(2)));
              setPinchTelemetry(0.15, "pinching_small", next);
              ProceduralAudio.playHover();
            }}
            className="p-0.5 rounded hover:bg-white/10 text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
            title="Pinch Object Smaller (-)"
          >
            <Minimize2 className="w-3 h-3" />
          </button>

          <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300 min-w-[40px] text-center tabular-nums">
            {objectScale.toFixed(2)}x
          </span>

          <button
            type="button"
            onClick={() => {
              const next = Math.min(3.0, Number((objectScale + 0.25).toFixed(2)));
              setPinchTelemetry(0.85, "pinching_big", next);
              ProceduralAudio.playHover();
            }}
            className="p-0.5 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Pinch Object Bigger (+)"
          >
            <Maximize2 className="w-3 h-3" />
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
              className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Object Scale to 1.0x"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Computer Vision Hand Tracking & Multi-Gesture Inspector Panel */}
      {isCvEnabled && (
        <div
          className={`fixed top-[132px] sm:top-[150px] lg:top-[116px] left-2.5 right-2.5 sm:left-4 md:left-6 sm:right-auto z-30 sm:w-80 md:w-[340px] ${
            selectedPoi
              ? "max-h-[38dvh] sm:max-h-[calc(100dvh-180px)]"
              : "max-h-[calc(100dvh-190px)]"
          } overflow-y-auto glass-panel-glow p-3 sm:p-4 rounded-lg border border-cyan-500/40 text-xs font-mono shadow-[0_0_35px_rgba(0,240,255,0.2)] pointer-events-auto`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Scan className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="font-bold text-white tracking-wider text-[11px] truncate">
                AR & CV GESTURE ENGINE
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCvEnabled}
              className="px-2 py-0.5 rounded text-[10px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer shrink-0"
            >
              HIDE
            </button>
          </div>

          {/* Dedicated Front / Rear Camera Switcher Bar inside AR/CV Panel */}
          <div className="mb-2.5 p-1 rounded bg-slate-950/90 border border-white/10 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                ProceduralAudio.playSelect();
                setArFacingMode("user");
              }}
              className={`py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                arFacingMode === "user"
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Camera className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>FRONT CAMERA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                ProceduralAudio.playSelect();
                setArFacingMode("environment");
              }}
              className={`py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                arFacingMode === "environment"
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <FlipHorizontal className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>REAR CAMERA</span>
            </button>
          </div>

          {/* Live Webcam Feed + 21-Landmark Skeleton Canvas Overlay */}
          <div className="relative w-full h-28 sm:h-40 rounded bg-slate-950 border border-cyan-500/30 overflow-hidden mb-2.5">
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
              height={160}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                arFacingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {/* Status Badge inside Viewport */}
            <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
              <div className="flex items-center space-x-1.5 bg-slate-950/85 px-2 py-0.5 rounded border border-white/10 text-[9px] truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    cameraStatus === "active"
                      ? "bg-emerald-400 animate-ping"
                      : cameraStatus === "initializing"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-cyan-400"
                  }`}
                />
                <span className="text-slate-200 truncate">
                  {cameraStatus === "active"
                    ? detectedHandsCount > 0
                      ? `HAND LOCKED (${detectedHandsCount})`
                      : "SHOW HAND TO CAMERA"
                    : cameraStatus === "initializing"
                    ? "STARTING CAMERA..."
                    : "SIMULATOR ACTIVE"}
                </span>
              </div>

              <span className="bg-slate-950/85 px-1.5 py-0.5 rounded border border-cyan-500/30 text-[9px] text-cyan-300 font-semibold shrink-0">
                {arFacingMode === "user" ? "FRONT" : "REAR"}
              </span>
            </div>

            {/* Interactive Virtual Hand Simulator when no physical camera is active */}
            {cameraStatus !== "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2.5 pt-6 bg-slate-950/90 text-center">
                <div className="relative w-36 h-11 bg-slate-900/90 rounded border border-cyan-500/30 flex items-center justify-center mb-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_#f59e0b] transition-all duration-75"
                    style={{
                      transform: `translateX(${-(8 + simPinchRatio * 42)}px)`,
                    }}
                  />
                  <div
                    className="h-0.5 bg-gradient-to-r from-amber-400 via-cyan-400 to-amber-400 transition-all duration-75"
                    style={{ width: `${Math.max(8, simPinchRatio * 84)}px` }}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_#f59e0b] transition-all duration-75"
                    style={{
                      transform: `translateX(${8 + simPinchRatio * 42}px)`,
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-tight px-2 line-clamp-2">
                  {cameraError || "Use gesture buttons or pinch slider below."}
                </p>
              </div>
            )}

            {/* Real-Time Gesture Banner at bottom of camera view */}
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 px-2 py-1 border-t border-white/10 flex items-center justify-between text-[9px] gap-1">
              <span className="text-slate-400 truncate">
                GESTURE: <strong className="text-cyan-300">{lastGestureLabel}</strong>
              </span>
              <span
                className={`font-bold shrink-0 ${
                  isActivityPaused
                    ? "text-amber-400"
                    : pinchState === "pinching_big"
                    ? "text-emerald-400"
                    : pinchState === "pinching_small"
                    ? "text-pink-400"
                    : "text-cyan-300"
                }`}
              >
                {isActivityPaused
                  ? "⏸ PAUSED"
                  : pinchState === "pinching_big"
                  ? "▲ BIGGER"
                  : pinchState === "pinching_small"
                  ? "▼ SMALLER"
                  : `${objectScale.toFixed(2)}x`}
              </span>
            </div>
          </div>

          {/* CV Feature 1 & 2: Clenched Fist (Pause) & Open Palm (Resume) */}
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
              <span>HAND POSTURE ACTIVITY CONTROL</span>
              <span className={isActivityPaused ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {isActivityPaused ? "STATUS: PAUSED" : "STATUS: ACTIVE"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={triggerFistPause}
                className={`p-2 rounded border text-left transition-all cursor-pointer ${
                  isActivityPaused || cvGesture === "fist_pause"
                    ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-black/40 border-white/10 text-slate-300 hover:border-amber-400/50 hover:text-white"
                }`}
                title="Show Clenched Fist to Pause 3D Activity"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-300 mb-0.5">
                  <span>CLENCHED FIST</span>
                  <Pause className="w-3 h-3 shrink-0" />
                </div>
                <div className="text-[9px] text-slate-400">Pause Activity</div>
              </button>

              <button
                type="button"
                onClick={triggerPalmResume}
                className={`p-2 rounded border text-left transition-all cursor-pointer ${
                  !isActivityPaused && cvGesture === "palm_resume"
                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-black/40 border-white/10 text-slate-300 hover:border-emerald-400/50 hover:text-white"
                }`}
                title="Show Open Palm to Resume 3D Activity"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300 mb-0.5">
                  <span>OPEN PALM</span>
                  <Play className="w-3 h-3 shrink-0" />
                </div>
                <div className="text-[9px] text-slate-400">Resume Activity</div>
              </button>
            </div>
          </div>

          {/* CV Feature 3: 4-Finger Left/Right Swipe Zone Navigation (Core, City, Ocean, Lab) */}
          <div className="mb-2.5 p-2 rounded bg-black/40 border border-white/10">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1.5">
              <span>4-FINGER SWIPE (LEFT / RIGHT)</span>
              <span className="text-purple-300 font-bold">
                ZONE: {ZONE_SHORT_NAMES[currentZone]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => triggerFourFingerSwipe("prev")}
                className={`py-1.5 px-2 rounded border text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                  cvGesture === "swipe_left"
                    ? "bg-purple-500/30 border-purple-400 text-purple-200"
                    : "bg-purple-500/10 hover:bg-purple-500/25 border-purple-400/40 text-purple-300"
                }`}
                title="Move 4 Fingers Left for Previous Zone"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>4F LEFT (PREV)</span>
              </button>

              <button
                type="button"
                onClick={() => triggerFourFingerSwipe("next")}
                className={`py-1.5 px-2 rounded border text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                  cvGesture === "swipe_right"
                    ? "bg-purple-500/30 border-purple-400 text-purple-200"
                    : "bg-purple-500/10 hover:bg-purple-500/25 border-purple-400/40 text-purple-300"
                }`}
                title="Move 4 Fingers Right for Next Zone"
              >
                <span>4F RIGHT (NEXT)</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {/* 4-Zone Sequence Indicator Strip */}
            <div className="grid grid-cols-4 gap-1">
              {ZONE_ORDER.map((zId) => {
                const active = currentZone === zId;
                return (
                  <button
                    key={zId}
                    type="button"
                    onClick={() => {
                      ProceduralAudio.playSelect();
                      setZone(zId);
                    }}
                    className={`py-1 rounded text-[9px] font-bold text-center transition-all cursor-pointer ${
                      active
                        ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400"
                        : "bg-white/5 text-slate-400 hover:text-white border border-transparent"
                    }`}
                  >
                    {ZONE_SHORT_NAMES[zId]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CV Feature 4: Interactive Pinch Distance Slider */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center text-[9px] text-slate-300 mb-1">
                <span className="truncate">PINCH SCALE: {targetObjectName}</span>
                <span className="text-cyan-300 font-bold shrink-0 tabular-nums">
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
            </div>

            {/* Gesture Direction Polarity Switch */}
            <button
              type="button"
              onClick={() => {
                toggleInvertPinch();
                ProceduralAudio.playHover();
              }}
              className="w-full py-1 px-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[9px] flex items-center justify-between transition-all cursor-pointer"
              title="Swap whether pinching fingers closer makes object bigger or smaller"
            >
              <span className="flex items-center space-x-1.5">
                <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                <span>PINCH POLARITY:</span>
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
