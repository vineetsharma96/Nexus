import { create } from "zustand";
import { ZoneId, QualityTier, CameraMode, OceanState, PointOfInterest } from "@/types/world";

export type CvGestureType =
  | "idle"
  | "pinching_small"
  | "pinching_big"
  | "fist_pause"
  | "palm_resume"
  | "swipe_left"
  | "swipe_right";

export const ZONE_ORDER: ZoneId[] = ["core", "code_city", "data_ocean", "ai_lab"];

export interface WorldState {
  // Navigation & Spatial
  currentZone: ZoneId;
  previousZone: ZoneId | null;
  cameraMode: CameraMode;
  selectedPoi: PointOfInterest | null;
  inspectedNodeId: string | null;

  // Environment & Simulation
  qualityTier: QualityTier;
  fps: number;
  oceanState: OceanState;
  environmentSpeed: number;
  savedEnvironmentSpeed: number;
  isActivityPaused: boolean;
  lightingIntensity: number;
  colorScheme: "default" | "cyber" | "amber" | "monochrome";

  // System & Telemetry
  isBooted: boolean;
  bootProgress: number;
  bootStatusText: string;
  isAudioMuted: boolean;
  isReducedMotion: boolean;
  isTerminalOpen: boolean;
  isSandboxOpen: boolean;

  // Guided Tour
  isTourActive: boolean;
  isTourPaused: boolean;
  tourCurrentStep: number;
  tourTotalSteps: number;

  // AR & Computer Vision Gestures
  isArMode: boolean;
  isCvEnabled: boolean;
  isGestureTutorialOpen: boolean;
  hasSeenGestureTutorial: boolean;
  objectScale: number;
  pinchDistance: number | null;
  pinchState: "idle" | "pinching_small" | "pinching_big";
  cvGesture: CvGestureType;
  invertPinch: boolean;
  arFacingMode: "user" | "environment";

  // Actions
  setBooted: (isBooted: boolean) => void;
  setBootProgress: (progress: number, text?: string) => void;
  setZone: (zone: ZoneId) => void;
  cycleZone: (direction: "next" | "prev") => void;
  setCameraMode: (mode: CameraMode) => void;
  setSelectedPoi: (poi: PointOfInterest | null) => void;
  setInspectedNodeId: (nodeId: string | null) => void;
  setQualityTier: (tier: QualityTier) => void;
  setFps: (fps: number) => void;
  setOceanState: (state: OceanState) => void;
  setActivityPaused: (paused: boolean) => void;
  setAudioMuted: (muted: boolean) => void;
  toggleAudio: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setSandboxOpen: (open: boolean) => void;
  toggleSandbox: () => void;
  setGestureTutorialOpen: (open: boolean) => void;
  toggleGestureTutorial: () => void;
  startTour: () => void;
  toggleTourPause: () => void;
  goToTourStep: (step: number) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  resetWorld: () => void;
  setArMode: (active: boolean) => void;
  toggleArMode: () => void;
  setCvEnabled: (enabled: boolean) => void;
  toggleCvEnabled: () => void;
  setObjectScale: (scale: number) => void;
  setPinchTelemetry: (
    distance: number | null,
    state: "idle" | "pinching_small" | "pinching_big",
    scale?: number
  ) => void;
  setCvGesture: (gesture: CvGestureType) => void;
  toggleInvertPinch: () => void;
  setArFacingMode: (mode: "user" | "environment") => void;
  toggleArFacingMode: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  currentZone: "core",
  previousZone: null,
  cameraMode: "cinematic",
  selectedPoi: null,
  inspectedNodeId: null,

  qualityTier: "ultra",
  fps: 60,
  oceanState: "wave",
  environmentSpeed: 1.0,
  savedEnvironmentSpeed: 1.0,
  isActivityPaused: false,
  lightingIntensity: 1.0,
  colorScheme: "default",

  isBooted: false,
  bootProgress: 0,
  bootStatusText: "SYSTEM INITIALIZING",
  isAudioMuted: true,
  isReducedMotion: false,
  isTerminalOpen: false,
  isSandboxOpen: false,

  isTourActive: false,
  isTourPaused: false,
  tourCurrentStep: 0,
  tourTotalSteps: 7,

  isArMode: false,
  isCvEnabled: false,
  isGestureTutorialOpen: false,
  hasSeenGestureTutorial: false,
  objectScale: 1.0,
  pinchDistance: null,
  pinchState: "idle",
  cvGesture: "idle",
  invertPinch: false,
  arFacingMode: "user",

  setBooted: (isBooted) => set({ isBooted }),
  setBootProgress: (progress, text) =>
    set((state) => ({
      bootProgress: progress,
      bootStatusText: text ?? state.bootStatusText,
    })),
  setZone: (zone) =>
    set((state) => ({
      currentZone: zone,
      previousZone: state.currentZone,
      selectedPoi: null,
      inspectedNodeId: null,
    })),
  cycleZone: (direction) =>
    set((state) => {
      const idx = ZONE_ORDER.indexOf(state.currentZone);
      const nextIdx =
        direction === "next"
          ? (idx + 1) % ZONE_ORDER.length
          : (idx - 1 + ZONE_ORDER.length) % ZONE_ORDER.length;
      return {
        currentZone: ZONE_ORDER[nextIdx],
        previousZone: state.currentZone,
        selectedPoi: null,
        inspectedNodeId: null,
        cvGesture: direction === "next" ? "swipe_right" : "swipe_left",
      };
    }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  setInspectedNodeId: (nodeId) => set({ inspectedNodeId: nodeId }),
  setQualityTier: (tier) => set({ qualityTier: tier }),
  setFps: (fps) => set({ fps }),
  setOceanState: (oceanState) => set({ oceanState }),
  setActivityPaused: (paused) =>
    set((state) => {
      if (paused) {
        return {
          isActivityPaused: true,
          savedEnvironmentSpeed:
            state.environmentSpeed > 0 ? state.environmentSpeed : state.savedEnvironmentSpeed || 1.0,
          environmentSpeed: 0,
          isTourPaused: state.isTourActive ? true : state.isTourPaused,
          cvGesture: "fist_pause",
        };
      }
      return {
        isActivityPaused: false,
        environmentSpeed: state.savedEnvironmentSpeed > 0 ? state.savedEnvironmentSpeed : 1.0,
        isTourPaused: state.isTourActive ? false : state.isTourPaused,
        cvGesture: "palm_resume",
      };
    }),
  setAudioMuted: (isAudioMuted) => set({ isAudioMuted }),
  toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setReducedMotion: (isReducedMotion) => set({ isReducedMotion }),
  setTerminalOpen: (isTerminalOpen) => set({ isTerminalOpen }),
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  setSandboxOpen: (isSandboxOpen) =>
    set((state) => ({
      isSandboxOpen,
      isCvEnabled:
        isSandboxOpen && typeof window !== "undefined" && window.innerWidth < 640
          ? false
          : state.isCvEnabled,
    })),
  toggleSandbox: () =>
    set((state) => {
      const nextOpen = !state.isSandboxOpen;
      return {
        isSandboxOpen: nextOpen,
        isCvEnabled:
          nextOpen && typeof window !== "undefined" && window.innerWidth < 640
            ? false
            : state.isCvEnabled,
      };
    }),
  setGestureTutorialOpen: (isGestureTutorialOpen) =>
    set({
      isGestureTutorialOpen,
      hasSeenGestureTutorial: true,
    }),
  toggleGestureTutorial: () =>
    set((state) => ({
      isGestureTutorialOpen: !state.isGestureTutorialOpen,
      hasSeenGestureTutorial: true,
    })),

  startTour: () =>
    set({
      isTourActive: true,
      isTourPaused: false,
      tourCurrentStep: 0,
      cameraMode: "tour",
      currentZone: "core",
      selectedPoi: null,
      isSandboxOpen: false,
      isGestureTutorialOpen: false,
    }),
  toggleTourPause: () => set((state) => ({ isTourPaused: !state.isTourPaused })),
  goToTourStep: (step) =>
    set({
      tourCurrentStep: Math.max(0, Math.min(6, step)),
      isTourPaused: false,
    }),
  nextTourStep: () =>
    set((state) => {
      if (state.tourCurrentStep < state.tourTotalSteps - 1) {
        return { tourCurrentStep: state.tourCurrentStep + 1 };
      }
      return { isTourActive: false, cameraMode: "cinematic" };
    }),
  prevTourStep: () =>
    set((state) => ({
      tourCurrentStep: Math.max(0, state.tourCurrentStep - 1),
    })),
  endTour: () =>
    set({
      isTourActive: false,
      isTourPaused: false,
      cameraMode: "cinematic",
    }),

  resetWorld: () =>
    set({
      currentZone: "core",
      previousZone: null,
      cameraMode: "cinematic",
      selectedPoi: null,
      inspectedNodeId: null,
      oceanState: "wave",
      environmentSpeed: 1.0,
      savedEnvironmentSpeed: 1.0,
      isActivityPaused: false,
      lightingIntensity: 1.0,
      isTourActive: false,
      isTourPaused: false,
      objectScale: 1.0,
      pinchDistance: null,
      pinchState: "idle",
      cvGesture: "idle",
    }),

  setArMode: (isArMode) =>
    set((state) => ({
      isArMode,
      isCvEnabled: isArMode ? true : state.isCvEnabled,
      isSandboxOpen:
        isArMode && typeof window !== "undefined" && window.innerWidth < 640
          ? false
          : state.isSandboxOpen,
    })),
  toggleArMode: () =>
    set((state) => {
      const nextAr = !state.isArMode;
      return {
        isArMode: nextAr,
        isCvEnabled: nextAr ? true : state.isCvEnabled,
        isSandboxOpen:
          nextAr && typeof window !== "undefined" && window.innerWidth < 640
            ? false
            : state.isSandboxOpen,
      };
    }),
  setCvEnabled: (isCvEnabled) =>
    set((state) => ({
      isCvEnabled,
      isArMode: !isCvEnabled ? false : state.isArMode,
      pinchDistance: !isCvEnabled ? null : state.pinchDistance,
      pinchState: !isCvEnabled ? "idle" : state.pinchState,
      cvGesture: !isCvEnabled ? "idle" : state.cvGesture,
      isSandboxOpen:
        isCvEnabled && typeof window !== "undefined" && window.innerWidth < 640
          ? false
          : state.isSandboxOpen,
    })),
  toggleCvEnabled: () =>
    set((state) => {
      const nextCv = !state.isCvEnabled;
      return {
        isCvEnabled: nextCv,
        isArMode: !nextCv ? false : state.isArMode,
        pinchDistance: !nextCv ? null : state.pinchDistance,
        pinchState: !nextCv ? "idle" : state.pinchState,
        cvGesture: !nextCv ? "idle" : state.cvGesture,
        isSandboxOpen:
          nextCv && typeof window !== "undefined" && window.innerWidth < 640
            ? false
            : state.isSandboxOpen,
      };
    }),
  setObjectScale: (scale) =>
    set({
      objectScale: Math.max(0.2, Math.min(3.5, scale)),
    }),
  setPinchTelemetry: (pinchDistance, pinchState, scale) =>
    set((state) => {
      const nextScale =
        scale !== undefined
          ? Math.max(0.2, Math.min(3.5, scale))
          : state.objectScale;
      // Avoid redundant store updates when values haven't meaningfully changed
      if (
        state.pinchState === pinchState &&
        Math.abs((state.pinchDistance ?? 0) - (pinchDistance ?? 0)) < 0.02 &&
        Math.abs(state.objectScale - nextScale) < 0.02
      ) {
        return state;
      }
      return {
        pinchDistance,
        pinchState,
        cvGesture:
          pinchState === "pinching_big" || pinchState === "pinching_small"
            ? pinchState
            : state.cvGesture === "pinching_big" || state.cvGesture === "pinching_small"
            ? "idle"
            : state.cvGesture,
        objectScale: nextScale,
      };
    }),
  setCvGesture: (cvGesture) => set({ cvGesture }),
  toggleInvertPinch: () =>
    set((state) => ({ invertPinch: !state.invertPinch })),
  setArFacingMode: (arFacingMode) => set({ arFacingMode }),
  toggleArFacingMode: () =>
    set((state) => ({
      arFacingMode: state.arFacingMode === "user" ? "environment" : "user",
    })),
}));
