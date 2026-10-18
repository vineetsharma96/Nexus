import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/ai/provider/getAIProvider";
import { FallbackProvider } from "@/ai/provider/FallbackProvider";
import { SceneCommandSchema } from "@/types/commands";
import { ZoneId } from "@/types/world";

// In-memory rate limiting map: IP -> timestamp array
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string, maxReq: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxReq) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local_client";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a few seconds before dispatching further directives.",
        },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }
    let prompt = typeof body?.prompt === "string" ? body.prompt : "";

    // Security: Sanitize & truncate user prompt
    prompt = prompt
      .slice(0, 150)
      .replace(/[^\w\s.,?!'"-]/gi, "")
      .trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Directive string cannot be empty." },
        { status: 400 }
      );
    }

    const context = {
      currentZone: (body.currentZone as ZoneId) || "core",
      selectedPoiId: body.selectedPoiId || null,
      qualityTier: body.qualityTier || "high",
      oceanState: body.oceanState || "wave",
    };

    const provider = getAIProvider();
    let result;
    try {
      result = await provider.interpretCommand(prompt, context);
    } catch (apiErr) {
      console.warn("[NEXUS API /api/ai/command] Primary AI provider error, falling back to heuristics:", apiErr);
      const fallback = new FallbackProvider();
      result = await fallback.interpretCommand(prompt, context);
    }

    // Strict schema re-validation
    let validatedCommand = undefined;
    if (result.command) {
      const parsed = SceneCommandSchema.safeParse(result.command);
      if (parsed.success) {
        validatedCommand = parsed.data;
      }
    }

    return NextResponse.json({
      success: true,
      message: result.narration,
      command: validatedCommand,
      provider: result.provider,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("[NEXUS API /api/ai/command] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "NEXUS encountered a temporary cognitive latency. Heuristic recovery engaged.",
      },
      { status: 500 }
    );
  }
}
