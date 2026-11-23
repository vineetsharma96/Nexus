import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/ai/provider/getAIProvider";
import { FallbackProvider } from "@/ai/provider/FallbackProvider";

// In-memory rate limiting map: IP -> timestamp array
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string, maxReq: number = 25, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxReq) {
    return true;
  }

  if (rateLimitMap.size > 500) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every((t) => now - t >= windowMs)) {
        rateLimitMap.delete(key);
      }
    }
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
        { error: "Rate limit exceeded. Please wait before requesting further explanations." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object") {
        return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
    }

    // Sanitize objectId and zoneId
    const objectId = typeof body?.objectId === "string"
      ? body.objectId.slice(0, 50).replace(/[^\w-]/g, "")
      : "unknown";

    const zoneId = typeof body?.zoneId === "string"
      ? body.zoneId.slice(0, 50).replace(/[^\w-]/g, "")
      : "core";

    const provider = getAIProvider();
    let explanation: string;
    try {
      explanation = await provider.explainObject(objectId, zoneId);
    } catch (apiErr) {
      console.warn("[NEXUS API /api/ai/explain] Primary AI provider error, falling back to heuristics:", apiErr);
      const fallback = new FallbackProvider();
      explanation = await fallback.explainObject(objectId, zoneId);
    }

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        explanation: "Contextual telemetry unavailable.",
      },
      { status: 500 }
    );
  }
}
