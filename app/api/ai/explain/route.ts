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

    let body: any;
    try {
      body = await req.json();
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
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        explanation: "Contextual telemetry unavailable.",
      },
      { status: 500 }
    );
  }
}
