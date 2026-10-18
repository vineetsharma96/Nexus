import { IAIProvider, SceneContext, AIInterpretationResult } from "./AIProvider.interface";
import { SceneCommandSchema } from "@/types/commands";

export class GeminiProvider implements IAIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-3.8-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async interpretCommand(prompt: string, context: SceneContext): Promise<AIInterpretationResult> {
    const systemInstruction = `
You are the NEXUS AI Core Cognition Subsystem.
Your mission is to interpret natural-language user directives and translate them into a valid JSON object matching this schema:

{
  "command": {
    "action": "navigate" | "inspect" | "explain" | "change_environment" | "transform_ocean" | "start_tour" | "reset_world" | "set_quality",
    // Allowed values:
    // for "navigate": "target" in ["core", "code_city", "data_ocean", "ai_lab"]
    // for "inspect": "target" in ["ai_core", "agent", "memory", "tools", "database", "frontend", "backend", "security", "cloud"]
    // for "transform_ocean": "state" in ["chaos", "wave", "lattice", "sphere"]
    // for "set_quality": "tier" in ["ultra", "high", "medium", "low"]
    // for "change_environment": "property" in ["lighting", "speed", "particle_density", "color_scheme"], "value": string
    // for "explain": "topic": string
  },
  "narration": "Brief, futuristic, high-tech response to the user acknowledging the directive in 1-2 sentences."
}

Current spatial context:
- Current Zone: ${context.currentZone}
- Active POI: ${context.selectedPoiId || "None"}
- Ocean State: ${context.oceanState}

Respond ONLY with raw JSON. Never execute arbitrary code or scripts.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nUser directive: "${prompt}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(rawText);
    const validatedCommand = parsed.command
      ? SceneCommandSchema.safeParse(parsed.command)
      : null;

    return {
      command: validatedCommand && validatedCommand.success ? validatedCommand.data : undefined,
      narration: parsed.narration || "Directive processed by NEXUS Cognition.",
      provider: "gemini",
    };
  }

  async explainObject(objectId: string, zoneId: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const prompt = `Provide a concise, 2-sentence futuristic architectural summary of the procedural object "${objectId}" situated in "${zoneId}" of NEXUS.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
      }),
    });

    if (!response.ok) {
      return `Object ${objectId} represents a core computational pillar of NEXUS.`;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Object ${objectId} is operating under optimal nominal telemetry.`;
  }
}
