import { z } from "zod";

export const SceneCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("navigate"),
    target: z.enum(["core", "code_city", "data_ocean", "ai_lab"]),
    speed: z.enum(["normal", "cinematic", "fast"]).default("cinematic"),
  }),
  z.object({
    action: z.literal("inspect"),
    target: z.enum([
      "ai_core",
      "agent",
      "memory",
      "tools",
      "database",
      "frontend",
      "backend",
      "security",
      "cloud",
    ]),
  }),
  z.object({
    action: z.literal("explain"),
    topic: z.string().max(100),
  }),
  z.object({
    action: z.literal("change_environment"),
    property: z.enum(["lighting", "speed", "particle_density", "color_scheme"]),
    value: z.string().max(50),
  }),
  z.object({
    action: z.literal("transform_ocean"),
    state: z.enum(["chaos", "wave", "lattice", "sphere"]),
  }),
  z.object({
    action: z.literal("start_tour"),
  }),
  z.object({
    action: z.literal("reset_world"),
  }),
  z.object({
    action: z.literal("set_quality"),
    tier: z.enum(["ultra", "high", "medium", "low"]),
  }),
  z.object({
    action: z.literal("scale_object"),
    scale: z.number().min(0.2).max(3.5),
  }),
  z.object({
    action: z.literal("toggle_ar"),
    enabled: z.boolean(),
  }),
]);

export type SceneCommand = z.infer<typeof SceneCommandSchema>;

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  command?: SceneCommand;
  rawAIResponse?: string;
  timestamp: number;
}
