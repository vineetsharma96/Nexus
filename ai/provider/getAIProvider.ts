import { IAIProvider } from "./AIProvider.interface";
import { GeminiProvider } from "./GeminiProvider";
import { FallbackProvider } from "./FallbackProvider";

let cachedProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "" && apiKey !== "YOUR_API_KEY") {
    console.log("[NEXUS AI] Initializing GeminiProvider with server-side key.");
    cachedProvider = new GeminiProvider(apiKey);
  } else {
    console.log("[NEXUS AI] No GEMINI_API_KEY detected. Initializing FallbackProvider.");
    cachedProvider = new FallbackProvider();
  }

  return cachedProvider;
}
