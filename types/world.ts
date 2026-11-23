export type ZoneId = "core" | "code_city" | "data_ocean" | "ai_lab";

export type QualityTier = "ultra" | "high" | "medium" | "low";

export type CameraMode = "free" | "orbit" | "focus" | "cinematic" | "tour";

export type OceanState = "chaos" | "wave" | "lattice" | "sphere";

export interface ZoneMetadata {
  id: ZoneId;
  name: string;
  tagline: string;
  coordinates: [number, number, number];
  description: string;
  color: string;
  accent: string;
  pois: PointOfInterest[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  category: "core" | "architecture" | "data" | "agent" | "memory" | "tool";
  coordinates: [number, number, number];
  description: string;
  specs: Record<string, string>;
}

export interface TourStep {
  stepIndex: number;
  zone: ZoneId;
  targetPoiId?: string;
  title: string;
  narration: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  durationSeconds: number;
}
