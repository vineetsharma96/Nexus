"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWorldStore, ZONE_ORDER } from "@/engine/store/useWorldStore";
import { ProceduralAudio } from "@/engine/audio/ProceduralAudio";
import {
  createCVGestureWorker,
  CVWorkerOutboundMessage,
} from "@/engine/cv/cvGestureWorker";
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
  BookOpen,
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
  const isGestureTutorialOpen = useWorldStore((state) => state.isGestureTutorialOpen);
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
  const toggleGestureTutorial = useWorldStore((state) => state.toggleGestureTutorial);
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
  const cvDownscaleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerOffscreenSupportedRef = useRef<boolean>(false);
  const workerBusyRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smoothedScaleRef = useRef<number>(1.0);
  const lastHandsCountRef = useRef<number>(0);

  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "initializing" | "active" | "simulated"
  >("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [simPinchRatio, setSimPinchRatio] = useState<number>(0.45);
  const [detectedHandsCount, setDetectedHandsCount] = useState<number>(0);
  const [lastGestureLabel, setLastGestureLabel] = useState<string>("READY");
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(false);

  // Compute target 3D object scale from normalized pinch ratio (0.0 = closed pinch, 1.0 = wide spread)
  const applyPinchRatioToScale = useCallback(
    (normalizedRatio: number) => {
      const clampedRatio = Math.max(0, Math.min(1, normalizedRatio));
      const invert = useWorldStore.getState().invertPinch;
      const effectiveRatio = invert ? 1 - clampedRatio : clampedRatio;

      // Map [0..1] -> [0.25..3.0]
      const targetScale = 0.25 + effectiveRatio * 2.75;
      smoothedScaleRef.current =
        smoothedScaleRef.current * 0.68 + targetScale * 0.32;

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
    if (!wasPaused) {
      ProceduralAudio.playHover();
    }
  }, [setActivityPaused]);

  // Trigger Open Palm -> Resume Activity
  const triggerPalmResume = useCallback(() => {
    const wasPaused = useWorldStore.getState().isActivityPaused;
    setActivityPaused(false);
    setLastGestureLabel("OPEN PALM · RESUMED");
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
      ProceduralAudio.playSelect();
    },
    [cycleZone]
  );

  // Initialize MediaPipe HandLandmarker (numHands: 1 for 2x faster inference in AR/CV)
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
          numHands: 1,
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
            numHands: 1,
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

        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          const isPinchTip = i === 4 || i === 8;
          const isFourFingerTip = i === 8 || i === 12 || i === 16 || i === 20;
          ctx.beginPath();
          ctx.arc(
            pt.x * width,
            pt.y * height,
            isPinchTip || (detectedMode === "four_finger" && isFourFingerTip)
              ? 5
              : 2.5,
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

  // Start / Stop Camera & Web Worker Off-Thread CV Pipeline
  useEffect(() => {
    let isCancelled = false;

    async function startCameraAndVision() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      workerBusyRef.current = false;
      setIsWorkerActive(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!isCvEnabled && !isArMode) {
        setCameraStatus("idle");
        setDetectedHandsCount(0);
        lastHandsCountRef.current = 0;
        return;
      }

      setCameraStatus("initializing");
      setCameraError(null);

      // Prepare lightweight 224x126 offscreen canvas for fallback landmark extraction
      if (!cvDownscaleCanvasRef.current && typeof document !== "undefined") {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = 224;
        offCanvas.height = 126;
        cvDownscaleCanvasRef.current = offCanvas;
      }

      let mediaStream: MediaStream | null = null;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia
        ) {
          const isMobileViewport =
            typeof window !== "undefined" &&
            (window.innerWidth < 768 ||
              (navigator.maxTouchPoints && navigator.maxTouchPoints > 1));

          // Mobile uses 480x270 @ 24-30fps to minimize hardware video decode & AR texture bandwidth
          const videoConstraints = isMobileViewport
            ? {
                width: { ideal: 480 },
                height: { ideal: 270 },
                frameRate: { ideal: 24, max: 30 },
              }
            : {
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 30, max: 30 },
              };

          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                ...videoConstraints,
                facingMode: { exact: arFacingMode },
              },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                ...videoConstraints,
                facingMode: arFacingMode,
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

      if (isArMode && arVideoRef.current) {
        arVideoRef.current.srcObject = mediaStream;
        arVideoRef.current.play().catch(() => {});
      }
      if (isCvEnabled && hudVideoRef.current) {
        hudVideoRef.current.srcObject = mediaStream;
        hudVideoRef.current.play().catch(() => {});
      }

      setCameraStatus("active");

      // Only spawn Web Worker and run CV pipeline when Computer Vision is enabled
      if (!isCvEnabled) {
        return;
      }

      // Spawn dedicated CV Gesture Web Worker
      const worker = createCVGestureWorker();
      let workerStatusResolved = false;

      if (worker) {
        workerRef.current = worker;
        setIsWorkerActive(true);

        const workerReadyPromise = new Promise<boolean>((resolve) => {
          const timeoutId = setTimeout(() => {
            if (!workerStatusResolved) {
              workerStatusResolved = true;
              resolve(false);
            }
          }, 3500);

          worker.onmessage = (evt: MessageEvent<CVWorkerOutboundMessage>) => {
            const msg = evt.data;
            if (!msg || isCancelled) return;

            if (msg.type === "CV_WORKER_STATUS") {
              workerOffscreenSupportedRef.current = msg.offscreenSupported;
              if (!workerStatusResolved) {
                workerStatusResolved = true;
                clearTimeout(timeoutId);
                resolve(msg.offscreenSupported);
              }
              return;
            }

            if (msg.type === "CV_WORKER_RESULT") {
              workerBusyRef.current = false;

              if (msg.handsCount !== lastHandsCountRef.current) {
                lastHandsCountRef.current = msg.handsCount;
                setDetectedHandsCount(msg.handsCount);
              }

              if (msg.triggeredAction === "fist_pause") {
                triggerFistPause();
              } else if (msg.triggeredAction === "palm_resume") {
                triggerPalmResume();
              } else if (msg.triggeredAction === "swipe_next") {
                triggerFourFingerSwipe("next");
              } else if (msg.triggeredAction === "swipe_prev") {
                triggerFourFingerSwipe("prev");
              } else if (msg.handsCount > 0 && msg.mode === "pinch" && msg.computedRatio !== null) {
                smoothedScaleRef.current = msg.smoothedScale;
                useWorldStore
                  .getState()
                  .setPinchTelemetry(
                    msg.computedRatio,
                    msg.pinchState,
                    msg.smoothedScale
                  );
              } else if (msg.handsCount === 0) {
                useWorldStore
                  .getState()
                  .setPinchTelemetry(null, "idle", undefined);
              }

              const canvasEl = overlayCanvasRef.current;
              if (canvasEl) {
                const ctx = canvasEl.getContext("2d");
                if (ctx) {
                  drawHudOverlay(
                    ctx,
                    canvasEl.width,
                    canvasEl.height,
                    msg.hands,
                    msg.computedRatio,
                    msg.mode
                  );
                }
              }

              if (!isCancelled) {
                const nextDelay = Math.max(
                  85,
                  Math.min(180, Math.round((msg.inferMs || 25) * 2.5))
                );
                timerRef.current = setTimeout(runCvInferenceTick, nextDelay);
              }
            }
          };
        });

        worker.postMessage({ type: "INIT_WORKER" });
        const workerOffscreenOk = await workerReadyPromise;

        // If browser doesn't support OffscreenCanvas WebGL inside Worker, init main-thread detector
        // while still offloading all 21-landmark gesture classification to the Worker
        if (!workerOffscreenOk && !isCancelled) {
          await initHandLandmarker();
        }
      } else {
        await initHandLandmarker();
      }

      let lastVideoTime = -1;

      // Non-blocking CV tick that dispatches frame to Web Worker with backpressure control
      const runCvInferenceTick = async () => {
        if (isCancelled) return;

        if (workerBusyRef.current) {
          timerRef.current = setTimeout(runCvInferenceTick, 60);
          return;
        }

        const videoEl = hudVideoRef.current || arVideoRef.current;
        const activeWorker = workerRef.current;

        if (
          videoEl &&
          videoEl.readyState >= 2 &&
          videoEl.currentTime !== lastVideoTime
        ) {
          lastVideoTime = videoEl.currentTime;
          const now = performance.now();
          const state = useWorldStore.getState();

          // Path A: Full off-thread MediaPipe + Gesture Detection in Web Worker via zero-copy ImageBitmap
          if (
            activeWorker &&
            workerOffscreenSupportedRef.current &&
            typeof createImageBitmap === "function"
          ) {
            try {
              workerBusyRef.current = true;
              const bitmap = await createImageBitmap(videoEl, {
                resizeWidth: 224,
                resizeHeight: 126,
              });
              if (isCancelled) {
                bitmap.close();
                return;
              }
              activeWorker.postMessage(
                {
                  type: "PROCESS_BITMAP",
                  bitmap,
                  timestamp: now,
                  facingMode: state.arFacingMode,
                  invertPinch: state.invertPinch,
                },
                [bitmap]
              );
              return;
            } catch {
              workerBusyRef.current = false;
            }
          }

          // Path B: Fallback landmark extraction + Web Worker gesture classification
          const landmarker = landmarkerRef.current;
          const offscreenEl = cvDownscaleCanvasRef.current;
          if (landmarker && activeWorker) {
            try {
              let inputSource: HTMLVideoElement | HTMLCanvasElement = videoEl;
              if (offscreenEl) {
                const offCtx = offscreenEl.getContext("2d", {
                  willReadFrequently: true,
                });
                if (offCtx) {
                  offCtx.drawImage(videoEl, 0, 0, 224, 126);
                  inputSource = offscreenEl;
                }
              }
              const results = landmarker.detectForVideo(inputSource, now);
              const hands = results?.landmarks || [];
              workerBusyRef.current = true;
              activeWorker.postMessage({
                type: "CLASSIFY_LANDMARKS",
                hands,
                timestamp: now,
                facingMode: state.arFacingMode,
                invertPinch: state.invertPinch,
              });
              return;
            } catch {
              workerBusyRef.current = false;
            }
          }
        }

        if (!isCancelled) {
          timerRef.current = setTimeout(runCvInferenceTick, 90);
        }
      };

      timerRef.current = setTimeout(runCvInferenceTick, 85);
    }

    startCameraAndVision();

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      workerBusyRef.current = false;
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
      {isArMode && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <video
            ref={arVideoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              arFacingMode === "user" ? "scale-x-[-1]" : ""
            }`}
          />

          {cameraStatus === "simulated" && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.18) 0%, rgba(3, 7, 18, 0.85) 80%)",
              }}
            />
          )}

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
        </div>
      )}

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

        {/* Interactive Gesture Tutorial Trigger Button */}
        <button
          type="button"
          onClick={() => {
            ProceduralAudio.playSelect();
            toggleGestureTutorial();
          }}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs border transition-all flex items-center space-x-1 shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            isGestureTutorialOpen
              ? "bg-purple-500/30 text-purple-200 border-purple-400 font-bold"
              : "glass-panel text-purple-300 hover:text-white hover:border-purple-400/50 border-purple-400/30"
          }`}
          title="Open Interactive Hand Gesture Tutorial (Fist, Palm, 4-Finger Swipe)"
        >
          <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
          <span className="sm:hidden">GUIDE</span>
          <span className="hidden sm:inline">GESTURE TUTORIAL</span>
        </button>

        {/* Activity Pause / Resume Status Button */}
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
              <span className="hidden xl:inline">PAUSED (PALM TO RESUME)</span>
              <span className="xl:hidden">PAUSED</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="hidden xl:inline">LIVE</span>
            </>
          )}
        </button>

        {/* Compact Scale Readout & Quick Pinch Buttons */}
        <div className="hidden md:flex glass-panel px-2 py-0.5 sm:py-1 rounded border border-white/10 items-center space-x-1 text-[10px] sm:text-xs shrink-0">
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
            <div className="flex items-center space-x-1.5 min-w-0">
              <Scan className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white tracking-wider text-[11px] truncate">
                AR & CV GESTURE ENGINE
              </span>
              {isWorkerActive && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[8px] text-emerald-300 font-bold shrink-0">
                  WORKER
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={toggleGestureTutorial}
                className="px-2 py-0.5 rounded text-[10px] text-purple-300 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 cursor-pointer"
                title="Open Interactive Gesture Tutorial"
              >
                TUTORIAL
              </button>
              <button
                type="button"
                onClick={toggleCvEnabled}
                className="px-2 py-0.5 rounded text-[10px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
              >
                HIDE
              </button>
            </div>
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
          <div className="relative w-full h-28 sm:h-36 rounded bg-slate-950 border border-cyan-500/30 overflow-hidden mb-2.5">
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
              width={256}
              height={144}
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
                      ? "bg-emerald-400"
                      : cameraStatus === "initializing"
                      ? "bg-amber-400"
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

          {/* CV Feature 3: 4-Finger Left/Right Swipe Zone Navigation */}
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
