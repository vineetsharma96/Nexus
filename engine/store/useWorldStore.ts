import { create } from "zustand";
import { ZoneId, QualityTier, CameraMode, OceanState, PointOfInterest } from "@/types/world";

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
  lightingIntensity: number;
  colorScheme: "default" | "cyber" | "amber" | "monochrome";

  // System & Telemetry
  isBooted: boolean;
  bootProgress: number;
  bootStatusText: string;
  isAudioMuted: boolean;
  isReducedMotion: boolean;
  isTerminalOpen: boolean;

  // Guided Tour
  isTourActive: boolean;
  isTourPaused: boolean;
  tourCurrentStep: number;
  tourTotalSteps: number;

  // Actions
  setBooted: (isBooted: boolean) => void;
  setBootProgress: (progress: number, text?: string) => void;
  setZone: (zone: ZoneId) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSelectedPoi: (poi: PointOfInterest | null) => void;
  setInspectedNodeId: (nodeId: string | null) => void;
  setQualityTier: (tier: QualityTier) => void;
  setFps: (fps: number) => void;
  setOceanState: (state: OceanState) => void;
  setAudioMuted: (muted: boolean) => void;
  toggleAudio: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  startTour: () => void;
  toggleTourPause: () => void;
  goToTourStep: (step: number) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  resetWorld: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  currentZone: "core",
  previousZone: null,
  cameraMode: "cinematic",
  selectedPoi: null,
  inspectedNodeId: null,

  qualityTier: "high",
  fps: 60,
  oceanState: "wave",
  environmentSpeed: 1.0,
  lightingIntensity: 1.0,
  colorScheme: "default",

  isBooted: false,
  bootProgress: 0,
  bootStatusText: "SYSTEM INITIALIZING",
  isAudioMuted: true,
  isReducedMotion: false,
  isTerminalOpen: false,

  isTourActive: false,
  isTourPaused: false,
  tourCurrentStep: 0,
  tourTotalSteps: 7,

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
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  setInspectedNodeId: (nodeId) => set({ inspectedNodeId: nodeId }),
  setQualityTier: (tier) => set({ qualityTier: tier }),
  setFps: (fps) => set({ fps }),
  setOceanState: (oceanState) => set({ oceanState }),
  setAudioMuted: (isAudioMuted) => set({ isAudioMuted }),
  toggleAudio: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setReducedMotion: (isReducedMotion) => set({ isReducedMotion }),
  setTerminalOpen: (isTerminalOpen) => set({ isTerminalOpen }),
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

  startTour: () =>
    set({
      isTourActive: true,
      isTourPaused: false,
      tourCurrentStep: 0,
      cameraMode: "tour",
      currentZone: "core",
      selectedPoi: null,
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
      lightingIntensity: 1.0,
      isTourActive: false,
      isTourPaused: false,
    }),
}));
