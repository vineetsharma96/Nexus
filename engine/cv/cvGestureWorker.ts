"use client";

export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export type GestureMode = "pinch" | "fist" | "palm" | "four_finger";

export type TriggeredGestureAction =
  | "fist_pause"
  | "palm_resume"
  | "swipe_next"
  | "swipe_prev"
  | null;

export interface CVWorkerResultMessage {
  type: "CV_WORKER_RESULT";
  hands: HandLandmarkPoint[][];
  handsCount: number;
  mode: GestureMode;
  computedRatio: number | null;
  smoothedScale: number;
  pinchState: "idle" | "pinching_small" | "pinching_big";
  triggeredAction: TriggeredGestureAction;
  inferMs: number;
  offscreenActive: boolean;
}

export interface CVWorkerStatusMessage {
  type: "CV_WORKER_STATUS";
  ready: boolean;
  offscreenSupported: boolean;
  error?: string;
}

export type CVWorkerOutboundMessage =
  | CVWorkerResultMessage
  | CVWorkerStatusMessage;

/**
 * Self-contained Web Worker script that offloads both:
 * 1. MediaPipe HandLandmarker inference on an OffscreenCanvas (224x126) via transferred ImageBitmap
 * 2. 21-Landmark 3D geometric posture & trajectory classification (Clenched Fist pause,
 *    Open Palm resume, 4-Finger Left/Right zone swipe, and Thumb-Index pinch scale)
 */
const WORKER_SOURCE = `
let landmarker = null;
let offscreenCanvas = null;
let offscreenCtx = null;
let offscreenReady = false;
let isInitializing = false;

// Temporal gesture tracking state inside Worker thread
let fistHoldFrames = 0;
let palmHoldFrames = 0;
let swipeHistory = [];
let lastZoneSwipeTime = 0;
let smoothedScale = 1.0;

async function initMediaPipeInWorker() {
  if (landmarker || isInitializing) return;
  isInitializing = true;

  try {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas not available in Worker");
    }
    offscreenCanvas = new OffscreenCanvas(224, 126);
    offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs");
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
    );

    try {
      landmarker = await vision.HandLandmarker.createFromOptions(filesetResolver, {
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
      });
    } catch (_gpuErr) {
      landmarker = await vision.HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
    }

    offscreenReady = true;
    self.postMessage({
      type: "CV_WORKER_STATUS",
      ready: true,
      offscreenSupported: true,
    });
  } catch (err) {
    offscreenReady = false;
    self.postMessage({
      type: "CV_WORKER_STATUS",
      ready: true,
      offscreenSupported: false,
      error: err ? String(err.message || err) : "Offscreen inference fallback",
    });
  } finally {
    isInitializing = false;
  }
}

function classifyLandmarks(hands, now, facingMode, invertPinch) {
  let computedRatio = null;
  let currentMode = "pinch";
  let triggeredAction = null;
  let pinchState = "idle";

  if (hands && hands.length >= 1) {
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

      const isFingerExtended = (tip, pip, mcp) => {
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        const dMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        return dTip > dPip * 1.07 && dTip > dMcp * 1.3;
      };

      const isFingerCurled = (tip, pip, mcp) => {
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
        const screenX =
          facingMode === "user" ? 1 - rawCentroidX : rawCentroidX;

        swipeHistory.push({ x: screenX, t: now });
        swipeHistory = swipeHistory.filter((pt) => now - pt.t <= 420);

        const oldest = swipeHistory[0];
        const deltaX = oldest ? screenX - oldest.x : 0;

        if (
          Math.abs(deltaX) > 0.12 &&
          now - lastZoneSwipeTime > 850
        ) {
          currentMode = "four_finger";
          lastZoneSwipeTime = now;
          swipeHistory = [];
          fistHoldFrames = 0;
          palmHoldFrames = 0;
          triggeredAction = deltaX > 0 ? "swipe_next" : "swipe_prev";
        } else if (Math.abs(deltaX) > 0.05) {
          currentMode = "four_finger";
        } else if (thumbExtended) {
          // 2. Stationary Open Palm -> Resume Activity (2 ticks)
          currentMode = "palm";
          palmHoldFrames += 1;
          fistHoldFrames = 0;
          if (palmHoldFrames === 2) {
            triggeredAction = "palm_resume";
          }
        } else {
          currentMode = "four_finger";
        }
      } else if (fourCurled && thumbTucked) {
        // 3. Clenched Fist -> Pause Activity (2 ticks)
        currentMode = "fist";
        fistHoldFrames += 1;
        palmHoldFrames = 0;
        swipeHistory = [];
        if (fistHoldFrames === 2) {
          triggeredAction = "fist_pause";
        }
      } else {
        // 4. Thumb + Index Pinch Scaling
        currentMode = "pinch";
        fistHoldFrames = 0;
        palmHoldFrames = 0;
        swipeHistory = [];

        const rawPinchDist = Math.hypot(
          thumbTip.x - indexTip.x,
          thumbTip.y - indexTip.y
        );
        const normalized = (rawPinchDist / palmSize - 0.18) / 0.95;
        computedRatio = Math.max(0, Math.min(1, normalized));

        const effectiveRatio = invertPinch ? 1 - computedRatio : computedRatio;
        const targetScale = 0.25 + effectiveRatio * 2.75;
        smoothedScale = smoothedScale * 0.68 + targetScale * 0.32;

        pinchState =
          effectiveRatio < 0.32
            ? "pinching_small"
            : effectiveRatio > 0.55
            ? "pinching_big"
            : "idle";
      }
    }
  } else {
    fistHoldFrames = 0;
    palmHoldFrames = 0;
    swipeHistory = [];
  }

  return {
    computedRatio: computedRatio !== null ? Number(computedRatio.toFixed(2)) : null,
    currentMode,
    triggeredAction,
    smoothedScale: Number(smoothedScale.toFixed(2)),
    pinchState,
  };
}

self.onmessage = async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "INIT_WORKER") {
    await initMediaPipeInWorker();
    return;
  }

  if (data.type === "RESET_SCALE") {
    smoothedScale = typeof data.scale === "number" ? data.scale : 1.0;
    return;
  }

  if (data.type === "PROCESS_BITMAP") {
    const startMs = performance.now();
    const bitmap = data.bitmap;
    const now = data.timestamp || startMs;
    const facingMode = data.facingMode || "user";
    const invertPinch = Boolean(data.invertPinch);

    let hands = [];
    try {
      if (offscreenReady && landmarker && offscreenCtx && bitmap) {
        offscreenCtx.drawImage(bitmap, 0, 0, 224, 126);
        const results = landmarker.detectForVideo(offscreenCanvas, now);
        hands = (results && results.landmarks) ? results.landmarks : [];
      }
    } catch (_err) {
      hands = [];
    } finally {
      if (bitmap && typeof bitmap.close === "function") {
        bitmap.close();
      }
    }

    const classified = classifyLandmarks(hands, now, facingMode, invertPinch);
    const inferMs = Math.round(performance.now() - startMs);

    self.postMessage({
      type: "CV_WORKER_RESULT",
      hands,
      handsCount: hands.length,
      mode: classified.currentMode,
      computedRatio: classified.computedRatio,
      smoothedScale: classified.smoothedScale,
      pinchState: classified.pinchState,
      triggeredAction: classified.triggeredAction,
      inferMs,
      offscreenActive: true,
    });
    return;
  }

  if (data.type === "CLASSIFY_LANDMARKS") {
    const startMs = performance.now();
    const hands = data.hands || [];
    const now = data.timestamp || startMs;
    const facingMode = data.facingMode || "user";
    const invertPinch = Boolean(data.invertPinch);

    const classified = classifyLandmarks(hands, now, facingMode, invertPinch);
    const inferMs = Math.round(performance.now() - startMs);

    self.postMessage({
      type: "CV_WORKER_RESULT",
      hands,
      handsCount: hands.length,
      mode: classified.currentMode,
      computedRatio: classified.computedRatio,
      smoothedScale: classified.smoothedScale,
      pinchState: classified.pinchState,
      triggeredAction: classified.triggeredAction,
      inferMs,
      offscreenActive: false,
    });
  }
};
`;

export function createCVGestureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  try {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { type: "module" });
    return worker;
  } catch (err) {
    console.warn("[NEXUS CV WORKER] Could not spawn Web Worker:", err);
    return null;
  }
}
