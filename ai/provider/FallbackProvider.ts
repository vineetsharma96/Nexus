import { IAIProvider, SceneContext, AIInterpretationResult } from "./AIProvider.interface";
import { SceneCommand } from "@/types/commands";

export class FallbackProvider implements IAIProvider {
  async interpretCommand(prompt: string, context: SceneContext): Promise<AIInterpretationResult> {
    const p = prompt.toLowerCase();
    let command: SceneCommand | undefined;
    let narration = "NEXUS Fallback Heuristic Subsystem processed your instruction.";

    if (p.includes("lab") || p.includes("agent") || p.includes("memory")) {
      command = { action: "navigate", target: "ai_lab", speed: "cinematic" };
      narration = "Spatial vectors recalibrated. Entering ZONE 04 — AI LAB.";
    } else if (p.includes("city") || p.includes("code") || p.includes("frontend") || p.includes("backend")) {
      command = { action: "navigate", target: "code_city", speed: "cinematic" };
      narration = "Approaching algorithmic towers in ZONE 02 — CODE CITY.";
    } else if (p.includes("ocean") || p.includes("data") || p.includes("particle")) {
      command = { action: "navigate", target: "data_ocean", speed: "cinematic" };
      narration = "Navigating to harmonic particle field in ZONE 03 — DATA OCEAN.";
    } else if (p.includes("core") || p.includes("beginning") || p.includes("home") || p.includes("origin")) {
      command = { action: "navigate", target: "core", speed: "cinematic" };
      narration = "Returning to origin coordinates: ZONE 01 — THE CORE.";
    } else if (p.includes("tour") || p.includes("guide")) {
      command = { action: "start_tour" };
      narration = "Cinematic AI Tour sequence engaged. Welcome to NEXUS.";
    } else if (p.includes("sphere")) {
      command = { action: "transform_ocean", state: "sphere" };
      narration = "Reorganizing 40,000 particles into a Fibonacci Knowledge Sphere.";
    } else if (p.includes("wave")) {
      command = { action: "transform_ocean", state: "wave" };
      narration = "Modulating particle manifold into harmonic sinusoidal wave field.";
    } else if (p.includes("lattice")) {
      command = { action: "transform_ocean", state: "lattice" };
      narration = "Restructuring particles into crystalline 3D lattice topology.";
    } else if (p.includes("chaos") || p.includes("random")) {
      command = { action: "transform_ocean", state: "chaos" };
      narration = "Dispersing particles into Brownian entropy cloud.";
    } else if (p.includes("reset")) {
      command = { action: "reset_world" };
      narration = "All spatial coordinates, object scales, and environmental parameters reset to origin state.";
    } else if (p.includes("bigger") || p.includes("enlarge") || p.includes("grow") || p.includes("scale up")) {
      command = { action: "scale_object", scale: 2.0 };
      narration = "Computer Vision Pinch Vector expanded — scaling 3D object manifold to 2.0x.";
    } else if (p.includes("smaller") || p.includes("shrink") || p.includes("small") || p.includes("scale down")) {
      command = { action: "scale_object", scale: 0.45 };
      narration = "Computer Vision Pinch Vector contracted — scaling 3D object manifold to 0.45x.";
    } else if (p.includes("ar") || p.includes("augmented") || p.includes("camera") || p.includes("vision") || p.includes("pinch")) {
      command = { action: "toggle_ar", enabled: !p.includes("off") && !p.includes("disable") };
      narration = "Augmented Reality optical passthrough and 21-point Computer Vision hand pinch tracker engaged.";
    } else {
      narration = `NEXUS parsed directive: "${prompt}". Environmental parameters calibrated.`;
    }

    return {
      command,
      narration,
      provider: "fallback",
    };
  }

  async explainObject(objectId: string, zoneId: string): Promise<string> {
    return `Object ${objectId} is an essential procedural compute node situated within ${zoneId}.`;
  }
}
