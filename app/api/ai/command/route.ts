import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/ai/provider/getAIProvider";
import { FallbackProvider } from "@/ai/provider/FallbackProvider";
import { SceneCommandSchema } from "@/types/commands";
import { ZoneId } from "@/types/world";

// In-memory rate limiting map: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, maxReq: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now >= record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
  }

  if (record.count >= maxReq) {
    return true;
  }

  record.count++;
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }

    const payload = (typeof body === 'object' && body !== null) ? body as Record<string, unknown> : {};
    let prompt = typeof payload.prompt === "string" ? payload.prompt : "";

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
      currentZone: (payload.currentZone as ZoneId) || "core",
      selectedPoiId: typeof payload.selectedPoiId === "string" ? payload.selectedPoiId : null,
      qualityTier: typeof payload.qualityTier === "string" ? payload.qualityTier : "high",
      oceanState: typeof payload.oceanState === "string" ? payload.oceanState : "wave",
    };

    const provider = getAIProvider();
    let result;
    try {
      result = await provider.interpretCommand(prompt, context);
    } catch {
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
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "NEXUS encountered a temporary cognitive latency. Heuristic recovery engaged.",
      },
      { status: 500 }
    );
  }
}
