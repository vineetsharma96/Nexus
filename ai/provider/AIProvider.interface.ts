import { SceneCommand } from "@/types/commands";
import { ZoneId } from "@/types/world";

export interface SceneContext {
  currentZone: ZoneId;
  selectedPoiId?: string | null;
  qualityTier: string;
  oceanState: string;
}

export interface AIInterpretationResult {
  command?: SceneCommand;
  narration: string;
  provider: "gemini" | "fallback";
}

export interface IAIProvider {
  interpretCommand(prompt: string, context: SceneContext): Promise<AIInterpretationResult>;
  explainObject(objectId: string, zoneId: string): Promise<string>;
}
