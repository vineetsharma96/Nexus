"use client";

export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export type GestureMode =
  | "neutral"
  | "pinch"
  | "pinch_in"
  | "pinch_out"
  | "fist"
  | "palm"
  | "swipe_left"
  | "swipe_right";

export type TriggeredGestureAction =
  | "fist_pause"
  | "palm_resume"
  | "swipe_next"
  | "swipe_prev"
  | null;

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export interface CVWorkerResultMessage {
  type: "CV_WORKER_RESULT";
  hands: HandLandmarkPoint[][];
  handsCount: number;
  mode: GestureMode;
  liveLabel: string;
  fingerStates: FingerStates;
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

export interface CVWorkerFallbackMessage {
  type: "CV_WORKER_FALLBACK";
  reason: string;
}

export type CVWorkerOutboundMessage =
  | CVWorkerResultMessage
  | CVWorkerStatusMessage
  | CVWorkerFallbackMessage;

/**
 * Self-contained Computer Vision Web Worker:
 * 1. Runs MediaPipe HandLandmarker (matching installed v1.2.3 WASM/SDK) on an aspect-preserved OffscreenCanvas.
 * 2. Uses 3D worldLandmarks (or aspect-corrected 3D coordinates) + bone-vector joint angles
 *    to reliably distinguish:
 *    - Closed Hand / Fist (Pause)
 *    - Open Palm (Resume)
 *    - Slide Left / Right (Zone Navigation)
 *    - Pinch In / Pinch Out (Smooth Object Scaling)
 *    - Neutral / Transitional (Prevents false triggers & stuck states)
 */
const WORKER_SOURCE = `
let landmarker = null;
let offscreenCanvas = null;
let offscreenCtx = null;
let offscreenReady = false;
let isInitializing = false;
let consecutiveInferErrors = 0;
let lastTimestampMs = 0;

// Gesture state machine memory (isolated inside worker thread)
let fistHoldFrames = 0;
let palmHoldFrames = 0;
let fistFiredForHold = false;
let palmFiredForHold = false;

let swipeSamples = [];
let lastSwipeSampleTime = 0;
let lastZoneSwipeTime = 0;
let activeSwipeModeUntil = 0;
let activeSwipeMode = "neutral";

let pinchLatched = false;
let pinchExitFrames = 0;
let smoothedRatio = null;
let smoothedScale = 1.0;

const MEDIAPIPE_VERSION = "1.2.3";

async function initMediaPipeInWorker() {
  if (landmarker || isInitializing) return;
  isInitializing = true;

  try {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas unavailable in Worker");
    }
    offscreenCanvas = new OffscreenCanvas(256, 144);
    offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + MEDIAPIPE_VERSION + "/vision_bundle.mjs"
    );
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + MEDIAPIPE_VERSION + "/wasm"
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
        minHandDetectionConfidence: 0.45,
        minHandPresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
    }

    offscreenReady = true;
    consecutiveInferErrors = 0;
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

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function boneCosine(a, b, c) {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v1z = (b.z || 0) - (a.z || 0);
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = (c.z || 0) - (b.z || 0);
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
  if (len1 < 1e-5 || len2 < 1e-5) return 0;
  return (v1x * v2x + v1y * v2y + v1z * v2z) / (len1 * len2);
}

function computeFingerCurl(pts, wrist, palmCenter, palmSize, mcpIdx, pipIdx, dipIdx, tipIdx) {
  const mcp = pts[mcpIdx];
  const pip = pts[pipIdx];
  const dip = pts[dipIdx];
  const tip = pts[tipIdx];

  // 1. Joint straightness via 3D bone cosines (1.0 = straight, <= 0 = sharply bent)
  const cosPip = boneCosine(mcp, pip, dip);
  const cosDip = boneCosine(pip, dip, tip);
  const avgCos = cosPip * 0.6 + cosDip * 0.4;
  const angleCurl = clamp((0.88 - avgCos) / 1.15, 0, 1);

  // 2. Tip distance relative to PIP & palm center (catches fingertips folded into palm)
  const dTipWrist = dist3(tip, wrist);
  const dPipWrist = dist3(pip, wrist);
  const dTipPalm = dist3(tip, palmCenter);
  let distCurl = 0;
  if (dTipWrist < dPipWrist * 1.04 || dTipPalm < palmSize * 0.85) {
    distCurl = 1.0;
  } else if (dTipWrist < dPipWrist * 1.18 || dTipPalm < palmSize * 1.1) {
    distCurl = 0.55;
  }

  return clamp(angleCurl * 0.65 + distCurl * 0.35, 0, 1);
}

function resetAllGestureTrackers() {
  fistHoldFrames = 0;
  palmHoldFrames = 0;
  fistFiredForHold = false;
  palmFiredForHold = false;
  swipeSamples = [];
  pinchLatched = false;
  pinchExitFrames = 0;
  smoothedRatio = null;
}

function classifyLandmarks(hands, worldHands, now, facingMode, invertPinch, aspectRatio) {
  let computedRatio = null;
  let currentMode = "neutral";
  let liveLabel = "SHOW HAND";
  let triggeredAction = null;
  let pinchState = "idle";
  let fingerStates = {
    thumb: false,
    index: false,
    middle: false,
    ring: false,
    pinky: false,
  };

  if (!hands || hands.length === 0) {
    resetAllGestureTrackers();
    return {
      computedRatio: null,
      currentMode: "neutral",
      liveLabel: "NO HAND DETECTED",
      fingerStates,
      triggeredAction: null,
      smoothedScale: Number(smoothedScale.toFixed(2)),
      pinchState: "idle",
    };
  }

  const h2d = hands[0];
  if (!h2d || h2d.length < 21) {
    return {
      computedRatio: null,
      currentMode: "neutral",
      liveLabel: "TRACKING...",
      fingerStates,
      triggeredAction: null,
      smoothedScale: Number(smoothedScale.toFixed(2)),
      pinchState: "idle",
    };
  }

  // Prefer true 3D metric worldLandmarks (immune to camera aspect ratio & foreshortening).
  // Fallback to aspect-corrected 3D normalized landmarks if worldLandmarks unavailable.
  const ar = aspectRatio && aspectRatio > 0.2 ? aspectRatio : 16 / 9;
  const pts =
    worldHands && worldHands[0] && worldHands[0].length === 21
      ? worldHands[0]
      : h2d.map((p) => ({ x: p.x * ar, y: p.y, z: (p.z || 0) * ar }));

  const wrist = pts[0];
  const thumbCmc = pts[1];
  const thumbMcp = pts[2];
  const thumbIp = pts[3];
  const thumbTip = pts[4];
  const indexMcp = pts[5];
  const middleMcp = pts[9];
  const ringMcp = pts[13];
  const pinkyMcp = pts[17];

  const palmSize = Math.max(1e-4, dist3(wrist, middleMcp));
  const palmCenter = {
    x: (wrist.x + indexMcp.x + middleMcp.x + ringMcp.x + pinkyMcp.x) / 5,
    y: (wrist.y + indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 5,
    z: ((wrist.z || 0) + (indexMcp.z || 0) + (middleMcp.z || 0) + (ringMcp.z || 0) + (pinkyMcp.z || 0)) / 5,
  };

  // Continuous curl scores [0 = straight, 1 = tightly curled]
  const indexCurl = computeFingerCurl(pts, wrist, palmCenter, palmSize, 5, 6, 7, 8);
  const middleCurl = computeFingerCurl(pts, wrist, palmCenter, palmSize, 9, 10, 11, 12);
  const ringCurl = computeFingerCurl(pts, wrist, palmCenter, palmSize, 13, 14, 15, 16);
  const pinkyCurl = computeFingerCurl(pts, wrist, palmCenter, palmSize, 17, 18, 19, 20);

  const indexExt = indexCurl < 0.38;
  const middleExt = middleCurl < 0.38;
  const ringExt = ringCurl < 0.38;
  const pinkyExt = pinkyCurl < 0.42; // Pinky naturally curves slightly more

  const indexCurled = indexCurl > 0.52;
  const middleCurled = middleCurl > 0.52;
  const ringCurled = ringCurl > 0.52;
  const pinkyCurled = pinkyCurl > 0.50;

  // Thumb extension & abduction
  const thumbCos1 = boneCosine(thumbCmc, thumbMcp, thumbIp);
  const thumbCos2 = boneCosine(thumbMcp, thumbIp, thumbTip);
  const thumbStraight = thumbCos1 * 0.45 + thumbCos2 * 0.55;
  const thumbToPinkyMcp = dist3(thumbTip, pinkyMcp) / palmSize;
  const thumbToIndexMcp = dist3(thumbTip, indexMcp) / palmSize;
  const thumbExt =
    (thumbStraight > 0.50 && thumbToIndexMcp > 0.50) ||
    thumbToPinkyMcp > 1.15;

  fingerStates = {
    thumb: thumbExt,
    index: indexExt,
    middle: middleExt,
    ring: ringExt,
    pinky: pinkyExt,
  };

  const extendedCount =
    (indexExt ? 1 : 0) +
    (middleExt ? 1 : 0) +
    (ringExt ? 1 : 0) +
    (pinkyExt ? 1 : 0);
  const curledCount =
    (indexCurled ? 1 : 0) +
    (middleCurled ? 1 : 0) +
    (ringCurled ? 1 : 0) +
    (pinkyCurled ? 1 : 0);
  const avgFourCurl = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;
  const outerThreeCurl = (middleCurl + ringCurl + pinkyCurl) / 3;

  // Scale-invariant 3D distance between Thumb Tip (4) and Index Tip (8)
  const pinchGap = dist3(thumbTip, pts[8]) / palmSize;

  // 2D Screen-space palm center for horizontal slide left/right tracking
  const rawPalmX = (h2d[0].x + h2d[5].x + h2d[9].x + h2d[17].x) / 4;
  const rawPalmY = (h2d[0].y + h2d[5].y + h2d[9].y + h2d[17].y) / 4;
  const screenX = facingMode === "user" ? 1 - rawPalmX : rawPalmX;
  const screenY = rawPalmY;

  // --- 1. HORIZONTAL SLIDE LEFT / RIGHT TRACKER ---
  // Active whenever hand is open (>= 3 fingers extended, forgiving 1 noisy finger during fast motion)
  let isActivelySliding = false;
  let horizontalSpanRecent = 0;

  if (extendedCount >= 3 && !pinchLatched) {
    if (now - lastSwipeSampleTime > 220) {
      swipeSamples = [];
    }
    lastSwipeSampleTime = now;
    swipeSamples.push({ x: screenX, y: screenY, t: now });
    swipeSamples = swipeSamples.filter((s) => now - s.t <= 480);

    // Measure recent stability (last 240ms) for open-palm stationary check
    const recent = swipeSamples.filter((s) => now - s.t <= 240);
    if (recent.length >= 2) {
      let minX = recent[0].x;
      let maxX = recent[0].x;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].x < minX) minX = recent[i].x;
        if (recent[i].x > maxX) maxX = recent[i].x;
      }
      horizontalSpanRecent = maxX - minX;
    }

    if (swipeSamples.length >= 2) {
      const oldest = swipeSamples[0];
      const dx = screenX - oldest.x;
      const dy = screenY - oldest.y;
      const dt = Math.max(0.06, (now - oldest.t) / 1000);
      const speedX = Math.abs(dx) / dt;

      if (
        Math.abs(dx) >= 0.13 &&
        Math.abs(dx) >= Math.abs(dy) * 1.25 &&
        speedX >= 0.30 &&
        now - lastZoneSwipeTime > 720
      ) {
        lastZoneSwipeTime = now;
        swipeSamples = [];
        fistHoldFrames = 0;
        palmHoldFrames = 0;
        fistFiredForHold = false;
        palmFiredForHold = false;
        triggeredAction = dx > 0 ? "swipe_next" : "swipe_prev";
        activeSwipeMode = dx > 0 ? "swipe_right" : "swipe_left";
        activeSwipeModeUntil = now + 450;
        isActivelySliding = true;
      } else if (Math.abs(dx) >= 0.055 && Math.abs(dx) >= Math.abs(dy) * 1.15) {
        isActivelySliding = true;
        activeSwipeMode = dx > 0 ? "swipe_right" : "swipe_left";
      }
    }
  } else if (now - lastSwipeSampleTime > 160) {
    swipeSamples = [];
  }

  // Keep brief visual feedback immediately after a triggered slide
  if (now < activeSwipeModeUntil) {
    currentMode = activeSwipeMode;
    liveLabel =
      activeSwipeMode === "swipe_right"
        ? "SLIDE RIGHT → NEXT"
        : "SLIDE LEFT ← PREV";
    return {
      computedRatio: null,
      currentMode,
      liveLabel,
      fingerStates,
      triggeredAction,
      smoothedScale: Number(smoothedScale.toFixed(2)),
      pinchState: "idle",
    };
  }

  // --- 2. GESTURE POSTURE CLASSIFICATION ---
  const isClosedHand =
    curledCount === 4 ||
    (curledCount >= 3 && avgFourCurl > 0.62 && indexCurl > 0.48);

  const isOpenPalm =
    extendedCount === 4 &&
    thumbExt &&
    pinchGap > 0.56 &&
    !isActivelySliding &&
    horizontalSpanRecent < 0.08;

  // Natural Pinch Detection:
  // Case A (Classic Pinch): Thumb & Index brought close together (< 0.62) while not a closed fist
  // Case B (2-Finger Calipers): Index open/semi-open + outer 3 fingers curled (lets user spread pinch wide!)
  // Case C (Pinch Latch): Once pinching, allow spreading thumb & index wide out up to 1.20 unless user clearly holds Open Palm or Fist
  const isCaliperPose =
    !isClosedHand &&
    indexCurl < 0.55 &&
    outerThreeCurl > 0.46 &&
    pinchGap < 1.25;
  const isTightPinchPose = !isClosedHand && pinchGap < 0.62;

  if (isActivelySliding) {
    currentMode = activeSwipeMode;
    liveLabel =
      activeSwipeMode === "swipe_right" ? "SLIDING RIGHT →" : "SLIDING LEFT ←";
    fistHoldFrames = 0;
    palmHoldFrames = 0;
    pinchLatched = false;
  } else if (isClosedHand) {
    // CLOSED HAND / CLENCHED FIST -> PAUSE ACTIVITY
    currentMode = "fist";
    liveLabel = "CLOSED HAND · PAUSE";
    fistHoldFrames += 1;
    palmHoldFrames = 0;
    palmFiredForHold = false;
    pinchLatched = false;
    pinchExitFrames = 0;
    smoothedRatio = null;

    if (fistHoldFrames >= 2 && !fistFiredForHold) {
      fistFiredForHold = true;
      triggeredAction = "fist_pause";
    }
  } else if (isOpenPalm && (!pinchLatched || pinchGap > 0.88)) {
    // OPEN PALM -> RESUME ACTIVITY
    if (pinchLatched) {
      pinchExitFrames += 1;
      if (pinchExitFrames >= 2) {
        pinchLatched = false;
        pinchExitFrames = 0;
        smoothedRatio = null;
      }
    }
    currentMode = "palm";
    liveLabel = "OPEN PALM · RESUME";
    palmHoldFrames += 1;
    fistHoldFrames = 0;
    fistFiredForHold = false;

    if (palmHoldFrames >= 2 && !palmFiredForHold) {
      palmFiredForHold = true;
      triggeredAction = "palm_resume";
    }
  } else if (isTightPinchPose || isCaliperPose || (pinchLatched && pinchGap < 1.25)) {
    // PINCH IN / PINCH OUT -> SMOOTH OBJECT SCALING
    pinchLatched = true;
    pinchExitFrames = 0;
    fistHoldFrames = 0;
    palmHoldFrames = 0;
    fistFiredForHold = false;
    palmFiredForHold = false;

    const rawRatio = clamp((pinchGap - 0.14) / (0.98 - 0.14), 0, 1);
    const prevRatio = smoothedRatio !== null ? smoothedRatio : rawRatio;
    smoothedRatio =
      smoothedRatio !== null ? smoothedRatio * 0.55 + rawRatio * 0.45 : rawRatio;

    const deltaRatio = smoothedRatio - prevRatio;
    computedRatio = Number(smoothedRatio.toFixed(2));

    const effectiveRatio = invertPinch ? 1 - smoothedRatio : smoothedRatio;
    const effectiveDelta = invertPinch ? -deltaRatio : deltaRatio;

    const targetScale = 0.30 + effectiveRatio * 2.50;
    smoothedScale = smoothedScale * 0.60 + targetScale * 0.40;

    if (effectiveDelta < -0.016 || effectiveRatio < 0.30) {
      pinchState = "pinching_small";
      currentMode = "pinch_in";
      liveLabel = "PINCH IN · SHRINK";
    } else if (effectiveDelta > 0.016 || effectiveRatio > 0.65) {
      pinchState = "pinching_big";
      currentMode = "pinch_out";
      liveLabel = "PINCH OUT · EXPAND";
    } else {
      pinchState = "idle";
      currentMode = "pinch";
      liveLabel = "PINCH · HOLD";
    }
  } else {
    // Transitional / neutral posture (never corrupts scale or falsely triggers)
    currentMode = "neutral";
    liveLabel = "HAND TRACKED";
    fistHoldFrames = 0;
    palmHoldFrames = 0;
    fistFiredForHold = false;
    palmFiredForHold = false;
    pinchExitFrames += 1;
    if (pinchExitFrames >= 3) {
      pinchLatched = false;
      smoothedRatio = null;
    }
  }

  return {
    computedRatio,
    currentMode,
    liveLabel,
    fingerStates,
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
    smoothedRatio = null;
    pinchLatched = false;
    return;
  }

  if (data.type === "PROCESS_BITMAP") {
    const startMs = performance.now();
    const bitmap = data.bitmap;
    const rawTs = Math.round(data.timestamp || startMs);
    const ts = rawTs > lastTimestampMs ? rawTs : lastTimestampMs + 1;
    lastTimestampMs = ts;

    const facingMode = data.facingMode || "user";
    const invertPinch = Boolean(data.invertPinch);
    const frameW = data.width || (bitmap ? bitmap.width : 256);
    const frameH = data.height || (bitmap ? bitmap.height : 144);
    const aspectRatio = frameW / Math.max(1, frameH);

    let hands = [];
    let worldHands = [];
    try {
      if (offscreenReady && landmarker && offscreenCanvas && offscreenCtx && bitmap) {
        if (offscreenCanvas.width !== frameW || offscreenCanvas.height !== frameH) {
          offscreenCanvas.width = frameW;
          offscreenCanvas.height = frameH;
        }
        offscreenCtx.drawImage(bitmap, 0, 0, frameW, frameH);
        const results = landmarker.detectForVideo(offscreenCanvas, ts);
        hands = results && results.landmarks ? results.landmarks : [];
        worldHands = results && results.worldLandmarks ? results.worldLandmarks : [];
        consecutiveInferErrors = 0;
      }
    } catch (err) {
      hands = [];
      worldHands = [];
      consecutiveInferErrors += 1;
      if (consecutiveInferErrors >= 2) {
        offscreenReady = false;
        self.postMessage({
          type: "CV_WORKER_FALLBACK",
          reason: err ? String(err.message || err) : "Offscreen inference failed",
        });
      }
    } finally {
      if (bitmap && typeof bitmap.close === "function") {
        bitmap.close();
      }
    }

    const classified = classifyLandmarks(
      hands,
      worldHands,
      ts,
      facingMode,
      invertPinch,
      aspectRatio
    );
    const inferMs = Math.round(performance.now() - startMs);

    self.postMessage({
      type: "CV_WORKER_RESULT",
      hands,
      handsCount: hands.length,
      mode: classified.currentMode,
      liveLabel: classified.liveLabel,
      fingerStates: classified.fingerStates,
      computedRatio: classified.computedRatio,
      smoothedScale: classified.smoothedScale,
      pinchState: classified.pinchState,
      triggeredAction: classified.triggeredAction,
      inferMs,
      offscreenActive: offscreenReady,
    });
    return;
  }

  if (data.type === "CLASSIFY_LANDMARKS") {
    const startMs = performance.now();
    const hands = data.hands || [];
    const worldHands = data.worldHands || [];
    const rawTs = Math.round(data.timestamp || startMs);
    const ts = rawTs > lastTimestampMs ? rawTs : lastTimestampMs + 1;
    lastTimestampMs = ts;

    const facingMode = data.facingMode || "user";
    const invertPinch = Boolean(data.invertPinch);
    const aspectRatio = data.aspectRatio || 16 / 9;

    const classified = classifyLandmarks(
      hands,
      worldHands,
      ts,
      facingMode,
      invertPinch,
      aspectRatio
    );
    const inferMs = Math.round(performance.now() - startMs);

    self.postMessage({
      type: "CV_WORKER_RESULT",
      hands,
      handsCount: hands.length,
      mode: classified.currentMode,
      liveLabel: classified.liveLabel,
      fingerStates: classified.fingerStates,
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
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return worker;
  } catch (err) {
    console.warn("[NEXUS CV WORKER] Could not spawn Web Worker:", err);
    return null;
  }
}
